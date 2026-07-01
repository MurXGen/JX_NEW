"use client";

/* In-app Tools / calculators — the same maths as the public /tools pages, but
   themed for the dashboard and with a live trade-setup chart (area or
   candlestick) that illustrates the entry / stop / target / exit the user
   types. Reached from the desktop sidebar and the mobile Settings list. */

import { useMemo, useState } from "react";
import { Calculator, Percent, TrendingUp, Target, ShieldAlert, CandlestickChart, AreaChart } from "lucide-react";

const TABS = [
  { id: "position", label: "Position size", icon: Calculator },
  { id: "rmultiple", label: "R-multiple", icon: Percent },
  { id: "pnl", label: "Profit / Loss", icon: TrendingUp },
  { id: "breakeven", label: "Breakeven win-rate", icon: Target },
  { id: "ror", label: "Risk of ruin", icon: ShieldAlert },
];

const num = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };
const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

/* ---------- shared bits ---------- */
function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="jx-setrow__sub" style={{ display: "block", marginBottom: 6 }}>{label}</label>
      <div className="jx-input" style={{ height: 42 }}>
        <input inputMode="decimal" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function Stat({ label, value, color, sub }) {
  return (
    <div style={{ flex: 1, minWidth: 140, padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}>
      <div style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{label}</div>
      <div style={{ font: "var(--text-title)", fontWeight: 700, color: color || "var(--color-text-primary)" }}>{value}</div>
      {sub && <div style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Worked({ lines }) {
  if (!lines?.length) return null;
  return (
    <div style={{ marginTop: "var(--space-3)", padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--color-bg-muted)", border: "1px dashed var(--color-border)" }}>
      <div style={{ font: "var(--text-label)", letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 6 }}>How this is calculated</div>
      {lines.map((l, i) => (
        <div key={i} style={{ font: `${i === lines.length - 1 ? 600 : 400} 13px/1.7 var(--jx-font, Poppins)`, color: i === lines.length - 1 ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
          {i === lines.length - 1 ? "= " : ""}{l}
        </div>
      ))}
    </div>
  );
}

/* ---------- the trade-setup chart (area | candles) ---------- */
function seeded(s) { return function () { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function TradeSetupChart({ entry, stop, target, exit, dir = "long", sym = "$" }) {
  const [mode, setMode] = useState("area");
  const e = num(entry), s = num(stop), tg = num(target), ex = num(exit);
  const levels = [e, s, tg, ex].filter((v) => Number.isFinite(v) && v > 0);
  const hasChart = e > 0 && levels.length >= 2;

  const W = 560, H = 220, padTop = 16, padBot = 16, plotR = 92;
  let lo = Math.min(...levels), hi = Math.max(...levels);
  if (lo === hi) { lo *= 0.99; hi *= 1.01; }
  const padP = (hi - lo) * 0.14; lo -= padP; hi += padP;
  const yOf = (p) => padTop + (1 - (p - lo) / (hi - lo)) * (H - padTop - padBot);
  const plotW = W - plotR;

  const endPrice = ex > 0 ? ex : (tg > 0 ? tg : e);
  const profit = dir === "long" ? endPrice >= e : endPrice <= e;
  const lineColor = profit ? "var(--color-success)" : "var(--color-danger)";

  // deterministic illustrative path entry → endPrice
  const N = 7;
  const rand = seeded(Math.round((e + s + tg + ex) * 100) || 1);
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const base = e + (endPrice - e) * t;
    const wobble = (rand() - 0.5) * (hi - lo) * 0.06 * Math.sin(t * Math.PI);
    pts.push({ x: 6 + t * (plotW - 12), price: base + (i === 0 || i === N ? 0 : wobble) });
  }

  const Level = ({ price, label, color }) => {
    if (!(price > 0)) return null;
    const y = yOf(price);
    return (
      <g>
        <line x1="0" y1={y} x2={plotW} y2={y} stroke={color} strokeWidth="1" strokeDasharray="4 4" opacity="0.8" />
        <rect x={plotW + 4} y={y - 9} width={plotR - 6} height="18" rx="4" fill={color} opacity="0.16" />
        <text x={plotW + 10} y={y + 4} style={{ font: "600 11px Poppins" }} fill={color}>{label} {sym}{fmt(price)}</text>
      </g>
    );
  };

  return (
    <div className="jx-card" style={{ marginTop: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>Trade setup</span>
        <div className="jx-seg jx-seg--inline">
          <button className={`jx-seg__btn ${mode === "area" ? "jx-seg__btn--active" : ""}`} onClick={() => setMode("area")}>
            <AreaChart size={14} /> Area
          </button>
          <button className={`jx-seg__btn ${mode === "candles" ? "jx-seg__btn--active" : ""}`} onClick={() => setMode("candles")}>
            <CandlestickChart size={14} /> Candles
          </button>
        </div>
      </div>

      {!hasChart ? (
        <div style={{ padding: "28px 0", textAlign: "center", font: "var(--text-small)", color: "var(--color-text-muted)" }}>
          Enter an entry and at least one of stop / target / exit to see the chart.
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} role="img" aria-label="Trade setup chart">
          {/* risk band entry↔stop (red), reward band entry↔target (green) */}
          {s > 0 && <rect x="0" y={Math.min(yOf(e), yOf(s))} width={plotW} height={Math.abs(yOf(e) - yOf(s))} fill="var(--color-danger)" opacity="0.08" />}
          {tg > 0 && <rect x="0" y={Math.min(yOf(e), yOf(tg))} width={plotW} height={Math.abs(yOf(e) - yOf(tg))} fill="var(--color-success)" opacity="0.08" />}

          {mode === "area" ? (
            <>
              <path d={`M ${pts[0].x} ${yOf(pts[0].price)} ${pts.slice(1).map((p) => `L ${p.x} ${yOf(p.price)}`).join(" ")} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`} fill={lineColor} opacity="0.12" />
              <path d={`M ${pts[0].x} ${yOf(pts[0].price)} ${pts.slice(1).map((p) => `L ${p.x} ${yOf(p.price)}`).join(" ")}`} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" />
            </>
          ) : (
            pts.slice(1).map((p, i) => {
              const prev = pts[i];
              const up = p.price >= prev.price;
              const col = up ? "var(--color-success)" : "var(--color-danger)";
              const cx = p.x;
              const oY = yOf(prev.price), cY = yOf(p.price);
              const top = Math.min(oY, cY), bh = Math.max(3, Math.abs(oY - cY));
              const wick = (hi - lo) * 0.03;
              return (
                <g key={i}>
                  <line x1={cx} y1={yOf(Math.max(prev.price, p.price) + wick)} x2={cx} y2={yOf(Math.min(prev.price, p.price) - wick)} stroke={col} strokeWidth="1.5" />
                  <rect x={cx - 5} y={top} width="10" height={bh} rx="1.5" fill={col} />
                </g>
              );
            })
          )}

          {/* level lines on top */}
          <Level price={e} label="Entry" color="var(--yellow-500)" />
          <Level price={s} label="Stop" color="var(--color-danger)" />
          <Level price={tg} label="Target" color="var(--color-success)" />
          {ex > 0 && ex !== tg && <Level price={ex} label="Exit" color="var(--color-text-secondary)" />}
        </svg>
      )}

      {hasChart && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: "var(--space-2)", font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 2, background: "var(--color-danger)", opacity: 0.5 }} /> Risk zone</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 2, background: "var(--color-success)", opacity: 0.5 }} /> Reward zone</span>
        </div>
      )}
    </div>
  );
}

/* ---------- calculators ---------- */
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
        <Field label={`Account (${sym})`} value={account} onChange={setAccount} />
        <Field label="Risk per trade (%)" value={riskPct} onChange={setRiskPct} />
        <Field label={`Entry (${sym})`} value={entry} onChange={setEntry} />
        <Field label={`Stop (${sym})`} value={stop} onChange={setStop} />
        <Field label={`Target (${sym}) — optional`} value={target} onChange={setTarget} placeholder="e.g. 106" />
      </div>
      {perUnit > 0 && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: "var(--space-4)" }}>
            <Stat label="Risk amount" value={`${sym}${fmt(riskAmt)}`} color="var(--color-danger)" sub={`${rp}% of account`} />
            <Stat label="Risk per unit (1R)" value={`${sym}${fmt(perUnit)}`} />
            <Stat label="Position size" value={`${fmt(qty)} units`} color="var(--yellow-500)" />
            {tg > 0 && <Stat label="Potential profit" value={`${sym}${fmt(profit)}`} color="var(--color-success)" sub={`${fmt(rr)}R`} />}
          </div>
          <Worked lines={[
            `Risk amount = ${sym}${fmt(acc)} × ${rp}% = ${sym}${fmt(riskAmt)}`,
            `Position size = risk ÷ (entry − stop) = ${sym}${fmt(riskAmt)} ÷ ${sym}${fmt(perUnit)} = ${fmt(qty)} units`,
          ]} />
        </>
      )}
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
  const c = R >= 0 ? "var(--color-success)" : "var(--color-danger)";
  return (
    <>
      <div className="jx-seg jx-seg--inline" style={{ marginBottom: 14 }}>
        <button className={`jx-seg__btn ${dir === "long" ? "jx-seg__btn--active" : ""}`} onClick={() => setDir("long")}>Long</button>
        <button className={`jx-seg__btn ${dir === "short" ? "jx-seg__btn--active" : ""}`} onClick={() => setDir("short")}>Short</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
        <Field label={`Entry (${sym})`} value={entry} onChange={setEntry} />
        <Field label={`Stop (${sym})`} value={stop} onChange={setStop} />
        <Field label={`Exit (${sym})`} value={exit} onChange={setExit} />
      </div>
      {risk > 0 && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: "var(--space-4)" }}>
            <Stat label="Risk per unit (1R)" value={`${sym}${fmt(risk)}`} />
            <Stat label="P&L per unit" value={`${sym}${fmt(pnl)}`} color={pnl >= 0 ? "var(--color-success)" : "var(--color-danger)"} />
            <Stat label="R-multiple" value={`${R >= 0 ? "+" : ""}${fmt(R)}R`} color={c} />
          </div>
          <Worked lines={[
            `1R = |entry − stop| = ${sym}${fmt(risk)}`,
            `R-multiple = P&L ÷ 1R = ${sym}${fmt(pnl)} ÷ ${sym}${fmt(risk)} = ${R >= 0 ? "+" : ""}${fmt(R)}R`,
          ]} />
        </>
      )}
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
  const c = net >= 0 ? "var(--color-success)" : "var(--color-danger)";
  return (
    <>
      <div className="jx-seg jx-seg--inline" style={{ marginBottom: 14 }}>
        <button className={`jx-seg__btn ${dir === "long" ? "jx-seg__btn--active" : ""}`} onClick={() => setDir("long")}>Long</button>
        <button className={`jx-seg__btn ${dir === "short" ? "jx-seg__btn--active" : ""}`} onClick={() => setDir("short")}>Short</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
        <Field label={`Entry (${sym})`} value={entry} onChange={setEntry} />
        <Field label={`Exit (${sym})`} value={exit} onChange={setExit} />
        <Field label="Quantity" value={qty} onChange={setQty} />
        <Field label={`Fees (${sym}) — optional`} value={fees} onChange={setFees} placeholder="brokerage + tax" />
      </div>
      {q > 0 && en > 0 && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: "var(--space-4)" }}>
            <Stat label="Gross P&L" value={`${sym}${fmt(gross)}`} color={gross >= 0 ? "var(--color-success)" : "var(--color-danger)"} />
            <Stat label="Net P&L" value={`${sym}${fmt(net)}`} color={c} />
            <Stat label="Return" value={`${pct >= 0 ? "+" : ""}${fmt(pct)}%`} color={c} />
          </div>
          <Worked lines={[
            `Gross = (exit − entry)${dir === "short" ? " × −1" : ""} × qty = ${sym}${fmt(gross)}`,
            `Return = net ÷ cost = ${sym}${fmt(net)} ÷ ${sym}${fmt(cost)} = ${pct >= 0 ? "+" : ""}${fmt(pct)}%`,
          ]} />
        </>
      )}
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
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
        <Field label="Reward : risk (R)" value={rr} onChange={setRr} />
        <Field label="Your win rate (%)" value={winRate} onChange={setWinRate} />
      </div>
      {R > 0 && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: "var(--space-4)" }}>
            <Stat label="Breakeven win rate" value={`${fmt(be)}%`} color="var(--yellow-500)" sub={`at ${fmt(R)}R`} />
            <Stat label="Expectancy" value={`${exp >= 0 ? "+" : ""}${fmt(exp)}R`} color={exp >= 0 ? "var(--color-success)" : "var(--color-danger)"} sub="per trade" />
            <Stat label="Edge" value={ok ? "Positive ✓" : "Negative ✗"} color={ok ? "var(--color-success)" : "var(--color-danger)"} />
          </div>
          <Worked lines={[
            `Breakeven = 1 ÷ (1 + R) = 1 ÷ ${fmt(1 + R)} = ${fmt(be)}%`,
            `Expectancy = (${fmt(wr)}% × ${fmt(R)}) − ${fmt(100 - wr)}% = ${exp >= 0 ? "+" : ""}${fmt(exp)}R`,
          ]} />
        </>
      )}
    </>
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
  const col = ror < 5 ? "var(--color-success)" : ror < 25 ? "var(--yellow-500)" : "var(--color-danger)";
  const verdict = ror < 5 ? "Low risk — survivable" : ror < 25 ? "Caution — consider smaller size" : "Dangerous — reduce risk per trade";
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 14 }}>
        <Field label="Win rate (%)" value={winRate} onChange={setWinRate} />
        <Field label="Reward : risk (R)" value={payoff} onChange={setPayoff} />
        <Field label="Risk per trade (%)" value={riskPct} onChange={setRiskPct} />
        <Field label="Ruin = drawdown (%)" value={dd} onChange={setDd} />
        <Field label="Over how many trades" value={trades} onChange={setTrades} />
      </div>
      <div className="jx-card" style={{ marginTop: "var(--space-4)", textAlign: "center" }}>
        <div style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>Estimated risk of ruin</div>
        <div style={{ font: "800 40px Poppins", color: col, letterSpacing: "-1px" }}>{ror.toFixed(1)}%</div>
        <div style={{ font: "var(--text-body-md)", fontWeight: 600, color: col }}>{verdict}</div>
        <div style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: 6 }}>
          Expectancy {exp >= 0 ? "+" : ""}{exp.toFixed(2)}R · {inp.trades} trades · Monte Carlo (5,000 runs)
        </div>
        {exp < 0 && <div style={{ font: "var(--text-caption)", color: "var(--color-danger)", marginTop: 6 }}>Negative edge — no position size makes this safe. Fix the strategy first.</div>}
      </div>
    </>
  );
}

export default function ToolsPanel({ currencySymbol = "$" }) {
  const [tab, setTab] = useState("position");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <div style={{ font: "var(--text-h2)", fontWeight: 700 }}>Trading calculators</div>
        <div style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>Size your risk, measure trades in R, and visualise the setup before you take it.</div>
      </div>

      {/* tab chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 999, cursor: "pointer",
              font: "var(--text-small)", fontWeight: 600,
              border: `1px solid ${tab === t.id ? "var(--color-primary)" : "var(--color-border)"}`,
              background: tab === t.id ? "var(--color-primary-subtle)" : "var(--color-bg-surface)",
              color: tab === t.id ? "var(--yellow-600, var(--yellow-500))" : "var(--color-text-secondary)",
            }}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div className="jx-card">
        {tab === "position" && <PositionSize sym={currencySymbol} />}
        {tab === "rmultiple" && <RMultiple sym={currencySymbol} />}
        {tab === "pnl" && <Pnl sym={currencySymbol} />}
        {tab === "breakeven" && <Breakeven />}
        {tab === "ror" && <RiskOfRuin />}
      </div>
    </div>
  );
}
