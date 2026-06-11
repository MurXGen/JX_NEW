/* Trade math — a 1:1 port of the web LogTradeModal `calc` memo so the app's
   live P&L / R:R / fees match the web exactly. */
export const num = (v) => (v === "" || v == null ? null : Number(v));

export function computeTrade(form) {
  const entry = num(form.entry);
  const exit = num(form.exit);
  const size = num(form.size);
  const lev = num(form.leverage) || 1;
  const dir = form.direction === "long" ? 1 : -1;

  const assetQty =
    form.sizeUnit === "asset" ? size : size && entry ? (size * lev) / entry : null;
  const notional = assetQty && entry ? assetQty * entry : null;
  const quantityUSD = form.sizeUnit === "usd" ? size : notional ? notional / lev : null;

  const feeVal = num(form.feeValue) || 0;
  const feeAmount =
    form.feeUnit === "percent" ? (notional ? (notional * feeVal) / 100 : 0) : feeVal;

  const grossPnl = entry && exit && assetQty ? (exit - entry) * assetQty * dir : null;
  const pnl = grossPnl != null ? grossPnl - feeAmount : null;
  const retPct = pnl != null && notional ? (pnl / notional) * 100 : null;

  const sl = num(form.stopLoss);
  const tp = num(form.takeProfit);
  const plannedRR =
    entry && sl && tp && Math.abs(entry - sl) > 0
      ? Math.abs(tp - entry) / Math.abs(entry - sl)
      : null;
  const expectedLoss = entry && sl && assetQty ? Math.abs(entry - sl) * assetQty : 0;
  const expectedProfit = entry && tp && assetQty ? Math.abs(tp - entry) * assetQty : 0;
  const realizedR = pnl != null && expectedLoss > 0 ? pnl / expectedLoss : null;

  return {
    assetQty,
    notional,
    quantityUSD,
    feeAmount,
    grossPnl,
    pnl,
    retPct,
    plannedRR,
    expectedLoss,
    expectedProfit,
    realizedR,
  };
}

export const detectSession = (dt) => {
  if (!dt) return null;
  const h = new Date(dt).getUTCHours();
  if (h < 7) return "Asia session";
  if (h < 13) return "London session";
  if (h < 21) return "New York session";
  return "Sydney session";
};
