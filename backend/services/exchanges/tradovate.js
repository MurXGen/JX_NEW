"use strict";

/* Tradovate (futures) trade sync — read-only REST.

   Auth: Tradovate needs the user's login (username + password) AND an API key
   (cid = key ID, sec = secret) from Application Settings → API Access.
   POST /auth/accesstokenrequest returns a 90-minute token. Each new token opens
   a new Tradovate session and only 2 are allowed at once (a 3rd kicks the
   oldest — possibly the user's own platform), so we cache the token in the
   connection `state` and RENEW it instead of logging in again whenever we can.

   History: Tradovate's REST lists (/fill/list, /fillPair/list) only return the
   CURRENT trading session, so this is a "collect as you go" sync: the backend
   job polls connected users regularly and dedupes by externalId. Older history
   comes in via CSV import.

   Trades: each fill pair = one matched buy/sell lot. Pairs that share the same
   CLOSING fill are merged into one trade (scale-ins → weighted average entry).
   P&L = price diff × qty × product.valuePerPoint (USD for CME products). */

const axios = require("axios");
const crypto = require("crypto");

const HOSTS = {
  live: "https://live.tradovateapi.com/v1",
  demo: "https://demo.tradovateapi.com/v1",
};
const APP_ID = "JournalX";
const APP_VERSION = "1.0";
const RENEW_BEFORE_MS = 15 * 60e3;

const authError = (msg) => Object.assign(new Error(msg), { code: "AUTH" });

function baseUrl(env) {
  return HOSTS[env] || HOSTS.live;
}

async function api(env, token, path) {
  try {
    const res = await axios.get(`${baseUrl(env)}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      timeout: 20000,
    });
    return res.data;
  } catch (e) {
    const s = e?.response?.status;
    if (s === 401) throw authError("Tradovate session expired, reconnect Tradovate");
    if (s === 429) throw Object.assign(new Error("Tradovate is rate-limiting requests, try again in a few minutes"), { code: "RATE" });
    throw e;
  }
}

/* Fresh login. Never retries on bad credentials (Tradovate escalates repeated
   failures to a captcha lock-out that third-party apps can't solve). */
async function login({ env, cid, sec, username, password, deviceId }, ticket) {
  const body = {
    name: username,
    password,
    appId: APP_ID,
    appVersion: APP_VERSION,
    deviceId,
    cid: /^\d+$/.test(String(cid)) ? Number(cid) : cid,
    sec,
  };
  if (ticket) body["p-ticket"] = ticket;
  let data;
  try {
    const res = await axios.post(`${baseUrl(env)}/auth/accesstokenrequest`, body, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      timeout: 20000,
    });
    data = res.data || {};
  } catch (e) {
    const msg = e?.response?.data?.errorText || e.message;
    throw authError(msg || "Could not sign in to Tradovate");
  }

  if (data["p-ticket"]) {
    const wait = Number(data["p-time"]) || 0;
    // one short, polite retry if Tradovate only asks for a brief pause
    if (!data["p-captcha"] && !ticket && wait > 0 && wait <= 10) {
      await new Promise((r) => setTimeout(r, wait * 1000));
      return login({ env, cid, sec, username, password, deviceId }, data["p-ticket"]);
    }
    throw authError(
      data["p-captcha"]
        ? "Tradovate has temporarily blocked sign-ins for this login. Wait an hour, then try again."
        : `Tradovate asked us to wait ${wait || "a few"} seconds. Try again shortly.`,
    );
  }
  if (data.errorText || !data.accessToken) {
    throw authError(data.errorText || "Tradovate rejected these credentials");
  }
  return {
    token: data.accessToken,
    expiresAt: new Date(data.expirationTime || Date.now() + 80 * 60e3).getTime(),
  };
}

async function renew(env, token) {
  const res = await axios.get(`${baseUrl(env)}/auth/renewaccesstoken`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    timeout: 20000,
  });
  const d = res.data || {};
  if (d.errorText || !d.accessToken) throw new Error(d.errorText || "renew failed");
  return {
    token: d.accessToken,
    expiresAt: new Date(d.expirationTime || Date.now() + 80 * 60e3).getTime(),
  };
}

/* Get a usable token, preferring the cached one (renewed when close to expiry).
   `state` is a plain object persisted (encrypted) by the controller; we set
   state.changed = true whenever it should be saved. */
async function getToken({ env, apiKey, secret, extra = {}, state = {} }) {
  if (!state.deviceId) {
    state.deviceId = crypto.randomUUID();
    state.changed = true;
  }
  const now = Date.now();
  if (state.token && state.env === env && state.expiresAt > now + 60e3) {
    if (state.expiresAt - now > RENEW_BEFORE_MS) return state.token;
    try {
      const r = await renew(env, state.token);
      Object.assign(state, r, { changed: true });
      return r.token;
    } catch {
      /* fall through to a fresh login */
    }
  }
  if (!extra.username || !extra.password) throw authError("Tradovate username and password are required");
  const r = await login({
    env, cid: apiKey, sec: secret, username: extra.username, password: extra.password, deviceId: state.deviceId,
  });
  Object.assign(state, r, { env, changed: true });
  return r.token;
}

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};
async function itemsById(env, token, entity, ids) {
  const map = new Map();
  const uniq = [...new Set(ids.filter((x) => x != null))];
  for (const part of chunk(uniq, 100)) {
    const rows = await api(env, token, `/${entity}/items?ids=${part.join(",")}`);
    for (const r of rows || []) map.set(r.id, r);
  }
  return map;
}

const feeOf = (f) =>
  ["commission", "clearingFee", "exchangeFee", "nfaFee", "brokerageFee", "ipFee", "orderRoutingFee"]
    .reduce((a, k) => a + (Number(f?.[k]) || 0), 0);

/* Pure transform (exported for tests): fill pairs + lookups → JournalX trades. */
function buildTrades({ env, pairs, fills, fees, contracts, maturities, products, positions, accounts, sinceMs = 0 }) {
  const fillById = new Map(fills.map((f) => [f.id, f]));
  const feeById = new Map((fees || []).map((f) => [f.id, f]));
  const posById = new Map((positions || []).map((p) => [p.id, p]));
  const acctById = new Map((accounts || []).map((a) => [a.id, a]));

  // group pairs by the fill that CLOSED the position
  const groups = new Map();
  for (const p of pairs) {
    const buy = fillById.get(p.buyFillId);
    const sell = fillById.get(p.sellFillId);
    if (!buy || !sell) continue;
    const buyT = new Date(buy.timestamp).getTime();
    const sellT = new Date(sell.timestamp).getTime();
    const isLong = buyT <= sellT;
    const open = isLong ? buy : sell;
    const close = isLong ? sell : buy;
    const key = `${close.id}`;
    if (!groups.has(key)) groups.set(key, { isLong, close, opens: [], pairs: [] });
    const g = groups.get(key);
    g.opens.push(open);
    g.pairs.push(p);
  }

  const out = [];
  for (const g of groups.values()) {
    const closeMs = new Date(g.close.timestamp).getTime();
    if (closeMs < sinceMs) continue;
    const contract = contracts.get(g.close.contractId) || {};
    const maturity = maturities.get(contract.contractMaturityId) || {};
    const product = products.get(maturity.productId) || {};
    const vpp = Number(product.valuePerPoint) || 1;

    let qty = 0, entryVal = 0, exitVal = 0, feesTotal = 0;
    for (const p of g.pairs) {
      const q = Number(p.qty) || 0;
      qty += q;
      entryVal += (g.isLong ? Number(p.buyPrice) : Number(p.sellPrice)) * q;
      exitVal += (g.isLong ? Number(p.sellPrice) : Number(p.buyPrice)) * q;
      // fees are per fill → charge each fill its share for the qty in this pair
      for (const fid of [p.buyFillId, p.sellFillId]) {
        const f = fillById.get(fid);
        const fee = feeOf(feeById.get(fid));
        if (f && fee) feesTotal += fee * (q / (Number(f.qty) || q));
      }
    }
    if (!qty) continue;
    const entry = entryVal / qty;
    const exit = exitVal / qty;
    const gross = (g.isLong ? exit - entry : entry - exit) * qty * vpp;
    const openMs = Math.min(...g.opens.map((f) => new Date(f.timestamp).getTime()));
    const pos = posById.get(g.pairs[0].positionId);
    const acct = pos ? acctById.get(pos.accountId) : null;

    out.push({
      externalId: `tradovate:${env}:${g.close.id}`,
      market: acct?.name ? `${env} · ${acct.name}` : env,
      symbol: contract.name || product.name || `contract ${g.close.contractId}`,
      direction: g.isLong ? "long" : "short",
      entry: Number(entry.toFixed(6)),
      exit: Number(exit.toFixed(6)),
      qty,
      quantityUSD: Number((entry * qty * vpp).toFixed(2)), // contract notional
      leverage: 1,
      pnl: Number((gross - feesTotal).toFixed(2)),
      fees: Number(feesTotal.toFixed(2)),
      openTime: openMs,
      closeTime: closeMs,
    });
  }
  return out;
}

/**
 * @param {{apiKey, secret, markets:string[], sinceMs:number, extra:{username,password}, state:object}} opts
 * apiKey = Tradovate API key ID (cid), secret = API secret (sec), markets[0] = "live" | "demo".
 */
async function fetchTradovateTrades({ apiKey, secret, markets, sinceMs = 0, extra, state = {} }) {
  const env = markets?.[0] === "demo" ? "demo" : "live";
  const token = await getToken({ env, apiKey, secret, extra, state });

  const [pairs, fills, positions, accounts] = await Promise.all([
    api(env, token, "/fillPair/list"),
    api(env, token, "/fill/list"),
    api(env, token, "/position/list"),
    api(env, token, "/account/list"),
  ]);
  if (!pairs?.length) return [];

  let fees = [];
  try { fees = await api(env, token, "/fillFee/list"); } catch { fees = []; }

  const contracts = await itemsById(env, token, "contract", fills.map((f) => f.contractId));
  const maturities = await itemsById(env, token, "contractMaturity", [...contracts.values()].map((c) => c.contractMaturityId));
  const products = await itemsById(env, token, "product", [...maturities.values()].map((m) => m.productId));

  return buildTrades({ env, pairs, fills, fees, contracts, maturities, products, positions, accounts, sinceMs });
}

async function verifyTradovate({ apiKey, secret, markets, extra, state = {} }) {
  const env = markets?.[0] === "demo" ? "demo" : "live";
  const token = await getToken({ env, apiKey, secret, extra, state });
  const accounts = await api(env, token, "/account/list");
  if (!Array.isArray(accounts) || !accounts.length)
    throw authError(`No ${env} Tradovate accounts found for this login`);
  return true;
}

module.exports = { fetchTradovateTrades, verifyTradovate, buildTrades };
