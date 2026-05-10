// Phase 1 only: window.storage shim backed by localStorage.
// Lets the Artifact code run unchanged in the browser.
// Phase 5 will replace per-state update calls with real API calls — this file gets deleted then.

type StorageResult = { value: string | null };

declare global {
  interface Window {
    storage: {
      get: (key: string) => Promise<StorageResult>;
      set: (key: string, value: string) => Promise<void>;
    };
  }
}

export function installStorageShim() {
  if (typeof window === 'undefined') return;
  if (window.storage) return;
  window.storage = {
    async get(key) {
      return { value: localStorage.getItem(key) };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
    },
  };
}
