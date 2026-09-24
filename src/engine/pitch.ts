// Monophonic pitch detection using the McLeod Pitch Method (NSDF + key maxima).
// Autocorrelation is computed via FFT so it stays cheap enough to run every frame on an iPad.
import { fft, nextPow2 } from './fft';

export interface Pitch {
  freq: number;
  clarity: number;
}

const scratch = new Map<number, { re: Float64Array; im: Float64Array }>();

function buffers(size: number) {
  let b = scratch.get(size);
  if (!b) {
    b = { re: new Float64Array(size), im: new Float64Array(size) };
    scratch.set(size, b);
  }
  return b;
}

export function detectPitch(
  buf: Float32Array,
  sampleRate: number,
  { minFreq = 55, maxFreq = 2100, cutoff = 0.9, minRms = 0.002 } = {},
): Pitch | null {
  const n = buf.length;
  let sumSq = 0;
  for (let i = 0; i < n; i++) sumSq += buf[i] * buf[i];
  if (Math.sqrt(sumSq / n) < minRms) return null;

  const size = nextPow2(2 * n);
  const { re, im } = buffers(size);
  re.fill(0);
  im.fill(0);
  for (let i = 0; i < n; i++) re[i] = buf[i];
  fft(re, im);
  for (let k = 0; k < size; k++) {
    re[k] = re[k] * re[k] + im[k] * im[k];
    im[k] = 0;
  }
  fft(re, im, true); // re now holds the linear autocorrelation

  const maxLag = Math.min(n - 1, Math.floor(sampleRate / minFreq));
  const minLag = Math.max(2, Math.floor(sampleRate / maxFreq));
  const nsdf = new Float64Array(maxLag + 2);
  let m = 2 * sumSq;
  nsdf[0] = 1;
  for (let tau = 1; tau <= maxLag + 1 && tau < n; tau++) {
    m -= buf[tau - 1] * buf[tau - 1] + buf[n - tau] * buf[n - tau];
    nsdf[tau] = m > 1e-12 ? (2 * re[tau]) / m : 0;
  }

  // Key maxima: the highest point in each positive lobe after the first negative crossing.
  const peaks: number[] = [];
  let tau = 1;
  while (tau < maxLag && nsdf[tau] > 0) tau++;
  while (tau < maxLag) {
    while (tau < maxLag && nsdf[tau] <= 0) tau++;
    let best = -1;
    let bestTau = -1;
    while (tau < maxLag && nsdf[tau] > 0) {
      if (nsdf[tau] > best) {
        best = nsdf[tau];
        bestTau = tau;
      }
      tau++;
    }
    if (bestTau >= minLag) peaks.push(bestTau);
  }
  if (!peaks.length) return null;

  let highest = 0;
  for (const p of peaks) highest = Math.max(highest, nsdf[p]);
  const chosen = peaks.find((p) => nsdf[p] >= cutoff * highest)!;

  const a = nsdf[chosen - 1];
  const b = nsdf[chosen];
  const c = nsdf[chosen + 1];
  const denom = a - 2 * b + c;
  const shift = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
  const period = chosen + shift;
  return { freq: sampleRate / period, clarity: b - 0.25 * (a - c) * shift };
}
