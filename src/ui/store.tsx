// App-wide state: every player's progress, persisted to this device. Screens use useProgress() for
// whoever is playing now, and useHousehold() to switch, add or remove players.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { currentStreak, goalMs, today, type Progress } from '../game/progress';
import {
  activeProgress,
  addPlayer,
  loadHousehold,
  readyPlayers,
  removePlayer,
  saveHousehold,
  switchPlayer,
  withActiveProgress,
  type Household,
} from '../game/players';
import { updateReminder } from '../platform/reminders';
import { listener } from '../engine/listener';

interface Store {
  household: Household;
  progress: Progress;
  update: (fn: (p: Progress) => Progress) => void;
  switchTo: (id: string) => void;
  addNew: () => void;
  remove: (id: string) => void;
}

const Ctx = createContext<Store | null>(null);

// One reminder for the device: on if any player wants it, skipped today once all of them are done.
function scheduleReminder(h: Household) {
  const now = new Date();
  const wanting = readyPlayers(h)
    .map((p) => p.progress)
    .filter((p) => p.settings.reminders);
  const pending = wanting.filter((p) => today(p, now).ms < goalMs(p));
  const who = pending[0] ?? wanting[0];
  void updateReminder({
    enabled: wanting.length > 0,
    at: who?.settings.reminderAt ?? 0,
    goalDoneToday: pending.length === 0,
    dragonName: who?.profile?.dragonName ?? 'Your dragon',
    streak: who ? currentStreak(who, now) : 0,
  });
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [household, setHousehold] = useState(loadHousehold);
  const update = useCallback((fn: (p: Progress) => Progress) => setHousehold((h) => withActiveProgress(h, fn(activeProgress(h)))), []);
  const switchTo = useCallback((id: string) => setHousehold((h) => switchPlayer(h, id)), []);
  const addNew = useCallback(() => setHousehold((h) => addPlayer(h)), []);
  const remove = useCallback((id: string) => setHousehold((h) => removePlayer(h, id)), []);

  useEffect(() => {
    saveHousehold(household);
    listener.setRefA4(household.refA4);
    scheduleReminder(household);
  }, [household]);

  return <Ctx.Provider value={{ household, progress: activeProgress(household), update, switchTo, addNew, remove }}>{children}</Ctx.Provider>;
}

export function useProgress(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error('useProgress outside ProgressProvider');
  return store;
}

export const useHousehold = useProgress;
