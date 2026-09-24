// Short reward sounds. They are pitched above the note detector's range (E7 and up) and only play
// while the app isn't listening, so they can't be mistaken for piano notes.
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

// Call from a tap so iOS allows audio.
export function unlockSound(): void {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) ctx = new Ctx();
  }
  void ctx?.resume();
}

function blip(freq: number, start: number, dur = 0.09, gain = 0.06, type: OscillatorType = 'triangle') {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const E7 = 2637;
const G7 = 3136;
const C8 = 4186;
const B7 = 3951;

export const sfx = {
  correct() {
    blip(E7, 0);
    blip(G7, 0.08);
  },
  lightning() {
    blip(E7, 0);
    blip(G7, 0.06);
    blip(B7, 0.12);
  },
  wrong() {
    blip(2800, 0, 0.12, 0.03, 'sine');
    blip(2500, 0.1, 0.16, 0.03, 'sine');
  },
  complete() {
    [E7, G7, B7, C8].forEach((f, i) => blip(f, i * 0.11, 0.16, 0.05));
  },
  chest() {
    [G7, C8, G7, C8].forEach((f, i) => blip(f, i * 0.07, 0.08, 0.04));
  },
};
