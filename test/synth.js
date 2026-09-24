// Crude synthetic piano: inharmonic partials with per-partial decay, weak fundamentals in the bass,
// a short attack and a little background noise. Good enough to exercise the detectors.

export function seededRandom(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function pianoNotes(midis, { sampleRate = 48000, duration = 0.6, refA4 = 440, B = 0.0004, noise = 0.002, start = 0, seed = 7 } = {}) {
  const n = Math.round((start + duration) * sampleRate);
  const out = new Float32Array(n);
  addPiano(out, midis, { sampleRate, refA4, B, start });
  const rnd = seededRandom(seed);
  for (let i = 0; i < n; i++) out[i] += noise * (rnd() * 2 - 1);
  return out;
}

// `end` is the key release: the damper then kills the note over ~80ms.
export function addPiano(out, midis, { sampleRate = 48000, refA4 = 440, B = 0.0004, start = 0, end = Infinity, gain = 0.2 } = {}) {
  const s0 = Math.round(start * sampleRate);
  const release = 0.08;
  for (const midi of midis) {
    const f0 = refA4 * 2 ** ((midi - 69) / 12);
    for (let h = 1; h <= 12; h++) {
      const fh = h * f0 * Math.sqrt(1 + B * h * h);
      if (fh > sampleRate / 2 - 500) break;
      let amp = gain / h ** 0.9;
      if (h === 1 && midi < 48) amp *= 0.35; // weak bass fundamentals
      const tau = 1.2 / h ** 0.5;
      const phase = (h * 1.7 + midi) % (2 * Math.PI);
      for (let i = s0; i < out.length; i++) {
        const t = (i - s0) / sampleRate;
        const sinceRelease = start + t - end;
        if (sinceRelease > release * 4) break;
        const damp = sinceRelease > 0 ? Math.exp(-sinceRelease / (release / 4)) : 1;
        const env = Math.min(1, t / 0.004) * Math.exp(-t / tau) * damp;
        out[i] += amp * env * Math.sin(2 * Math.PI * fh * t + phase);
      }
    }
  }
  return out;
}
