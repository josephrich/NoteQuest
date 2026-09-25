// Players: everyone in the family gets their own progress (XP, streak, gems, dragon, prizes, note
// stats), all saved together on this device. The piano's tuning is shared, since it's one piano.
import { initialProgress, loadLegacyProgress, micTestTuning, parseProgress, type Progress } from './progress';
import { storage } from '../platform/storage';

export const HOUSEHOLD_KEY = 'nq.players.v1';

export interface Player {
  id: string;
  progress: Progress;
}

export interface Household {
  version: 1;
  // Always one of `players`. A player whose progress has no profile yet is still being set up.
  active: string;
  players: Player[];
  refA4: number;
}

let counter = 0;
export function newPlayerId(now = Date.now()): string {
  return `p${now.toString(36)}${(counter++).toString(36)}`;
}

function blankPlayer(refA4: number, id = newPlayerId()): Player {
  return { id, progress: initialProgress(refA4) };
}

export function initialHousehold(refA4 = 440): Household {
  const first = blankPlayer(refA4);
  return { version: 1, active: first.id, players: [first], refA4 };
}

export function activeProgress(h: Household): Progress {
  return (h.players.find((p) => p.id === h.active) ?? h.players[0]).progress;
}

// Players who have finished setting up, for the "Who's playing?" screen.
export function readyPlayers(h: Household): Player[] {
  return h.players.filter((p) => p.progress.profile !== null);
}

// Replaces the active player's progress. A tuning change applies to every player.
export function withActiveProgress(h: Household, progress: Progress): Household {
  const refA4 = progress.settings.refA4;
  const tuned = refA4 !== h.refA4;
  return {
    ...h,
    refA4,
    players: h.players.map((p) =>
      p.id === h.active ? { ...p, progress } : tuned ? { ...p, progress: { ...p.progress, settings: { ...p.progress.settings, refA4 } } } : p,
    ),
  };
}

export function switchPlayer(h: Household, id: string): Household {
  if (!h.players.some((p) => p.id === id)) return h;
  // Leaving a player half set up (they backed out of naming) throws them away.
  const players = h.players.filter((p) => p.id === id || p.progress.profile !== null);
  return { ...h, active: id, players };
}

// Adds a new player and makes them active; they then go through the welcome steps.
export function addPlayer(h: Household, id = newPlayerId()): Household {
  const base = switchPlayer(h, h.active);
  const player = blankPlayer(h.refA4, id);
  return { ...base, active: player.id, players: [...base.players.filter((p) => p.progress.profile !== null), player] };
}

export function removePlayer(h: Household, id: string): Household {
  const players = h.players.filter((p) => p.id !== id);
  if (!players.length) return initialHousehold(h.refA4);
  const active = h.active === id ? (readyPlayers({ ...h, players })[0] ?? players[0]).id : h.active;
  return { ...h, players, active };
}

export function loadHousehold(): Household {
  try {
    const raw = storage.get(HOUSEHOLD_KEY);
    if (raw) {
      const h = JSON.parse(raw) as Household;
      if (h.version === 1 && h.players?.length) {
        const players = h.players.map((p) => ({ ...p, progress: parseProgress(p.progress) }));
        // Drop anyone left half set up, unless they're the only player.
        const ready = players.filter((p) => p.progress.profile !== null);
        const kept = ready.length ? ready : players.slice(0, 1);
        const active = kept.some((p) => p.id === h.active) ? h.active : kept[0].id;
        return { version: 1, players: kept, active, refA4: h.refA4 ?? activeProgress({ ...h, players: kept, active }).settings.refA4 };
      }
    }
  } catch {
    /* fall through to the legacy save or a fresh start */
  }
  // First run of this version: the existing save becomes the first player.
  const legacy = loadLegacyProgress();
  if (legacy) {
    const first: Player = { id: newPlayerId(), progress: legacy };
    return { version: 1, active: first.id, players: [first], refA4: legacy.settings.refA4 };
  }
  return initialHousehold(micTestTuning());
}

export function saveHousehold(h: Household): void {
  storage.set(HOUSEHOLD_KEY, JSON.stringify(h));
}
