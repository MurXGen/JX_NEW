"use strict";

/* Small symmetric vault for encrypting exchange API secrets at rest.
   AES-256-GCM. The key is derived from INTEGRATIONS_SECRET (preferred) or, as a
   fallback so the feature works without a new env var, from JWT_SECRET. Rotating
   either env value invalidates stored secrets (users simply reconnect). */

const crypto = require("crypto");

const RAW =
  process.env.INTEGRATIONS_SECRET ||
  process.env.JWT_SECRET ||
  "journalx-dev-integrations-secret-change-me";

// 32-byte key from whatever length the env value is
const KEY = crypto.createHash("sha256").update(String(RAW)).digest();

/** Encrypt a UTF-8 string → "v1:<iv>:<tag>:<cipher>" (all base64). */
function encrypt(plain) {
  if (plain == null || plain === "") return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

/** Decrypt a value produced by encrypt(). Returns "" on any failure. */
function decrypt(payload) {
  try {
    if (!payload || typeof payload !== "string") return "";
    const [ver, ivB64, tagB64, dataB64] = payload.split(":");
    if (ver !== "v1") return "";
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return "";
  }
}

/** Last 4 chars of an API key, for showing a masked hint in the UI. */
function keyHint(apiKey) {
  const s = String(apiKey || "");
  return s.length <= 4 ? "" : s.slice(-4);
}

module.exports = { encrypt, decrypt, keyHint };
