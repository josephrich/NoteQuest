import { describe, expect, test } from 'vitest';
import { GUIDES, type Picture } from './guides';
import { LESSON_ORDER, UNITS, findLesson } from './content';
import { finishLesson, initialProgress } from './progress';
import { parseNote, toMidi } from '../engine/music';

const pictureNotes = (p: Picture) => (p.clef === 'grand' ? [...p.treble, ...p.bass].filter((n): n is string => n !== null) : p.notes.flatMap((n) => n.split(' ')));

describe('guides', () => {
  test('every guide is on the path exactly once, and every guide node has content', () => {
    const used = UNITS.flatMap((u) => u.lessons.filter((l) => l.guide).map((l) => l.guide!));
    expect(new Set(used).size).toBe(used.length);
    expect(used.sort()).toEqual(Object.keys(GUIDES).sort());
  });

  test('each guide comes just before the lesson it prepares for', () => {
    const before = (guide: string) => LESSON_ORDER[LESSON_ORDER.indexOf(`guide-${guide}`) + 1];
    expect(LESSON_ORDER[0]).toBe('guide-staff');
    expect(before('staff')).toBe('treble-1');
    expect(before('bass')).toBe('bass-1');
    expect(before('grand')).toBe('both-1');
    expect(before('ledger')).toBe('ledger-1');
    expect(before('intervals')).toBe('intervals-1');
    expect(before('octaves')).toBe('intervals-6');
    expect(before('chords')).toBe('chords-1');
    expect(before('left-chords')).toBe('chords-3');
    expect(before('major-minor')).toBe('chords-5');
  });

  test('cards are well formed: quiz answers are options, notes parse and can be heard', () => {
    for (const guide of Object.values(GUIDES)) {
      expect(guide.cards.length, guide.id).toBeGreaterThanOrEqual(3);
      for (const card of guide.cards) {
        expect(card.text.length).toBeGreaterThan(10);
        if (card.picture) {
          for (const n of pictureNotes(card.picture)) expect(() => parseNote(n), n).not.toThrow();
          const count = card.picture.clef === 'grand' ? Math.max(card.picture.treble.length, card.picture.bass.length) : card.picture.notes.length;
          if (card.picture.labels) expect(card.picture.labels.length, `${guide.id}: ${card.text}`).toBe(count);
        }
        if (card.kind === 'quiz') expect(card.options, card.text).toContain(card.answer);
        if (card.kind !== 'play' && card.keys) {
          for (const n of card.keys.notes) expect(() => parseNote(n), n).not.toThrow();
          if (card.keys.labels) expect(card.keys.labels.length).toBe(card.keys.notes.length);
        }
        // Show more, say less: every card is short enough to read (or hear) in one go.
        expect(card.text.split(/\s+/).length, card.text).toBeLessThanOrEqual(16);
        if (card.kind !== 'play' && card.sound) for (const n of card.sound) expect(() => parseNote(n), n).not.toThrow();
        if (card.kind === 'play') {
          for (const n of card.play) {
            const m = toMidi(parseNote(n));
            expect(m).toBeGreaterThanOrEqual(38);
            expect(m).toBeLessThanOrEqual(84);
          }
        }
      }
    }
  });

  test('reading a guide again earns XP but no chest, and leaves the chest pity count alone', () => {
    const p = { ...initialProgress(), commonChests: 3, gems: 50 };
    const r = finishLesson(p, { lessonId: 'guide-staff', xp: 3, chest: null, ms: 30_000, accuracy: 1, answers: [] }, new Date());
    expect(r.progress.gems).toBe(50);
    expect(r.progress.commonChests).toBe(3);
    expect(r.progress.xp).toBe(3);
    expect(r.progress.lessons['guide-staff'].completed).toBe(1);
    expect(findLesson('guide-staff').lesson.guide).toBe('staff');
  });
});
