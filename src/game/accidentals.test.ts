import { describe, expect, test } from 'vitest';
import { UNITS, findLesson, itemMidi, itemName, noteTip, plainItem } from './content';
import { buildLesson, challengeAnswer, nameOptions, statItem } from './lesson';
import { LessonRun, MAX_PLAY_TRIES } from './run';
import { seededRandom } from '../engine/test-synth';

describe('sharps, flats and naturals', () => {
  const unit = UNITS.find((u) => u.id === 'accidentals')!;

  test('the unit starts with semitones, then sharps, flats and naturals', () => {
    expect(unit.lessons.map((l) => l.id)).toEqual(['guide-semitones', 'guide-sharps', 'acc-1', 'guide-flats', 'acc-2', 'guide-naturals', 'acc-3', 'acc-4', 'acc-check']);
  });

  test('notes are named with their sign, and explained as a semitone up or down', () => {
    expect(itemName('treble:F#4')).toBe('F♯');
    expect(itemName('treble:Bb4')).toBe('B♭');
    expect(itemName('treble:Fn4')).toBe('F');
    expect(itemMidi('treble:F#4')).toBe(66);
    expect(itemMidi('treble:Bb4')).toBe(70);
    expect(noteTip('treble:F#4')).toBe('This is F sharp: F raised a semitone, to the key just right of F.');
    expect(noteTip('treble:Bb4')).toBe('This is B flat: B lowered a semitone, to the key just left of B.');
    expect(noteTip('treble:Fn4')).toMatch(/natural sign cancels/);
  });

  test('naming choices include the same letter with and without its sign', () => {
    for (const id of ['acc-1', 'acc-2', 'acc-3', 'acc-4', 'acc-check']) {
      const lesson = findLesson(id).lesson;
      const cs = buildLesson(lesson, {}, { mic: false, rnd: seededRandom(3) }).filter((c) => c.kind === 'name');
      for (const c of cs) {
        const answer = challengeAnswer(c);
        expect(c.options).toContain(answer);
        expect(c.options!.filter((o) => o[0] === answer[0]).length, `${answer}: ${c.options}`).toBeGreaterThanOrEqual(2);
        expect(new Set(c.options).size).toBe(4);
      }
    }
    expect(nameOptions('treble:G4', seededRandom(1))).toHaveLength(4);
  });

  test('a note written with a natural sign counts as the plain note', () => {
    expect(plainItem('treble:Fn4')).toBe('treble:F4');
    expect(statItem({ kind: 'play', items: ['treble:Fn4'] })).toBe('treble:F4');
    const run = new LessonRun('acc-3', [{ kind: 'play', items: ['treble:Fn4'] }], 0);
    expect(run.play(65, 500)?.correct).toBe(true);
  });
});

describe('runs of notes', () => {
  test('after four misses on one note it is shown and the run moves on; the notes he got still count', () => {
    const run = new LessonRun('x', [{ kind: 'burst', items: ['treble:C4', 'treble:E4', 'treble:G4'] }], 0);
    run.play(60, 100);
    for (let i = 0; i < MAX_PLAY_TRIES - 1; i++) expect(run.play(62, 200 + i)?.revealed).toBeUndefined();
    expect(run.play(62, 300)).toMatchObject({ correct: false, revealed: 'treble:E4' });
    expect(run.phase).toBe('asking');
    expect(run.expected).toBe('treble:G4');
    expect(run.stepResults).toEqual([true, false]);
    // And on the last note, the run ends with the answer shown.
    for (let i = 0; i < MAX_PLAY_TRIES; i++) run.play(69, 400 + i);
    expect(run.phase).toBe('reveal');
    expect(run.xp).toBe(1);
    expect(run.outcome(0).answers.map((a) => [a.id, a.correct])).toEqual([
      ['treble:C4', true],
      ['treble:E4', false],
      ['treble:G4', false],
    ]);
  });

  test('a wrong note carries the note played, for showing it on the staff', () => {
    const run = new LessonRun('x', [{ kind: 'play', items: ['treble:C5'] }], 0);
    expect(run.play(67, 100)).toMatchObject({ correct: false, midi: 67, heard: 'G' });
  });
});
