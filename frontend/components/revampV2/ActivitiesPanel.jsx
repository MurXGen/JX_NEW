"use client";

/* Learn & Focus, two quick focus games (reflex + mental math) with local
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

/* ================= Reflex game (30s round) ================= */
function ReflexGame() {
  const DURATION = 30;
  const [phase, setPhase] = useState("idle"); // idle | playing | done
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [hits, setHits] = useState(0);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [best, setBest] = useState(0);
  const appearedRef = useRef(0);
  // reaction stats kept in refs so a tap always records (state timing bugs
  // were dropping the average), derived below on every render.
  const sumRef = useRef(0);
  const countRef = useRef(0);
  const fastRef = useRef(Infinity);

  useEffect(() => setBest(readBest("jx-lf-reflex-best")), []);

  // countdown
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      setPhase("done");
      if (hits > best) { writeBest("jx-lf-reflex-best", hits); setBest(hits); }
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, hits, best]);

  const place = () => {
    setPos({ x: 8 + Math.random() * 84, y: 14 + Math.random() * 72 });
    appearedRef.current = performance.now();
  };
  const start = () => {
    sumRef.current = 0; countRef.current = 0; fastRef.current = Infinity;
    setHits(0); setTimeLeft(DURATION); setPhase("playing"); place();
  };
  const hit = (e) => {
    e.stopPropagation();
    if (phase !== "playing") return;
    const dt = performance.now() - appearedRef.current;
    if (Number.isFinite(dt) && dt > 0) {
      sumRef.current += dt;
      countRef.current += 1;
      if (dt < fastRef.current) fastRef.current = dt;
    }
    setHits(countRef.current);
    place();
    try { navigator.vibrate?.(8); } catch {}
  };

  const avg = countRef.current ? sumRef.current / countRef.current : 0;
  const fastest = Number.isFinite(fastRef.current) ? fastRef.current : 0;
  const mm = String(Math.floor(timeLeft / 60)).padStart(1, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  // interpret the average reaction time into a plain-language rating
  const rating =
    avg <= 0 ? { label: ", ", color: "var(--color-text-muted)" }
    : avg < 300 ? { label: "⚡ Lightning reflexes", color: "var(--color-success-strong)" }
    : avg < 450 ? { label: "Sharp", color: "var(--color-success)" }
    : avg < 600 ? { label: "Steady", color: "var(--yellow-500)" }
    : { label: "Warming up", color: "var(--color-danger)" };

  return (
    <div className="jx-card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--color-primary-subtle)", color: "var(--yellow-500)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Crosshair size={20} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "var(--text-title)", fontWeight: 600 }}>Reflex trainer</div>
          <div style={{ font: "var(--text-caption)", ...muted }}>Tap each target the instant it appears · 30s</div>
        </div>
        <Badge variant="brand"><Trophy size={11} /> Best {best}</Badge>
      </div>

      {/* live stats, only while playing */}
      {phase === "playing" && (
        <div style={{ display: "flex", gap: "var(--space-4)" }}>
          <Stat label="Time left" value={`${mm}:${ss}`} />
          <Stat label="Hits" value={hits} />
          <Stat label="Avg reaction" value={avg ? `${Math.round(avg)}ms` : ", "} />
        </div>
      )}

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

        {phase === "idle" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center", padding: 20 }}>
            <div style={{ font: "var(--text-body-md)", fontWeight: 700 }}>How fast can you react?</div>
            <p style={{ font: "var(--text-caption)", ...muted, maxWidth: 300, margin: 0, lineHeight: 1.5 }}>
              Tap each dot the instant it appears. Score as many as you can in 30s.
            </p>
            <Button variant="primary" icon={Play} onClick={start}>Start</Button>
          </div>
        )}

        {phase === "done" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center", padding: 20 }}>
            <div style={{ font: "var(--text-h3)", fontWeight: 700 }}>
              {hits} hits{hits >= best && hits > 0 ? " · 🏆 New best!" : ""}
            </div>
            <div style={{ display: "flex", gap: "var(--space-6)", justifyContent: "center" }}>
              {[
                { label: "Avg reaction", value: avg ? `${Math.round(avg)}ms` : ", " },
                { label: "Fastest", value: fastest ? `${Math.round(fastest)}ms` : ", " },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ font: "var(--text-label)", letterSpacing: ".6px", textTransform: "uppercase", whiteSpace: "nowrap", ...muted }}>{s.label}</div>
                  <div style={{ font: "var(--text-h3)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                </div>
              ))}
            </div>
            <span style={{ font: "var(--text-body-md)", fontWeight: 700, color: rating.color }}>{rating.label}</span>
            <span style={{ font: "var(--text-caption)", ...muted, maxWidth: 320, lineHeight: 1.5 }}>
              Faster, steadier reactions mean cleaner fills, less hesitation on entries and a quicker hand on your stop.
            </span>
            <Button variant="primary" icon={RotateCcw} onClick={start}>Play again</Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= Mental math, endless streak ================= */
const OPS = [
  { id: "add", sym: "+", label: "Addition" },
  { id: "subtract", sym: "−", label: "Subtraction" },
  { id: "multiply", sym: "×", label: "Multiplication" },
  { id: "divide", sym: "÷", label: "Division" },
  { id: "mixed", sym: "∑", label: "Mixed" },
];
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/* difficulty scales with `level` (rises every few correct answers) so the run
   gets harder the longer you survive, the reason a high score feels earned. */
function genQuestion(op, level = 0) {
  const realOp = op === "mixed" ? ["add", "subtract", "multiply", "divide"][rnd(0, 3)] : op;
  const L = Math.min(level, 8);
  if (realOp === "add") { const hi = 20 + L * 15; const a = rnd(2, hi), b = rnd(2, hi); return { a, b, sym: "+", answer: a + b }; }
  if (realOp === "subtract") { const hi = 20 + L * 15; const a = rnd(10, hi), b = rnd(2, a); return { a, b, sym: "−", answer: a - b }; }
  if (realOp === "multiply") { const hi = 9 + L * 2; const a = rnd(2, hi), b = rnd(2, hi); return { a, b, sym: "×", answer: a * b }; }
  const hi = 9 + L * 2; const b = rnd(2, hi), q = rnd(2, hi); return { a: b * q, b, sym: "÷", answer: q };
}

function CalcGame() {
  const [op, setOp] = useState("mixed"); // selected operation (persists between runs)
  const [phase, setPhase] = useState("idle"); // idle | playing | done
  const [score, setScore] = useState(0);
  const [q, setQ] = useState(null);
  const [val, setVal] = useState("");
  const [wrong, setWrong] = useState(false);
  const [best, setBest] = useState(0);
  const [runNewBest, setRunNewBest] = useState(false);
  const [missedAnswer, setMissedAnswer] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { setBest(readBest(`jx-lf-calc-best-${op}`)); }, [op]);

  const start = () => {
    setScore(0); setVal(""); setWrong(false);
    setRunNewBest(false); setMissedAnswer(null);
    setQ(genQuestion(op, 0)); setPhase("playing");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const submit = (e) => {
    e?.preventDefault();
    if (phase !== "playing" || !q || val === "") return;
    if (Number(val) === q.answer) {
      const next = score + 1;
      setScore(next);
      setVal("");
      setQ(genQuestion(op, Math.floor(next / 5)));
      try { navigator.vibrate?.(8); } catch {}
    } else {
      // Chrome-dino rule: one wrong answer ends the run.
      const isBest = score > best && score > 0;
      if (isBest) { writeBest(`jx-lf-calc-best-${op}`, score); setBest(score); }
      setRunNewBest(isBest);
      setMissedAnswer(q.answer);
      setWrong(true);
      try { navigator.vibrate?.([10, 30, 10]); } catch {}
      setTimeout(() => { setWrong(false); setPhase("done"); }, 260);
    }
  };

  const aheadOfBest = phase === "playing" && score > best;
  const stage = {
    position: "relative", minHeight: 300, borderRadius: "var(--radius-md)",
    background: "var(--color-bg-muted)", border: "1px solid var(--color-border)",
    overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
  };
  const center = { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", maxWidth: 360, width: "100%" };

  return (
    <div className="jx-card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--color-primary-subtle)", color: "var(--yellow-500)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Brain size={20} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "var(--text-title)", fontWeight: 600 }}>Mental math streak</div>
          <div style={{ font: "var(--text-caption)", ...muted }}>Endless, one wrong answer ends the run · beat your best</div>
        </div>
        <Badge variant="brand"><Trophy size={11} /> Best {best}</Badge>
      </div>

      {/* live stats, only while playing (mirrors the reflex game) */}
      {phase === "playing" && (
        <div style={{ display: "flex", gap: "var(--space-4)" }}>
          <Stat label="Score" value={score} />
          <Stat label="Best" value={best} />
          <Stat label="Level" value={Math.floor(score / 5) + 1} />
        </div>
      )}

      <div style={stage}>
        {phase === "idle" && (
          <div style={center}>
            <div style={{ font: "var(--text-body-md)", fontWeight: 700 }}>Beat your high score</div>
            <p style={{ font: "var(--text-caption)", ...muted, margin: 0, lineHeight: 1.5 }}>
              Pick an operation. One wrong answer ends the run.
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              {OPS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOp(o.id)}
                  className={`jx-chip ${op === o.id ? "jx-chip--selected" : ""}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <Button variant="primary" icon={Play} onClick={start}>Start</Button>
          </div>
        )}

        {phase === "playing" && q && (
          <div style={center}>
            {aheadOfBest && (
              <span style={{ font: "var(--text-caption)", fontWeight: 700, color: "var(--color-success-strong)" }}>
                🏆 New best, keep it alive!
              </span>
            )}
            <div style={{ font: "700 clamp(28px,7vw,44px) Poppins", letterSpacing: "-1px", color: wrong ? "var(--color-danger)" : "var(--color-text-primary)" }}>
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
            <span style={{ font: "var(--text-caption)", ...muted }}>One wrong answer ends the run.</span>
          </div>
        )}

        {phase === "done" && (
          <div style={center}>
            <div style={{ font: "var(--text-h3)", fontWeight: 700 }}>
              {score} in a row{runNewBest ? " · 🏆 New best!" : ""}
            </div>
            {missedAnswer != null && (
              <span style={{ font: "var(--text-caption)", color: "var(--color-danger)" }}>
                Missed it, the answer was {missedAnswer}
              </span>
            )}
            <span style={{ font: "var(--text-caption)", ...muted }}>{OPS.find((o) => o.id === op)?.label} · best {best}</span>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button variant="primary" icon={RotateCcw} onClick={start}>Play again</Button>
              <Button variant="secondary" onClick={() => setPhase("idle")}>Change mode</Button>
            </div>
          </div>
        )}
      </div>
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
        <a href="/blogs" target="_blank" rel="noopener" style={{ marginLeft: "auto", textDecoration: "none" }}>
          <Button variant="ghost" size="sm" icon={ArrowRight}>All articles</Button>
        </a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--space-3)" }}>
        {posts.slice(0, visible).map((p) => {
          const accent = ACCENT[p.category] || "var(--yellow-500)";
          return (
            <a key={p.slug} href={`/blogs/${p.slug}`} target="_blank" rel="noopener"
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
