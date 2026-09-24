// Where progress is saved. On the web this is localStorage. For the App Store build (Capacitor),
// swap in the native Preferences store here: iOS may clear a web view's localStorage when the
// device is low on space, but not native app storage.
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

const webStore: KeyValueStore = {
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

export const storage: KeyValueStore = webStore;
