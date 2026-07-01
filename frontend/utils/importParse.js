/* Robust CSV import parsing shared by the import modal.
   - Maps common broker/platform column names onto our canonical fields, so a
     raw export (Topstep, MT4/5, Binance, brokers) "just works" without the user
     renaming headers.
   - PREFERS the P&L the platform already calculated (never recompute if it's
     given) — this is what fixes wrong numbers on imported futures trades.
   - When P&L must be computed from entry/exit/size, applies a contract point
     value (explicit `multiplier` column, or a built-in table for common
     futures) so futures maths is correct instead of off by the point value. */

// Point value (₹/$ per 1.00 move, per contract) for common CME futures.
// Used only when the CSV has no P&L column and no explicit multiplier.
export const FUTURES_POINT_VALUES = {
  ES: 50, MES: 5, NQ: 20, MNQ: 2, YM: 5, MYM: 0.5, RTY: 50, M2K: 5,
  CL: 1000, MCL: 100, GC: 100, MGC: 10, SI: 5000, HG: 25000, NG: 10000,
  ZB: 1000, ZN: 1000, ZF: 1000, ZT: 2000, ZC: 50, ZS: 50, ZW: 50,
  "6E": 125000, "6B": 62500, "6A": 100000, "6C": 100000, "6J": 12500000,
};

export function pointValueFor(symbol) {
  if (!symbol) return 0;
  const s = String(symbol).toUpperCase().replace(/[^A-Z0-9]/g, "");
  // longest keys first so "MES" wins over "ES", "MNQ" over "NQ"
  const keys = Object.keys(FUTURES_POINT_VALUES).sort((a, b) => b.length - a.length);
  for (const k of keys) if (s === k || s.startsWith(k)) return FUTURES_POINT_VALUES[k];
  return 0;
}

const compact = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// canonical field → the header names brokers actually use
const ALIASES = {
  symbol: ["symbol", "ticker", "instrument", "contract", "pair", "asset", "name", "product"],
  direction: ["direction", "side", "action", "type", "position", "buy/sell", "b/s", "long/short"],
  pnl: ["pnl", "p&l", "p/l", "profit", "profit/loss", "net pnl", "net", "net p&l", "realized", "realized pnl", "realized p&l", "realized p/l", "gain", "result", "netprofit"],
  entry: ["entry", "entry price", "avg entry", "avg entry price", "open price", "buy price", "price in", "fill price", "avg price", "avgprice"],
  exit: ["exit", "exit price", "avg exit", "avg exit price", "close price", "sell price", "price out"],
  size: ["size", "qty", "quantity", "contracts", "volume", "lots", "filled qty", "shares", "units", "filled", "position size"],
  multiplier: ["multiplier", "point value", "tick value", "contract multiplier", "big point value"],
  fee: ["fee", "fees", "commission", "commissions", "charges", "cost"],
  openTime: ["open time", "open date", "entry time", "entry date", "bought timestamp", "open timestamp", "opened"],
  closeTime: ["close time", "close date", "exit time", "exit date", "sold timestamp", "close timestamp", "closed", "date", "datetime"],
  stopLoss: ["stop loss", "stop", "sl"],
  takeProfit: ["take profit", "target", "tp"],
  strategy: ["strategy", "setup"],
  emotion: ["emotion", "feeling", "mood"],
  notes: ["notes", "note", "comment", "comments", "description"],
  // detailed-template extras
  sizeUnit: ["size unit", "unit"],
  leverage: ["leverage", "lev"],
  feeType: ["fee type"],
  market: ["market", "market condition"],
  timeframe: ["timeframe", "time frame", "tf"],
  confidence: ["confidence"],
  followedPlan: ["followed plan", "rules followed"],
  mistakes: ["mistakes", "mistake"],
};

// compact-header → canonical field
const REV = (() => {
  const m = {};
  for (const [canon, list] of Object.entries(ALIASES)) list.forEach((a) => { m[compact(a)] = canon; });
  return m;
})();

/* Remap a raw parsed row (keyed by the file's headers) → canonical keys. */
export function normalizeRow(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    const canon = REV[compact(k)];
    if (canon && (out[canon] === undefined || out[canon] === "")) out[canon] = v;
  }
  return out;
}

export function normDirection(v) {
  const s = compact(v);
  if (["long", "buy", "b", "bought", "buytoopen", "1", "l"].includes(s)) return "long";
  if (["short", "sell", "s", "sold", "selltoopen", "1short"].includes(s) || s === "-1") return "short";
  return String(v || "").trim().toLowerCase();
}

const nOrZero = (v) => { const n = Number(String(v).replace(/[₹$,\s]/g, "")); return Number.isNaN(n) ? 0 : n; };

/* Parse + validate an array of raw rows (from Papa) into clean trade objects.
   Returns { errs, clean, computedCount } — computedCount = how many rows had
   their P&L computed (vs taken from the file). */
export function parseImportRows(data) {
  const errs = [];
  const clean = [];
  let computedCount = 0;

  data.forEach((raw, i) => {
    const r = normalizeRow(raw);
    const n = i + 2; // header is row 1
    const symbol = String(r.symbol || "").trim();
    const direction = normDirection(r.direction);
    const hasPnl = String(r.pnl ?? "").trim() !== "";
    const pnl = nOrZero(r.pnl);
    const entry = nOrZero(r.entry);
    const exit = nOrZero(r.exit);
    const size = nOrZero(r.size);
    const explicitMult = nOrZero(r.multiplier);
    const closeTime = r.closeTime ? new Date(r.closeTime) : null;
    const openTime = r.openTime ? new Date(r.openTime) : null;

    // fully blank line → skip
    if (!symbol && !r.direction && !hasPnl && !r.entry) return;

    if (!symbol) errs.push(`Row ${n}: symbol is missing`);
    if (!["long", "short"].includes(direction)) errs.push(`Row ${n}: direction must be long/short (or buy/sell)`);
    if (hasPnl && Number.isNaN(Number(String(r.pnl).replace(/[₹$,\s]/g, "")))) errs.push(`Row ${n}: pnl must be a number`);
    if (!hasPnl && !entry) errs.push(`Row ${n}: add a pnl, or an entry price for an open trade`);
    if (closeTime && Number.isNaN(closeTime.getTime())) errs.push(`Row ${n}: closeTime is not a valid date`);
    if (openTime && Number.isNaN(openTime.getTime())) errs.push(`Row ${n}: openTime is not a valid date`);

    const dirMul = direction === "long" ? 1 : -1;
    // Prefer the platform's own P&L. Only compute when it's missing — and then
    // apply a contract point value so futures aren't off by 50×/20×/etc.
    let computedPnl;
    if (hasPnl) {
      computedPnl = pnl;
    } else if (entry && exit && size) {
      const mult = explicitMult || pointValueFor(symbol) || 1;
      computedPnl = (exit - entry) * size * mult * dirMul;
      computedCount += 1;
    } else {
      computedPnl = 0;
    }

    clean.push({
      symbol: symbol.toUpperCase(),
      direction,
      pnl: computedPnl,
      size,
      entry,
      exit,
      stopLoss: nOrZero(r.stopLoss),
      takeProfit: nOrZero(r.takeProfit),
      strategy: String(r.strategy || "").trim(),
      emotion: String(r.emotion || "").trim(),
      openTime: openTime && !Number.isNaN(openTime.getTime()) ? openTime.toISOString() : "",
      closeTime: closeTime && !Number.isNaN(closeTime.getTime()) ? closeTime.toISOString() : "",
      notes: String(r.notes || ""),
      fee: r.fee !== undefined && String(r.fee).trim() !== "" ? nOrZero(r.fee) : undefined,
      // detailed-template extras (optional; carried through if present)
      sizeUnit: String(r.sizeUnit || "").trim().toLowerCase() || undefined,
      leverage: r.leverage !== undefined && String(r.leverage).trim() !== "" ? nOrZero(r.leverage) : undefined,
      feeType: String(r.feeType || "").trim().toLowerCase() || undefined,
      market: String(r.market || "").trim() || undefined,
      timeframe: String(r.timeframe || "").trim() || undefined,
      confidence: r.confidence !== undefined && String(r.confidence).trim() !== "" ? nOrZero(r.confidence) : undefined,
      followedPlan: String(r.followedPlan ?? "").trim().toLowerCase() || undefined,
      mistakes: String(r.mistakes || "").trim() || undefined,
      _running: !hasPnl && !exit && !!entry,
    });
  });

  return { errs, clean, computedCount };
}
