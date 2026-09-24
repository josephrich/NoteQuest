// In-place iterative radix-2 FFT. `re` and `im` must have the same power-of-two length.
export function fft(re, im, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k;
        const b = a + half;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

export function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// Linear magnitude spectrum with a Blackman window, matching what the Web Audio
// AnalyserNode computes (before its dB conversion). Returns fftSize/2 bins.
export function magnitudeSpectrum(samples) {
  const n = samples.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const a0 = 0.42;
  const a1 = 0.5;
  const a2 = 0.08;
  for (let i = 0; i < n; i++) {
    const w = a0 - a1 * Math.cos((2 * Math.PI * i) / n) + a2 * Math.cos((4 * Math.PI * i) / n);
    re[i] = samples[i] * w;
  }
  fft(re, im);
  const out = new Float32Array(n / 2);
  for (let k = 0; k < n / 2; k++) out[k] = Math.hypot(re[k], im[k]) / n;
  return out;
}
