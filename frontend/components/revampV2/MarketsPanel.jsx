"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Globe, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import Badge from "./Badge";
import Accordion from "./Accordion";

/**
 * MarketsPanel — replaces the old Heatmap tab.
 * TradingView embeds picked for what a journaling trader actually
 * checks between sessions: a ticker tape, market heatmaps
 * (crypto/stocks/forex), the economic calendar, and top stories —
 * plus local analytics: live session clock and your most-traded
 * symbols as quote widgets.
 */

const tvTheme = () =>
  typeof document !== "undefined" &&
  document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";

/* Generic TradingView embed: injects the widget script into a container.
   TradingView embeds expect an inner `__widget` div — without it some
   widgets (stock/forex heatmaps) fail to render. */
function TVWidget({ script, config, height = 1000 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.height = "100%";
    inner.style.width = "100%";
    el.appendChild(inner);
    const s = document.createElement("script");
    s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${script}.js`;
    s.async = true;
    s.type = "text/javascript";
    s.innerHTML = JSON.stringify(config);
    el.appendChild(s);
    return () => {
      el.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, JSON.stringify(config)]);
  return (
    <div
      className="tradingview-widget-container"
      ref={ref}
      style={{ height, width: "100%" }}
    />
  );
}

/* ---- live market sessions (local analytics) ---- */
const SESSIONS = [
  { name: "Sydney", open: 21, close: 6 },
  { name: "Asia (Tokyo)", open: 0, close: 9 },
  { name: "London", open: 7, close: 16 },
  { name: "New York", open: 13, close: 22 },
];
const isOpen = (s, h) =>
  s.open < s.close ? h >= s.open && h < s.close : h >= s.open || h < s.close;

function SessionClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
  return (
    <div
      className="jx-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
      >
        <span className="jx-sect__icon">
          <Clock size={15} />
        </span>
        <span className="jx-card__title">Market sessions</span>
        <span
          style={{
            marginLeft: "auto",
            font: "var(--text-caption)",
            color: "var(--color-text-muted)",
          }}
        >
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
          local
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "var(--space-3)",
        }}
      >
        {SESSIONS.map((s) => {
          const open = isOpen(s, utcH);
          return (
            <div
              key={s.name}
              className="jx-card jx-card--flat"
              style={{
                padding: "var(--space-3) var(--space-4)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>
                {s.name}
              </span>
              <Badge variant={open ? "success" : "neutral"}>
                {open ? "● Open" : "Closed"}
              </Badge>
              <span
                style={{
                  font: "var(--text-caption)",
                  color: "var(--color-text-muted)",
                }}
              >
                {String(s.open).padStart(2, "0")}:00–
                {String(s.close).padStart(2, "0")}:00 UTC
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- "If you traded today" forecast from the user's own history ---- */
const fmt = (v, d = 2) =>
  Number(v).toLocaleString(undefined, { maximumFractionDigits: d });

function EdgeForecast({ trades }) {
  const forecasts = useMemo(() => {
    const bySym = new Map();
    trades.forEach((t) => {
      const entry = Number(
        t.avgEntryPrice || t.entryPrice || t.entries?.[0]?.price,
      );
      const exit = Number(t.avgExitPrice || t.exitPrice || t.exits?.[0]?.price);
      if (!t.closeTime || !entry || !exit) return;
      const s = t.symbol || t.ticker;
      if (!s) return;
      if (!bySym.has(s)) bySym.set(s, []);
      bySym.get(s).push({ ...t, entry, exit });
    });

    return [...bySym.entries()]
      .filter(([, list]) => list.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([symbol, list]) => {
        const sorted = [...list].sort(
          (a, b) => new Date(a.closeTime) - new Date(b.closeTime),
        );
        const last = sorted[sorted.length - 1];
        const lastPrice = last.exit;
        /* signed move the user typically captures */
        const moves = sorted.map((t) => {
          const dir = t.direction?.toLowerCase() === "long" ? 1 : -1;
          return (dir * (t.exit - t.entry)) / t.entry;
        });
        const avgMove = moves.reduce((s, v) => s + v, 0) / moves.length;
        const sd =
          moves.length > 1
            ? Math.sqrt(
                moves.reduce((s, v) => s + (v - avgMove) ** 2, 0) /
                  (moves.length - 1),
              )
            : Math.abs(avgMove);
        const longs = sorted.filter(
          (t) => t.direction?.toLowerCase() === "long",
        ).length;
        const bias = longs >= sorted.length / 2 ? "long" : "short";
        const dir = bias === "long" ? 1 : -1;
        const wins = sorted.filter((t) => t.pnl > 0).length;
        const evPnl =
          sorted.reduce((s, t) => s + (Number(t.pnl) || 0), 0) / sorted.length;

        return {
          symbol,
          n: sorted.length,
          bias,
          winRate: (wins / sorted.length) * 100,
          evPnl,
          lastPrice,
          predicted: lastPrice * (1 + dir * avgMove),
          lo: lastPrice * (1 + dir * avgMove - sd),
          hi: lastPrice * (1 + dir * avgMove + sd),
          avgMovePct: avgMove * 100,
        };
      });
  }, [trades]);

  if (!forecasts.length) return null;

  return (
    <div
      className="jx-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
      >
        <span className="jx-sect__icon">
          <Sparkles size={15} />
        </span>
        <span className="jx-card__title">If you traded today</span>
        <span
          style={{
            marginLeft: "auto",
            font: "var(--text-caption)",
            color: "var(--color-text-muted)",
          }}
        >
          Projected from your own history — not financial advice
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "var(--space-3)",
        }}
      >
        {forecasts.map((f) => (
          <div
            key={f.symbol}
            className="jx-card jx-card--flat"
            style={{
              padding: "var(--space-4)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <span style={{ font: "var(--text-title)" }}>{f.symbol}</span>
              <Badge variant={f.bias === "long" ? "success" : "danger"}>
                {f.bias === "long" ? (
                  <TrendingUp size={11} />
                ) : (
                  <TrendingDown size={11} />
                )}
                Your bias: {f.bias}
              </Badge>
            </div>
            <span
              style={{
                font: "var(--text-caption)",
                color: "var(--color-text-muted)",
              }}
            >
              Projected exit if entered near ${fmt(f.lastPrice)}
            </span>
            <span
              style={{
                font: "var(--text-h3)",
                color:
                  f.predicted >= f.lastPrice === (f.bias === "long")
                    ? "var(--color-success-strong)"
                    : "var(--color-danger-strong)",
              }}
            >
              ${fmt(f.predicted)}
            </span>
            <span
              style={{
                font: "var(--text-caption)",
                color: "var(--color-text-muted)",
              }}
            >
              Range ${fmt(f.lo)} – ${fmt(f.hi)} · you typically capture{" "}
              {f.avgMovePct >= 0 ? "+" : ""}
              {fmt(f.avgMovePct, 2)}%
            </span>
            <div
              style={{
                display: "flex",
                gap: "var(--space-2)",
                marginTop: 2,
                flexWrap: "wrap",
              }}
            >
              <Badge variant={f.evPnl >= 0 ? "success" : "danger"}>
                EV {f.evPnl >= 0 ? "+" : "−"}${fmt(Math.abs(f.evPnl), 0)}/trade
              </Badge>
              <Badge variant="neutral">
                {fmt(f.winRate, 0)}% win · {f.n} trades
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* map a journal symbol to a TradingView symbol (best effort) */
const toTvSymbol = (sym) => {
  const s = (sym || "").toUpperCase().replace("/", "");
  if (s.endsWith("USDT") || s.endsWith("USDC")) return `BINANCE:${s}`;
  if (s.endsWith("USD") && s.length <= 7)
    return `OANDA:${s.slice(0, 3)}_${s.slice(3)}`.replace("_", "");
  return null;
};

export default function MarketsPanel({ trades = [] }) {
  const theme = tvTheme();
  const [heatmapKind, setHeatmapKind] = useState("crypto");

  const topSymbols = useMemo(() => {
    const count = new Map();
    trades.forEach((t) => {
      const s = t.symbol || t.ticker;
      if (s) count.set(s, (count.get(s) || 0) + 1);
    });
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([s]) => toTvSymbol(s))
      .filter(Boolean)
      .slice(0, 4);
  }, [trades]);

  const heatmaps = {
    crypto: {
      script: "crypto-coins-heatmap",
      config: {
        dataSource: "Crypto",
        blockSize: "market_cap_calc",
        blockColor: "change",
        locale: "en",
        symbolUrl: "",
        colorTheme: theme,
        hasTopBar: true,
        isDataSetEnabled: false,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        isMonoSize: false,
        width: "100%",
        height: "100%",
      },
    },
    stocks: {
      script: "stock-heatmap",
      config: {
        exchanges: [],
        dataSource: "SPX500",
        grouping: "sector",
        blockSize: "market_cap_basic",
        blockColor: "change",
        locale: "en",
        symbolUrl: "",
        colorTheme: theme,
        hasTopBar: true,
        isDataSetEnabled: false,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        isMonoSize: false,
        width: "100%",
        height: "100%",
      },
    },
    forex: {
      script: "forex-heat-map",
      config: {
        width: "100%",
        height: "100%",
        currencies: ["EUR", "USD", "JPY", "GBP", "CHF", "AUD", "CAD", "INR"],
        isTransparent: true,
        colorTheme: theme,
        locale: "en",
      },
    },
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      <div>
        <div style={{ font: "var(--text-h2)" }}>Markets</div>
        <div
          style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}
        >
          Live market context for your next session — heatmaps, calendar, and
          news.
        </div>
      </div>

      {/* ticker tape */}
      <div className="jx-card" style={{ padding: 0, overflow: "hidden" }}>
        <TVWidget
          script="ticker-tape"
          height={46}
          config={{
            symbols: [
              { proName: "BINANCE:BTCUSDT", title: "Bitcoin" },
              { proName: "BINANCE:ETHUSDT", title: "Ethereum" },
              { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
              { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
              { proName: "OANDA:XAUUSD", title: "Gold" },
              { proName: "TVC:DXY", title: "DXY" },
            ],
            showSymbolLogo: true,
            isTransparent: true,
            displayMode: "adaptive",
            colorTheme: theme,
            locale: "en",
          }}
        />
      </div>

      {/* sessions (local analytics) */}
      <SessionClock />

      {/* your-history forecast */}
      <EdgeForecast trades={trades} />

      {/* your symbols */}
      {topSymbols.length > 0 && (
        <Accordion id="markets-symbols" title="Your most-traded symbols">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "var(--space-3)",
            }}
          >
            {topSymbols.map((s) => (
              <div
                key={s}
                className="jx-card"
                style={{ padding: 0, overflow: "hidden" }}
              >
                <TVWidget
                  script="single-quote"
                  height={110}
                  config={{
                    symbol: s,
                    width: "100%",
                    isTransparent: true,
                    colorTheme: theme,
                    locale: "en",
                  }}
                />
              </div>
            ))}
          </div>
        </Accordion>
      )}

      {/* heatmap */}
      <Accordion id="markets-heatmap" title="Heatmap">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <div className="jx-seg jx-seg--inline">
            {[
              ["crypto", "Crypto"],
              ["stocks", "Stocks"],
              ["forex", "Forex"],
            ].map(([v, l]) => (
              <button
                key={v}
                className={`jx-seg__btn ${heatmapKind === v ? "jx-seg__btn--active" : ""}`}
                onClick={() => setHeatmapKind(v)}
              >
                {l}
              </button>
            ))}
          </div>
          {/* all three stay mounted; tabs just toggle visibility — avoids
              TradingView re-injection issues and switches instantly */}
          {Object.entries(heatmaps).map(([kind, w]) => (
            <div
              key={kind}
              className="jx-card"
              style={{
                padding: 0,
                overflow: "hidden",
                display: heatmapKind === kind ? "block" : "none",
              }}
            >
              <TVWidget script={w.script} config={w.config} height={500} />
            </div>
          ))}
        </div>
      </Accordion>

      {/* calendar + news — plain side-by-side, no accordion */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>
            Economic calendar
          </span>
          <div className="jx-card" style={{ padding: 0, overflow: "hidden" }}>
            <TVWidget
              script="events"
              height={1000}
              config={{
                width: "100%",

                colorTheme: theme,
                isTransparent: true,
                locale: "en",
                importanceFilter: "0,1",
                countryFilter: "us,eu,gb,jp,in,cn",
              }}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>
            Top stories
          </span>
          <div className="jx-card" style={{ padding: 0, overflow: "hidden" }}>
            <TVWidget
              script="timeline"
              height={1000}
              config={{
                feedMode: "all_symbols",
                displayMode: "regular",
                width: "100%",

                colorTheme: theme,
                isTransparent: true,
                locale: "en",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
