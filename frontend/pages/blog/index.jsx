"use client";

/* /blog — public blog index. No login. Full SEO (meta, OG, Twitter,
   JSON-LD Blog schema). Data from data/blogs.json via utils/blogs. */

import { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Search } from "lucide-react";
import { BlogTopbar } from "@/components/blog/BlogChrome";
import {
  SITE_URL,
  blogListJsonLd,
  fmtDate,
  getAllPosts,
  getAuthor,
  getCategories,
  getFeaturedPost,
} from "@/utils/blogs";

const CAT_DESC =
  "Trading journal guides on funded & prop firm trading, psychology, risk and strategy from JournalX — learn to protect your account and build a measurable, data-backed edge.";

const BLOG_KEYWORDS =
  "trading journal blog, funded trader tips, prop firm trading, how to pass a funded account challenge, trailing drawdown, trading psychology, risk management, revenge trading, trade journaling, FTMO journal";

/* Per-category accent colors so cards stay visual without any images. */
const CAT_META = {
  Strategy: { from: "#fcd535", to: "#f6a609" },
  Risk: { from: "#2ebd85", to: "#13a06b" },
  Psychology: { from: "#a78bfa", to: "#7c5cff" },
  Journaling: { from: "#38bdf8", to: "#2563eb" },
  Markets: { from: "#fb7185", to: "#e11d48" },
  Funded: { from: "#34d399", to: "#0ea5e9" },
};
const catMeta = (c) => CAT_META[c] || { from: "#fcd535", to: "#f6a609" };

export default function BlogIndex() {
  const posts = getAllPosts();
  const featured = getFeaturedPost();
  const categories = getCategories();
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");

  const list = useMemo(
    () =>
      posts
        .filter((p) => !p.featured)
        .filter((p) => cat === "All" || p.category === cat)
        .filter((p) => !q || p.title.toLowerCase().includes(q.toLowerCase()) || p.excerpt.toLowerCase().includes(q.toLowerCase())),
    [posts, cat, q],
  );

  return (
    <>
      <Head>
        <title>Trading Journal Blog — Funded Trading, Psychology & Risk | JournalX</title>
        <meta name="description" content={CAT_DESC} />
        <meta name="keywords" content={BLOG_KEYWORDS} />
        <link rel="canonical" href={`${SITE_URL}/blog`} />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="JournalX" />
        <meta property="og:title" content="JournalX Blog — Funded trading, psychology & journaling guides" />
        <meta property="og:description" content={CAT_DESC} />
        <meta property="og:url" content={`${SITE_URL}/blog`} />
        <meta property="og:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="JournalX Blog — Funded trading, psychology & journaling guides" />
        <meta name="twitter:description" content={CAT_DESC} />
        <meta name="twitter:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogListJsonLd()) }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
                { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
              ],
            }),
          }}
        />
      </Head>

      <div style={{ minHeight: "100vh", background: "var(--color-bg-canvas)", fontFamily: "var(--jx-font)", color: "var(--color-text-primary)" }}>
        <BlogTopbar />

        <main style={{ maxWidth: 1040, margin: "0 auto", padding: "var(--space-8) var(--space-4) 96px", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {/* hero */}
          <div>
            <h1 style={{ font: "var(--text-h1)", margin: 0 }}>The JournalX Trading Journal Blog</h1>
            <p style={{ font: "var(--text-body-lg)", color: "var(--color-text-muted)", maxWidth: 600 }}>
              High-leverage lessons for funded and prop firm traders — strategy, risk, trading psychology and journaling across forex, futures, stocks and crypto, and how to turn each one into a measurable edge.
            </p>
          </div>

          {/* search + categories */}
          <div className="jx-input" style={{ maxWidth: 420 }}>
            <span className="jx-input__icon"><Search size={16} /></span>
            <input placeholder="Search articles…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {categories.map((c) => (
              <button key={c} className={`jx-chip ${cat === c ? "jx-chip--selected" : ""}`} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>

          {/* featured — image-free, accent header */}
          {featured && cat === "All" && !q && (
            <Link href={`/blog/${featured.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                className="jx-card jx-card--flat"
                style={{ padding: 0, overflow: "hidden", cursor: "pointer", position: "relative" }}
              >
                <div style={{ height: 6, background: `linear-gradient(90deg, ${catMeta(featured.category).from}, ${catMeta(featured.category).to})` }} />
                <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="jx-badge jx-badge--brand">FEATURED · {featured.category}</span>
                  </span>
                  <h2 style={{ font: "var(--text-h2)", margin: 0 }}>{featured.title}</h2>
                  <p style={{ font: "var(--text-body)", color: "var(--color-text-muted)", margin: 0 }}>{featured.excerpt}</p>
                  <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                    {getAuthor(featured).name} · {fmtDate(featured.date)} · {featured.minutes} min read
                  </span>
                  <span className="jx-btn jx-btn--primary jx-btn--sm" style={{ alignSelf: "flex-start" }}>Read article <ArrowRight size={14} /></span>
                </div>
              </motion.div>
            </Link>
          )}

          {/* grid — image-free cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
            {list.map((p, i) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="jx-card jx-card--flat"
                  style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%", cursor: "pointer" }}
                >
                  <div style={{ height: 5, background: `linear-gradient(90deg, ${catMeta(p.category).from}, ${catMeta(p.category).to})` }} />
                  <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="jx-badge jx-badge--neutral">{p.category}</span>
                      <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                        <Clock size={11} /> {p.minutes} min
                      </span>
                    </span>
                    <h3 style={{ font: "var(--text-title)", margin: 0 }}>{p.title}</h3>
                    <p style={{ font: "var(--text-small)", color: "var(--color-text-muted)", margin: 0 }}>{p.excerpt}</p>
                    <span style={{ marginTop: "auto", font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                      {getAuthor(p).name} · {fmtDate(p.date)}
                    </span>
                  </div>
                </motion.div>
              </Link>
            ))}
            {list.length === 0 && (
              <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>No articles match — try another category.</span>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
