/* Pure analytics for the Overview. Every function takes plain trade objects
   ({ pnl, symbol, direction, closeTime|openTime, strategy, rulesFollowed,
   emotion, mistakes }) and returns numbers the UI can render. No React. */

const DAY = 864e5;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const tradeTime = (t) => new Date(t.closeTime || t.openTime || 0).getTime();
const pnlOf = (t) => Number(t.pnl) || 0;
const sum = (a) => a.reduce((x, y) => x + y, 0);

export const RANGES = [
  { id: "7D", label: "7D", days: 7 },
  { id: "30D", label: "30D", days: 30 },
  { id: "90D", label: "90D", days: 90 },
  { id: "ALL", label: "All", days: null },
];

/* trades inside the range, anchored to the latest trade (so sample data from
   the past still shows) and the same-length window before it for deltas */
export function sliceRange(trades, rangeId) {
  const sorted = trades.filter((t) => !Number.isNaN(tradeTime(t))).sort((a, b) => tradeTime(a) - tradeTime(b));
  const r = RANGES.find((x) => x.id === rangeId);
  if (!r?.days || !sorted.length) return { current: sorted, previous: [] };
  const anchor = Math.max(Date.now(), tradeTime(sorted[sorted.length - 1]));
  const lastTrade = tradeTime(sorted[sorted.length - 1]);
  // if nothing in the live window, anchor to the latest trade instead
  const end = sorted.some((t) => tradeTime(t) > anchor - r.days * DAY) ? anchor : lastTrade;
  const start = end - r.days * DAY;
  return {
    current: sorted.filter((t) => tradeTime(t) > start && tradeTime(t) <= end),
    previous: sorted.filter((t) => tradeTime(t) > start - r.days * DAY && tradeTime(t) <= start),
  };
}

export function summary(trades) {
  const pnls = trades.map(pnlOf);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const grossWin = sum(wins);
  const grossLoss = Math.abs(sum(losses));
  const net = sum(pnls);
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  return {
    count: trades.length,
    net,
    wins: wins.length,
    losses: losses.length,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    profitFactor: grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0,
    expectancy: trades.length ? net / trades.length : 0,
    avgWin,
    avgLoss,
    payoff: avgLoss ? avgWin / avgLoss : avgWin ? Infinity : 0,
    best: pnls.length ? Math.max(...pnls) : 0,
    worst: pnls.length ? Math.min(...pnls) : 0,
  };
}

/* equity curve + max drawdown (absolute and % of peak equity) */
export function equity(trades, startBalance = 0) {
  let bal = startBalance;
  let peak = startBalance;
  let maxDD = 0;
  let maxDDPct = 0;
  const points = [{ t: trades.length ? tradeTime(trades[0]) - 1 : Date.now(), v: startBalance, dd: 0 }];
  trades.forEach((tr) => {
    bal += pnlOf(tr);
    peak = Math.max(peak, bal);
    const dd = peak - bal;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDPct = peak > 0 ? (dd / peak) * 100 : 0;
    }
    points.push({ t: tradeTime(tr), v: bal, dd, trade: tr });
  });
  return { points, end: bal, maxDD, maxDDPct, peak };
}

/* group helper → [{ key, net, count, winRate }] sorted by net desc */
function groupBy(trades, keyFn) {
  const m = new Map();
  trades.forEach((t) => {
    const k = keyFn(t);
    if (k == null || k === "") return;
    const g = m.get(k) || { key: k, net: 0, count: 0, wins: 0 };
    g.net += pnlOf(t);
    g.count += 1;
    if (pnlOf(t) > 0) g.wins += 1;
    m.set(k, g);
  });
  return [...m.values()]
    .map((g) => ({ ...g, winRate: g.count ? (g.wins / g.count) * 100 : 0, avg: g.count ? g.net / g.count : 0 }))
    .sort((a, b) => b.net - a.net);
}

export const bySymbol = (trades) => groupBy(trades, (t) => (t.symbol || "").toUpperCase() || null);
export const bySide = (trades) => groupBy(trades, (t) => (t.direction || "").toLowerCase() === "short" ? "Short" : "Long");
export function byWeekday(trades) {
  const g = groupBy(trades, (t) => new Date(tradeTime(t)).getDay());
  // Mon..Sun order, include empty days so the chart is stable
  return [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const hit = g.find((x) => x.key === d);
    return { key: d, label: WEEKDAYS[d], net: hit?.net || 0, count: hit?.count || 0, winRate: hit?.winRate || 0 };
  });
}
const SESSIONS = [
  { id: "Asia", from: 0, to: 7 },
  { id: "London", from: 7, to: 13 },
  { id: "New York", from: 13, to: 21 },
  { id: "After hours", from: 21, to: 24 },
];
export const bySession = (trades) =>
  groupBy(trades, (t) => {
    const h = new Date(tradeTime(t)).getUTCHours();
    return SESSIONS.find((s) => h >= s.from && h < s.to)?.id;
  });

/* daily P&L map for the calendar: { "yyyy-mm-dd": { net, count } } */
export function daily(trades) {
  const m = {};
  trades.forEach((t) => {
    const d = new Date(tradeTime(t));
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    m[k] = m[k] || { net: 0, count: 0 };
    m[k].net += pnlOf(t);
    m[k].count += 1;
  });
  return m;
}

export function streaks(trades) {
  let cur = 0;
  let bestW = 0;
  let bestL = 0;
  let run = 0;
  trades.forEach((t) => {
    const p = pnlOf(t);
    if (p > 0) { run = run > 0 ? run + 1 : 1; bestW = Math.max(bestW, run); }
    else if (p < 0) { run = run < 0 ? run - 1 : -1; bestL = Math.max(bestL, -run); }
  });
  cur = run;
  return { current: cur, bestWin: bestW, bestLoss: bestL };
}

/* ------------------------------------------------------------------
   Profit insights: concrete "do more of this / cut this" findings,
   ranked by money impact. Each: { id, kind: keep|cut|fix|info, title,
   detail, impact (money, signed), metric }.
   ------------------------------------------------------------------ */
export function insights(trades, fmt) {
  const out = [];
  if (trades.length < 3) return out;
  const s = summary(trades);

  // 1. best and worst symbol
  const syms = bySymbol(trades).filter((g) => g.count >= 2);
  if (syms.length >= 2) {
    const best = syms[0];
    const worst = syms[syms.length - 1];
    if (best.net > 0) {
      out.push({
        id: "sym-best", kind: "keep",
        title: `${best.key} is your money maker`,
        detail: `${fmt(best.net, true)} across ${best.count} trades at a ${Math.round(best.winRate)}% win rate. Size up here before anywhere else.`,
        impact: best.net,
      });
    }
    if (worst.net < 0) {
      out.push({
        id: "sym-worst", kind: "cut",
        title: `${worst.key} is costing you`,
        detail: `${fmt(worst.net, true)} over ${worst.count} trades. Skipping it would have lifted your net to ${fmt(s.net - worst.net, true)}.`,
        impact: -worst.net,
      });
    }
  }

  // 2. weekday that bleeds
  const days = byWeekday(trades).filter((d) => d.count >= 2);
  const worstDay = [...days].sort((a, b) => a.net - b.net)[0];
  const bestDay = [...days].sort((a, b) => b.net - a.net)[0];
  if (worstDay && worstDay.net < 0) {
    out.push({
      id: "day-worst", kind: "cut",
      title: `${worstDay.label}s are your weakest day`,
      detail: `${fmt(worstDay.net, true)} from ${worstDay.count} trades. Trade smaller on ${worstDay.label}s, or sit them out.`,
      impact: -worstDay.net,
    });
  } else if (bestDay && bestDay.net > 0 && days.length >= 3) {
    out.push({
      id: "day-best", kind: "keep",
      title: `${bestDay.label}s pay you best`,
      detail: `${fmt(bestDay.net, true)} from ${bestDay.count} trades, ${Math.round(bestDay.winRate)}% win rate.`,
      impact: bestDay.net * 0.5,
    });
  }

  // 3. long vs short
  const sides = bySide(trades);
  if (sides.length === 2) {
    const [a, b] = sides; // sorted by net desc
    if (b.net < 0 && a.net > 0 && b.count >= 2) {
      out.push({
        id: "side", kind: "cut",
        title: `Your ${b.key.toLowerCase()}s lose money`,
        detail: `${a.key}s made ${fmt(a.net, true)}, ${b.key.toLowerCase()}s lost ${fmt(b.net, true)}. Focus on the side that works for you.`,
        impact: -b.net,
      });
    }
  }

  // 4. payoff: losers bigger than winners
  if (s.avgLoss > 0 && s.avgWin > 0 && s.avgLoss > s.avgWin) {
    const gap = (s.avgLoss - s.avgWin) * s.losses;
    out.push({
      id: "payoff", kind: "fix",
      title: "Your losses run bigger than your wins",
      detail: `Average loss ${fmt(-s.avgLoss, true)} vs average win ${fmt(s.avgWin, true)}. Cutting losers at your average win size would have saved about ${fmt(gap)}.`,
      impact: gap,
    });
  } else if (s.payoff >= 1.5 && s.winRate < 50) {
    out.push({
      id: "payoff-good", kind: "keep",
      title: "Your winners carry you",
      detail: `Wins average ${s.payoff.toFixed(1)}× your losses, so you stay profitable at a ${Math.round(s.winRate)}% win rate. Let winners run.`,
      impact: 0,
    });
  }

  // 5. following the plan (only if the journal tracks it)
  const tracked = trades.filter((t) => typeof t.rulesFollowed === "boolean" || t.rulesFollowed === "true" || t.rulesFollowed === "false");
  if (tracked.length >= 4) {
    const yes = tracked.filter((t) => t.rulesFollowed === true || t.rulesFollowed === "true");
    const no = tracked.filter((t) => !(t.rulesFollowed === true || t.rulesFollowed === "true"));
    if (yes.length >= 2 && no.length >= 2) {
      const ay = sum(yes.map(pnlOf)) / yes.length;
      const an = sum(no.map(pnlOf)) / no.length;
      if (ay > an) {
        out.push({
          id: "plan", kind: "fix",
          title: "Following your plan pays",
          detail: `On-plan trades average ${fmt(ay, true)}, off-plan ${fmt(an, true)}. Every off-plan trade costs you about ${fmt(ay - an)}.`,
          impact: (ay - an) * no.length,
        });
      }
    }
  }

  // 6. best strategy (if tagged)
  const strat = groupBy(trades, (t) => t.strategy || null).filter((g) => g.count >= 2);
  if (strat.length >= 2 && strat[0].net > 0) {
    out.push({
      id: "strategy", kind: "keep",
      title: `“${strat[0].key}” is your best setup`,
      detail: `${fmt(strat[0].net, true)} over ${strat[0].count} trades, ${Math.round(strat[0].winRate)}% win rate.`,
      impact: strat[0].net * 0.5,
    });
  }

  // 7. losing streak risk
  const st = streaks(trades);
  if (st.bestLoss >= 3) {
    out.push({
      id: "streak", kind: "fix",
      title: `${st.bestLoss} losses in a row at worst`,
      detail: "Set a daily stop: after 2 losses in a row, step away. Streaks are where accounts get hurt.",
      impact: 0,
    });
  }

  return out.sort((a, b) => b.impact - a.impact).slice(0, 5);
}
