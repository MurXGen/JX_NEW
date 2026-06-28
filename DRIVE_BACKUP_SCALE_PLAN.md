# JournalX — Local-First Drive Backup at Scale (WhatsApp-style)

**Model:** The browser (IndexedDB) is the source of truth. The user's **own Google Drive** is a private backup target. Backup pushes IndexedDB → Drive (manual + every 4h). Restore pulls Drive → IndexedDB. On a new device, we offer to restore.

**Builds on what exists:** `utils/indexedDB.js` (`getFromIndexedDB`/`saveToIndexedDB`, store `"user-data"`) and `utils/driveBackup.js` (`isDriveConfigured`, `connectDrive`, `warmDriveConnection`, `isDriveConnected`, `backupToDrive`, `restoreFromDrive`) — currently behind `BACKUP_ENABLED`. This is the hardened, scalable version of that base.

---

## 1. Principles

1. **Local-first:** the app always reads/writes IndexedDB. Drive is never on the hot path; the app works fully offline.
2. **User owns the data:** stored in the user's Drive **`appDataFolder`** (hidden, app-private, per-user). Scope `drive.appdata` only — the least-scary permission; we can't read the rest of their Drive.
3. **Never lose data:** backups are versioned, checksummed, and guarded so a corrupt/empty snapshot can't wipe a good one. Restore **merges** by default.
4. **Backup link ≠ login:** the Google account used for backup is independent of how the user logged into JournalX.

---

## 2. Storage model

### 2.1 IndexedDB (source of truth)
Keep the existing `"user-data"` document, add a metadata store:

```jsonc
// store "user-data"  (existing)
{ accounts: [...], trades: [...], plans: {...}, profile: {...} }

// store "jx-sync-meta"  (new)
{
  deviceId: "dev_3f9a…",              // random, created once per browser
  schemaVersion: 3,
  lastLocalChangeAt: 1718900000000,   // bumped on every local write ("dirty")
  lastBackupAt: 1718890000000,
  lastRestoreAt: 1718870000000,
  driveLinked: true,
  driveEmail: "murthy@gmail.com"      // display only
}
```
Every local write bumps `lastLocalChangeAt`. Backup runs only when `lastLocalChangeAt > lastBackupAt` ("dirty").

### 2.2 Drive layout (in `appDataFolder`)
```
appDataFolder/
  journalx-manifest.json        ← tiny pointer/metadata, read FIRST (cheap)
  journalx-backup.json          ← current snapshot (overwritten each backup)
  journalx-backup.v<ts>.json    ← rolling history (keep last 3)
```

**Manifest** (read before downloading anything):
```jsonc
{ "schemaVersion":3, "updatedAt":1718890000000, "deviceId":"dev_3f9a…",
  "tradeCount":842, "checksum":"sha256:ab12…", "sizeBytes":532110, "appVersion":"1.8.0" }
```

**Snapshot** (gzip-compressed before upload):
```jsonc
{
  "schemaVersion":3, "exportedAt":1718890000000, "deviceId":"dev_3f9a…",
  "data": {
    "accounts":[ {"_id":"acc1","name":"Default","currency":"INR","updatedAt":…} ],
    "trades":  [ {"_id":"t1","symbol":"BTC/USDT","pnl":-150,"updatedAt":…} ],
    "settings":{ "displayCurrency":"INR","monthlyTarget":15000 }
  },
  "tombstones":[ {"_id":"t77","deletedAt":1718880000000} ]   // see §6
}
```
The manifest lets restore/auto-backup decide "is the cloud newer than me?" **without downloading the full snapshot**.

---

## 3. Auth — the two registration paths

Both end with a short-lived **Drive access token** for `drive.appdata` via Google Identity Services (GIS). They differ in *when/how* we ask.

### 3.1 Google-registered users
Already trust Google → use **incremental authorization**:
1. User registers with Google → app session created.
2. App requests the extra scope `https://www.googleapis.com/auth/drive.appdata` (one extra consent line, first time only).
3. Backup account defaults to their login Google account. Save `driveLinked`, `driveEmail`. First backup runs.
4. Later, silent tokens via `requestAccessToken({ prompt: '' })` work while the Google session is alive.

### 3.2 Manual users (email + OTP)
No Google session tied to the app → backup is opt-in and can use **any** Google account:
1. Settings → Backup → **"Connect Google Drive."**
2. GIS popup → pick account → consent to `drive.appdata`.
3. Save `driveLinked`, `driveEmail` ("Backing up to murthy@gmail.com"). First backup runs.
4. Silent re-auth works **only while that Google account has a live browser session**; else we prompt.

### 3.3 The scaling problem (and the fix)
Browser-only GIS gives **~1h access tokens, no refresh token** → "every 4h" auto-backup is fragile (needs a live Google session). For a WhatsApp-grade base, add a **server-assisted token path**:
- One-time OAuth **authorization-code flow** (`access_type=offline`) → backend stores an **encrypted refresh token** per user.
- `POST /api/drive/access-token` → returns a fresh access token to the **client**, which still performs the upload (data lives in the browser; the server never sees trades).

> The server can **mint tokens** but **cannot back up by itself** — the data is in the browser's IndexedDB. Backups always run in the browser (foreground, or PWA background sync where supported). The refresh token only removes the "must be signed into Google right now" fragility.

**Ship order:** client-only first (works today), then the server refresh-token path for reliable auto-backup.

---

## 4. Backup flow (IndexedDB → Drive)

**Triggers:** manual button · auto every 4h (on load + timer) · debounced ~3 min after a local change · on `online` / `visibilitychange→visible` · best-effort on `pagehide`.

```
async function runBackup({ interactive }) {
  if (!driveLinked) return;
  if (!dirty() && !interactive) return;
  const token = await getDriveToken({ interactive });
  const data  = await getFromIndexedDB('user-data');

  // SAFETY GUARDS — never wipe a good backup
  const remote = await readManifest(token);
  if (localTradeCount(data) === 0 && remote?.tradeCount > 0 && !interactive) return;
  if (remote && remote.tradeCount > localTradeCount(data) * 1.2 && !interactive)
      return flagConflict();             // cloud has many more → ask before overwrite

  const snapshot = buildSnapshot(data);  // + tombstones + schemaVersion
  const payload  = gzip(JSON.stringify(snapshot));
  const checksum = sha256(payload);

  await uploadFile(token, 'journalx-backup.json', payload);          // current
  await uploadFile(token, `journalx-backup.v${now}.json`, payload);  // rolling
  await pruneOldVersions(token, 3);
  await writeManifest(token, { updatedAt: now, checksum, tradeCount, deviceId });
  setMeta({ lastBackupAt: now });        // clears "dirty"
}
```

**Example:** user logs a losing trade on mobile → `lastLocalChangeAt` bumps → ~3 min later the debounce fires → silent token → 842 trades gzipped (~520 KB) → uploaded → manifest updated → "Last backup: just now."

---

## 5. Restore flow (Drive → IndexedDB)

**New-device / fresh-login detection (after local load):**
```
const remote = driveLinked ? await readManifest(token) : null;
if (remote && (localTradeCount() === 0 || remote.updatedAt > lastBackupAt))
    promptRestore(remote);   // "Backup found: 842 trades, yesterday. Restore?"
```
- **Empty local (new device / cleared browser):** strongly prompt restore.
- **Local has data but cloud newer:** offer **Merge** (recommended) or **Replace**.

```
async function runRestore({ mode }) {            // 'merge' | 'replace'
  const token = await getDriveToken({ interactive:true });
  const blob  = await downloadFile(token, 'journalx-backup.json');
  if (sha256(blob) !== manifest.checksum) throw 'corrupt-backup';
  let snap = JSON.parse(gunzip(blob));
  if (snap.schemaVersion < CURRENT) snap = migrate(snap);
  const local  = await getFromIndexedDB('user-data');
  const merged = mode === 'replace' ? snap.data : mergeData(local, snap);
  await saveToIndexedDB('user-data', merged);
  setMeta({ lastRestoreAt: now, lastBackupAt: snap.exportedAt });
  dispatchEvent('jx-data-restored');             // panels re-read IndexedDB
}
```

**Example:** user installs the PWA on a new phone, logs in (manual account) → manifest shows 842 trades, yesterday → "Restore from Google Drive?" → tap → verified snapshot written to IndexedDB → dashboard repopulates.

---

## 6. Conflict resolution (multi-device)

Blind "last snapshot wins" loses data when two devices diverge. Use **record-level merge**:
- Each trade/journal carries `updatedAt`; deletes are **tombstones** (`deletedAt`), not hard removals, so a delete on device A isn't resurrected by a stale device B.
- `mergeData(local, remote)` per `_id`: present on one side → keep; present on both → newer `updatedAt` wins; tombstone newer than the record → deleted. After merge, re-upload so the cloud converges.
- **Simpler v1 fallback:** last-write-wins by `manifest.updatedAt`, but always keep rolling versions and **warn** before replacing newer-looking local data.

---

## 7. The 4-hour scheduler

```
on dashboard mount:
  maybeBackup()                                  // catch-up if >4h & dirty
  setInterval(maybeBackup, 30*60*1000)           // re-check every 30 min while open
  addEventListener('online', maybeBackup)
  document.addEventListener('visibilitychange', () => visible && maybeBackup())

maybeBackup(): if connected && dirty && now-lastBackupAt > 4h → runBackup({interactive:false})
```
PWA bonus: try **Periodic Background Sync** (Chromium/Android) to nudge when closed; unsupported on iOS, so the foreground timer is the baseline. All async + retry with backoff.

---

## 8. Edge cases

| Case | Handling |
|---|---|
| Offline at backup time | Skip; retry on `online`; stay "dirty". |
| Token expired | Silent `requestAccessToken({prompt:''})`; if it fails → defer (auto) or prompt (manual). |
| Google session signed out (manual user) | Auto-backup pauses + "Reconnect Drive" nudge; server refresh-token path (§3.3) avoids this. |
| User revokes Drive access | 401/403 → set `driveLinked=false`, prompt reconnect. |
| Corrupt / partial snapshot | Checksum mismatch → don't apply; fall back to latest good rolling version. |
| Cloud empty, local has data | Never auto-overwrite cloud-with-empty (and vice-versa). |
| Local empty, cloud has data | Prompt restore. |
| Same trade edited on two devices | Record-level merge by `updatedAt`. |
| Delete on A, edit on B | Tombstone vs `updatedAt` decides; newer wins. |
| Large history (10k+ trades) | gzip; if > ~5–8 MB, chunk by year/journal + manifest index. |
| Drive quota full | Notify; local data stays safe (no loss). |
| Schema upgrade | `schemaVersion` + `migrate()` on restore; refuse downgrade (newer cloud, older app) → ask user to update. |
| Multiple Google accounts | Pin to linked `driveEmail`; mismatch on silent auth → account chooser. |
| Switch linked Drive account | Disconnect clears tokens/meta; reconnect re-seeds. |
| Browser data cleared (IndexedDB gone) | Exactly why backup exists → next login detects empty local + cloud manifest → restore. |
| Two tabs back up at once | Lock in `jx-sync-meta` (`backupInProgressUntil`) prevents double upload. |
| Restore would clobber unsynced local edits | Default **merge**; if **replace**, first push current local to a rolling version. |

---

## 9. Security & privacy

- Scope **`drive.appdata` only** — we can't read the user's other files.
- Snapshot lives in the user's own Drive; **JournalX servers never receive trade data** (even with the token path — the server only mints tokens).
- **Optional E2E encryption:** user sets a backup passphrase → encrypt snapshot client-side (AES-GCM, key via PBKDF2/Argon2) before upload. Lost passphrase = lost backup (state clearly, like WhatsApp).
- Copy: "Backups are stored in your own Google Drive (hidden app folder). We never store your trades on our servers."

---

## 10. Function/API surface

Client (extend `utils/driveBackup.js`): `getDriveToken({interactive})`, `runBackup`, `runRestore`, `readManifest`, `writeManifest`, `pruneOldVersions`, `mergeData`, `buildSnapshot`, `migrate`, `gzip/gunzip`, `sha256`, `markDirty()`, `startAutoBackup()`.

Server (optional, the scale path): `GET /api/drive/oauth/start`, `GET /api/drive/oauth/callback` (store encrypted refresh token), `POST /api/drive/access-token`, `DELETE /api/drive/link`.

UI: Settings → Backup (status, linked account, Back up now, Restore, Disconnect, optional passphrase); new-device restore modal after login; subtle "backed up ✓ / backing up…" indicator.

---

## 11. Milestones

1. `jx-sync-meta` + `markDirty()` wired into every write path + `deviceId`.
2. Snapshot + manifest + checksum + gzip + rolling versions (replaces single-file backup).
3. Safety guards (no empty-overwrite, conflict flag).
4. Restore with **merge** + new-device detect/prompt.
5. 4h foreground scheduler + online/visibility hooks.
6. Auth polish: incremental scope (Google users) + "Connect Drive" (manual users) + show linked account.
7. (Scale) server refresh-token path for reliable silent auto-backup.
8. (Optional) E2E passphrase encryption.
9. QA: new-device restore, two-device merge, offline, revoke, corrupt file, large dataset, account switch.

---

## 12. Decisions needed

1. Conflict model for v1: **record-level merge** (recommended) or LWW + versions?
2. Confirm **4h** auto interval (+ change-debounced backup yes/no)?
3. Add the **server refresh-token path** now (reliable auto-backup) or client-only first?
4. Offer **E2E passphrase encryption**?
5. Rolling versions to keep (default **3**)?
