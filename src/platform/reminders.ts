// Daily practice reminders (iOS app only). One notification is kept scheduled for the next
// reminder time, skipping today if today's goal is already done. It is rescheduled whenever the
// app opens or a lesson finishes, so it always reflects the latest streak.
import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from './storage';

const REMINDER_ID = 1;

export const remindersSupported = isNative;

export async function requestReminderPermission(): Promise<boolean> {
  if (!isNative) return false;
  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
}

export interface ReminderInfo {
  enabled: boolean;
  // Minutes after midnight, local time.
  at: number;
  goalDoneToday: boolean;
  dragonName: string;
  streak: number;
}

export function nextReminderTime(now: Date, at: number, goalDoneToday: boolean): Date {
  const t = new Date(now);
  t.setHours(Math.floor(at / 60), at % 60, 0, 0);
  if (goalDoneToday || t.getTime() <= now.getTime()) t.setDate(t.getDate() + 1);
  return t;
}

export function reminderText(dragonName: string, streak: number): { title: string; body: string } {
  if (streak >= 2) return { title: `🔥 Keep your ${streak}-day streak!`, body: `${dragonName} is waiting at the piano. Just a few minutes today!` };
  return { title: `🎹 ${dragonName} misses you!`, body: 'Time for some note reading. Can you beat your best?' };
}

export async function updateReminder(info: ReminderInfo, now = new Date()): Promise<void> {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
    if (!info.enabled) return;
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') return;
    const { title, body } = reminderText(info.dragonName, info.streak);
    await LocalNotifications.schedule({
      notifications: [{ id: REMINDER_ID, title, body, schedule: { at: nextReminderTime(now, info.at, info.goalDoneToday), allowWhileIdle: true } }],
    });
  } catch {
    /* reminders are a nice-to-have; never let them break the app */
  }
}
