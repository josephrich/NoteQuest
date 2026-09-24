import { describe, expect, test } from 'vitest';
import { initialProgress } from './progress';
import { addPrize, buyFreeze, buyItem, claimPrize, equip, markGiven, removePrize, FREEZE_PRICE, MAX_FREEZES, CATALOG } from './shop';

const withGems = (gems: number) => ({ ...initialProgress(), gems });

describe('gem shop', () => {
  test('buying an item spends gems, owns it and puts it on', () => {
    const r = buyItem(withGems(500), 'crown');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.progress.gems).toBe(100);
    expect(r.progress.shop.owned).toContain('crown');
    expect(r.progress.shop.outfit.head).toBe('crown');
  });

  test("can't buy without enough gems, or buy twice", () => {
    expect(buyItem(withGems(10), 'crown')).toEqual({ ok: false, reason: 'gems' });
    const r = buyItem(withGems(1000), 'crown');
    if (!r.ok) throw new Error();
    expect(buyItem(r.progress, 'crown')).toEqual({ ok: false, reason: 'owned' });
  });

  test('one accessory per slot; tapping a worn one takes it off', () => {
    let p = withGems(2000);
    for (const id of ['party', 'wizard', 'shades']) {
      const r = buyItem(p, id);
      if (!r.ok) throw new Error(id);
      p = r.progress;
    }
    expect(p.shop.outfit).toMatchObject({ head: 'wizard', face: 'shades' });
    p = equip(p, 'party');
    expect(p.shop.outfit.head).toBe('party');
    p = equip(p, 'party');
    expect(p.shop.outfit.head).toBeUndefined();
    // Not owned: nothing happens.
    expect(equip(p, 'crown')).toBe(p);
  });

  test('skins swap, and the starting skin is free and owned', () => {
    let p = withGems(200);
    expect(p.shop.skin).toBe('green');
    const r = buyItem(p, 'blue');
    if (!r.ok) throw new Error();
    p = r.progress;
    expect(p.shop.skin).toBe('blue');
    expect(equip(p, 'green').shop.skin).toBe('green');
  });

  test('every item has a unique id and a sensible price', () => {
    expect(new Set(CATALOG.map((i) => i.id)).size).toBe(CATALOG.length);
    for (const i of CATALOG) expect(i.price).toBeGreaterThanOrEqual(0);
  });

  test('streak freezes are capped', () => {
    let p = withGems(1000);
    p.streak.freezes = 0;
    for (let i = 0; i < MAX_FREEZES; i++) {
      const r = buyFreeze(p);
      if (!r.ok) throw new Error();
      p = r.progress;
    }
    expect(p.gems).toBe(1000 - MAX_FREEZES * FREEZE_PRICE);
    expect(buyFreeze(p)).toEqual({ ok: false, reason: 'full' });
  });

  test('prizes: grown-up adds one, he claims it, grown-up marks it given', () => {
    let p = addPrize(withGems(600), { emoji: '🍕', name: 'Choose Friday dinner', cost: 500 });
    const prize = p.prizes[0];
    const r = claimPrize(p, prize.id, new Date('2026-09-24T18:00:00Z'));
    if (!r.ok) throw new Error();
    p = r.progress;
    expect(p.gems).toBe(100);
    expect(p.claims[0]).toMatchObject({ name: 'Choose Friday dinner', given: false });
    expect(claimPrize(p, prize.id, new Date())).toEqual({ ok: false, reason: 'gems' });
    p = markGiven(p, p.claims[0].id);
    expect(p.claims[0].given).toBe(true);
    p = removePrize(p, prize.id);
    expect(p.prizes).toHaveLength(0);
    // The claim history survives the prize being removed.
    expect(p.claims).toHaveLength(1);
  });
});

describe('published chest odds', () => {
  test('add up to 100% and match the real rolls', async () => {
    const { CHEST_ODDS, rollChest } = await import('./rewards');
    const total = (k: 'chance' | 'perfectChance') => CHEST_ODDS.reduce((a, o) => a + o[k], 0);
    expect(total('chance')).toBeCloseTo(100, 5);
    expect(total('perfectChance')).toBeCloseTo(100, 5);
    // Sweep the random number evenly and count what the chest gives (pity rule off).
    const counts: Record<string, number> = {};
    const n = 10_000;
    for (let i = 0; i < n; i++) {
      const r = rollChest({ perfect: false, commonStreak: 0 }, () => (i + 0.5) / n);
      counts[r.rarity] = (counts[r.rarity] ?? 0) + 1;
    }
    for (const o of CHEST_ODDS) expect((counts[o.rarity] ?? 0) / 100).toBeCloseTo(o.chance, 0);
  });
});

describe('practice reminders', () => {
  test('next reminder is today, or tomorrow if the time has passed or the goal is done', async () => {
    const { nextReminderTime, reminderText } = await import('../platform/reminders');
    const at = 17 * 60 + 30;
    const morning = new Date(2026, 8, 24, 9, 0);
    const evening = new Date(2026, 8, 24, 19, 0);
    expect(nextReminderTime(morning, at, false)).toEqual(new Date(2026, 8, 24, 17, 30));
    expect(nextReminderTime(morning, at, true)).toEqual(new Date(2026, 8, 25, 17, 30));
    expect(nextReminderTime(evening, at, false)).toEqual(new Date(2026, 8, 25, 17, 30));
    expect(reminderText('Ember', 5).title).toContain('5-day streak');
    expect(reminderText('Ember', 0).title).toContain('Ember');
  });
});
