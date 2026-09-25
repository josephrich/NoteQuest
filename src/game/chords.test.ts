import { describe, expect, test } from 'vitest';
import { UNITS, chordItem, chordName, chordTip, findLesson, itemMidi, thirdQuality, triad } from './content';
import { THIRD_OPTIONS, buildLesson, challengeAnswer, describeNew, statItem } from './lesson';
import { LessonRun, XP } from './run';
import { keyboardKeys } from '../ui/PlayKeyboard';
import { spokenLines } from '../voice/lines';
import { learnedItems } from './review';
import { seededRandom } from '../engine/test-synth';

const unit = UNITS.find((u) => u.id === 'chords')!;
const chordLessons = unit.lessons.filter((l) => l.chords);
const semis = (ids: string[]) => ids.slice(1).map((id) => itemMidi(id) - itemMidi(ids[0]));

describe('the chords unit', () => {
  test('builds up: stacking, then 3rds, then minor, then making major, then the left hand', () => {
    expect(unit.lessons.map((l) => l.id)).toEqual([
      'guide-chords',
      'chords-1',
      'guide-thirds',
      'chords-2',
      'guide-major-minor',
      'chords-3',
      'guide-make-major',
      'chords-4',
      'guide-left-chords',
      'chords-5',
      'chords-6',
      'chords-7',
      'chords-check',
    ]);
    expect(findLesson('chords-check').lesson.checkpoint).toBe(true);
  });

  test('chords are named properly from the start, and spelled with the right 3rd', () => {
    expect(triad('treble:C4:major')).toEqual(['treble:C4', 'treble:E4', 'treble:G4']);
    expect(triad('treble:E4:minor')).toEqual(['treble:E4', 'treble:G4', 'treble:B4']);
    expect(triad('treble:E4:major')).toEqual(['treble:E4', 'treble:G#4', 'treble:B4']);
    expect(triad('treble:D4:major')).toEqual(['treble:D4', 'treble:F#4', 'treble:A4']);
    expect(triad('bass:F2:major')).toEqual(['bass:F2', 'bass:A2', 'bass:C3']);
    expect(chordName('treble:A4:minor')).toBe('A minor');
    expect(chordTip('treble:D4:major')).toBe('D major is D, F♯ and A. D to F♯ is a major 3rd: 4 semitones. Fingers 1, 3 and 5.');
    expect(chordTip('bass:A2:minor')).toBe('A minor is A, C and E. A to C is a minor 3rd: 3 semitones. Left hand: fingers 5, 3 and 1.');
    // Every chord in the course: a major chord has 4 semitones to its 3rd, a minor chord 3; the 5th is always 7.
    for (const l of chordLessons) {
      for (const ref of l.chords!.roots) {
        const [third, fifth] = semis(triad(ref));
        expect(third, ref).toBe(ref.endsWith('major') ? 4 : 3);
        expect(fifth, ref).toBe(7);
      }
    }
  });

  test('every chord fits on the on-screen piano and in the range the microphone hears', () => {
    for (const lesson of chordLessons) {
      for (const ref of lesson.chords!.roots) {
        const keys = keyboardKeys(ref.startsWith('treble') ? 'treble' : 'bass').flatMap((k) => [k.midi, k.midi + 1]);
        for (const id of triad(ref)) {
          expect(keys, `${ref}: ${id}`).toContain(itemMidi(id));
          expect(itemMidi(id)).toBeGreaterThanOrEqual(38);
          expect(itemMidi(id)).toBeLessThanOrEqual(84);
        }
      }
      for (const r of lesson.chords!.newRoots) expect(lesson.chords!.roots).toContain(r);
    }
  });

  test('new chords are met first, then a mix of naming, playing and chord runs', () => {
    const lesson = findLesson('chords-1').lesson;
    const cs = buildLesson(lesson, {}, { mic: true, rnd: seededRandom(1) });
    expect(cs.slice(0, 3).map((c) => [c.kind, c.items[0]])).toEqual([
      ['meet', 'treble:C4:major'],
      ['meet', 'treble:F4:major'],
      ['meet', 'treble:G4:major'],
    ]);
    const practice = cs.slice(3);
    expect(practice).toHaveLength(12);
    expect(new Set(practice.map((c) => c.kind))).toEqual(new Set(['name', 'play', 'burst']));
    expect(describeNew(lesson)).toEqual(['C major', 'F major', 'G major']);
    const seen = { seen: 3, correct: 3, wrong: 0, avgMs: 1000, lastSeen: 0 };
    const later = buildLesson(lesson, Object.fromEntries(lesson.chords!.roots.map((r) => [chordItem(r), seen])), { mic: true, rnd: seededRandom(1) });
    expect(later.some((c) => c.kind === 'meet')).toBe(false);
  });

  test('naming a chord always offers the same root with the other quality, so the 3rd is what is read', () => {
    for (const lesson of chordLessons) {
      const cs = buildLesson(lesson, {}, { mic: false, rnd: seededRandom(7) }).filter((c) => c.kind === 'name');
      expect(cs.length).toBeGreaterThan(0);
      for (const c of cs) {
        const answer = challengeAnswer(c);
        const flipped = answer.endsWith('major') ? answer.replace('major', 'minor') : answer.replace('minor', 'major');
        expect(c.options).toContain(answer);
        expect(c.options).toContain(flipped);
        expect(new Set(c.options).size).toBe(c.options!.length);
      }
    }
  });

  test('the 3rds lesson asks major or minor, answered by counting semitones', () => {
    const lesson = findLesson('chords-2').lesson;
    for (const [a, b] of lesson.thirds!.pairs) expect([3, 4]).toContain(itemMidi(b) - itemMidi(a));
    const cs = buildLesson(lesson, {}, { mic: true, rnd: seededRandom(2) });
    expect(cs).toHaveLength(12);
    for (const c of cs) {
      if (c.kind === 'interval') {
        expect(c.options).toEqual(THIRD_OPTIONS);
        expect(challengeAnswer(c)).toBe(thirdQuality(c.items[0], c.items[1]) === 'major' ? 'Major 3rd' : 'Minor 3rd');
        expect(statItem(c)).toMatch(/^third:(major|minor)$/);
      } else expect(c).toMatchObject({ kind: 'burst', startHint: true, third: true });
    }
    expect(challengeAnswer({ kind: 'interval', items: ['treble:D4', 'treble:F4'], third: true })).toBe('Minor 3rd');
    expect(challengeAnswer({ kind: 'interval', items: ['treble:D4', 'treble:F#4'], third: true })).toBe('Major 3rd');
  });

  test('without a microphone chords are named by tapping', () => {
    for (const lesson of chordLessons) {
      const cs = buildLesson(lesson, {}, { mic: false, rnd: seededRandom(4) });
      expect(cs.filter((c) => c.kind !== 'meet').every((c) => c.kind === 'name' && c.chord)).toBe(true);
    }
  });

  test('the new lines can be read aloud', () => {
    const lines = spokenLines();
    for (const l of ['Which chord is this?', 'Play this chord', 'Major or minor 3rd?', chordTip('treble:D4:major'), chordTip('bass:A2:minor')]) expect(lines).toContain(l);
  });
});

describe('playing a chord lesson', () => {
  test('meeting, naming, playing and a run of chords', () => {
    const run = new LessonRun(
      'chords-1',
      [
        { kind: 'meet', items: ['treble:C4:major'], chord: true },
        { kind: 'name', items: ['treble:F4:major'], chord: true, options: ['C major', 'F major', 'F minor', 'G major'] },
        { kind: 'play', items: ['treble:G4:major'], chord: true },
        { kind: 'burst', items: ['treble:C4:major', 'treble:F4:major', 'treble:G4:major'], chord: true },
      ],
      0,
      seededRandom(1),
    );
    expect(run.play(60, 50)).toBeNull();
    expect(run.playChord({ correct: false, heard: 'F major' }, 60)).toBeNull();
    expect(run.playChord({ correct: true }, 100)?.correct).toBe(true);
    run.next(200);
    expect(run.tap('F major', 1000)?.xp).toBe(XP.name + XP.lightning);
    run.next(1100);
    expect(run.playChord({ correct: false, heard: 'C major' }, 1500)).toMatchObject({ correct: false, heard: 'C major' });
    expect(run.playChord({ correct: true }, 2000)?.xp).toBe(1);
    run.next(2100);
    run.playChord({ correct: true }, 2600);
    run.playChord({ correct: false, inverted: true }, 3000);
    run.playChord({ correct: true }, 3500);
    expect(run.playChord({ correct: true }, 4000)?.xp).toBe(2 * XP.burstChord);
    run.next(4100);
    expect(run.phase).toBe('done');
    expect(run.outcome(0).answers.map((a) => [a.id, a.correct])).toEqual([
      ['chord:treble:F4:major', true],
      ['chord:treble:G4:major', false],
      ['chord:treble:C4:major', true],
      ['chord:treble:F4:major', false],
      ['chord:treble:G4:major', true],
    ]);
    expect(learnedItems({ 'chord:treble:C4:major': { seen: 1, correct: 1, wrong: 0, avgMs: 900, lastSeen: 0 } })).toEqual([]);
  });

  test('four wrong chords reveal the answer; on screen it earns half', () => {
    const run = new LessonRun('chords-1', [{ kind: 'play', items: ['treble:C4:major'], chord: true }], 0, seededRandom(1));
    for (let i = 0; i < 4; i++) run.playChord({ correct: false, close: true }, 100 * (i + 1));
    expect(run.phase).toBe('reveal');
    const screen = new LessonRun('chords-1', [{ kind: 'play', items: ['treble:C4:major'], chord: true }], 0, seededRandom(1), true);
    expect(screen.playChord({ correct: true }, 500)?.xp).toBe(Math.ceil(XP.chord / 2));
  });
});
