"use client";

/* In-app Tools / calculators, the same maths as the public /tools pages, but
   themed for the dashboard and with a live trade-setup chart (area or
   candlestick) that illustrates the entry / stop / target / exit the user
   types. Reached from the desktop sidebar and the mobile Settings list. */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Calculator, Percent, TrendingUp, Target, ShieldAlert, CandlestickChart, AreaChart, ChevronDown } from "lucide-react";
import ov from "@/components/app/Overview.module.css";
import tl from "@/components/app/Tools.module.css";

/* tools grouped by the job a trader is doing, each with the question it answers */
const GROUPS = [
  {
    title: "Plan a trade",
    tools: [
      { id: "position", label: "Position size", icon: Calculator, q: "How much should I buy?", desc: "Size the position so a stop-out only costs the risk you chose." },
      { id: "pnl", label: "Profit / loss", icon: TrendingUp, q: "What will this trade make?", desc: "Gross and net result, and the return on the capital you put in." },
    ],
  },
  {
    title: "Review a trade",
    tools: [
      { id: "rmultiple", label: "R-multiple", icon: Percent, q: "How good was this trade?", desc: "Measure the result in units of risk, so every trade is comparable." },
    ],
  },
  {
    title: "Check your edge",
    tools: [
      { id: "breakeven", label: "Breakeven win rate", icon: Target, q: "How often must I win?", desc: "The win rate you need at your reward-to-risk to stop losing money." },
      { id: "ror", label: "Risk of ruin", icon: ShieldAlert, q: "Could I blow the account?", desc: "Simulates thousands of trade runs to estimate the chance of a deep drawdown." },
    ],
  },
];
const TABS = GROUPS.flatMap((g) => g.tools);

const num = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };
const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

/* ---------- shared bits ---------- */
function Field({ label, value, onChange, placeholder, prefix, suffix, hint, optional }) {
  const id = `tool-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className={tl.field}>
      <label htmlFor={id} className={tl.label}>
        {label}{optional && <span className={tl.opt}>Optional</span>}
      </label>
      <div className={tl.input}>
        {prefix && <span className={tl.affix} aria-hidden="true">{prefix}</span>}
        <input id={id} inputMode="decimal" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className={tl.affix} aria-hidden="true">{suffix}</span>}
      </div>
      {hint && <small className={tl.hint}>{hint}</small>}
    </div>
  );
}

/* the one number the tool exists to answer */
function Answer({ label, value, sub, tone }) {
  return (
    <div className={tl.answer} data-tone={tone}>
      <span>{label}</span>
      <b aria-live="polite">{value}</b>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function Stat({ label, value, tone, sub }) {
  return (
    <div className={tl.stat}>
      <span>{label}</span>
      <b data-tone={tone}>{value}</b>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function Worked({ lines }) {
  if (!lines?.length) return null;
  return (
    <details className={tl.worked}>
      <summary>How it&apos;s calculated <ChevronDown size={14} aria-hidden="true" /></summary>
      <div>
        {lines.map((l, i) => (
          <p key={i} data-last={i === lines.length - 1 || undefined}>{l}</p>
        ))}
      </div>
    </details>
  );
}

function Empty({ children }) {
  return <p className={tl.empty}>{children}</p>;
}

function DirSeg({ dir, setDir }) {
  return (
    <div className={tl.field}>
      <span className={tl.label}>Direction</span>
      <div className={ov.seg} role="group" aria-label="Direction" style={{ alignSelf: "flex-start" }}>
        <button type="button" aria-pressed={dir === "long"} onClick={() => setDir("long")}>Long</button>
        <button type="button" aria-pressed={dir === "short"} onClick={() => setDir("short")}>Short</button>
      </div>
    </div>
  );
}

/* ---------- the trade-setup chart (area | candles) ---------- */
function seeded(s) { return function () { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function TradeSetupChart({ entry, stop, target, exit, dir = "long", sym = "$" }) {
  const [mode, setMode] = useState("area");
  const [w, setW] = useState(640);
  const boxRef = useRef(null);
  // draw at the real pixel width (no stretched SVG text)
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const gid = useId().replace(/:/g, "");

  const e = num(entry), s = num(stop), tg = num(target), ex = num(exit);
  const levels = [e, s, tg, ex].filter((v) => Number.isFinite(v) && v > 0);
  const hasChart = e > 0 && levels.length >= 2;

  const narrow = w < 520;
  const H = narrow ? 220 : 260, padT = 18, padB = 22, tagW = narrow ? 92 : 118, padL = 8;
  const plotR = w - tagW - 10;
  let lo = Math.min(...levels), hi = Math.max(...levels);
  if (lo === hi) { lo *= 0.99; hi *= 1.01; }
  const span = hi - lo; lo -= span * 0.16; hi += span * 0.16;
  const yOf = (p) => padT + (1 - (p - lo) / (hi - lo)) * (H - padT - padB);

  const endPrice = ex > 0 ? ex : tg > 0 ? tg : e;
  const win = dir === "long" ? endPrice >= e : endPrice <= e;
  const flat = Math.abs(endPrice - e) < 1e-9;
  const col = flat ? "#c7ccd4" : win ? "#2ebd85" : "#f6465d";

  // deterministic "price path": a random walk that starts at entry and lands on the end price
  const N = narrow ? 22 : 34;
  const rand = seeded(Math.round((e * 3 + s * 5 + tg * 7 + ex * 11) * 100) || 7);
  const pts = [];
  let drift = 0;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    drift = drift * 0.7 + (rand() - 0.5) * span * 0.09;
    const base = e + (endPrice - e) * (t * t * (3 - 2 * t)); // ease-in-out toward the end
    const damp = Math.sin(t * Math.PI);
    let p = base + (i === 0 || i === N ? 0 : drift * damp);
    if (s > 0) p = dir === "long" ? Math.max(p, s + span * 0.04) : Math.min(p, s - span * 0.04); // never touch the stop
    pts.push({ x: padL + t * (plotR - padL), p });
  }
  // smooth path (Catmull-Rom → cubic Bézier)
  const line = pts.map((pt, i) => {
    if (i === 0) return `M ${pt.x} ${yOf(pt.p)}`;
    const p0 = pts[i - 2] || pts[i - 1], p1 = pts[i - 1], p3 = pts[i + 1] || pt;
    const c1x = p1.x + (pt.x - p0.x) / 6, c1y = yOf(p1.p) + (yOf(pt.p) - yOf(p0.p)) / 6;
    const c2x = pt.x - (p3.x - p1.x) / 6, c2y = yOf(pt.p) - (yOf(p3.p) - yOf(p1.p)) / 6;
    return `C ${c1x} ${c1y} ${c2x} ${c2y} ${pt.x} ${yOf(pt.p)}`;
  }).join(" ");
  const areaPath = `${line} L ${pts[N].x} ${H - padB} L ${pts[0].x} ${H - padB} Z`;

  const zone = (a, b, fill, label) => {
    if (!(a > 0 && b > 0)) return null;
    const y1 = Math.min(yOf(a), yOf(b)), h = Math.abs(yOf(a) - yOf(b));
    return (
      <g>
        <rect x={padL} y={y1} width={plotR - padL} height={h} fill={fill} opacity="0.1" />
        {h > 20 && <text x={padL + 10} y={y1 + h / 2 + 4} className={tl.zoneLbl} fill={fill}>{label}</text>}
      </g>
    );
  };
  const pctOf = (a) => ((a - e) / e) * 100;
  const riskTxt = s > 0 ? `Risk ${sym}${fmt(Math.abs(e - s))} (${fmt(Math.abs(pctOf(s)))}%)` : "";
  const rr = s > 0 && tg > 0 ? Math.abs(tg - e) / Math.abs(e - s) : 0;
  const rewTxt = tg > 0 ? `Reward ${sym}${fmt(Math.abs(tg - e))} (${fmt(Math.abs(pctOf(tg)))}%)${rr ? ` · ${fmt(rr)}R` : ""}` : "";

  const Tag = ({ price, label, color }) => {
    if (!(price > 0)) return null;
    const y = yOf(price);
    return (
      <g>
        <line x1={padL} y1={y} x2={plotR} y2={y} stroke={color} strokeWidth="1" strokeDasharray="5 5" opacity="0.7" />
        <rect x={plotR + 6} y={y - 11} width={tagW - 4} height="22" rx="6" className={tl.tagBg} stroke={color} strokeOpacity="0.45" />
        <circle cx={plotR + 16} cy={y} r="3" fill={color} />
        <text x={plotR + 24} y={y + 4} className={`${tl.tagTxt} ${tl.tagInk}`}>{label} <tspan className={tl.tagMuted}>{sym}{fmt(price)}</tspan></text>
      </g>
    );
  };

  // gridlines at 4 price steps
  const grid = [0, 1, 2, 3, 4].map((i) => lo + ((hi - lo) * i) / 4);

  return (
    <div className={tl.chart}>
      <div className={tl.chartHead}>
        <div>
          <span className={tl.chartTitle}>Trade setup</span>
          <span className={tl.chartSub}>Illustrative path from entry to {ex > 0 ? "exit" : tg > 0 ? "target" : "now"}</span>
        </div>
        <div className={ov.seg} role="group" aria-label="Chart style">
          <button type="button" aria-pressed={mode === "area"} onClick={() => setMode("area")}><AreaChart size={14} aria-hidden="true" /> Area</button>
          <button type="button" aria-pressed={mode === "candles"} onClick={() => setMode("candles")}><CandlestickChart size={14} aria-hidden="true" /> Candles</button>
        </div>
      </div>

      <div ref={boxRef} className={tl.chartBox}>
        {!hasChart ? (
          <p className={tl.empty}>Enter an entry and at least one of stop, target or exit to draw the setup.</p>
        ) : (
          <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label={`Trade setup: entry ${sym}${fmt(e)}${s ? `, stop ${sym}${fmt(s)}` : ""}${tg ? `, target ${sym}${fmt(tg)}` : ""}${ex ? `, exit ${sym}${fmt(ex)}` : ""}`}>
            <defs>
              <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={col} stopOpacity="0.28" />
                <stop offset="100%" stopColor={col} stopOpacity="0" />
              </linearGradient>
            </defs>
            {grid.map((g, i) => (
              <line key={i} x1={padL} x2={plotR} y1={yOf(g)} y2={yOf(g)} className={tl.gridLine} />
            ))}
            {zone(e, s, "#f6465d", riskTxt)}
            {zone(e, tg, "#2ebd85", rewTxt)}

            {mode === "area" ? (
              <>
                <path d={areaPath} fill={`url(#fill-${gid})`} />
                <path d={line} fill="none" stroke={col} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
              </>
            ) : (
              pts.slice(1).map((pt, i) => {
                const prev = pts[i];
                const up = pt.p >= prev.p;
                const c = up ? "#2ebd85" : "#f6465d";
                const wick = span * (0.02 + rand() * 0.03);
                const bw = Math.max(3, ((plotR - padL) / N) * 0.6);
                const oY = yOf(prev.p), cY = yOf(pt.p);
                const x = (prev.x + pt.x) / 2;
                return (
                  <g key={i}>
                    <line x1={x} x2={x} y1={yOf(Math.max(prev.p, pt.p) + wick)} y2={yOf(Math.min(prev.p, pt.p) - wick)} stroke={c} strokeWidth="1.2" />
                    <rect x={x - bw / 2} y={Math.min(oY, cY)} width={bw} height={Math.max(2, Math.abs(oY - cY))} rx="1.5" fill={c} />
                  </g>
                );
              })
            )}

            <Tag price={s} label="Stop" color="#f6465d" />
            <Tag price={tg} label="Target" color="#2ebd85" />
            {ex > 0 && ex !== tg && <Tag price={ex} label="Exit" color={win ? "#2ebd85" : "#f6465d"} />}
            <Tag price={e} label="Entry" color="var(--chart-entry, #e9ebee)" />

            {/* entry + end markers */}
            <circle cx={pts[0].x} cy={yOf(e)} r="5" className={tl.dotEntry} strokeWidth="2" />
            {!flat && <circle cx={pts[N].x} cy={yOf(endPrice)} r="5" className={tl.dotFill} stroke={col} strokeWidth="2" />}
          </svg>
        )}
      </div>

      {hasChart && (
        <div className={tl.legend}>
          {s > 0 && <span><i style={{ background: "#f6465d" }} /> Risk zone</span>}
          {tg > 0 && <span><i style={{ background: "#2ebd85" }} /> Reward zone</span>}
          {!(tg > 0) && !(ex > 0) && <span className={tl.legendHint}>Add a target to see your reward zone</span>}
          <span className={tl.legendNote}>Path is illustrative, not a forecast</span>
        </div>
      )}
    </div>
  );
}

/* ---------- calculators ---------- */
const money = (sym, n, signed) => `${signed && n > 0 ? "+" : n < 0 ? "−" : ""}${sym}${fmt(Math.abs(n))}`;

function PositionSize({ sym }) {
  const [account, setAccount] = useState("100000");
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("100");
  const [stop, setStop] = useState("98");
  const [target, setTarget] = useState("");
  const acc = num(account), rp = num(riskPct), en = num(entry), st = num(stop), tg = num(target);
  const riskAmt = (acc * rp) / 100, perUnit = Math.abs(en - st);
  const qty = perUnit > 0 ? Math.floor(riskAmt / perUnit) : 0;
  const rr = tg > 0 && perUnit > 0 ? Math.abs(tg - en) / perUnit : 0;
  const profit = tg > 0 ? qty * Math.abs(tg - en) : 0;
  const dir = st > 0 && st > en ? "short" : "long";
  return (
    <>
      <div className={tl.split}>
        <div className={tl.inputs}>
          <h3 className={tl.step}>Your account</h3>
          <div className={tl.fields}>
            <Field label="Account size" prefix={sym} value={account} onChange={setAccount} />
            <Field label="Risk per trade" suffix="%" value={riskPct} onChange={setRiskPct} hint="1% is a common, safe default" />
          </div>
          <h3 className={tl.step}>The setup</h3>
          <div className={tl.fields}>
            <Field label="Entry price" prefix={sym} value={entry} onChange={setEntry} />
            <Field label="Stop loss" prefix={sym} value={stop} onChange={setStop} />
            <Field label="Target" prefix={sym} value={target} onChange={setTarget} placeholder="e.g. 106" optional />
          </div>
        </div>
        <div className={tl.results}>
          {perUnit > 0 ? (
            <>
              <Answer label="Position size" value={`${fmt(qty)} units`} sub={`${dir === "long" ? "Long" : "Short"} · worth ${sym}${fmt(qty * en)}`} />
              <div className={tl.stats}>
                <Stat label="Max loss if stopped" value={money(sym, -riskAmt)} tone="neg" sub={`${rp}% of account`} />
                <Stat label="Risk per unit (1R)" value={`${sym}${fmt(perUnit)}`} />
                {tg > 0 && <Stat label="Profit at target" value={money(sym, profit, true)} tone="pos" sub={`${fmt(rr)}R reward`} />}
              </div>
              <Worked lines={[
                `Risk amount = ${sym}${fmt(acc)} × ${rp}% = ${sym}${fmt(riskAmt)}`,
                `Position size = risk ÷ |entry − stop| = ${sym}${fmt(riskAmt)} ÷ ${sym}${fmt(perUnit)} = ${fmt(qty)} units`,
              ]} />
            </>
          ) : <Empty>Enter an entry and a stop at a different price to size the trade.</Empty>}
        </div>
      </div>
      <TradeSetupChart entry={entry} stop={stop} target={target} dir={dir} sym={sym} />
    </>
  );
}

function RMultiple({ sym }) {
  const [dir, setDir] = useState("long");
  const [entry, setEntry] = useState("100");
  const [stop, setStop] = useState("98");
  const [exit, setExit] = useState("106");
  const en = num(entry), st = num(stop), ex = num(exit);
  const sign = dir === "long" ? 1 : -1;
  const risk = Math.abs(en - st), pnl = (ex - en) * sign;
  const R = risk > 0 ? pnl / risk : 0;
  const verdict = R >= 2 ? "Excellent trade" : R >= 1 ? "Solid trade" : R > 0 ? "Small win" : R === 0 ? "Breakeven" : R > -1 ? "Controlled loss" : "Loss beyond your stop";
  return (
    <>
      <div className={tl.split}>
        <div className={tl.inputs}>
          <DirSeg dir={dir} setDir={setDir} />
          <div className={tl.fields}>
            <Field label="Entry price" prefix={sym} value={entry} onChange={setEntry} />
            <Field label="Stop loss" prefix={sym} value={stop} onChange={setStop} hint="Your planned stop defines 1R" />
            <Field label="Exit price" prefix={sym} value={exit} onChange={setExit} />
          </div>
        </div>
        <div className={tl.results}>
          {risk > 0 ? (
            <>
              <Answer label="R-multiple" value={`${R > 0 ? "+" : ""}${fmt(R)}R`} sub={verdict} tone={R > 0 ? "pos" : R < 0 ? "neg" : undefined} />
              <div className={tl.stats}>
                <Stat label="Risk per unit (1R)" value={`${sym}${fmt(risk)}`} />
                <Stat label="P&L per unit" value={money(sym, pnl, true)} tone={pnl > 0 ? "pos" : pnl < 0 ? "neg" : undefined} />
              </div>
              <Worked lines={[
                `1R = |entry − stop| = ${sym}${fmt(risk)}`,
                `R-multiple = P&L ÷ 1R = ${sym}${fmt(pnl)} ÷ ${sym}${fmt(risk)} = ${R >= 0 ? "+" : ""}${fmt(R)}R`,
              ]} />
            </>
          ) : <Empty>Enter an entry and a stop at a different price.</Empty>}
        </div>
      </div>
      <TradeSetupChart entry={entry} stop={stop} exit={exit} dir={dir} sym={sym} />
    </>
  );
}

function Pnl({ sym }) {
  const [dir, setDir] = useState("long");
  const [entry, setEntry] = useState("100");
  const [exit, setExit] = useState("106");
  const [qty, setQty] = useState("100");
  const [fees, setFees] = useState("");
  const en = num(entry), ex = num(exit), q = num(qty), fee = num(fees);
  const sign = dir === "long" ? 1 : -1;
  const gross = (ex - en) * sign * q, net = gross - fee, cost = en * q;
  const pct = cost > 0 ? (net / cost) * 100 : 0;
  return (
    <>
      <div className={tl.split}>
        <div className={tl.inputs}>
          <DirSeg dir={dir} setDir={setDir} />
          <div className={tl.fields}>
            <Field label="Entry price" prefix={sym} value={entry} onChange={setEntry} />
            <Field label="Exit price" prefix={sym} value={exit} onChange={setExit} />
            <Field label="Quantity" suffix="units" value={qty} onChange={setQty} />
            <Field label="Fees" prefix={sym} value={fees} onChange={setFees} placeholder="Brokerage + tax" optional />
          </div>
        </div>
        <div className={tl.results}>
          {q > 0 && en > 0 ? (
            <>
              <Answer label="Net P&L" value={money(sym, net, true)} sub={`${pct >= 0 ? "+" : ""}${fmt(pct)}% return on ${sym}${fmt(cost)}`} tone={net > 0 ? "pos" : net < 0 ? "neg" : undefined} />
              <div className={tl.stats}>
                <Stat label="Gross P&L" value={money(sym, gross, true)} tone={gross > 0 ? "pos" : gross < 0 ? "neg" : undefined} />
                <Stat label="Fees" value={fee ? money(sym, -fee) : "—"} />
                <Stat label="Capital used" value={`${sym}${fmt(cost)}`} />
              </div>
              <Worked lines={[
                `Gross = (exit − entry)${dir === "short" ? " × −1" : ""} × qty = ${sym}${fmt(gross)}`,
                `Net = gross − fees = ${sym}${fmt(net)}`,
                `Return = net ÷ capital = ${sym}${fmt(net)} ÷ ${sym}${fmt(cost)} = ${pct >= 0 ? "+" : ""}${fmt(pct)}%`,
              ]} />
            </>
          ) : <Empty>Enter an entry price and a quantity.</Empty>}
        </div>
      </div>
      <TradeSetupChart entry={entry} exit={exit} dir={dir} sym={sym} />
    </>
  );
}

function Breakeven() {
  const [rr, setRr] = useState("2");
  const [winRate, setWinRate] = useState("45");
  const R = Math.max(0, num(rr)), wr = Math.min(100, Math.max(0, num(winRate)));
  const be = R > 0 ? (1 / (1 + R)) * 100 : 100;
  const p = wr / 100, exp = p * R - (1 - p), ok = wr > be;
  return (
    <div className={tl.split}>
      <div className={tl.inputs}>
        <div className={tl.fields}>
          <Field label="Reward : risk" prefix="1 :" value={rr} onChange={setRr} hint="Average win ÷ average loss" />
          <Field label="Your win rate" suffix="%" value={winRate} onChange={setWinRate} hint="Optional check against your real rate" />
        </div>
        {R > 0 && (
          <div className={tl.gauge} aria-hidden="true">
            <div className={tl.gaugeTrack}>
              <span className={tl.gaugeBe} style={{ left: `${be}%` }}><i>Need {fmt(be)}%</i></span>
              <span className={tl.gaugeYou} data-ok={ok || undefined} style={{ left: `${wr}%` }}><i>You {fmt(wr)}%</i></span>
            </div>
          </div>
        )}
      </div>
      <div className={tl.results}>
        {R > 0 ? (
          <>
            <Answer label="You need to win at least" value={`${fmt(be)}%`} sub={`of trades at 1 : ${fmt(R)} to break even`} />
            <div className={tl.stats}>
              <Stat label="Your expectancy" value={`${exp >= 0 ? "+" : ""}${fmt(exp)}R`} tone={exp > 0 ? "pos" : exp < 0 ? "neg" : undefined} sub="per trade" />
              <Stat label="Your edge" value={ok ? "Positive" : "Negative"} tone={ok ? "pos" : "neg"} sub={ok ? `${fmt(wr - be)} pts above breakeven` : `${fmt(be - wr)} pts short`} />
            </div>
            <Worked lines={[
              `Breakeven = 1 ÷ (1 + R) = 1 ÷ ${fmt(1 + R)} = ${fmt(be)}%`,
              `Expectancy = (${fmt(wr)}% × ${fmt(R)}) − ${fmt(100 - wr)}% = ${exp >= 0 ? "+" : ""}${fmt(exp)}R`,
            ]} />
          </>
        ) : <Empty>Enter a reward-to-risk above 0.</Empty>}
      </div>
    </div>
  );
}

function RiskOfRuin() {
  const [winRate, setWinRate] = useState("45");
  const [payoff, setPayoff] = useState("2");
  const [riskPct, setRiskPct] = useState("2");
  const [dd, setDd] = useState("50");
  const [trades, setTrades] = useState("200");
  const inp = {
    winRate: Math.min(100, Math.max(0, num(winRate))), payoff: Math.max(0, num(payoff)),
    riskPct: Math.min(100, Math.max(0.01, num(riskPct))), dd: Math.min(99, Math.max(1, num(dd))),
    trades: Math.min(2000, Math.max(1, Math.round(num(trades)))),
  };
  const ror = useMemo(() => {
    const p = inp.winRate / 100, risk = inp.riskPct / 100, ruin = 1 - inp.dd / 100, runs = 5000;
    const rand = seeded(Math.round((inp.winRate * 7 + inp.payoff * 13 + inp.riskPct * 31 + inp.dd * 17 + inp.trades) * 1000));
    let ruined = 0;
    for (let r = 0; r < runs; r++) { let eq = 1; for (let t = 0; t < inp.trades; t++) { const stake = eq * risk; eq += rand() < p ? stake * inp.payoff : -stake; if (eq <= ruin) { ruined++; break; } } }
    return (ruined / runs) * 100;
  }, [inp.winRate, inp.payoff, inp.riskPct, inp.dd, inp.trades]);
  const exp = (inp.winRate / 100) * inp.payoff - (1 - inp.winRate / 100);
  const tone = ror < 5 ? "pos" : ror < 25 ? "warn" : "neg";
  const verdict = ror < 5 ? "Low risk, survivable" : ror < 25 ? "Caution, consider a smaller size" : "Dangerous, reduce risk per trade";
  return (
    <div className={tl.split}>
      <div className={tl.inputs}>
        <h3 className={tl.step}>Your strategy</h3>
        <div className={tl.fields}>
          <Field label="Win rate" suffix="%" value={winRate} onChange={setWinRate} />
          <Field label="Reward : risk" prefix="1 :" value={payoff} onChange={setPayoff} />
        </div>
        <h3 className={tl.step}>Your sizing</h3>
        <div className={tl.fields}>
          <Field label="Risk per trade" suffix="%" value={riskPct} onChange={setRiskPct} />
          <Field label="Ruin at a drawdown of" suffix="%" value={dd} onChange={setDd} />
          <Field label="Over" suffix="trades" value={trades} onChange={setTrades} />
        </div>
      </div>
      <div className={tl.results}>
        <Answer label="Chance of ruin" value={`${ror.toFixed(1)}%`} sub={verdict} tone={tone} />
        <div className={tl.stats}>
          <Stat label="Expectancy" value={`${exp >= 0 ? "+" : ""}${exp.toFixed(2)}R`} tone={exp > 0 ? "pos" : exp < 0 ? "neg" : undefined} sub="per trade" />
          <Stat label="Simulation" value="5,000 runs" sub={`${inp.trades} trades each`} />
        </div>
        {exp < 0 && <p className={tl.alert}>Negative edge: no position size makes this safe. Improve the strategy first.</p>}
        <Worked lines={[
          `Each run starts at 100% and risks ${fmt(inp.riskPct)}% of the current balance per trade`,
          `A win pays ${fmt(inp.payoff)}× the risk; a loss costs the risk; wins happen ${fmt(inp.winRate)}% of the time`,
          `Ruin = falling ${fmt(inp.dd)}% below the start within ${inp.trades} trades`,
          `Risk of ruin = runs ruined ÷ 5,000 = ${ror.toFixed(1)}%`,
        ]} />
      </div>
    </div>
  );
}

export default function ToolsPanel({ currencySymbol = "$" }) {
  const [tab, setTab] = useState("position");
  useEffect(() => {
    try { const saved = localStorage.getItem("jx-tools-tab"); if (saved && TABS.some((t) => t.id === saved)) setTab(saved); } catch {}
  }, []);
  const pick = (id) => { setTab(id); try { localStorage.setItem("jx-tools-tab", id); } catch {} };
  const cur = TABS.find((t) => t.id === tab) || TABS[0];
  return (
    <div className={`${ov.root} ${tl.root}`}>
      <header className={ov.head}>
        <div>
          <h1 className={ov.title}>Tools</h1>
          <p className={ov.sub}>Calculators for sizing, reviewing and stress-testing your trades. Everything updates as you type.</p>
        </div>
      </header>

      <div className={tl.layout}>
        {/* tool picker, grouped by the job you're doing */}
        <nav className={tl.nav} aria-label="Calculators">
          {GROUPS.map((g) => (
            <div key={g.title} className={tl.navGroup}>
              <span className={tl.navTitle}>{g.title}</span>
              {g.tools.map((t) => (
                <button key={t.id} type="button" className={tl.navItem} aria-current={tab === t.id ? "page" : undefined} onClick={() => pick(t.id)}>
                  <span className={tl.navIco} aria-hidden="true"><t.icon size={15} /></span>
                  <span className={tl.navTxt}><b>{t.label}</b><small>{t.q}</small></span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <section className={tl.panel} aria-labelledby="tool-title">
          <div className={tl.panelHead}>
            <span className={tl.panelIco} aria-hidden="true"><cur.icon size={18} /></span>
            <div>
              <h2 id="tool-title" className={tl.panelTitle}>{cur.label}</h2>
              <p className={tl.panelSub}>{cur.desc}</p>
            </div>
          </div>
          <div className={tl.legacy}>
            {tab === "position" && <PositionSize sym={currencySymbol} />}
            {tab === "rmultiple" && <RMultiple sym={currencySymbol} />}
            {tab === "pnl" && <Pnl sym={currencySymbol} />}
            {tab === "breakeven" && <Breakeven />}
            {tab === "ror" && <RiskOfRuin />}
          </div>
        </section>
      </div>
    </div>
  );
}
