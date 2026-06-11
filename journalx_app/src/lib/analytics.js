/* Trade analytics — a faithful-but-compact port of the web's overview maths.
   Input: an array of trades for the selected journal. */

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon → Sun

export const RANGES = ["1D", "1W", "1M", "3M", "1Y", "ALL"];
export function filterByRange(trades = [], range = "ALL") {
  if (range === "ALL") return trades;
  const days = { "1D": 1, "1W": 7, "1M": 30, "3M": 90, "1Y": 365 }[range];
  if (!days) return trades;
  const cutoff = Date.now() - days * 864e5;
  return trades.filter((t) => new Date(t.closeTime || t.openTime || 0).getTime() >= cutoff);
}

export function computeStats(trades = []) {
  const closed = trades
    .filter((t) => t.closeTime || t.tradeStatus === "closed" || t.tradeStatus === "quick")
    .map((t) => ({ ...t, pnl: Number(t.pnl) || 0 }));

  const n = closed.length;
  const wins = closed.filter((t) => t.pnl > 0);
  const losses = closed.filter((t) => t.pnl < 0);
  const net = closed.reduce((s, t) => s + t.pnl, 0);
  const winRate = n ? Math.round((wins.length / n) * 100) : 0;

  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const expectancy = n ? net / n : 0;

  // equity curve (cumulative pnl over time)
  const ordered = [...closed].sort(
    (a, b) => new Date(a.closeTime || a.openTime || 0) - new Date(b.closeTime || b.openTime || 0),
  );
  let cum = 0;
  const equity = ordered.map((t) => (cum += t.pnl));

  // day-of-week
  const byDow = DOW.map(() => ({ pnl: 0, n: 0 }));
  closed.forEach((t) => {
    const d = new Date(t.closeTime || t.openTime);
    if (Number.isNaN(d.getTime())) return;
    const k = d.getDay();
    byDow[k].pnl += t.pnl;
    byDow[k].n += 1;
  });
  const dow = DOW_ORDER.map((i) => ({ label: DOW[i], ...byDow[i] }));
  const dowHasData = dow.some((d) => d.n > 0);

  // current + best winning-trade streak
  let streak = 0;
  for (let i = ordered.length - 1; i >= 0; i--) {
    if (ordered[i].pnl > 0) streak++;
    else break;
  }
  let bestStreak = 0, runT = 0;
  ordered.forEach((t) => { if (t.pnl > 0) { runT++; bestStreak = Math.max(bestStreak, runT); } else runT = 0; });

  // per-day aggregation → green-day streaks + recent daily series
  const dayAgg = {};
  ordered.forEach((t) => {
    const d = new Date(t.closeTime || t.openTime);
    if (Number.isNaN(d.getTime())) return;
    const k = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (!dayAgg[k]) dayAgg[k] = { t: k, pnl: 0, n: 0 };
    dayAgg[k].pnl += t.pnl; dayAgg[k].n += 1;
  });
  const days = Object.values(dayAgg).sort((a, b) => a.t - b.t);
  let bestGreenStreak = 0, runG = 0;
  days.forEach((d) => { if (d.pnl > 0) { runG++; bestGreenStreak = Math.max(bestGreenStreak, runG); } else runG = 0; });
  let greenStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) { if (days[i].pnl > 0) greenStreak++; else break; }
  const dailyPnl = days.slice(-14);

  const biggestWin = wins.length ? Math.max(...wins.map((t) => t.pnl)) : 0;

  // max drawdown from the equity curve (peak-to-valley)
  let peak = 0;
  let maxDD = 0;
  equity.forEach((v) => {
    if (v > peak) peak = v;
    maxDD = Math.max(maxDD, peak - v);
  });

  // trading sessions by open-time UTC hour
  const SESS = [
    { id: "asia", label: "Asia", lo: 0, hi: 8 },
    { id: "london", label: "London", lo: 8, hi: 13 },
    { id: "newyork", label: "New York", lo: 13, hi: 21 },
    { id: "sydney", label: "Sydney", lo: 21, hi: 24 },
  ].map((s) => ({ ...s, pnl: 0, n: 0 }));
  closed.forEach((t) => {
    const d = new Date(t.openTime || t.closeTime);
    if (Number.isNaN(d.getTime())) return;
    const h = d.getUTCHours();
    const s = SESS.find((x) => h >= x.lo && h < x.hi);
    if (s) { s.pnl += t.pnl; s.n += 1; }
  });
  const sessionsHaveData = SESS.some((s) => s.n > 0);
  const bestSession = sessionsHaveData
    ? SESS.filter((s) => s.n > 0).reduce((m, s) => (s.pnl > m.pnl ? s : m))
    : null;

  // per-symbol P&L (top by absolute size) for bar + donut analytics
  const symMap = {};
  closed.forEach((t) => {
    const k = (t.symbol || t.ticker || "—").toUpperCase();
    const e = symMap[k] || { sym: k, pnl: 0, n: 0 };
    e.pnl += t.pnl; e.n += 1;
    symMap[k] = e;
  });
  const symbolPnl = Object.values(symMap).sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).slice(0, 6);
  const symMax = Math.max(1, ...symbolPnl.map((s) => Math.abs(s.pnl)));
  // allocation by trade count (for the donut)
  const allocation = Object.values(symMap).sort((a, b) => b.n - a.n).slice(0, 6).map((s) => ({ label: s.sym, value: s.n }));

  // discipline: % of trades that followed the plan
  const planned = closed.filter((t) => t.rulesFollowed);
  const disciplinePct = n ? Math.round((planned.length / n) * 100) : 0;

  return {
    n,
    net,
    winRate,
    profitFactor,
    expectancy,
    avgWin,
    avgLoss,
    equity,
    dow,
    dowHasData,
    streak,
    bestStreak,
    greenStreak,
    bestGreenStreak,
    dailyPnl,
    biggestWin,
    maxDD,
    sessions: SESS,
    sessionsHaveData,
    bestSession,
    symbolPnl,
    symMax,
    allocation,
    disciplinePct,
  };
}
