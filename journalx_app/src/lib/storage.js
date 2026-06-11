/* Fast local key-value store (MMKV) — the mobile equivalent of the web's
   IndexedDB "user-data" cache. JSON in / JSON out, with the same helper names
   so ported logic feels familiar.

   MMKV is a native module (full speed + persistence in a dev build / release).
   In plain Expo Go the native module isn't linked, so we fall back to a simple
   in-memory store — enough to preview the UI (data just won't persist across a
   full reload in Expo Go). */
let store;
try {
  const { MMKV } = require("react-native-mmkv");
  store = new MMKV({ id: "journalx" });
} catch (e) {
  const mem = new Map();
  store = {
    getString: (k) => (mem.has(k) ? mem.get(k) : undefined),
    set: (k, v) => mem.set(k, v),
    delete: (k) => mem.delete(k),
  };
  console.warn("MMKV unavailable (Expo Go?) — using in-memory store.");
}
export { store };

export function getItem(key) {
  try {
    const raw = store.getString(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem(key, value) {
  try {
    store.set(key, JSON.stringify(value));
  } catch {}
}

export function removeItem(key) {
  try {
    store.delete(key);
  } catch {}
}

/* Mirrors the web utils/indexedDB API so shared logic can use the same names */
export async function getFromStore(key) {
  return getItem(key);
}
export async function saveToStore(key, value) {
  setItem(key, value);
}

export const KEYS = {
  userData: "user-data",
  theme: "theme",
  userName: "userName",
  accountId: "jx-account-id",
};
