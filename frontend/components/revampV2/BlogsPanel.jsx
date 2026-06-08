"use client";

/* Learn & News panel (dashboard) — reads the same data/blogs.json as
   the public /blog pages via utils/blogs. Opens articles in a new tab
   on the public, SEO-indexed blog page. */

import { useMemo, useState } from "react";
import { ArrowRight, Clock, ExternalLink, Search } from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";
import {
  fmtDate,
  getAllPosts,
  getAuthor,
  getCategories,
  getFeaturedPost,
} from "@/utils/blogs";

export default function BlogsPanel() {
  const posts = getAllPosts();
  const featured = getFeaturedPost();
  const categories = getCategories();
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const open = (slug) => window.open(`/blog/${slug}`, "_blank", "noopener");

  const list = useMemo(
    () =>
      posts
        .filter((p) => !p.featured)
        .filter((p) => category === "All" || p.category === category)
        .filter((p) => !query || p.title.toLowerCase().includes(query.toLowerCase())),
    [posts, category, query],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)" }}>
        <div>
          <div style={{ font: "var(--text-h2)" }}>Sharpen your edge</div>
          <div style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>
            Guides and tactics — a fresh trading lesson every day.
          </div>
        </div>
        <Button variant="outline" size="sm" icon={ExternalLink} onClick={() => window.open("/blog", "_blank", "noopener")}>
          Open blog
        </Button>
      </div>

      <div className="jx-input">
        <span className="jx-input__icon"><Search size={16} /></span>
        <input placeholder="Search articles, strategies, market news…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {categories.map((c) => (
          <button key={c} className={`jx-chip ${category === c ? "jx-chip--selected" : ""}`} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      {/* featured */}
      {featured && category === "All" && !query && (
        <div
          className="jx-card jx-card--flat"
          style={{ padding: 0, overflow: "hidden", display: "grid", gridTemplateColumns: "minmax(200px, 1fr) 1.4fr", cursor: "pointer" }}
          onClick={() => open(featured.slug)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={featured.cover} alt={featured.title} style={{ width: "100%", height: "100%", minHeight: 200, objectFit: "cover" }} />
          <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <Badge variant="brand">FEATURED · {featured.category}</Badge>
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{featured.minutes} min read</span>
            </div>
            <span style={{ font: "var(--text-h2)" }}>{featured.title}</span>
            <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>{featured.excerpt}</span>
            <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
              {getAuthor(featured).name} · {fmtDate(featured.date)}
            </span>
            <Button variant="primary" onClick={(e) => { e.stopPropagation(); open(featured.slug); }} style={{ alignSelf: "flex-start" }}>
              Read article <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      )}

      <span className="jx-card__title">Latest articles</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--space-4)" }}>
        {list.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => open(p.slug)}
            className="jx-card jx-card--flat"
            style={{ padding: 0, overflow: "hidden", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column" }}
          >
            <div style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.cover} alt={p.title} style={{ width: "100%", height: 130, objectFit: "cover" }} />
              <span className="jx-badge jx-badge--neutral" style={{ position: "absolute", top: 10, right: 10 }}>
                <Clock size={11} /> {p.minutes} min
              </span>
            </div>
            <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 6 }}>
              <Badge variant="neutral">{p.category}</Badge>
              <span style={{ font: "var(--text-title)" }}>{p.title}</span>
              <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>{p.excerpt}</span>
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: 4 }}>
                {getAuthor(p).name} · {fmtDate(p.date)}
              </span>
            </div>
          </button>
        ))}
        {list.length === 0 && (
          <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>No articles match — try another category.</span>
        )}
      </div>
    </div>
  );
}
