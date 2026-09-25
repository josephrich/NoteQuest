// Polyphonic *verification*: we know which notes the player was asked for, so rather than
// transcribing the audio we check that (a) each expected note is present and (b) nearly all
// spectral energy is explained by the harmonics of the expected notes.
import { freqToMidiFloat, midiToFreq } from './music';

type Spectrum = ArrayLike<number>;

export interface Peak {
  freq: number;
  mag: number;
}

export interface ChordCheck {
  pass: boolean;
  explained: number;
  presence: number[];
  unexplained: { freq: number; ratio: number }[];
  chroma: Float64Array;
}

export function findPeaks(mags: Spectrum, sampleRate: number, fftSize: number, { fMin = 50, fMax = 4200, floor = 0.02 } = {}) {
  const binHz = sampleRate / fftSize;
  const k0 = Math.max(2, Math.ceil(fMin / binHz));
  const k1 = Math.min(mags.length - 2, Math.floor(fMax / binHz));
  let max = 0;
  for (let k = k0; k <= k1; k++) max = Math.max(max, mags[k]);
  const peaks: Peak[] = [];
  if (max <= 0) return { peaks, max: 0 };
  for (let k = k0; k <= k1; k++) {
    const m = mags[k];
    if (m < floor * max || m <= mags[k - 1] || m < mags[k + 1]) continue;
    // Parabolic interpolation on log magnitude for a sub-bin frequency estimate.
    const a = Math.log(mags[k - 1] + 1e-12);
    const b = Math.log(m + 1e-12);
    const c = Math.log(mags[k + 1] + 1e-12);
    const d = a - 2 * b + c;
    const shift = d !== 0 ? (0.5 * (a - c)) / d : 0;
    peaks.push({ freq: (k + shift) * binHz, mag: m });
  }
  return { peaks, max };
}

// 12-bin pitch-class profile, for display.
export function chroma(peaks: Peak[], refA4 = 440): Float64Array {
  const out = new Float64Array(12);
  for (const p of peaks) {
    const mf = freqToMidiFloat(p.freq, refA4);
    const nearest = Math.round(mf);
    if (Math.abs(mf - nearest) > 0.35) continue;
    out[((nearest % 12) + 12) % 12] += p.mag;
  }
  const max = Math.max(...out);
  if (max > 0) for (let i = 0; i < 12; i++) out[i] /= max;
  return out;
}

function centsBetween(f: number, target: number) {
  return 1200 * Math.log2(f / target);
}

export function verifyChord(
  mags: Spectrum,
  sampleRate: number,
  fftSize: number,
  expectedMidis: number[],
  { refA4 = 440, maxHarmonic = 8, minExplained = 0.8, minPresence = 0.08, minLowPresence = 0.03, maxBelow = 0.1, strict = true } = {},
): ChordCheck {
  const { peaks, max } = findPeaks(mags, sampleRate, fftSize);
  if (!peaks.length) {
    return { pass: false, explained: 0, presence: expectedMidis.map(() => 0), unexplained: [], chroma: new Float64Array(12) };
  }
  const f0s = expectedMidis.map((m) => midiToFreq(m, refA4));

  let explainedPower = 0;
  let totalPower = 0;
  const unexplained: { freq: number; ratio: number }[] = [];
  for (const p of peaks) {
    const power = p.mag * p.mag;
    totalPower += power;
    let ok = false;
    for (const f0 of f0s) {
      const h = Math.round(p.freq / f0);
      // Piano strings are slightly inharmonic, so allow more slack on higher partials.
      if (h >= 1 && h <= maxHarmonic && Math.abs(centsBetween(p.freq, h * f0)) <= 35 + 6 * h) {
        ok = true;
        break;
      }
    }
    if (ok) explainedPower += power;
    else unexplained.push({ freq: p.freq, ratio: p.mag / max });
  }

  // Presence: each note's own fundamental must show up, so an inversion (the same letters with a
  // different bottom note) doesn't pass. Low notes have weak fundamentals, so they need less.
  // Not `strict` (for guessing what else he might have played): a low note's 2nd partial counts too.
  const presence = f0s.map((f0, i) => {
    let best = 0;
    const harmonics = !strict && expectedMidis[i] < 48 ? [1, 2] : [1];
    for (const p of peaks) {
      for (const h of harmonics) if (Math.abs(centsBetween(p.freq, h * f0)) <= 40) best = Math.max(best, p.mag / max);
    }
    return best;
  });
  const enough = (v: number, i: number) => v >= (strict && expectedMidis[i] < 48 ? minLowPresence : minPresence);

  // Strict: nothing unexplained may sound below the bottom note. That's a different bottom note (an
  // inversion, or an extra note underneath).
  const bottom = Math.min(...f0s);
  const below = strict && unexplained.some((u) => u.freq < bottom * 0.97 && u.ratio >= maxBelow);

  const explained = totalPower > 0 ? explainedPower / totalPower : 0;
  const pass = explained >= minExplained && presence.every(enough) && !below;
  unexplained.sort((a, b) => b.ratio - a.ratio);
  return { pass, explained, presence, unexplained: unexplained.slice(0, 4), chroma: chroma(peaks, refA4) };
}
