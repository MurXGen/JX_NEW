"use client";

/* Shared chrome + body renderer for public blog pages and the
   dashboard Learn & News panel. */

import { ArrowRight, Lightbulb, Sparkles, ThumbsUp, TrendingUp } from "lucide-react";

const SITE_URL = "https://journalx.app";

export function BlogTopbar() {
  return (
    <header
      style={{
        display: "flex", alignItems: "center", gap: "var(--space-3)",
        padding: "var(--space-4) var(--space-6)", borderBottom: "1px solid var(--color-border)",
        background: "var(--color-bg-surface)", position: "sticky", top: 0, zIndex: 20,
      }}
    >
      <a href="/" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center" }}>
        <span style={{ font: "var(--text-title)", fontWeight: 700, letterSpacing: "-0.5px" }}>
          Journal<strong style={{ color: "var(--yellow-500)" }}>X</strong>
        </span>
      </a>
      <a href="/blog" style={{ marginLeft: "var(--space-3)", textDecoration: "none", color: "var(--color-text-secondary)", font: "var(--text-body-md)" }}>
        Blog
      </a>
      <a href="/pricing" style={{ textDecoration: "none", color: "var(--color-text-secondary)", font: "var(--text-body-md)" }}>
        Pricing
      </a>
      <a href="/register" style={{ marginLeft: "auto", textDecoration: "none" }}>
        <button className="jx-btn jx-btn--primary jx-btn--sm">
          Start free <ArrowRight size={14} />
        </button>
      </a>
    </header>
  );
}

/* renders the JSON `body` array */
export function BlogBody({ body = [] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", font: "var(--text-body-lg)", color: "var(--color-text-secondary)" }}>
      {body.map((block, i) => {
        if (block.type === "h2")
          return <h2 key={i} style={{ font: "var(--text-h2)", color: "var(--color-text-primary)", margin: "var(--space-3) 0 0" }}>{block.text}</h2>;
        if (block.type === "quote")
          return (
            <blockquote key={i} style={{ margin: 0, padding: "var(--space-3) var(--space-5)", borderLeft: "3px solid var(--color-primary)", background: "var(--color-primary-subtle)", borderRadius: "0 var(--radius-md) var(--radius-md) 0", font: "var(--text-h3)", color: "var(--color-text-primary)" }}>
              {block.text}
            </blockquote>
          );
        if (block.type === "usecase")
          return (
            <div key={i} className="jx-card jx-card--flat" style={{ background: "var(--color-success-subtle)", borderLeft: "3px solid var(--color-success)", padding: "var(--space-4)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--text-body-md)", fontWeight: 600, color: "var(--color-success-strong)", marginBottom: 6 }}>
                <Sparkles size={16} /> How JournalX helps
              </div>
              <p style={{ margin: 0, font: "var(--text-body)", color: "var(--color-text-secondary)" }}>{block.text}</p>
            </div>
          );
        if (block.type === "why")
          return (
            <div key={i} className="jx-card jx-card--flat" style={{ background: "var(--color-primary-subtle)", borderLeft: "3px solid var(--color-primary)", padding: "var(--space-4)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--text-body-md)", fontWeight: 600, color: "var(--yellow-600)", marginBottom: 6 }}>
                <Lightbulb size={16} /> Why JournalX is different
              </div>
              <p style={{ margin: 0, font: "var(--text-body)", color: "var(--color-text-secondary)" }}>{block.text}</p>
            </div>
          );
        return <p key={i} style={{ margin: 0 }}>{block.text}</p>;
      })}
    </div>
  );
}

/* bottom conversion block reused on detail pages */
export function BlogCTA() {
  return (
    <div className="jx-card" style={{ textAlign: "center", padding: "var(--space-8)", background: "var(--color-primary-subtle)", border: "1px solid var(--color-primary)" }}>
      <TrendingUp size={32} style={{ color: "var(--yellow-500)" }} />
      <div style={{ font: "var(--text-h2)", marginTop: "var(--space-2)" }}>Turn these lessons into your edge</div>
      <p style={{ font: "var(--text-body)", color: "var(--color-text-secondary)", maxWidth: 480, margin: "var(--space-2) auto var(--space-4)" }}>
        JournalX logs your trades, scores your discipline, and shows exactly where your P&amp;L comes from — free to start.
      </p>
      <a href={`${SITE_URL}/register`} style={{ textDecoration: "none" }}>
        <button className="jx-btn jx-btn--primary jx-btn--lg">
          Start journaling free <ArrowRight size={16} />
        </button>
      </a>
    </div>
  );
}

export function HelpfulRow({ helpful }) {
  if (!helpful) return null;
  const total = helpful.up + helpful.down;
  const pct = total ? Math.round((helpful.up / total) * 100) : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", font: "var(--text-small)", color: "var(--color-text-muted)" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <ThumbsUp size={14} style={{ color: "var(--color-success)" }} />
        {pct != null ? `${pct}% found this helpful` : "Be the first to rate"}
      </span>
      {helpful.saves != null && <span>· {helpful.saves} saves</span>}
    </div>
  );
}
