"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Plus } from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";
import CountUp from "./CountUp";
import Tip from "./Tip";
import SampleDataBanner from "./SampleDataBanner";
import { jxEase } from "./easing";

/* ---- chart morphing: animate between datasets on range switches ---- */
const resample = (arr, n) => {
  if (!arr.length) return Array(n).fill(0);
  if (arr.length === 1) return Array(n).fill(arr[0]);
  return [...Array(n)].map((_, i) => {
    const pos = (i / (n - 1)) * (arr.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(arr.length - 1, lo + 1);
    return arr[lo] + (arr[hi] - arr[lo]) * (pos - lo);
  });
};

function useMorph(values, duration = 0.7) {
  const [display, setDisplay] = useState(values);
  const prevRef = useRef(null);

  useEffect(() => {
    const next = values;
    const prev = prevRef.current;
    prevRef.current = next;
    if (!prev || (!prev.length && !next.length)) {
      setDisplay(next);
      return;
    }
    const n = Math.max(prev.length, next.length, 2);
    const from = resample(prev, n);
    const to = resample(next, n);
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const e = jxEase(t);
      setDisplay(from.map((v, i) => v + (to[i] - v) * e));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(next); // settle on exact data
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values)]);

  return display;
}

const BAR_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/* Figma "Dashboard / Desktop" (22721:51429) + "Components / Analytics
   & Charts" (22688:51368). Dependency-free inline SVG charts; every
   time-range control filters the underlying trades for real. */

const fmt = (v, d = 2) =>
  Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
const k = (v, sym = "$") => {
  const a = Math.abs(v);
  const s =
    a >= 1000
      ? `${sym}${fmt(a / 1000, 2)}k`
      : `${sym}${fmt(a, a < 10 ? 2 : 0)}`;
  return `${v < 0 ? "−" : "+"}${s}`;
};

/* ---------------- SVG chart primitives ---------------- */

const pts = (values, w, h, pad = 6) => {
  if (values.length < 2) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v, i) => [
    pad + (i / (values.length - 1)) * (w - pad * 2),
    h - pad - ((v - min) / span) * (h - pad * 2),
  ]);
};

/* invisible hover columns over a chart that reveal per-point tooltips */
function HoverColumns({ tips }) {
  if (!tips?.length) return null;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
      {tips.map((t, i) => (
        <Tip key={i} content={t} block style={{ flex: 1 }}>
          <span className="jx-tip--col" style={{ flex: 1 }} />
        </Tip>
      ))}
    </div>
  );
}

function AreaChart({ values, height = 160, labels, tips }) {
  const id = useId();
  const w = 600;
  const morphed = useMorph(values);
  const p = pts(morphed, w, height);
  if (p.length < 2) return <Empty height={height} />;
  const line = p.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const area = `${line} L${p[p.length - 1][0]},${height} L${p[0][0]},${height} Z`;
  return (
    <div>
      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${w} ${height}`}
          style={{ width: "100%", display: "block" }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--yellow-300)"
                stopOpacity="0.4"
              />
              <stop
                offset="100%"
                stopColor="var(--yellow-300)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${id})`} />
          <path
            d={line}
            fill="none"
            stroke="var(--yellow-400)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
        <HoverColumns tips={tips} />
      </div>
      {labels && <AxisLabels labels={labels} />}
    </div>
  );
}

function LineChart({ values, height = 140, labels, tips }) {
  const w = 600;
  const morphed = useMorph(values);
  const p = pts(morphed, w, height);
  if (p.length < 2) return <Empty height={height} />;
  const line = p.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const mid = p[Math.floor(p.length / 2)];
  return (
    <div>
      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${w} ${height}`}
          style={{ width: "100%", display: "block" }}
          preserveAspectRatio="none"
        >
          <path
            d={line}
            fill="none"
            stroke="var(--yellow-400)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx={mid[0]} cy={mid[1]} r="4" fill="var(--yellow-400)" />
        </svg>
        <HoverColumns tips={tips} />
      </div>
      {labels && <AxisLabels labels={labels} />}
    </div>
  );
}

function BarChart({ values, height = 140, tips }) {
  const morphed = useMorph(values);
  if (!morphed.length) return <Empty height={height} />;
  const max = Math.max(...morphed.map((v) => Math.abs(v)), 1);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "3%",
        height,
        width: "100%",
      }}
    >
      {morphed.map((v, i) => {
        const hPct = Math.max(8, (Math.abs(v) / max) * 48);
        return (
          <Tip
            key={i}
            content={tips?.[i]}
            block
            style={{ flex: 1, height: "100%" }}
          >
            <div
              className="jx-tip--col"
              style={{ flex: 1, height: "100%", position: "relative" }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  borderRadius: 4,
                  background:
                    v >= 0 ? "var(--color-success)" : "var(--color-danger)",
                  height: `${hPct}%`,
                  transition: `background 0.4s ${BAR_EASE}`,
                  ...(v >= 0 ? { bottom: "50%" } : { top: "50%" }),
                }}
              />
            </div>
          </Tip>
        );
      })}
    </div>
  );
}

function Donut({ segments, size = 120 }) {
  const morphedVals = useMorph(segments.map((s) => s.value));
  const total = morphedVals.reduce((s, x) => s + x, 0) || 1;
  const r = 44;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg
      viewBox="0 0 120 120"
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      {segments.map((s, i) => {
        const frac = (morphedVals[i] ?? 0) / total;
        const dash = `${frac * c} ${c}`;
        const offset = -acc * c;
        acc += frac;
        return (
          <circle
            key={i}
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="18"
            strokeDasharray={dash}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
          />
        );
      })}
    </svg>
  );
}

function AxisLabels({ labels }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        font: "var(--text-caption)",
        color: "var(--color-text-muted)",
        marginTop: 6,
      }}
    >
      {labels.map((l, i) => (
        <span key={i}>{l}</span>
      ))}
    </div>
  );
}

function Empty({ height }) {
  return (
    <div
      style={{
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        font: "var(--text-small)",
        color: "var(--color-text-muted)",
      }}
    >
      Not enough data in this range
    </div>
  );
}

/* ---- equity growth candlesticks ---- */
function CandleChart({ candles, height = 220, sym = "$" }) {
  if (!candles.length) return <Empty height={height} />;
  const lo = Math.min(...candles.map((c) => c.l));
  const hi = Math.max(...candles.map((c) => c.h));
  const span = hi - lo || 1;
  const y = (v) => height - 8 - ((v - lo) / span) * (height - 16);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: "0.6%",
        height,
        width: "100%",
      }}
    >
      {candles.map((c, i) => {
        const up = c.c >= c.o;
        const color = up ? "var(--color-success)" : "var(--color-danger)";
        const bodyTop = y(Math.max(c.o, c.c));
        const bodyH = Math.max(2, Math.abs(y(c.o) - y(c.c)));
        return (
          <Tip
            key={`${c.label}-${i}`}
            content={`${c.label}\nOpen ${sym}${fmt(c.o, 0)} · Close ${sym}${fmt(c.c, 0)}\nHigh ${sym}${fmt(c.h, 0)} · Low ${sym}${fmt(c.l, 0)}`}
            block
            style={{ flex: 1, minWidth: 0 }}
          >
            <motion.div
              className="jx-tip--col"
              initial={{ opacity: 0, scaleY: 0.4 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{
                delay: Math.min(i * 0.025, 0.8),
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                flex: 1,
                position: "relative",
                transformOrigin: "bottom",
                height: "100%",
              }}
            >
              {/* wick */}
              <span
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  top: y(c.h),
                  height: Math.max(1, y(c.l) - y(c.h)),
                  width: 1.5,
                  background: color,
                  opacity: 0.8,
                }}
              />
              {/* body */}
              <span
                style={{
                  position: "absolute",
                  left: "12%",
                  right: "12%",
                  top: bodyTop,
                  height: bodyH,
                  background: color,
                  borderRadius: 2,
                }}
              />
            </motion.div>
          </Tip>
        );
      })}
    </div>
  );
}

/* bucket closed trades into equity candles starting from the initial balance */
const buildEquityCandles = (closed, startingBalance, tf) => {
  if (!closed.length) return [];
  const keyOf = (d) => {
    const dt = new Date(d);
    if (tf === "1D") return dt.toDateString();
    if (tf === "1W") {
      const monday = new Date(dt);
      monday.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
      return monday.toDateString();
    }
    if (tf === "1M") return `${dt.getFullYear()}-${dt.getMonth()}`;
    return String(dt.getFullYear());
  };
  const labelOf = (d) => {
    const dt = new Date(d);
    if (tf === "1D" || tf === "1W")
      return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    if (tf === "1M")
      return dt.toLocaleDateString("en-GB", {
        month: "short",
        year: "2-digit",
      });
    return String(dt.getFullYear());
  };

  const candles = [];
  let equity = startingBalance || 0;
  let cur = null;
  closed.forEach((t) => {
    const k = keyOf(t.closeTime);
    if (!cur || cur.key !== k) {
      if (cur) candles.push(cur);
      cur = {
        key: k,
        label: labelOf(t.closeTime),
        o: equity,
        h: equity,
        l: equity,
        c: equity,
      };
    }
    equity += Number(t.pnl) || 0;
    cur.c = equity;
    cur.h = Math.max(cur.h, equity);
    cur.l = Math.min(cur.l, equity);
  });
  if (cur) candles.push(cur);
  return candles.slice(-60);
};

function MiniSeg({ items, value, onChange }) {
  return (
    <div className="jx-seg jx-seg--inline" style={{ padding: 3 }}>
      {items.map((it) => (
        <button
          key={it}
          className={`jx-seg__btn ${value === it ? "jx-seg__btn--active" : ""}`}
          style={{
            padding: "5px 10px",
            font: "var(--text-caption)",
            fontWeight: 600,
          }}
          onClick={() => onChange(it)}
        >
          {it}
        </button>
      ))}
    </div>
  );
}

function Progress({ pct, color = "var(--color-success)" }) {
  return (
    <div className="jx-progress" style={{ height: 6 }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          background: color,
          borderRadius: 999,
          transition: `width 0.9s ${BAR_EASE}`,
        }}
      />
    </div>
  );
}

const LABEL = {
  font: "var(--text-label)",
  letterSpacing: "0.6px",
  textTransform: "uppercase",
  color: "var(--color-text-muted)",
};
const DONUT_COLORS = [
  "var(--yellow-300)",
  "var(--green-500)",
  "var(--red-500)",
  "var(--gray-400)",
  "#3b82f6",
  "#8b5cf6",
];

/* range helpers — windows are anchored to the latest trade so sample
   data from any date still renders */
const DAYS = {
  "1D": 1,
  "7D": 7,
  "1W": 7,
  "21D": 21,
  "30D": 30,
  "1M": 30,
  "90D": 90,
  "3M": 90,
  "1Y": 365,
};
const inWindow = (trades, rangeKey) => {
  if (!trades.length) return [];
  const days = DAYS[rangeKey];
  if (!days) return trades;
  const latest = new Date(trades[trades.length - 1].closeTime).getTime();
  const from = latest - days * 864e5;
  return trades.filter((t) => new Date(t.closeTime).getTime() >= from);
};

/* ================================================================ */
export default function OverviewPanel({
  trades = [],
  currencySymbol = "$",
  userName,
  usingDummy,
  startingBalance = 0,
  onLogTrade,
  onImport,
}) {
  const [heroRange, setHeroRange] = useState("30D");
  const [candleTF, setCandleTF] = useState("1D");
  const analyticsRange = "ALL"; // header range tabs removed — charts cover full history
  const [pnlRange, setPnlRange] = useState("1M");
  const [dailyRange, setDailyRange] = useState("Week");
  const [wrRange, setWrRange] = useState("1M");

  /* monthly target (Settings → Apply) */
  const [target, setTarget] = useState(15000);
  useEffect(() => {
    const read = () =>
      setTarget(Number(localStorage.getItem("jx-monthly-target")) || 15000);
    read();
    const onChange = (e) => setTarget(Number(e.detail) || 15000);
    window.addEventListener("jx-target-changed", onChange);
    return () => window.removeEventListener("jx-target-changed", onChange);
  }, []);

  const closed = useMemo(
    () =>
      trades
        .filter((t) => t.closeTime)
        .sort((a, b) => new Date(a.closeTime) - new Date(b.closeTime)),
    [trades],
  );

  /* ---- hero (range-filtered) ---- */
  const hero = useMemo(() => {
    const list = inWindow(closed, heroRange);
    const prevCutoff = list.length ? new Date(list[0].closeTime).getTime() : 0;
    const pnl = list.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const wins = list.filter((t) => t.pnl > 0).length;
    const byDay = {};
    list.forEach((t) => {
      const d = new Date(t.closeTime).toDateString();
      byDay[d] = (byDay[d] || 0) + (Number(t.pnl) || 0);
    });
    const bestDay = Object.values(byDay).length
      ? Math.max(...Object.values(byDay))
      : 0;
    const volume = list.reduce(
      (s, t) =>
        s +
        Math.abs(
          (t.avgEntryPrice || t.entryPrice || 0) * (t.totalQuantity || 0),
        ),
      0,
    );
    let run = 0;
    const spark = list.map((t) => (run += Number(t.pnl) || 0));
    const prev = closed
      .filter((t) => new Date(t.closeTime).getTime() < prevCutoff)
      .reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const delta = prev !== 0 ? (pnl / Math.abs(prev)) * 100 : null;
    return {
      pnl,
      trades: list.length,
      winRate: list.length ? (wins / list.length) * 100 : 0,
      bestDay,
      volume,
      spark,
      delta,
    };
  }, [closed, heroRange]);

  /* ---- all-time + per-window analytics ---- */
  const S = useMemo(() => {
    const win = inWindow(closed, analyticsRange);
    const pnls = win.map((t) => Number(t.pnl) || 0);
    const allPnls = closed.map((t) => Number(t.pnl) || 0);
    const net = allPnls.reduce((s, p) => s + p, 0);
    const winNet = pnls.reduce((s, p) => s + p, 0);
    const wins = pnls.filter((p) => p > 0);
    const losses = pnls.filter((p) => p < 0);
    const grossWin = wins.reduce((s, p) => s + p, 0);
    const grossLoss = Math.abs(losses.reduce((s, p) => s + p, 0));

    /* this calendar month (for the goal card) */
    const now = new Date();
    const monthPnl = closed
      .filter((t) => {
        const d = new Date(t.closeTime);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      })
      .reduce((s, t) => s + (Number(t.pnl) || 0), 0);

    const byDay = new Map();
    win.forEach((t) => {
      const d = new Date(t.closeTime).toDateString();
      byDay.set(d, (byDay.get(d) || 0) + (Number(t.pnl) || 0));
    });
    const daily = [...byDay.values()];
    const dailyLabels = [...byDay.keys()].map((d) =>
      new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
    );
    const mean = daily.length
      ? daily.reduce((s, v) => s + v, 0) / daily.length
      : 0;
    const sd =
      daily.length > 1
        ? Math.sqrt(
            daily.reduce((s, v) => s + (v - mean) ** 2, 0) / (daily.length - 1),
          )
        : 0;

    let streak = 0;
    for (let i = allPnls.length - 1; i >= 0 && allPnls[i] > 0; i--) streak++;
    let best = 0,
      cur = 0;
    allPnls.forEach((p) => {
      cur = p > 0 ? cur + 1 : 0;
      best = Math.max(best, cur);
    });

    const holds = win
      .filter((t) => t.openTime)
      .map((t) => new Date(t.closeTime) - new Date(t.openTime));
    holds.sort((a, b) => a - b);
    const medHold = holds.length ? holds[Math.floor(holds.length / 2)] : null;
    const holdStr = medHold
      ? `${Math.floor(medHold / 3600000)}h ${Math.round((medHold % 3600000) / 60000)}m`
      : "—";

    /* per symbol / allocation / volume — within analytics window */
    const bySym = new Map();
    win.forEach((t) => {
      const s = t.symbol || t.ticker || "—";
      bySym.set(s, (bySym.get(s) || 0) + (Number(t.pnl) || 0));
    });
    const symPnl = [...bySym.entries()].sort((a, b) => b[1] - a[1]);

    const alloc = new Map();
    win.forEach((t) => {
      const s = (t.symbol || t.ticker || "—").split("/")[0];
      alloc.set(
        s,
        (alloc.get(s) || 0) +
          Math.abs(
            (t.avgEntryPrice || t.entryPrice || 1) * (t.totalQuantity || 0),
          ),
      );
    });
    const allocList = [...alloc.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    const volByDay = new Map();
    win.forEach((t) => {
      const d = new Date(t.closeTime).toDateString();
      volByDay.set(
        d,
        (volByDay.get(d) || 0) +
          Math.abs(
            (t.avgEntryPrice || t.entryPrice || 1) * (t.totalQuantity || 0),
          ) *
            (t.pnl >= 0 ? 1 : -1),
      );
    });
    const volLabels = [...volByDay.keys()].map((d) =>
      new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
    );

    /* new-architecture analytics: strategy / discipline / emotion */
    const byStrategy = new Map();
    win.forEach((t) => {
      const s = t.strategy || (t.reason || [])[0];
      if (!s) return;
      if (!byStrategy.has(s)) byStrategy.set(s, { pnl: 0, n: 0, w: 0 });
      const e = byStrategy.get(s);
      e.pnl += Number(t.pnl) || 0;
      e.n++;
      if (t.pnl > 0) e.w++;
    });
    const stratList = [...byStrategy.entries()]
      .sort((a, b) => b[1].pnl - a[1].pnl)
      .slice(0, 5);

    const planned = win.filter((t) => t.rulesFollowed === true);
    const unplanned = win.filter((t) => t.rulesFollowed === false);
    const wr = (list) =>
      list.length
        ? (list.filter((t) => t.pnl > 0).length / list.length) * 100
        : null;
    const confidences = win
      .map((t) => Number(t.confidence))
      .filter((c) => c > 0);
    const discipline = {
      plannedN: planned.length,
      plannedWr: wr(planned),
      unplannedN: unplanned.length,
      unplannedWr: wr(unplanned),
      avgConfidence: confidences.length
        ? confidences.reduce((s, c) => s + c, 0) / confidences.length
        : null,
    };

    return {
      net,
      winNet,
      total: win.length,
      winRate: win.length ? (wins.length / win.length) * 100 : 0,
      winCount: wins.length,
      lossCount: losses.length,
      avgWin: wins.length ? grossWin / wins.length : 0,
      avgLoss: losses.length ? grossLoss / losses.length : 0,
      largestWin: wins.length ? Math.max(...wins) : 0,
      profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
      sharpe: sd > 0 ? (mean / sd) * Math.sqrt(252) : null,
      streak,
      bestStreak: best,
      holdStr,
      daily,
      dailyLabels,
      symPnl,
      allocList,
      vols: [...volByDay.values()],
      volLabels,
      grossWin,
      grossLoss,
      monthPnl,
      stratList,
      discipline,
      winTrades: win,
    };
  }, [closed, analyticsRange]);

  /* ---- streaks & achievements (all-time, from closed trades) ---- */
  const ACH = useMemo(() => {
    const all = closed; // chronological
    const pnls = all.map((t) => Number(t.pnl) || 0);
    const total = all.length;

    // win streaks
    let curWin = 0,
      bestWin = 0,
      run = 0;
    pnls.forEach((p) => {
      run = p > 0 ? run + 1 : 0;
      bestWin = Math.max(bestWin, run);
    });
    for (let i = pnls.length - 1; i >= 0 && pnls[i] > 0; i--) curWin++;

    // green-day streaks
    const byDay = new Map();
    all.forEach((t) => {
      const d = new Date(t.closeTime).toDateString();
      byDay.set(d, (byDay.get(d) || 0) + (Number(t.pnl) || 0));
    });
    const days = [...byDay.entries()]
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([, v]) => v);
    let bestGreenDays = 0,
      dRun = 0,
      curGreenDays = 0;
    days.forEach((v) => {
      dRun = v > 0 ? dRun + 1 : 0;
      bestGreenDays = Math.max(bestGreenDays, dRun);
    });
    for (let i = days.length - 1; i >= 0 && days[i] > 0; i--) curGreenDays++;

    // P&L captured during the current win streak
    let streakPnl = 0;
    for (let i = pnls.length - 1; i >= 0 && pnls[i] > 0; i--)
      streakPnl += pnls[i];

    const net = pnls.reduce((s, p) => s + p, 0);
    const biggestWin = pnls.length ? Math.max(...pnls, 0) : 0;
    const wins = pnls.filter((p) => p > 0).length;
    const winRate = total ? (wins / total) * 100 : 0;
    const greenDays = days.filter((v) => v > 0).length;

    // achievement badges (milestones)
    const badges = [
      {
        id: "first",
        icon: "🎯",
        label: "First trade",
        got: total >= 1,
        hint: "Log your first trade",
      },
      {
        id: "ten",
        icon: "📒",
        label: "10 trades",
        got: total >= 10,
        hint: "Log 10 trades",
      },
      {
        id: "fifty",
        icon: "📚",
        label: "50 trades",
        got: total >= 50,
        hint: "Log 50 trades",
      },
      {
        id: "hundred",
        icon: "🏛️",
        label: "Centurion",
        got: total >= 100,
        hint: "Log 100 trades",
      },
      {
        id: "streak5",
        icon: "🔥",
        label: "5-win streak",
        got: bestWin >= 5,
        hint: "Win 5 in a row",
      },
      {
        id: "streak10",
        icon: "⚡",
        label: "10-win streak",
        got: bestWin >= 10,
        hint: "Win 10 in a row",
      },
      {
        id: "green5",
        icon: "🌱",
        label: "5 green days",
        got: bestGreenDays >= 5,
        hint: "5 profitable days in a row",
      },
      {
        id: "profit1k",
        icon: "💰",
        label: "$1k profit",
        got: net >= 1000,
        hint: "Reach $1,000 net P&L",
      },
      {
        id: "profit10k",
        icon: "💎",
        label: "$10k profit",
        got: net >= 10000,
        hint: "Reach $10,000 net P&L",
      },
      {
        id: "wr60",
        icon: "🎖️",
        label: "60% win rate",
        got: total >= 20 && winRate >= 60,
        hint: "60%+ win rate over 20+ trades",
      },
    ];
    const unlocked = badges.filter((b) => b.got).length;

    return {
      curWin,
      bestWin,
      curGreenDays,
      bestGreenDays,
      streakPnl,
      biggestWin,
      greenDays,
      badges,
      unlocked,
      total,
    };
  }, [closed]);

  /* cumulative series for its own range tab (+ per-point tooltips) */
  const [cumSeries, cumTips] = useMemo(() => {
    const list = inWindow(closed, pnlRange);
    let run = 0;
    const series = [];
    const tips = [];
    list.forEach((t) => {
      run += Number(t.pnl) || 0;
      series.push(run);
      tips.push(
        `${new Date(t.closeTime).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · ${t.symbol || ""}\n${k(Number(t.pnl) || 0, currencySymbol)} trade · ${k(run, currencySymbol)} total`,
      );
    });
    return [series, tips];
  }, [closed, pnlRange, currencySymbol]);

  /* win-rate trend for its own range tab */
  const wrSeries = useMemo(() => {
    const list = inWindow(closed, wrRange);
    if (list.length < 2) return [];
    /* bucket: 1W→day · 1M→3 days · 3M→week · 1Y→month */
    const bucketMs =
      wrRange === "1W"
        ? 864e5
        : wrRange === "1M"
          ? 3 * 864e5
          : wrRange === "3M"
            ? 7 * 864e5
            : 30 * 864e5;
    const buckets = new Map();
    list.forEach((t) => {
      const b = Math.floor(new Date(t.closeTime).getTime() / bucketMs);
      if (!buckets.has(b)) buckets.set(b, { w: 0, n: 0 });
      const e = buckets.get(b);
      e.n++;
      if (t.pnl > 0) e.w++;
    });
    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, e]) => (e.w / e.n) * 100);
  }, [closed, wrRange]);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();

  const goalPct = Math.min(100, (Math.max(0, S.monthPnl) / target) * 100);
  const maxSym = S.symPnl.length
    ? Math.max(...S.symPnl.map(([, v]) => Math.abs(v)), 1)
    : 1;
  const allocTotal = S.allocList.reduce((s, [, v]) => s + v, 0) || 1;
  const totalVolume = S.allocList.reduce((s, [, v]) => s + v, 0);
  const maxStrat = S.stratList.length
    ? Math.max(...S.stratList.map(([, v]) => Math.abs(v.pnl)), 1)
    : 1;

  const kpis = [
    {
      label: "Net P&L (all-time)",
      value: <CountUp value={S.net} format={(v) => k(v, currencySymbol)} />,
      sub: usingDummy ? "sample journal" : "across this journal",
      up: S.net >= 0,
    },
    {
      label: "Total trades",
      value: <CountUp value={S.total} />,
      sub: "across this journal",
    },
    {
      label: "Average win",
      value: <CountUp value={S.avgWin} format={(v) => k(v, currencySymbol)} />,
      sub: "per winning trade",
      up: true,
    },
    {
      label: "Average loss",
      value: (
        <CountUp
          value={S.avgLoss}
          format={(v) => `−${currencySymbol}${fmt(v, 0)}`}
        />
      ),
      sub: "per losing trade",
      up: false,
    },
    {
      label: "Largest win",
      value: (
        <CountUp value={S.largestWin} format={(v) => k(v, currencySymbol)} />
      ),
      sub: "single best trade",
      up: true,
    },
    { label: "Avg hold time", value: S.holdStr, sub: "median per trade" },
    {
      label: "Sharpe ratio",
      value: S.sharpe ? fmt(S.sharpe, 2) : "—",
      sub: "risk-adjusted return",
      up: (S.sharpe || 0) > 1,
    },
    {
      label: "Win streak",
      value: S.streak,
      sub: `best: ${S.bestStreak}`,
      up: S.streak > 0,
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
    >
      {/* ===== Greeting ===== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--space-3)",
        }}
      >
        <div>
          <div style={{ font: "var(--text-h2)" }}>
            {greeting}, {userName?.split(" ")[0] || "trader"}
          </div>
          <div
            style={{
              font: "var(--text-body)",
              color: "var(--color-text-muted)",
            }}
          >
            Here&apos;s your trading performance.
            {usingDummy && (
              <>
                {" "}
                <Badge variant="brand">Sample data</Badge>
              </>
            )}
          </div>
        </div>
        <Button variant="primary" icon={Plus} onClick={onLogTrade}>
          Log a trade
        </Button>
      </div>

      {/* sample-data nudge */}
      {usingDummy && (
        <SampleDataBanner onLog={onLogTrade} onImport={onImport} />
      )}

      {/* ===== Hero card ===== */}
      <div
        className="jx-card jx-hero-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.2fr) minmax(180px,1fr)",
          gap: "var(--space-5)",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "var(--space-2)",
            }}
          >
            <span style={LABEL}>
              Total profit ·{" "}
              {heroRange === "1D"
                ? "last day"
                : `last ${heroRange.toLowerCase()}`}
            </span>
            <MiniSeg
              items={["1D", "7D", "21D", "30D"]}
              value={heroRange}
              onChange={setHeroRange}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <span
              style={{
                font: "600 36px/42px var(--jx-font)",
                letterSpacing: "-1px",
                color:
                  hero.pnl >= 0
                    ? "var(--color-text-primary)"
                    : "var(--color-danger-strong)",
              }}
            >
              <CountUp value={hero.pnl} format={(v) => k(v, currencySymbol)} />
            </span>
            {hero.delta != null && (
              <Badge variant={hero.delta >= 0 ? "success" : "danger"}>
                {hero.delta >= 0 ? "▲" : "▼"} {fmt(Math.abs(hero.delta), 1)}%
              </Badge>
            )}
          </div>
          <div
            style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap" }}
          >
            {[
              ["Trades", hero.trades],
              ["Win rate", `${fmt(hero.winRate, 1)}%`],
              ["Best day", k(hero.bestDay, currencySymbol)],
              ["Volume", `${currencySymbol}${fmt(hero.volume / 1000, 0)}k`],
            ].map(([l, v]) => (
              <span
                key={l}
                style={{ display: "flex", flexDirection: "column" }}
              >
                <span
                  style={{
                    font: "var(--text-caption)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {l}
                </span>
                <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>
                  {v}
                </span>
              </span>
            ))}
          </div>
        </div>
        <AreaChart
          values={hero.spark.length > 1 ? hero.spark : [0, 0]}
          height={120}
        />
      </div>

      {/* ===== Progress cards ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        <div
          className="jx-card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <span style={LABEL}>Win rate</span>
          <Tip
            content={`${S.winCount} wins ÷ ${S.winCount + S.lossCount} closed trades`}
          >
            <span
              style={{
                font: "var(--text-stat)",
                letterSpacing: "-1px",
                cursor: "help",
              }}
            >
              <CountUp value={S.winRate} format={(v) => `${fmt(v, 1)}%`} />
            </span>
          </Tip>
          <Progress pct={S.winRate} />
          <span
            style={{
              font: "var(--text-caption)",
              color: "var(--color-text-muted)",
            }}
          >
            {S.winCount} W · {S.lossCount} L
          </span>
        </div>

        <div
          className="jx-card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={LABEL}>Monthly goal</span>
            <span
              style={{
                font: "var(--text-caption)",
                color: "var(--color-text-muted)",
              }}
            >
              {fmt(goalPct, 0)}%
            </span>
          </div>
          <Tip
            content={`This month's P&L vs your ${currencySymbol}${fmt(target, 0)} target\n${fmt(goalPct, 0)}% reached`}
          >
            <span
              style={{
                font: "var(--text-stat)",
                letterSpacing: "-1px",
                cursor: "help",
                color:
                  S.monthPnl >= 0
                    ? "var(--color-text-primary)"
                    : "var(--color-danger-strong)",
              }}
            >
              <CountUp
                value={S.monthPnl}
                format={(v) => k(v, currencySymbol)}
              />
            </span>
          </Tip>
          <Progress pct={goalPct} color="var(--color-primary)" />
          <span
            style={{
              font: "var(--text-caption)",
              color: "var(--color-text-muted)",
            }}
          >
            of {currencySymbol}
            {fmt(target / 1000, target >= 10000 ? 0 : 1)}k target this month ·
            set in Settings
          </span>
        </div>

        <div
          className="jx-card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={LABEL}>Profit factor</span>
            <span
              style={{
                font: "var(--text-caption)",
                color: "var(--color-text-muted)",
              }}
            >
              target 3.0
            </span>
          </div>
          <Tip
            content={
              S.profitFactor
                ? `Gross win ${k(S.grossWin, currencySymbol)} ÷ gross loss ${k(-S.grossLoss, currencySymbol)}`
                : "Needs at least one win and one loss"
            }
          >
            <span
              style={{
                font: "var(--text-stat)",
                letterSpacing: "-1px",
                cursor: "help",
              }}
            >
              {S.profitFactor ? (
                <CountUp value={S.profitFactor} format={(v) => fmt(v, 2)} />
              ) : (
                "—"
              )}
            </span>
          </Tip>
          <Progress pct={S.profitFactor ? (S.profitFactor / 3) * 100 : 0} />
          <span
            style={{
              font: "var(--text-caption)",
              color: "var(--color-text-muted)",
            }}
          >
            gross win ÷ gross loss
          </span>
        </div>

        <div
          className="jx-card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <span style={LABEL}>Discipline</span>
          <span style={{ font: "var(--text-stat)", letterSpacing: "-1px" }}>
            {S.discipline.plannedN + S.discipline.unplannedN > 0
              ? `${fmt((S.discipline.plannedN / (S.discipline.plannedN + S.discipline.unplannedN)) * 100, 0)}%`
              : "—"}
          </span>
          <Progress
            pct={
              S.discipline.plannedN + S.discipline.unplannedN > 0
                ? (S.discipline.plannedN /
                    (S.discipline.plannedN + S.discipline.unplannedN)) *
                  100
                : 0
            }
            color="var(--color-success)"
          />
          <span
            style={{
              font: "var(--text-caption)",
              color: "var(--color-text-muted)",
            }}
          >
            trades where you followed your plan
            {S.discipline.avgConfidence != null &&
              ` · avg confidence ${fmt(S.discipline.avgConfidence, 1)}★`}
          </span>
        </div>
      </div>

      {/* ===== Streaks & achievements ===== */}
      <div>
        <span className="jx-card__title">Streaks &amp; achievements</span>
        <div
          style={{
            font: "var(--text-caption)",
            color: "var(--color-text-muted)",
          }}
        >
          Momentum and milestones from your full history
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
          gap: "var(--space-4)",
          marginTop: "calc(var(--space-3) * -1)",
        }}
        className="jx-ach-grid"
      >
        {/* streak stats */}
        <div
          className="jx-card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <span className="jx-sect__icon">
              <Flame size={15} />
            </span>
            <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>
              Current momentum
            </span>
            {ACH.curWin > 0 && (
              <Badge variant="success">{ACH.curWin}-trade win streak 🔥</Badge>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))",
              gap: "var(--space-2)",
            }}
          >
            {[
              ["Win streak", ACH.curWin, `best ${ACH.bestWin}`],
              [
                "Green-day streak",
                ACH.curGreenDays,
                `best ${ACH.bestGreenDays}`,
              ],
              [
                "Streak P&L",
                k(ACH.streakPnl, currencySymbol),
                "this run",
                ACH.streakPnl >= 0,
              ],
              [
                "Biggest win",
                k(ACH.biggestWin, currencySymbol),
                "single trade",
                true,
              ],
            ].map(([l, v, sub, up]) => (
              <div
                key={l}
                style={{
                  padding: "var(--space-3)",
                  background: "var(--color-bg-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span
                  style={{
                    font: "var(--text-caption)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {l}
                </span>
                <span
                  style={{
                    font: "var(--text-h3)",
                    color:
                      up === undefined
                        ? "var(--color-text-primary)"
                        : up
                          ? "var(--color-success-strong)"
                          : "var(--color-danger-strong)",
                  }}
                >
                  {typeof v === "number" ? <CountUp value={v} /> : v}
                </span>
                <span
                  style={{
                    font: "var(--text-caption)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {sub}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* achievement badges */}
        <div
          className="jx-card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>
              Achievements
            </span>
            <Badge variant="brand">
              {ACH.unlocked}/{ACH.badges.length} unlocked
            </Badge>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
              gap: "var(--space-2)",
            }}
          >
            {ACH.badges.map((b) => (
              <Tip
                key={b.id}
                content={`${b.label}${b.got ? " — unlocked" : ` — ${b.hint}`}`}
                block
              >
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    textAlign: "center",
                    padding: "var(--space-3) var(--space-2)",
                    borderRadius: "var(--radius-md)",
                    background: b.got
                      ? "var(--color-primary-subtle)"
                      : "var(--color-bg-muted)",
                    border: `1px solid ${b.got ? "var(--color-primary)" : "var(--color-border)"}`,
                    opacity: b.got ? 1 : 0.5,
                    cursor: "help",
                  }}
                >
                  <span
                    style={{
                      fontSize: 22,
                      filter: b.got ? "none" : "grayscale(1)",
                    }}
                  >
                    {b.icon}
                  </span>
                  <span
                    style={{
                      font: "var(--text-caption)",
                      fontWeight: 600,
                      color: b.got
                        ? "var(--color-text-primary)"
                        : "var(--color-text-muted)",
                    }}
                  >
                    {b.label}
                  </span>
                </div>
              </Tip>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Key metrics ===== */}
      <span className="jx-card__title">Key metrics</span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: "var(--space-4)",
          marginTop: "calc(var(--space-3) * -1)",
        }}
      >
        {kpis.map((m) => (
          <div
            key={m.label}
            className="jx-card"
            style={{
              padding: "var(--space-4) var(--space-5)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={LABEL}>{m.label}</span>
            <Tip content={`${m.label} — ${m.sub}`}>
              <span style={{ font: "var(--text-h2)", cursor: "help" }}>
                {m.value}
              </span>
            </Tip>
            <span
              style={{
                font: "var(--text-caption)",
                color:
                  m.up === undefined
                    ? "var(--color-text-muted)"
                    : m.up
                      ? "var(--color-success)"
                      : "var(--color-danger)",
              }}
            >
              {m.up !== undefined && (m.up ? "↑ " : "↓ ")}
              <span style={{ color: "var(--color-text-muted)" }}>{m.sub}</span>
            </span>
          </div>
        ))}
      </div>

      {/* ===== Analytics ===== */}
      <div>
        <span className="jx-card__title">Analytics</span>
        <div
          style={{
            font: "var(--text-caption)",
            color: "var(--color-text-muted)",
          }}
        >
          Charts from your full trading history
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) minmax(240px, 1fr)",
          gap: "var(--space-4)",
          alignItems: "start",
        }}
        className="jx-ov-grid"
      >
        {/* left column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
            minWidth: 0,
          }}
        >
          {/* equity growth candles */}
          {(() => {
            const candles = buildEquityCandles(
              closed,
              startingBalance,
              candleTF,
            );
            const equityNow = candles.length
              ? candles[candles.length - 1].c
              : startingBalance;
            const growth =
              startingBalance > 0
                ? ((equityNow - startingBalance) / startingBalance) * 100
                : null;
            return (
              <div className="jx-card">
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "var(--space-2)",
                  }}
                >
                  <div>
                    <div
                      style={{ font: "var(--text-body-md)", fontWeight: 600 }}
                    >
                      Equity growth
                    </div>
                    <div style={{ font: "var(--text-h2)" }}>
                      <CountUp
                        value={equityNow}
                        format={(v) => `${currencySymbol}${fmt(v, 0)}`}
                      />
                    </div>
                    <Badge
                      variant={
                        equityNow >= startingBalance ? "success" : "danger"
                      }
                    >
                      {growth != null
                        ? `${growth >= 0 ? "+" : ""}${fmt(growth, 1)}% since ${currencySymbol}${fmt(startingBalance, 0)} start`
                        : `from ${currencySymbol}${fmt(startingBalance, 0)} starting balance`}
                    </Badge>
                  </div>
                  <MiniSeg
                    items={["1D", "1W", "1M", "1Y"]}
                    value={candleTF}
                    onChange={setCandleTF}
                  />
                </div>
                <div style={{ marginTop: "var(--space-3)" }}>
                  <CandleChart
                    key={candleTF}
                    candles={candles}
                    sym={currencySymbol}
                    height={220}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    font: "var(--text-caption)",
                    color: "var(--color-text-muted)",
                    marginTop: 6,
                  }}
                >
                  <span>{candles[0]?.label || ""}</span>
                  <span>
                    each candle ={" "}
                    {candleTF === "1D"
                      ? "1 day"
                      : candleTF === "1W"
                        ? "1 week"
                        : candleTF === "1M"
                          ? "1 month"
                          : "1 year"}{" "}
                    of your equity
                  </span>
                  <span>{candles[candles.length - 1]?.label || ""}</span>
                </div>
              </div>
            );
          })()}

          <div className="jx-card">
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "var(--space-2)",
              }}
            >
              <div>
                <div style={{ font: "var(--text-body-md)", fontWeight: 600 }}>
                  Cumulative P&L
                </div>
                <div style={{ font: "var(--text-h2)" }}>
                  {k(cumSeries[cumSeries.length - 1] || 0, currencySymbol)} net
                </div>
                <Badge
                  variant={
                    (cumSeries[cumSeries.length - 1] || 0) >= 0
                      ? "success"
                      : "danger"
                  }
                >
                  {inWindow(closed, pnlRange).length} trades in range
                </Badge>
              </div>
              <MiniSeg
                items={["1D", "1W", "1M", "1Y"]}
                value={pnlRange}
                onChange={setPnlRange}
              />
            </div>
            <div style={{ marginTop: "var(--space-3)" }}>
              <AreaChart
                values={cumSeries.length > 1 ? cumSeries : [0, 0]}
                height={170}
                labels={["Start", "", "", "", "", "Now"]}
                tips={cumTips.length > 1 ? cumTips : null}
              />
            </div>
          </div>

          <div className="jx-card">
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "var(--space-2)",
              }}
            >
              <div>
                <div style={{ font: "var(--text-body-md)", fontWeight: 600 }}>
                  Daily P&L
                </div>
                <div style={{ font: "var(--text-h2)" }}>
                  {k(
                    S.daily
                      .slice(dailyRange === "Week" ? -7 : -30)
                      .reduce((s, v) => s + v, 0),
                    currencySymbol,
                  )}
                </div>
                <Badge variant="success">
                  +
                  {
                    S.daily
                      .slice(dailyRange === "Week" ? -7 : -30)
                      .filter((v) => v > 0).length
                  }{" "}
                  winning days
                </Badge>
              </div>
              <MiniSeg
                items={["Week", "Month"]}
                value={dailyRange}
                onChange={setDailyRange}
              />
            </div>
            <div style={{ marginTop: "var(--space-3)" }}>
              <BarChart
                values={S.daily.slice(dailyRange === "Week" ? -7 : -30)}
                tips={S.daily
                  .slice(dailyRange === "Week" ? -7 : -30)
                  .map((v, i) => {
                    const labels = S.dailyLabels.slice(
                      dailyRange === "Week" ? -7 : -30,
                    );
                    return `${labels[i] || ""}\n${k(v, currencySymbol)}`;
                  })}
                height={140}
              />
            </div>
          </div>

          <div className="jx-card">
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "var(--space-2)",
              }}
            >
              <div>
                <div style={{ font: "var(--text-body-md)", fontWeight: 600 }}>
                  Win rate trend
                </div>
                <div style={{ font: "var(--text-h2)" }}>
                  {wrSeries.length
                    ? fmt(wrSeries[wrSeries.length - 1], 1)
                    : fmt(S.winRate, 1)}
                  %
                </div>
                <Badge variant="neutral">{wrSeries.length} periods</Badge>
              </div>
              <MiniSeg
                items={["1W", "1M", "3M", "1Y"]}
                value={wrRange}
                onChange={setWrRange}
              />
            </div>
            <div style={{ marginTop: "var(--space-3)" }}>
              <LineChart
                values={wrSeries.length > 1 ? wrSeries : [50, S.winRate || 50]}
                tips={
                  wrSeries.length > 1
                    ? wrSeries.map(
                        (v, i) => `Period ${i + 1}\n${fmt(v, 1)}% win rate`,
                      )
                    : null
                }
                height={140}
              />
            </div>
          </div>

          {/* NEW: P&L by strategy (from the v2 trade fields) */}
          <div className="jx-card">
            <div
              style={{
                font: "var(--text-body-md)",
                fontWeight: 600,
                marginBottom: "var(--space-3)",
              }}
            >
              P&L by strategy
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {S.stratList.map(([name, v]) => (
                <Tip
                  key={name}
                  content={`${name}\n${v.n} trades · ${v.w} wins (${fmt((v.w / v.n) * 100, 0)}%)\n${k(v.pnl, currencySymbol)} total P&L`}
                  block
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      font: "var(--text-small)",
                      flex: 1,
                      cursor: "help",
                    }}
                  >
                    <span
                      style={{
                        width: 110,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {name}
                    </span>
                    <div style={{ flex: 1, display: "flex" }}>
                      <span
                        style={{
                          height: 12,
                          borderRadius: 6,
                          width: `${Math.max(6, (Math.abs(v.pnl) / maxStrat) * 100)}%`,
                          background:
                            v.pnl >= 0
                              ? "var(--color-success)"
                              : "var(--color-danger)",
                          transition: `width 0.8s ${BAR_EASE}`,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        font: "var(--text-caption)",
                        color: "var(--color-text-muted)",
                        width: 70,
                      }}
                    >
                      {fmt((v.w / v.n) * 100, 0)}% win
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          v.pnl >= 0
                            ? "var(--color-success-strong)"
                            : "var(--color-danger-strong)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {k(v.pnl, currencySymbol)}
                    </span>
                  </div>
                </Tip>
              ))}
              {S.stratList.length === 0 && (
                <span
                  style={{
                    font: "var(--text-small)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Tag a strategy when logging trades to unlock this chart.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* right column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <div className="jx-card">
            <div
              style={{
                font: "var(--text-body-md)",
                fontWeight: 600,
                marginBottom: "var(--space-3)",
              }}
            >
              Asset allocation
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-4)",
              }}
            >
              <Donut
                segments={S.allocList.map(([, v], i) => ({
                  value: v,
                  color: DONUT_COLORS[i],
                }))}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  flex: 1,
                }}
              >
                {S.allocList.map(([sym, v], i) => (
                  <Tip
                    key={sym}
                    content={`${sym}: ${currencySymbol}${fmt(v, 0)} traded value\n${fmt((v / allocTotal) * 100, 1)}% of allocation`}
                    block
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        font: "var(--text-small)",
                        flex: 1,
                        cursor: "help",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: DONUT_COLORS[i],
                        }}
                      />
                      <span style={{ color: "var(--color-text-secondary)" }}>
                        {sym}
                      </span>
                      <span style={{ marginLeft: "auto", fontWeight: 600 }}>
                        {fmt((v / allocTotal) * 100, 0)}%
                      </span>
                    </div>
                  </Tip>
                ))}
                {S.allocList.length === 0 && <Empty height={60} />}
              </div>
            </div>
          </div>

          <div className="jx-card">
            <div
              style={{
                font: "var(--text-body-md)",
                fontWeight: 600,
                marginBottom: "var(--space-3)",
              }}
            >
              P&L by symbol
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {S.symPnl.slice(0, 6).map(([sym, v]) => (
                <Tip
                  key={sym}
                  content={`${sym}\n${k(v, currencySymbol)} net P&L in this journal`}
                  block
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      font: "var(--text-small)",
                      flex: 1,
                      cursor: "help",
                    }}
                  >
                    <span
                      style={{
                        width: 54,
                        flexShrink: 0,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {sym.split("/")[0]}
                    </span>
                    <div style={{ flex: 1, display: "flex", minWidth: 40 }}>
                      <span
                        style={{
                          height: 12,
                          borderRadius: 6,
                          width: `${Math.max(6, (Math.abs(v) / maxSym) * 100)}%`,
                          background:
                            v >= 0
                              ? "var(--color-success)"
                              : "var(--color-danger)",
                          transition: `width 0.8s ${BAR_EASE}`,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          v >= 0
                            ? "var(--color-success-strong)"
                            : "var(--color-danger-strong)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {k(v, currencySymbol)}
                    </span>
                  </div>
                </Tip>
              ))}
              {S.symPnl.length === 0 && <Empty height={60} />}
            </div>
          </div>

          {/* NEW: plan-followed comparison */}
          <div className="jx-card">
            <div
              style={{
                font: "var(--text-body-md)",
                fontWeight: 600,
                marginBottom: "var(--space-3)",
              }}
            >
              Plan followed vs not
            </div>
            {S.discipline.plannedN + S.discipline.unplannedN === 0 ? (
              <span
                style={{
                  font: "var(--text-small)",
                  color: "var(--color-text-muted)",
                }}
              >
                Use the plan toggle when logging trades to compare.
              </span>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                }}
              >
                {[
                  [
                    "Followed plan",
                    S.discipline.plannedN,
                    S.discipline.plannedWr,
                    "var(--color-success)",
                  ],
                  [
                    "Went off-plan",
                    S.discipline.unplannedN,
                    S.discipline.unplannedWr,
                    "var(--color-danger)",
                  ],
                ].map(([l, n, w, c]) => (
                  <div
                    key={l}
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        font: "var(--text-small)",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{l}</span>
                      <span style={{ color: "var(--color-text-muted)" }}>
                        {n} trades{w != null && ` · ${fmt(w, 0)}% win`}
                      </span>
                    </div>
                    <Progress pct={w || 0} color={c} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="jx-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "var(--space-2)",
              }}
            >
              <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>
                Volume traded
              </span>
            </div>
            <div style={{ font: "var(--text-h2)", marginTop: 4 }}>
              {currencySymbol}
              {totalVolume >= 1e6
                ? `${fmt(totalVolume / 1e6, 2)}M`
                : `${fmt(totalVolume / 1000, 0)}k`}
            </div>
            <Badge variant="neutral">{analyticsRange} window</Badge>
            <div style={{ marginTop: "var(--space-3)" }}>
              <BarChart
                values={S.vols}
                tips={S.vols.map(
                  (v, i) =>
                    `${S.volLabels[i] || ""}\n${currencySymbol}${fmt(Math.abs(v), 0)} traded`,
                )}
                height={110}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 980px) {
          .jx-ov-grid,
          .jx-ach-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
