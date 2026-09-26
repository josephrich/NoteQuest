// End-of-lesson treasure chests. The prize is random, weighted by rarity, like a game's loot box
// (virtual gems and dragon items only; nothing is ever bought). A perfect lesson improves the odds,
// and a run of plain chests guarantees a better one so it never feels rigged.
//
// Very rarely a chest holds a dragon treasure: an item that can't be bought, only found. It's a
// surprise, not something to chase, so there's no pity rule for it, and the odds are shown to
// grown-ups like the rest.
import { TREASURES } from './shop';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'treasure';

export interface ChestRoll {
  rarity: Rarity;
  gems: number;
  // Legendary chests also hold a streak freeze.
  freeze: boolean;
  // A treasure chest's dragon item (none once he has them all).
  item?: string;
}

export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'treasure'];

const GEMS: Record<Rarity, [number, number]> = {
  common: [5, 12],
  rare: [15, 25],
  epic: [30, 50],
  legendary: [100, 100],
  treasure: [150, 150],
};
// A treasure chest when every treasure is already found: just gems.
const ALL_FOUND_GEMS = 300;

// Chance of each tier (the rest is common).
const ODDS = { treasure: 0.01, legendary: 0.03, epic: 0.1, rare: 0.25 };
const PERFECT_BOOST = 1.6;
// After this many common chests in a row, the next is at least rare.
export const PITY_AFTER = 4;

export function rollChest(
  { perfect, commonStreak, owned = [] }: { perfect: boolean; commonStreak: number; owned?: string[] },
  rnd: () => number = Math.random,
): ChestRoll {
  const boost = perfect ? PERFECT_BOOST : 1;
  const r = rnd();
  let rarity: Rarity = 'common';
  const t = ODDS.treasure * boost;
  if (r < t) rarity = 'treasure';
  else if (r < t + ODDS.legendary * boost) rarity = 'legendary';
  else if (r < t + (ODDS.legendary + ODDS.epic) * boost) rarity = 'epic';
  else if (r < t + (ODDS.legendary + ODDS.epic + ODDS.rare) * boost) rarity = 'rare';
  if (rarity === 'common' && commonStreak >= PITY_AFTER) rarity = 'rare';
  const [lo, hi] = GEMS[rarity];
  const gems = lo + Math.floor(rnd() * (hi - lo + 1));
  if (rarity === 'treasure') {
    const left = TREASURES.filter((i) => !owned.includes(i.id));
    if (!left.length) return { rarity, gems: ALL_FOUND_GEMS, freeze: false };
    return { rarity, gems, freeze: false, item: left[Math.floor(rnd() * left.length)].id };
  }
  return { rarity, gems, freeze: rarity === 'legendary' };
}

// The odds as shown to players (before the pity rule), derived from the numbers above.
function chances(boost: number): Record<Rarity, number> {
  const treasure = ODDS.treasure * boost;
  const legendary = ODDS.legendary * boost;
  const epic = ODDS.epic * boost;
  const rare = ODDS.rare * boost;
  return { treasure, legendary, epic, rare, common: 1 - treasure - legendary - epic - rare };
}

const pct = (x: number) => Math.round(x * 1000) / 10;

export const CHEST_ODDS = RARITIES.map((rarity) => ({
  rarity,
  gems:
    rarity === 'treasure'
      ? `A dragon treasure you can't buy + ${GEMS.treasure[0]} gems`
      : GEMS[rarity][0] === GEMS[rarity][1]
        ? `${GEMS[rarity][0]} gems + streak freeze`
        : `${GEMS[rarity][0]}–${GEMS[rarity][1]} gems`,
  chance: pct(chances(1)[rarity]),
  perfectChance: pct(chances(PERFECT_BOOST)[rarity]),
}));
