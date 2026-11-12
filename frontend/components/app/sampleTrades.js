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

// the sample trader's checklist (shown in the sample analytics)
const SAMPLE_RULES = [
  { id: "s_setup", text: "Waited for my setup to confirm" },
  { id: "s_risk", text: "Risked 1% or less of my account" },
  { id: "s_stop", text: "Set my stop-loss before entering" },
  { id: "s_target", text: "Took profit at my planned target" },
];
// deterministic per trade (doesn't touch the RNG, so P&L stays the same)
function sampleChecks(id, followed) {
  let on;
  if (followed) on = id % 5 === 0 ? [true, true, false, true] : [true, true, true, true]; // sometimes skips the stop
  else on = id % 2 ? [false, false, false, false] : id % 4 ? [true, false, false, true] : [true, true, false, false];
  return SAMPLE_RULES.map((x, i) => ({ ruleId: x.id, text: x.text, checked: on[i] }));
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
        ...(() => {
          const ruleChecks = sampleChecks(id, followed);
          const n = ruleChecks.filter((c) => c.checked).length;
          const rulesStatus = n === ruleChecks.length ? "yes" : n ? "partial" : "no";
          return { ruleChecks, rulesStatus, rulesFollowed: rulesStatus === "yes" };
        })(),
        tradeStatus: "closed",
        source: r() > 0.6 ? "auto" : "manual",
        images: [],
        sample: true,
      });
    }
  }
  return out;
}
