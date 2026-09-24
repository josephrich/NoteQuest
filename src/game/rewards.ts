// End-of-lesson treasure chests. The prize is random, weighted by rarity, like a game's loot box
// (virtual gems only). A perfect lesson improves the odds, and a run of plain chests guarantees a
// better one so it never feels rigged.

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ChestRoll {
  rarity: Rarity;
  gems: number;
  // Legendary chests also hold a streak freeze.
  freeze: boolean;
}

export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

const GEMS: Record<Rarity, [number, number]> = {
  common: [5, 12],
  rare: [15, 25],
  epic: [30, 50],
  legendary: [100, 100],
};

// Chance of each tier (the rest is common).
const ODDS = { legendary: 0.03, epic: 0.1, rare: 0.25 };
const PERFECT_BOOST = 1.6;
// After this many common chests in a row, the next is at least rare.
export const PITY_AFTER = 4;

export function rollChest({ perfect, commonStreak }: { perfect: boolean; commonStreak: number }, rnd: () => number = Math.random): ChestRoll {
  const boost = perfect ? PERFECT_BOOST : 1;
  const r = rnd();
  let rarity: Rarity = 'common';
  if (r < ODDS.legendary * boost) rarity = 'legendary';
  else if (r < (ODDS.legendary + ODDS.epic) * boost) rarity = 'epic';
  else if (r < (ODDS.legendary + ODDS.epic + ODDS.rare) * boost) rarity = 'rare';
  if (rarity === 'common' && commonStreak >= PITY_AFTER) rarity = 'rare';
  const [lo, hi] = GEMS[rarity];
  const gems = lo + Math.floor(rnd() * (hi - lo + 1));
  return { rarity, gems, freeze: rarity === 'legendary' };
}
