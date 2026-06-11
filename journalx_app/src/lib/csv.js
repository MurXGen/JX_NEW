/* Tiny CSV parser + header mapper for trade import.
   Handles quoted fields, escaped quotes ("") and commas inside quotes. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const s = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field); field = "";
    } else if (ch === "\n") {
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

/* maps many possible column header names → our canonical trade fields */
const ALIASES = {
  symbol: ["symbol", "ticker", "pair", "instrument", "market", "asset"],
  direction: ["direction", "side", "type", "position", "long/short"],
  entry: ["entry", "entryprice", "entry price", "open", "openprice", "avgentry", "avg entry"],
  exit: ["exit", "exitprice", "exit price", "close", "closeprice", "avgexit", "avg exit"],
  stopLoss: ["stoploss", "stop loss", "sl", "stop"],
  takeProfit: ["takeprofit", "take profit", "tp", "target"],
  size: ["size", "qty", "quantity", "volume", "lots", "amount", "units"],
  pnl: ["pnl", "p&l", "p/l", "profit", "netpnl", "net pnl", "net p&l", "realized pnl", "return"],
  openTime: ["opentime", "open time", "entrytime", "entry time", "entrydate", "date opened", "open date"],
  closeTime: ["closetime", "close time", "exittime", "exit time", "exitdate", "date", "date closed", "close date", "time"],
  strategy: ["strategy", "setup", "playbook"],
  emotion: ["emotion", "feeling", "mood"],
  notes: ["notes", "note", "comment", "comments", "journal", "learnings"],
};

function canonical(header) {
  const h = String(header || "").trim().toLowerCase();
  for (const key of Object.keys(ALIASES)) {
    if (ALIASES[key].includes(h)) return key;
  }
  return null;
}

function normDirection(v) {
  const d = String(v || "").trim().toLowerCase();
  if (["long", "buy", "b", "l"].includes(d)) return "long";
  if (["short", "sell", "s"].includes(d)) return "short";
  return d;
}

/* CSV text → array of flat trade objects ready for importTradesBulk.
   Returns { trades, skipped, total }. */
export function csvToTrades(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { trades: [], skipped: 0, total: 0, error: "No data rows found" };
  const headers = rows[0].map((h) => canonical(h));
  const dataRows = rows.slice(1);
  const trades = [];
  let skipped = 0;
  dataRows.forEach((cols) => {
    const obj = {};
    headers.forEach((key, i) => {
      if (key && cols[i] !== undefined && String(cols[i]).trim() !== "") obj[key] = String(cols[i]).trim();
    });
    if (!obj.symbol) { skipped++; return; }
    if (obj.direction) obj.direction = normDirection(obj.direction);
    if (!["long", "short"].includes(obj.direction)) obj.direction = "long";
    trades.push(obj);
  });
  return { trades, skipped, total: dataRows.length };
}

export const SAMPLE_HEADERS = "symbol,direction,entry,exit,size,pnl,closeTime,notes";
