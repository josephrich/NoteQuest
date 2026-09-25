import { expect, test } from 'vitest';
import { speakable } from '../voice/speakable';

test('note letters are spoken as letter names, but "A" as a word is left alone', () => {
  expect(speakable('One step up from G is A.')).toBe('One step up from gee is ay.');
  expect(speakable('A step goes up. A 4th is bigger.')).toBe('A step goes up. A 4th is bigger.');
  expect(speakable('The lines are E G B D F: Every Good Boy Deserves Fruit.')).toBe('The lines are ee gee bee dee eff: Every Good Boy Deserves Fruit.');
  expect(speakable('The spaces spell FACE.')).toBe('The spaces spell FACE.');
  expect(speakable('That was F♯. Try again!')).toBe('That was eff sharp. Try again!');
  expect(speakable('Play C, then step up.')).toBe('Play see, then step up.');
});

test('A is read as a note in chord names, and as "a" when it is the word', () => {
  expect(speakable('The A chord is A, C and E: all in spaces.')).toBe('The ay chord is ay, see and ee: all in spaces.');
  expect(speakable('D, E and A chords are minor.')).toBe('dee, ee and ay chords are minor.');
  expect(speakable('A sits on the first little ledger line.')).toBe('ay sits on the first little ledger line.');
  expect(speakable('A chord is three notes played together.')).toBe('A chord is three notes played together.');
});

test('sharps and flats are read as words, and A as a note where it is one', () => {
  expect(speakable('What is E♭?')).toBe('What is ee flat?');
  expect(speakable('A sharp ♯ raises a note by one semitone.')).toBe('A sharp raises a note by one semitone.');
  expect(speakable('One black key has two names: A sharp is also B flat.')).toBe('One black key has two names: ay sharp is also bee flat.');
  expect(speakable('A minor is A, C and E. A to C is a minor 3rd: 3 semitones.')).toBe('ay minor is ay, see and ee. ay to see is a minor 3rd: 3 semitones.');
});
