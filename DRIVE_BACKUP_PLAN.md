# JournalX — Google Drive Backup Plan (for review)

Status: **DISABLED** right now via the master switch `BACKUP_ENABLED = false` in
`frontend/utils/driveBackup.js`. Everything below is built and ready; flipping
that flag to `true` re-activates it all. Review, add your points inline, or
confirm.

---

## 1. The big idea (the "WhatsApp model")

- **Live data** is read from **IndexedDB** (instant, offline-friendly) — already
  how the dashboard/analytics/trades render today.
- **Each user's own Google Drive** holds the backup copy of their data, in a
  private hidden folder. We (the company) never store or pay for it.
- This is fully **client-side** — no backend or DB involved in backup/restore.

Goal: cut backend/DB cost (trades are the only dataset that grows without
bound) while giving users durable, cross-device data they own.

---

## 2. What is implemented today (backup/restore layer)

File: `frontend/utils/driveBackup.js`

- **Auth:** Google Identity Services (GIS) token client.
- **Scope:** `drive.appdata` only (minimal — a private app folder users can't
  see or edit; not your whole Drive).
- **Storage:** ONE snapshot file `journalx-backup.json` in `appDataFolder`.
  Every backup **overwrites** it → there is never any duplication.
- **Connection model (key point):**
  - User grants the Drive scope **once** — at login/register, or on the first
    manual "Back up" click.
  - After that, tokens are fetched **silently** (`prompt:""`, no popup), so
    background auto-backups and the Settings buttons never prompt again.
  - Access tokens are cached in memory (~1 hour) to avoid repeat requests.
- **Functions:** `connectDrive` (interactive consent), `warmDriveConnection`
  (silent), `backupToDrive`, `scheduleAutoBackup` (debounced background),
  `restoreFromDrive`, plus `isDriveConfigured` / `isDriveConnected`.
- **Master switch:** `BACKUP_ENABLED` turns the whole feature (Settings card,
  auto-backup, login-time connect) on/off in one place.

### Where it's wired in
- `pages/dashboard.jsx` — silently warm the Drive token on load; connect once
  on a fresh login/register.
- `LogTradeModal`, `ChartTradeModal`, `ImportTradesModal` — call
  `scheduleAutoBackup()` after the trade is saved + IndexedDB updated.
- `SettingsPanel` — "Backup & restore" card: **Back up now**, **Restore**, and
  **Last backup / Last restore** timestamps. (Card is hidden while disabled.)

---

## 3. How each action behaves

**Auto-backup (background, no loader):**
- Fires after each manual log, chart log, and **once** per bulk import.
- Debounced ~4s so rapid logs/imports coalesce into a single upload.
- Silent (never prompts), runs only if Drive is already connected.
- The trade still saves to the DB and responds "done" immediately; the Drive
  upload happens after, in the background — the user never waits on it.

**Manual backup (Settings → Back up now):**
- Uses the silent token when connected (no popup); only prompts if Drive was
  never connected. Stamps "Last backup".

**Restore (Settings → Restore):**
- **Replaces** local IndexedDB data (does not merge) → restoring twice can't
  duplicate anything.
- De-dupes trades by `_id` as an extra guard; an in-progress lock blocks
  double-clicks. Asks for confirmation first. Stamps "Last restore", reloads.

---

## 4. The later migration (trades + accounts → Drive)

Not done yet — to do when you're ready:
- Move **trades + accounts** to Drive-only (live view still from IndexedDB),
  keep **auth / payments / webhooks** on the backend.
- Add **auto-restore-on-new-device**: when a user signs in with Google on a
  new device, grants Drive, and local IndexedDB is empty → silently pull the
  Drive snapshot in (using the dedupe + guard already built).
- Suggested **hybrid** (my recommendation): keep a *thin* backend record per
  trade (id, timestamp, count) for plan limits / "trades logged" tracking /
  integrity, but push the heavy fields (notes, screenshots, full detail) to
  Drive + IndexedDB. Keeps ~80% of the cost saving without losing enforcement
  or risking silent data loss.

---

## 5. Google Cloud config required (to enable)

Using your real client `785226561862-…` (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`):
- **Enable the Google Drive API** on the project.
- **Authorized JavaScript origins:** `https://journalx.app` + `http://localhost:3000`.
- **OAuth consent screen:** include the `drive.appdata` scope; published (done)
  or testers added.
- (`drive.appdata` is a sensitive scope → public rollout eventually needs
  Google verification; free but a review.)

---

## 6. Cost

- **~$0 for us.** Storage lives in each user's own 15 GB Google Drive.
- Google Drive API is free within standard quotas; a tiny JSON per user is far
  below any limit.
- Google has *announced* charges for exceeding API quotas later in 2026, with
  90-day notice — not a concern at journaling-app volumes.

---

## 7. Open questions — please confirm / add your points

1. **Auto-backup on every log** (built) vs **manual-only**? Keep automatic?
2. **Full snapshot overwrite** (built) vs **incremental**? Full is simplest and
   dupe-proof, but uploads the whole journal each time — fine for normal sizes,
   heavier for very large histories. OK to keep full?
3. **Auto-restore on new device** — confirm the trigger: only when local has
   zero trades? How to handle if both local and Drive have data (last-write
   wins vs newest-by-timestamp)?
4. **Force Drive connection?** If a user never connects Drive and trades become
   Drive-only, their only copy is volatile IndexedDB (browser can clear it).
   Should we *require* connecting Drive, or keep the thin backend record as the
   safety net?
5. **What to back up:** currently the whole IndexedDB `user-data` (trades,
   accounts, settings, XP). Confirm scope.
6. **Migration timing:** do the trades+accounts move now, or keep Drive as a
   backup-only layer for now and migrate later?

---

_Your notes below this line:_
