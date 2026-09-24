// Microphone capture via Web Audio. One AnalyserNode supplies both the time-domain window
// (for pitch) and the magnitude spectrum (for chords).

export const FFT_SIZE = 8192;
export const PITCH_WINDOW = 2048;
const RMS_WINDOW = 1024;

export interface Frame {
  t: number;
  rms: number;
  pitchWindow: Float32Array;
  mags: Float32Array;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export class Mic {
  raw = true;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private time = new Float32Array(FFT_SIZE);
  private db = new Float32Array(FFT_SIZE / 2);
  private mags = new Float32Array(FFT_SIZE / 2);

  // Must be called from a user gesture (tap) so iOS lets the AudioContext start.
  async start({ raw = true } = {}): Promise<this> {
    const Ctx = window.AudioContext || window.webkitAudioContext!;
    const ctx = new Ctx();
    this.ctx = ctx;
    const resumed = ctx.resume();
    const audio = raw ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false } : true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio });
    } catch (err) {
      await ctx.close();
      this.ctx = null;
      throw err;
    }
    await resumed;
    this.raw = raw;
    const source = ctx.createMediaStreamSource(this.stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0;
    source.connect(this.analyser);
    return this;
  }

  get running(): boolean {
    return this.ctx !== null;
  }

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 48000;
  }

  // iOS suspends the audio context when the app is backgrounded.
  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state !== 'running') await this.ctx.resume();
  }

  diagnostics() {
    const track = this.stream?.getAudioTracks()[0];
    const settings: MediaTrackSettings = track?.getSettings?.() ?? {};
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

  read(): Frame {
    const analyser = this.analyser!;
    analyser.getFloatTimeDomainData(this.time);
    analyser.getFloatFrequencyData(this.db);
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

  async stop(): Promise<void> {
    this.stream?.getTracks().forEach((tr) => tr.stop());
    await this.ctx?.close();
    this.ctx = null;
    this.stream = null;
    this.analyser = null;
  }
}
