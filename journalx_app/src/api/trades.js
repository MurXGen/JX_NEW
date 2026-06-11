/* Trades API — builds the exact same payload the web LogTradeModal sends to
   POST /api/trades/addd. Structured fields (entries/exits/sls/tps/reason/
   mistakes) are JSON strings because the backend JSON.parses them. */
import api from "./client";
import { computeTrade, num } from "../lib/tradeCalc";

const fmt1 = (n) => Number(n).toFixed(1);

/* builds the exact field payload the backend expects for add + update */
function buildTradeBody(form) {
  const {
    accountId,
    mode = "detailed", // quick | detailed
    logMethod = "entryexit", // quick: entryexit | pnl
    netPnl,
    symbol,
    direction = "long",
    entry,
    exit,
    stopLoss,
    takeProfit,
    leverage,
    feeValue,
    feeUnit = "percent",
    sizeUnit = "asset",
    entryTime,
    exitTime,
    strategy,
    market,
    timeframe, // already resolved string e.g. "15m" / "" / "12m"
    confidence,
    emotion,
    followedPlan,
    mistakes = [],
    notes,
  } = form;

  const c = computeTrade(form);
  const isQuickPnl = mode === "quick" && logMethod === "pnl";
  const pnl = isQuickPnl ? Number(netPnl) || 0 : c.pnl ?? 0;
  const hasExit = !!num(exit);
  const now = new Date().toISOString();
  const openTime = entryTime ? new Date(entryTime).toISOString() : now;
  const closeTime = exitTime
    ? new Date(exitTime).toISOString()
    : isQuickPnl || hasExit
      ? now
      : "";
  const tradeStatus = mode === "quick" ? "quick" : hasExit || closeTime ? "closed" : "running";
  const durationHrs =
    openTime && closeTime ? Math.max(0, (new Date(closeTime) - new Date(openTime)) / 36e5) : 0;

  const body = {
    accountId,
    symbol: String(symbol || "").trim().toUpperCase(),
    direction,
    tradeStatus,
    quantityUSD: c.quantityUSD ?? 0,
    leverage: num(leverage) || 1,
    totalQuantity: c.assetQty ?? 0,
    sizeUnit,
    entries: JSON.stringify(num(entry) ? [{ price: num(entry), allocation: 100, quantity: c.assetQty || 0 }] : []),
    exits: JSON.stringify(hasExit ? [{ mode: "price", price: num(exit), allocation: 100, quantity: c.assetQty || 0 }] : []),
    sls: JSON.stringify(num(stopLoss) ? [{ mode: "price", price: num(stopLoss), allocation: 100 }] : []),
    tps: JSON.stringify(num(takeProfit) ? [{ mode: "price", price: num(takeProfit), allocation: 100 }] : []),
    avgEntryPrice: num(entry) || 0,
    avgExitPrice: num(exit) || 0,
    avgSLPrice: num(stopLoss) || 0,
    avgTPPrice: num(takeProfit) || 0,
    expectedProfit: c.expectedProfit || 0,
    expectedLoss: c.expectedLoss || 0,
    rr: c.plannedRR ? `1:${fmt1(c.plannedRR)}` : "",
    feeType: feeUnit,
    openFeeValue: num(feeValue) || 0,
    feeAmount: c.feeAmount || 0,
    pnl,
    pnlAfterFee: pnl,
    openTime,
    ...(closeTime ? { closeTime } : {}),
    duration: durationHrs,
    reason: JSON.stringify(strategy ? [strategy] : []),
    learnings: notes || "",
    rulesFollowed: !!followedPlan,
    strategy: strategy || "",
    marketCondition: market || "",
    timeframe: timeframe || "",
    confidence: Number(confidence) || 0,
    emotion: emotion || "",
    mistakes: JSON.stringify(mistakes || []),
    source: "app",
  };
  return body;
}

export async function addTrade(form) {
  const body = buildTradeBody(form);

  const screenshots = form.screenshots || [];
  let res;
  if (screenshots.length) {
    // multipart so we can attach image files (backend handles `images` via multer)
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, typeof v === "string" ? v : String(v));
    });
    screenshots.forEach((img, i) => {
      fd.append("images", {
        uri: img.uri,
        name: img.name || `screenshot-${i}.jpg`,
        type: img.type || "image/jpeg",
      });
    });
    res = await api.post("/trades/addd", fd, { headers: { "Content-Type": "multipart/form-data" } });
  } else {
    res = await api.post("/trades/addd", body);
  }

  const saved = res.data?.trade;
  return saved ? { ...body, ...saved } : saved;
}

/* edit an existing trade — PUT /trades/update/:id with the same field payload.
   Screenshots are managed separately (via the image modal), so we send JSON. */
export async function updateTrade(tradeId, form) {
  const body = buildTradeBody(form);
  const res = await api.put(`/trades/update/${tradeId}`, body);
  return res.data?.trade || res.data; // backend returns the enriched trade
}

/* attach a screenshot to an existing trade (backend field name is "image") */
export async function addTradeImage(tradeId, img) {
  const fd = new FormData();
  fd.append("image", { uri: img.uri, name: img.name || "screenshot.jpg", type: img.type || "image/jpeg" });
  const res = await api.post(`/trades/${tradeId}/images`, fd, { headers: { "Content-Type": "multipart/form-data" } });
  return res.data; // { success, images }
}

/* remove a screenshot from a trade by its url */
export async function removeTradeImage(tradeId, url) {
  const res = await api.delete(`/trades/${tradeId}/images`, { data: { url } });
  return res.data; // { success, images }
}

/* delete a single trade (backend identifies it via the x-trade-id header) */
export async function deleteTrade(tradeId) {
  const res = await api.delete("/trades/delete", { headers: { "x-trade-id": String(tradeId) } });
  return res.data; // { success, userData }
}

/* bulk-import quick-log rows (parsed from a CSV). The backend derives status
   (quick/running/closed), P&L and structured fields from these flat rows. */
export async function importTradesBulk(accountId, trades) {
  const res = await api.post("/trades/bulk", { accountId, trades });
  return res.data; // { success, message, trades }
}
