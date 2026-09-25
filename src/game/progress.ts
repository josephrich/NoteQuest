// Everything Clefwing remembers, stored only on this device. Pure functions so they can be tested.
import { LESSON_ORDER, REVIEW_ID, findLesson, isGuide, type ItemId } from './content';
import { updateStat, type ItemStat } from './lesson';
import type { ChestRoll } from './rewards';
import { initialShop, type Claim, type Prize, type ShopState } from './shop';
import { storage } from '../platform/storage';

export interface DayLog {
  xp: number;
  ms: number;
  lessons: number;
  // The part of `ms` practised on the on-screen piano rather than a real one.
  screenMs?: number;
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
  // reminderAt is minutes after midnight (iOS app only). unlockAll opens every lesson on the path.
  // readAloud reads explanations and questions aloud automatically, for younger players.
  // onScreenPiano lets the player choose the on-screen piano (a grown-up switches it on); input is
  // their current choice.
  settings: {
    refA4: number;
    dailyGoalMin: number;
    sound: boolean;
    reminders: boolean;
    reminderAt: number;
    unlockAll: boolean;
    readAloud: boolean;
    onScreenPiano: boolean;
    input: 'piano' | 'screen';
  };
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
    settings: { refA4, dailyGoalMin: 10, sound: true, reminders: false, reminderAt: 17 * 60 + 30, unlockAll: false, readAloud: false, onScreenPiano: false, input: 'piano' },
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
  // No chest for re-reading a guide.
  chest: ChestRoll | null;
  ms: number;
  accuracy: number;
  answers: { id: ItemId; correct: boolean; ms: number | null }[];
  // Played on the on-screen piano.
  onScreen?: boolean;
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
  const day: DayLog = {
    xp: before.xp + outcome.xp,
    ms: before.ms + outcome.ms,
    lessons: before.lessons + 1,
    screenMs: (before.screenMs ?? 0) + (outcome.onScreen ? outcome.ms : 0),
  };
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
  if (outcome.chest?.freeze && streak.freezes < 2) streak = { ...streak, freezes: streak.freezes + 1 };

  return {
    progress: {
      ...p,
      xp: p.xp + outcome.xp,
      gems: p.gems + (outcome.chest?.gems ?? 0),
      commonChests: !outcome.chest ? p.commonChests : outcome.chest.rarity === 'common' ? p.commonChests + 1 : 0,
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

const guideIds = new Set(LESSON_ORDER.filter((id) => isGuide(findLesson(id).lesson)));

// The first practice lesson not yet completed. Guides (mini-lessons) never hold up the path, so a
// guide added later doesn't lock lessons he has already reached.
function frontier(p: Progress): number {
  const i = LESSON_ORDER.findIndex((id) => !guideIds.has(id) && !p.lessons[id]?.completed);
  return i < 0 ? LESSON_ORDER.length : i;
}

// Where to start next: the frontier lesson, or the unread guides just before it.
export function nextLessonId(p: Progress): string | null {
  let i = frontier(p);
  if (i >= LESSON_ORDER.length) return null;
  while (i > 0 && guideIds.has(LESSON_ORDER[i - 1]) && !p.lessons[LESSON_ORDER[i - 1]]?.completed) i--;
  return LESSON_ORDER[i];
}

// Everything up to the frontier is open, including the guides before it.
export function isUnlocked(p: Progress, lessonId: string): boolean {
  if (p.settings.unlockAll) return true;
  return LESSON_ORDER.indexOf(lessonId) <= frontier(p);
}

// Before players, the one player's progress was saved under this key. It is read once to move it
// into the household (see players.ts) and then left alone as a backup.
export const LEGACY_KEY = 'nq.progress.v1';

// A saved progress, with anything added since it was saved filled in.
export function parseProgress(parsed: Progress): Progress {
  const base = initialProgress();
  return { ...base, ...parsed, settings: { ...base.settings, ...parsed.settings }, shop: { ...base.shop, ...parsed.shop } };
}

export function loadLegacyProgress(): Progress | null {
  try {
    const raw = storage.get(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Progress;
    return parsed.version === 1 ? parseProgress(parsed) : null;
  } catch {
    return null;
  }
}

// Tuning done on the mic test page before the app was first set up.
export function micTestTuning(): number {
  try {
    const ref = Number(JSON.parse(storage.get('nq.refA4') ?? 'null'));
    return ref > 400 && ref < 480 ? ref : 440;
  } catch {
    return 440;
  }
}
