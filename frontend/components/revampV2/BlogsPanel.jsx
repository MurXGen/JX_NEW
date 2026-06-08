"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Lightbulb,
  Search,
  Share2,
  Star,
  TrendingUp,
} from "lucide-react";
import Button from "./Button";
import Badge from "./Badge";

/* Figma "Learn & News · Desktop" (22818:53741) + "Blog Details ·
   Desktop" (22848:53945). Posts are dummy data for now — swap for a
   CMS/API later. */

const CATEGORIES = ["All", "Strategies", "Risk management", "Psychology", "Market news", "Tutorials"];

const POSTS = [
  {
    id: "pre-trade-checklist",
    featured: true,
    category: "Strategy",
    cover: "linear-gradient(135deg, #2b2412, #181a20)",
    minutes: 8,
    date: "Mar 18, 2026",
    title: "The 3-step pre-trade checklist that cut my losses in half",
    excerpt:
      "A repeatable routine for confirming setups, sizing risk, and avoiding the impulse trades that quietly drain accounts.",
    author: { name: "Alex Rivera", role: "Senior analyst" },
    toc: ["Why a checklist beats willpower", "The three checks", "Make it automatic"],
    body: [
      { h: null, p: "Most blown accounts don't die from a single catastrophic trade. They bleed out slowly — from dozens of small, avoidable decisions made in the heat of the moment. The fix isn't more screen time. It's a routine." },
      { h: "Why a checklist beats willpower", p: "Discipline feels like a personality trait, but under pressure it behaves like a depleting resource. The more decisions you ask your brain to make mid-trade, the worse those decisions get. A pre-trade checklist moves the thinking to a calm moment — before money is on the line — so execution becomes mechanical." },
      { h: null, p: "Surgeons and pilots don't rely on memory for critical steps, and the best traders treat entries the same way. The goal is to make the right action the easy action.", quote: "If you can't say why you're entering in one sentence, you don't have a setup — you have an urge." },
      { h: "The three checks", p: "One: is the setup on your playbook? Two: is risk defined with a hard stop and a size that keeps the loss under your per-trade limit? Three: is the R:R at least your minimum? If any answer is no, there is no trade." },
      { h: "Make it automatic", p: "Put the checklist where you log trades. Tick it before entry, every time, for thirty days. After that it stops feeling like a chore and starts feeling like brushing your teeth — and your equity curve will show it." },
    ],
  },
  {
    id: "fixed-risk-sizing",
    category: "Strategy",
    cover: "linear-gradient(135deg, #f0b90b, #c99400)",
    minutes: 5,
    date: "Mar 14, 2026",
    title: "How to size positions with a fixed-risk model",
    excerpt: "Stop guessing size. Derive it from your stop distance and a fixed % of account at risk.",
    author: { name: "Priya N.", role: "Quant researcher" },
    toc: ["The formula", "Worked example", "Common mistakes"],
    body: [
      { h: "The formula", p: "Size = (account × risk %) ÷ stop distance. That's the whole model. Risk 1% of a $10k account with a $2 stop and you trade 50 units — no emotion involved." },
      { h: "Worked example", p: "BTC at $61,240 with a stop at $60,100 is a $1,140 stop distance. At 1% risk on $33,600, your size is roughly 0.3 BTC. The dollar loss if stopped is identical on every trade, which is what makes drawdowns survivable." },
      { h: "Common mistakes", p: "Sizing up after wins, widening stops to 'give it room', and rounding size up instead of down. All three quietly raise your risk per trade above the model." },
    ],
  },
  {
    id: "stop-loss-placement",
    category: "Risk",
    cover: "linear-gradient(135deg, #f6465d, #d6304a)",
    minutes: 6,
    date: "Mar 11, 2026",
    title: "Why your stop-loss placement is costing you money",
    excerpt: "Stops at obvious levels get hunted. Here's how to place them where they actually protect you.",
    author: { name: "Alex Rivera", role: "Senior analyst" },
    toc: ["Obvious stops get run", "Structure-based stops", "When to move a stop"],
    body: [
      { h: "Obvious stops get run", p: "Round numbers and swing lows are liquidity. If your stop sits exactly where everyone else's does, expect the wick that takes you out before the move you predicted happens." },
      { h: "Structure-based stops", p: "Place stops beyond the level that invalidates your idea — not at it. If the setup is a higher low, the stop belongs below the structure plus a volatility buffer (ATR is a decent proxy)." },
      { h: "When to move a stop", p: "Only in one direction: toward profit, and only after structure confirms. Moving a stop away from price is just refusing to take the loss you already planned." },
    ],
  },
  {
    id: "revenge-trading",
    category: "Psychology",
    cover: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    minutes: 4,
    date: "Mar 8, 2026",
    title: "Beating revenge trading after a red day",
    excerpt: "The loss isn't the problem — the next 30 minutes are. A protocol for tilt.",
    author: { name: "Dr. Sara Kim", role: "Performance coach" },
    toc: ["Name the state", "The 30-minute rule", "Re-entry criteria"],
    body: [
      { h: "Name the state", p: "Tilt hides best when it's unnamed. The moment you notice urgency, a need to 'get it back', or shortcuts in your process — say it out loud: this is tilt. Naming it moves the decision from the limbic system back to the prefrontal cortex." },
      { h: "The 30-minute rule", p: "After any stop-out that stings, you're banned from the buy button for 30 minutes. Walk, journal the trade, breathe. The market will still be there; your edge won't be if you trade angry." },
      { h: "Re-entry criteria", p: "You may trade again only when you can write down a setup that would exist even if the losing trade never happened. If every idea references the loss, you're still tilted." },
    ],
  },
];

function PostCard({ post, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(post)}
      className="jx-card jx-card--flat"
      style={{ padding: 0, overflow: "hidden", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column" }}
    >
      <div style={{ height: 120, background: post.cover, position: "relative" }}>
        <span className="jx-badge" style={{ position: "absolute", top: 10, left: 10, background: "var(--color-bg-surface)", color: "var(--color-text-primary)" }}>
          {post.category}
        </span>
        <span className="jx-badge" style={{ position: "absolute", top: 10, right: 10, background: "var(--color-bg-surface)", color: "var(--color-text-primary)" }}>
          <Clock size={11} /> {post.minutes} min
        </span>
      </div>
      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ font: "var(--text-title)" }}>{post.title}</span>
        <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>{post.excerpt}</span>
        <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: 4 }}>
          {post.author.name} · {post.date}
        </span>
      </div>
    </button>
  );
}

function BlogDetail({ post, onBack }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", font: "var(--text-small)", color: "var(--color-text-muted)" }}>
        <button className="jx-btn jx-btn--ghost jx-btn--sm" onClick={onBack}>
          <ArrowLeft size={15} /> Back to Learn &amp; News
        </button>
        <ChevronRight size={13} />
        <span>{post.category}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <Badge variant="brand">{post.category.toUpperCase()}</Badge>
        <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
          {post.minutes} min read · {post.date}
        </span>
      </div>

      <h1 style={{ font: "var(--text-h1)", margin: 0 }}>{post.title}</h1>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span
          style={{
            width: 36, height: 36, borderRadius: "50%", background: "var(--color-primary)",
            color: "var(--color-primary-foreground)", display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: 700, fontSize: 13,
          }}
        >
          {post.author.name[0]}
        </span>
        <span style={{ display: "flex", flexDirection: "column" }}>
          <strong style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{post.author.name}</strong>
          <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
            {post.author.role}, JournalX
          </span>
        </span>
      </div>

      <div style={{ height: 220, borderRadius: "var(--radius-lg)", background: post.cover, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <TrendingUp size={42} style={{ color: "var(--color-primary)" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 240px", gap: "var(--space-5)", alignItems: "start" }} className="jx-blog-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", font: "var(--text-body-lg)", color: "var(--color-text-secondary)" }}>
          {post.body.map((b, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {b.h && <h2 style={{ font: "var(--text-h2)", color: "var(--color-text-primary)", margin: "var(--space-2) 0 0" }}>{b.h}</h2>}
              <p style={{ margin: 0 }}>{b.p}</p>
              {b.quote && (
                <blockquote
                  style={{
                    margin: 0, padding: "var(--space-3) var(--space-4)",
                    borderLeft: "3px solid var(--color-primary)", background: "var(--color-primary-subtle)",
                    borderRadius: "0 var(--radius-md) var(--radius-md) 0",
                    font: "var(--text-h3)", color: "var(--color-text-primary)",
                  }}
                >
                  {b.quote}
                </blockquote>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", position: "sticky", top: 0 }}>
          <div className="jx-card jx-card--flat" style={{ padding: "var(--space-4)" }}>
            <span className="jx-sidebar__section" style={{ padding: 0 }}>On this page</span>
            {post.toc.map((t, i) => (
              <div key={t} style={{ font: i === 0 ? "var(--text-body-md)" : "var(--text-small)", fontWeight: i === 0 ? 600 : 400, color: i === 0 ? "var(--color-text-primary)" : "var(--color-text-muted)", padding: "4px 0" }}>
                {t}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Button variant="outline" size="sm" icon={Star} style={{ flex: 1 }}>Save</Button>
            <Button variant="outline" size="sm" icon={Share2} style={{ flex: 1 }}>Share</Button>
          </div>
          <div className="jx-banner jx-banner--warn" style={{ alignItems: "flex-start" }}>
            <Lightbulb size={15} style={{ color: "var(--yellow-500)", flexShrink: 0, marginTop: 2 }} />
            <span style={{ font: "var(--text-caption)" }}>
              <strong>Log your next trade with this checklist</strong>
              <br />
              Open the trade logger and tick all three checks.
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .jx-blog-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function BlogsPanel() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [openPost, setOpenPost] = useState(null);

  const featured = POSTS.find((p) => p.featured);
  const list = useMemo(() => {
    const catMap = { Strategies: "Strategy", "Risk management": "Risk", Psychology: "Psychology", "Market news": "News", Tutorials: "Tutorial" };
    return POSTS.filter((p) => !p.featured)
      .filter((p) => category === "All" || p.category === catMap[category])
      .filter((p) => !query || p.title.toLowerCase().includes(query.toLowerCase()));
  }, [category, query]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={openPost ? openPost.id : "list"}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.16 }}
      >
        {openPost ? (
          <BlogDetail post={openPost} onBack={() => setOpenPost(null)} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div>
              <div style={{ font: "var(--text-h2)" }}>Sharpen your edge</div>
              <div style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>
                Guides, market news, and battle-tested tactics — learn something new every session.
              </div>
            </div>

            <div className="jx-input">
              <span className="jx-input__icon"><Search size={16} /></span>
              <input
                placeholder="Search articles, strategies, market news…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`jx-chip ${category === c ? "jx-chip--selected" : ""}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Featured */}
            {featured && category === "All" && !query && (
              <div className="jx-card jx-card--flat" style={{ padding: 0, overflow: "hidden", display: "grid", gridTemplateColumns: "minmax(200px, 1fr) 1.4fr" }}>
                <div style={{ background: featured.cover, minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TrendingUp size={40} style={{ color: "var(--color-primary)" }} />
                </div>
                <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <Badge variant="brand">FEATURED · {featured.category.toUpperCase()}</Badge>
                    <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                      {featured.minutes} min read
                    </span>
                  </div>
                  <span style={{ font: "var(--text-h2)" }}>{featured.title}</span>
                  <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>{featured.excerpt}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", font: "var(--text-small)", color: "var(--color-text-muted)" }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--color-primary)", color: "var(--color-primary-foreground)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>
                      {featured.author.name[0]}
                    </span>
                    {featured.author.name} · {featured.author.role}
                  </div>
                  <Button variant="primary" onClick={() => setOpenPost(featured)} style={{ alignSelf: "flex-start" }}>
                    Read article
                  </Button>
                </div>
              </div>
            )}

            <span className="jx-card__title">Latest articles</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--space-4)" }}>
              {list.map((p) => (
                <PostCard key={p.id} post={p} onOpen={setOpenPost} />
              ))}
              {list.length === 0 && (
                <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>
                  No articles match — try another category.
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
