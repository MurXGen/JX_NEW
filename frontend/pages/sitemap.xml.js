/* Dynamic sitemap — public pages + every blog slug. Served at /sitemap.xml */
import { getAllPosts, SITE_URL } from "@/utils/blogs";

const STATIC = [
  { path: "/", priority: "1.0", freq: "weekly" },
  { path: "/blog", priority: "0.9", freq: "daily" },
  { path: "/pricing", priority: "0.8", freq: "monthly" },
  { path: "/contact", priority: "0.5", freq: "monthly" },
  { path: "/privacy-policy", priority: "0.3", freq: "yearly" },
  { path: "/terms-services", priority: "0.3", freq: "yearly" },
  { path: "/refund-policy", priority: "0.3", freq: "yearly" },
  { path: "/risk-disclaimer", priority: "0.3", freq: "yearly" },
  { path: "/cookie-policy", priority: "0.3", freq: "yearly" },
  { path: "/login", priority: "0.4", freq: "monthly" },
  { path: "/register", priority: "0.6", freq: "monthly" },
];

function SiteMap() {
  return null;
}

export async function getServerSideProps({ res }) {
  const posts = getAllPosts();
  const today = new Date().toISOString().slice(0, 10);

  const urls = [
    ...STATIC.map(
      (s) =>
        `<url><loc>${SITE_URL}${s.path}</loc><changefreq>${s.freq}</changefreq><priority>${s.priority}</priority></url>`,
    ),
    ...posts.map(
      (p) =>
        `<url><loc>${SITE_URL}/blog/${p.slug}</loc><lastmod>${p.date}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
    ),
  ].join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  res.setHeader("Content-Type", "text/xml");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate");
  res.write(xml);
  res.end();
  return { props: {} };
}

export default SiteMap;
