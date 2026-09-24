// The rules of a lesson in progress: judging answers, XP, combos and retries.
// Kept free of React and audio so it can be unit tested.
import { itemLetter, itemMidi, type ItemId } from './content';
import { nameOptions, type Challenge } from './lesson';
import type { LessonOutcome } from './progress';

export const XP = { name: 1, play: 2, burstNote: 1, lightning: 1, comboBonus: 2, complete: 5, perfect: 5 } as const;
// A reading faster than this earns a lightning bonus.
export const LIGHTNING_MS = { name: 1500, play: 2000, burstNote: 1800 } as const;
const MAX_PLAY_TRIES = 3;
const MAX_REQUEUES = 3;
// Time counted towards the daily goal per challenge is capped, so wandering off doesn't count.
const MAX_ACTIVE_MS = 30_000;

export type Phase = 'asking' | 'correct' | 'wrong' | 'reveal' | 'done';

export interface Feedback {
  correct: boolean;
  xp: number;
  lightning: boolean;
  comboBonus: boolean;
  // For wrong answers: what he played or tapped, and whether it was the right letter in the wrong octave.
  heard?: string;
  octaveSlip?: boolean;
}

export class LessonRun {
  readonly lessonId: string;
  queue: Challenge[];
  index = 0;
  phase: Phase = 'asking';
  // Position within a burst.
  step = 0;
  // Wrong attempts on the current challenge (or current burst note).
  tries = 0;
  // Burst notes answered correctly on the first go, for colouring.
  stepResults: boolean[] = [];
  combo = 0;
  bestCombo = 0;
  xp = 0;
  feedback: Feedback | null = null;
  private shownAt: number;
  private stepShownAt: number;
  private firstTryOk = true;
  private scored = 0;
  private scoredCorrect = 0;
  private activeMs = 0;
  private requeues = 0;
  private answers: LessonOutcome['answers'] = [];
  private fastest: number | null = null;

  constructor(lessonId: string, challenges: Challenge[], now: number, private rnd: () => number = Math.random) {
    this.lessonId = lessonId;
    this.queue = challenges;
    this.shownAt = now;
    this.stepShownAt = now;
  }

  get current(): Challenge {
    return this.queue[this.index];
  }

  get progress(): number {
    return this.index / this.queue.length;
  }

  get fastestMs(): number | null {
    return this.fastest;
  }

  get accuracy(): number {
    return this.scored ? this.scoredCorrect / this.scored : 1;
  }

  // The note he should be playing right now.
  get expected(): ItemId {
    const c = this.current;
    // Once a burst is finished `step` points past the end; keep showing its last note.
    return c.kind === 'burst' ? c.items[Math.min(this.step, c.items.length - 1)] : c.items[0];
  }

  // A detected note (MIDI number) at time `t`.
  play(midi: number, t: number): Feedback | null {
    if (this.phase !== 'asking') return null;
    const c = this.current;
    if (c.kind === 'name') return null;
    const target = itemMidi(this.expected);
    const correct = midi === target;
    if (c.kind === 'meet') {
      if (!correct) return null; // meeting a note is never marked wrong
      return this.succeed(t, 0, false);
    }
    if (c.kind === 'play') return this.judgePlay(midi, target, t);
    return this.judgeBurst(midi, target, t);
  }

  // A tapped letter for 'name' challenges, or "Got it" on a 'meet' card.
  tap(letter: string | null, t: number): Feedback | null {
    if (this.phase !== 'asking') return null;
    const c = this.current;
    if (c.kind === 'meet') return this.succeed(t, 0, false);
    if (c.kind !== 'name' || letter === null) return null;
    const id = c.items[0];
    const ms = t - this.shownAt;
    if (letter === itemLetter(id)) {
      this.record(id, true, ms);
      const lightning = ms < LIGHTNING_MS.name;
      return this.succeed(t, XP.name + (lightning ? XP.lightning : 0), lightning);
    }
    this.record(id, false, null);
    this.breakCombo();
    this.scored++;
    this.phase = 'wrong';
    this.feedback = { correct: false, xp: 0, lightning: false, comboBonus: false, heard: letter };
    this.requeue(id);
    this.addActive(t);
    return this.feedback;
  }

  // Move on after feedback. Returns false when the lesson is over.
  next(t: number): boolean {
    if (this.phase === 'done') return false;
    if (this.phase === 'asking') return true;
    this.index++;
    this.step = 0;
    this.tries = 0;
    this.stepResults = [];
    this.firstTryOk = true;
    this.feedback = null;
    this.shownAt = t;
    this.stepShownAt = t;
    if (this.index >= this.queue.length) {
      this.phase = 'done';
      return false;
    }
    this.phase = 'asking';
    return true;
  }

  // Totals for the results screen and for saving progress.
  outcome(): LessonOutcome & { perfect: boolean; bestCombo: number } {
    const perfect = this.scored > 0 && this.scoredCorrect === this.scored;
    const bonus = XP.complete + (perfect ? XP.perfect : 0);
    const gems = 5 + (perfect ? 5 : 0) + Math.floor(this.rnd() * 6);
    return {
      lessonId: this.lessonId,
      xp: this.xp + bonus,
      gems,
      ms: this.activeMs,
      accuracy: this.accuracy,
      answers: this.answers,
      perfect,
      bestCombo: this.bestCombo,
    };
  }

  private judgePlay(midi: number, target: number, t: number): Feedback {
    const id = this.expected;
    const ms = t - this.shownAt;
    if (midi === target) {
      if (this.tries === 0) this.record(id, true, ms);
      const lightning = this.tries === 0 && ms < LIGHTNING_MS.play;
      const xp = this.tries === 0 ? XP.play + (lightning ? XP.lightning : 0) : 1;
      return this.succeed(t, xp, lightning);
    }
    if (this.tries === 0) this.record(id, false, null);
    this.tries++;
    this.breakCombo();
    const octaveSlip = (midi - target) % 12 === 0;
    this.feedback = { correct: false, xp: 0, lightning: false, comboBonus: false, heard: midiLetter(midi), octaveSlip };
    if (this.tries >= MAX_PLAY_TRIES) {
      // Show him the answer and move on rather than getting stuck.
      this.scored++;
      this.phase = 'reveal';
      this.addActive(t);
    }
    return this.feedback;
  }

  private judgeBurst(midi: number, target: number, t: number): Feedback {
    const id = this.expected;
    const ms = t - this.stepShownAt;
    if (midi === target) {
      const firstGo = this.tries === 0;
      this.record(id, firstGo, firstGo ? ms : null);
      this.stepResults[this.step] = firstGo;
      this.step++;
      this.tries = 0;
      this.stepShownAt = t;
      if (this.step < this.current.items.length) {
        this.feedback = { correct: true, xp: 0, lightning: false, comboBonus: false };
        return this.feedback;
      }
      const noteXp = this.stepResults.filter(Boolean).length * XP.burstNote;
      const lightning = this.firstTryOk && t - this.shownAt < LIGHTNING_MS.burstNote * this.current.items.length;
      return this.succeed(t, noteXp + (lightning ? XP.lightning : 0), lightning);
    }
    if (this.tries === 0) this.stepResults[this.step] = false;
    this.tries++;
    this.breakCombo();
    const octaveSlip = (midi - target) % 12 === 0;
    this.feedback = { correct: false, xp: 0, lightning: false, comboBonus: false, heard: midiLetter(midi), octaveSlip };
    return this.feedback;
  }

  private succeed(t: number, xp: number, lightning: boolean): Feedback {
    const c = this.current;
    let comboBonus = false;
    if (c.kind !== 'meet') {
      this.scored++;
      if (this.firstTryOk) {
        this.scoredCorrect++;
        this.combo++;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        if (this.combo % 5 === 0) {
          comboBonus = true;
          xp += XP.comboBonus;
        }
      }
      const ms = t - this.shownAt;
      if (this.firstTryOk && c.kind !== 'burst') this.fastest = this.fastest === null ? ms : Math.min(this.fastest, ms);
    }
    this.xp += xp;
    this.phase = 'correct';
    this.feedback = { correct: true, xp, lightning, comboBonus };
    this.addActive(t);
    return this.feedback;
  }

  private breakCombo() {
    if (this.firstTryOk) {
      this.firstTryOk = false;
      this.combo = 0;
    }
  }

  private record(id: ItemId, correct: boolean, ms: number | null) {
    this.answers.push({ id, correct, ms });
  }

  private requeue(id: ItemId) {
    if (this.requeues >= MAX_REQUEUES) return;
    this.requeues++;
    this.queue = [...this.queue, { kind: 'name', items: [id], options: nameOptions(id, this.rnd) }];
  }

  private addActive(t: number) {
    this.activeMs += Math.min(MAX_ACTIVE_MS, t - this.shownAt) + 1000;
  }
}

const LETTER_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

function midiLetter(midi: number): string {
  return LETTER_NAMES[((midi % 12) + 12) % 12];
}
