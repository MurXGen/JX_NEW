"use client";

/* Trader Gym — daily decision-making activities to sharpen edge.
   Games: Bias Buster, Chart Call, Risk Drill, Discipline Scenarios.
   Progress (streak / XP / scores) is tracked locally. Blogs are demoted
   to a small strip at the bottom. */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  CandlestickChart,
  Check,
  CheckCircle2,
  Calculator,
  ChevronRight,
  Flame,
  Play,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";
import activities from "@/data/activities.json";
import {
  getProgress,
  recordActivity,
  isDoneToday,
  levelFor,
} from "@/utils/activities";
import { getAllPosts, fmtDate } from "@/utils/blogs";

/* ---------------- helpers ---------------- */
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const pickN = (arr, n) => shuffle(arr).slice(0, n);
const GREEN = "var(--color-success)";
const RED = "var(--color-danger)";

/* Procedurally generate chart-call rounds so there are effectively unlimited
   questions (no repeats). Each pattern has a higher-probability answer. */
const rnd = (a, b) => a + Math.random() * (b - a);
function candlesFromCloses(closes) {
  let open = closes[0] * (1 - rnd(0, 0.01));
  return closes.map((c) => {
    const o = open;
    const body = Math.abs(c - o);
    const h = Math.max(o, c) + rnd(0.1, 0.6) * (body + 1);
    const l = Math.min(o, c) - rnd(0.1, 0.6) * (body + 1);
    open = c;
    return {
      o: +o.toFixed(2),
      h: +h.toFixed(2),
      l: +l.toFixed(2),
      c: +c.toFixed(2),
    };
  });
}
function genChartRound() {
  const base = rnd(20, 200);
  const n = 5 + Math.floor(rnd(0, 3)); // 5–7 candles
  const patterns = [
    () => { // uptrend pullback → up
      let p = base, cl = [];
      for (let i = 0; i < n - 1; i++) { p += rnd(1, 4); cl.push(p); }
      cl.push(p - rnd(2, 5)); // pullback candle
      return { closes: cl, answer: "up", context: "Uptrend pulling back into support.", explanation: "Higher highs and higher lows with a shallow pullback — buyers tend to defend support and resume the trend." };
    },
    () => { // downtrend → down
      let p = base, cl = [];
      for (let i = 0; i < n; i++) { p -= rnd(1, 4); cl.push(p); }
      return { closes: cl, answer: "down", context: "Clean downtrend, lower highs and lower lows.", explanation: "Momentum and structure are down; the path of least resistance stays down until structure breaks." };
    },
    () => { // range → flat
      const mid = base, cl = [];
      for (let i = 0; i < n; i++) cl.push(mid + rnd(-1.2, 1.2));
      return { closes: cl, answer: "flat", context: "Tight range / chop with no clear direction.", explanation: "Overlapping small candles mean indecision — the highest-probability play is to wait for a breakout, not guess." };
    },
    () => { // breakout → up
      const cl = [];
      for (let i = 0; i < n - 1; i++) cl.push(base + rnd(-0.8, 0.8));
      cl.push(base + rnd(6, 12)); // breakout candle
      return { closes: cl, answer: "up", context: "Coiling then an expansion candle breaking the ceiling.", explanation: "A wide-range break above a clear ceiling on momentum tends to see continuation as breakout buyers pile in." };
    },
    () => { // climax top → down
      let p = base, cl = [];
      for (let i = 0; i < n - 1; i++) { p += rnd(3, 7); cl.push(p); }
      cl.push(p - rnd(7, 13)); // bearish engulf
      return { closes: cl, answer: "down", context: "Parabolic run then a large bearish reversal candle.", explanation: "A climax top with a big engulfing candle traps late buyers — reversals from exhaustion are common." };
    },
    () => { // breakdown → down
      const cl = [];
      for (let i = 0; i < n - 1; i++) cl.push(base + rnd(-0.8, 0.8));
      cl.push(base - rnd(6, 12));
      return { closes: cl, answer: "down", context: "Range then a sharp break below support.", explanation: "Losing a well-defined floor on an expanding candle often triggers stop cascades and continuation lower." };
    },
  ];
  const out = patterns[Math.floor(Math.random() * patterns.length)]();
  return { id: `gen-${Math.random().toString(36).slice(2)}`, candles: candlesFromCloses(out.closes), answer: out.answer, context: out.context, explanation: out.explanation };
}

function MiniCandles({ candles, height = 150 }) {
  const W = 280;
  const pad = 12;
  const lo = Math.min(...candles.map((c) => c.l));
  const hi = Math.max(...candles.map((c) => c.h));
  const range = hi - lo || 1;
  const y = (v) => pad + (1 - (v - lo) / range) * (height - pad * 2);
  const step = (W - pad * 2) / candles.length;
  const bw = Math.max(6, step * 0.55);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: "100%", height }}>
      {candles.map((c, i) => {
        const cx = pad + step * i + step / 2;
        const up = c.c >= c.o;
        const col = up ? GREEN : RED;
        const bodyTop = y(Math.max(c.o, c.c));
        const bodyBot = y(Math.min(c.o, c.c));
        return (
          <g key={i}>
            <line x1={cx} y1={y(c.h)} x2={cx} y2={y(c.l)} stroke={col} strokeWidth="1.5" />
            <rect x={cx - bw / 2} y={bodyTop} width={bw} height={Math.max(2, bodyBot - bodyTop)} rx="1.5" fill={col} />
          </g>
        );
      })}
    </svg>
  );
}

/* shell around an active game */
function GameShell({ title, icon: Icon, accent, onExit, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onExit} aria-label="Back" style={{ padding: 9 }}>
          <ArrowLeft size={18} />
        </button>
        <span style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: `${accent}1f`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={18} />
        </span>
        <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

const card = {
  background: "var(--color-bg-surface)",
  // <button> elements don't inherit color — set it so card-styled buttons
  // show light text in dark mode.
  color: "var(--color-text-primary)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-6)",
};
const muted = { color: "var(--color-text-muted)" };

/* result screen shared by games */
function ResultScreen({ score, total, xp, onReplay, onExit, note }) {
  const pct = total ? Math.round((score / total) * 100) : score;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
      <span style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--color-primary-subtle)", color: "var(--yellow-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Trophy size={30} />
      </span>
      <span style={{ font: "var(--text-h2)", fontWeight: 700 }}>{pct}{total ? "%" : " pts"}</span>
      <span style={{ font: "var(--text-body)", ...muted, maxWidth: 360 }}>{note || "Nice work — consistency is what builds the edge."}</span>
      <Badge variant="brand"><Zap size={11} /> +{xp} XP</Badge>
      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
        <button className="jx-btn jx-btn--secondary" onClick={onReplay}><RefreshCw size={15} /> Play again</button>
        <button className="jx-btn jx-btn--primary" onClick={onExit}>Done</button>
      </div>
    </motion.div>
  );
}

/* ---------------- Game 1: Bias Buster ---------------- */
function BiasQuiz({ onExit, onComplete }) {
  const [qs] = useState(() => pickN(activities.biasQuiz, Math.min(5, activities.biasQuiz.length)));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = qs[i];
  const answer = (idx) => {
    if (picked !== null) return;
    setPicked(idx);
    if (idx === q.correctIndex) setScore((s) => s + 1);
  };
  const next = () => {
    if (i + 1 < qs.length) {
      setI(i + 1);
      setPicked(null);
    } else {
      const xp = 10 + score * 6;
      onComplete({ xp, score: Math.round((score / qs.length) * 100) });
      setDone(true);
    }
  };

  if (done)
    return (
      <ResultScreen
        score={score}
        total={qs.length}
        xp={10 + score * 6}
        note={`You spotted ${score}/${qs.length} biases. Naming the bias in the moment is half the battle.`}
        onReplay={() => { setI(0); setPicked(null); setScore(0); setDone(false); }}
        onExit={onExit}
      />
    );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", font: "var(--text-caption)", ...muted }}>
        <span>Question {i + 1} / {qs.length}</span>
        <span>Score {score}</span>
      </div>
      <div style={card}>
        <Badge variant="neutral">{q.bias}</Badge>
        <div style={{ font: "var(--text-title)", fontWeight: 600, margin: "var(--space-3) 0 var(--space-4)" }}>{q.question}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {q.options.map((opt, idx) => {
            const isCorrect = idx === q.correctIndex;
            const chosen = picked === idx;
            let bg = "var(--color-bg-surface)", bd = "var(--color-border)", clr = "var(--color-text-primary)";
            if (picked !== null) {
              if (isCorrect) { bg = "var(--color-success-subtle)"; bd = "var(--color-success)"; clr = "var(--color-success-strong)"; }
              else if (chosen) { bg = "var(--color-danger-subtle)"; bd = "var(--color-danger)"; clr = "var(--color-danger-strong)"; }
            }
            return (
              <button key={idx} type="button" onClick={() => answer(idx)} disabled={picked !== null}
                style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "12px 14px", borderRadius: "var(--radius-md)", background: bg, border: `1.5px solid ${bd}`, color: clr, cursor: picked === null ? "pointer" : "default", font: "var(--text-body)" }}>
                <span style={{ flex: 1 }}>{opt}</span>
                {picked !== null && isCorrect && <Check size={16} />}
                {picked !== null && chosen && !isCorrect && <X size={16} />}
              </button>
            );
          })}
        </div>
        <AnimatePresence>
          {picked !== null && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
              <div style={{ marginTop: "var(--space-4)", padding: "var(--space-3) var(--space-4)", background: "var(--color-bg-muted)", borderRadius: "var(--radius-md)", font: "var(--text-small)", ...muted }}>
                {q.explanation}
              </div>
              <Button variant="primary" onClick={next} style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-3)" }}>
                {i + 1 < qs.length ? "Next question" : "See result"} <ArrowRight size={15} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/* ---------------- Game 2: Chart Call ---------------- */
function ChartCall({ onExit, onComplete }) {
  // generated fresh each session → unlimited, non-repeating questions
  const [rounds] = useState(() => Array.from({ length: 7 }, genChartRound));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const r = rounds[i];

  const choices = [
    { key: "up", label: "Long ▲", color: GREEN },
    { key: "flat", label: "Wait ▬", color: "var(--color-text-muted)" },
    { key: "down", label: "Short ▼", color: RED },
  ];

  const choose = (k) => {
    if (picked) return;
    setPicked(k);
    if (k === r.answer) setScore((s) => s + 1);
  };
  const next = () => {
    if (i + 1 < rounds.length) { setI(i + 1); setPicked(null); }
    else { onComplete({ xp: 10 + score * 6, score: Math.round((score / rounds.length) * 100) }); setDone(true); }
  };

  if (done)
    return (
      <ResultScreen score={score} total={rounds.length} xp={10 + score * 6}
        note={`${score}/${rounds.length} correct calls. Reading context beats predicting every candle.`}
        onReplay={() => { setI(0); setPicked(null); setScore(0); setDone(false); }} onExit={onExit} />
    );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", font: "var(--text-caption)", ...muted }}>
        <span>Chart {i + 1} / {rounds.length}</span>
        <span>Score {score}</span>
      </div>
      <div style={card}>
        <div style={{ font: "var(--text-body-md)", fontWeight: 600, marginBottom: "var(--space-2)" }}>What&apos;s the higher-probability call?</div>
        <div style={{ background: "var(--color-bg-muted)", borderRadius: "var(--radius-md)", padding: "var(--space-2)" }}>
          <MiniCandles candles={r.candles} />
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
          {choices.map((c) => {
            const chosen = picked === c.key;
            const correct = r.answer === c.key;
            let bd = "var(--color-border)", bg = "var(--color-bg-surface)";
            if (picked) {
              if (correct) { bd = "var(--color-success)"; bg = "var(--color-success-subtle)"; }
              else if (chosen) { bd = "var(--color-danger)"; bg = "var(--color-danger-subtle)"; }
            }
            return (
              <button key={c.key} type="button" onClick={() => choose(c.key)} disabled={!!picked}
                style={{ flex: 1, padding: "12px 8px", borderRadius: "var(--radius-md)", border: `1.5px solid ${bd}`, background: bg, color: c.color, fontWeight: 700, cursor: picked ? "default" : "pointer", font: "var(--text-body-md)" }}>
                {c.label}
              </button>
            );
          })}
        </div>
        <AnimatePresence>
          {picked && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
              <div style={{ marginTop: "var(--space-4)", padding: "var(--space-3) var(--space-4)", background: "var(--color-bg-muted)", borderRadius: "var(--radius-md)", font: "var(--text-small)", ...muted }}>
                <strong style={{ color: picked === r.answer ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>
                  {picked === r.answer ? "Correct. " : "Not quite. "}
                </strong>
                {r.context} {r.explanation}
              </div>
              <Button variant="primary" onClick={next} style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-3)" }}>
                {i + 1 < rounds.length ? "Next chart" : "See result"} <ArrowRight size={15} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/* ---------------- Game 3: Risk Drill ---------------- */
function genDrill() {
  const account = [5000, 10000, 20000, 25000, 50000][Math.floor(Math.random() * 5)];
  const riskPct = [0.5, 1, 2][Math.floor(Math.random() * 3)];
  const stopPct = [1, 2, 2.5, 4, 5][Math.floor(Math.random() * 5)];
  const riskAmt = account * (riskPct / 100);
  const size = riskAmt / (stopPct / 100); // $ position size
  return { account, riskPct, stopPct, riskAmt, answer: Math.round(size) };
}

function RiskDrill({ onExit, onComplete }) {
  const TOTAL = 5;
  const [round, setRound] = useState(1);
  const [drill, setDrill] = useState(genDrill);
  const [val, setVal] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const submit = () => {
    if (revealed) return;
    const guess = parseFloat(val);
    const ok = guess && Math.abs(guess - drill.answer) / drill.answer <= 0.03; // ±3%
    if (ok) setScore((s) => s + 1);
    setRevealed(true);
  };
  const next = () => {
    if (round < TOTAL) { setRound(round + 1); setDrill(genDrill()); setVal(""); setRevealed(false); }
    else { onComplete({ xp: 10 + score * 6, score: Math.round((score / TOTAL) * 100) }); setDone(true); }
  };

  if (done)
    return (
      <ResultScreen score={score} total={TOTAL} xp={10 + score * 6}
        note={`${score}/${TOTAL} sized correctly. Position size = (account × risk%) ÷ stop%.`}
        onReplay={() => { setRound(1); setDrill(genDrill()); setVal(""); setRevealed(false); setScore(0); setDone(false); }} onExit={onExit} />
    );

  const guess = parseFloat(val);
  const ok = revealed && guess && Math.abs(guess - drill.answer) / drill.answer <= 0.03;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", font: "var(--text-caption)", ...muted }}>
        <span>Drill {round} / {TOTAL}</span>
        <span>Score {score}</span>
      </div>
      <div style={card}>
        <div style={{ font: "var(--text-body-md)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
          What position size keeps the loss at plan?
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          {[["Account", `$${drill.account.toLocaleString()}`], ["Risk / trade", `${drill.riskPct}%`], ["Stop distance", `${drill.stopPct}%`]].map(([l, v]) => (
            <div key={l} style={{ background: "var(--color-bg-muted)", borderRadius: "var(--radius-md)", padding: "10px 12px", textAlign: "center" }}>
              <div style={{ font: "var(--text-caption)", ...muted }}>{l}</div>
              <div style={{ font: "var(--text-body-md)", fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>
        <div className="jx-input" style={{ marginBottom: "var(--space-3)" }}>
          <span className="jx-input__addon">$</span>
          <input type="number" inputMode="decimal" placeholder="Position size in $" value={val}
            onChange={(e) => setVal(e.target.value)} disabled={revealed}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
        </div>
        {!revealed ? (
          <Button variant="primary" onClick={submit} disabled={!val} style={{ width: "100%", justifyContent: "center" }}>
            Check answer
          </Button>
        ) : (
          <>
            <div style={{ padding: "var(--space-3) var(--space-4)", background: ok ? "var(--color-success-subtle)" : "var(--color-danger-subtle)", color: ok ? "var(--color-success-strong)" : "var(--color-danger-strong)", borderRadius: "var(--radius-md)", font: "var(--text-small)" }}>
              {ok ? "Correct! " : `Not quite — correct size is $${drill.answer.toLocaleString()}. `}
              Risk ${drill.riskAmt.toLocaleString()} ÷ {drill.stopPct}% stop = ${drill.answer.toLocaleString()} position.
            </div>
            <Button variant="primary" onClick={next} style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-3)" }}>
              {round < TOTAL ? "Next drill" : "See result"} <ArrowRight size={15} />
            </Button>
          </>
        )}
      </div>
    </>
  );
}

/* ---------------- Game 4: Discipline Scenarios ---------------- */
function DisciplineScenarios({ onExit, onComplete }) {
  const [rounds] = useState(() => pickN(activities.disciplineScenarios, Math.min(5, activities.disciplineScenarios.length)));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const r = rounds[i];
  const maxPer = 10;

  const choose = (idx) => {
    if (picked !== null) return;
    setPicked(idx);
    setScore((s) => s + r.options[idx].score);
  };
  const next = () => {
    if (i + 1 < rounds.length) { setI(i + 1); setPicked(null); }
    else {
      const max = rounds.length * maxPer;
      onComplete({ xp: 10 + Math.round((score / max) * 30), score: Math.round((score / max) * 100) });
      setDone(true);
    }
  };

  if (done) {
    const max = rounds.length * maxPer;
    return (
      <ResultScreen score={Math.round((score / max) * 100)} total={0} xp={10 + Math.round((score / max) * 30)}
        note={`Discipline score ${Math.round((score / max) * 100)}/100. Process over outcome, every time.`}
        onReplay={() => { setI(0); setPicked(null); setScore(0); setDone(false); }} onExit={onExit} />
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", font: "var(--text-caption)", ...muted }}>
        <span>Scenario {i + 1} / {rounds.length}</span>
        <span>Discipline {score}</span>
      </div>
      <div style={card}>
        <div style={{ font: "var(--text-body)", marginBottom: "var(--space-4)", lineHeight: 1.6 }}>{r.scenario}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {r.options.map((opt, idx) => {
            const chosen = picked === idx;
            const good = opt.score >= 8;
            let bd = "var(--color-border)", bg = "var(--color-bg-surface)";
            if (picked !== null && chosen) {
              bd = good ? "var(--color-success)" : opt.score === 0 ? "var(--color-danger)" : "var(--color-border-strong)";
              bg = good ? "var(--color-success-subtle)" : opt.score === 0 ? "var(--color-danger-subtle)" : "var(--color-bg-muted)";
            }
            return (
              <button key={idx} type="button" onClick={() => choose(idx)} disabled={picked !== null}
                style={{ textAlign: "left", padding: "12px 14px", borderRadius: "var(--radius-md)", border: `1.5px solid ${bd}`, background: bg, color: "var(--color-text-primary)", cursor: picked === null ? "pointer" : "default", font: "var(--text-body)" }}>
                {opt.text}
                {picked !== null && chosen && <span style={{ float: "right", fontWeight: 700, ...muted }}>+{opt.score}</span>}
              </button>
            );
          })}
        </div>
        <AnimatePresence>
          {picked !== null && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
              <div style={{ marginTop: "var(--space-4)", padding: "var(--space-3) var(--space-4)", background: "var(--color-bg-muted)", borderRadius: "var(--radius-md)", font: "var(--text-small)", ...muted }}>
                {r.options[picked].feedback}
              </div>
              <Button variant="primary" onClick={next} style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-3)" }}>
                {i + 1 < rounds.length ? "Next scenario" : "See result"} <ArrowRight size={15} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/* ---------------- Game 5: Scalp Trainer (no questions) ---------------- */
function MiniLine({ series, color }) {
  const W = 280, H = 120, pad = 8;
  const lo = Math.min(...series), hi = Math.max(...series);
  const range = hi - lo || 1;
  const step = (W - pad * 2) / Math.max(1, series.length - 1);
  const pts = series.map((v, i) => `${pad + i * step},${pad + (1 - (v - lo) / range) * (H - pad * 2)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ScalpTrainer({ onExit, onComplete }) {
  const TICKS = 44;
  const [price, setPrice] = useState(100);
  const [series, setSeries] = useState([100]);
  const [pos, setPos] = useState(null); // {side, entry}
  const [realized, setRealized] = useState(0);
  const [ticksLeft, setTicksLeft] = useState(TICKS);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const priceRef = useRef(100);
  const posRef = useRef(null);
  const realizedRef = useRef(0);
  const tickRef = useRef(TICKS);

  const closeAt = (px) => {
    if (!posRef.current) return;
    const { side, entry } = posRef.current;
    const pnl = side === "long" ? px - entry : entry - px;
    realizedRef.current += pnl;
    setRealized(realizedRef.current);
    posRef.current = null;
    setPos(null);
  };

  const finish = () => {
    closeAt(priceRef.current);
    setRunning(false);
    setDone(true);
    const score = Math.round(realizedRef.current * 10) / 10;
    onComplete({ xp: 8 + Math.max(0, Math.round(score)), score });
  };

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setPrice((prev) => {
        const drift = (Math.random() - 0.48) * rnd(0.6, 2.6);
        const np = Math.max(1, +(prev + drift).toFixed(2));
        priceRef.current = np;
        setSeries((s) => [...s.slice(-43), np]);
        return np;
      });
      tickRef.current -= 1;
      setTicksLeft(tickRef.current);
      if (tickRef.current <= 0) {
        clearInterval(id);
        finish();
      }
    }, 450);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const start = () => {
    priceRef.current = 100; posRef.current = null; realizedRef.current = 0; tickRef.current = TICKS;
    setPrice(100); setSeries([100]); setPos(null); setRealized(0); setTicksLeft(TICKS); setDone(false); setRunning(true);
  };
  const go = (side) => {
    if (posRef.current) return;
    const p = { side, entry: priceRef.current };
    posRef.current = p; setPos(p);
  };

  if (done) {
    const score = Math.round(realizedRef.current * 10) / 10;
    return (
      <ResultScreen score={score} total={0} xp={8 + Math.max(0, Math.round(score))}
        note={`Net P&L: ${score >= 0 ? "+" : ""}${score} pts. Timing entries and cutting fast is the whole game — protect capital first.`}
        onReplay={start} onExit={onExit} />
    );
  }

  if (!running) {
    return (
      <div style={{ ...card, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
        <span style={{ width: 56, height: 56, borderRadius: "50%", background: "color-mix(in srgb, #22d3ee 18%, transparent)", color: "#22d3ee", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Activity size={26} />
        </span>
        <span style={{ font: "var(--text-title)", fontWeight: 600 }}>Scalp Trainer</span>
        <span style={{ font: "var(--text-body)", ...muted, maxWidth: 380 }}>
          A live price will move for {TICKS} ticks. Go <strong style={{ color: GREEN }}>Long</strong> or <strong style={{ color: RED }}>Short</strong>, then <strong>Close</strong> to bank P&amp;L. No questions — just timing and nerve.
        </span>
        <Button variant="primary" icon={Play} onClick={start} style={{ marginTop: "var(--space-2)" }}>Start round</Button>
      </div>
    );
  }

  const unreal = pos ? (pos.side === "long" ? price - pos.entry : pos.entry - price) : 0;
  const totalPnl = realized + unreal;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", font: "var(--text-caption)", ...muted }}>
        <span>{ticksLeft} ticks left</span>
        <span>Net P&L: <strong style={{ color: totalPnl >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>{totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(1)}</strong></span>
      </div>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
          <span style={{ font: "var(--text-stat)", fontWeight: 700 }}>{price.toFixed(2)}</span>
          {pos ? (
            <Badge variant={pos.side === "long" ? "success" : "danger"}>
              {pos.side === "long" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {pos.side.toUpperCase()} @ {pos.entry.toFixed(2)} · {unreal >= 0 ? "+" : ""}{unreal.toFixed(1)}
            </Badge>
          ) : (
            <Badge variant="neutral">Flat</Badge>
          )}
        </div>
        <div style={{ background: "var(--color-bg-muted)", borderRadius: "var(--radius-md)", padding: "var(--space-2)" }}>
          <MiniLine series={series} color={totalPnl >= 0 ? GREEN : RED} />
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
          <button type="button" onClick={() => go("long")} disabled={!!pos}
            style={{ flex: 1, padding: "12px", borderRadius: "var(--radius-md)", border: `1.5px solid ${GREEN}`, background: pos ? "var(--color-bg-muted)" : "var(--color-success-subtle)", color: GREEN, fontWeight: 700, cursor: pos ? "not-allowed" : "pointer", opacity: pos ? 0.5 : 1 }}>
            ▲ Long
          </button>
          <button type="button" onClick={() => closeAt(price)} disabled={!pos}
            style={{ flex: 1, padding: "12px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--color-border-strong)", background: "var(--color-bg-surface)", color: "var(--color-text-primary)", fontWeight: 700, cursor: pos ? "pointer" : "not-allowed", opacity: pos ? 1 : 0.5 }}>
            Close
          </button>
          <button type="button" onClick={() => go("short")} disabled={!!pos}
            style={{ flex: 1, padding: "12px", borderRadius: "var(--radius-md)", border: `1.5px solid ${RED}`, background: pos ? "var(--color-bg-muted)" : "var(--color-danger-subtle)", color: RED, fontWeight: 700, cursor: pos ? "not-allowed" : "pointer", opacity: pos ? 0.5 : 1 }}>
            ▼ Short
          </button>
        </div>
        <button type="button" onClick={finish} className="jx-btn jx-btn--ghost jx-btn--sm" style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-3)" }}>
          End round early
        </button>
      </div>
    </div>
  );
}

/* ---------------- main panel ---------------- */
const GAMES = [
  { id: "bias", title: "Bias Buster", desc: "Spot the cognitive bias before it costs you a trade.", icon: Brain, accent: "#8b5cf6", Comp: BiasQuiz },
  { id: "chart", title: "Chart Call", desc: "Read the context and call the higher-probability move.", icon: CandlestickChart, accent: "#22d3ee", Comp: ChartCall },
  { id: "risk", title: "Risk Drill", desc: "Size positions correctly against the clock.", icon: Calculator, accent: "#34d399", Comp: RiskDrill },
  { id: "discipline", title: "Discipline Scenarios", desc: "Make the process-driven call under pressure.", icon: Shield, accent: "#fcd535", Comp: DisciplineScenarios },
  { id: "scalp", title: "Scalp Trainer", desc: "Live price, no questions — go long/short and bank P&L on timing.", icon: Activity, accent: "#f472b6", Comp: ScalpTrainer },
];

export default function ActivitiesPanel() {
  const [active, setActive] = useState(null);
  const [progress, setProgress] = useState(getProgress());
  const posts = getAllPosts();

  useEffect(() => {
    const refresh = () => setProgress(getProgress());
    refresh();
    window.addEventListener("jx-gym-changed", refresh);
    return () => window.removeEventListener("jx-gym-changed", refresh);
  }, []);

  const lvl = levelFor(progress.xp);
  const doneCount = GAMES.filter((g) => isDoneToday(g.id)).length;

  const onComplete = (id) => ({ xp, score }) => recordActivity(id, { xp, score });

  if (active) {
    const g = GAMES.find((x) => x.id === active);
    const Comp = g.Comp;
    return (
      <GameShell title={g.title} icon={g.icon} accent={g.accent} onExit={() => setActive(null)}>
        <Comp onExit={() => setActive(null)} onComplete={onComplete(g.id)} />
      </GameShell>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <div>
          <div style={{ font: "var(--text-h2)" }}>Trader Gym</div>
          <div style={{ font: "var(--text-body)", ...muted }}>
            Daily reps that sharpen your decisions — the edge is built between trades.
          </div>
        </div>
      </div>

      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)" }}>
        <div style={{ ...card, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span style={{ width: 42, height: 42, borderRadius: "var(--radius-md)", background: "color-mix(in srgb, #f97316 18%, transparent)", color: "#f97316", display: "flex", alignItems: "center", justifyContent: "center" }}><Flame size={22} /></span>
          <div><div style={{ font: "var(--text-stat)", fontWeight: 700 }}>{progress.streak || 0}</div><div style={{ font: "var(--text-caption)", ...muted }}>day streak</div></div>
        </div>
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ font: "var(--text-body-md)", fontWeight: 700 }}>Level {lvl.level}</span>
            <span style={{ font: "var(--text-caption)", ...muted }}>{progress.xp || 0} XP</span>
          </div>
          <div className="jx-progress" style={{ height: 6 }}>
            <div style={{ width: `${lvl.pct}%`, height: "100%", background: "var(--color-primary)", borderRadius: 999, transition: "width .6s ease" }} />
          </div>
          <span style={{ font: "var(--text-caption)", ...muted }}>{lvl.next - (progress.xp || 0)} XP to next level</span>
        </div>
        <div style={{ ...card, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span style={{ width: 42, height: 42, borderRadius: "var(--radius-md)", background: "var(--color-success-subtle)", color: "var(--color-success-strong)", display: "flex", alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={22} /></span>
          <div><div style={{ font: "var(--text-stat)", fontWeight: 700 }}>{doneCount}/{GAMES.length}</div><div style={{ font: "var(--text-caption)", ...muted }}>done today</div></div>
        </div>
      </div>

      {/* activities */}
      <div>
        <div style={{ font: "var(--text-title)", fontWeight: 600, marginBottom: "var(--space-3)", display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={18} style={{ color: "var(--yellow-500)" }} /> Today&apos;s drills
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-4)" }}>
          {GAMES.map((g) => {
            const done = isDoneToday(g.id);
            const best = progress.bestScores?.[g.id];
            return (
              <motion.button key={g.id} type="button" whileHover={{ y: -3 }} onClick={() => setActive(g.id)}
                style={{ ...card, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: "var(--space-3)", position: "relative" }}>
                {done && (
                  <span style={{ position: "absolute", top: 14, right: 14, display: "inline-flex", alignItems: "center", gap: 4, font: "var(--text-caption)", color: "var(--color-success-strong)", fontWeight: 600 }}>
                    <CheckCircle2 size={14} /> Done
                  </span>
                )}
                <span style={{ width: 46, height: 46, borderRadius: "var(--radius-md)", background: `${g.accent}1f`, color: g.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <g.icon size={24} />
                </span>
                <div>
                  <div style={{ font: "var(--text-title)", fontWeight: 600 }}>{g.title}</div>
                  <div style={{ font: "var(--text-small)", ...muted, marginTop: 2 }}>{g.desc}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                  <span style={{ font: "var(--text-caption)", ...muted }}>{best != null ? `Best: ${best}${g.id === "discipline" || g.id === "risk" || g.id === "bias" || g.id === "chart" ? "%" : ""}` : "Not played yet"}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, font: "var(--text-small)", color: g.accent, fontWeight: 600 }}>
                    {done ? "Replay" : "Play"} <ChevronRight size={15} />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* small blogs strip */}
      <div style={{ ...card, padding: "var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
          <span style={{ font: "var(--text-body-md)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <BookOpen size={16} style={{ color: "var(--color-text-muted)" }} /> Quick reads
          </span>
          <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => window.open("/blog", "_blank", "noopener")}>
            All articles
          </Button>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)", overflowX: "auto", paddingBottom: 4 }}>
          {posts.slice(0, 6).map((p) => (
            <button key={p.slug} type="button" onClick={() => window.open(`/blog/${p.slug}`, "_blank", "noopener")}
              style={{ flex: "0 0 220px", textAlign: "left", background: "var(--color-bg-muted)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)", cursor: "pointer", color: "var(--color-text-primary)" }}>
              <div style={{ font: "var(--text-caption)", ...muted, marginBottom: 4 }}>{p.category} · {p.minutes} min</div>
              <div style={{ font: "var(--text-small)", fontWeight: 600, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</div>
              <div style={{ font: "var(--text-caption)", ...muted, marginTop: 6 }}>{fmtDate(p.date)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
