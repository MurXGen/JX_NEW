"use strict";

/* Binance trade sync — Spot, USDT-M (fapi) and COIN-M (dapi) futures.
   Returns normalized closed trades keyed by a stable externalId so re-syncs
   never duplicate. Uses read-only endpoints only. */

const axios = require("axios");
const crypto = require("crypto");

const HOSTS = {
  spot: "https://api.binance.com",
  usdm: "https://fapi.binance.com",
  coinm: "https://dapi.binance.com",
};

function sign(query, secret) {
  return crypto.createHmac("sha256", secret).update(query).digest("hex");
}

async function signedGet(market, path, params, apiKey, secret) {
  const host = HOSTS[market];
  const q = new URLSearchParams({
    ...params,
    timestamp: String(Date.now()),
    recvWindow: "10000",
  }).toString();
  const url = `${host}${path}?${q}&signature=${sign(q, secret)}`;
  const res = await axios.get(url, {
    headers: { "X-MBX-APIKEY": apiKey },
    timeout: 20000,
  });
  return res.data;
}

/* Group a symbol's fills into closed round-trips (FIFO buy↔sell match).
   pnlByTradeId maps a fill id → realized pnl (futures income); when absent
   (spot) pnl is derived from the price difference. */
function matchFills(market, symbol, fills, pnlByTradeId) {
  const orders = {};
  for (const f of fills) {
    const id = f.orderId;
    if (!orders[id]) {
      orders[id] = {
        orderId: id, side: f.side, qty: 0, value: 0, fees: 0,
        first: f.time, last: f.time, ids: [],
      };
    }
    const o = orders[id];
    const qty = Number(f.qty);
    const price = Number(f.price);
    o.qty += qty;
    o.value += qty * price;
    o.fees += Number(f.commission || 0);
    o.first = Math.min(o.first, f.time);
    o.last = Math.max(o.last, f.time);
    o.ids.push(f.id);
  }

  const list = Object.values(orders);
  const buys = list.filter((o) => o.side === "BUY").sort((a, b) => a.first - b.first);
  const sells = list.filter((o) => o.side === "SELL").sort((a, b) => a.first - b.first);

  const trades = [];
  let bi = 0, si = 0;
  while (bi < buys.length && si < sells.length) {
    const b = buys[bi], s = sells[si];
    const isLong = b.first < s.first;
    const matched = Math.min(b.qty, s.qty);
    if (matched <= 0) break;
    const buyVal = (matched / (b.qty || 1)) * b.value;
    const sellVal = (matched / (s.qty || 1)) * s.value;
    const entry = buyVal / matched;
    const exit = sellVal / matched;
    const fees =
      (matched / (b.qty || 1)) * b.fees + (matched / (s.qty || 1)) * s.fees;

    let pnl = 0;
    if (pnlByTradeId) {
      for (const id of b.ids) if (pnlByTradeId[id]) pnl += pnlByTradeId[id] * (matched / (b.qty || 1));
      for (const id of s.ids) if (pnlByTradeId[id]) pnl += pnlByTradeId[id] * (matched / (s.qty || 1));
    }
    if (!pnl) pnl = (isLong ? exit - entry : entry - exit) * matched;

    const openTime = isLong ? b.first : s.first;
    const closeTime = isLong ? s.last : b.last;
    const lastId = isLong ? s.ids[s.ids.length - 1] : b.ids[b.ids.length - 1];

    trades.push({
      externalId: `binance:${market}:${symbol}:${lastId}`,
      market, symbol,
      direction: isLong ? "long" : "short",
      entry: Number(entry.toFixed(6)),
      exit: Number(exit.toFixed(6)),
      qty: Number(matched.toFixed(8)),
      quantityUSD: Number((isLong ? buyVal : sellVal).toFixed(2)),
      leverage: 1,
      pnl: Number((pnl - (pnlByTradeId ? 0 : fees)).toFixed(6)),
      fees: Number(fees.toFixed(6)),
      openTime,
      closeTime,
    });

    b.qty -= matched; b.value = (b.qty / (b.qty + matched || 1)) * b.value;
    s.qty -= matched; s.value = (s.qty / (s.qty + matched || 1)) * s.value;
    if (b.qty < 1e-8) bi++;
    if (s.qty < 1e-8) si++;
  }
  return trades;
}

/* Futures (usdm/coinm): realized-pnl income gives cross-symbol pnl + the traded
   symbols; we then pull each symbol's fills to reconstruct entry/exit. */
async function syncFutures(market, apiKey, secret, sinceMs) {
  const incomePath = market === "coinm" ? "/dapi/v1/income" : "/fapi/v1/income";
  const tradesPath = market === "coinm" ? "/dapi/v1/userTrades" : "/fapi/v1/userTrades";

  const income = await signedGet(
    market, incomePath,
    { incomeType: "REALIZED_PNL", startTime: sinceMs, limit: 1000 },
    apiKey, secret,
  );
  if (!Array.isArray(income) || !income.length) return [];

  const pnlByTradeId = {};
  const symbols = new Set();
  for (const i of income) {
    if (i.tradeId) pnlByTradeId[i.tradeId] = Number(i.income);
    if (i.symbol) symbols.add(i.symbol);
  }

  const out = [];
  for (const symbol of symbols) {
    try {
      const fills = await signedGet(
        market, tradesPath, { symbol, startTime: sinceMs, limit: 1000 }, apiKey, secret,
      );
      if (Array.isArray(fills) && fills.length) {
        out.push(...matchFills(market, symbol, fills, pnlByTradeId));
      }
    } catch (e) {
      // one symbol failing shouldn't abort the whole sync
      console.warn(`Binance ${market} ${symbol} fills failed:`, e?.response?.data?.msg || e.message);
    }
  }
  return out;
}

/* Spot: no cross-symbol endpoint — derive candidate <asset>USDT pairs from the
   account's non-zero balances, then match each pair's fills. Best-effort. */
async function syncSpot(apiKey, secret, sinceMs) {
  const account = await signedGet("spot", "/api/v3/account", {}, apiKey, secret);
  const balances = (account?.balances || []).filter(
    (b) => Number(b.free) + Number(b.locked) > 0 && b.asset !== "USDT",
  );
  const quotes = ["USDT", "BUSD", "FDUSD"];
  const symbols = new Set();
  for (const b of balances) for (const q of quotes) symbols.add(`${b.asset}${q}`);

  const out = [];
  let calls = 0;
  for (const symbol of symbols) {
    if (calls >= 30) break; // rate-limit safety
    calls++;
    try {
      const fills = await signedGet(
        "spot", "/api/v3/myTrades", { symbol, startTime: sinceMs, limit: 1000 }, apiKey, secret,
      );
      if (Array.isArray(fills) && fills.length) {
        // normalize spot fill shape → { orderId, side, qty, price, time, commission, id }
        const norm = fills.map((f) => ({
          orderId: f.orderId,
          side: f.isBuyer ? "BUY" : "SELL",
          qty: f.qty,
          price: f.price,
          time: f.time,
          commission: f.commission,
          id: f.id,
        }));
        out.push(...matchFills("spot", symbol, norm, null));
      }
    } catch (e) {
      // invalid symbol pairs 400 — ignore quietly
    }
  }
  return out;
}

/**
 * Fetch normalized closed trades from Binance.
 * @param {{apiKey, secret, markets:string[], sinceMs:number}} opts
 * markets ⊆ ["spot","usdm","coinm"]
 */
async function fetchBinanceTrades({ apiKey, secret, markets, sinceMs }) {
  const wanted = markets && markets.length ? markets : ["usdm"];
  const results = [];
  for (const m of wanted) {
    try {
      if (m === "usdm" || m === "coinm") results.push(...(await syncFutures(m, apiKey, secret, sinceMs)));
      else if (m === "spot") results.push(...(await syncSpot(apiKey, secret, sinceMs)));
    } catch (e) {
      const msg = e?.response?.data?.msg || e.message;
      // surface auth errors so the caller can show a clear message
      if (e?.response?.status === 401 || /API-key|signature|permission/i.test(msg || "")) {
        const err = new Error(msg || "Invalid Binance API credentials");
        err.code = "AUTH";
        throw err;
      }
      console.warn(`Binance ${m} sync failed:`, msg);
    }
  }
  return results;
}

/** Lightweight credential check (signed account ping on the first wanted market). */
async function verifyBinance({ apiKey, secret, markets }) {
  const m = (markets && markets[0]) || "usdm";
  try {
    if (m === "spot") await signedGet("spot", "/api/v3/account", {}, apiKey, secret);
    else if (m === "coinm") await signedGet("coinm", "/dapi/v1/balance", {}, apiKey, secret);
    else await signedGet("usdm", "/fapi/v2/balance", {}, apiKey, secret);
    return true;
  } catch (e) {
    const err = new Error(e?.response?.data?.msg || "Invalid Binance API credentials");
    err.code = "AUTH";
    throw err;
  }
}

module.exports = { fetchBinanceTrades, verifyBinance };
