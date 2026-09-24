// Everything Clefwing remembers, stored only on this device. Pure functions so they can be tested.
import { LESSON_ORDER, REVIEW_ID, type ItemId } from './content';
import { updateStat, type ItemStat } from './lesson';
import type { ChestRoll } from './rewards';
import { initialShop, type Claim, type Prize, type ShopState } from './shop';
import { storage } from '../platform/storage';

export interface DayLog {
  xp: number;
  ms: number;
  lessons: number;
}

export interface Progress {
  version: 1;
  profile: { name: string; dragonName: string } | null;
  xp: number;
  gems: number;
  // Common chests in a row, for the chest pity rule.
  commonChests: number;
  days: Record<string, DayLog>;
  streak: { count: number; lastDay: string | null; freezes: number; best: number };
  lessons: Record<string, { completed: number; bestAccuracy: number }>;
  items: Record<ItemId, ItemStat>;
  // reminderAt is minutes after midnight (iOS app only).
  settings: { refA4: number; dailyGoalMin: number; sound: boolean; reminders: boolean; reminderAt: number };
  shop: ShopState;
  // Real-world prizes a grown-up has set up, and the ones he has claimed.
  prizes: Prize[];
  claims: Claim[];
  // Daily Review: the last day one was done, and how many in total.
  review: { lastDay: string | null; total: number };
}

export function initialProgress(refA4 = 440): Progress {
  return {
    version: 1,
    profile: null,
    xp: 0,
    gems: 0,
    commonChests: 0,
    days: {},
    streak: { count: 0, lastDay: null, freezes: 1, best: 0 },
    lessons: {},
    items: {},
    settings: { refA4, dailyGoalMin: 10, sound: true, reminders: false, reminderAt: 17 * 60 + 30 },
    shop: initialShop(),
    prizes: [],
    claims: [],
    review: { lastDay: null, total: 0 },
  };
}

// Local calendar day, e.g. "2026-09-24".
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function today(p: Progress, now: Date): DayLog {
  return p.days[dayKey(now)] ?? { xp: 0, ms: 0, lessons: 0 };
}

export function goalMs(p: Progress): number {
  return p.settings.dailyGoalMin * 60_000;
}

// The streak as it should be shown right now. A missed day that a streak freeze can cover
// doesn't break it yet; the freeze is spent when he next reaches his goal.
export function currentStreak(p: Progress, now: Date): number {
  const { lastDay, count, freezes } = p.streak;
  if (!lastDay) return 0;
  const gap = daysBetween(lastDay, dayKey(now));
  if (gap <= 1) return count;
  return gap - 1 <= freezes ? count : 0;
}

export interface LessonOutcome {
  lessonId: string;
  xp: number;
  chest: ChestRoll;
  ms: number;
  accuracy: number;
  answers: { id: ItemId; correct: boolean; ms: number | null }[];
}

export interface FinishResult {
  progress: Progress;
  goalReachedNow: boolean;
  streakExtended: boolean;
  freezesUsed: number;
  freezeEarned: boolean;
}

export function finishLesson(p: Progress, outcome: LessonOutcome, now: Date): FinishResult {
  const key = dayKey(now);
  const before = today(p, now);
  const day: DayLog = { xp: before.xp + outcome.xp, ms: before.ms + outcome.ms, lessons: before.lessons + 1 };
  const items = { ...p.items };
  for (const a of outcome.answers) items[a.id] = updateStat(items[a.id], { correct: a.correct, ms: a.ms, now: now.getTime() });
  const prevLesson = p.lessons[outcome.lessonId] ?? { completed: 0, bestAccuracy: 0 };

  let streak = { ...p.streak };
  let freezesUsed = 0;
  let freezeEarned = false;
  const goal = goalMs(p);
  const goalReachedNow = before.ms < goal && day.ms >= goal;
  let streakExtended = false;
  if (goalReachedNow && streak.lastDay !== key) {
    const gap = streak.lastDay ? daysBetween(streak.lastDay, key) : Infinity;
    let count: number;
    if (gap === 1) count = streak.count + 1;
    else if (gap - 1 <= streak.freezes) {
      freezesUsed = gap - 1;
      count = streak.count + 1;
    } else count = 1;
    // A free streak freeze for every week of streak, holding at most two.
    let freezes = streak.freezes - freezesUsed;
    if (count % 7 === 0 && freezes < 2) {
      freezes++;
      freezeEarned = true;
    }
    streak = { count, lastDay: key, freezes, best: Math.max(streak.best, count) };
    streakExtended = true;
  }
  if (outcome.chest.freeze && streak.freezes < 2) streak = { ...streak, freezes: streak.freezes + 1 };

  return {
    progress: {
      ...p,
      xp: p.xp + outcome.xp,
      gems: p.gems + outcome.chest.gems,
      commonChests: outcome.chest.rarity === 'common' ? p.commonChests + 1 : 0,
      days: { ...p.days, [key]: day },
      streak,
      // Reviews aren't course lessons, so they don't count towards unlocking the path.
      lessons:
        outcome.lessonId === REVIEW_ID
          ? p.lessons
          : { ...p.lessons, [outcome.lessonId]: { completed: prevLesson.completed + 1, bestAccuracy: Math.max(prevLesson.bestAccuracy, outcome.accuracy) } },
      review: outcome.lessonId === REVIEW_ID ? { lastDay: key, total: p.review.total + 1 } : p.review,
      items,
    },
    goalReachedNow,
    streakExtended,
    freezesUsed,
    freezeEarned,
  };
}

// The first lesson not yet completed; everything before it is unlocked.
export function nextLessonId(p: Progress): string | null {
  return LESSON_ORDER.find((id) => !p.lessons[id]?.completed) ?? null;
}

export function isUnlocked(p: Progress, lessonId: string): boolean {
  const next = nextLessonId(p);
  if (next === null) return true;
  return LESSON_ORDER.indexOf(lessonId) <= LESSON_ORDER.indexOf(next);
}

const STORAGE_KEY = 'nq.progress.v1';

export function loadProgress(): Progress {
  try {
    const raw = storage.get(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Progress;
      // Fill in anything added since this progress was saved.
      const base = initialProgress();
      if (parsed.version === 1) return { ...base, ...parsed, settings: { ...base.settings, ...parsed.settings }, shop: { ...base.shop, ...parsed.shop } };
    }
    // Carry over the tuning from the mic test page if it was done first.
    const ref = Number(JSON.parse(storage.get('nq.refA4') ?? 'null'));
    return initialProgress(ref > 400 && ref < 480 ? ref : 440);
  } catch {
    return initialProgress();
  }
}

export function saveProgress(p: Progress): void {
  storage.set(STORAGE_KEY, JSON.stringify(p));
}
