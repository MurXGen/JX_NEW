"use client";

/* Client-side Google Drive backup & restore (no backend involved).
 *
 * Uses Google Identity Services (GIS) for an OAuth access token, then the
 * Drive REST API to store a single JSON file in the hidden "appDataFolder"
 * (private to this app — users can't see or accidentally edit it).
 *
 * Requires an OAuth Client ID in NEXT_PUBLIC_GOOGLE_CLIENT_ID, with the
 * Drive API enabled and the app's origin added to Authorized JavaScript
 * origins. Scope used is the minimal drive.appdata.
 */

import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const FILE_NAME = "journalx-backup.json";
const GIS_SRC = "https://accounts.google.com/gsi/client";

export const isDriveConfigured = () => !!CLIENT_ID;

/* lazy-load the GIS script once */
let gisPromise = null;
function loadGis() {
  if (typeof window === "undefined") return Promise.reject(new Error("no-window"));
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

/* request an access token (opens Google consent the first time) */
function getAccessToken() {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) return reject(new Error("GIS not ready"));
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (resp) => {
          if (resp && resp.access_token) resolve(resp.access_token);
          else reject(new Error("Authorization was cancelled"));
        },
        error_callback: () => reject(new Error("Authorization was cancelled")),
      });
      client.requestAccessToken();
    } catch (e) {
      reject(e);
    }
  });
}

async function findBackupFile(token) {
  const url =
    "https://www.googleapis.com/drive/v3/files" +
    "?spaces=appDataFolder" +
    `&q=${encodeURIComponent(`name='${FILE_NAME}'`)}` +
    "&fields=files(id,modifiedTime)&pageSize=1";
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Could not read Drive");
  const json = await res.json();
  return json.files && json.files[0];
}

async function uploadBackup(token, existingId, contentString) {
  const boundary = "jxbnd" + Math.random().toString(16).slice(2);
  const metadata = existingId
    ? { name: FILE_NAME, mimeType: "application/json" }
    : { name: FILE_NAME, mimeType: "application/json", parents: ["appDataFolder"] };
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
  if (!res.ok) throw new Error("Backup upload failed");
  return res.json();
}

/* Back up the local IndexedDB user-data to Drive. Returns ISO timestamp. */
export async function backupToDrive() {
  if (!CLIENT_ID) throw new Error("not-configured");
  await loadGis();
  const token = await getAccessToken();

  const userData = (await getFromIndexedDB("user-data")) || {};
  const payload = JSON.stringify({
    app: "JournalX",
    version: 1,
    savedAt: new Date().toISOString(),
    data: userData,
  });

  const existing = await findBackupFile(token);
  await uploadBackup(token, existing && existing.id, payload);

  const when = new Date().toISOString();
  try { localStorage.setItem("jx-last-backup", when); } catch {}
  return when;
}

/* Restore the latest Drive backup into IndexedDB. Returns { restoredAt, savedAt }. */
export async function restoreFromDrive() {
  if (!CLIENT_ID) throw new Error("not-configured");
  await loadGis();
  const token = await getAccessToken();

  const existing = await findBackupFile(token);
  if (!existing) throw new Error("no-backup");

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error("Could not download backup");
  const parsed = await res.json();
  const data = parsed && parsed.data;
  if (!data) throw new Error("Backup is empty or invalid");

  await saveToIndexedDB("user-data", data);

  const restoredAt = new Date().toISOString();
  try {
    localStorage.setItem("jx-last-restore", restoredAt);
    if (data.name) localStorage.setItem("userName", data.name);
    if (data.avatarUrl) localStorage.setItem("jx-avatar", data.avatarUrl);
  } catch {}
  return { restoredAt, savedAt: parsed.savedAt || null };
}
