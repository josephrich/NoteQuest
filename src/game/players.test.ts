import { beforeEach, describe, expect, test, vi } from 'vitest';
import { activeProgress, addPlayer, initialHousehold, loadHousehold, readyPlayers, removePlayer, saveHousehold, switchPlayer, withActiveProgress } from './players';
import { LEGACY_KEY, initialProgress, type Progress } from './progress';

const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
});
beforeEach(() => mem.clear());

const named = (name: string, extra: Partial<Progress> = {}): Progress => ({ ...initialProgress(), profile: { name, dragonName: 'Ember' }, ...extra });

describe('players', () => {
  test("an existing save becomes the first player, with nothing lost", () => {
    mem.set(LEGACY_KEY, JSON.stringify(named('Raphi', { xp: 420, gems: 77, settings: { ...initialProgress().settings, refA4: 436 } })));
    const h = loadHousehold();
    expect(h.players).toHaveLength(1);
    expect(activeProgress(h).profile?.name).toBe('Raphi');
    expect(activeProgress(h).xp).toBe(420);
    expect(activeProgress(h).gems).toBe(77);
    expect(h.refA4).toBe(436);
    // Once saved as a household, the household is what loads.
    saveHousehold(h);
    mem.set(LEGACY_KEY, JSON.stringify(named('Old')));
    expect(activeProgress(loadHousehold()).profile?.name).toBe('Raphi');
  });

  test('a fresh install starts with one player to set up', () => {
    const h = loadHousehold();
    expect(h.players).toHaveLength(1);
    expect(activeProgress(h).profile).toBeNull();
  });

  test('players keep separate progress', () => {
    let h = withActiveProgress(initialHousehold(), named('Raphi', { xp: 100 }));
    const raphi = h.active;
    h = addPlayer(h);
    expect(activeProgress(h).profile).toBeNull();
    h = withActiveProgress(h, named('Mia', { xp: 5 }));
    const mia = h.active;
    expect(readyPlayers(h).map((p) => p.progress.profile!.name)).toEqual(['Raphi', 'Mia']);
    h = switchPlayer(h, raphi);
    expect(activeProgress(h).xp).toBe(100);
    h = withActiveProgress(h, { ...activeProgress(h), xp: 150 });
    h = switchPlayer(h, mia);
    expect(activeProgress(h).xp).toBe(5);
  });

  test('tuning the piano applies to every player', () => {
    let h = withActiveProgress(initialHousehold(), named('Raphi'));
    h = addPlayer(h);
    h = withActiveProgress(h, named('Mia'));
    const p = activeProgress(h);
    h = withActiveProgress(h, { ...p, settings: { ...p.settings, refA4: 442 } });
    expect(h.refA4).toBe(442);
    expect(h.players.every((pl) => pl.progress.settings.refA4 === 442)).toBe(true);
  });

  test('backing out of adding a player leaves no half-made player behind', () => {
    let h = withActiveProgress(initialHousehold(), named('Raphi'));
    const raphi = h.active;
    h = addPlayer(h);
    expect(h.players).toHaveLength(2);
    h = switchPlayer(h, raphi);
    expect(h.players).toHaveLength(1);
    // Also when the app is closed mid-setup.
    h = addPlayer(h);
    saveHousehold(h);
    const loaded = loadHousehold();
    expect(loaded.players).toHaveLength(1);
    expect(activeProgress(loaded).profile?.name).toBe('Raphi');
  });

  test('removing players', () => {
    let h = withActiveProgress(initialHousehold(), named('Raphi'));
    const raphi = h.active;
    h = addPlayer(h);
    h = withActiveProgress(h, named('Mia'));
    h = removePlayer(h, h.active);
    expect(h.active).toBe(raphi);
    expect(readyPlayers(h)).toHaveLength(1);
    h = removePlayer(h, raphi);
    expect(h.players).toHaveLength(1);
    expect(activeProgress(h).profile).toBeNull();
  });
});
