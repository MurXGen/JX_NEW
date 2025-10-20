// utils/indexedDB.js
import { openDB } from "idb";

const DB_NAME = "JX";
const STORE_NAME = "userData";
const DB_VERSION = 1;

// Initialize DB
export const initDB = async () => {
  try {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  } catch (error) {
    return null;
  }
};

// Save item with optional expiry (in milliseconds)
export const saveToIndexedDB = async (key, data, expiryMs = null) => {
  try {
    const db = await initDB();
    if (!db) return;

    const payload = {
      value: data,
      expiry: expiryMs ? Date.now() + expiryMs : null,
    };

    await db.put(STORE_NAME, payload, key);
  } catch (error) {}
};

// Get item (checks expiry if set)
export const getFromIndexedDB = async (key) => {
  try {
    const db = await initDB();
    if (!db) return null;

    const stored = await db.get(STORE_NAME, key);

    if (!stored) return null;
    if (stored.expiry && Date.now() > stored.expiry) {
      // expired → remove it
      await db.delete(STORE_NAME, key);
      return null;
    }

    return stored.value;
  } catch (error) {
    return null;
  }
};

// Delete specific key
export const deleteFromIndexedDB = async (key) => {
  try {
    const db = await initDB();
    if (!db) return;
    await db.delete(STORE_NAME, key);
  } catch (error) {}
};

// Clear all data
export const clearIndexedDB = async () => {
  try {
    const db = await initDB();
    if (!db) return;
    await db.clear(STORE_NAME);
  } catch (error) {}
};
