/* Dynamic sitemap — public pages + every blog slug. Served at /sitemap.xml
   Rebuilds on every request from data/blogs.json, so newly published blogs
   appear automatically. Each URL carries an accurate <lastmod> — the signal
   Google uses to decide what to recrawl. The homepage and /blog index inherit
   the date of the newest post (they genuinely change whenever a blog ships),
   so adding a post updates their lastmod and prompts a recrawl. */
import { getAllPosts, SITE_URL } from "@/utils/blogs";
import { MARKET_SLUGS } from "@/data/marketPages";
import { BROKER_SLUGS } from "@/data/brokerPages";
import { PROP_FIRM_SLUGS } from "@/data/propFirmPages";

/* Last meaningful content update for static/legal pages. Bump this only when
   the page itself actually changes, so we never feed Google a fake lastmod. */
const STATIC_LASTMOD = "2026-06-20";

const STATIC = [
  // `dynamic: true` → lastmod tracks the newest blog post (these pages list blogs)
  { path: "/", priority: "1.0", freq: "daily", dynamic: true },
  { path: "/blog", priority: "0.9", freq: "daily", dynamic: true },
  { path: "/features", priority: "0.9", freq: "monthly" },
  ...MARKET_SLUGS.map((s) => ({ path: `/${s}`, priority: "0.8", freq: "monthly" })),
  // Programmatic SEO: per-broker + per-prop-firm landing pages
  ...BROKER_SLUGS.map((s) => ({ path: `/${s}`, priority: "0.7", freq: "monthly" })),
  ...PROP_FIRM_SLUGS.map((s) => ({ path: `/${s}`, priority: "0.7", freq: "monthly" })),
  // Free calculator tools
  { path: "/tools", priority: "0.7", freq: "monthly" },
  { path: "/tools/position-size-calculator", priority: "0.6", freq: "monthly" },
  { path: "/tools/r-multiple-calculator", priority: "0.6", freq: "monthly" },
  { path: "/tools/pnl-calculator", priority: "0.6", freq: "monthly" },
  { path: "/tools/breakeven-win-rate-calculator", priority: "0.6", freq: "monthly" },
  { path: "/tools/risk-of-ruin-calculator", priority: "0.6", freq: "monthly" },
  { path: "/pricing", priority: "0.8", freq: "monthly" },
  { path: "/contact", priority: "0.5", freq: "monthly" },
  { path: "/privacy-policy", priority: "0.3", freq: "yearly" },
  { path: "/terms-services", priority: "0.3", freq: "yearly" },
  { path: "/refund-policy", priority: "0.3", freq: "yearly" },
  { path: "/risk-disclaimer", priority: "0.3", freq: "yearly" },
  { path: "/cookie-policy", priority: "0.3", freq: "yearly" },
  { path: "/login", priority: "0.4", freq: "monthly" },
  { path: "/register", priority: "0.6", freq: "monthly" },
  { path: "/refer", priority: "0.6", freq: "monthly" },
];

function SiteMap() {
  return null;
}

export async function getServerSideProps({ res }) {
  // getAllPosts() is sorted newest-first, so posts[0] is the latest publish date.
  const posts = getAllPosts();
  const today = new Date().toISOString().slice(0, 10);
  const latest = posts.length ? posts[0].date : today;

  const urls = [
    ...STATIC.map((s) => {
      const lastmod = s.dynamic ? latest : STATIC_LASTMOD;
      return `<url><loc>${SITE_URL}${s.path}</loc><lastmod>${lastmod}</lastmod><changefreq>${s.freq}</changefreq><priority>${s.priority}</priority></url>`;
    }),
    ...posts.map(
      (p) =>
        `<url><loc>${SITE_URL}/blog/${p.slug}</loc><lastmod>${p.updated || p.date}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
    ),
  ].join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  res.setHeader("Content-Type", "text/xml");
  // Revalidate hourly so a freshly published post shows up the same day.
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.write(xml);
  res.end();
  return { props: {} };
}

export default SiteMap;
