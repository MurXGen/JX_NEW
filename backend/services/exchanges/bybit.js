"use strict";

/* Bybit V5 trade sync — Spot, Linear (USDT-M) and Inverse (COIN-M) derivatives.
   Derivatives use closed-pnl (rich: entry/exit/pnl). Spot uses execution/list
   with FIFO matching. Read-only endpoints only. */

const axios = require("axios");
const crypto = require("crypto");

const HOST = "https://api.bybit.com";
const RECV = "10000";

async function signedGet(path, params, apiKey, secret) {
  const ts = String(Date.now());
  const qs = new URLSearchParams(params).toString();
  const toSign = ts + apiKey + RECV + qs;
  const sign = crypto.createHmac("sha256", secret).update(toSign).digest("hex");
  const res = await axios.get(`${HOST}${path}?${qs}`, {
    headers: {
      "X-BAPI-API-KEY": apiKey,
      "X-BAPI-TIMESTAMP": ts,
      "X-BAPI-RECV-WINDOW": RECV,
      "X-BAPI-SIGN": sign,
    },
    timeout: 20000,
  });
  if (res.data?.retCode !== 0) {
    const err = new Error(res.data?.retMsg || "Bybit request failed");
    if (/api key|sign|permission|invalid/i.test(res.data?.retMsg || "")) err.code = "AUTH";
    throw err;
  }
  return res.data.result || {};
}

async function paged(path, baseParams, apiKey, secret, pick) {
  const out = [];
  let cursor = "";
  for (let i = 0; i < 10; i++) {
    const params = { ...baseParams, limit: 100 };
    if (cursor) params.cursor = cursor;
    const result = await signedGet(path, params, apiKey, secret);
    const rows = result.list || [];
    out.push(...rows.map(pick).filter(Boolean));
    cursor = result.nextPageCursor || "";
    if (!cursor || rows.length === 0) break;
  }
  return out;
}

/* Derivatives closed PnL → one closed trade per record. */
async function syncClosedPnl(category, apiKey, secret, sinceMs) {
  return paged(
    "/v5/position/closed-pnl",
    { category, startTime: sinceMs },
    apiKey, secret,
    (r) => {
      const entry = Number(r.avgEntryPrice) || 0;
      const exit = Number(r.avgExitPrice) || 0;
      const qty = Number(r.qty) || Number(r.closedSize) || 0;
      const pnl = Number(r.closedPnl) || 0;
      const openMs = Number(r.createdTime) || Number(r.updatedTime) || Date.now();
      const closeMs = Number(r.updatedTime) || openMs;
      // Bybit side = the side that CLOSED the position → position was the opposite
      const direction = String(r.side).toLowerCase() === "sell" ? "long" : "short";
      return {
        externalId: `bybit:${category}:${r.orderId || r.execId || `${r.symbol}-${closeMs}`}`,
        market: category, symbol: r.symbol,
        direction,
        entry: Number(entry.toFixed(6)),
        exit: Number(exit.toFixed(6)),
        qty,
        quantityUSD: Number((entry * qty).toFixed(2)),
        leverage: Number(r.leverage) || 1,
        pnl: Number(pnl.toFixed(6)),
        fees: 0,
        openTime: openMs,
        closeTime: closeMs,
      };
    },
  );
}

/* Spot executions → FIFO round-trips per symbol (pnl from price diff). */
async function syncSpot(apiKey, secret, sinceMs) {
  const execs = await paged(
    "/v5/execution/list",
    { category: "spot", startTime: sinceMs },
    apiKey, secret,
    (r) => ({
      symbol: r.symbol,
      side: String(r.side).toUpperCase(), // BUY | SELL
      qty: Number(r.execQty),
      price: Number(r.execPrice),
      time: Number(r.execTime),
      fee: Number(r.execFee || 0),
      id: r.execId,
    }),
  );

  const bySym = {};
  for (const e of execs) (bySym[e.symbol] ||= []).push(e);

  const out = [];
  for (const [symbol, fills] of Object.entries(bySym)) {
    const buys = fills.filter((f) => f.side === "BUY").sort((a, b) => a.time - b.time);
    const sells = fills.filter((f) => f.side === "SELL").sort((a, b) => a.time - b.time);
    let bi = 0, si = 0;
    while (bi < buys.length && si < sells.length) {
      const b = buys[bi], s = sells[si];
      const matched = Math.min(b.qty, s.qty);
      if (matched <= 0) break;
      const isLong = b.time < s.time;
      const pnl = (isLong ? s.price - b.price : b.price - s.price) * matched - b.fee - s.fee;
      out.push({
        externalId: `bybit:spot:${symbol}:${isLong ? s.id : b.id}`,
        market: "spot", symbol,
        direction: isLong ? "long" : "short",
        entry: Number(b.price.toFixed(6)),
        exit: Number(s.price.toFixed(6)),
        qty: Number(matched.toFixed(8)),
        quantityUSD: Number((b.price * matched).toFixed(2)),
        leverage: 1,
        pnl: Number(pnl.toFixed(6)),
        fees: Number((b.fee + s.fee).toFixed(6)),
        openTime: isLong ? b.time : s.time,
        closeTime: isLong ? s.time : b.time,
      });
      b.qty -= matched; s.qty -= matched;
      if (b.qty < 1e-8) bi++;
      if (s.qty < 1e-8) si++;
    }
  }
  return out;
}

/**
 * @param {{apiKey, secret, markets:string[], sinceMs:number}} opts
 * markets ⊆ ["spot","linear","inverse"]
 */
async function fetchBybitTrades({ apiKey, secret, markets, sinceMs }) {
  const wanted = markets && markets.length ? markets : ["linear"];
  const out = [];
  for (const m of wanted) {
    try {
      if (m === "linear" || m === "inverse") out.push(...(await syncClosedPnl(m, apiKey, secret, sinceMs)));
      else if (m === "spot") out.push(...(await syncSpot(apiKey, secret, sinceMs)));
    } catch (e) {
      if (e.code === "AUTH") throw e;
      console.warn(`Bybit ${m} sync failed:`, e.message);
    }
  }
  return out;
}

async function verifyBybit({ apiKey, secret }) {
  try {
    await signedGet("/v5/account/wallet-balance", { accountType: "UNIFIED" }, apiKey, secret);
    return true;
  } catch (e) {
    const err = new Error(e.message || "Invalid Bybit API credentials");
    err.code = "AUTH";
    throw err;
  }
}

module.exports = { fetchBybitTrades, verifyBybit };
