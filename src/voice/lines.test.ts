import { expect, test } from 'vitest';
import { PROMPTS, quizWrongLine, spokenLines } from './lines';
import { clipId } from './speakable';
import { GUIDES } from '../game/guides';
import { INTERVAL_TIPS, noteTip } from '../game/content';

test('every line the app can read aloud is in the recording list', () => {
  const lines = new Set(spokenLines());
  for (const p of Object.values(PROMPTS)) expect(lines).toContain(p);
  for (const guide of Object.values(GUIDES)) {
    for (const card of guide.cards) {
      expect(lines).toContain(card.text);
      if (card.kind === 'quiz') {
        expect(lines).toContain(card.why);
        expect(lines).toContain(quizWrongLine(card.why));
      }
    }
  }
  for (const tip of Object.values(INTERVAL_TIPS)) expect(lines).toContain(tip);
  for (const id of ['treble:C4', 'treble:D4', 'bass:F3', 'treble:C6', 'bass:D2']) expect(lines).toContain(noteTip(id));
});

test('each line gets its own recording name, and names are stable', () => {
  const lines = spokenLines();
  expect(new Set(lines.map(clipId)).size).toBe(lines.length);
  expect(clipId('New note!')).toBe('c715e626');
});
