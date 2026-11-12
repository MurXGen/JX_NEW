"use client";

/* Overview: the dashboard home. Answers, in order:
   how am I doing (KPIs) → how has my account moved (equity) → what should I
   do more / less of to make more (profit insights) → where it comes from
   (symbol, weekday, side, session) → day by day (calendar) → latest trades.
   Shows a seeded sample journal until the user has real trades. */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, CircleCheck, CircleSlash, FlaskConical,
  Plus, Upload, Wrench, TrendingDown, TrendingUp,
} from "lucide-react";
import { convertTrade } from "@/utils/fx";
import OverviewPanel from "@/components/revampV2/OverviewPanel";
import { ruleBreakdown, ruleStatusOf } from "@/utils/tradeRules";
import {
  RANGES, sliceRange, summary, equity, bySymbol, bySide, byWeekday, bySession, daily, insights, tradeTime,
} from "./analytics";
import { buildSampleTrades } from "./sampleTrades";
import o from "./Overview.module.css";

const tone = (n) => (n > 0 ? o.up : n < 0 ? o.down : "");
const toneId = (n) => (n > 0 ? "up" : n < 0 ? "down" : "flat");

function useMoney(sym) {
  return useMemo(() => {
    const full = (v, signed = false) => {
      const n = Number(v) || 0;
      const abs = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const sign = n < 0 ? "−" : signed && n > 0 ? "+" : "";
      return `${sign}${sym}${abs}`;
    };
    const short = (v, signed = false) => {
      const n = Number(v) || 0;
      const a = Math.abs(n);
      const body = a >= 1e6 ? `${(a / 1e6).toFixed(2)}M` : a >= 1e4 ? `${(a / 1e3).toFixed(1)}k` : a.toLocaleString(undefined, { maximumFractionDigits: 0 });
      const sign = n < 0 ? "−" : signed && n > 0 ? "+" : "";
      return `${sign}${sym}${body}`;
    };
    return { full, short };
  }, [sym]);
}

const ago = (ts) => {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

/* ---------------- KPI strip ---------------- */
function Delta({ now, prev, invert = false, fmt }) {
  if (prev == null || !Number.isFinite(prev) || !Number.isFinite(now)) return null;
  const d = now - prev;
  if (Math.abs(d) < 1e-9) return <span>No change</span>;
  const good = invert ? d < 0 : d > 0;
  return (
    <span className={`${o.delta} ${good ? o.up : o.down}`}>
      {d > 0 ? <ArrowUpRight size={13} aria-hidden="true" /> : <ArrowDownRight size={13} aria-hidden="true" />}
      {fmt(Math.abs(d))}
    </span>
  );
}

function Kpis({ s, prev, money, hasPrev, range }) {
  const period = range === "ALL" ? "all time" : `last ${String(range).replace("D", "")} days`;
  const pf = Number.isFinite(s.profitFactor) ? s.profitFactor.toFixed(2) : "∞";
  return (
    <section className={o.kpis} aria-label="Key numbers">
      <div className={o.kpi}>
        <div className={o.kpiLabel}>Net P&amp;L <span className={o.kpiPeriod}>· {period}</span></div>
        <div className={`${o.kpiValue} ${tone(s.net)}`}>{money.full(s.net, true)}</div>
        <div className={o.kpiFoot}>
          {hasPrev ? <><Delta now={s.net} prev={prev.net} fmt={(x) => money.short(x)} /> vs previous period</> : `${s.count} trades`}
        </div>
      </div>
      <div className={o.kpi}>
        <div className={o.kpiLabel}>Win rate</div>
        <div className={o.kpiValue}>{Math.round(s.winRate)}%</div>
        <div className={o.meter} aria-hidden="true">
          <span style={{ width: `${s.winRate}%`, background: "var(--green)" }} />
          <span style={{ width: `${100 - s.winRate}%`, background: s.count ? "var(--red)" : "transparent", opacity: 0.7 }} />
        </div>
        <div className={o.kpiFoot}>{s.wins} wins · {s.losses} losses</div>
      </div>
      <div className={o.kpi}>
        <div className={o.kpiLabel}>Profit factor</div>
        <div className={o.kpiValue}>{s.count ? pf : "—"}</div>
        <div className={o.kpiFoot}>
          {s.count ? (s.profitFactor >= 1.5 ? "Healthy edge" : s.profitFactor >= 1 ? "Thin edge, protect it" : "Losing more than you make") : "Gross wins ÷ gross losses"}
        </div>
      </div>
      <div className={o.kpi}>
        <div className={o.kpiLabel}>Avg per trade</div>
        <div className={`${o.kpiValue} ${tone(s.expectancy)}`}>{money.full(s.expectancy, true)}</div>
        <div className={o.kpiFoot}>
          Win {money.short(s.avgWin)} · Loss {money.short(-s.avgLoss)}
        </div>
      </div>
    </section>
  );
}

/* ---------------- equity chart ---------------- */
function EquityCard({ eq, startBalance, money }) {
  const reduce = useReducedMotion();
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null);
  const W = 1000;
  const H = 220;
  const pts = eq.points;
  const vals = pts.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = (max - min) * 0.12 || Math.max(1, Math.abs(max) * 0.05);
  const lo = min - pad;
  const hi = max + pad;
  const x = (i) => (pts.length < 2 ? 0 : (i / (pts.length - 1)) * W);
  const y = (v) => H - ((v - lo) / (hi - lo)) * H;
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const up = eq.end >= startBalance;
  const stroke = up ? "var(--green)" : "var(--red)";
  const baseY = y(startBalance);

  const onMove = (e) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r || pts.length < 2) return;
    const i = Math.round(((e.clientX - r.left) / r.width) * (pts.length - 1));
    setHover(Math.max(0, Math.min(pts.length - 1, i)));
  };
  const hp = hover != null ? pts[hover] : null;
  const first = pts[1] || pts[0];
  const last = pts[pts.length - 1];

  return (
    <section className={o.card} aria-labelledby="eq-title">
      <div className={o.equityHead}>
        <div>
          <h2 id="eq-title" className={o.cardTitle}>Account balance</h2>
          <div className={o.equityVal}>{money.full(eq.end)}</div>
        </div>
        <div className={o.equityStats}>
          <div><small>Change</small><b className={tone(eq.end - startBalance)}>{money.full(eq.end - startBalance, true)}</b></div>
          <div><small>Peak</small><b>{money.full(eq.peak)}</b></div>
          <div><small>Max drawdown</small><b className={eq.maxDD ? o.down : ""}>{eq.maxDD ? `${money.full(-eq.maxDD)}${eq.maxDDPct ? ` (${eq.maxDDPct.toFixed(1)}%)` : ""}` : "None"}</b></div>
        </div>
      </div>
      <div
        ref={wrapRef}
        className={o.chartWrap}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 220 }} role="img"
          aria-label={`Balance moved from ${money.full(startBalance)} to ${money.full(eq.end)}, max drawdown ${money.full(eq.maxDD)}`}>
          <defs>
            <linearGradient id="ov-eq" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={up ? "#2ebd85" : "#f6465d"} stopOpacity="0.22" />
              <stop offset="100%" stopColor={up ? "#2ebd85" : "#f6465d"} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="var(--line)" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2={W} y1={baseY} y2={baseY} stroke="var(--line-2)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
          {pts.length > 1 && <path d={`${line} L ${W} ${H} L 0 ${H} Z`} fill="url(#ov-eq)" />}
          {pts.length > 1 && (
            <motion.path
              key={line.length}
              d={line}
              fill="none"
              stroke={stroke}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          )}
          {hp && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="var(--line-2)" vectorEffect="non-scaling-stroke" />
              <circle cx={x(hover)} cy={y(hp.v)} r="4" fill={stroke} stroke="var(--surface)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>
        {hp && hp.trade && (
          <div className={o.tip} style={{ left: `${(hover / (pts.length - 1)) * 100}%` }}>
            <small>{new Date(hp.t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</small>
            <b>{money.full(hp.v)}</b>
            <span className={tone(Number(hp.trade.pnl))}>{hp.trade.symbol} {money.full(hp.trade.pnl, true)}</span>
          </div>
        )}
      </div>
      <div className={o.axis} aria-hidden="true">
        <span>{first?.trade ? new Date(first.t).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : ""}</span>
        <span>{last?.trade ? new Date(last.t).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : ""}</span>
      </div>
    </section>
  );
}

/* ---------------- profit insights ---------------- */
const KIND = {
  keep: { icon: CircleCheck, label: "Keep doing" },
  cut: { icon: CircleSlash, label: "Cut" },
  fix: { icon: Wrench, label: "Fix" },
};
function InsightsCard({ items, money }) {
  return (
    <section className={o.card} aria-labelledby="ins-title">
      <div className={o.cardHead}>
        <div>
          <h2 id="ins-title" className={o.cardTitle}>How to make more from your trading</h2>
          <p className={o.cardSub}>Ranked by how much money each one is worth</p>
        </div>
      </div>
      {items.length ? (
        <ul className={o.insights}>
          {items.map((it) => {
            const K = KIND[it.kind] || KIND.fix;
            return (
              <li key={it.id} className={o.insight}>
                <span className={o.insightIcon} data-kind={it.kind} aria-hidden="true"><K.icon size={17} /></span>
                <div className={o.insightBody}>
                  <b><span className={o.srOnly}>{K.label}: </span>{it.title}</b>
                  <p>{it.detail}</p>
                </div>
                {it.impact > 0 && (
                  <div className={o.insightImpact}>
                    <span className={it.kind === "keep" ? o.up : ""}>{money.short(it.impact)}</span>
                    <small>{it.kind === "keep" ? "made" : "on the table"}</small>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={o.empty}>Log a few more trades and this fills with what to keep and what to cut.</p>
      )}
    </section>
  );
}

/* ---------------- breakdowns ---------------- */
function SymbolCard({ groups, money }) {
  const top = groups.slice(0, 6);
  const maxAbs = Math.max(1, ...top.map((g) => Math.abs(g.net)));
  return (
    <section className={o.card} aria-labelledby="sym-title">
      <div className={o.cardHead}>
        <div>
          <h2 id="sym-title" className={o.cardTitle}>By symbol</h2>
          <p className={o.cardSub}>Where your P&amp;L comes from</p>
        </div>
      </div>
      {top.length ? (
        <div className={o.bars}>
          {top.map((g) => {
            const w = (Math.abs(g.net) / maxAbs) * 50;
            return (
              <div key={g.key} className={o.barRow}>
                <span className={o.lbl}>{g.key}<small>{g.count} trades · {Math.round(g.winRate)}%</small></span>
                <span className={o.track} aria-hidden="true">
                  <span style={g.net >= 0 ? { left: "50%", width: `${w}%`, background: "var(--green)" } : { right: "50%", width: `${w}%`, background: "var(--red)" }} />
                </span>
                <span className={`${o.val} ${tone(g.net)}`}>{money.short(g.net, true)}</span>
              </div>
            );
          })}
        </div>
      ) : <p className={o.empty}>No trades in this period.</p>}
    </section>
  );
}

function WeekdayCard({ days: all, money }) {
  // weekends only when something was traded on them
  const days = all.filter((d) => d.count > 0 || (d.key !== 0 && d.key !== 6));
  const maxAbs = Math.max(1, ...days.map((d) => Math.abs(d.net)));
  const best = days.reduce((b, d) => (d.net > (b?.net ?? 0) ? d : b), null);
  const worst = days.reduce((w, d) => (d.net < (w?.net ?? 0) ? d : w), null);
  return (
    <section className={o.card} aria-labelledby="wd-title">
      <div className={o.cardHead}>
        <div>
          <h2 id="wd-title" className={o.cardTitle}>By weekday</h2>
          <p className={o.cardSub}>Net P&amp;L per day</p>
        </div>
      </div>
      <div className={o.cols} role="list" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((d) => (
          <div key={d.key} className={o.col} role="listitem" aria-label={`${d.label}: ${money.full(d.net, true)}, ${d.count} trades`}>
            <div className={o.colBarArea}>
              <div className={o.half}>
                {d.net > 0 && <span className={o.colBar} style={{ height: `${(d.net / maxAbs) * 100}%`, background: "var(--green)" }} />}
                {d.net > 0 && <em className={o.colVal} style={{ bottom: `calc(${(d.net / maxAbs) * 100}% + 4px)` }}>{money.short(d.net, true)}</em>}
              </div>
              <div className={o.half}>
                {d.net < 0 && <span className={o.colBar} style={{ height: `${(-d.net / maxAbs) * 100}%`, background: "var(--red)" }} />}
                {d.net < 0 && <em className={o.colVal} style={{ top: `calc(${(-d.net / maxAbs) * 100}% + 4px)` }}>{money.short(d.net, true)}</em>}
              </div>
            </div>
            <small>{d.label}</small>
          </div>
        ))}
      </div>
      {(best || worst) && (
        <p className={o.cardFoot}>
          {best && <>Best: <b>{best.label}</b> {money.short(best.net, true)}</>}
          {best && worst && " · "}
          {worst && <>Weakest: <b>{worst.label}</b> {money.short(worst.net, true)}</>}
        </p>
      )}
    </section>
  );
}

function SplitCard({ title, sub, rows, money, id }) {
  return (
    <section className={o.card} aria-labelledby={id}>
      <div className={o.cardHead}>
        <div>
          <h2 id={id} className={o.cardTitle}>{title}</h2>
          <p className={o.cardSub}>{sub}</p>
        </div>
      </div>
      {rows.length ? (() => {
        const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.net)));
        return (
          <div className={o.bars}>
            {rows.map((r) => {
              const w = (Math.abs(r.net) / maxAbs) * 50;
              return (
                <div key={r.key} className={o.barRow}>
                  <span className={o.lbl}>{r.key}<small>{r.count} trades · {Math.round(r.winRate)}%</small></span>
                  <span className={o.track} aria-hidden="true">
                    <span style={r.net >= 0 ? { left: "50%", width: `${w}%`, background: "var(--green)" } : { right: "50%", width: `${w}%`, background: "var(--red)" }} />
                  </span>
                  <span className={`${o.val} ${tone(r.net)}`}>{money.short(r.net, true)}</span>
                </div>
              );
            })}
          </div>
        );
      })() : <p className={o.empty}>No trades in this period.</p>}
    </section>
  );
}

/* ---------------- rule discipline (Risk & behaviour) ---------------- */
const RULE_TONES = [
  { key: "yes", label: "Followed", hint: "every rule", color: "var(--green)" },
  { key: "partial", label: "Partial", hint: "some rules", color: "var(--amber)" },
  { key: "no", label: "Broken", hint: "no rules", color: "var(--red)" },
];
function RulesCard({ trades, money, onSetup }) {
  const groups = RULE_TONES.map((g) => {
    const list = trades.filter((t) => ruleStatusOf(t) === g.key);
    const net = list.reduce((a, t) => a + (Number(t.pnl) || 0), 0);
    return { ...g, n: list.length, net, avg: list.length ? net / list.length : 0 };
  });
  const tracked = groups.reduce((a, g) => a + g.n, 0);
  const rules = ruleBreakdown(trades).filter((r) => r.total >= 1).slice(0, 4);
  const pct = tracked ? Math.round((groups[0].n / tracked) * 100) : 0;

  return (
    <section className={o.card} aria-labelledby="rules-title">
      <div className={o.cardHead}>
        <div>
          <h2 id="rules-title" className={o.cardTitle}>Rule discipline</h2>
          <p className={o.cardSub}>How often you trade by your own rules, and what it pays</p>
        </div>
        {tracked > 0 && (
          <div className={o.ruleScore}>
            <b>{pct}%</b>
            <small>fully followed</small>
          </div>
        )}
      </div>

      {tracked === 0 ? (
        <div className={o.ruleEmpty}>
          <p>Set up your trading rules, then tick them on every trade. You&apos;ll see which ones you break and what they cost you.</p>
          {onSetup && <button type="button" className={o.ruleCta} onClick={onSetup}>Set up trading rules</button>}
        </div>
      ) : (
        <>
          <div className={o.ruleStack} role="img" aria-label={groups.map((g) => `${g.label} ${g.n} trades`).join(", ")}>
            {groups.map((g) => g.n > 0 && <span key={g.key} style={{ width: `${(g.n / tracked) * 100}%`, background: g.color }} />)}
          </div>
          <div className={o.ruleTiles}>
            {groups.map((g) => (
              <div key={g.key} className={o.ruleTile}>
                <span className={o.ruleLbl}><i style={{ background: g.color }} aria-hidden="true" />{g.label}<small>{g.hint}</small></span>
                <b>{g.n} <small>{g.n === 1 ? "trade" : "trades"} · {Math.round((g.n / tracked) * 100)}%</small></b>
                <span className={`${o.ruleAvg} ${g.n ? tone(g.avg) : ""}`}>{g.n ? `${money.short(g.avg, true)} avg` : "—"}</span>
              </div>
            ))}
          </div>

          {rules.length > 0 && (
            <div className={o.ruleList}>
              <h3>Rules you break most</h3>
              <ul>
                {rules.map((r) => (
                  <li key={r.key}>
                    <div className={o.ruleRow}>
                      <span className={o.ruleText}>{r.text}</span>
                      <span className={o.ruleRate}>{Math.round(r.breakRate * 100)}% skipped</span>
                    </div>
                    <span className={o.ruleTrack} aria-hidden="true"><i style={{ width: `${r.breakRate * 100}%` }} /></span>
                    <small className={o.ruleMeta}>
                      Skipped on {r.broken} of {r.total} trades
                      {r.avgBroken != null && r.avgKept != null && <> · avg <b className={tone(r.avgBroken)}>{money.short(r.avgBroken, true)}</b> when skipped vs <b className={tone(r.avgKept)}>{money.short(r.avgKept, true)}</b> when kept</>}
                    </small>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ---------------- calendar ---------------- */
function CalendarCard({ trades, money }) {
  const days = useMemo(() => daily(trades), [trades]);
  const lastTs = trades.length ? tradeTime(trades[trades.length - 1]) : Date.now();
  const [month, setMonth] = useState(() => { const d = new Date(lastTs); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const first = trades.length ? new Date(tradeTime(trades[0])) : new Date();
  const minMonth = new Date(first.getFullYear(), first.getMonth(), 1);
  const maxMonth = new Date(new Date(Math.max(lastTs, Date.now())).getFullYear(), new Date(Math.max(lastTs, Date.now())).getMonth(), 1);

  const y = month.getFullYear();
  const m = month.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
  const count = new Date(y, m + 1, 0).getDate();
  const todayKey = (() => { const t = new Date(); return `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`; })();
  let monthNet = 0;
  const cells = [...Array(lead)].map((_, i) => ({ empty: true, k: `e${i}` }));
  const traded = [];
  for (let d = 1; d <= count; d++) {
    const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const v = days[key];
    if (v) { monthNet += v.net; traded.push({ d, ...v }); }
    cells.push({ d, v, k: key, today: `${y}-${m}-${d}` === todayKey });
  }
  while (cells.length % 7) cells.push({ empty: true, k: `t${cells.length}` });
  // weekly totals (one per calendar row)
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    const row = cells.slice(i, i + 7).filter((c) => c.v);
    weeks.push({ net: row.reduce((a, c) => a + c.v.net, 0), n: row.reduce((a, c) => a + c.v.count, 0) });
  }
  const green = traded.filter((t) => t.net > 0).length;
  const red = traded.filter((t) => t.net < 0).length;
  const best = traded.reduce((b, t) => (!b || t.net > b.net ? t : b), null);
  const worst = traded.reduce((w, t) => (!w || t.net < w.net ? t : w), null);
  const tradesN = traded.reduce((a, t) => a + t.count, 0);
  const dayName = (d) => new Date(y, m, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
  const mStats = [
    { l: "Month P&L", v: money.short(monthNet, true), c: tone(monthNet), s: `${tradesN} trade${tradesN === 1 ? "" : "s"}` },
    { l: "Green days", v: `${green} / ${traded.length || 0}`, s: traded.length ? `${Math.round((green / traded.length) * 100)}% of trading days` : "No trading days" },
    { l: "Avg per day", v: traded.length ? money.short(monthNet / traded.length, true) : "—", c: tone(monthNet), s: `${red} red day${red === 1 ? "" : "s"}` },
    { l: "Best day", v: best && best.net > 0 ? money.short(best.net, true) : "—", c: best && best.net > 0 ? o.up : "", s: best && best.net > 0 ? dayName(best.d) : "No green day yet" },
    { l: "Worst day", v: worst && worst.net < 0 ? money.short(worst.net, true) : "—", c: worst && worst.net < 0 ? o.down : "", s: worst && worst.net < 0 ? dayName(worst.d) : "No red day" },
  ];

  return (
    <section className={o.card} aria-labelledby="cal-title">
      <div className={o.cardHead}>
        <div>
          <h2 id="cal-title" className={o.cardTitle}>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
          <p className={o.cardSub}>Month P&amp;L <b className={tone(monthNet)}>{money.full(monthNet, true)}</b></p>
        </div>
        <div className={o.calHead}>
          <button type="button" className={o.iconBtn} aria-label="Previous month" disabled={month <= minMonth} onClick={() => setMonth(new Date(y, m - 1, 1))}><ChevronLeft size={15} /></button>
          <button type="button" className={o.iconBtn} aria-label="Next month" disabled={month >= maxMonth} onClick={() => setMonth(new Date(y, m + 1, 1))}><ChevronRight size={15} /></button>
        </div>
      </div>
      <div className={o.calStats}>
        {mStats.map((x) => (
          <div key={x.l} className={o.calStat}>
            <span>{x.l}</span>
            <b className={x.c}>{x.v}</b>
            <small>{x.s}</small>
          </div>
        ))}
      </div>
      <div className={`${o.cal} ${o.calWeeks}`}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className={o.calDow} aria-hidden="true">{d}</div>)}
        <div className={`${o.calDow} ${o.weekHead}`} aria-hidden="true">Week</div>
        {cells.flatMap((c, ci) => {
          const out = [c.empty ? <div key={c.k} className={o.day} data-empty="true" aria-hidden="true" /> : (
          <div key={c.k} className={o.day} data-tone={c.v ? toneId(c.v.net) : undefined} data-today={c.today || undefined}
            aria-label={c.v ? `${c.d}: ${money.full(c.v.net, true)}, ${c.v.count} trades` : `${c.d}: no trades`}>
            <span aria-hidden="true">{c.d}</span>
            {c.v && <><b className={tone(c.v.net)} aria-hidden="true">{money.short(c.v.net, true)}</b><i aria-hidden="true">{c.v.count} trade{c.v.count === 1 ? "" : "s"}</i></>}
          </div>
          )];
          if (ci % 7 === 6) {
            const w = weeks[(ci - 6) / 7];
            const i = (ci - 6) / 7;
            out.push(
              <div key={`w${i}`} className={o.week} data-tone={w.n ? toneId(w.net) : undefined} aria-label={`Week ${i + 1}: ${w.n ? money.full(w.net, true) : "no trades"}`}>
                <span aria-hidden="true">Week {i + 1}</span>
                <b className={w.n ? tone(w.net) : undefined} aria-hidden="true">{w.n ? money.short(w.net, true) : "—"}</b>
                <i aria-hidden="true">{w.n ? `${w.n} trade${w.n === 1 ? "" : "s"}` : "No trades"}</i>
              </div>,
            );
          }
          return out;
        })}
      </div>
    </section>
  );
}

/* ---------------- month by month (last 12 months) ---------------- */
function MonthsCard({ trades, money }) {
  const now = new Date();
  const list = [...Array(12)].map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: "short" }), long: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }), net: 0, n: 0 };
  });
  const idx = Object.fromEntries(list.map((x, i) => [x.key, i]));
  trades.forEach((t) => {
    const d = new Date(tradeTime(t));
    const i = idx[`${d.getFullYear()}-${d.getMonth()}`];
    if (i != null) { list[i].net += Number(t.pnl) || 0; list[i].n += 1; }
  });
  const active = list.filter((x) => x.n);
  const maxAbs = Math.max(1, ...list.map((x) => Math.abs(x.net)));
  const best = active.reduce((b, x) => (!b || x.net > b.net ? x : b), null);
  const worst = active.reduce((w, x) => (!w || x.net < w.net ? x : w), null);
  const pos = active.filter((x) => x.net > 0).length;
  return (
    <section className={o.card} aria-labelledby="mon-title">
      <div className={o.cardHead}>
        <div>
          <h2 id="mon-title" className={o.cardTitle}>Month by month</h2>
          <p className={o.cardSub}>{active.length ? `${pos} of ${active.length} traded months profitable` : "Last 12 months"}</p>
        </div>
      </div>
      <div className={o.cols} role="list" style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
        {list.map((x) => (
          <div key={x.key} className={o.col} role="listitem" aria-label={`${x.long}: ${x.n ? money.full(x.net, true) : "no trades"}`} title={`${x.long}: ${x.n ? money.full(x.net, true) : "no trades"}`}>
            <div className={o.colBarArea}>
              <div className={o.half}>{x.net > 0 && <span className={o.colBar} style={{ height: `${(x.net / maxAbs) * 100}%`, background: "var(--green)" }} />}</div>
              <div className={o.half}>{x.net < 0 && <span className={o.colBar} style={{ height: `${(-x.net / maxAbs) * 100}%`, background: "var(--red)" }} />}</div>
            </div>
            <small>{x.label}</small>
          </div>
        ))}
      </div>
      {(best || worst) && (
        <p className={o.cardFoot}>
          {best && best.net > 0 && <>Best: <b>{best.long}</b> {money.short(best.net, true)}</>}
          {best && best.net > 0 && worst && worst.net < 0 && " · "}
          {worst && worst.net < 0 && <>Weakest: <b>{worst.long}</b> {money.short(worst.net, true)}</>}
        </p>
      )}
    </section>
  );
}

/* ---------------- activity heatmap (last 26 weeks, GitHub style) ---------------- */
function HeatmapCard({ trades, money }) {
  const [metric, setMetric] = useState("pnl");
  const days = useMemo(() => daily(trades), [trades]);
  const WEEKS = 26;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const endMon = new Date(today); endMon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const start = new Date(endMon); start.setDate(endMon.getDate() - (WEEKS - 1) * 7);
  const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const cols = [];
  let maxAbs = 1, maxN = 1, active = 0, green = 0;
  for (let w = 0; w < WEEKS; w++) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      const d = new Date(start); d.setDate(start.getDate() + w * 7 + r);
      const v = d > today ? null : days[keyOf(d)] || { net: 0, count: 0 };
      if (v && v.count) { maxAbs = Math.max(maxAbs, Math.abs(v.net)); maxN = Math.max(maxN, v.count); active++; if (v.net > 0) green++; }
      col.push({ d, v });
    }
    cols.push(col);
  }
  const months = cols.map((c, i) => (i === 0 || c[0].d.getMonth() !== cols[i - 1][0].d.getMonth() ? c[0].d.toLocaleDateString(undefined, { month: "short" }) : ""));
  const shade = (v) => {
    if (!v || !v.count) return undefined;
    if (metric === "count") return `rgba(233, 235, 238, ${0.18 + (v.count / maxN) * 0.62})`;
    const a = 0.22 + (Math.abs(v.net) / maxAbs) * 0.68;
    return v.net >= 0 ? `rgba(46, 189, 133, ${a})` : `rgba(246, 70, 93, ${a})`;
  };
  return (
    <section className={o.card} aria-labelledby="hm-title">
      <div className={o.cardHead}>
        <div>
          <h2 id="hm-title" className={o.cardTitle}>Activity heatmap</h2>
          <p className={o.cardSub}>Last 26 weeks · {active} trading days · {green} green</p>
        </div>
        <div className={o.seg} role="group" aria-label="Heatmap metric">
          <button type="button" aria-pressed={metric === "pnl"} onClick={() => setMetric("pnl")}>P&amp;L</button>
          <button type="button" aria-pressed={metric === "count"} onClick={() => setMetric("count")}>Trades</button>
        </div>
      </div>
      <div className={o.hmScroll}>
        <div className={o.hm} style={{ gridTemplateColumns: `28px repeat(${WEEKS}, minmax(11px, 1fr))` }}>
          <div className={o.hmRows} aria-hidden="true">
            <span />{["Mon", "", "Wed", "", "Fri", "", "Sun"].map((d, i) => <span key={i}>{d}</span>)}
          </div>
          {cols.map((col, w) => (
            <div key={w} className={o.hmCol}>
              <span className={o.hmMonth} aria-hidden="true">{months[w]}</span>
              {col.map(({ d, v }) => {
                const label = `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}: ${v && v.count ? `${money.full(v.net, true)}, ${v.count} trade${v.count === 1 ? "" : "s"}` : "no trades"}`;
                return <span key={d.getTime()} className={o.hmCell} data-future={!v || undefined} style={{ background: shade(v) }} title={v ? label : undefined} aria-label={v ? label : undefined} />;
              })}
            </div>
          ))}
        </div>
      </div>
      <div className={o.hmLegend} aria-hidden="true">
        <span>Less</span>
        {[0.25, 0.45, 0.65, 0.9].map((a) => <i key={a} style={{ background: metric === "count" ? `rgba(233,235,238,${a})` : `rgba(46,189,133,${a})` }} />)}
        <span>More</span>
        {metric === "pnl" && <><span className={o.hmGap} /><i style={{ background: "rgba(246,70,93,0.7)" }} /><span>Losing day</span></>}
      </div>
    </section>
  );
}

/* ---------------- recent trades ---------------- */
function RecentCard({ trades, money, onViewAll }) {
  const rows = [...trades].sort((a, b) => tradeTime(b) - tradeTime(a)).slice(0, 8);
  return (
    <section className={o.card} aria-labelledby="rec-title">
      <div className={o.cardHead}>
        <div>
          <h2 id="rec-title" className={o.cardTitle}>Recent trades</h2>
        </div>
        {onViewAll && <button type="button" className={o.link} onClick={onViewAll}>View all <ChevronRight size={14} aria-hidden="true" /></button>}
      </div>
      {rows.length ? (
        <div style={{ overflowX: "auto" }}>
          <table className={o.table}>
            <thead>
              <tr>
                <th scope="col">Symbol</th>
                <th scope="col">Result</th>
                <th scope="col" className={o.hideSm}>Side</th>
                <th scope="col">P&amp;L</th>
                <th scope="col">Closed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const p = Number(t.pnl) || 0;
                const tid = toneId(p);
                return (
                  <tr key={t._id} className={o.row} tabIndex={onViewAll ? 0 : undefined} onClick={onViewAll}
                    onKeyDown={(e) => { if (onViewAll && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onViewAll(); } }}>
                    <td>
                      <span className={o.symCell}>
                        <span className={o.symIcon} data-tone={tid} aria-hidden="true">{p < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}</span>
                        {t.symbol || "—"}
                      </span>
                    </td>
                    <td><span className={o.status} data-tone={tid}>{p > 0 ? "Win" : p < 0 ? "Loss" : "Flat"}</span></td>
                    <td className={`${o.sideTxt} ${o.hideSm}`}>{(t.direction || "long").toLowerCase()}</td>
                    <td className={`${o.num} ${tone(p)}`} style={{ fontWeight: 600 }}>{money.full(p, true)}</td>
                    <td>{ago(tradeTime(t))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <p className={o.empty}>No trades yet.</p>}
    </section>
  );
}

function EmptyRange({ sorted, onAll }) {
  return (
    <section className={o.card}>
      <p className={o.empty}>
        No trades in this period.{" "}
        {sorted.length ? <button type="button" className={o.link} onClick={onAll}>Show all time</button> : null}
      </p>
    </section>
  );
}

/* ---------------- tabs ---------------- */
const TABS = [
  { id: "summary", label: "Summary" },
  { id: "performance", label: "Performance" },
  { id: "breakdown", label: "Breakdown" },
  { id: "risk", label: "Risk & behaviour" },
  { id: "goals", label: "Goals" },
  { id: "calendar", label: "Calendar" },
];
/* which original analytics sections each tab shows */
const LEGACY = {
  performance: { only: ["analytics"], strip: true },
  breakdown: { only: ["timeframe", "edge"], strip: false },
  risk: { only: ["drawdown", "payoff", "holdtime", "revenge", "pace"], strip: false },
  goals: { only: ["capital", "streaks"], strip: false },
};
const RANGED = ["summary", "breakdown"];

/* ---------------- main ---------------- */
export default function Overview({
  trades: tradesProp = [],
  usingDummy = false,
  currencySymbol = "$",
  fxRate = 1,
  userName,
  startingBalance = 0,
  onLogTrade,
  onImport,
  onOpenRules,
  onViewTrades,
  banner = null,
}) {
  const [range, setRange] = useState("30D");
  const [tab, setTabState] = useState("performance"); // default; the user's last pick is restored below
  useEffect(() => {
    try { const v = localStorage.getItem("jx-overview-tab"); if (TABS.some((x) => x.id === v)) setTabState(v); } catch {}
  }, []);
  const setTab = (v) => { setTabState(v); try { localStorage.setItem("jx-overview-tab", v); } catch {} };
  const tabRefs = useRef({});
  // keep the selected tab fully visible in the sideways-scrolling row (phones)
  useEffect(() => {
    const el = tabRefs.current[tab];
    const row = el?.parentElement;
    if (!el || !row || row.scrollWidth <= row.clientWidth) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const left = row.scrollLeft + (el.getBoundingClientRect().left - row.getBoundingClientRect().left) - (row.clientWidth - el.offsetWidth) / 2;
    row.scrollTo({ left: Math.max(0, left), behavior: reduce ? "auto" : "smooth" });
  }, [tab]);
  const onTabKey = (e) => {
    const i = TABS.findIndex((x) => x.id === tab);
    let n = null;
    if (e.key === "ArrowRight") n = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = TABS.length - 1;
    if (n == null) return;
    e.preventDefault();
    setTab(TABS[n].id);
    tabRefs.current[TABS[n].id]?.focus();
  };
  const money = useMoney(currencySymbol);

  // sample journal until real trades exist; real trades converted to display currency
  const sample = useMemo(() => (usingDummy ? buildSampleTrades() : null), [usingDummy]);
  const all = useMemo(() => {
    const src = sample || tradesProp;
    // sample data converts too, so Overview and Trades log always agree
    return fxRate === 1 ? src : src.map((t) => convertTrade(t, fxRate));
  }, [sample, tradesProp, fxRate]);
  const startBal = (usingDummy ? 25000 : Number(startingBalance) || 0) * fxRate;

  const sorted = useMemo(() => [...all].filter((t) => !Number.isNaN(tradeTime(t))).sort((a, b) => tradeTime(a) - tradeTime(b)), [all]);
  const { current, previous } = useMemo(() => sliceRange(sorted, range), [sorted, range]);

  // balance before the window = start + everything earlier
  const before = useMemo(() => {
    if (!current.length) return startBal;
    const t0 = tradeTime(current[0]);
    return startBal + sorted.filter((t) => tradeTime(t) < t0).reduce((a, t) => a + (Number(t.pnl) || 0), 0);
  }, [sorted, current, startBal]);

  const s = useMemo(() => summary(current), [current]);
  const prev = useMemo(() => summary(previous), [previous]);
  const eq = useMemo(() => equity(current, before), [current, before]);
  const ins = useMemo(() => insights(current.length >= 6 ? current : sorted, money.full), [current, sorted, money]);
  const syms = useMemo(() => bySymbol(current), [current]);
  const days = useMemo(() => byWeekday(current), [current]);
  const sides = useMemo(() => bySide(current), [current]);
  const sessions = useMemo(() => bySession(current), [current]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = userName?.trim()?.split(" ")[0];

  return (
    <div className={o.root}>
      <header className={o.head}>
        <div>
          <h1 className={o.title}>Overview</h1>
          <p className={o.sub}>{greet}{first ? `, ${first}` : ""}.</p>
        </div>
        <div className={o.headActions}>
          {RANGED.includes(tab) && <div className={o.seg} role="group" aria-label="Period">
            {RANGES.map((r) => (
              <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>{r.label}</button>
            ))}
          </div>}
          {onLogTrade && (
            <button type="button" className={`${o.btn} ${o.gold} ${o.headLog}`} onClick={onLogTrade}>
              <Plus size={15} aria-hidden="true" /> Log trade
            </button>
          )}
        </div>
      </header>

      {banner}

      {usingDummy && (
        <div className={o.notice} role="note">
          <span className={o.noticeIcon} aria-hidden="true"><FlaskConical size={17} /></span>
          <div className={o.noticeText}>
            <b><span className={o.hideSm}>You&apos;re exploring a </span><span className={o.showSm}>Viewing a </span>sample journal</b>
            <span>These are example trades so you can see what JournalX shows. Log your first trade or import your history and it switches to your own numbers.</span>
          </div>
          {onImport && (
            <button type="button" className={`${o.btn} ${o.ghost}`} onClick={onImport}>
              <Upload size={14} aria-hidden="true" /> Import<span className={o.hideSm}> trades</span>
            </button>
          )}
        </div>
      )}

      <div className={o.tabs} role="tablist" aria-label="Overview sections" onKeyDown={onTabKey}>
        {TABS.map((x) => (
          <button
            key={x.id}
            ref={(el) => (tabRefs.current[x.id] = el)}
            type="button"
            role="tab"
            id={`ov-tab-${x.id}`}
            aria-selected={tab === x.id}
            aria-controls="ov-panel"
            tabIndex={tab === x.id ? 0 : -1}
            onClick={() => setTab(x.id)}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div id="ov-panel" role="tabpanel" aria-labelledby={`ov-tab-${tab}`} className={o.panel}>
        {tab === "summary" && (
          <>
            <Kpis s={s} prev={prev} money={money} hasPrev={previous.length > 0} range={range} />
            {current.length ? (
              <>
                <EquityCard eq={eq} startBalance={before} money={money} />
                <InsightsCard items={ins} money={money} />
                <RecentCard trades={current} money={money} onViewAll={onViewTrades} />
              </>
            ) : <EmptyRange sorted={sorted} onAll={() => setRange("ALL")} />}
          </>
        )}

        {tab === "breakdown" && (current.length ? (
          <>
            <div className={o.grid2}>
              <SymbolCard groups={syms} money={money} />
              <WeekdayCard days={days} money={money} />
            </div>
            <div className={o.grid2even}>
              <SplitCard id="side-title" title="Long vs short" sub="Which side pays" rows={sides} money={money} />
              <SplitCard id="ses-title" title="By session" sub="UTC market hours" rows={sessions} money={money} />
            </div>
          </>
        ) : <EmptyRange sorted={sorted} onAll={() => setRange("ALL")} />)}

        {tab === "calendar" && (
          <>
            <CalendarCard trades={sorted} money={money} />
            <div className={o.grid2}>
              <HeatmapCard trades={sorted} money={money} />
              <MonthsCard trades={sorted} money={money} />
            </div>
          </>
        )}

        {tab === "risk" && <RulesCard trades={sorted} money={money} onSetup={onOpenRules} />}

        {/* the original deeper analytics (capital growth with candles, timeframes,
            payoff, drawdown, hold time, revenge cost, streaks, donuts, columns…),
            restyled with these tokens; each tab shows its group. Always mounted so
            the Customize sheet (opened from the sidebar) keeps working. */}
        <div className={o.legacy} hidden={!LEGACY[tab]} data-tab={tab}>
          <OverviewPanel
            embedded
            showHead={false}
            only={LEGACY[tab]?.only || []}
            showStrip={!!LEGACY[tab]?.strip}
            trades={sample || tradesProp}
            fxRate={fxRate}
            currencySymbol={currencySymbol}
            userName={userName}
            usingDummy={usingDummy}
            startingBalance={usingDummy ? 25000 : startingBalance}
            onLogTrade={onLogTrade}
            onImport={onImport}
          />
        </div>
      </div>
    </div>
  );
}
