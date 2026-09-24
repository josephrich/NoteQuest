// The gem shop: dragon colours and accessories, streak freezes, and real-world prizes set by a
// grown-up. Gems can only be earned by practising; nothing here costs real money.
import type { Progress } from './progress';

export type Slot = 'head' | 'face' | 'neck';

export interface SkinItem {
  kind: 'skin';
  id: string;
  name: string;
  price: number;
}

export interface Accessory {
  kind: 'accessory';
  id: string;
  name: string;
  slot: Slot;
  price: number;
}

export type CatalogItem = SkinItem | Accessory;

export const SKINS: SkinItem[] = [
  { kind: 'skin', id: 'green', name: 'Forest', price: 0 },
  { kind: 'skin', id: 'blue', name: 'Ocean', price: 120 },
  { kind: 'skin', id: 'red', name: 'Fire', price: 150 },
  { kind: 'skin', id: 'purple', name: 'Royal', price: 150 },
  { kind: 'skin', id: 'gold', name: 'Sunshine', price: 250 },
  { kind: 'skin', id: 'night', name: 'Midnight', price: 350 },
];

export const ACCESSORIES: Accessory[] = [
  { kind: 'accessory', id: 'bowtie', name: 'Bow tie', slot: 'neck', price: 60 },
  { kind: 'accessory', id: 'party', name: 'Party hat', slot: 'head', price: 80 },
  { kind: 'accessory', id: 'glasses', name: 'Smart glasses', slot: 'face', price: 90 },
  { kind: 'accessory', id: 'scarf', name: 'Cosy scarf', slot: 'neck', price: 100 },
  { kind: 'accessory', id: 'headphones', name: 'Headphones', slot: 'head', price: 140 },
  { kind: 'accessory', id: 'shades', name: 'Cool shades', slot: 'face', price: 160 },
  { kind: 'accessory', id: 'wizard', name: 'Wizard hat', slot: 'head', price: 220 },
  { kind: 'accessory', id: 'crown', name: 'Crown', slot: 'head', price: 400 },
];

export const CATALOG: CatalogItem[] = [...SKINS, ...ACCESSORIES];

export const FREEZE_PRICE = 60;
export const MAX_FREEZES = 2;

export interface Prize {
  id: string;
  emoji: string;
  name: string;
  cost: number;
}

export interface Claim {
  id: string;
  prizeId: string;
  emoji: string;
  name: string;
  cost: number;
  at: string;
  given: boolean;
}

export interface ShopState {
  owned: string[];
  skin: string;
  outfit: Partial<Record<Slot, string>>;
}

export const initialShop = (): ShopState => ({ owned: ['green'], skin: 'green', outfit: {} });

// Ideas a grown-up can add with one tap.
export const PRIZE_IDEAS: Omit<Prize, 'id'>[] = [
  { emoji: '🍕', name: 'Choose Friday dinner', cost: 500 },
  { emoji: '🎮', name: '15 minutes extra screen time', cost: 300 },
  { emoji: '🌙', name: 'Stay up 15 minutes later', cost: 400 },
  { emoji: '🛝', name: 'Trip to the park', cost: 600 },
  { emoji: '🍦', name: 'Ice cream treat', cost: 450 },
  { emoji: '🎬', name: 'Pick the family movie', cost: 700 },
];

export type ShopResult = { ok: true; progress: Progress } | { ok: false; reason: 'gems' | 'owned' | 'full' | 'unknown' };

export function findItem(id: string): CatalogItem | undefined {
  return CATALOG.find((i) => i.id === id);
}

export function buyItem(p: Progress, id: string): ShopResult {
  const item = findItem(id);
  if (!item) return { ok: false, reason: 'unknown' };
  if (p.shop.owned.includes(id)) return { ok: false, reason: 'owned' };
  if (p.gems < item.price) return { ok: false, reason: 'gems' };
  const bought = { ...p, gems: p.gems - item.price, shop: { ...p.shop, owned: [...p.shop.owned, id] } };
  // Wear it straight away.
  return { ok: true, progress: equip(bought, id) };
}

// Put on an owned item; tapping a worn accessory takes it off.
export function equip(p: Progress, id: string): Progress {
  const item = findItem(id);
  if (!item || !p.shop.owned.includes(id)) return p;
  if (item.kind === 'skin') return { ...p, shop: { ...p.shop, skin: id } };
  const worn = p.shop.outfit[item.slot] === id;
  return { ...p, shop: { ...p.shop, outfit: { ...p.shop.outfit, [item.slot]: worn ? undefined : id } } };
}

export function buyFreeze(p: Progress): ShopResult {
  if (p.streak.freezes >= MAX_FREEZES) return { ok: false, reason: 'full' };
  if (p.gems < FREEZE_PRICE) return { ok: false, reason: 'gems' };
  return { ok: true, progress: { ...p, gems: p.gems - FREEZE_PRICE, streak: { ...p.streak, freezes: p.streak.freezes + 1 } } };
}

const newId = () => Math.random().toString(36).slice(2, 10);

export function claimPrize(p: Progress, prizeId: string, now: Date): ShopResult {
  const prize = p.prizes.find((x) => x.id === prizeId);
  if (!prize) return { ok: false, reason: 'unknown' };
  if (p.gems < prize.cost) return { ok: false, reason: 'gems' };
  const claim: Claim = { id: newId(), prizeId, emoji: prize.emoji, name: prize.name, cost: prize.cost, at: now.toISOString(), given: false };
  return { ok: true, progress: { ...p, gems: p.gems - prize.cost, claims: [claim, ...p.claims] } };
}

export function addPrize(p: Progress, prize: Omit<Prize, 'id'>): Progress {
  const cost = Math.max(1, Math.round(prize.cost));
  return { ...p, prizes: [...p.prizes, { ...prize, cost, id: newId() }] };
}

export function removePrize(p: Progress, id: string): Progress {
  return { ...p, prizes: p.prizes.filter((x) => x.id !== id) };
}

export function markGiven(p: Progress, claimId: string): Progress {
  return { ...p, claims: p.claims.map((c) => (c.id === claimId ? { ...c, given: true } : c)) };
}
