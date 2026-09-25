import { describe, expect, test } from 'vitest';
import { UNITS, chordItem, chordLabel, chordName, chordTip, findLesson, itemMidi, triad } from './content';
import { buildLesson, challengeAnswer, describeNew } from './lesson';
import { LessonRun, XP } from './run';
import { KEYBOARD_RANGE, keyboardKeys } from '../ui/PlayKeyboard';
import { spokenLines } from '../voice/lines';
import { learnedItems } from './review';
import { seededRandom } from '../engine/test-synth';

const unit = UNITS.find((u) => u.id === 'chords')!;
const chordLessons = unit.lessons.filter((l) => l.chords);

describe('the chords unit', () => {
  test('is open, with a guide before each new idea and a checkpoint at the end', () => {
    expect(unit.comingSoon).toBeFalsy();
    expect(unit.lessons.map((l) => l.id)).toEqual([
      'guide-chords',
      'chords-1',
      'chords-2',
      'guide-left-chords',
      'chords-3',
      'chords-4',
      'guide-major-minor',
      'chords-5',
      'chords-check',
    ]);
    expect(findLesson('chords-check').lesson.checkpoint).toBe(true);
  });

  test('chords are built a skip apart, all on lines or all in spaces', () => {
    expect(triad('treble:C4')).toEqual(['treble:C4', 'treble:E4', 'treble:G4']);
    expect(triad('bass:F2')).toEqual(['bass:F2', 'bass:A2', 'bass:C3']);
    expect(chordTip('treble:C4')).toBe('The C chord is C, E and G: all on lines. Use fingers 1, 3 and 5.');
    expect(chordTip('treble:F4')).toBe('The F chord is F, A and C: all in spaces. Use fingers 1, 3 and 5.');
    expect(chordName('treble:A4', true)).toBe('A minor');
    expect(chordName('bass:G2', true)).toBe('G major');
    expect(chordLabel('treble:D4')).toBe('the D chord');
  });

  test('every chord fits on the on-screen piano and in the range the microphone hears', () => {
    for (const lesson of chordLessons) {
      for (const root of lesson.chords!.roots) {
        const keys = keyboardKeys(root.startsWith('treble') ? 'treble' : 'bass').map((k) => k.midi);
        for (const id of triad(root)) {
          expect(keys, `${root}: ${id}`).toContain(itemMidi(id));
          expect(itemMidi(id)).toBeGreaterThanOrEqual(38);
          expect(itemMidi(id)).toBeLessThanOrEqual(84);
        }
      }
      for (const r of lesson.chords!.newRoots) expect(lesson.chords!.roots).toContain(r);
    }
    expect(KEYBOARD_RANGE.treble).toBeDefined();
  });

  test('new chords are met first, then a mix of naming, playing and chord runs', () => {
    const lesson = findLesson('chords-1').lesson;
    const cs = buildLesson(lesson, {}, { mic: true, rnd: seededRandom(1) });
    expect(cs.slice(0, 3).map((c) => [c.kind, c.items[0]])).toEqual([
      ['meet', 'treble:C4'],
      ['meet', 'treble:F4'],
      ['meet', 'treble:G4'],
    ]);
    const practice = cs.slice(3);
    expect(practice).toHaveLength(12);
    expect(practice.every((c) => c.chord)).toBe(true);
    expect(new Set(practice.map((c) => c.kind))).toEqual(new Set(['name', 'play', 'burst']));
    for (const c of practice.filter((c) => c.kind === 'burst')) {
      expect(c.items).toHaveLength(3);
      for (let i = 1; i < c.items.length; i++) expect(c.items[i]).not.toBe(c.items[i - 1]);
    }
    expect(describeNew(lesson)).toEqual(['C', 'F', 'G']);
    const seen = { seen: 3, correct: 3, wrong: 0, avgMs: 1000, lastSeen: 0 };
    const later = buildLesson(lesson, Object.fromEntries(lesson.chords!.roots.map((r) => [chordItem(r), seen])), { mic: true, rnd: seededRandom(1) });
    expect(later.some((c) => c.kind === 'meet')).toBe(false);
  });

  test('without a microphone chords are named by tapping', () => {
    for (const lesson of chordLessons) {
      const cs = buildLesson(lesson, {}, { mic: false, rnd: seededRandom(4) });
      expect(cs.filter((c) => c.kind !== 'meet').every((c) => c.kind === 'name' && c.chord)).toBe(true);
    }
  });

  test('naming options include the answer once; in full, the same letter with the other quality too', () => {
    for (const id of ['chords-2', 'chords-5']) {
      const lesson = findLesson(id).lesson;
      const cs = buildLesson(lesson, {}, { mic: false, rnd: seededRandom(7) }).filter((c) => c.kind === 'name');
      for (const c of cs) {
        const answer = challengeAnswer(c);
        expect(c.options!.filter((o) => o === answer)).toHaveLength(1);
        expect(new Set(c.options).size).toBe(c.options!.length);
        expect(c.options!.length).toBe(4);
        if (lesson.chords!.quality) {
          const flipped = answer.endsWith('major') ? answer.replace('major', 'minor') : answer.replace('minor', 'major');
          expect(c.options).toContain(flipped);
        }
      }
    }
  });

  test('the new lines can be read aloud', () => {
    const lines = spokenLines();
    for (const l of ['Which chord is this?', 'Play this chord', chordTip('treble:C4'), chordTip('bass:A2')]) expect(lines).toContain(l);
  });
});

describe('playing a chord lesson', () => {
  test('meeting, naming, playing and a run of chords', () => {
    const run = new LessonRun(
      'chords-1',
      [
        { kind: 'meet', items: ['treble:C4'], chord: true },
        { kind: 'name', items: ['treble:F4'], chord: true, options: ['C', 'F', 'G'] },
        { kind: 'play', items: ['treble:G4'], chord: true },
        { kind: 'burst', items: ['treble:C4', 'treble:F4', 'treble:G4'], chord: true },
      ],
      0,
      seededRandom(1),
    );
    // Single notes don't count in a chord lesson, and meeting a chord never marks it wrong.
    expect(run.play(60, 50)).toBeNull();
    expect(run.playChord({ correct: false, heard: 'the F chord' }, 60)).toBeNull();
    expect(run.playChord({ correct: true }, 100)?.correct).toBe(true);
    run.next(200);
    expect(run.tap('F', 1000)?.xp).toBe(XP.name + XP.lightning);
    run.next(1100);
    // A wrong chord says which chord it was; the right one then earns the retry point.
    const miss = run.playChord({ correct: false, heard: 'the C chord' }, 1500);
    expect(miss).toMatchObject({ correct: false, heard: 'the C chord' });
    expect(run.playChord({ correct: true }, 2000)?.xp).toBe(1);
    run.next(2100);
    run.playChord({ correct: true }, 2600);
    expect(run.expected).toBe('treble:F4');
    run.playChord({ correct: false, close: true }, 3000);
    run.playChord({ correct: true }, 3500);
    expect(run.playChord({ correct: true }, 4000)?.xp).toBe(2 * XP.burstChord);
    run.next(4100);
    expect(run.phase).toBe('done');
    const out = run.outcome(0);
    expect(out.answers.map((a) => [a.id, a.correct])).toEqual([
      ['chord:treble:F4', true],
      ['chord:treble:G4', false],
      ['chord:treble:C4', true],
      ['chord:treble:F4', false],
      ['chord:treble:G4', true],
    ]);
    // Chord stats stay out of the note-based Daily Review.
    expect(learnedItems({ 'chord:treble:C4': { seen: 1, correct: 1, wrong: 0, avgMs: 900, lastSeen: 0 } })).toEqual([]);
  });

  test('three wrong chords reveal the answer; on screen it earns half', () => {
    const run = new LessonRun('chords-1', [{ kind: 'play', items: ['treble:C4'], chord: true }], 0, seededRandom(1));
    for (let i = 0; i < 3; i++) run.playChord({ correct: false, close: true }, 100 * (i + 1));
    expect(run.phase).toBe('reveal');
    const screen = new LessonRun('chords-1', [{ kind: 'play', items: ['treble:C4'], chord: true }], 0, seededRandom(1), true);
    expect(screen.playChord({ correct: true }, 500)?.xp).toBe(Math.ceil(XP.chord / 2));
  });
});
