# Automated Google sitemap submission + indexing — setup guide

This makes Google get your new blog posts automatically every day. A GitHub
Action runs `google-search-submit.mjs` on a schedule, submits your sitemap to
Search Console via the official API, and (optionally) notifies the Indexing API
about freshly updated posts.

> **Why this instead of "pinging" Google?** Google removed the old
> unauthenticated sitemap-ping URL in 2024. The supported replacement is the
> Search Console API, which needs a service account — that's what this sets up.

You only do **Part A** once (the bits I can't do for you: creating the Google
Cloud project, a service-account key, and granting permissions). The code and
workflow are already in the repo.

---

## Part A — One-time setup (your steps)

### 1. Create / pick a Google Cloud project
1. Go to <https://console.cloud.google.com/>.
2. Create a new project (e.g. `journalx-seo`) or select an existing one.

### 2. Enable the two APIs
In **APIs & Services → Library**, search for and **Enable**:
- **Google Search Console API**
- **Web Search Indexing API** (a.k.a. "Indexing API") — only needed if you want
  the optional per-post indexing nudge.

### 3. Create a service account + key
1. **IAM & Admin → Service Accounts → Create service account**.
2. Name it `journalx-seo`. You do **not** need to grant it any project roles.
   Click **Done**.
3. Open the new service account → **Keys → Add key → Create new key → JSON**.
4. A `.json` file downloads. **Treat this like a password.** Do not commit it.
5. Copy the service account's email — it looks like
   `journalx-seo@your-project.iam.gserviceaccount.com`.

### 4. Give the service account access to your Search Console property
1. Go to <https://search.google.com/search-console>.
2. Open your **JournalX** property → **Settings → Users and permissions**.
3. **Add user** → paste the service account email → permission **Owner**.
   (Owner is required for the Indexing API; it also covers sitemap submission.)

### 5. Add the secret + variables to GitHub
In the repo **MurXGen/JX_NEW → Settings → Secrets and variables → Actions**:

**Secrets** (tab "Secrets") → **New repository secret**:
| Name | Value |
|------|-------|
| `GSC_SERVICE_ACCOUNT_KEY` | Paste the **entire contents** of the JSON key file |

**Variables** (tab "Variables") → **New repository variable**:
| Name | Value |
|------|-------|
| `GSC_SITE_URL` | `sc-domain:journalx.app` if your GSC property is a **Domain** property, **or** `https://journalx.app/` if it's a **URL-prefix** property |
| `GSC_SITEMAP_URL` | `https://journalx.app/sitemap.xml` |
| `GSC_USE_INDEXING_API` | `true` (or leave unset for sitemap-only) |
| `GSC_INDEX_WINDOW_DAYS` | `2` |

> Not sure which property type you have? In Search Console the property either
> shows a globe/`Domain` label (use `sc-domain:journalx.app`) or a full URL with
> `https://` (use `https://journalx.app/`). Match it exactly or the API returns 403.

### 6. Run it once to confirm
- **GitHub → Actions → "SEO — Submit sitemap to Google" → Run workflow.**
- Open the run log. You want to see:
  `[sitemap] Submitted https://journalx.app/sitemap.xml ...`
  and a status line with `lastSubmitted=...`.
- After that it runs automatically every day at **06:00 UTC**.

---

## Part B — What runs automatically (already in the repo)

- `scripts/seo/google-search-submit.mjs` — the script.
- `scripts/seo/package.json` — its one dependency (`googleapis`).
- `.github/workflows/seo-google-submit.yml` — the daily schedule + manual trigger.

Because your `sitemap.xml` is dynamic and now carries accurate `<lastmod>`
dates, Google re-downloads it and recrawls only what actually changed — so a new
blog post is discovered without any manual work.

---

## Running it locally (optional)

```bash
cd scripts/seo
npm install
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/your-key.json"
export GSC_SITE_URL="sc-domain:journalx.app"     # or https://journalx.app/
npm run submit          # sitemap only
npm run submit:index    # sitemap + Indexing API for recent posts
```

---

## Notes & gotchas

- **Security:** never commit the JSON key. `.gitignore` already blocks
  `scripts/seo/*.json` key files (except `package.json`). If a key ever leaks,
  delete it in Google Cloud → Service Accounts → Keys and create a new one.
- **403 / permission errors:** almost always (a) the service account isn't an
  **Owner** of the property, or (b) `GSC_SITE_URL` doesn't match your property
  type exactly.
- **Indexing API scope:** Google officially supports it for `JobPosting` and
  `BroadcastEvent` pages. For blog posts it's best-effort — it often speeds up
  discovery but may be ignored. Sitemap submission is the reliable mechanism;
  the Indexing API is a bonus, which is why it's a toggle.
- **Quota:** Indexing API allows 200 URL notifications/day by default — far more
  than a daily blog needs.
