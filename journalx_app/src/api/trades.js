/* Trades API. The backend's addTrade JSON.parses several fields (sls, tps,
   reason, mistakes…), so those must be sent as JSON *strings* — exactly like
   the web's FormData. Anything omitted falls back to safe defaults. */
import api from "./client";

export async function addTrade(input) {
  const {
    accountId,
    symbol,
    direction = "long",
    pnl = 0,
    mode = "quick", // "quick" | "detailed"
    entry,
    exit,
    stopLoss,
    takeProfit,
    leverage,
    strategy,
    emotion,
    market,
    timeframe,
    notes,
    followedPlan,
    closeTime,
  } = input;

  const hasExit = exit != null && exit !== "";
  const tradeStatus = mode === "quick" ? "quick" : hasExit || closeTime ? "closed" : "running";

  const body = {
    accountId,
    symbol: String(symbol || "").trim().toUpperCase(),
    direction,
    pnl: Number(pnl) || 0,
    pnlAfterFee: Number(pnl) || 0,
    tradeStatus,
    source: "app",
    openTime: new Date().toISOString(),
  };

  if (mode === "detailed") {
    Object.assign(body, {
      avgEntryPrice: Number(entry) || 0,
      avgExitPrice: Number(exit) || 0,
      avgSLPrice: Number(stopLoss) || 0,
      avgTPPrice: Number(takeProfit) || 0,
      leverage: Number(leverage) || 1,
      strategy: strategy || "",
      emotion: emotion || "",
      marketCondition: market || "",
      timeframe: timeframe || "",
      learnings: notes || "",
      rulesFollowed: !!followedPlan,
      // structured fields must be JSON strings (controller JSON.parses them)
      sls: JSON.stringify(Number(stopLoss) ? [{ mode: "price", price: Number(stopLoss), allocation: 100 }] : []),
      tps: JSON.stringify(Number(takeProfit) ? [{ mode: "price", price: Number(takeProfit), allocation: 100 }] : []),
      reason: JSON.stringify(strategy ? [strategy] : []),
      mistakes: JSON.stringify([]),
      ...(closeTime ? { closeTime } : {}),
    });
  }

  const res = await api.post("/trades/addd", body);
  return res.data?.trade;
}
