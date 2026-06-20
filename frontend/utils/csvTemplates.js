/* Shared CSV import templates so the Import/Export page and the Import modal
   offer the exact same downloadable samples. Two flavours:
     • quick    — only the columns used in Quick log (result-only)
     • detailed — every column captured in the Detailed log modal */

export const QUICK_TEMPLATE = {
  key: "quick",
  label: "Quick log",
  fileName: "journalx_quick_log_template.csv",
  hint: "Result-only — symbol, direction and net P&L (optional date & note).",
  columns: ["symbol", "direction", "pnl", "closeTime", "notes"],
  rows: [
    ["BTC/USDT", "long", "1250", "2026-06-01 14:30", "Breakout retest"],
    ["ETH/USDT", "short", "-420", "2026-06-02 10:05", "Chased the move"],
    ["SOL/USDT", "long", "610", "2026-06-03 18:45", "Clean trend day"],
  ],
};

export const DETAILED_TEMPLATE = {
  key: "detailed",
  label: "Detailed log",
  fileName: "journalx_detailed_log_template.csv",
  hint: "Full detail — entry/exit, size, leverage, fees, risk, strategy & psychology.",
  columns: [
    "symbol", "direction", "entry", "exit", "size", "sizeUnit", "leverage",
    "fee", "feeType", "stopLoss", "takeProfit", "openTime", "closeTime",
    "strategy", "market", "timeframe", "confidence", "followedPlan", "mistakes", "notes",
  ],
  rows: [
    ["BTC/USDT", "long", "61240", "63740", "0.5", "asset", "1", "12.40", "currency", "60000", "65000", "2026-06-01 10:00", "2026-06-01 14:30", "Breakout", "Trending", "1H", "4", "yes", "None", "Clean breakout retest"],
    ["EUR/USD", "short", "1.0920", "1.0875", "5000", "usd", "1", "0.1", "percent", "1.0960", "1.0840", "2026-06-02 08:00", "2026-06-02 11:20", "Reversal", "Ranging", "15m", "3", "no", "Moved stop;Chased entry", "Should have waited for confirmation"],
    ["AAPL", "long", "188.20", "193.40", "50", "asset", "1", "1.00", "currency", "185.00", "196.00", "2026-06-03 13:35", "2026-06-04 15:10", "Pullback", "Trending", "1D", "5", "yes", "None", "Held through the dip, textbook"],
  ],
};

export const TEMPLATES = { quick: QUICK_TEMPLATE, detailed: DETAILED_TEMPLATE };

const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const templateToCsv = (t) =>
  [t.columns.join(","), ...t.rows.map((r) => r.map(csvCell).join(","))].join("\n");

export function downloadTemplate(kind) {
  const t = TEMPLATES[kind] || QUICK_TEMPLATE;
  const blob = new Blob([templateToCsv(t)], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = t.fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
