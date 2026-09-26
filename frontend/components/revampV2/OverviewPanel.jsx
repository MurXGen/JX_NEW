"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, Coffee, Crown, EyeOff, Flame, Info, Plus, Shield, Sparkles, Sprout, Trophy, TrendingUp } from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";
import CountUp from "./CountUp";
import Dropdown from "./Dropdown";
import Tip from "./Tip";
import SampleDataBanner from "./SampleDataBanner";
import CustomizeSections, { useHiddenSections } from "./CustomizeSections";
import { PnlCalendar, TradesHeatmap } from "./TradesLogPanel";
import { compactNumber } from "@/utils/formatNumbers";
import { convertTrade } from "@/utils/fx";
import { jxEase } from "./easing";

/* sections the user can show/hide on the overview dashboard */
const OVERVIEW_SECTIONS = [
  { id: "progress", label: "Progress cards" },
  { id: "capital", label: "Capital growth (to 2×)" },
  { id: "pace", label: "Trading pace & composure" },
  { id: "payoff", label: "Payoff (avg win vs loss)" },
  { id: "drawdown", label: "Drawdown & risk" },
  { id: "holdtime", label: "Hold time (winners vs losers)" },
  { id: "revenge", label: "Revenge-trading cost" },
  { id: "timeframe", label: "Timeframe analysis" },
  { id: "sessions", label: "Session performance" },
  { id: "edge", label: "Your trading edge" },
  { id: "calendar", label: "Calendar & heatmap" },
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
  "Sharpe ratio": "Return per unit of volatility, higher is steadier",
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

/* live local + UTC clock, isolated so it doesn't re-render the whole panel */
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
const k = (v, sym = "$") =>
  `${v < 0 ? "−" : "+"}${sym}${compactNumber(Math.abs(v))}`;

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
        <Tip key={i} content={t} block follow style={{ flex: 1 }}>
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

/* mode="signed" → bars grow up/down from the centre, green/red by sign
   (Daily P&L). mode="value" → single-colour bars grow from the bottom over a
   faint blank track; empty slots show as blank bars (Volume traded). */
function BarChart({ values, height = 140, tips, mode = "signed", color = "var(--color-success)" }) {
  const morphed = useMorph(values);
  // always render slots so "no data" shows as blank bars rather than nothing
  const bars = morphed.length ? morphed : new Array(7).fill(0);
  const max = Math.max(...bars.map((v) => Math.abs(v)), 1);

  if (mode === "value") {
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: "3%", height, width: "100%" }}>
        {bars.map((v, i) => {
          const fillPct = v === 0 ? 0 : Math.max(6, (Math.abs(v) / max) * 100);
          return (
            <Tip key={i} content={tips?.[i]} block follow style={{ flex: 1, height: "100%" }}>
              <div className="jx-tip--col" style={{ flex: 1, height: "100%", position: "relative", display: "flex", alignItems: "flex-end" }}>
                {/* blank track */}
                <div style={{ position: "absolute", inset: 0, borderRadius: 4, background: "var(--color-bg-muted)" }} />
                {/* blue value fill */}
                <div style={{ position: "relative", width: "100%", height: `${fillPct}%`, borderRadius: 4, background: color, transition: `height 0.6s ${BAR_EASE}` }} />
              </div>
            </Tip>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "3%", height, width: "100%" }}>
      {bars.map((v, i) => {
        const hPct = Math.max(8, (Math.abs(v) / max) * 48);
        return (
          <Tip key={i} content={tips?.[i]} block follow style={{ flex: 1, height: "100%" }}>
            <div className="jx-tip--col" style={{ flex: 1, height: "100%", position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  borderRadius: 4,
                  background: v >= 0 ? "var(--color-success)" : "var(--color-danger)",
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

  // nothing to show, render a faint placeholder ring
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
    `${s.label ?? ""}${s.label ? ", " : ""}${Math.round((v / total) * 100)}%`;

  return (
    <svg viewBox="0 0 120 120" style={{ width: size, height: size, flexShrink: 0 }}>
      {single ? (
        // a lone 100% slice, draw a full ring (arc path degenerates at 360°)
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
/* Equity candles. When `candleWidth` > 0 the chart becomes a fixed-width,
   horizontally scrollable + drag-to-pan surface (TradingView-style) for long
   histories; otherwise candles flex to fill the width. */
function CandleChart({ candles, height = 220, sym = "$", candleWidth = 0 }) {
  const outerRef = useRef(null);
  const scrollRef = useRef(null);
  const drag = useRef({ down: false, startX: 0, startLeft: 0 });
  const scrollable = candleWidth > 0;
  const GAP = 3; // px gap between candles in scroll mode (matches flex gap)
  const [hoverI, setHoverI] = useState(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [view, setView] = useState(null); // {start,end} visible candle indices

  // which candles are currently in view → the Y-axis scales to just these
  const recalcView = () => {
    const el = scrollRef.current;
    if (!el || !scrollable) { setView(null); return; }
    const stride = candleWidth + GAP;
    const start = Math.max(0, Math.floor(el.scrollLeft / stride));
    const count = Math.ceil(el.clientWidth / stride) + 1;
    setView({ start, end: Math.min(candles.length, start + count) });
  };

  // jump to the latest candle whenever the data or zoom changes, then measure
  useEffect(() => {
    const el = scrollRef.current;
    if (el && scrollable) el.scrollLeft = el.scrollWidth;
    recalcView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, candleWidth, scrollable]);

  if (!candles.length) return <Empty height={height} />;
  // scale the Y-axis to the visible window (falls back to all candles)
  const shown =
    scrollable && view && view.end > view.start
      ? candles.slice(view.start, view.end)
      : candles;
  const lo = Math.min(...shown.map((c) => c.l));
  const hi = Math.max(...shown.map((c) => c.h));
  const span = hi - lo || 1;
  const y = (v) => height - 8 - ((v - lo) / span) * (height - 16);

  const track = (e) => {
    const r = outerRef.current?.getBoundingClientRect();
    if (r) setCursor({ x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const onDown = (e) => {
    if (!scrollable || !scrollRef.current) return;
    drag.current = { down: true, startX: e.clientX, startLeft: scrollRef.current.scrollLeft };
    scrollRef.current.style.cursor = "grabbing";
  };
  const onMove = (e) => {
    track(e);
    if (drag.current.down && scrollRef.current) {
      scrollRef.current.scrollLeft = drag.current.startLeft - (e.clientX - drag.current.startX);
    }
  };
  const endDrag = () => {
    drag.current.down = false;
    if (scrollRef.current) scrollRef.current.style.cursor = scrollable ? "grab" : "crosshair";
  };
  const onWheel = (e) => {
    if (!scrollable || !scrollRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) scrollRef.current.scrollLeft += e.deltaY;
  };

  const totalW = candles.length * candleWidth;
  const hc = hoverI != null ? candles[hoverI] : null;
  const W = outerRef.current?.clientWidth || 320;

  return (
    <div ref={outerRef} style={{ position: "relative" }}>
      <div
        ref={scrollRef}
        className="jx-candle-scroll"
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={endDrag}
        onMouseLeave={() => { endDrag(); setHoverI(null); }}
        onWheel={onWheel}
        onScroll={recalcView}
        style={{
          height,
          overflowX: scrollable ? "auto" : "hidden",
          overflowY: "hidden",
          cursor: scrollable ? "grab" : "crosshair",
          userSelect: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: scrollable ? 3 : "0.6%",
            height: "100%",
            width: scrollable ? totalW : "100%",
            minWidth: scrollable ? totalW : "100%",
          }}
        >
          {candles.map((c, i) => {
            const up = c.c >= c.o;
            const color = up ? "var(--color-success)" : "var(--color-danger)";
            const bodyTop = y(Math.max(c.o, c.c));
            const bodyH = Math.max(2, Math.abs(y(c.o) - y(c.c)));
            return (
              <div
                key={`${c.label}-${i}`}
                onMouseEnter={() => setHoverI(i)}
                style={{
                  flex: scrollable ? "0 0 auto" : 1,
                  width: scrollable ? candleWidth : undefined,
                  minWidth: scrollable ? candleWidth : 0,
                  position: "relative",
                  height: "100%",
                  background: hoverI === i ? "color-mix(in srgb, var(--color-primary) 10%, transparent)" : "transparent",
                  borderRadius: 3,
                }}
              >
                {/* wick */}
                <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: y(c.h), height: Math.max(1, y(c.l) - y(c.h)), width: 1.5, background: color, opacity: 0.8, transition: "top 0.1s linear, height 0.1s linear" }} />
                {/* body */}
                <span style={{ position: "absolute", left: "12%", right: "12%", top: bodyTop, height: bodyH, background: color, borderRadius: 2, transition: "top 0.1s linear, height 0.1s linear" }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* cursor-following tooltip */}
      {hc && (
        <div
          style={{
            position: "absolute",
            left: Math.max(4, Math.min(cursor.x + 14, W - 176)),
            top: Math.max(4, cursor.y - 104),
            pointerEvents: "none",
            zIndex: 30,
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-strong)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 10px 28px rgba(0,0,0,0.5)",
            padding: "8px 10px",
            font: "var(--text-caption)",
            minWidth: 152,
            transition: "left 0.05s linear, top 0.05s linear",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{hc.label}</div>
          {[["Open", hc.o], ["Close", hc.c], ["High", hc.h], ["Low", hc.l]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: "var(--color-text-muted)" }}>{k}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{sym}{fmt(v, 0)}</span>
            </div>
          ))}
        </div>
      )}
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
  return candles.slice(-400);
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

const SESSION_COLORS = {
  sydney: "#a78bfa",
  asia: "#38bdf8",
  london: "#34d399",
  newyork: "#fbbf24",
};

/* 24-hour radial session clock: each FX session is an arc on the ring, the
   live one glows, and a hand sweeps to the current UTC time (live). */
function SessionClock({ sessions }) {
  const [now, setNow] = useState(() => new Date());
  const [h12, setH12] = useState(false); // 12-hour (AM/PM) vs 24-hour
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const cx = 100, cy = 100, r = 78;
  const C = 2 * Math.PI * r;
  const utcHNow = now.getUTCHours();
  const utcFrac = utcHNow + now.getUTCMinutes() / 60;
  const handAngle = (utcFrac / 24) * 360;
  const pad = (n) => String(n).padStart(2, "0");
  const hh = now.getHours();
  const ampm = hh >= 12 ? "PM" : "AM";
  const localTime = h12
    ? `${((hh + 11) % 12) + 1}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    : `${pad(hh)}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const utcHM = now.toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
    <svg viewBox="0 0 200 200" style={{ width: "100%", maxWidth: 260, display: "block", margin: "0 auto", overflow: "visible" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={15} />
      {/* hour ticks */}
      {[...Array(24)].map((_, h) => {
        const ang = (h / 24) * 2 * Math.PI - Math.PI / 2;
        const major = h % 6 === 0;
        const r1 = r + 10, r2 = r + (major ? 17 : 14);
        return (
          <line key={h}
            x1={cx + r1 * Math.cos(ang)} y1={cy + r1 * Math.sin(ang)}
            x2={cx + r2 * Math.cos(ang)} y2={cy + r2 * Math.sin(ang)}
            stroke={major ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.13)"}
            strokeWidth={major ? 1.5 : 1} />
        );
      })}
      {[0, 6, 12, 18].map((h) => {
        const ang = (h / 24) * 2 * Math.PI - Math.PI / 2;
        const rr = r + 28;
        return (
          <text key={h} x={cx + rr * Math.cos(ang)} y={cy + rr * Math.sin(ang) + 3.5} textAnchor="middle" fill="var(--color-text-muted)" style={{ font: "600 9px Poppins" }}>
            {String(h).padStart(2, "0")}
          </text>
        );
      })}
      {/* session arcs */}
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {sessions.map((s) => {
          const live = s.test(utcHNow);
          const col = SESSION_COLORS[s.id] || "var(--color-primary)";
          const startLen = (s.lo / 24) * C;
          const arcLen = ((s.hi - s.lo) / 24) * C;
          return (
            <circle key={s.id} cx={cx} cy={cy} r={r} fill="none"
              stroke={col} strokeWidth={live ? 17 : 13}
              strokeDasharray={`${Math.max(0, arcLen - 2)} ${C - arcLen + 2}`}
              strokeDashoffset={-startLen}
              opacity={s.trades > 0 ? 1 : 0.45}
              style={{ transition: "stroke-width .3s ease, opacity .3s ease", filter: live ? `drop-shadow(0 0 5px ${col})` : "none" }}>
              {live && <animate attributeName="opacity" values="1;0.6;1" dur="2.4s" repeatCount="indefinite" />}
            </circle>
          );
        })}
      </g>
      {/* now hand — rotate in view-box space so it pivots on the true centre */}
      <g style={{ transform: `rotate(${handAngle}deg)`, transformBox: "view-box", transformOrigin: "100px 100px", transition: "transform 0.9s cubic-bezier(0.4,0,0.2,1)" }}>
        <line x1={cx} y1={cy} x2={cx} y2={cy - r - 5} stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity="0.9" />
        <circle cx={cx} cy={cy - r} r={4.5} fill="#fff" style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.6))" }} />
      </g>
      {/* center face */}
      <circle cx={cx} cy={cy} r={52} fill="var(--color-bg-elevated)" stroke="rgba(255,255,255,0.06)" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--color-text-primary)" style={{ font: "600 17px Poppins", letterSpacing: "-0.3px", fontVariantNumeric: "tabular-nums" }}>{localTime}</text>
      <text x={cx} y={cy + 13} textAnchor="middle" fill="var(--color-text-muted)" style={{ font: "600 9px Poppins", letterSpacing: "0.6px" }}>{h12 ? `${ampm} · ` : ""}{utcHM} UTC</text>
    </svg>
    <div className="jx-seg jx-seg--inline" role="tablist" aria-label="Time format">
      <button type="button" className={`jx-seg__btn${!h12 ? " jx-seg__btn--active" : ""}`} aria-pressed={!h12} onClick={() => setH12(false)}>24H</button>
      <button type="button" className={`jx-seg__btn${h12 ? " jx-seg__btn--active" : ""}`} aria-pressed={h12} onClick={() => setH12(true)}>AM/PM</button>
    </div>
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

/* range helpers, windows are anchored to the latest trade so sample
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

/* compact human duration from milliseconds */
const fmtDur = (ms) => {
  if (!ms || ms <= 0) return ", ";
  const m = ms / 60000;
  if (m < 60) return `${Math.round(m)}m`;
  const h = m / 60;
  if (h < 24) return `${h < 10 ? h.toFixed(1) : Math.round(h)}h`;
  const d = h / 24;
  return `${d < 10 ? d.toFixed(1) : Math.round(d)}d`;
};

/* ================================================================ */
export default function OverviewPanel({
  trades: tradesProp = [],
  currencySymbol = "$",
  fxRate = 1,
  userName,
  usingDummy,
  startingBalance: startingBalanceProp = 0,
  onLogTrade,
  onImport,
  onSetBalance,
}) {
  // Convert NATIVE trades to the chosen display currency here (Overview never
  // edits trades, so converting for display is safe). All downstream code uses
  // `trades` / `startingBalance` exactly as before.
  const trades = useMemo(
    () => (fxRate === 1 ? tradesProp : tradesProp.map((t) => convertTrade(t, fxRate))),
    [tradesProp, fxRate],
  );
  const startingBalance = (Number(startingBalanceProp) || 0) * fxRate;
  const [heroRange, setHeroRange] = useState("30D");
  const [candleTF, setCandleTF] = useState("1D");
  const [equityRange, setEquityRange] = useState("All"); // 7D | 14D | 30D | All
  const [equityZoom] = useState(18); // candle px width in scroll mode
  const analyticsRange = "ALL"; // header range tabs removed, charts cover full history
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
      score >= 75 ? "Your pace looks healthy, keep waiting for clean setups."
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
     recent daily performance, so a rough patch doesn't crush momentum. */
  const encourage = useMemo(() => {
    if (!closed.length) return null;
    const byDay = new Map();  // day ts -> net pnl
    const cntDay = new Map(); // day ts -> trade count
    closed.forEach((t) => {
      const d = new Date(t.closeTime);
      if (Number.isNaN(d.getTime())) return;
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      byDay.set(key, (byDay.get(key) || 0) + (Number(t.pnl) || 0));
      cntDay.set(key, (cntDay.get(key) || 0) + 1);
    });
    const days = [...byDay.entries()].sort((a, b) => a[0] - b[0]); // [ts, net] asc
    if (!days.length) return null;
    const now = Date.now();
    const ago = (n) => now - n * 864e5;
    const between = (lo, hi) => days.filter(([ts]) => ts >= lo && ts < hi).reduce((s, [, v]) => s + v, 0);
    const last7 = between(ago(7), now + 864e5);
    const prev7 = between(ago(14), ago(7));

    // consecutive winning / losing days, counting back from the most recent
    let greenStreak = 0;
    for (let i = days.length - 1; i >= 0; i--) { if (days[i][1] > 0) greenStreak++; else break; }
    let redStreak = 0;
    for (let i = days.length - 1; i >= 0; i--) { if (days[i][1] < 0) redStreak++; else break; }
    const lastDayNet = days[days.length - 1][1];
    let priorGreen = 0;
    if (lastDayNet < 0) {
      for (let i = days.length - 2; i >= 0; i--) { if (days[i][1] > 0) priorGreen++; else break; }
    }

    // overtrading: today's trade count vs the trader's usual active-day count
    const t0 = new Date();
    const todayKey = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate()).getTime();
    const todayCount = cntDay.get(todayKey) || 0;
    const todayNet = byDay.get(todayKey) || 0;
    const priorCounts = [...cntDay.entries()].filter(([ts]) => ts !== todayKey).map(([, c]) => c);
    const typical = priorCounts.length ? priorCounts.reduce((s, c) => s + c, 0) / priorCounts.length : 0;
    const overtrading = todayCount >= 8 || (todayCount >= 5 && typical > 0 && todayCount >= typical * 2.5);

    const recent = days.slice(-7).map(([, v]) => v);
    const base = { recent };

    // ---- wellbeing first: cushion losses, gently flag overtrading.
    //      One short line, this renders as a slim stripe, not a card. ----
    if (overtrading && todayNet < 0)
      return { ...base, tone: "warn", icon: "coffee", text: `${todayCount} trades and red, step away, come back fresh tomorrow.` };
    if (overtrading)
      return { ...base, tone: "info", icon: "coffee", text: `${todayCount} trades today, wait for only your A+ setups.` };
    if (redStreak >= 2)
      return { ...base, tone: "warn", icon: "shield", text: `A ${redStreak}-day dip is normal, protect capital, stick to your plan.` };
    if (prev7 < 0 && last7 > 0)
      return { ...base, tone: "success", icon: "up", text: "Nice turnaround this week, keep doing what's working." };
    if (lastDayNet < 0 && priorGreen >= 3)
      return { ...base, tone: "warn", icon: "shield", text: `One red day after ${priorGreen} green, nothing to fix, run your plan.` };
    if (greenStreak >= 3)
      return { ...base, tone: "success", icon: "flame", text: `${greenStreak}-day green streak, protect your gains, keep risk tight.` };
    if (last7 < 0)
      return { ...base, tone: "warn", icon: "shield", text: "A losing week is part of the game, size down, trust your setups." };
    if (lastDayNet < 0 && last7 > 0)
      return { ...base, tone: "info", icon: "up", text: "Down day, winning week, the trend's still your friend." };
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

    /* per symbol / allocation / volume, within analytics window */
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
      const price = t.avgEntryPrice || t.entryPrice || 0;
      const qty = t.totalQuantity || 0;
      // real notional, else fall back to |P&L| so quick-logged trades (size 0)
      // still contribute a bar, mirrors the Volume-traded total
      const notional = price && qty ? Math.abs(price * qty) : Math.abs(Number(t.pnl) || 0);
      volByDay.set(d, (volByDay.get(d) || 0) + notional * (t.pnl >= 0 ? 1 : -1));
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

    // achievement badges (milestones) — each carries current value + target so
    // the UI can show real progress, not just locked/unlocked.
    const wrGate = Math.min(total, 20); // win-rate badge needs 20+ trades
    const rawBadges = [
      { id: "first", icon: "🎯", label: "First trade", group: "Volume", cur: total, target: 1, type: "count", hint: "Log your first trade" },
      { id: "ten", icon: "📒", label: "10 trades", group: "Volume", cur: total, target: 10, type: "count", hint: "Log 10 trades" },
      { id: "fifty", icon: "📚", label: "50 trades", group: "Volume", cur: total, target: 50, type: "count", hint: "Log 50 trades" },
      { id: "hundred", icon: "🏛️", label: "Centurion", group: "Volume", cur: total, target: 100, type: "count", hint: "Log 100 trades" },
      { id: "streak5", icon: "🔥", label: "5-win streak", group: "Streaks", cur: bestWin, target: 5, type: "count", hint: "Win 5 trades in a row" },
      { id: "streak10", icon: "⚡", label: "10-win streak", group: "Streaks", cur: bestWin, target: 10, type: "count", hint: "Win 10 trades in a row" },
      { id: "green5", icon: "🌱", label: "5 green days", group: "Consistency", cur: bestGreenDays, target: 5, type: "count", hint: "5 profitable days in a row" },
      { id: "wr60", icon: "🎖️", label: "60% win rate", group: "Consistency", cur: winRate, target: 60, type: "pct", gate: total >= 20, gateCur: wrGate, gateTarget: 20, hint: "60%+ win rate over 20+ trades" },
      { id: "profit1k", icon: "💰", label: "₹1k profit", group: "Profit", cur: net, target: 1000, type: "money", hint: "Reach ₹1,000 net P&L" },
      { id: "profit10k", icon: "💎", label: "₹10k profit", group: "Profit", cur: net, target: 10000, type: "money", hint: "Reach ₹10,000 net P&L" },
    ];
    const badges = rawBadges.map((b) => {
      let ratio = b.target > 0 ? Math.max(0, b.cur) / b.target : 0;
      // gated badges (e.g. 60% win rate needs 20+ trades) — progress reflects
      // whichever requirement is further behind, so it never shows 100% early.
      if (b.gate !== undefined) {
        const gateRatio = b.gateTarget > 0 ? Math.max(0, b.gateCur) / b.gateTarget : 1;
        ratio = Math.min(ratio, gateRatio);
      }
      const got = (b.gate === undefined ? true : b.gate) && b.cur >= b.target;
      return { ...b, prog: Math.max(0, Math.min(1, ratio)), got };
    });
    const unlocked = badges.filter((b) => b.got).length;
    // "next" milestone = the locked badge closest to completion
    const nextBadge =
      badges
        .filter((b) => !b.got)
        .sort((a, b) => b.prog - a.prog)[0] || null;

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
      net,
      winRate,
      nextBadge,
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

  /* ---- which trading session is live right now + time left, so the top of
     the dashboard nudges the user when their most profitable window opens ---- */
  const [minuteTick, setMinuteTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMinuteTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const [barHover, setBarHover] = useState(null); // index of hovered day bar
  const liveSession = useMemo(() => {
    const now = new Date();
    const h = now.getUTCHours();
    const m = now.getUTCMinutes();
    const cur = SESSIONS.list.find((d) => d.test(h));
    if (!cur) return null;
    const remMin = Math.max(0, cur.hi * 60 - (h * 60 + m));
    return {
      cur,
      remH: Math.floor(remMin / 60),
      remM: remMin % 60,
      isBest: !!(SESSIONS.best && SESSIONS.best.id === cur.id && SESSIONS.best.pnl > 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SESSIONS, minuteTick]);

  /* ---- last-30-days P&L summed per weekday (Mon→Sun): 7 bars, green profit /
     red loss, best weekday highlighted, for the mini chart in the live strip ---- */
  const weekday7 = useMemo(() => {
    const DAYS = 30;
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (DAYS - 1));
    const short = ["M", "T", "W", "T", "F", "S", "S"];
    const full = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const acc = Array.from({ length: 7 }, () => ({ pnl: 0, trades: 0, wins: 0 }));
    closed.forEach((t) => {
      const when = t.closeTime || t.openTime;
      if (!when) return;
      const d = new Date(when);
      if (d < start) return;
      const idx = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
      const p = Number(t.pnl) || 0;
      acc[idx].pnl += p;
      acc[idx].trades += 1;
      if (p > 0) acc[idx].wins += 1;
    });
    const bars = acc.map((a, i) => ({ ...a, label: short[i], full: full[i], has: a.trades > 0 }));
    const maxAbs = Math.max(1, ...bars.map((b) => Math.abs(b.pnl)));
    const profitDays = bars.filter((b) => b.pnl > 0).length;
    const lossDays = bars.filter((b) => b.pnl < 0).length;
    let bestIdx = -1;
    bars.forEach((b, i) => {
      if (b.pnl > 0 && (bestIdx < 0 || b.pnl > bars[bestIdx].pnl)) bestIdx = i;
    });
    // last-30-day totals (the "minimal" numbers merged into the top strip)
    const net = bars.reduce((s, b) => s + b.pnl, 0);
    const trades = bars.reduce((s, b) => s + b.trades, 0);
    const wins = acc.reduce((s, a) => s + a.wins, 0);
    const winRate = trades ? (wins / trades) * 100 : 0;
    const todayIdx = (new Date().getDay() + 6) % 7;
    // change vs the previous 30-day window, for the headline badge
    const prevStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (DAYS * 2 - 1));
    let prevNet = 0;
    closed.forEach((t) => {
      const when = t.closeTime || t.openTime;
      if (!when) return;
      const d = new Date(when);
      if (d >= prevStart && d < start) prevNet += Number(t.pnl) || 0;
    });
    const changePct = prevNet !== 0 ? ((net - prevNet) / Math.abs(prevNet)) * 100 : net > 0 ? 100 : 0;
    return { bars, maxAbs, profitDays, lossDays, bestIdx, best: bestIdx >= 0 ? bars[bestIdx] : null, net, trades, winRate, todayIdx, changePct, hasPrev: prevNet !== 0 };
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
      tips.push({
        title: `${new Date(t.closeTime).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · ${t.symbol || ""}`,
        rows: [
          ["Trade", k(Number(t.pnl) || 0, currencySymbol)],
          ["Total", k(run, currencySymbol)],
        ],
      });
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

  /* ---- capital growth toward doubling (gamified) ---- */
  const capital = useMemo(() => {
    const base = Number(startingBalance) || 0;
    const netAll = closed.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    // 100% = capital doubled (profit equals the starting balance)
    const growthPct = base > 0 ? (netAll / base) * 100 : 0;
    const milestones = [25, 50, 75, 100];
    const reachedCount = milestones.filter((m) => growthPct >= m).length;
    const nextMs = milestones.find((m) => growthPct < m) ?? null;
    const amountToNext =
      nextMs != null && base > 0 ? (nextMs / 100) * base - netAll : 0;
    const tier =
      growthPct >= 100 ? { label: "Capital doubled!", emoji: "💎", color: "var(--color-success-strong)" }
      : growthPct >= 75 ? { label: "Almost doubled", emoji: "🥇", color: "var(--yellow-500)" }
      : growthPct >= 50 ? { label: "Halfway there", emoji: "🥈", color: "var(--color-primary)" }
      : growthPct >= 25 ? { label: "Climbing", emoji: "🥉", color: "var(--color-primary)" }
      : growthPct > 0 ? { label: "Building up", emoji: "🌱", color: "var(--color-success)" }
      : { label: "Getting started", emoji: "🚀", color: "var(--color-text-muted)" };
    return { base, netAll, growthPct, milestones, reachedCount, nextMs, amountToNext, tier };
  }, [closed, startingBalance]);

  /* ---- timeframe usage (which timeframes they trade most) ---- */
  const timeframes = useMemo(() => {
    const map = new Map(); // key (lower) -> { display, count, pnl }
    closed.forEach((t) => {
      const raw = (t.timeframe || "").toString().trim();
      if (!raw) return;
      const key = raw.toLowerCase();
      const cur = map.get(key) || { display: key, count: 0, pnl: 0 };
      cur.count += 1;
      cur.pnl += Number(t.pnl) || 0;
      map.set(key, cur);
    });
    // always show these defaults even at zero
    ["5m", "15m", "1h"].forEach((d) => {
      if (!map.has(d)) map.set(d, { display: d, count: 0, pnl: 0 });
    });
    const total = [...map.values()].reduce((s, x) => s + x.count, 0);
    // nice label: 1h → 1H, 1d → 1D (keep minutes lowercase)
    const pretty = (k) => k.replace(/h$/, "H").replace(/d$/, "D");
    const arr = [...map.values()]
      .map((x) => ({ ...x, display: pretty(x.display), pct: total ? (x.count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count || a.display.localeCompare(b.display));
    const most = arr.find((x) => x.count > 0) || null;
    const tradedCount = arr.filter((x) => x.count > 0).length;
    return { arr, total, most, tradedCount };
  }, [closed]);

  /* ---- payoff & expectancy (avg win vs avg loss) ---- */
  const payoff = useMemo(() => {
    const pnls = closed.map((t) => Number(t.pnl) || 0);
    if (!pnls.length) return null;
    const wins = pnls.filter((p) => p > 0);
    const losses = pnls.filter((p) => p < 0);
    const avgWin = wins.length ? wins.reduce((s, p) => s + p, 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, p) => s + p, 0) / losses.length) : 0;
    const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? Infinity : 0);
    const winRate = pnls.length ? wins.length / pnls.length : 0;
    const expectancy = pnls.reduce((s, p) => s + p, 0) / pnls.length;
    return { avgWin, avgLoss, payoffRatio, winRate, expectancy, wins: wins.length, losses: losses.length };
  }, [closed]);

  /* ---- drawdown (peak-to-trough on equity) ---- */
  const drawdown = useMemo(() => {
    if (!closed.length) return null;
    const base = Number(startingBalance) || 0;
    let eq = base, peak = base, maxDD = 0, maxDDpct = 0;
    closed.forEach((t) => {
      eq += Number(t.pnl) || 0;
      if (eq > peak) peak = eq;
      const dd = peak - eq;
      if (dd > maxDD) { maxDD = dd; maxDDpct = peak > 0 ? (dd / peak) * 100 : 0; }
    });
    const curDD = peak - eq;
    const curDDpct = peak > 0 ? (curDD / peak) * 100 : 0;
    return { base, eq, peak, maxDD, maxDDpct, curDD, curDDpct, hasPct: base > 0 };
  }, [closed, startingBalance]);

  /* ---- disposition effect: hold time of winners vs losers ---- */
  const holdTime = useMemo(() => {
    const dur = (t) => {
      const o = new Date(t.openTime || 0).getTime();
      const c = new Date(t.closeTime || 0).getTime();
      const d = c - o;
      return o && c && d > 0 ? d : 0;
    };
    const w = closed.filter((t) => (Number(t.pnl) || 0) > 0).map(dur).filter((d) => d > 0);
    const l = closed.filter((t) => (Number(t.pnl) || 0) < 0).map(dur).filter((d) => d > 0);
    if (w.length < 2 || l.length < 2) return null;
    const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
    const winAvg = avg(w), lossAvg = avg(l);
    return { winAvg, lossAvg, ratio: winAvg > 0 ? lossAvg / winAvg : 0, holdsLosersLonger: lossAvg > winAvg * 1.1 };
  }, [closed]);

  /* ---- revenge trading cost (trades within 30m after a loss) ---- */
  const revenge = useMemo(() => {
    const cl = closed; // sorted asc
    let revPnl = 0, revCount = 0, calmPnl = 0, calmCount = 0, revWins = 0;
    for (let i = 0; i < cl.length; i++) {
      const prev = cl[i - 1];
      const gap = prev ? new Date(cl[i].openTime || cl[i].closeTime) - new Date(prev.closeTime) : Infinity;
      const isRevenge = prev && (Number(prev.pnl) || 0) < 0 && gap <= 30 * 60 * 1000;
      const p = Number(cl[i].pnl) || 0;
      if (isRevenge) { revPnl += p; revCount++; if (p > 0) revWins++; }
      else { calmPnl += p; calmCount++; }
    }
    if (revCount === 0) return null;
    return {
      revPnl, revCount, calmPnl, calmCount,
      avgRev: revPnl / revCount,
      avgCalm: calmCount ? calmPnl / calmCount : 0,
      revWinRate: revCount ? revWins / revCount : 0,
    };
  }, [closed]);

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
    // Trimmed for focus — keep Core KPIs, Equity, Calendar/day-of-week, and
    // Trading edge & session up front. The deeper cuts stay one tap away in
    // Customize (users who already customized keep their own choice).
    ["capital", "pace", "payoff", "drawdown", "holdtime", "revenge", "timeframe"],
  );

  // small hover "hide" eye shown on each section card; re-show via Customize
  const HideBtn = ({ id }) => (
    <button
      type="button"
      className="jx-sec__hide"
      title="Hide this section, re-enable from Customize"
      aria-label="Hide this section"
      onClick={(e) => { e.stopPropagation(); toggle(id); }}
    >
      <EyeOff size={14} />
    </button>
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
          order: -2,
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
        {/* hide the header CTA while on sample data, the banner below
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

      {/* ===== Live session strip — which session is open now + time left ===== */}
      {liveSession && !usingDummy && (
        <div className="jx-livestrip" data-best={liveSession.isBest ? "1" : "0"} style={{ order: -2 }}>
          <div className="jx-livestrip__row">
            <span className="jx-livestrip__live">
              <span className="jx-livestrip__dot" />
              Live
            </span>
            <span className="jx-livestrip__label">
              {liveSession.cur.label} session{liveSession.isBest ? " — your most profitable window" : " is open"}
            </span>
            {liveSession.isBest && (
              <Badge variant="success"><Crown size={11} /> Best</Badge>
            )}
            <span className="jx-livestrip__meta">
              <span className="jx-livestrip__date">
                {new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
              </span>
              <span style={{ opacity: 0.4 }}>·</span>
              <Clock size={13} />
              {liveSession.remH > 0 ? `${liveSession.remH}h ` : ""}{liveSession.remM}m left
              {liveSession.cur.trades > 0 ? ` · ${Math.round(liveSession.cur.winRate)}% win here` : ""}
            </span>
          </div>
          {/* merged 30-day headline stats (from the old profit card) */}
          <div className="jx-livestrip__stats">
            <div className="jx-livestrip__stat">
              <span className="jx-livestrip__stat-l">Net P&amp;L · 30d</span>
              <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span
                  className="jx-livestrip__stat-v"
                  style={{ color: weekday7.net >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}
                >
                  {k(weekday7.net, currencySymbol)}
                </span>
                {weekday7.hasPrev && (
                  <span
                    className="jx-livestrip__delta"
                    style={{
                      color: weekday7.changePct >= 0 ? "var(--color-success)" : "var(--color-danger)",
                      background: weekday7.changePct >= 0 ? "var(--color-success-subtle)" : "var(--color-danger-subtle)",
                    }}
                  >
                    {weekday7.changePct >= 0 ? "▲" : "▼"} {Math.abs(Math.round(weekday7.changePct))}%
                  </span>
                )}
              </span>
            </div>
            <div className="jx-livestrip__stat">
              <span className="jx-livestrip__stat-l">Trades</span>
              <span className="jx-livestrip__stat-v">{weekday7.trades}</span>
            </div>
            <div className="jx-livestrip__stat">
              <span className="jx-livestrip__stat-l">Win rate</span>
              <span className="jx-livestrip__stat-v">{Math.round(weekday7.winRate)}%</span>
            </div>
          </div>

          <div className="jx-livestrip__note">
            <Coffee size={13} style={{ flexShrink: 0, color: "var(--yellow-500)" }} />
            <span>
              Trade your plan, not your mood — if you&apos;re stressed or on tilt, take a breather and reset before you log a trade.
            </span>
          </div>

          {/* P&L by weekday (last 30 days) — 7 summed bars */}
          <div className="jx-livestrip__chart">
            <div className="jx-livestrip__chart-head">
              <span style={{ fontWeight: 600, color: "var(--color-text-secondary)" }}>P&amp;L by weekday · 30d</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--color-success)" }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: "var(--color-success)" }} />
                  {weekday7.profitDays} up
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--color-danger)" }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: "var(--color-danger)" }} />
                  {weekday7.lossDays} down
                </span>
                {weekday7.best && (
                  <span style={{ color: "var(--yellow-600)", fontWeight: 600 }}>
                    Best {k(weekday7.best.pnl, currencySymbol)} · {weekday7.best.full}
                  </span>
                )}
              </span>
            </div>
            <div className="jx-livestrip__bars" onMouseLeave={() => setBarHover(null)}>
              {/* zero baseline */}
              <span className="jx-livestrip__baseline" aria-hidden="true" />

              {/* custom tooltip for the hovered weekday */}
              {barHover != null && weekday7.bars[barHover] && (() => {
                const b = weekday7.bars[barHover];
                const pos = ((barHover + 0.5) / weekday7.bars.length) * 100;
                return (
                  <div
                    className="jx-livestrip__tip"
                    style={{ left: `${pos}%`, transform: `translateX(${barHover < 1 ? "0" : barHover > weekday7.bars.length - 2 ? "-100%" : "-50%"})` }}
                  >
                    <span style={{ color: "var(--color-text-muted)" }}>
                      {b.full} · {b.trades} trade{b.trades === 1 ? "" : "s"}
                    </span>
                    <strong style={{ color: !b.has ? "var(--color-text-muted)" : b.pnl >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>
                      {b.has ? `${b.pnl >= 0 ? "+" : "−"}${currencySymbol}${fmt(Math.abs(b.pnl), 0)}` : "No trades"}
                    </strong>
                  </div>
                );
              })()}

              {weekday7.bars.map((b, i) => {
                const up = b.pnl > 0;
                const down = b.pnl < 0;
                // gentle power scale + high floor so every traded weekday reads
                // as a proper bar (not a sliver) next to the biggest one
                const h = b.has ? Math.max(16, Math.round(Math.pow(Math.abs(b.pnl) / weekday7.maxAbs, 0.4) * 34)) : 0;
                const isBest = i === weekday7.bestIdx;
                const isToday = i === weekday7.todayIdx;
                return (
                  <div
                    key={i}
                    className={`jx-livestrip__bar${i === barHover ? " is-hover" : ""}${isToday ? " is-today" : ""}`}
                    onMouseEnter={() => setBarHover(i)}
                  >
                    <span className="jx-livestrip__bar-half jx-livestrip__bar-half--up">
                      {up && (
                        <span
                          style={{
                            height: h,
                            background: isBest ? "var(--yellow-400)" : "var(--color-success)",
                            boxShadow: isBest ? "0 0 7px color-mix(in srgb, var(--yellow-400) 65%, transparent)" : "none",
                          }}
                        />
                      )}
                    </span>
                    <span className="jx-livestrip__bar-half jx-livestrip__bar-half--down">
                      {down && <span style={{ height: h, background: "var(--color-danger)" }} />}
                      {!b.has && <span className="jx-livestrip__bar-empty" />}
                    </span>
                    <span
                      className="jx-livestrip__bar-label"
                      style={isBest ? { color: "var(--yellow-600)", fontWeight: 700 } : undefined}
                    >
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* sample-data nudge */}
      {usingDummy && (
        <SampleDataBanner onLog={onLogTrade} onImport={onImport} />
      )}

      {/* ===== Hero card removed — its headline numbers are merged into the
          live strip above; kept out of render so the top is a single card ===== */}
      {false && (
      <div
        className="jx-card jx-hero-grid"
        style={{
          order: -2,
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
                font: "600 28px/34px var(--jx-font)",
                letterSpacing: "-0.5px",
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
              : encourage.icon === "shield" ? Shield
              : encourage.icon === "coffee" ? Coffee
              : TrendingUp;
            // slim single-line stripe, deliberately compact, not a card
            return (
              <div
                style={{
                  marginTop: "var(--space-3)",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-md)",
                  background: bg,
                  border: `1px solid ${accent}33`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Icon size={14} style={{ color: accent, flexShrink: 0 }} />
                <span style={{ font: "var(--text-caption)", color: "var(--color-text-secondary)", lineHeight: 1.35 }}>
                  {encourage.text}
                </span>
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
      )}

      {/* ===== Progress cards ===== */}
      {isVisible("progress") && (
      <div
        style={{
          order: -2,
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

      {/* ===== Capital growth toward doubling (gamified) ===== */}
      {isVisible("capital") && (
        <div className="jx-card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <span className="jx-card__title" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              Capital growth <InfoTip text="Progress toward doubling your starting balance (100% = 2×). Based on net P&L." />
            </span>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 999,
                background: "var(--color-bg-muted)", border: "1px solid var(--color-border)",
                font: "var(--text-caption)", fontWeight: 700, color: capital.tier.color,
              }}
            >
              <span style={{ fontSize: 15 }}>{capital.tier.emoji}</span> {capital.tier.label}
            </span>
          </div>

          {capital.base > 0 ? (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span style={{ font: "var(--text-stat)", letterSpacing: "-1px", color: capital.growthPct >= 0 ? "var(--color-text-primary)" : "var(--color-danger-strong)" }}>
                  <CountUp value={capital.growthPct} format={(v) => `${v >= 0 ? "" : ""}${fmt(v, 1)}%`} />
                </span>
                <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                  of the way to 2× · {currencySymbol}{fmt(capital.netAll, 0)} / {currencySymbol}{fmt(capital.base, 0)}
                </span>
              </div>

              {/* milestone progress bar with ticks at 25/50/75/100 */}
              <div style={{ position: "relative", height: 12, marginTop: 2 }}>
                <div className="jx-progress" style={{ height: 12, borderRadius: 999 }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, capital.growthPct))}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: "linear-gradient(90deg, var(--color-primary), var(--color-success))",
                      transition: `width 0.9s ${BAR_EASE}`,
                    }}
                  />
                </div>
                {[25, 50, 75, 100].map((m) => (
                  <span
                    key={m}
                    title={`${m}%`}
                    style={{
                      position: "absolute", top: -2, left: `calc(${m}% - 1px)`,
                      width: 2, height: 16,
                      background: capital.growthPct >= m ? "var(--color-success-strong)" : "var(--color-border-strong)",
                      borderRadius: 2,
                    }}
                  />
                ))}
              </div>

              {/* milestone chips */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {capital.milestones.map((m) => {
                  const done = capital.growthPct >= m;
                  return (
                    <span
                      key={m}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "4px 10px", borderRadius: 999,
                        font: "var(--text-caption)", fontWeight: 600,
                        background: done ? "var(--color-success-subtle)" : "var(--color-bg-muted)",
                        color: done ? "var(--color-success-strong)" : "var(--color-text-muted)",
                        border: `1px solid ${done ? "var(--color-success)" : "var(--color-border)"}`,
                      }}
                    >
                      {done ? "✓" : "○"} {m}%
                    </span>
                  );
                })}
              </div>

              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                {capital.growthPct >= 100
                  ? "🎉 You've doubled your starting capital, outstanding discipline."
                  : capital.nextMs != null
                    ? `${currencySymbol}${fmt(Math.max(0, capital.amountToNext), 0)} more in net profit to hit the ${capital.nextMs}% milestone.`
                    : "Keep logging trades to track your growth."}
              </span>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--space-3)" }}>
              <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>
                Set your journal&apos;s starting balance to track progress toward doubling your capital.
              </span>
              <button
                type="button"
                onClick={() => onSetBalance?.()}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border-strong)", background: "transparent",
                  color: "var(--yellow-500)", font: "var(--text-body-md)", fontWeight: 600, cursor: "pointer",
                }}
              >
                Set starting balance <span aria-hidden>→</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== Analytics / psychology cards, 2-per-row grid ===== */}
      <div className="jx-analytics-grid">
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
          <div className="jx-card jx-sec">
            <HideBtn id="pace" />
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "var(--space-3)" }}>
              <span className="jx-card__title">Trading pace</span>
              <InfoTip text="How fast and how often you trade, a calm, selective pace usually beats rapid-fire trading." />
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

      {/* ===== Payoff ===== */}
      {isVisible("payoff") && payoff && (() => {
            const maxAvg = Math.max(payoff.avgWin, payoff.avgLoss, 1);
            const lossBigger = payoff.avgLoss > payoff.avgWin && payoff.avgWin > 0;
            return (
              <div className="jx-card jx-sec" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <HideBtn id="payoff" />
                <span className="jx-card__title" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  Payoff <InfoTip text="Average win vs average loss. A high win rate still loses money if your losses are bigger than your wins." />
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 64, font: "var(--text-caption)", color: "var(--color-text-muted)" }}>Avg win</span>
                    <div className="jx-progress" style={{ flex: 1, height: 10 }}>
                      <div style={{ width: `${(payoff.avgWin / maxAvg) * 100}%`, height: "100%", borderRadius: 999, background: "var(--color-success)", transition: `width 0.9s ${BAR_EASE}` }} />
                    </div>
                    <span style={{ width: 72, textAlign: "right", font: "var(--text-caption)", fontWeight: 700, color: "var(--color-success-strong)" }}>{k(payoff.avgWin, currencySymbol)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 64, font: "var(--text-caption)", color: "var(--color-text-muted)" }}>Avg loss</span>
                    <div className="jx-progress" style={{ flex: 1, height: 10 }}>
                      <div style={{ width: `${(payoff.avgLoss / maxAvg) * 100}%`, height: "100%", borderRadius: 999, background: "var(--color-danger)", transition: `width 0.9s ${BAR_EASE}` }} />
                    </div>
                    <span style={{ width: 72, textAlign: "right", font: "var(--text-caption)", fontWeight: 700, color: "var(--color-danger-strong)" }}>{k(payoff.avgLoss, currencySymbol)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "var(--space-5)", flexWrap: "wrap" }}>
                  <div>
                    <span style={LABEL}>Payoff ratio</span>
                    <div style={{ font: "var(--text-h3)", fontWeight: 700, color: payoff.payoffRatio >= 1 ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>
                      {payoff.payoffRatio === Infinity ? "∞" : `${fmt(payoff.payoffRatio, 2)} : 1`}
                    </div>
                  </div>
                  <div>
                    <span style={LABEL}>Win / loss</span>
                    <div style={{ font: "var(--text-h3)", fontWeight: 700 }}>
                      {payoff.wins} W · {payoff.losses} L
                    </div>
                  </div>
                </div>
                <span style={{ font: "var(--text-caption)", color: lossBigger ? "var(--color-danger-strong)" : "var(--color-text-muted)" }}>
                  {lossBigger
                    ? "⚠️ Your average loss is bigger than your average win, tighten stops or let winners run longer."
                    : "Your average win is bigger than your average loss, keep risk consistent."}
                </span>
              </div>
            );
          })()}

          {isVisible("drawdown") && drawdown && (
            <div className="jx-card jx-sec" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <HideBtn id="drawdown" />
              <span className="jx-card__title" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                Drawdown &amp; risk <InfoTip text="The biggest drop from an equity peak. Large drawdowns usually come from oversizing or revenge trading." />
              </span>
              <div style={{ display: "flex", gap: "var(--space-5)", flexWrap: "wrap" }}>
                <div>
                  <span style={LABEL}>Max drawdown</span>
                  <div style={{ font: "var(--text-stat)", letterSpacing: "-1px", color: "var(--color-danger-strong)" }}>
                    {drawdown.hasPct ? `${fmt(drawdown.maxDDpct, 1)}%` : k(drawdown.maxDD, currencySymbol)}
                  </div>
                  <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                    {drawdown.hasPct ? `${k(drawdown.maxDD, currencySymbol)} from peak` : "peak-to-trough"}
                  </span>
                </div>
                <div>
                  <span style={LABEL}>Current drawdown</span>
                  <div style={{ font: "var(--text-stat)", letterSpacing: "-1px", color: drawdown.curDD > 0 ? "var(--color-danger-strong)" : "var(--color-success-strong)" }}>
                    {drawdown.curDD > 0 ? (drawdown.hasPct ? `${fmt(drawdown.curDDpct, 1)}%` : k(drawdown.curDD, currencySymbol)) : "At peak"}
                  </div>
                  <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                    {drawdown.curDD > 0 ? "below your equity high" : "you're at a new high 🎉"}
                  </span>
                </div>
              </div>
              {drawdown.maxDD > 0 && (
                <div>
                  <div className="jx-progress" style={{ height: 8 }}>
                    <div style={{ width: `${drawdown.maxDD > 0 ? Math.min(100, (drawdown.curDD / drawdown.maxDD) * 100) : 0}%`, height: "100%", borderRadius: 999, background: "var(--color-danger)", transition: `width 0.9s ${BAR_EASE}` }} />
                  </div>
                  <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>current vs your worst drawdown</span>
                </div>
              )}
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                Keep risk per trade small (1–2%) so a losing streak never draws your account down too far.
              </span>
            </div>
          )}

      {/* ===== Hold time: disposition effect ===== */}
      {isVisible("holdtime") && holdTime && (() => {
        const maxDur = Math.max(holdTime.winAvg, holdTime.lossAvg, 1);
        return (
          <div className="jx-card jx-sec" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <HideBtn id="holdtime" />
            <span className="jx-card__title" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              Hold time, winners vs losers <InfoTip text="Traders tend to hold losers too long and cut winners too early (the disposition effect). Aim to hold winners at least as long as losers." />
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 72, font: "var(--text-caption)", color: "var(--color-text-muted)" }}>Winners</span>
                <div className="jx-progress" style={{ flex: 1, height: 10 }}>
                  <div style={{ width: `${(holdTime.winAvg / maxDur) * 100}%`, height: "100%", borderRadius: 999, background: "var(--color-success)", transition: `width 0.9s ${BAR_EASE}` }} />
                </div>
                <span style={{ width: 56, textAlign: "right", font: "var(--text-caption)", fontWeight: 700 }}>{fmtDur(holdTime.winAvg)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 72, font: "var(--text-caption)", color: "var(--color-text-muted)" }}>Losers</span>
                <div className="jx-progress" style={{ flex: 1, height: 10 }}>
                  <div style={{ width: `${(holdTime.lossAvg / maxDur) * 100}%`, height: "100%", borderRadius: 999, background: "var(--color-danger)", transition: `width 0.9s ${BAR_EASE}` }} />
                </div>
                <span style={{ width: 56, textAlign: "right", font: "var(--text-caption)", fontWeight: 700 }}>{fmtDur(holdTime.lossAvg)}</span>
              </div>
            </div>
            <span style={{ font: "var(--text-caption)", color: holdTime.holdsLosersLonger ? "var(--color-danger-strong)" : "var(--color-text-muted)" }}>
              {holdTime.holdsLosersLonger
                ? `⚠️ You hold losers ${fmt(holdTime.ratio, 1)}× longer than winners. Cut them at your stop.`
                : "Healthy — you're not clinging to losers. Let winners run."}
            </span>
          </div>
        );
      })()}

      {/* ===== Revenge trading cost ===== */}
      {isVisible("revenge") && revenge && (
        <div className="jx-card jx-sec" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <HideBtn id="revenge" />
          <span className="jx-card__title" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            Revenge-trading cost <InfoTip text="P&L from trades you opened within 30 minutes of a loss, often impulsive 'win it back' trades." />
          </span>
          <div style={{ display: "flex", gap: "var(--space-5)", flexWrap: "wrap" }}>
            <div>
              <span style={LABEL}>From revenge trades</span>
              <div style={{ font: "var(--text-stat)", letterSpacing: "-1px", color: revenge.revPnl >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>
                {k(revenge.revPnl, currencySymbol)}
              </div>
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{revenge.revCount} trades · {fmt(revenge.revWinRate * 100, 0)}% win</span>
            </div>
            <div>
              <span style={LABEL}>Avg / revenge trade</span>
              <div style={{ font: "var(--text-stat)", letterSpacing: "-1px", color: revenge.avgRev >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>
                {k(revenge.avgRev, currencySymbol)}
              </div>
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>vs {k(revenge.avgCalm, currencySymbol)} on calm trades</span>
            </div>
          </div>
          {/* win-rate bar, mirrors the Drawdown card's structure */}
          <div>
            <div className="jx-progress" style={{ height: 8 }}>
              <div style={{ width: `${Math.min(100, Math.max(0, revenge.revWinRate * 100))}%`, height: "100%", borderRadius: 999, background: revenge.revPnl >= 0 ? "var(--color-success)" : "var(--color-danger)", transition: `width 0.9s ${BAR_EASE}` }} />
            </div>
            <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>win rate on revenge trades</span>
          </div>
          <span style={{ font: "var(--text-caption)", color: revenge.revPnl < 0 ? "var(--color-danger-strong)" : "var(--color-text-muted)" }}>
            {revenge.revPnl < 0
              ? `Revenge trades cost you ${k(Math.abs(revenge.revPnl), currencySymbol)}. Pause after a loss.`
              : "Post-loss trades holding up — keep pausing after reds."}
          </span>
        </div>
      )}

      {/* ===== Timeframe analysis (which timeframes they trade most) ===== */}
      {isVisible("timeframe") && (
        <div className="jx-card jx-sec">
          <HideBtn id="timeframe" />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
            <span className="jx-card__title" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              Timeframe analysis <InfoTip text="How your closed trades are spread across timeframes, so you can see where you trade the most." />
            </span>
            {timeframes.most && timeframes.most.count > 0 && (
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                Most traded: <strong style={{ color: "var(--color-text-primary)" }}>{timeframes.most.display}</strong>
              </span>
            )}
          </div>

          {timeframes.total === 0 ? (
            <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>
              Log trades with a timeframe to see your distribution here.
            </span>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {timeframes.arr.map((tf) => {
                const isTop = timeframes.most && tf.display === timeframes.most.display && tf.count > 0;
                return (
                  <div key={tf.display} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <span style={{
                      flexShrink: 0, width: 44, textAlign: "center",
                      padding: "4px 0", borderRadius: "var(--radius-sm)",
                      font: "var(--text-caption)", fontWeight: 700,
                      background: isTop ? "var(--color-primary-subtle)" : "var(--color-bg-muted)",
                      color: isTop ? "var(--yellow-500)" : "var(--color-text-secondary)",
                    }}>
                      {tf.display}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="jx-progress" style={{ height: 10, borderRadius: 999 }}>
                        <div style={{
                          width: `${Math.max(tf.count > 0 ? 3 : 0, tf.pct)}%`,
                          height: "100%", borderRadius: 999,
                          background: isTop ? "var(--color-primary)" : "var(--color-border-strong)",
                          transition: `width 0.9s ${BAR_EASE}`,
                        }} />
                      </div>
                    </div>
                    <span style={{ flexShrink: 0, width: 96, textAlign: "right", font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                      {tf.count} {tf.count === 1 ? "trade" : "trades"} · {fmt(tf.pct, 0)}%
                    </span>
                    <span style={{
                      flexShrink: 0, width: 64, textAlign: "right", font: "var(--text-caption)", fontWeight: 600,
                      color: tf.pnl > 0 ? "var(--color-success-strong)" : tf.pnl < 0 ? "var(--color-danger-strong)" : "var(--color-text-muted)",
                    }}>
                      {tf.count > 0 ? k(tf.pnl, currencySymbol) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== Session performance ===== */}
      {isVisible("sessions") && (
      <div className="jx-card jx-sec">
        <HideBtn id="sessions" />
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "var(--space-2)" }}>
          <span className="jx-card__title">Session performance</span>
          <InfoTip text="P&L grouped by trading session, by open time" />
        </div>
        {/* live 24h session clock + ranked legend */}
        <div className="jx-sessgrid" style={{ display: "grid", gridTemplateColumns: "minmax(210px, 250px) 1fr", gap: "var(--space-6)", alignItems: "center", marginBottom: "var(--space-3)" }}>
          <SessionClock sessions={SESSIONS.list} />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", minWidth: 0 }}>
            {SESSIONS.list.map((s) => {
              const pos = s.pnl >= 0;
              const pct = Math.round((Math.abs(s.pnl) / SESSIONS.maxAbs) * 100);
              const isBest = SESSIONS.best && s.id === SESSIONS.best.id && s.pnl > 0;
              const traded = s.trades > 0;
              const live = s.test(new Date().getUTCHours());
              const col = SESSION_COLORS[s.id] || "var(--color-primary)";
              return (
                <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", borderRadius: "var(--radius-md)", border: `1px solid ${live ? "var(--color-success)" : "var(--color-border)"}`, background: live ? "color-mix(in srgb, var(--color-success) 8%, transparent)" : "transparent" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: col, flexShrink: 0, boxShadow: live ? `0 0 6px ${col}` : "none" }} />
                    <span style={{ font: "var(--text-body-md)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
                    {live && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, font: "var(--text-caption)", fontWeight: 700, color: "var(--color-success-strong)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-success-strong)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--color-success) 30%, transparent)" }} /> Live
                      </span>
                    )}
                    {isBest && <Badge variant="success">Best</Badge>}
                    <span style={{ marginLeft: "auto", font: "var(--text-body-md)", fontWeight: 700, color: !traded ? "var(--color-text-muted)" : pos ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>
                      {traded ? k(s.pnl, currencySymbol) : "—"}
                    </span>
                  </div>
                  <div style={{ height: 5, background: "var(--color-bg-muted)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${traded ? pct : 0}%`, height: "100%", background: col, borderRadius: 999, transition: "width .8s cubic-bezier(0.16,1,0.3,1)" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.window.replace(" UTC", "")} UTC</span>
                    <span style={{ whiteSpace: "nowrap" }}>{traded ? `${s.trades} · ${fmt(s.winRate, 0)}% win` : "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {SESSIONS.totalTraded > 0 && (
          <div className="jx-banner jx-banner--warn" style={{ alignItems: "flex-start", marginTop: "var(--space-3)" }}>
              <Flame size={14} style={{ color: "var(--yellow-500)", flexShrink: 0, marginTop: 2 }} />
              <span style={{ font: "var(--text-caption)" }}>
                {SESSIONS.best && SESSIONS.best.pnl > 0 ? (
                  <>
                    Best: <strong>{SESSIONS.best.label}</strong> ({SESSIONS.best.window.replace(" UTC", "")} UTC) — {k(SESSIONS.best.pnl, currencySymbol)} at {fmt(SESSIONS.best.winRate, 0)}% win. Trade A+ setups then.
                  </>
                ) : (
                  <>No session is clearly profitable yet, keep logging with timestamps to find your best UTC window.</>
                )}
              </span>
            </div>
        )}
      </div>
      )}

      {/* ===== Trader edge ===== */}
      {isVisible("edge") && (
      <div className="jx-card jx-sec">
        <HideBtn id="edge" />
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "var(--space-2)" }}>
          <span className="jx-card__title">Your trading edge</span>
          <InfoTip text="Metrics that predict long-term results" />
        </div>
        <div style={{ font: "var(--text-small)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
          Beyond P&amp;L, is your system actually profitable and survivable?
        </div>

        {EDGE.total === 0 ? (
          <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>Log trades to reveal your edge metrics.</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {/* metric tiles, same style as Key metrics for consistency */}
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
                    ? <><strong>+EV</strong> at {k(EDGE.expectancy, currencySymbol)}/trade. Strongest day: <strong>{EDGE.bestDow.label}</strong>. Keep risk under {k(-EDGE.maxDD, currencySymbol).replace("+", "")} drawdown.</>
                    : <>Your average trade is currently <strong>negative</strong> ({k(EDGE.expectancy, currencySymbol)}). Focus on raising your payoff (cut losers faster, let winners run) before sizing up.</>}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* ===== Calendar & heatmap (moved here from Trades log) ===== */}
      {isVisible("calendar") && (
        <div className="jx-card jx-sec" style={{ gridColumn: "1 / -1" }}>
          <HideBtn id="calendar" />
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "var(--space-4)" }}>
            <span className="jx-card__title">Calendar &amp; heatmap</span>
            <InfoTip text="Daily P&L calendar and activity heatmap" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "var(--space-4)" }}>
            <PnlCalendar trades={closed} sym={currencySymbol} />
            <TradesHeatmap trades={closed} sym={currencySymbol} />
          </div>
        </div>
      )}

      {/* ===== Day-of-week P&L (spans both columns) ===== */}
      {isVisible("dayOfWeek") && EDGE.dowHasData && (
        <div className="jx-card jx-sec" style={{ gridColumn: "1 / -1" }}>
          <HideBtn id="dayOfWeek" />
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
                ? { title: d.label, rows: [["Trades", "0"]] }
                : {
                    title: d.label,
                    rows: [
                      ["P&L", k(d.pnl, currencySymbol)],
                      ["Trades", String(d.n)],
                    ],
                  };
              return (
                <Tip key={d.label} content={content} follow style={{ flex: 1, minWidth: 0, height: "100%", display: "flex" }}>
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
      </div>
      {/* ===== end analytics grid ===== */}

      {/* ===== Streaks & achievements (moved up: right after the KPI cards) ===== */}
      {isVisible("streaks") && (() => {
        const segs = (cur, best) => {
          const n = Math.min(Math.max(best, 1), 12);
          return Array.from({ length: n }, (_, i) => i < cur);
        };
        const winSegs = segs(ACH.curWin, ACH.bestWin);
        const greenSegs = segs(ACH.curGreenDays, ACH.bestGreenDays);
        const achTotal = ACH.badges.length;
        const achPct = achTotal ? (ACH.unlocked / achTotal) * 100 : 0;
        const nextBadge = ACH.nextBadge;
        const RR = 40, RC = 2 * Math.PI * RR;
        // rank ladder from how many milestones are unlocked
        const RANKS = ["Rookie", "Novice", "Consistent", "Sharp", "Elite"];
        const rank = RANKS[Math.min(RANKS.length - 1, Math.floor((ACH.unlocked / achTotal) * RANKS.length))];
        // format "current / target" text for a badge
        const badgeVal = (b) => {
          if (b.type === "money") return `${k(b.cur, currencySymbol)} / ${k(b.target, currencySymbol)}`;
          if (b.type === "pct") return b.gate ? `${fmt(b.cur, 0)}% / ${b.target}%` : `${b.gateCur}/${b.gateTarget} trades`;
          return `${Math.max(0, Math.min(b.cur, b.target))} / ${b.target}`;
        };
        const badgeRemain = (b) => {
          if (b.type === "money") return `${k(Math.max(0, b.target - b.cur), currencySymbol)} to go`;
          if (b.type === "pct") return b.gate ? `${fmt(Math.max(0, b.target - b.cur), 0)}% to go` : `${Math.max(0, b.gateTarget - b.gateCur)} more trades`;
          return `${Math.max(0, b.target - b.cur)} to go`;
        };
        return (
        <div className="jx-card jx-sec" style={{ order: -1 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
            <div>
              <span className="jx-card__title">Streaks &amp; achievements</span>
              <div style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                Momentum and milestones from your full history
              </div>
            </div>
            {ACH.curWin > 0 && (
              <Badge variant="success">{ACH.curWin}-trade win streak 🔥</Badge>
            )}
          </div>

          <div className="jx-streaks">
            {/* ---- momentum ---- */}
            <div className="jx-mom">
              <div className="jx-mom__hero">
                <div className="jx-mom__flame">🔥</div>
                <div>
                  <div className="jx-mom__num">
                    <CountUp value={ACH.curWin} /><small>/ best {ACH.bestWin}</small>
                  </div>
                  <div style={{ font: "var(--text-caption)", color: "var(--color-text-secondary)" }}>
                    consecutive winning trades
                  </div>
                </div>
                <div className="jx-mom__herostats">
                  <div>
                    <span>Streak P&amp;L</span>
                    <b style={{ color: ACH.streakPnl >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>
                      {k(ACH.streakPnl, currencySymbol)}
                    </b>
                  </div>
                  <div className="jx-mom__herodiv" />
                  <div>
                    <span>Biggest win</span>
                    <b style={{ color: "var(--color-success-strong)" }}>{k(ACH.biggestWin, currencySymbol)}</b>
                  </div>
                </div>
              </div>

              <div className="jx-mom__bars">
                <div className="jx-mom__bar-row">
                  <div className="jx-mom__bar-head">
                    <span className="jx-mom__bar-label">Win streak</span>
                    <span className="jx-mom__bar-val"><b>{ACH.curWin}</b> / {ACH.bestWin || 0} best</span>
                  </div>
                  <div className="jx-mom__pips">
                    {winSegs.map((on, i) => (
                      <div key={i} className={`jx-mom__pip${on ? " jx-mom__pip--on" : ""}`} />
                    ))}
                  </div>
                </div>

                <div className="jx-mom__bar-row">
                  <div className="jx-mom__bar-head">
                    <span className="jx-mom__bar-label">Green-day streak</span>
                    <span className="jx-mom__bar-val"><b>{ACH.curGreenDays}</b> / {ACH.bestGreenDays || 0} best</span>
                  </div>
                  <div className="jx-mom__pips">
                    {greenSegs.map((on, i) => (
                      <div key={i} className={`jx-mom__pip jx-mom__pip--gold${on ? " jx-mom__pip--on" : ""}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ---- achievements ---- */}
            <div className="jx-achv">
              <div className="jx-achv__top">
                <div className="jx-achv__ring">
                  <svg viewBox="0 0 92 92" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                    <circle cx="46" cy="46" r={RR} fill="none" stroke="var(--color-bg-muted)" strokeWidth="7" />
                    <circle
                      cx="46" cy="46" r={RR} fill="none"
                      stroke="var(--color-primary)" strokeWidth="7" strokeLinecap="round"
                      strokeDasharray={RC}
                      strokeDashoffset={RC - (RC * achPct) / 100}
                      style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)", filter: "drop-shadow(0 0 5px rgba(252,213,53,0.5))" }}
                    />
                  </svg>
                  <div className="jx-achv__ring-center">
                    <b>{ACH.unlocked}<span style={{ color: "var(--color-text-muted)", textTransform: "none", letterSpacing: 0, font: "600 13px var(--jx-font)" }}>/{achTotal}</span></b>
                    <span>unlocked</span>
                  </div>
                </div>
                <div className="jx-achv__top-txt">
                  <h4>
                    <Trophy size={14} style={{ verticalAlign: "-2px", marginRight: 5, color: "var(--color-primary)" }} />
                    Achievements
                    <span className="jx-achv__rank">{rank}</span>
                  </h4>
                  <p>Unlock any milestone to level up — {achTotal - ACH.unlocked} still open</p>
                </div>
              </div>

              {nextBadge && (
                <div className="jx-achv__spot">
                  <span className="jx-achv__spot-ico">{nextBadge.icon}</span>
                  <div className="jx-achv__spot-body">
                    <div className="jx-achv__spot-head">
                      <span className="jx-achv__spot-kicker">Closest to unlock</span>
                      <span className="jx-achv__spot-remain">{badgeRemain(nextBadge)}</span>
                    </div>
                    <div className="jx-achv__spot-name">{nextBadge.label}</div>
                    <div className="jx-achv__spot-track">
                      <div className="jx-achv__spot-fill" style={{ width: `${Math.max(4, nextBadge.prog * 100)}%` }} />
                    </div>
                  </div>
                </div>
              )}

              <div className="jx-achv__grid">
                {ACH.badges.map((b) => {
                  const isNext = nextBadge && b.id === nextBadge.id;
                  return (
                  <Tip key={b.id} content={b.got ? `${b.label} — unlocked ✓` : `${b.hint} · ${badgeVal(b)}`} block>
                    <div className={`jx-achv__badge${b.got ? " jx-achv__badge--got" : isNext ? " jx-achv__badge--next" : ""}`}>
                      {b.got && (
                        <span className="jx-achv__badge-check"><Check size={9} strokeWidth={3.5} /></span>
                      )}
                      <span className="jx-achv__badge-ico">{b.icon}</span>
                      <span className="jx-achv__badge-lbl">{b.label}</span>
                      <span className="jx-achv__badge-foot">
                        <span className="jx-achv__badge-track">
                          <span className="jx-achv__badge-fill" style={{ width: `${b.got ? 100 : Math.max(4, b.prog * 100)}%` }} />
                        </span>
                        <span className="jx-achv__badge-pct">{b.got ? "Done" : `${Math.round(b.prog * 100)}%`}</span>
                      </span>
                    </div>
                  </Tip>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ===== Performance (combined viz: donut + meters + bars) ===== */}
      {isVisible("keyMetrics") && (() => {
        const payoff = S.avgLoss > 0 ? S.avgWin / S.avgLoss : null;
        const wl = S.avgWin + S.avgLoss;
        const winShare = wl > 0 ? (S.avgWin / wl) * 100 : 50;
        const meters = [
          { label: "Win rate", pct: S.winRate, text: `${fmt(S.winRate, 0)}%`, color: "var(--color-success)" },
          { label: "Profit factor", pct: S.profitFactor ? Math.min(100, (S.profitFactor / 3) * 100) : 0, text: S.profitFactor ? fmt(S.profitFactor, 2) : "—", sub: "target 3.0", color: "var(--color-primary)" },
          { label: "Payoff (R:R)", pct: payoff ? Math.min(100, (payoff / 2) * 100) : 0, text: payoff ? `1 : ${fmt(payoff, 1)}` : "—", sub: "target 1 : 2", color: "#7c9cff" },
        ];
        const chips = [
          { label: "Net P&L", value: k(S.net, currencySymbol), up: S.net >= 0 },
          { label: "Total trades", value: S.total },
          { label: "Largest win", value: k(S.largestWin, currencySymbol), up: true },
          { label: "Win streak", value: S.streak, sub: `best ${S.bestStreak}` },
          { label: "Sharpe", value: S.sharpe != null ? fmt(S.sharpe, 2) : "—" },
          { label: "Avg hold", value: S.holdStr },
        ];
        return (
          <div className="jx-card jx-sec jx-perf" style={{ order: -2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "var(--space-4)" }}>
              <span className="jx-card__title">Performance</span>
              <InfoTip text="Your headline numbers at a glance" />
            </div>

            <div className="jx-perf__top">
              {/* win / loss donut */}
              <div className="jx-perf__donutwrap">
                <div style={{ position: "relative", width: 148, height: 148 }}>
                  <Donut
                    size={148}
                    segments={[
                      { value: S.winCount, color: "var(--color-success)", label: "Wins" },
                      { value: S.lossCount, color: "var(--color-danger)", label: "Losses" },
                    ]}
                  />
                  <div className="jx-perf__donutctr">
                    <span className="jx-perf__donutnum">{fmt(S.winRate, 0)}%</span>
                    <span className="jx-perf__donutlbl">win rate</span>
                  </div>
                </div>
                <div className="jx-perf__legend">
                  <span><i style={{ background: "var(--color-success)" }} />Wins <b>{S.winCount}</b></span>
                  <span><i style={{ background: "var(--color-danger)" }} />Losses <b>{S.lossCount}</b></span>
                </div>
              </div>

              {/* meters */}
              <div className="jx-perf__meters">
                {meters.map((m) => (
                  <div key={m.label} className="jx-perf__meter">
                    <div className="jx-perf__meterhead">
                      <span>{m.label}</span>
                      <b>{m.text}{m.sub && <em> · {m.sub}</em>}</b>
                    </div>
                    <Progress pct={m.pct} color={m.color} />
                  </div>
                ))}

                {/* avg win vs avg loss diverging bar */}
                <div className="jx-perf__meter">
                  <div className="jx-perf__meterhead">
                    <span>Avg win vs loss</span>
                    <b><span style={{ color: "var(--color-success-strong)" }}>{k(S.avgWin, currencySymbol)}</span> · <span style={{ color: "var(--color-danger-strong)" }}>−{currencySymbol}{fmt(S.avgLoss, 0)}</span></b>
                  </div>
                  <div className="jx-perf__wlbar">
                    <div style={{ width: `${winShare}%`, background: "var(--color-success)" }} />
                    <div style={{ width: `${100 - winShare}%`, background: "var(--color-danger)" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* compact stat chips */}
            <div className="jx-perf__chips">
              {chips.map((c) => (
                <div key={c.label} className="jx-perf__chip">
                  <span className="jx-perf__chiplbl">{c.label}</span>
                  <span className="jx-perf__chipval" style={{ color: c.up === undefined ? "var(--color-text-primary)" : c.up ? "var(--color-success-strong)" : "var(--color-text-primary)" }}>{c.value}</span>
                  {c.sub && <span className="jx-perf__chipsub">{c.sub}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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
            const allCandles = buildEquityCandles(
              closed,
              startingBalance,
              candleTF,
            );
            // day-range filter (maps to a count of most-recent candles)
            const RANGE_N = { "7D": 7, "14D": 14, "30D": 30, All: Infinity };
            const n = RANGE_N[equityRange] ?? 7;
            const candles = n === Infinity ? allCandles : allCandles.slice(-n);
            // TradingView-style scroll/zoom only kicks in past ~50 candles
            const candleWidth = candles.length > 50 ? equityZoom : 0;
            const equityNow = candles.length
              ? candles[candles.length - 1].c
              : startingBalance;
            const growth =
              startingBalance > 0
                ? ((equityNow - startingBalance) / startingBalance) * 100
                : null;
            return (
              <div className="jx-card jx-eq-card" style={{ display: "flex", flexDirection: "column", height: "100%", containerType: "inline-size" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    flexWrap: "nowrap",
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
                    <span
                      style={{
                        font: "var(--text-caption)",
                        fontWeight: 700,
                        color: equityNow >= startingBalance ? "var(--color-success-strong)" : "var(--color-danger-strong)",
                      }}
                    >
                      {growth != null
                        ? `${growth >= 0 ? "+" : ""}${fmt(growth, 1)}% since ${currencySymbol}${fmt(startingBalance, 0)} start`
                        : `from ${currencySymbol}${fmt(startingBalance, 0)} starting balance`}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "nowrap", justifyContent: "flex-end", flexShrink: 0 }}>
                    {/* timeframe: tabs by default, compact dropdown when tight */}
                    <span className="jx-eq-tftabs">
                      <MiniSeg
                        items={["1D", "1W", "1M", "1Y"]}
                        value={candleTF}
                        onChange={setCandleTF}
                      />
                    </span>
                    <span className="jx-eq-tfdd" style={{ width: 92 }}>
                      <Dropdown
                        value={candleTF}
                        onChange={setCandleTF}
                        options={[
                          { value: "1D", label: "1D" },
                          { value: "1W", label: "1W" },
                          { value: "1M", label: "1M" },
                          { value: "1Y", label: "1Y" },
                        ]}
                        triggerStyle={{ height: 34 }}
                      />
                    </span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <div style={{ width: 148 }}>
                        <Dropdown
                          value={equityRange}
                          onChange={setEquityRange}
                          options={[
                            { value: "7D", label: "Last 7 days" },
                            { value: "14D", label: "Last 14 days" },
                            { value: "30D", label: "Last 30 days" },
                            { value: "All", label: "All time" },
                          ]}
                          triggerStyle={{ height: 34 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: "var(--space-3)", flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <CandleChart
                    key={`${candleTF}-${equityRange}`}
                    candles={candles}
                    sym={currencySymbol}
                    height={320}
                    candleWidth={candleWidth}
                  />
                  {candleWidth > 0 && (
                    <div style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: 4, textAlign: "center" }}>
                      Drag to pan · scroll horizontally
                    </div>
                  )}
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
                    return { title: labels[i] || "", rows: [["P&L", k(v, currencySymbol)]] };
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
                    ? wrSeries.map((v, i) => ({
                        title: `Period ${i + 1}`,
                        rows: [["Win rate", `${fmt(v, 1)}%`]],
                      }))
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
                  content={{
                    title: name,
                    rows: [
                      ["Trades", String(v.n)],
                      ["Wins", `${v.w} (${fmt((v.w / v.n) * 100, 0)}%)`],
                      ["Total P&L", k(v.pnl, currencySymbol)],
                    ],
                  }}
                  block
                  follow
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
                    content={{
                      title: sym,
                      rows: [
                        ["Traded value", `${currencySymbol}${fmt(v, 0)}`],
                        ["Allocation", `${fmt((v / allocTotal) * 100, 1)}%`],
                      ],
                    }}
                    block
                    follow
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
                  content={{ title: sym, rows: [["Net P&L", k(v, currencySymbol)]] }}
                  block
                  follow
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
              {S.vols.length > 0 && S.vols.some((v) => Number(v) !== 0) ? (
                <BarChart
                  mode="value"
                  color="#3b82f6"
                  values={S.vols}
                  tips={S.vols.map((v, i) => ({
                    title: S.volLabels[i] || "",
                    rows: [["Traded", `${currencySymbol}${fmt(Math.abs(v), 0)}`]],
                  }))}
                  height={110}
                />
              ) : (
                /* no per-day volume yet → show an unfilled progress bar */
                <div>
                  <div style={{ height: 10, borderRadius: 999, background: "var(--color-bg-muted)", border: "1px solid var(--color-border)" }} />
                  <span style={{ display: "block", marginTop: 8, font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                    No volume in this window yet — log trades with size &amp; price to see it here.
                  </span>
                </div>
              )}
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
