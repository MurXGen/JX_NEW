"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Info, Plus, Sparkles, Sprout, TrendingUp } from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";
import CountUp from "./CountUp";
import Tip from "./Tip";
import SampleDataBanner from "./SampleDataBanner";
import CustomizeSections, { useHiddenSections } from "./CustomizeSections";
import { jxEase } from "./easing";

/* sections the user can show/hide on the overview dashboard */
const OVERVIEW_SECTIONS = [
  { id: "progress", label: "Progress cards" },
  { id: "pace", label: "Trading pace & composure" },
  { id: "sessions", label: "Session performance" },
  { id: "edge", label: "Your trading edge" },
  { id: "dayOfWeek", label: "Day-of-week P&L" },
  { id: "streaks", label: "Streaks & achievements" },
  { id: "keyMetrics", label: "Key metrics" },
  { id: "analytics", label: "Analytics" },
];

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

/* short, plain explanations for the Key-metrics tiles */
const KPI_TIPS = {
  "Net P&L (all-time)": "Total realised profit/loss, all trades",
  "Total trades": "Trades logged in this journal",
  "Average win": "Average profit on winning trades",
  "Average loss": "Average loss on losing trades",
  "Largest win": "Your single best trade",
  "Avg hold time": "Median time held per trade",
  "Sharpe ratio": "Return per unit of volatility — higher is steadier",
  "Win streak": "Current run of consecutive wins",
};

/* tiny info icon + tooltip for analytics labels (kept short & plain) */
function InfoTip({ text }) {
  return (
    <Tip content={text}>
      <Info size={13} style={{ color: "var(--color-text-muted)", cursor: "help", verticalAlign: "middle", flexShrink: 0 }} />
    </Tip>
  );
}

/* format a UTC hour-of-day as the viewer's LOCAL time, e.g. 8 → "1:30 PM" */
const localFromUtcHour = (h) => {
  const d = new Date();
  d.setUTCHours(h % 24, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};
const localTz = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "local"; } catch { return "local"; }
};

/* live local + UTC clock — isolated so it doesn't re-render the whole panel */
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const local = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const utc = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  return (
    <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap", font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
      <span>Local <strong style={{ color: "var(--color-text-primary)" }}>{local}</strong> · {localTz()}</span>
      <span>UTC <strong style={{ color: "var(--color-text-primary)" }}>{utc}</strong></span>
    </div>
  );
}

/* ---- Profit-day celebration: gradient stars + confetti rising and
   fading from bottom to top. Rendered only when today is in profit. ---- */
function Celebration() {
  const id = useId().replace(/[:]/g, "");
  // deterministic-per-mount particle field
  const particles = useMemo(() => {
    const STAR = "star";
    const CONFETTI = "confetti";
    const colors = [
      "var(--yellow-400)",
      "var(--yellow-500)",
      "#34d399",
      "#22d3ee",
      "#f472b6",
      "#a78bfa",
    ];
    return Array.from({ length: 26 }, (_, i) => {
      const isStar = i % 3 === 0;
      return {
        i,
        type: isStar ? STAR : CONFETTI,
        left: Math.random() * 100, // %
        size: isStar ? 8 + Math.random() * 10 : 4 + Math.random() * 6,
        delay: Math.random() * 3.5, // s
        dur: 3.2 + Math.random() * 2.6, // s
        drift: (Math.random() - 0.5) * 40, // px horizontal sway
        spin: Math.random() * 360,
        color: colors[i % colors.length],
      };
    });
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        borderRadius: "inherit",
        zIndex: 0,
      }}
    >
      {/* soft gradient glow at the top */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--yellow-400) 18%, transparent) 0%, transparent 60%)",
        }}
      />
      <style>{`
        @keyframes jx-rise-${id} {
          0%   { transform: translateY(0) translateX(0) rotate(0deg) scale(0.6); opacity: 0; }
          12%  { opacity: 1; }
          70%  { opacity: 0.9; }
          100% { transform: translateY(-110%) translateX(var(--jx-drift)) rotate(var(--jx-spin)) scale(1); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .jx-celebrate-${id} { display: none !important; }
        }
      `}</style>
      {particles.map((p) => (
        <span
          key={p.i}
          className={`jx-celebrate-${id}`}
          style={{
            position: "absolute",
            bottom: "-12px",
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            color: p.color,
            "--jx-drift": `${p.drift}px`,
            "--jx-spin": `${p.spin}deg`,
            animation: `jx-rise-${id} ${p.dur}s ${p.delay}s ease-in-out infinite`,
            willChange: "transform, opacity",
          }}
        >
          {p.type === "star" ? (
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor">
              <path d="M12 2l2.6 6.3L21 9l-5 4.3L17.5 21 12 17.3 6.5 21 8 13.3 3 9l6.4-.7z" />
            </svg>
          ) : (
            <span
              style={{
                display: "block",
                width: "100%",
                height: "60%",
                background: "currentColor",
                borderRadius: "1px",
              }}
            />
          )}
        </span>
      ))}
    </div>
  );
}

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

/* Filled pie/donut. Robust to single-slice (100%) and empty/zero data. */
function pieArc(cx, cy, r, startAngle, endAngle) {
  const pol = (ang) => {
    const a = ((ang - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const [sx, sy] = pol(endAngle);
  const [ex, ey] = pol(startAngle);
  const large = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${large} 0 ${ex} ${ey} Z`;
}

function Donut({ segments, size = 120 }) {
  const morphedVals = useMorph(segments.map((s) => s.value));
  const total = morphedVals.reduce((s, x) => s + Math.max(0, x), 0);
  const cx = 60;
  const cy = 60;
  const r = 52;
  const holeR = 30; // donut hole

  // nothing to show — render a faint placeholder ring
  if (total <= 0) {
    return (
      <svg viewBox="0 0 120 120" style={{ width: size, height: size, flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth={r - holeR} />
      </svg>
    );
  }

  let acc = 0;
  const singleIdx = morphedVals.findIndex((v) => v > 0);
  const single = segments.filter((_, i) => (morphedVals[i] ?? 0) > 0).length === 1;
  const tip = (s, v) =>
    `${s.label ?? ""}${s.label ? " — " : ""}${Math.round((v / total) * 100)}%`;

  return (
    <svg viewBox="0 0 120 120" style={{ width: size, height: size, flexShrink: 0 }}>
      {single ? (
        // a lone 100% slice — draw a full ring (arc path degenerates at 360°)
        <circle
          cx={cx}
          cy={cy}
          r={(r + holeR) / 2}
          fill="none"
          stroke={segments[singleIdx]?.color || "var(--color-primary)"}
          strokeWidth={r - holeR}
        >
          <title>{tip(segments[singleIdx] || {}, total)}</title>
        </circle>
      ) : (
        segments.map((s, i) => {
          const v = Math.max(0, morphedVals[i] ?? 0);
          if (v <= 0) return null;
          const frac = v / total;
          const start = acc * 360;
          const end = (acc + frac) * 360;
          acc += frac;
          return (
            <path key={i} d={pieArc(cx, cy, r, start, Math.min(end, 359.99))} fill={s.color}>
              <title>{tip(s, v)}</title>
            </path>
          );
        })
      )}
      {/* donut hole */}
      <circle cx={cx} cy={cy} r={holeR} fill="var(--color-bg-surface)" />
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

  /* ---- trading pace & composure (overtrading vs calm) ---- */
  const pace = useMemo(() => {
    const ts = trades
      .map((t) => new Date(t.closeTime || t.openTime).getTime())
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b);
    if (ts.length < 3) return null;

    // per-day counts
    const byDay = {};
    ts.forEach((x) => {
      const d = new Date(x);
      const k = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      byDay[k] = (byDay[k] || 0) + 1;
    });
    const counts = Object.values(byDay);
    const days = counts.length;
    const avgDay = counts.reduce((a, b) => a + b, 0) / days;
    const busiest = Math.max(...counts);

    // densest 60-min window (rolling)
    let maxHour = 1;
    for (let i = 0; i < ts.length; i++) {
      let j = i;
      while (j < ts.length && ts[j] - ts[i] <= 3600000) j++;
      maxHour = Math.max(maxHour, j - i);
    }

    // revenge rate: a trade opened within 30 min after a losing close
    const cl = closed; // sorted asc
    let revenge = 0, eligible = 0;
    for (let i = 1; i < cl.length; i++) {
      const prev = cl[i - 1];
      const gap = new Date(cl[i].closeTime || cl[i].openTime) - new Date(prev.closeTime);
      if ((Number(prev.pnl) || 0) < 0) {
        eligible++;
        if (gap <= 30 * 60 * 1000) revenge++;
      }
    }
    const revengeRate = eligible ? revenge / eligible : 0;
    const heavyDays = counts.filter((c) => c >= Math.max(5, avgDay * 2)).length;
    const heavyRatio = days ? heavyDays / days : 0;

    // composure score (100 = calm, disciplined pace)
    let score = 100;
    if (maxHour >= 4) score -= Math.min(40, (maxHour - 3) * 12);
    score -= Math.min(30, revengeRate * 60);
    score -= Math.min(25, heavyRatio * 60);
    score = Math.max(0, Math.round(score));

    const band =
      score >= 75 ? { label: "Calm & disciplined", tone: "success", emoji: "🌿" }
      : score >= 55 ? { label: "Balanced", tone: "success", emoji: "🙂" }
      : score >= 35 ? { label: "Elevated pace", tone: "warn", emoji: "⚠️" }
      : { label: "Overtrading risk", tone: "danger", emoji: "🔥" };

    const tip =
      score >= 75 ? "Your pace looks healthy — keep waiting for clean setups."
      : score >= 55 ? "Mostly steady. Watch for clusters of quick trades after a loss."
      : score >= 35 ? "You're trading fast in bursts. Add a short pause between trades."
      : "Frequent rapid-fire and post-loss trades. Step back, breathe, and trade only A+ setups.";

    return { score, band, tip, avgDay, busiest, maxHour, revengeRate, heavyDays };
  }, [trades, closed]);

  /* ---- today's realized P&L (drives profit celebration) ---- */
  const todayPnl = useMemo(() => {
    if (usingDummy) return 0; // never celebrate on sample data
    const today = new Date().toDateString();
    return closed
      .filter((t) => new Date(t.closeTime).toDateString() === today)
      .reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  }, [closed, usingDummy]);
  const celebrate = todayPnl > 0;

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

  /* a confidence / encouragement line for the Total profit card, based on
     recent daily performance — so a rough patch doesn't crush momentum. */
  const encourage = useMemo(() => {
    if (!closed.length) return null;
    const byDay = new Map();
    closed.forEach((t) => {
      const d = new Date(t.closeTime);
      if (Number.isNaN(d.getTime())) return;
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      byDay.set(key, (byDay.get(key) || 0) + (Number(t.pnl) || 0));
    });
    const days = [...byDay.entries()].sort((a, b) => a[0] - b[0]); // [ts, net] asc
    if (!days.length) return null;
    const now = Date.now();
    const ago = (n) => now - n * 864e5;
    const between = (lo, hi) => days.filter(([ts]) => ts >= lo && ts < hi).reduce((s, [, v]) => s + v, 0);
    const last7 = between(ago(7), now + 864e5);
    const prev7 = between(ago(14), ago(7));

    let greenStreak = 0;
    for (let i = days.length - 1; i >= 0; i--) { if (days[i][1] > 0) greenStreak++; else break; }
    const lastDayNet = days[days.length - 1][1];
    let priorStreak = 0;
    if (lastDayNet < 0) {
      for (let i = days.length - 2; i >= 0; i--) { if (days[i][1] > 0) priorStreak++; else break; }
    }

    const recent = days.slice(-7).map(([, v]) => v);
    const base = { recent };

    if (prev7 < 0 && last7 > 0)
      return { ...base, tone: "success", icon: "up", title: "Strong turnaround", text: "Green over the last 7 days after a rough patch — keep doing what's working. 💪" };
    if (lastDayNet < 0 && priorStreak >= 3)
      return { ...base, tone: "info", icon: "spark", title: "Stay confident", text: `One red day after ${priorStreak} green ones doesn't undo your edge — trust your process.` };
    if (greenStreak >= 3)
      return { ...base, tone: "success", icon: "flame", title: `${greenStreak}-day green streak`, text: "Momentum is on your side — protect your gains and keep risk tight." };
    if (lastDayNet < 0 && last7 > 0)
      return { ...base, tone: "info", icon: "up", title: "Zoom out", text: "A down day inside a winning week is normal — the trend is still your friend." };
    if (last7 < 0)
      return { ...base, tone: "warn", icon: "sprout", title: "Trust the process", text: "Drawdowns happen to every trader. Focus on flawless execution — the P&L follows." };
    return null;
  }, [closed]);

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
      // base asset: part before "/" but tolerate odd inputs like "/MNS"
      // (split → ["", "MNS"]) by dropping empty parts; fall back to raw symbol
      const raw = (t.symbol || t.ticker || "—").trim().toUpperCase();
      const s = raw.split("/").filter(Boolean)[0] || raw || "—";
      const qty = Number(t.totalQuantity ?? t.quantity ?? t.size) || 0;
      const price = Number(t.avgEntryPrice ?? t.entryPrice ?? t.entries?.[0]?.price) || 0;
      // traded notional → fall back to |P&L| → fall back to 1 (equal weight),
      // so the allocation pie always renders whenever there are trades
      const notional = price && qty ? Math.abs(price * qty) : 0;
      const value = notional || Math.abs(Number(t.pnl) || 0) || 1;
      alloc.set(s, (alloc.get(s) || 0) + value);
    });
    // top 5 by traded value + an "Other" bucket so every symbol is represented
    const allocSorted = [...alloc.entries()].sort((a, b) => b[1] - a[1]);
    const allocTop = allocSorted.slice(0, 5);
    const allocRest = allocSorted.slice(5);
    const allocList = allocRest.length
      ? [...allocTop, ["Other", allocRest.reduce((s, [, v]) => s + v, 0)]]
      : allocTop;

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

  /* ---- session performance (which trading session is most profitable) ----
     Buckets each closed trade by the UTC hour of its open time into the four
     major FX sessions, then ranks them by net P&L. */
  const SESSIONS = useMemo(() => {
    const defs = [
      { id: "sydney", label: "Sydney", emoji: "🌙", window: "21:00–23:59 UTC", lo: 21, hi: 24, test: (h) => h >= 21 },
      { id: "asia", label: "Asia (Tokyo)", emoji: "🗾", window: "00:00–07:59 UTC", lo: 0, hi: 8, test: (h) => h >= 0 && h < 8 },
      { id: "london", label: "London", emoji: "🇬🇧", window: "08:00–12:59 UTC", lo: 8, hi: 13, test: (h) => h >= 8 && h < 13 },
      { id: "newyork", label: "New York", emoji: "🗽", window: "13:00–20:59 UTC", lo: 13, hi: 21, test: (h) => h >= 13 && h < 21 },
    ];
    const acc = Object.fromEntries(defs.map((d) => [d.id, { ...d, trades: 0, wins: 0, pnl: 0 }]));
    closed.forEach((t) => {
      const when = t.openTime || t.closeTime;
      if (!when) return;
      const h = new Date(when).getUTCHours();
      const def = defs.find((d) => d.test(h));
      if (!def) return;
      const a = acc[def.id];
      a.trades += 1;
      a.pnl += Number(t.pnl) || 0;
      if (Number(t.pnl) > 0) a.wins += 1;
    });
    const list = defs.map((d) => {
      const a = acc[d.id];
      return { ...a, winRate: a.trades ? (a.wins / a.trades) * 100 : 0 };
    });
    const traded = list.filter((s) => s.trades > 0);
    const maxAbs = Math.max(1, ...traded.map((s) => Math.abs(s.pnl)));
    const best = traded.length ? traded.reduce((m, s) => (s.pnl > m.pnl ? s : m)) : null;
    const worst = traded.length ? traded.reduce((m, s) => (s.pnl < m.pnl ? s : m)) : null;
    return { list, traded, best, worst, maxAbs, totalTraded: traded.length };
  }, [closed]);

  /* ---- trader edge: the metrics that actually predict long-term results ---- */
  const EDGE = useMemo(() => {
    const pnls = closed.map((t) => Number(t.pnl) || 0);
    const total = pnls.length;
    const wins = pnls.filter((p) => p > 0);
    const losses = pnls.filter((p) => p < 0);
    const net = pnls.reduce((s, p) => s + p, 0);
    const winRate = total ? wins.length / total : 0;
    const avgWin = wins.length ? wins.reduce((s, p) => s + p, 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, p) => s + p, 0) / losses.length) : 0;
    const expectancy = total ? net / total : 0; // $ per trade
    const payoff = avgLoss ? avgWin / avgLoss : null; // reward:risk realised
    // expectancy in R (avg loss = 1R)
    const expectancyR = avgLoss ? (winRate * avgWin - (1 - winRate) * avgLoss) / avgLoss : null;

    // max drawdown on the cumulative equity curve
    let run = 0, peak = 0, maxDD = 0, peakAtMax = 0;
    pnls.forEach((p) => {
      run += p;
      if (run > peak) peak = run;
      const dd = peak - run;
      if (dd > maxDD) { maxDD = dd; peakAtMax = peak; }
    });
    const maxDDPct = peakAtMax > 0 ? (maxDD / peakAtMax) * 100 : 0;
    const recovery = maxDD > 0 ? net / maxDD : null; // recovery factor

    // day-of-week performance (by close day)
    const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const byDow = DOW.map(() => ({ pnl: 0, n: 0 }));
    closed.forEach((t) => {
      const d = new Date(t.closeTime || t.openTime);
      if (Number.isNaN(d.getTime())) return;
      const k = d.getDay();
      byDow[k].pnl += Number(t.pnl) || 0;
      byDow[k].n += 1;
    });
    // show every weekday (Mon→Sun) even when a day has no trades
    const dowOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
    const dow = dowOrder.map((i) => ({ label: DOW[i], ...byDow[i] }));
    const dowMax = Math.max(1, ...dow.map((d) => Math.abs(d.pnl)));
    const tradedDays = dow.filter((d) => d.n > 0);
    const bestDow = tradedDays.length ? tradedDays.reduce((m, d) => (d.pnl > m.pnl ? d : m)) : null;
    const dowHasData = tradedDays.length > 0;

    return { total, net, winRate: winRate * 100, expectancy, payoff, expectancyR, maxDD, maxDDPct, recovery, dow, dowMax, bestDow, dowHasData };
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

  /* Short, trader-flavoured greeting that varies through the day (and a bit
     day to day), in the spirit of Claude's brief hellos. */
  const greeting = useMemo(() => {
    const now = new Date();
    const h = now.getHours();
    const tod = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const traderLines = [
      "Markets are open",
      "Ready to trade",
      "Back to the charts",
      "Let's find your edge",
      "Time to journal",
    ];
    // alternate day-to-day between a time hello and a trader line
    const day = now.getDate();
    return day % 2 === 0 ? tod : traderLines[day % traderLines.length];
  }, []);

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

  const { hidden, toggle, reset, isVisible } = useHiddenSections(
    "jx-overview-sections",
  );

  return (
    <div
      className="jx-overview-premium"
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
          flexWrap: "nowrap",
          gap: "var(--space-3)",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="jx-overview-greeting" style={{ font: "var(--text-h2)", width: "fit-content" }}>
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
        {/* hide the header CTA while on sample data — the banner below
            carries the primary Import / Log actions (avoids double CTA) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            flexShrink: 0,
          }}
        >
          <CustomizeSections
            sections={OVERVIEW_SECTIONS}
            hidden={hidden}
            onToggle={toggle}
            onReset={reset}
          />
          {!usingDummy && (
            <Button variant="primary" icon={Plus} onClick={onLogTrade}>
              <span className="jx-lbl-full">Log trade</span>
              <span className="jx-lbl-short">Log</span>
            </Button>
          )}
        </div>
      </div>

      {/* sample-data nudge */}
      {usingDummy && (
        <SampleDataBanner onLog={onLogTrade} onImport={onImport} />
      )}

      {/* ===== Hero card ===== */}
      <div
        className="jx-card jx-hero-grid"
        style={{
          position: "relative",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "minmax(0,1.2fr) minmax(180px,1fr)",
          gap: "var(--space-5)",
          alignItems: "center",
        }}
      >
        {celebrate && <Celebration />}
        <div
          style={{
            position: "relative",
            zIndex: 1,
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
          {encourage && (() => {
            const accent =
              encourage.tone === "success" ? "var(--color-success)"
              : encourage.tone === "warn" ? "var(--color-text-secondary)"
              : "var(--color-primary)";
            const bg =
              encourage.tone === "success" ? "var(--color-success-subtle)"
              : encourage.tone === "warn" ? "var(--color-bg-muted)"
              : "var(--color-primary-subtle)";
            const Icon =
              encourage.icon === "flame" ? Flame
              : encourage.icon === "spark" ? Sparkles
              : encourage.icon === "sprout" ? Sprout
              : TrendingUp;
            const bars = encourage.recent || [];
            const max = Math.max(1, ...bars.map((v) => Math.abs(v)));
            return (
              <div
                style={{
                  marginTop: "var(--space-3)",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-lg)",
                  background: bg,
                  border: `1px solid ${accent}33`,
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                }}
              >
                <span
                  style={{
                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: `${accent}22`, color: accent,
                  }}
                >
                  <Icon size={19} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "var(--text-small)", fontWeight: 700, color: "var(--color-text-primary)" }}>
                    {encourage.title}
                  </div>
                  <div style={{ font: "var(--text-caption)", color: "var(--color-text-secondary)" }}>
                    {encourage.text}
                  </div>
                </div>
                {bars.length > 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 3, height: 34, flexShrink: 0 }}>
                    {bars.map((v, i) => {
                      const h = Math.max(4, Math.round((Math.abs(v) / max) * 30));
                      const up = v >= 0;
                      return (
                        <span
                          key={i}
                          title={k(v, currencySymbol)}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: up ? "flex-end" : "flex-start",
                            height: "100%",
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: h,
                              borderRadius: 2,
                              background: up ? "var(--color-success)" : "var(--color-danger)",
                              opacity: 0.55 + 0.45 * (Math.abs(v) / max),
                            }}
                          />
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        <div style={{ position: "relative", zIndex: 1, minWidth: 0 }}>
          <AreaChart
            values={hero.spark.length > 1 ? hero.spark : [0, 0]}
            height={120}
          />
        </div>
      </div>

      {/* ===== Progress cards ===== */}
      {isVisible("progress") && (
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
          <span style={{ ...LABEL, display: "inline-flex", alignItems: "center", gap: 4 }}>Win rate <InfoTip text="Share of closed trades that ended in profit" /></span>
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
            <span style={{ ...LABEL, display: "inline-flex", alignItems: "center", gap: 4 }}>Monthly goal <InfoTip text="Progress to your monthly profit target" /></span>
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
            <span style={{ ...LABEL, display: "inline-flex", alignItems: "center", gap: 4 }}>Profit factor <InfoTip text="Gross profit ÷ gross loss; above 1 is profitable" /></span>
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
          <span style={{ ...LABEL, display: "inline-flex", alignItems: "center", gap: 4 }}>Discipline <InfoTip text="Share of trades where you followed your plan" /></span>
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
      )}

      {/* ===== Trading pace & composure (overtrading vs calm) ===== */}
      {isVisible("pace") && pace && (() => {
        const toneColor =
          pace.band.tone === "success" ? "var(--color-success-strong)"
          : pace.band.tone === "warn" ? "var(--yellow-500)"
          : "var(--color-danger-strong)";
        const toneBg =
          pace.band.tone === "success" ? "var(--color-success-subtle)"
          : pace.band.tone === "warn" ? "var(--color-primary-subtle)"
          : "var(--color-danger-subtle)";
        const tiles = [
          ["Trades / day", fmt(pace.avgDay, 1)],
          ["Busiest day", `${pace.busiest}`],
          ["Most in 1 hr", `${pace.maxHour}`],
          ["Post-loss rushes", `${Math.round(pace.revengeRate * 100)}%`],
        ];
        return (
          <div className="jx-card">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "var(--space-3)" }}>
              <span className="jx-card__title">Trading pace</span>
              <InfoTip text="How fast and how often you trade — a calm, selective pace usually beats rapid-fire trading." />
              <span
                style={{
                  marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 999, background: toneBg, color: toneColor,
                  font: "var(--text-caption)", fontWeight: 700,
                }}
              >
                {pace.band.emoji} {pace.band.label}
              </span>
            </div>

            {/* composure meter */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ font: "var(--text-h2)", color: toneColor }}>{pace.score}</span>
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>/ 100 composure</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "var(--color-bg-muted)", overflow: "hidden", margin: "8px 0 var(--space-3)" }}>
              <div style={{ width: `${pace.score}%`, height: "100%", background: toneColor, borderRadius: 999 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-2)" }}>
              {tiles.map(([l, v]) => (
                <div key={l} style={{ background: "var(--color-bg-muted)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-3)" }}>
                  <div style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{l}</div>
                  <div style={{ font: "var(--text-body-md)", fontWeight: 700, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>

            <p style={{ font: "var(--text-small)", color: "var(--color-text-secondary)", margin: "var(--space-3) 0 0" }}>
              {pace.tip}
            </p>
          </div>
        );
      })()}

      {/* ===== Session performance ===== */}
      {isVisible("sessions") && (
      <div className="jx-card">
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "var(--space-2)" }}>
          <span className="jx-card__title">Session performance</span>
          <InfoTip text="P&L grouped by trading session, by open time" />
        </div>
        <div style={{ font: "var(--text-small)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
          When your P&amp;L is maximised across Asia, London &amp; New York.
        </div>

        {/* live local + UTC clock */}
        <div style={{ marginBottom: "var(--space-4)" }}>
          <LiveClock />
        </div>

        {SESSIONS.totalTraded === 0 ? (
          <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>
            Log a few trades to see which session suits you best.
          </span>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-3)" }}>
              {SESSIONS.list.map((s) => {
                const pos = s.pnl >= 0;
                const pct = Math.round((Math.abs(s.pnl) / SESSIONS.maxAbs) * 100);
                const isBest = SESSIONS.best && s.id === SESSIONS.best.id && s.pnl > 0;
                const traded = s.trades > 0;
                return (
                  <div
                    key={s.id}
                    className="jx-card jx-card--flat"
                    style={{
                      padding: "var(--space-4)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-2)",
                      border: isBest ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                      background: isBest ? "var(--color-primary-subtle)" : "var(--color-bg-surface)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, font: "var(--text-body-md)", fontWeight: 600 }}>
                        <span>{s.emoji}</span> {s.label}
                      </span>
                      {isBest && <Badge variant="success">Best</Badge>}
                    </div>
                    {/* UTC + local time ranges */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                      <span>{s.window.replace(" UTC", "")} UTC</span>
                      <span>Local {localFromUtcHour(s.lo)}–{localFromUtcHour(s.hi)}</span>
                    </div>
                    {/* net P&L + bar */}
                    <span style={{ font: "var(--text-h3)", fontWeight: 700, color: !traded ? "var(--color-text-muted)" : pos ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>
                      {traded ? k(s.pnl, currencySymbol) : "—"}
                    </span>
                    <div style={{ height: 6, background: "var(--color-bg-muted)", borderRadius: 999, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", inset: 0, width: `${traded ? pct : 0}%`, background: pos ? "var(--color-success)" : "var(--color-danger)", borderRadius: 999, transition: "width .8s cubic-bezier(0.16,1,0.3,1)" }} />
                    </div>
                    <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                      {traded ? `${s.trades} trade${s.trades === 1 ? "" : "s"} · ${fmt(s.winRate, 0)}% win` : "No trades yet"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* suggestion */}
            <div className="jx-banner jx-banner--warn" style={{ alignItems: "flex-start", marginTop: "var(--space-4)" }}>
              <Flame size={15} style={{ color: "var(--yellow-500)", flexShrink: 0, marginTop: 2 }} />
              <span style={{ font: "var(--text-caption)" }}>
                {SESSIONS.best && SESSIONS.best.pnl > 0 ? (
                  <>
                    Your best window is <strong>{SESSIONS.best.window.replace(" UTC", "")} UTC</strong>
                    {" "}(your local <strong>{localFromUtcHour(SESSIONS.best.lo)}–{localFromUtcHour(SESSIONS.best.hi)}</strong>) —
                    the <strong>{SESSIONS.best.label}</strong> session, where you&apos;re up
                    {" "}{k(SESSIONS.best.pnl, currencySymbol)} at {fmt(SESSIONS.best.winRate, 0)}% win rate.
                    Trade your A+ setups then
                    {SESSIONS.worst && SESSIONS.worst.pnl < 0
                      ? <> — and go lighter during <strong>{SESSIONS.worst.label}</strong> ({SESSIONS.worst.window.replace(" UTC", "")} UTC), down {k(SESSIONS.worst.pnl, currencySymbol)}.</>
                      : "."}
                  </>
                ) : (
                  <>No session is clearly profitable yet. Keep logging with timestamps so we can pinpoint your best UTC window.</>
                )}
              </span>
            </div>
          </>
        )}
      </div>
      )}

      {/* ===== Trader edge ===== */}
      {isVisible("edge") && (
      <div className="jx-card">
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "var(--space-2)" }}>
          <span className="jx-card__title">Your trading edge</span>
          <InfoTip text="Metrics that predict long-term results" />
        </div>
        <div style={{ font: "var(--text-small)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
          Beyond P&amp;L — is your system actually profitable and survivable?
        </div>

        {EDGE.total === 0 ? (
          <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>Log trades to reveal your edge metrics.</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {/* metric tiles — same style as Key metrics for consistency */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "var(--space-4)" }}>
              {[
                { label: "Expectancy / trade", value: k(EDGE.expectancy, currencySymbol), sub: "per trade", up: EDGE.expectancy >= 0, tip: "Average $ you make per trade" },
                { label: "Expectancy (R)", value: EDGE.expectancyR == null ? "—" : `${EDGE.expectancyR >= 0 ? "+" : ""}${fmt(EDGE.expectancyR, 2)}R`, sub: "per unit risked", up: (EDGE.expectancyR || 0) >= 0, tip: "Profit per unit of risk; above 0 is +EV" },
                { label: "Payoff (R:R)", value: EDGE.payoff == null ? "—" : `${fmt(EDGE.payoff, 2)}×`, sub: "reward vs risk", up: (EDGE.payoff || 0) >= 1, tip: "Average win ÷ average loss" },
                { label: "Max drawdown", value: k(-EDGE.maxDD, currencySymbol).replace("+", ""), sub: `${fmt(EDGE.maxDDPct, 1)}% of peak`, up: false, tip: "Largest peak-to-valley drop in equity" },
                { label: "Recovery factor", value: EDGE.recovery == null ? "—" : `${fmt(EDGE.recovery, 2)}×`, sub: "net ÷ drawdown", up: (EDGE.recovery || 0) >= 2, tip: "Net profit ÷ max drawdown; higher is resilient" },
                { label: "Win rate", value: `${fmt(EDGE.winRate, 1)}%`, sub: "of all trades", up: EDGE.winRate >= 50, tip: "Share of trades that were profitable" },
              ].map((m) => (
                <div
                  key={m.label}
                  className="jx-card"
                  style={{ padding: "var(--space-4) var(--space-5)", display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <span style={{ ...LABEL, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {m.label} <InfoTip text={m.tip} />
                  </span>
                  <span style={{ font: "var(--text-h2)", fontVariantNumeric: "tabular-nums", color: m.up ? "var(--color-success-strong)" : "var(--color-text-primary)" }}>
                    {m.value}
                  </span>
                  <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{m.sub}</span>
                </div>
              ))}
            </div>

            {EDGE.bestDow && EDGE.bestDow.pnl > 0 && (
              <div className="jx-banner jx-banner--warn" style={{ alignItems: "flex-start" }}>
                <Flame size={15} style={{ color: "var(--yellow-500)", flexShrink: 0, marginTop: 2 }} />
                <span style={{ font: "var(--text-caption)" }}>
                  {EDGE.expectancy >= 0
                    ? <>Your system is <strong>+EV</strong> at {k(EDGE.expectancy, currencySymbol)}/trade. <strong>{EDGE.bestDow.label}</strong> is your strongest day — and keep risk per trade well under your {k(-EDGE.maxDD, currencySymbol).replace("+", "")} max drawdown.</>
                    : <>Your average trade is currently <strong>negative</strong> ({k(EDGE.expectancy, currencySymbol)}). Focus on raising your payoff (cut losers faster, let winners run) before sizing up.</>}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* ===== Day-of-week P&L (full width) ===== */}
      {isVisible("dayOfWeek") && EDGE.dowHasData && (
        <div className="jx-card">
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "var(--space-2)" }}>
            <span className="jx-card__title">Day-of-week P&amp;L</span>
            <InfoTip text="Which weekday you make or lose money" />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-4)", height: 240, width: "100%" }}>
            {EDGE.dow.map((d) => {
              const empty = d.n === 0;
              const h = empty ? 6 : Math.max(8, Math.round((Math.abs(d.pnl) / EDGE.dowMax) * 185));
              const pos = d.pnl >= 0;
              const content = empty
                ? `${d.label}: 0 trades`
                : `${d.label}: ${k(d.pnl, currencySymbol)} over ${d.n} trade${d.n === 1 ? "" : "s"}`;
              return (
                <Tip key={d.label} content={content} style={{ flex: 1, minWidth: 0, height: "100%", display: "flex" }}>
                  <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 8, cursor: "help" }}>
                    <span style={{ font: "var(--text-small)", fontWeight: 700, color: empty ? "var(--color-text-muted)" : pos ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>
                      {empty ? "—" : k(d.pnl, currencySymbol)}
                    </span>
                    <div style={{ width: "100%", height: h, background: empty ? "var(--color-border)" : pos ? "var(--color-success)" : "var(--color-danger)", borderRadius: "var(--radius-md)", transition: "height .8s cubic-bezier(0.16,1,0.3,1)" }} />
                    <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", fontWeight: 600 }}>{d.label}</span>
                  </div>
                </Tip>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Streaks & achievements ===== */}
      {isVisible("streaks") && (
      <>
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
              gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))",
              gap: "var(--space-3)",
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
                className="jx-card jx-card--flat"
                style={{
                  padding: "var(--space-4) var(--space-5)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span style={LABEL}>{l}</span>
                <span
                  style={{
                    font: "var(--text-h2)",
                    fontVariantNumeric: "tabular-nums",
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
      </>
      )}

      {/* ===== Key metrics ===== */}
      {isVisible("keyMetrics") && (
      <>
      <span className="jx-card__title" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        Key metrics <InfoTip text="Headline stats across all closed trades" />
      </span>
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
            <span style={{ ...LABEL, display: "inline-flex", alignItems: "center", gap: 4 }}>
              {m.label} {KPI_TIPS[m.label] && <InfoTip text={KPI_TIPS[m.label]} />}
            </span>
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
      </>
      )}

      {/* ===== Analytics ===== */}
      {isVisible("analytics") && (
      <>
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
                      style={{ font: "var(--text-body-md)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                    >
                      Equity growth <InfoTip text="Balance over time: start + cumulative P&L" />
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
                <div style={{ font: "var(--text-body-md)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  Cumulative P&L
                  <InfoTip text="Running total of every closed trade's P&L" />
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
                <div style={{ font: "var(--text-body-md)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  Daily P&L <InfoTip text="Net profit/loss for each day" />
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
                <div style={{ font: "var(--text-body-md)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  Win rate trend <InfoTip text="How your win rate moves over time" />
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
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              P&L by strategy <InfoTip text="Which strategies make or lose money" />
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
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Asset allocation
              <InfoTip text="Share of traded value by symbol" />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-4)",
              }}
            >
              <Donut
                segments={S.allocList.map(([sym, v], i) => ({
                  value: v,
                  color: DONUT_COLORS[i],
                  label: sym,
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
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              P&L by symbol <InfoTip text="Net profit/loss per instrument" />
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
              <span style={{ font: "var(--text-body-md)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                Volume traded <InfoTip text="Total notional traded (price × size)" />
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
      </>
      )}

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
