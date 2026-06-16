"use client";

/* Learn & Focus — two quick focus games (reflex + mental math) with local
   high scores, plus the latest articles (reveal-all on scroll). No XP. */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  Crosshair,
  Timer,
  Trophy,
  RotateCcw,
  ArrowRight,
  BookOpen,
  Play,
} from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";
import { getAllPosts, fmtDate } from "@/utils/blogs";

const muted = { color: "var(--color-text-muted)" };

/* ---------- local high-score helpers ---------- */
const readBest = (k) => {
  try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; }
};
const writeBest = (k, v) => {
  try { localStorage.setItem(k, String(v)); } catch {}
};

/* ================= Reflex game (2 minutes) ================= */
function ReflexGame() {
  const DURATION = 120;
  const [phase, setPhase] = useState("idle"); // idle | playing | done
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [hits, setHits] = useState(0);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [reactions, setReactions] = useState([]);
  const [best, setBest] = useState(0);
  const appearedRef = useRef(0);

  useEffect(() => setBest(readBest("jx-lf-reflex-best")), []);

  // countdown
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      setPhase("done");
      setHits((h) => {
        setBest((b) => {
          if (h > b) { writeBest("jx-lf-reflex-best", h); return h; }
          return b;
        });
        return h;
      });
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  const place = () => {
    setPos({ x: 8 + Math.random() * 84, y: 14 + Math.random() * 72 });
    appearedRef.current = performance.now();
  };
  const start = () => {
    setHits(0); setReactions([]); setTimeLeft(DURATION); setPhase("playing"); place();
  };
  const hit = (e) => {
    e.stopPropagation();
    if (phase !== "playing") return;
    setReactions((r) => [...r, performance.now() - appearedRef.current]);
    setHits((h) => h + 1);
    place();
    try { navigator.vibrate?.(8); } catch {}
  };

  const avgRt = reactions.length ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length) : 0;
  const mm = String(Math.floor(timeLeft / 60)).padStart(1, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="jx-card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--color-primary-subtle)", color: "var(--yellow-500)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Crosshair size={20} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "var(--text-title)", fontWeight: 600 }}>Reflex trainer</div>
          <div style={{ font: "var(--text-caption)", ...muted }}>Tap the target as fast as you can · 2 min</div>
        </div>
        <Badge variant="brand"><Trophy size={11} /> Best {best}</Badge>
      </div>

      {/* live stats */}
      <div style={{ display: "flex", gap: "var(--space-4)" }}>
        <Stat label="Time" value={`${mm}:${ss}`} />
        <Stat label="Hits" value={hits} />
        <Stat label="Avg reaction" value={avgRt ? `${avgRt}ms` : "—"} />
      </div>

      {/* play area */}
      <div
        style={{
          position: "relative", height: 300, borderRadius: "var(--radius-md)",
          background: "var(--color-bg-muted)", border: "1px solid var(--color-border)",
          overflow: "hidden", cursor: phase === "playing" ? "crosshair" : "default",
        }}
      >
        {phase === "playing" && (
          <button
            onClick={hit}
            aria-label="target"
            style={{
              position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`,
              transform: "translate(-50%, -50%)", width: 46, height: 46, borderRadius: "50%",
              border: "none", cursor: "pointer",
              background: "radial-gradient(circle at 35% 30%, var(--yellow-300), var(--yellow-500))",
              boxShadow: "0 4px 14px rgba(240,185,11,0.5)",
            }}
          />
        )}
        {phase !== "playing" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center", padding: 16 }}>
            {phase === "done" && (
              <div style={{ font: "var(--text-h3)", fontWeight: 700 }}>
                {hits} hits {hits >= best && hits > 0 ? "🏆 New best!" : ""}
              </div>
            )}
            <Button variant="primary" icon={phase === "done" ? RotateCcw : Play} onClick={start}>
              {phase === "done" ? "Play again" : "Start"}
            </Button>
            {phase === "idle" && <span style={{ font: "var(--text-caption)", ...muted }}>Sharpens entry/exit reaction speed.</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= Calculation game (1 minute) ================= */
const OPS = [
  { id: "add", sym: "+", label: "Addition" },
  { id: "subtract", sym: "−", label: "Subtraction" },
  { id: "multiply", sym: "×", label: "Multiplication" },
  { id: "divide", sym: "÷", label: "Division" },
];
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function genQuestion(op) {
  if (op === "add") { const a = rnd(2, 99), b = rnd(2, 99); return { a, b, sym: "+", answer: a + b }; }
  if (op === "subtract") { const a = rnd(10, 99), b = rnd(2, a); return { a, b, sym: "−", answer: a - b }; }
  if (op === "multiply") { const a = rnd(2, 12), b = rnd(2, 12); return { a, b, sym: "×", answer: a * b }; }
  // divide → integer result
  const b = rnd(2, 12), q = rnd(2, 12); return { a: b * q, b, sym: "÷", answer: q };
}

function CalcGame() {
  const TOTAL = 40, DURATION = 60;
  const [op, setOp] = useState(null);
  const [phase, setPhase] = useState("choose"); // choose | playing | done
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [correct, setCorrect] = useState(0);
  const [q, setQ] = useState(null);
  const [val, setVal] = useState("");
  const [wrong, setWrong] = useState(false);
  const [best, setBest] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { if (op) setBest(readBest(`jx-lf-calc-best-${op}`)); }, [op]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      setPhase("done");
      setBest((b) => {
        if (correct > b) { writeBest(`jx-lf-calc-best-${op}`, correct); return correct; }
        return b;
      });
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, correct, op]);

  const finish = (finalCorrect) => {
    setPhase("done");
    setBest((b) => {
      if (finalCorrect > b) { writeBest(`jx-lf-calc-best-${op}`, finalCorrect); return finalCorrect; }
      return b;
    });
  };

  const start = (chosen) => {
    setOp(chosen); setCorrect(0); setTimeLeft(DURATION); setVal(""); setWrong(false);
    setQ(genQuestion(chosen)); setPhase("playing");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const submit = (e) => {
    e?.preventDefault();
    if (phase !== "playing" || !q) return;
    if (Number(val) === q.answer) {
      const next = correct + 1;
      setCorrect(next);
      setVal(""); setWrong(false);
      if (next >= TOTAL) { finish(next); return; }
      setQ(genQuestion(op));
      try { navigator.vibrate?.(8); } catch {}
    } else {
      setWrong(true);
      setVal("");
      try { navigator.vibrate?.([10, 30, 10]); } catch {}
      setTimeout(() => setWrong(false), 350);
    }
  };

  return (
    <div className="jx-card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--color-primary-subtle)", color: "var(--yellow-500)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Brain size={20} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "var(--text-title)", fontWeight: 600 }}>Mental math sprint</div>
          <div style={{ font: "var(--text-caption)", ...muted }}>40 questions · 1 min · pick an operation</div>
        </div>
        {op && <Badge variant="brand"><Trophy size={11} /> Best {best}</Badge>}
      </div>

      {phase === "choose" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-2)" }}>
            {OPS.map((o) => (
              <button key={o.id} type="button" className="jx-btn jx-btn--secondary" onClick={() => start(o.id)} style={{ justifyContent: "center", padding: "14px 10px", flexDirection: "column", gap: 4 }}>
                <span style={{ font: "var(--text-h3)", fontWeight: 700 }}>{o.sym}</span>
                <span style={{ font: "var(--text-caption)" }}>{o.label}</span>
              </button>
            ))}
          </div>
          <span style={{ font: "var(--text-caption)", ...muted }}>Quick mental math keeps you sharp for fast position-size and R math.</span>
        </>
      )}

      {phase === "playing" && q && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "var(--space-4)", alignSelf: "stretch" }}>
            <Stat label="Time" value={`0:${String(timeLeft).padStart(2, "0")}`} />
            <Stat label="Solved" value={`${correct} / ${TOTAL}`} />
          </div>
          <div style={{ font: "700 clamp(28px,7vw,44px) Poppins", letterSpacing: "-1px", color: "var(--color-text-primary)" }}>
            {q.a} {q.sym} {q.b}
          </div>
          <form onSubmit={submit} style={{ display: "flex", gap: "var(--space-2)", width: "min(320px, 100%)" }}>
            <div className="jx-input" style={{ flex: 1, borderColor: wrong ? "var(--color-danger)" : undefined }}>
              <input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                placeholder="Answer"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                autoFocus
              />
            </div>
            <Button variant="primary" type="submit">Go</Button>
          </form>
        </div>
      )}

      {phase === "done" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "var(--space-3) 0" }}>
          <div style={{ font: "var(--text-h2)", fontWeight: 700 }}>
            {correct} solved {correct >= best && correct > 0 ? "🏆" : ""}
          </div>
          <div style={{ font: "var(--text-caption)", ...muted }}>{OPS.find((o) => o.id === op)?.label} · best {best}</div>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Button variant="primary" icon={RotateCcw} onClick={() => start(op)}>Play again</Button>
            <Button variant="secondary" onClick={() => setPhase("choose")}>Change operation</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ font: "var(--text-label)", letterSpacing: ".6px", textTransform: "uppercase", ...muted }}>{label}</div>
      <div style={{ font: "var(--text-h3)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

/* ================= Articles (recent first, reveal all on scroll) ============ */
const ACCENT = { Strategy: "#fcd535", Risk: "#2ebd85", Psychology: "#a78bfa", Journaling: "#38bdf8", Markets: "#fb7185" };

function Articles() {
  const posts = useMemo(
    () => getAllPosts().slice().sort((a, b) => new Date(b.date) - new Date(a.date)),
    [],
  );
  const [visible, setVisible] = useState(6);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisible((v) => Math.min(posts.length, v + 6)); },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [posts.length]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <BookOpen size={18} style={{ color: "var(--color-text-muted)" }} />
        <span className="jx-card__title">Latest articles</span>
        <a href="/blog" target="_blank" rel="noopener" style={{ marginLeft: "auto", textDecoration: "none" }}>
          <Button variant="ghost" size="sm" icon={ArrowRight}>All articles</Button>
        </a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--space-3)" }}>
        {posts.slice(0, visible).map((p) => {
          const accent = ACCENT[p.category] || "var(--yellow-500)";
          return (
            <a key={p.slug} href={`/blog/${p.slug}`} target="_blank" rel="noopener"
               className="jx-card" style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
              <span style={{ display: "inline-flex", alignSelf: "flex-start", padding: "3px 10px", borderRadius: 999, background: "var(--color-bg-muted)", border: "1px solid var(--color-border)", font: "var(--text-caption)", fontWeight: 600, color: accent }}>
                {p.category} · {p.minutes} min
              </span>
              <span style={{ font: "var(--text-body-md)", fontWeight: 600, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</span>
              <span style={{ font: "var(--text-caption)", ...muted, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.excerpt}</span>
              <span style={{ marginTop: "auto", font: "var(--text-caption)", color: "var(--color-text-disabled)" }}>{fmtDate(p.date)}</span>
            </a>
          );
        })}
      </div>

      {visible < posts.length && (
        <div ref={sentinelRef} style={{ height: 1 }} />
      )}
    </div>
  );
}

/* ================= Panel ================= */
export default function ActivitiesPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", width: "100%" }}>
      <div>
        <div style={{ font: "var(--text-h2)" }}>Learn &amp; Focus</div>
        <div style={{ font: "var(--text-body)", ...muted }}>
          Sharpen reaction speed and mental math between trades, then read up on your edge.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-4)" }}>
        <ReflexGame />
        <CalcGame />
      </div>

      <Articles />
    </div>
  );
}
