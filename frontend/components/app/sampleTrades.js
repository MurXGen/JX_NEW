/* Sample journal shown until the user logs real trades. Deterministic (seeded)
   so it renders the same every time, dated relative to today so range filters
   behave, and shaped with patterns the insights can find:
   NQ and ETH make money, XAUUSD bleeds, Fridays are weak, shorts underperform. */

const SYMBOLS = [
  { s: "NQ", bias: 340, vol: 520 },
  { s: "ETH/USDT", bias: 200, vol: 380 },
  { s: "AAPL", bias: 90, vol: 240 },
  { s: "EUR/USD", bias: 40, vol: 200 },
  { s: "XAU/USD", bias: -150, vol: 260 },
];
const STRATEGIES = ["Breakout", "Pullback", "Range fade"];
const TIMEFRAMES = ["5m", "15m", "15m", "1h", "1h", "4h", "5m"];

function rng(seed) {
  let x = seed;
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}

export function buildSampleTrades(now = Date.now()) {
  const r = rng(42);
  const out = [];
  const start = new Date(now - 44 * 864e5);
  start.setHours(0, 0, 0, 0);
  let id = 0;
  for (let d = 0; d < 44; d++) {
    const day = new Date(start.getTime() + d * 864e5);
    const wd = day.getDay();
    if (wd === 0 || wd === 6) continue; // weekdays only
    const n = 1 + Math.floor(r() * 2.2);
    for (let i = 0; i < n; i++) {
      const sym = SYMBOLS[Math.floor(r() * SYMBOLS.length)];
      const short = r() < 0.35;
      let pnl = sym.bias + (r() - 0.45) * sym.vol * 2;
      if (short) pnl -= 80; // shorts are the weaker side
      if (wd === 5) pnl -= 160; // Fridays bleed
      const followed = r() > 0.3;
      if (!followed) pnl -= 90;
      pnl = Math.round(pnl / 5) * 5;
      const hour = 7 + Math.floor(r() * 10);
      const close = new Date(day);
      close.setHours(hour, Math.floor(r() * 60), 0, 0);
      const open = new Date(close.getTime() - (20 + r() * 160) * 60000);
      id += 1;
      out.push({
        _id: `sample-${id}`,
        symbol: sym.s,
        direction: short ? "short" : "long",
        pnl,
        openTime: open.toISOString(),
        closeTime: close.toISOString(),
        strategy: STRATEGIES[Math.floor(r() * STRATEGIES.length)],
        timeframe: TIMEFRAMES[(id * 5) % TIMEFRAMES.length],
        rulesFollowed: followed,
        tradeStatus: "closed",
        source: r() > 0.6 ? "auto" : "manual",
        images: [],
        sample: true,
      });
    }
  }
  return out;
}
