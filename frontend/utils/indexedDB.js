// utils/indexedDB.js
import { openDB } from "idb";
import CryptoJS from "crypto-js";

const DB_NAME = "JX";
const STORE_NAME = "userData";
const DB_VERSION = 1;

const SECRET_KEY = process.env.NEXT_PUBLIC_INDEXDB;
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
    console.error("IndexedDB init failed:", error);
    return null;
  }
};

// Encrypt data
const encryptData = (data) => {
  try {
    const str = JSON.stringify(data);
    return CryptoJS.AES.encrypt(str, SECRET_KEY).toString();
  } catch (err) {
    return null;
  }
};

// Decrypt data
const decryptData = (cipherText) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (err) {
    return null;
  }
};

// Save item with optional expiry
export const saveToIndexedDB = async (key, data, expiryMs = null) => {
  try {
    const db = await initDB();
    if (!db) return;

    const payload = {
      value: encryptData(data),
      expiry: expiryMs ? Date.now() + expiryMs : null,
      integrity: CryptoJS.SHA256(JSON.stringify(data) + SECRET_KEY).toString(), // 🧩 extra integrity hash
    };

    await db.put(STORE_NAME, payload, key);
  } catch (error) {
    console.error("IndexedDB save error:", error);
  }
};

// Get item (checks expiry and integrity)
export const getFromIndexedDB = async (key) => {
  try {
    const db = await initDB();
    if (!db) return null;

    const stored = await db.get(STORE_NAME, key);
    if (!stored) return null;

    // check expiry
    if (stored.expiry && Date.now() > stored.expiry) {
      await db.delete(STORE_NAME, key);
      return null;
    }

    // decrypt and verify integrity
    const decryptedValue = decryptData(stored.value);
    const currentIntegrity = CryptoJS.SHA256(
      JSON.stringify(decryptedValue) + SECRET_KEY
    ).toString();

    if (currentIntegrity !== stored.integrity) {
      console.warn("Data integrity check failed for key:", key);
      await db.delete(STORE_NAME, key);
      return null;
    }

    return decryptedValue;
  } catch (error) {
    console.error("IndexedDB read error:", error);
    return null;
  }
};

// Delete specific key
export const deleteFromIndexedDB = async (key) => {
  try {
    const db = await initDB();
    if (!db) return;
    await db.delete(STORE_NAME, key);
  } catch (error) {
    console.error("IndexedDB delete error:", error);
  }
};

// Clear all data
export const clearIndexedDB = async () => {
  try {
    const db = await initDB();
    if (!db) return;
    await db.clear(STORE_NAME);
  } catch (error) {
    console.error("IndexedDB clear error:", error);
  }
};
