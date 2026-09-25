// Where progress is saved.
// - Web: localStorage.
// - iOS app (Capacitor): native Preferences storage. iOS may clear a web view's localStorage when
//   the device is low on space, but it never clears an app's own storage.
// Preferences is asynchronous, so on native the saved values are loaded into memory once at
// startup (initStorage) and every change is written straight through.
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

// Keys the app uses; loaded up front on native.
const KEYS = ['nq.players.v1', 'nq.progress.v1', 'nq.refA4'];

const web: KeyValueStore = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable (e.g. private browsing); progress lasts for this session only */
    }
  },
};

const cache = new Map<string, string>();

const native: KeyValueStore = {
  get: (key) => cache.get(key) ?? null,
  set(key, value) {
    cache.set(key, value);
    void Preferences.set({ key, value });
  },
};

export const isNative = Capacitor.isNativePlatform();

export const storage: KeyValueStore = isNative ? native : web;

export async function initStorage(): Promise<void> {
  if (!isNative) return;
  for (const key of KEYS) {
    const { value } = await Preferences.get({ key });
    // First launch after an update from a web-storage build: carry the old data across.
    const legacy = value ?? web.get(key);
    if (legacy !== null) {
      cache.set(key, legacy);
      if (value === null) await Preferences.set({ key, value: legacy });
    }
  }
}
