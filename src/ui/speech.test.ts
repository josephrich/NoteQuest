import { expect, test } from 'vitest';
import { speakable } from './speech';

test('note letters are spoken as letter names, but "A" as a word is left alone', () => {
  expect(speakable('One step up from G is A.')).toBe('One step up from gee is ay.');
  expect(speakable('A step goes up. A 4th is bigger.')).toBe('A step goes up. A 4th is bigger.');
  expect(speakable('The lines are E G B D F: Every Good Boy Deserves Fruit.')).toBe('The lines are ee gee bee dee eff: Every Good Boy Deserves Fruit.');
  expect(speakable('The spaces spell FACE.')).toBe('The spaces spell FACE.');
  expect(speakable('That was F♯. Try again!')).toBe('That was eff sharp. Try again!');
  expect(speakable('Play C, then step up.')).toBe('Play see, then step up.');
});
