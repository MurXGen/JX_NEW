"use client";

/* Shared chrome + body renderer for public blog pages and the
   dashboard Learn & News panel. */

import { useState } from "react";
import { ArrowRight, BarChart2, Check, CheckCircle2, Circle, HelpCircle, Lightbulb, RotateCcw, Sparkles, ThumbsUp, TrendingUp, X } from "lucide-react";

const SITE_URL = "https://journalx.app";

/* ===== Interactive activity blocks =====
   A small game/quiz/poll/checklist a reader can play near the top of an
   article. Driven entirely by the JSON `body` block, e.g.
   { type:"activity", kind:"quiz", title, prompt, options, correct, explain }
   { type:"activity", kind:"poll", title, prompt, options:[{label,response}] }
   { type:"activity", kind:"checklist", title, prompt, items, bands:[{min,text}] } */
function ActivityShell({ icon: Icon, title, children }) {
  return (
    <div className="jx-card" style={{ border: "1px solid var(--color-primary)", background: "var(--color-primary-subtle)", padding: "var(--space-5)", margin: "var(--space-2) 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--space-3)" }}>
        <span style={{ display: "inline-flex", width: 30, height: 30, borderRadius: 8, background: "var(--color-primary)", color: "var(--color-primary-foreground)", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={16} />
        </span>
        <span style={{ font: "var(--text-body-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>{title}</span>
        <span style={{ marginLeft: "auto", font: "var(--text-caption)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--yellow-600)", background: "var(--color-bg-surface)", border: "1px solid var(--color-border)", borderRadius: 999, padding: "3px 10px" }}>
          Interactive
        </span>
      </div>
      {children}
    </div>
  );
}

function QuizActivity({ block }) {
  const [sel, setSel] = useState(null);
  const done = sel !== null;
  const right = done && sel === block.correct;
  return (
    <ActivityShell icon={HelpCircle} title={block.title || "Quick challenge"}>
      <p style={{ margin: "0 0 var(--space-3)", font: "var(--text-body)", color: "var(--color-text-primary)", fontWeight: 600 }}>{block.prompt}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {block.options.map((opt, i) => {
          const chosen = sel === i;
          const isCorrect = i === block.correct;
          let border = "1px solid var(--color-border)";
          let bg = "var(--color-bg-surface)";
          if (done && isCorrect) { border = "1px solid var(--color-success)"; bg = "var(--color-success-subtle)"; }
          else if (chosen && !isCorrect) { border = "1px solid var(--color-danger)"; bg = "var(--color-danger-subtle)"; }
          return (
            <button key={i} type="button" disabled={done} onClick={() => setSel(i)}
              style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", border, background: bg, color: "var(--color-text-primary)", borderRadius: "var(--radius-md)", padding: "12px 14px", font: "var(--text-body)", cursor: done ? "default" : "pointer", width: "100%" }}>
              <span style={{ flex: 1 }}>{opt}</span>
              {done && isCorrect && <Check size={16} style={{ color: "var(--color-success-strong)" }} />}
              {chosen && !isCorrect && <X size={16} style={{ color: "var(--color-danger-strong)" }} />}
            </button>
          );
        })}
      </div>
      {done && (
        <p style={{ margin: "var(--space-3) 0 0", font: "var(--text-body)", color: "var(--color-text-secondary)" }}>
          <strong style={{ color: right ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>{right ? "Correct — " : "Not quite — "}</strong>
          {block.explain}
        </p>
      )}
    </ActivityShell>
  );
}

function PollActivity({ block }) {
  const [sel, setSel] = useState(null);
  return (
    <ActivityShell icon={BarChart2} title={block.title || "Quick poll"}>
      <p style={{ margin: "0 0 var(--space-3)", font: "var(--text-body)", color: "var(--color-text-primary)", fontWeight: 600 }}>{block.prompt}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {block.options.map((opt, i) => {
          const chosen = sel === i;
          return (
            <button key={i} type="button" onClick={() => setSel(i)}
              style={{ textAlign: "left", border: chosen ? "1px solid var(--color-primary)" : "1px solid var(--color-border)", background: chosen ? "var(--color-primary-subtle)" : "var(--color-bg-surface)", color: "var(--color-text-primary)", borderRadius: "var(--radius-md)", padding: "12px 14px", font: "var(--text-body)", cursor: "pointer", width: "100%" }}>
              {opt.label}
            </button>
          );
        })}
      </div>
      {sel !== null && (
        <p style={{ margin: "var(--space-3) 0 0", font: "var(--text-body)", color: "var(--color-text-secondary)" }}>
          {block.options[sel].response}
        </p>
      )}
    </ActivityShell>
  );
}

function ChecklistActivity({ block }) {
  const [checked, setChecked] = useState(() => new Set());
  const toggle = (i) => setChecked((prev) => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });
  const n = checked.size;
  const bands = [...(block.bands || [])].sort((a, b) => a.min - b.min);
  const band = bands.filter((b) => n >= b.min).pop();
  return (
    <ActivityShell icon={CheckCircle2} title={block.title || "Score yourself"}>
      <p style={{ margin: "0 0 var(--space-3)", font: "var(--text-body)", color: "var(--color-text-primary)", fontWeight: 600 }}>{block.prompt}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {block.items.map((it, i) => {
          const on = checked.has(i);
          return (
            <button key={i} type="button" onClick={() => toggle(i)}
              style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", border: on ? "1px solid var(--color-success)" : "1px solid var(--color-border)", background: on ? "var(--color-success-subtle)" : "var(--color-bg-surface)", color: "var(--color-text-primary)", borderRadius: "var(--radius-md)", padding: "12px 14px", font: "var(--text-body)", cursor: "pointer", width: "100%" }}>
              {on ? <CheckCircle2 size={16} style={{ color: "var(--color-success-strong)", flexShrink: 0 }} /> : <Circle size={16} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />}
              <span style={{ flex: 1 }}>{it}</span>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: "var(--space-3)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ font: "var(--text-body-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>{n} / {block.items.length}</span>
        {band && <span style={{ font: "var(--text-body)", color: "var(--color-text-secondary)" }}>{band.text}</span>}
      </div>
    </ActivityShell>
  );
}

function ActivityBlock({ block }) {
  if (block.kind === "poll") return <PollActivity block={block} />;
  if (block.kind === "checklist") return <ChecklistActivity block={block} />;
  return <QuizActivity block={block} />;
}

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
        if (block.type === "activity")
          return <ActivityBlock key={i} block={block} />;
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
        if (block.type === "table")
          return (
            <div key={i} style={{ overflowX: "auto", margin: "var(--space-2) 0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", font: "var(--text-body)", color: "var(--color-text-secondary)" }}>
                {block.headers?.length > 0 && (
                  <thead>
                    <tr>
                      {block.headers.map((h, j) => (
                        <th key={j} style={{ textAlign: "left", padding: "10px 12px", borderBottom: "2px solid var(--color-border, rgba(120,120,120,0.3))", color: "var(--color-text-primary)", font: "var(--text-body-md)", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {(block.rows || []).map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c} style={{ padding: "10px 12px", borderBottom: "1px solid var(--color-border, rgba(120,120,120,0.18))", verticalAlign: "top", fontWeight: c === 0 ? 600 : 400, color: c === 0 ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
