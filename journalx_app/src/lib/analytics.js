/* Trade analytics — a faithful-but-compact port of the web's overview maths.
   Input: an array of trades for the selected journal. */

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon → Sun

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

  // current win streak
  let streak = 0;
  for (let i = ordered.length - 1; i >= 0; i--) {
    if (ordered[i].pnl > 0) streak++;
    else break;
  }

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
    biggestWin,
    maxDD,
    sessions: SESS,
    sessionsHaveData,
    bestSession,
  };
}
