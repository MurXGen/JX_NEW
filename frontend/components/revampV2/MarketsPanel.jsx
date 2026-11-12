"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Clock, Flame, Newspaper, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import Badge from "./Badge";
import ov from "@/components/app/Overview.module.css";
import mk from "@/components/app/Markets.module.css";

/**
 * MarketsPanel, replaces the old Heatmap tab.
 * TradingView embeds picked for what a journaling trader actually
 * checks between sessions: a ticker tape, market heatmaps
 * (crypto/stocks/forex), the economic calendar, and top stories, 
 * plus local analytics: live session clock and your most-traded
 * symbols as quote widgets.
 */

const tvTheme = () =>
  typeof document !== "undefined" &&
  document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";

/* Generic TradingView embed: injects the widget script into a container.
   TradingView embeds expect an inner `__widget` div, without it some
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
  { name: "Tokyo", open: 0, close: 9 },
  { name: "London", open: 7, close: 16 },
  { name: "New York", open: 13, close: 22 },
];
const isOpen = (s, h) =>
  s.open < s.close ? h >= s.open && h < s.close : h >= s.open || h < s.close;
/* hours until a session opens or closes, from the current UTC hour */
const hoursUntil = (target, h) => ((target - h) + 24) % 24;
const fmtHrs = (x) => {
  const hh = Math.floor(x);
  const mm = Math.round((x - hh) * 60);
  return hh ? `${hh}h${mm ? ` ${mm}m` : ""}` : `${mm}m`;
};
const pnlOf = (t) => Number(t.pnl) || 0;
const tradeHour = (t) => {
  const d = new Date(t.openTime || t.closeTime);
  return Number.isNaN(d.getTime()) ? null : d.getUTCHours() + d.getUTCMinutes() / 60;
};

function useNow(ms = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function SessionsCard({ trades, sym }) {
  const now = useNow();
  const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
  // everything on the timeline is shown in the trader's own clock
  const off = -now.getTimezoneOffset() / 60;
  const toLocal = (h) => (((h + off) % 24) + 24) % 24;
  const localNow = now.getHours() + now.getMinutes() / 60;
  const hhmm = (h) => {
    const x = ((h % 24) + 24) % 24;
    return `${String(Math.floor(x)).padStart(2, "0")}:${String(Math.round((x % 1) * 60)).padStart(2, "0")}`;
  };
  const money = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${sym}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  // your results per session (a trade in an overlap counts for both)
  const stats = useMemo(() => SESSIONS.map((s) => {
    const list = trades.filter((t) => { const h = tradeHour(t); return h != null && isOpen(s, h); });
    const net = list.reduce((a, t) => a + pnlOf(t), 0);
    const wins = list.filter((t) => pnlOf(t) > 0).length;
    return { n: list.length, net, wr: list.length ? Math.round((wins / list.length) * 100) : 0 };
  }), [trades]);
  const best = stats.reduce((b, x, i) => (x.n && (b < 0 || x.net > stats[b].net) ? i : b), -1);
  const openNow = SESSIONS.filter((s) => isOpen(s, utcH)).map((s) => s.name);
  // split a [from, to) window in local hours into bar segments that don't wrap
  const segs = (from, to) => {
    const a = toLocal(from), b = toLocal(to);
    return a < b ? [[a, b]] : [[a, 24], [0, b]];
  };
  const overlap = segs(13, 16); // London + New York, the busiest window of the day
  const pct = (h) => `${(h / 24) * 100}%`;
  const overlapTip = `London + New York overlap · ${hhmm(13 + off)}–${hhmm(16 + off)} your time · both sessions open, usually the busiest and most liquid hours`;
  const nowTip = `Current time · ${hhmm(localNow)} your time (${hhmm(utcH)} UTC)`;
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop().replace(/_/g, " "); } catch { return "local"; } })();

  return (
    <section className={mk.card} aria-labelledby="mk-sess">
      <div className={mk.cardHead}>
        <div>
          <h2 id="mk-sess" className={mk.cardTitle}>Market sessions</h2>
          <p className={mk.cardSub}>
            Global markets trade around the clock in four regional sessions. Prices move most when big sessions are open.
          </p>
        </div>
        {best >= 0 && stats[best].net > 0 && (
          <span className={mk.pill}><Flame size={13} aria-hidden="true" /> You do best in {SESSIONS[best].name}</span>
        )}
      </div>

      <div className={mk.nowLine}>
        <span className={mk.nowDot} aria-hidden="true" />
        <span>
          It&apos;s <b>{hhmm(localNow)}</b> your time ({tz}).{" "}
          {openNow.length ? <>Open now: <b>{openNow.join(" and ")}</b>.</> : <>All major sessions are closed.</>}
        </span>
      </div>

      <div className={mk.timeline}>
        <div className={mk.colHeads} aria-hidden="true">
          <span>Session</span>
          <span>24 hours, your time</span>
          <span>Your trades here</span>
        </div>
        <div className={mk.hours} aria-hidden="true">
          {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => <span key={h} style={{ left: pct(h) }}>{String(h % 24).padStart(2, "0")}:00</span>)}
        </div>
        {SESSIONS.map((s, i) => {
          const open = isOpen(s, utcH);
          const st = stats[i];
          const status = open ? `Open · closes in ${fmtHrs(hoursUntil(s.close, utcH))}` : `Closed · opens in ${fmtHrs(hoursUntil(s.open, utcH))}`;
          return (
            <div key={s.name} className={mk.sessRow} data-open={open || undefined}>
              <div className={mk.sessName}>
                <b>{s.name}</b>
                <span className={mk.sessStatus}><i aria-hidden="true" />{status}</span>
                <span className={mk.sessHours}>{hhmm(s.open + off)}–{hhmm(s.close + off)} your time</span>
              </div>
              <div className={mk.track} aria-label={`${s.name} trades ${hhmm(s.open + off)} to ${hhmm(s.close + off)} your time, ${open ? "open now" : "closed now"}`}>
                {overlap.map(([a2, b2]) => (
                  <span
                    key={`o${a2}`}
                    className={mk.overlap}
                    style={{ left: pct(a2), width: pct(b2 - a2) }}
                    tabIndex={0}
                    role="img"
                    aria-label={overlapTip}
                    data-tip={overlapTip}
                  />
                ))}
                {segs(s.open, s.close).map(([a2, b2]) => {
                  const tip = `${s.name} session · ${hhmm(s.open + off)}–${hhmm(s.close + off)} your time · ${open ? `Open now, closes in ${fmtHrs(hoursUntil(s.close, utcH))}` : `Closed now, opens in ${fmtHrs(hoursUntil(s.open, utcH))}`}`;
                  return <span key={a2} className={mk.band} style={{ left: pct(a2), width: pct(b2 - a2) }} tabIndex={0} role="img" aria-label={tip} data-tip={tip} />;
                })}
                <span className={mk.now} style={{ left: pct(localNow) }} tabIndex={0} role="img" aria-label={nowTip} data-tip={nowTip} />
              </div>
              <div className={mk.sessYou}>
                {st.n ? (
                  <><b className={st.net > 0 ? mk.pos : st.net < 0 ? mk.neg : undefined}>{money(st.net)}</b><small>{st.n} trades · {st.wr}% won</small></>
                ) : <small>No trades yet</small>}
              </div>
            </div>
          );
        })}
      </div>

      <div className={mk.legend}>
        <span tabIndex={0} data-tip="Gold bar: the session is trading right now. Its length shows its hours in your time."><i className={mk.lgOpen} /> Open now</span>
        <span tabIndex={0} data-tip="Grey bar: the session's hours, but it isn't trading at the moment."><i className={mk.lgClosed} /> Closed now</span>
        <span tabIndex={0} data-tip="White line: where we are in the day right now, in your time."><i className={mk.lgNow} /> Current time</span>
        <span tabIndex={0} data-tip="Striped band: London and New York are both open. Volume and volatility are usually highest here."><i className={mk.lgOverlap} /> London + New York overlap, usually the busiest hours</span>
      </div>
      <p className={mk.foot}>Your results count each trade in the session(s) open when you entered it.</p>
    </section>
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
          Projected from your own history, not financial advice
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
/* TradingView widgets can't show CME futures, so index/commodity futures map
   to the matching CFD or spot feed (close enough for context). */
const FUTURES = { NQ: "FOREXCOM:NSXUSD", MNQ: "FOREXCOM:NSXUSD", ES: "FOREXCOM:SPXUSD", MES: "FOREXCOM:SPXUSD", YM: "FOREXCOM:DJI", RTY: "FOREXCOM:US2000", CL: "TVC:USOIL", GC: "OANDA:XAUUSD", NIFTY: "NSE:NIFTY", BANKNIFTY: "NSE:BANKNIFTY" };
const toTvSymbol = (sym) => {
  const s = (sym || "").toUpperCase().replace("/", "");
  if (FUTURES[s]) return FUTURES[s];
  if (s.endsWith("USDT") || s.endsWith("USDC")) return `BINANCE:${s}`;
  if (s.endsWith("USD") && s.length <= 7) return `OANDA:${s}`;
  if (/^[A-Z]{1,5}$/.test(s)) return s; // plain stock ticker, TradingView resolves it
  return null;
};

export default function MarketsPanel({ trades = [], currencySymbol = "$" }) {
  const theme = tvTheme();
  const now = useNow();
  const [heatmapKind, setHeatmapKind] = useState("crypto");
  const sym = currencySymbol;

  // your most-traded symbols with your own numbers + a live quote when we can map it
  const topSymbols = useMemo(() => {
    const m = new Map();
    trades.forEach((t) => {
      const s = t.symbol || t.ticker;
      if (!s) return;
      const x = m.get(s) || { symbol: s, n: 0, net: 0, wins: 0 };
      x.n += 1; x.net += pnlOf(t); if (pnlOf(t) > 0) x.wins += 1;
      m.set(s, x);
    });
    return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 4).map((x) => ({ ...x, tv: toTvSymbol(x.symbol) }));
  }, [trades]);
  const money = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${sym}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

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
    <div className={`${ov.root} ${mk.root}`}>
      <header className={ov.head}>
        <div>
          <h1 className={ov.title}>Markets</h1>
          <p className={ov.sub}>Live context for your next session: sessions, your symbols, heatmaps, calendar and news.</p>
        </div>
        <div className={mk.clock} aria-label="Current time">
          <Clock size={14} aria-hidden="true" />
          <span><b>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b> local</span>
          <span className={mk.clockSep} aria-hidden="true" />
          <span><b>{now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}</b> UTC</span>
        </div>
      </header>

      {/* ticker tape */}
      <div className={mk.tape}>
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

      <SessionsCard trades={trades} sym={sym} />

      {/* your symbols: journal stats + live quote */}
      {topSymbols.length > 0 && (
        <section className={mk.card} aria-labelledby="mk-yours">
          <div className={mk.cardHead}>
            <div>
              <h2 id="mk-yours" className={mk.cardTitle}>Your markets</h2>
              <p className={mk.cardSub}>The symbols you trade most, with live prices</p>
            </div>
          </div>
          <div className={mk.symGrid}>
            {topSymbols.map((x) => (
              <div key={x.symbol} className={mk.sym}>
                <div className={mk.symHead}>
                  <b>{x.symbol}</b>
                  <span className={x.net > 0 ? mk.pos : x.net < 0 ? mk.neg : undefined}>{money(x.net)}</span>
                </div>
                <small className={mk.symMeta}>{x.n} trades · {Math.round((x.wins / x.n) * 100)}% win</small>
                {x.tv ? (
                  <div className={mk.quote}>
                    <TVWidget script="single-quote" height={84} config={{ symbol: x.tv, width: "100%", isTransparent: true, colorTheme: theme, locale: "en" }} />
                  </div>
                ) : (
                  <p className={mk.noQuote}>Live price not available for this symbol</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* your-history projection */}
      <div className={mk.legacy}><EdgeForecast trades={trades} /></div>

      {/* heatmaps */}
      <section className={mk.card} aria-labelledby="mk-heat">
        <div className={mk.cardHead}>
          <div>
            <h2 id="mk-heat" className={mk.cardTitle}>Heatmap</h2>
            <p className={mk.cardSub}>What&apos;s moving right now</p>
          </div>
          <div className={ov.seg} role="group" aria-label="Heatmap market">
            {[["crypto", "Crypto"], ["stocks", "Stocks"], ["forex", "Forex"]].map(([v, l]) => (
              <button key={v} type="button" aria-pressed={heatmapKind === v} onClick={() => setHeatmapKind(v)}>{l}</button>
            ))}
          </div>
        </div>
        {/* all three stay mounted; tabs just toggle visibility (avoids
            TradingView re-injection issues and switches instantly) */}
        {Object.entries(heatmaps).map(([kind, w]) => (
          <div key={kind} className={mk.embed} hidden={heatmapKind !== kind} style={{ height: 520 }}>
            <TVWidget script={w.script} config={w.config} height={520} />
          </div>
        ))}
      </section>

      {/* calendar + news */}
      <div className={mk.grid2}>
        <section className={mk.card} aria-labelledby="mk-cal">
          <div className={mk.cardHead}>
            <div>
              <h2 id="mk-cal" className={mk.cardTitle}><CalendarDays size={15} aria-hidden="true" /> Economic calendar</h2>
              <p className={mk.cardSub}>High-impact events · US, EU, UK, JP, IN, CN</p>
            </div>
          </div>
          <div className={mk.embed} style={{ height: 640 }}>
            <TVWidget
              script="events"
              height={640}
              config={{ width: "100%", height: "100%", colorTheme: theme, isTransparent: true, locale: "en", importanceFilter: "0,1", countryFilter: "us,eu,gb,jp,in,cn" }}
            />
          </div>
        </section>
        <section className={mk.card} aria-labelledby="mk-news">
          <div className={mk.cardHead}>
            <div>
              <h2 id="mk-news" className={mk.cardTitle}><Newspaper size={15} aria-hidden="true" /> Top stories</h2>
              <p className={mk.cardSub}>Market news across all symbols</p>
            </div>
          </div>
          <div className={mk.embed} style={{ height: 640 }}>
            <TVWidget
              script="timeline"
              height={640}
              config={{ feedMode: "all_symbols", displayMode: "regular", width: "100%", height: "100%", colorTheme: theme, isTransparent: true, locale: "en" }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
