/**
 * google-search-submit.mjs
 * -------------------------------------------------------------------------
 * Submits the JournalX sitemap to Google Search Console via the official API,
 * and (optionally) notifies the Indexing API about recently-updated blog posts.
 *
 * This is the legitimate, supported way to programmatically tell Google about
 * sitemap changes — Google retired the old unauthenticated "ping" endpoint in
 * 2024, so this replaces it.
 *
 * Auth: a Google Cloud service account that has been added as an OWNER of the
 * Search Console property. The key is read from the environment — NEVER commit
 * it to the repo.
 *
 *   GSC_SERVICE_ACCOUNT_KEY   Full service-account JSON (as a string). Preferred
 *                             for CI (store as a GitHub Actions secret).
 *   GOOGLE_APPLICATION_CREDENTIALS  …or a path to the key file (for local runs).
 *
 * Config (env):
 *   GSC_SITE_URL          "sc-domain:journalx.app"  (Domain property)  OR
 *                         "https://journalx.app/"   (URL-prefix property)
 *   GSC_SITEMAP_URL       Default https://journalx.app/sitemap.xml
 *   GSC_USE_INDEXING_API  "true" to also call the Indexing API for new posts
 *   GSC_INDEX_WINDOW_DAYS Look-back window for "recent" posts (default 2)
 *
 * Run:  node google-search-submit.mjs            (sitemap only)
 *       node google-search-submit.mjs --index-new (also notify Indexing API)
 * -------------------------------------------------------------------------
 */
import { google } from "googleapis";

const SITE_URL = process.env.GSC_SITE_URL || "https://journalx.app/";
const SITEMAP_URL = process.env.GSC_SITEMAP_URL || "https://journalx.app/sitemap.xml";
const USE_INDEXING =
  String(process.env.GSC_USE_INDEXING_API || "").toLowerCase() === "true" ||
  process.argv.includes("--index-new");
const INDEX_WINDOW_DAYS = parseInt(process.env.GSC_INDEX_WINDOW_DAYS || "2", 10);

function loadCredentials() {
  const json = process.env.GSC_SERVICE_ACCOUNT_KEY;
  if (json && json.trim()) {
    try {
      return JSON.parse(json);
    } catch {
      throw new Error("GSC_SERVICE_ACCOUNT_KEY is set but is not valid JSON.");
    }
  }
  return null; // fall back to GOOGLE_APPLICATION_CREDENTIALS file path
}

function getAuth(scopes) {
  const credentials = loadCredentials();
  if (credentials) return new google.auth.GoogleAuth({ credentials, scopes });
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      "No credentials found. Set GSC_SERVICE_ACCOUNT_KEY (JSON string) or GOOGLE_APPLICATION_CREDENTIALS (file path).",
    );
  }
  return new google.auth.GoogleAuth({ scopes });
}

async function submitSitemap() {
  const auth = getAuth(["https://www.googleapis.com/auth/webmasters"]);
  const sc = google.searchconsole({ version: "v1", auth });

  await sc.sitemaps.submit({ siteUrl: SITE_URL, feedpath: SITEMAP_URL });
  console.log(`[sitemap] Submitted ${SITEMAP_URL} to property ${SITE_URL}`);

  try {
    const { data } = await sc.sitemaps.get({ siteUrl: SITE_URL, feedpath: SITEMAP_URL });
    const c = (data.contents && data.contents[0]) || {};
    console.log(
      `[sitemap] Google status: lastSubmitted=${data.lastSubmitted || "?"}, ` +
        `lastDownloaded=${data.lastDownloaded || "not yet"}, isPending=${data.isPending}, ` +
        `errors=${data.errors || 0}, warnings=${data.warnings || 0}, submittedUrls=${c.submitted || "?"}, indexed=${c.indexed || "?"}`,
    );
  } catch (e) {
    console.log(`[sitemap] Submitted OK (status read skipped: ${e.message})`);
  }
}

async function fetchRecentBlogUrls() {
  const res = await fetch(SITEMAP_URL, { headers: { "User-Agent": "JournalX-SEO-Bot" } });
  if (!res.ok) throw new Error(`Sitemap fetch failed: HTTP ${res.status}`);
  const xml = await res.text();
  const cutoff = Date.now() - INDEX_WINDOW_DAYS * 86400000;
  const recent = [];
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const body = block[1];
    const loc = (body.match(/<loc>(.*?)<\/loc>/) || [])[1];
    const lastmod = (body.match(/<lastmod>(.*?)<\/lastmod>/) || [])[1];
    if (!loc || !loc.includes("/blog/")) continue; // only individual posts
    if (lastmod && new Date(lastmod).getTime() >= cutoff) recent.push(loc);
  }
  return recent;
}

async function notifyIndexing(urls) {
  if (!urls.length) {
    console.log(`[indexing] No blog posts updated in the last ${INDEX_WINDOW_DAYS} day(s).`);
    return;
  }
  const auth = getAuth(["https://www.googleapis.com/auth/indexing"]);
  const indexing = google.indexing({ version: "v3", auth });
  for (const url of urls) {
    try {
      await indexing.urlNotifications.publish({ requestBody: { url, type: "URL_UPDATED" } });
      console.log(`[indexing] URL_UPDATED -> ${url}`);
    } catch (err) {
      const msg = err?.errors?.[0]?.message || err.message;
      console.error(`[indexing] FAILED ${url}: ${msg}`);
    }
  }
}

(async () => {
  try {
    await submitSitemap();

    if (USE_INDEXING) {
      console.log(
        `[indexing] Enabled (window=${INDEX_WINDOW_DAYS}d). Note: Google officially supports the ` +
          `Indexing API for JobPosting/BroadcastEvent pages; using it for blog posts is best-effort and may be ignored.`,
      );
      const urls = await fetchRecentBlogUrls();
      await notifyIndexing(urls);
    } else {
      console.log("[indexing] Skipped. Set GSC_USE_INDEXING_API=true or pass --index-new to enable.");
    }

    console.log("Done.");
  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
})();
