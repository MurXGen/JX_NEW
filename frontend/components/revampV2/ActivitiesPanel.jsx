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
import ov from "@/components/app/Overview.module.css";
import lf from "@/components/app/Learn.module.css";
import { getAllPosts, fmtDate } from "@/utils/blogs";

const muted = { color: "var(--color-text-muted)" };

/* ---------- local high-score helpers ---------- */
const readBest = (k) => {
  try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; }
};
const writeBest = (k, v) => {
  try { localStorage.setItem(k, String(v)); } catch {}
};

/* ================= shared game frame ================= */
function GameCard({ icon: Icon, title, sub, best, bestLabel, children }) {
  return (
    <div className={lf.game}>
      <div className={lf.gameHead}>
        <span className={lf.gameIco} aria-hidden="true"><Icon size={19} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className={lf.gameTitle}>{title}</h3>
          <p className={lf.gameSub}>{sub}</p>
        </div>
        <span className={lf.best} title={bestLabel}><Trophy size={12} aria-hidden="true" /> Best {best}</span>
      </div>
      {children}
    </div>
  );
}

/* 3-2-1 before a run, so the first target / question is fair */
function useCountdown(onDone) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!n) return undefined;
    const t = setTimeout(() => { if (n === 1) { setN(0); onDone(); } else setN(n - 1); }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);
  return [n, () => setN(3)];
}

function Countdown({ n }) {
  return (
    <div className={lf.overlay}>
      <span key={n} className={lf.count} aria-live="assertive">{n}</span>
      <small>Get ready</small>
    </div>
  );
}

/* ================= Reflex game (30s round) ================= */
const REFLEX_SECS = 30;
const TARGET_LIFE = 1100; // ms a target stays before it counts as a miss

function ReflexGame() {
  const [phase, setPhase] = useState("idle"); // idle | countdown | playing | done
  const [timeLeft, setTimeLeft] = useState(REFLEX_SECS);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [pos, setPos] = useState({ x: 50, y: 50, id: 0 });
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const appearedRef = useRef(0);
  const sumRef = useRef(0);
  const fastRef = useRef(Infinity);
  const expireRef = useRef(null);

  useEffect(() => setBest(readBest("jx-lf-reflex-best")), []);

  const place = () => {
    clearTimeout(expireRef.current);
    setPos((p) => ({ x: 10 + Math.random() * 80, y: 18 + Math.random() * 68, id: p.id + 1 }));
    appearedRef.current = performance.now();
    // a target you don't hit in time is a miss, then the next one appears
    expireRef.current = setTimeout(() => { setMisses((m) => m + 1); place(); }, TARGET_LIFE);
  };
  const begin = () => {
    sumRef.current = 0; fastRef.current = Infinity;
    setHits(0); setMisses(0); setNewBest(false); setTimeLeft(REFLEX_SECS); setPhase("playing"); place();
  };
  const [count, startCountdown] = useCountdown(begin);
  const start = () => { setPhase("countdown"); startCountdown(); };

  // countdown clock
  useEffect(() => {
    if (phase !== "playing") return undefined;
    if (timeLeft <= 0) {
      clearTimeout(expireRef.current);
      setPhase("done");
      if (hits > best) { writeBest("jx-lf-reflex-best", hits); setBest(hits); setNewBest(true); }
      return undefined;
    }
    const t = setTimeout(() => setTimeLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, hits, best]);
  useEffect(() => () => clearTimeout(expireRef.current), []);

  const hit = (e) => {
    e.stopPropagation();
    if (phase !== "playing") return;
    const dt = performance.now() - appearedRef.current;
    if (dt > 0) { sumRef.current += dt; if (dt < fastRef.current) fastRef.current = dt; }
    setHits((h) => h + 1);
    place();
    try { navigator.vibrate?.(8); } catch {}
  };
  // tapping empty space is a miss too
  const missTap = () => { if (phase === "playing") setMisses((m) => m + 1); };

  const avg = hits ? sumRef.current / hits : 0;
  const fastest = Number.isFinite(fastRef.current) ? fastRef.current : 0;
  const acc = hits + misses ? Math.round((hits / (hits + misses)) * 100) : 0;
  const rating =
    !hits ? "No hits this round"
    : avg < 350 ? "Lightning reflexes"
    : avg < 500 ? "Sharp and steady"
    : avg < 700 ? "Solid, keep practising"
    : "Warming up";

  return (
    <GameCard icon={Crosshair} title="Reflex trainer" sub={`Hit each target before it vanishes · ${REFLEX_SECS} seconds`} best={best} bestLabel="Most hits in one round">
      <div className={lf.stage} data-playing={phase === "playing" || undefined} onClick={missTap}>
        {phase === "playing" && (
          <>
            <div className={lf.hud}>
              <span><b>{hits}</b> hits</span>
              <span><b>{acc}%</b> accuracy</span>
              <span><b>{timeLeft}s</b> left</span>
            </div>
            <div className={lf.timebar} aria-hidden="true"><i style={{ width: `${(timeLeft / REFLEX_SECS) * 100}%` }} /></div>
            <button
              key={pos.id}
              type="button"
              onClick={hit}
              aria-label="Target, tap it"
              className={lf.target}
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, "--life": `${TARGET_LIFE}ms` }}
            />
          </>
        )}

        {phase === "countdown" && count > 0 && <Countdown n={count} />}

        {phase === "idle" && (
          <div className={lf.intro}>
            <b>How fast can you react?</b>
            <ul>
              <li>A target appears somewhere in the box</li>
              <li>Hit it before it shrinks away (about 1 second)</li>
              <li>Missed targets and stray taps lower your accuracy</li>
            </ul>
            <button type="button" className={`${ov.btn} ${ov.gold}`} onClick={(e) => { e.stopPropagation(); start(); }}><Play size={15} aria-hidden="true" /> Start round</button>
          </div>
        )}

        {phase === "done" && (
          <div className={lf.result} onClick={(e) => e.stopPropagation()}>
            {newBest && <span className={lf.newBest}><Trophy size={13} aria-hidden="true" /> New best</span>}
            <b className={lf.resultBig}>{hits} <small>hits</small></b>
            <span className={lf.rating}>{rating}</span>
            <div className={lf.resultStats}>
              <div><span>Avg reaction</span><b>{avg ? `${Math.round(avg)} ms` : "—"}</b></div>
              <div><span>Fastest</span><b>{fastest ? `${Math.round(fastest)} ms` : "—"}</b></div>
              <div><span>Accuracy</span><b>{acc}%</b></div>
            </div>
            <p className={lf.why}>Faster, cleaner reactions mean less hesitation on entries and a quicker hand on your stop.</p>
            <button type="button" className={`${ov.btn} ${ov.gold}`} onClick={start}><RotateCcw size={15} aria-hidden="true" /> Play again</button>
          </div>
        )}
      </div>
    </GameCard>
  );
}

/* ================= Mental math streak ================= */
const OPS = [
  { id: "add", sym: "+", label: "Addition" },
  { id: "subtract", sym: "−", label: "Subtraction" },
  { id: "multiply", sym: "×", label: "Multiplication" },
  { id: "divide", sym: "÷", label: "Division" },
  { id: "mixed", sym: "∑", label: "Mixed" },
];
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/* difficulty scales with `level` (rises every 5 correct answers) */
function genQuestion(op, level = 0) {
  const realOp = op === "mixed" ? ["add", "subtract", "multiply", "divide"][rnd(0, 3)] : op;
  const L = Math.min(level, 8);
  if (realOp === "add") { const hi = 20 + L * 15; const a = rnd(2, hi), b = rnd(2, hi); return { a, b, sym: "+", answer: a + b }; }
  if (realOp === "subtract") { const hi = 20 + L * 15; const a = rnd(10, hi), b = rnd(2, a); return { a, b, sym: "−", answer: a - b }; }
  if (realOp === "multiply") { const hi = 9 + L * 2; const a = rnd(2, hi), b = rnd(2, hi); return { a, b, sym: "×", answer: a * b }; }
  const hi = 9 + L * 2; const b = rnd(2, hi), q = rnd(2, hi); return { a: b * q, b, sym: "÷", answer: q };
}
// seconds per question: generous at first, tighter as the level rises
const qSeconds = (level) => Math.max(5, 10 - level);

function CalcGame() {
  const [op, setOp] = useState("mixed");
  const [phase, setPhase] = useState("idle"); // idle | countdown | playing | done
  const [score, setScore] = useState(0);
  const [q, setQ] = useState(null);
  const [val, setVal] = useState("");
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [end, setEnd] = useState(null); // { reason, answer, given }
  const [tLeft, setTLeft] = useState(10);
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);
  const level = Math.floor(score / 5);
  const opLabel = OPS.find((o) => o.id === op)?.label;

  useEffect(() => { setBest(readBest(`jx-lf-calc-best-${op}`)); }, [op]);

  const finish = (reason, given) => {
    const isBest = score > best;
    if (isBest) { writeBest(`jx-lf-calc-best-${op}`, score); setBest(score); }
    setNewBest(isBest);
    setEnd({ reason, answer: q?.answer, given, question: q });
    setShake(true);
    try { navigator.vibrate?.([10, 30, 10]); } catch {}
    setTimeout(() => { setShake(false); setPhase("done"); }, 320);
  };

  const begin = () => {
    setScore(0); setVal(""); setNewBest(false); setEnd(null);
    setQ(genQuestion(op, 0)); setTLeft(qSeconds(0)); setPhase("playing");
    setTimeout(() => inputRef.current?.focus(), 30);
  };
  const [count, startCountdown] = useCountdown(begin);
  const start = () => { setPhase("countdown"); startCountdown(); };

  // per-question timer (tenths of a second for a smooth bar)
  useEffect(() => {
    if (phase !== "playing" || shake) return undefined;
    if (tLeft <= 0) { finish("time"); return undefined; }
    const t = setTimeout(() => setTLeft((x) => Math.round((x - 0.1) * 10) / 10), 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, tLeft, shake]);

  const submit = (e) => {
    e?.preventDefault();
    if (phase !== "playing" || !q || val === "" || shake) return;
    if (Number(val) === q.answer) {
      const next = score + 1;
      setScore(next);
      setVal("");
      setQ(genQuestion(op, Math.floor(next / 5)));
      setTLeft(qSeconds(Math.floor(next / 5)));
      try { navigator.vibrate?.(8); } catch {}
    } else {
      finish("wrong", val);
    }
  };

  return (
    <GameCard icon={Brain} title="Mental math streak" sub="Answer before the timer runs out · one mistake ends the run" best={best} bestLabel={`Best streak in ${opLabel}`}>
      <div className={lf.stage} data-shake={shake || undefined}>
        {phase === "idle" && (
          <div className={lf.intro}>
            <b>Pick what to practise</b>
            <div className={lf.ops} role="radiogroup" aria-label="Operation">
              {OPS.map((o) => (
                <button key={o.id} type="button" role="radio" aria-checked={op === o.id} onClick={() => setOp(o.id)}>
                  <span aria-hidden="true">{o.sym}</span>{o.label}
                </button>
              ))}
            </div>
            <small className={lf.introNote}>Best in {opLabel}: <b>{best}</b> · questions get harder every 5 answers</small>
            <button type="button" className={`${ov.btn} ${ov.gold}`} onClick={start}><Play size={15} aria-hidden="true" /> Start run</button>
          </div>
        )}

        {phase === "countdown" && count > 0 && <Countdown n={count} />}

        {phase === "playing" && q && (
          <>
            <div className={lf.hud}>
              <span><b>{score}</b> streak</span>
              <span>Level <b>{level + 1}</b></span>
              <span className={score > best && best > 0 ? lf.hudGood : undefined}>{score > best && best > 0 ? "New best pace" : <>Best <b>{best}</b></>}</span>
            </div>
            <div className={lf.timebar} data-low={tLeft <= 3 || undefined} aria-hidden="true"><i style={{ width: `${(tLeft / qSeconds(level)) * 100}%` }} /></div>
            <form onSubmit={submit} className={lf.mathPlay}>
              <div className={lf.question} aria-live="polite">{q.a} <em>{q.sym}</em> {q.b} <em>=</em> ?</div>
              <div className={lf.answerRow}>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="-?[0-9]*"
                  autoComplete="off"
                  aria-label="Your answer"
                  placeholder="Answer"
                  value={val}
                  onChange={(e) => setVal(e.target.value.replace(/[^0-9-]/g, ""))}
                  className={lf.answerInput}
                />
                <button type="submit" className={`${ov.btn} ${ov.gold}`} disabled={val === ""}>Enter</button>
              </div>
              <small className={lf.introNote}>Press Enter to submit · {Math.ceil(tLeft)}s</small>
            </form>
          </>
        )}

        {phase === "done" && end && (
          <div className={lf.result}>
            {newBest && <span className={lf.newBest}><Trophy size={13} aria-hidden="true" /> New best</span>}
            <b className={lf.resultBig}>{score} <small>in a row</small></b>
            <span className={lf.rating}>
              {end.reason === "time" ? "Out of time" : "Wrong answer"} on {end.question?.a} {end.question?.sym} {end.question?.b}
            </span>
            <div className={lf.resultStats}>
              {end.reason === "wrong" && <div><span>You answered</span><b className={lf.bad}>{end.given}</b></div>}
              <div><span>Correct answer</span><b>{end.answer}</b></div>
              <div><span>Best in {opLabel}</span><b>{best}</b></div>
            </div>
            <div className={lf.resultBtns}>
              <button type="button" className={`${ov.btn} ${ov.gold}`} onClick={start}><RotateCcw size={15} aria-hidden="true" /> Play again</button>
              <button type="button" className={`${ov.btn} ${ov.ghost}`} onClick={() => setPhase("idle")}>Change operation</button>
            </div>
          </div>
        )}
      </div>
    </GameCard>
  );
}

/* ================= Articles (recent first, reveal all on scroll) ============ */
function Articles() {
  const posts = useMemo(
    () => getAllPosts().slice().sort((a, b) => new Date(b.date) - new Date(a.date)),
    [],
  );
  const cats = useMemo(() => ["All", ...[...new Set(posts.map((p) => p.category).filter(Boolean))]], [posts]);
  const [cat, setCat] = useState("All");
  const list = cat === "All" ? posts : posts.filter((p) => p.category === cat);
  const PAGE = 10; // articles shown up front, then lazy-loaded in batches of 10
  const [visible, setVisible] = useState(PAGE);
  useEffect(() => setVisible(PAGE), [cat]);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisible((v) => Math.min(list.length, v + PAGE)); },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [list.length]);

  const [feat, ...rest] = list;
  return (
    <section className={lf.section} aria-labelledby="lf-read">
      <div className={lf.sectionHead}>
        <div>
          <h2 id="lf-read" className={lf.sectionTitle}><BookOpen size={16} aria-hidden="true" /> Read up on your edge</h2>
          <p className={lf.sectionSub}>Short, practical articles on risk, psychology and strategy</p>
        </div>
        <a href="/blogs" target="_blank" rel="noopener" className={`${ov.btn} ${ov.ghost}`}>
          All articles <ArrowRight size={14} aria-hidden="true" />
        </a>
      </div>

      <div className={lf.cats} role="group" aria-label="Filter articles by topic">
        {cats.map((c) => (
          <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c}{c !== "All" && <small>{posts.filter((p) => p.category === c).length}</small>}
          </button>
        ))}
      </div>

      {feat && (
        <a href={`/blogs/${feat.slug}`} target="_blank" rel="noopener" className={lf.feature}>
          <span className={lf.featKicker}>Latest · {feat.category} · {feat.minutes} min read</span>
          <span className={lf.featTitle}>{feat.title}</span>
          <span className={lf.featEx}>{feat.excerpt}</span>
          <span className={lf.featCta}>Read article <ArrowRight size={14} aria-hidden="true" /></span>
        </a>
      )}

      <div className={lf.grid}>
        {rest.slice(0, visible - 1).map((p) => (
          <a key={p.slug} href={`/blogs/${p.slug}`} target="_blank" rel="noopener" className={lf.post}>
            <span className={lf.tag}>{p.category} · {p.minutes} min</span>
            <span className={lf.postTitle}>{p.title}</span>
            <span className={lf.postEx}>{p.excerpt}</span>
            <span className={lf.postDate}>{fmtDate(p.date)}</span>
          </a>
        ))}
      </div>

      {visible < list.length && (
        <div ref={sentinelRef} className={lf.more} aria-live="polite">Loading more articles…</div>
      )}
      {visible >= list.length && list.length > PAGE && <p className={lf.more}>You&apos;ve reached the end · {list.length} articles</p>}
    </section>
  );
}

/* ================= Panel ================= */
export default function ActivitiesPanel() {
  return (
    <div className={`${ov.root} ${lf.root}`}>
      <header className={ov.head}>
        <div>
          <h1 className={ov.title}>Learn &amp; Focus</h1>
          <p className={ov.sub}>Reset between trades with a quick focus game, then read up on your edge.</p>
        </div>
      </header>

      <section className={lf.section} aria-labelledby="lf-games">
        <div className={lf.sectionHead}>
          <div>
            <h2 id="lf-games" className={lf.sectionTitle}><Timer size={16} aria-hidden="true" /> Focus games</h2>
            <p className={lf.sectionSub}>Two-minute resets after a loss or before a session. Best scores are saved on this device.</p>
          </div>
        </div>
        <div className={`${lf.games} ${lf.legacy}`}>
          <ReflexGame />
          <CalcGame />
        </div>
      </section>

      <Articles />
    </div>
  );
}
