"use client";

/* Client-side Google Drive backup & restore (no backend involved).
 *
 * Uses Google Identity Services (GIS) for an OAuth access token, then the
 * Drive REST API to store ONE JSON snapshot in the hidden "appDataFolder"
 * (private to this app). The snapshot is a full copy of IndexedDB "user-data",
 * so every backup overwrites the same file — there is never any duplication.
 *
 * Connection model:
 *  - The user grants the drive.appdata scope ONCE (at login/register, or on the
 *    first manual backup click). After that, tokens are fetched silently
 *    (prompt:"") with no popup, so background auto-backups and the Settings
 *    buttons never show a Google prompt again.
 *
 * Requires NEXT_PUBLIC_GOOGLE_CLIENT_ID with the Drive API enabled, the app
 * origin in Authorized JavaScript origins, and the drive.appdata scope on the
 * consent screen.
 */

import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const FILE_NAME = "journalx-backup.json";
const GIS_SRC = "https://accounts.google.com/gsi/client";
const CONNECTED_KEY = "jx-drive-connected";

/* Master switch — Drive backup is enabled (Drive API enabled + OAuth app
   published on the Google Cloud project). Set to false to fully disable the
   Settings card, background auto-backup, and login-time connect. */
const BACKUP_ENABLED = false;

export const isDriveConfigured = () => BACKUP_ENABLED && !!CLIENT_ID;
export const isDriveConnected = () => {
  try {
    return localStorage.getItem(CONNECTED_KEY) === "1";
  } catch {
    return false;
  }
};
const markConnected = () => {
  try {
    localStorage.setItem(CONNECTED_KEY, "1");
  } catch {}
};

/* ---------- GIS loader ---------- */
let gisPromise = null;
function loadGis() {
  if (typeof window === "undefined")
    return Promise.reject(new Error("no-window"));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Google sign-in"));
    document.head.appendChild(s);
  });
  return gisPromise;
}

/* request a token. prompt:"" = silent (only if already consented);
   prompt:undefined = default (consent popup the first time). */
function requestToken(prompt) {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2)
      return reject(new Error("GIS not ready"));
    let settled = false;
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (resp) => {
          settled = true;
          if (resp && resp.access_token) resolve(resp);
          else reject(new Error("no-token"));
        },
        error_callback: (err) => {
          settled = true;
          reject(new Error(err?.type || "auth-failed"));
        },
      });
      client.requestAccessToken(prompt !== undefined ? { prompt } : {});
      // guard: if GIS never calls back (e.g. silent with no grant), fail fast
      setTimeout(() => {
        if (!settled) reject(new Error("auth-timeout"));
      }, 60000);
    } catch (e) {
      reject(e);
    }
  });
}

/* ---------- token cache (tokens last ~1h) ---------- */
let cachedToken = null;
let tokenExp = 0;

async function getValidToken({ interactive } = {}) {
  if (cachedToken && Date.now() < tokenExp - 60000) return cachedToken;
  if (!isDriveConfigured()) throw new Error("not-configured");
  await loadGis();
  try {
    const resp = await requestToken(""); // silent
    cachedToken = resp.access_token;
    tokenExp = Date.now() + (Number(resp.expires_in) || 3600) * 1000;
    markConnected();
    return cachedToken;
  } catch (silentErr) {
    if (!interactive) throw silentErr; // background path: never prompt
    const resp = await requestToken(undefined); // interactive consent
    cachedToken = resp.access_token;
    tokenExp = Date.now() + (Number(resp.expires_in) || 3600) * 1000;
    markConnected();
    return cachedToken;
  }
}

/* Explicitly connect (used at login/register or first manual action). Shows the
   Google consent popup if needed; resolves true once connected. */
export async function connectDrive() {
  if (!isDriveConfigured()) return false;
  try {
    await getValidToken({ interactive: true });
    return true;
  } catch {
    return false;
  }
}

/* Silently warm the connection on load — no popup. Returns true if connected. */
export async function warmDriveConnection() {
  if (!isDriveConfigured()) return false;
  try {
    await getValidToken({ interactive: false });
    return true;
  } catch {
    return false;
  }
}

/* ---------- Drive REST ---------- */
/* surface the real Google error (status + message) instead of a generic one */
async function driveError(res, fallback) {
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.error?.message || body?.error_description || "";
  } catch {}
  const msg = `${fallback} (${res.status}${detail ? `: ${detail}` : ""})`;
  return new Error(msg);
}

async function findBackupFile(token) {
  const url =
    "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder" +
    `&q=${encodeURIComponent(`name='${FILE_NAME}'`)}` +
    "&fields=files(id,modifiedTime)&pageSize=1";
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await driveError(res, "Could not read Drive");
  const json = await res.json();
  return json.files && json.files[0];
}

async function uploadBackup(token, existingId, contentString) {
  const boundary = "jxbnd" + Math.random().toString(16).slice(2);
  const metadata = existingId
    ? { name: FILE_NAME, mimeType: "application/json" }
    : {
        name: FILE_NAME,
        mimeType: "application/json",
        parents: ["appDataFolder"],
      };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    contentString +
    `\r\n--${boundary}--`;
  const url = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
  const res = await fetch(url, {
    method: existingId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw await driveError(res, "Backup upload failed");
  return res.json();
}

/* de-duplicate trades by _id so a snapshot/restore can never double up rows */
function dedupeUserData(data) {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data.trades)) {
    const seen = new Set();
    data.trades = data.trades.filter((t) => {
      const id = t && (t._id || t.id);
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  return data;
}

/* ---------- public: backup ---------- */
export async function backupToDrive({ interactive = false } = {}) {
  if (!isDriveConfigured()) throw new Error("not-configured");
  const token = await getValidToken({ interactive });

  const userData = dedupeUserData((await getFromIndexedDB("user-data")) || {});
  const payload = JSON.stringify({
    app: "JournalX",
    version: 1,
    savedAt: new Date().toISOString(),
    data: userData,
  });

  const existing = await findBackupFile(token);
  await uploadBackup(token, existing && existing.id, payload);

  const when = new Date().toISOString();
  try {
    localStorage.setItem("jx-last-backup", when);
  } catch {}
  window.dispatchEvent(new CustomEvent("jx-backup-done", { detail: when }));
  return when;
}

/* ---------- public: debounced background auto-backup (never prompts) ---------- */
let backupTimer = null;
let backupInFlight = false;
export function scheduleAutoBackup(delay = 4000) {
  if (typeof window === "undefined" || !isDriveConfigured()) return;
  if (!isDriveConnected()) return; // only once the user has connected Drive
  clearTimeout(backupTimer);
  backupTimer = setTimeout(async () => {
    if (backupInFlight) return;
    backupInFlight = true;
    try {
      await backupToDrive({ interactive: false });
    } catch {
      /* silent — auto-backup must never disturb the user */
    } finally {
      backupInFlight = false;
    }
  }, delay);
}

/* ---------- public: restore (replace + dedupe, guarded) ---------- */
let restoreInProgress = false;
export async function restoreFromDrive({ interactive = true } = {}) {
  if (!isDriveConfigured()) throw new Error("not-configured");
  if (restoreInProgress) throw new Error("in-progress");
  restoreInProgress = true;
  try {
    const token = await getValidToken({ interactive });
    const existing = await findBackupFile(token);
    if (!existing) throw new Error("no-backup");

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw await driveError(res, "Could not download backup");
    const parsed = await res.json();
    const data = dedupeUserData(parsed && parsed.data);
    if (!data) throw new Error("Backup is empty or invalid");

    // replace (not merge) so restoring twice can't duplicate anything
    await saveToIndexedDB("user-data", data);

    const restoredAt = new Date().toISOString();
    try {
      localStorage.setItem("jx-last-restore", restoredAt);
      if (data.name) localStorage.setItem("userName", data.name);
      if (data.avatarUrl) localStorage.setItem("jx-avatar", data.avatarUrl);
    } catch {}
    return {
      restoredAt,
      savedAt: parsed.savedAt || null,
      trades: (data.trades || []).length,
    };
  } finally {
    restoreInProgress = false;
  }
}
