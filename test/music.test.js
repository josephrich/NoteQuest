import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomNote, randomTriad, spell, toMidi, note } from '../src/music.js';
import { seededRandom } from './synth.js';

test('middle C is MIDI 60', () => {
  assert.equal(toMidi(note(0, 4)), 60);
});

test('triads are spelled from the key signature', () => {
  const rnd = seededRandom(3);
  const seen = new Map();
  for (let i = 0; i < 400; i++) {
    const t = randomTriad({ keys: ['F', 'D', 'Bb'], clefs: ['treble', 'bass'], inversions: true, rnd });
    seen.set(t.label, t);
    for (let j = 1; j < 3; j++) assert.ok(t.midis[j] > t.midis[j - 1], `${t.label} not ascending`);
  }
  const names = [...seen.values()].map((t) => t.notes.map(spell).join('-'));
  assert.ok(names.includes('Bb4-D5-F5'), 'F major IV should be Bb-D-F');
  assert.ok(names.includes('D4-F#4-A4'), 'D major I should be D-F#-A');
  assert.ok(!names.some((n) => n.includes('A#')), 'flat keys must not use sharps');
});

test('random notes stay in the clef range and avoid immediate repeats', () => {
  const rnd = seededRandom(9);
  let prev = null;
  for (let i = 0; i < 300; i++) {
    const t = randomNote({ clefs: ['bass'], accidentals: true, avoidMidi: prev, rnd });
    assert.ok(t.midis[0] >= 40 && t.midis[0] <= 61, `${t.label} out of bass range`);
    assert.notEqual(t.midis[0], prev);
    prev = t.midis[0];
  }
});
