// Microphone capture via Web Audio. One AnalyserNode supplies both the time-domain window
// (for pitch) and the magnitude spectrum (for chords).

export const FFT_SIZE = 8192;
export const PITCH_WINDOW = 2048;
const RMS_WINDOW = 1024;

export class Mic {
  // Must be called from a user gesture (tap) so iOS lets the AudioContext start.
  async start({ raw = true } = {}) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    const resumed = this.ctx.resume();
    const audio = raw ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false } : true;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio });
    await resumed;
    this.raw = raw;
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0;
    this.source.connect(this.analyser);
    this.time = new Float32Array(FFT_SIZE);
    this.db = new Float32Array(FFT_SIZE / 2);
    this.mags = new Float32Array(FFT_SIZE / 2);
    return this;
  }

  get sampleRate() {
    return this.ctx.sampleRate;
  }

  diagnostics() {
    const track = this.stream?.getAudioTracks()[0];
    const settings = track?.getSettings?.() ?? {};
    return {
      requested: this.raw ? 'raw (processing off)' : 'default (voice processing on)',
      echoCancellation: settings.echoCancellation,
      noiseSuppression: settings.noiseSuppression,
      autoGainControl: settings.autoGainControl,
      sampleRate: this.ctx?.sampleRate,
      baseLatencyMs: this.ctx?.baseLatency != null ? Math.round(this.ctx.baseLatency * 1000) : undefined,
      device: track?.label,
      userAgent: navigator.userAgent,
    };
  }

  read() {
    this.analyser.getFloatTimeDomainData(this.time);
    this.analyser.getFloatFrequencyData(this.db);
    // The AnalyserNode reports dB; the detectors want linear magnitude.
    for (let i = 0; i < this.db.length; i++) this.mags[i] = this.db[i] === -Infinity ? 0 : 10 ** (this.db[i] / 20);
    let s = 0;
    for (let i = FFT_SIZE - RMS_WINDOW; i < FFT_SIZE; i++) s += this.time[i] * this.time[i];
    return {
      t: performance.now(),
      rms: Math.sqrt(s / RMS_WINDOW),
      pitchWindow: this.time.subarray(FFT_SIZE - PITCH_WINDOW),
      mags: this.mags,
    };
  }

  async stop() {
    this.stream?.getTracks().forEach((tr) => tr.stop());
    await this.ctx?.close();
    this.ctx = null;
    this.stream = null;
  }
}
