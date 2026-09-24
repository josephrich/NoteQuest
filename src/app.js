import { Mic, FFT_SIZE } from './audio.js';
import { detectPitch } from './pitch.js';
import { findPeaks, chroma } from './chord.js';
import { OnsetDetector, NoteTracker, ChordTracker } from './trackers.js';
import { randomNote, randomTriad, midiName, freqToMidiFloat } from './music.js';
import { renderTarget } from './staff.js';

const $ = (id) => document.getElementById(id);
const PC_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable (private mode); results still live in memory */
    }
  },
};

const state = {
  mic: null,
  running: false,
  mode: 'notes',
  refA4: store.get('nq.refA4', 440),
  attempts: store.get('nq.attempts', []),
  target: null,
  shownT: 0,
  tries: 0,
  awaitingNext: false,
  calibrating: null,
  frame: 0,
};

let onsets;
let noteTracker;
let chordTracker;

// ---------- microphone ----------

async function startMic() {
  $('start').disabled = true;
  try {
    state.mic = await new Mic().start({ raw: $('raw').checked });
  } catch (err) {
    $('start').disabled = false;
    const denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
    setFeedback(denied ? 'Microphone permission was blocked. Allow it in Settings › Safari › Microphone, then reload.' : `Couldn't start the microphone: ${err.message}`, 'bad');
    return;
  }
  onsets = new OnsetDetector();
  noteTracker = new NoteTracker({ refA4: state.refA4 });
  chordTracker = new ChordTracker({ refA4: state.refA4, sampleRate: state.mic.sampleRate, fftSize: FFT_SIZE });
  state.running = true;
  $('start').disabled = false;
  $('start').textContent = 'Stop listening';
  $('diag').textContent = JSON.stringify(state.mic.diagnostics(), null, 2);
  nextTarget();
  requestAnimationFrame(tick);
}

async function stopMic() {
  state.running = false;
  await state.mic?.stop();
  state.mic = null;
  $('start').textContent = 'Start listening';
  $('level').style.width = '0';
  $('heard-note').textContent = '–';
  $('heard-detail').textContent = '';
  setFeedback('Microphone stopped.');
}

function tick() {
  if (!state.running) return;
  const f = state.mic.read();
  const onset = onsets.update(f.t, f.rms);
  const pitch = detectPitch(f.pitchWindow, state.mic.sampleRate);
  const noteEvent = noteTracker.update({ t: f.t, onset, silent: f.rms < onsets.gate, pitch });

  if (state.calibrating) {
    if (noteEvent) handleCalibration(noteEvent);
  } else if (state.mode === 'notes') {
    if (noteEvent) handleNote(noteEvent);
  } else {
    const chordEvent = chordTracker.update({ t: f.t, onset, mags: f.mags });
    if (chordEvent) handleChord(chordEvent);
    if (state.frame % 4 === 0) drawChroma(f.mags);
  }
  if (state.frame % 3 === 0) drawLive(f.rms, pitch);
  state.frame++;
  requestAnimationFrame(tick);
}

function drawLive(rms, pitch) {
  $('level').style.width = `${Math.min(100, Math.sqrt(rms) * 250)}%`;
  // A single-pitch readout is meaningless for chords; the chroma bars show what's heard instead.
  if (state.mode === 'chords' && !state.calibrating) {
    $('heard-note').textContent = '';
    $('heard-detail').textContent = 'see the bars below';
  } else if (pitch && pitch.clarity >= 0.8 && rms >= onsets.gate) {
    const mf = freqToMidiFloat(pitch.freq, state.refA4);
    const midi = Math.round(mf);
    const cents = Math.round((mf - midi) * 100);
    $('heard-note').textContent = midiName(midi);
    $('heard-detail').textContent = `${cents >= 0 ? '+' : ''}${cents}¢ · ${pitch.freq.toFixed(1)} Hz · clarity ${pitch.clarity.toFixed(2)}`;
  }
}

function drawChroma(mags) {
  const { peaks } = findPeaks(mags, state.mic.sampleRate, FFT_SIZE);
  const c = chroma(peaks, state.refA4);
  const expected = new Set((state.target?.midis ?? []).map((m) => m % 12));
  const el = $('chroma');
  if (!el.children.length) {
    el.innerHTML = PC_NAMES.map((n) => `<div><span></span>${n}</div>`).join('');
  }
  [...el.children].forEach((col, i) => {
    col.classList.toggle('expected', expected.has(i));
    col.firstChild.style.height = `${Math.round(c[i] * 70)}px`;
  });
}

// ---------- targets and judging ----------

function selectedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
}

function nextTarget() {
  const prev = state.target;
  if (state.mode === 'notes') {
    const clefs = selectedValues('clef');
    state.target = randomNote({
      clefs: clefs.length ? clefs : ['treble'],
      accidentals: $('accidentals').checked,
      avoidMidi: prev?.midis?.length === 1 ? prev.midis[0] : null,
    });
  } else {
    const keys = selectedValues('key');
    state.target = randomTriad({
      keys: keys.length ? keys : ['C'],
      clefs: ['treble', ...selectedValues('chordclef')],
      inversions: $('inversions').checked,
      avoidLabel: prev?.label,
    });
    chordTracker?.setTarget(state.target.midis);
  }
  renderTarget($('staff'), state.target);
  $('target-label').textContent = $('reveal').checked ? state.target.label : '';
  state.shownT = performance.now();
  state.tries = 0;
  state.awaitingNext = false;
  setFeedback(state.running ? 'Play it!' : 'Start the microphone to begin.');
}

function record(attempt) {
  const a = { ...attempt, raw: state.mic.raw, refA4: Math.round(state.refA4 * 10) / 10, at: new Date().toISOString() };
  state.attempts.push(a);
  store.set('nq.attempts', state.attempts);
  $('flag').disabled = false;
  renderResults();
  return a;
}

function acceptEvent(ev) {
  // Ignore the tail of whatever was played before this target appeared.
  return state.target && !state.awaitingNext && ev.onsetT >= state.shownT + 120;
}

function succeed() {
  state.awaitingNext = true;
  setTimeout(() => {
    if (state.running && state.awaitingNext) nextTarget();
  }, 700);
}

function handleNote(ev) {
  if (!acceptEvent(ev)) return;
  const targetMidi = state.target.midis[0];
  const correct = ev.midi === targetMidi;
  const octaveSlip = !correct && ev.midi % 12 === targetMidi % 12;
  state.tries++;
  record({
    mode: 'notes',
    target: state.target.label,
    heard: midiName(ev.midi),
    cents: ev.cents,
    correct,
    octaveSlip,
    try: state.tries,
    readMs: Math.round(ev.onsetT - state.shownT),
    detectMs: Math.round(ev.t - ev.onsetT),
  });
  if (correct) {
    setFeedback(`✓ ${state.target.label}`, 'good');
    succeed();
  } else {
    setFeedback(`Heard ${midiName(ev.midi)}${octaveSlip ? ' (right note, wrong octave)' : ''}. Try again.`, 'bad');
  }
}

function handleChord(ev) {
  if (!acceptEvent(ev)) return;
  state.tries++;
  const missing = state.target.midis.filter((_, i) => ev.presence[i] < 0.08).map(midiName);
  record({
    mode: 'chords',
    target: state.target.label,
    correct: ev.pass,
    explained: Math.round(ev.explained * 100) / 100,
    missing,
    try: state.tries,
    readMs: Math.round(ev.onsetT - state.shownT),
    detectMs: Math.round(ev.t - ev.onsetT),
  });
  if (ev.pass) {
    setFeedback('✓ Chord!', 'good');
    succeed();
  } else {
    const parts = [];
    if (missing.length) parts.push(`missing ${missing.join(', ')}`);
    if (ev.explained < 0.8) parts.push('heard extra notes');
    setFeedback(`Not quite${parts.length ? ` (${parts.join('; ')})` : ''}. Try again.`, 'bad');
  }
}

function flagLast() {
  const last = state.attempts[state.attempts.length - 1];
  if (!last) return;
  last.flagged = true;
  store.set('nq.attempts', state.attempts);
  $('flag').disabled = true;
  renderResults();
  // If the app wrongly rejected a correct answer, don't make him play it again.
  if (!last.correct && !state.awaitingNext) {
    setFeedback('Noted. Moving on.');
    succeed();
  } else {
    setFeedback('Noted, thanks.');
  }
}

function setFeedback(text, kind = '') {
  const el = $('feedback');
  el.textContent = text;
  el.className = `feedback ${kind}`;
}

// ---------- calibration ----------

function startCalibration() {
  if (!state.running) {
    $('cal-status').textContent = 'Start the microphone first.';
    return;
  }
  state.calibrating = { readings: [] };
  noteTracker.refA4 = 440;
  $('cal-status').textContent = 'Listening for A (1 of 3)…';
}

function handleCalibration(ev) {
  const mf = freqToMidiFloat(ev.freq, 440);
  if (Math.abs(mf - 69) > 1.5) {
    $('cal-status').textContent = `That sounded like ${midiName(Math.round(mf))}. Play the A above middle C.`;
    return;
  }
  const { readings } = state.calibrating;
  readings.push(ev.freq);
  if (readings.length < 3) {
    $('cal-status').textContent = `Got it (${readings.length} of 3)…`;
    return;
  }
  readings.sort((a, b) => a - b);
  setRefA4(readings[1]);
  state.calibrating = null;
}

function setRefA4(ref) {
  state.refA4 = ref;
  store.set('nq.refA4', ref);
  if (noteTracker) noteTracker.refA4 = ref;
  if (chordTracker) chordTracker.refA4 = ref;
  showCalibration();
}

function showCalibration() {
  const cents = Math.round(1200 * Math.log2(state.refA4 / 440));
  const how = cents === 0 ? 'in tune' : `${Math.abs(cents)} cents ${cents < 0 ? 'flat' : 'sharp'}`;
  $('cal-status').textContent = `A = ${state.refA4.toFixed(1)} Hz (${how}).`;
}

// ---------- results ----------

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

function renderResults() {
  const groups = new Map();
  for (const a of state.attempts) {
    const key = `${a.mode}|${a.raw}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  }
  const body = $('stats').tBodies[0];
  if (!groups.size) {
    body.innerHTML = '<tr><td colspan="7" class="muted">No attempts yet.</td></tr>';
  } else {
    body.innerHTML = [...groups.entries()]
      .map(([key, list]) => {
        const [mode, raw] = key.split('|');
        const flagged = list.filter((a) => a.flagged).length;
        const acc = Math.round((100 * (list.length - flagged)) / list.length);
        const slips = mode === 'notes' ? String(list.filter((a) => a.octaveSlip).length) : '–';
        const read = median(list.filter((a) => a.try === 1).map((a) => a.readMs));
        const detect = median(list.map((a) => a.detectMs));
        return `<tr><td>${mode === 'notes' ? 'Single notes' : 'Chords'}</td><td>${raw === 'true' ? 'Raw' : 'Processed'}</td><td>${list.length}</td><td>${acc}%</td><td>${slips}</td><td>${read != null ? (read / 1000).toFixed(1) + ' s' : '–'}</td><td>${detect != null ? detect + ' ms' : '–'}</td></tr>`;
      })
      .join('');
  }
  $('log').innerHTML = state.attempts
    .slice(-40)
    .reverse()
    .map((a) => {
      const what = a.mode === 'notes' ? `heard ${a.heard} (${a.cents >= 0 ? '+' : ''}${a.cents}¢)` : `${Math.round(a.explained * 100)}% explained${a.missing.length ? `, missing ${a.missing.join(', ')}` : ''}`;
      return `<li class="${a.correct ? 'ok' : 'no'}">${a.target}: ${what}${a.flagged ? ' ⚑ flagged' : ''}</li>`;
    })
    .join('');
}

function exportJson() {
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), refA4: state.refA4, diagnostics: state.mic?.diagnostics() ?? null, attempts: state.attempts },
    null,
    2,
  );
}

function download() {
  const blob = new Blob([exportJson()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `notequest-mic-test-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function copy() {
  try {
    await navigator.clipboard.writeText(exportJson());
    $('copy-status').textContent = 'Copied.';
  } catch {
    download();
    $('copy-status').textContent = 'Clipboard unavailable, so it was downloaded instead.';
  }
}

// ---------- wiring ----------

function setMode(mode) {
  state.mode = mode;
  $('tab-notes').setAttribute('aria-selected', String(mode === 'notes'));
  $('tab-chords').setAttribute('aria-selected', String(mode === 'chords'));
  $('opts-notes').hidden = mode !== 'notes';
  $('opts-chords').hidden = mode !== 'chords';
  $('chroma').hidden = mode !== 'chords';
  nextTarget();
}

function init() {
  if (!window.isSecureContext) $('insecure').hidden = false;
  $('start').addEventListener('click', () => (state.running ? stopMic() : startMic()));
  $('raw').addEventListener('change', async () => {
    if (!state.running) return;
    await stopMic();
    await startMic();
  });
  $('calibrate').addEventListener('click', startCalibration);
  $('cal-reset').addEventListener('click', () => setRefA4(440));
  $('tab-notes').addEventListener('click', () => setMode('notes'));
  $('tab-chords').addEventListener('click', () => setMode('chords'));
  $('next').addEventListener('click', nextTarget);
  $('flag').addEventListener('click', flagLast);
  $('reveal').addEventListener('change', () => {
    $('target-label').textContent = $('reveal').checked && state.target ? state.target.label : '';
  });
  document.querySelectorAll('.opts input').forEach((i) => i.addEventListener('change', nextTarget));
  $('copy').addEventListener('click', copy);
  $('download').addEventListener('click', download);
  $('clear').addEventListener('click', () => {
    if (!confirm('Clear all recorded attempts?')) return;
    state.attempts = [];
    store.set('nq.attempts', []);
    renderResults();
  });
  showCalibration();
  renderResults();
  nextTarget();
}

init();
