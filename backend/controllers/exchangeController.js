"use strict";

/* Exchange integrations (Binance, Bybit, Tradovate) — Pro-only.
   connect  → verify keys, store encrypted, return a preview (no insert)
   sync     → fetch since last sync, dedupe by externalId, insert
   disconnect → wipe stored keys/state (full reset)
   status   → connection + last-sync info for the UI */

const User = require("../models/User");
const Trade = require("../models/Trade");
const Account = require("../models/Account");
const { encrypt, decrypt, keyHint } = require("../utils/vault");
const { fetchBinanceTrades, verifyBinance } = require("../services/exchanges/binance");
const { fetchBybitTrades, verifyBybit } = require("../services/exchanges/bybit");
const { fetchTradovateTrades, verifyTradovate } = require("../services/exchanges/tradovate");

const EXCHANGES = {
  binance: {
    markets: ["spot", "usdm", "coinm"],
    verify: verifyBinance,
    fetch: fetchBinanceTrades,
  },
  bybit: {
    markets: ["spot", "linear", "inverse"],
    verify: verifyBybit,
    fetch: fetchBybitTrades,
  },
  // Tradovate: apiKey = API key ID (cid), secret = API secret (sec), plus the
  // Tradovate login. "markets" = environment (live | demo), single choice.
  tradovate: {
    markets: ["live", "demo"],
    single: true,
    extraFields: ["username", "password"],
    verify: verifyTradovate,
    fetch: fetchTradovateTrades,
  },
};

/* Encrypted JSON blobs for per-exchange extras (logins) and adapter state
   (e.g. a cached Tradovate session token). */
const encJson = (o) => encrypt(JSON.stringify(o || {}));
const decJson = (s) => {
  try { return JSON.parse(decrypt(s) || "{}"); } catch { return {}; }
};
function persistState(conn, state) {
  if (!state?.changed) return false;
  const { changed, ...rest } = state;
  conn.stateEnc = encJson(rest);
  state.changed = false;
  return true;
}

const ALLOWED_WINDOWS = [7, 90, 120];
const RATE_MAX = 5;                 // connect attempts…
const RATE_WINDOW_MS = 60 * 60e3;   // …per hour

const isPro = (u) =>
  ["pro", "lifetime"].includes(u?.subscriptionPlan) &&
  ["active", "none"].includes(u?.subscriptionStatus || "active") &&
  (!u?.subscriptionExpiresAt || new Date(u.subscriptionExpiresAt) > new Date());

/* sliding-window rate limit; returns minutes-until-reset if blocked, else null */
function rateBlockedMinutes(user) {
  const now = Date.now();
  const r = user.integrationRate || {};
  const start = r.windowStart ? new Date(r.windowStart).getTime() : 0;
  if (!start || now - start > RATE_WINDOW_MS) {
    user.integrationRate = { count: 1, windowStart: new Date() };
    return null;
  }
  if ((r.count || 0) >= RATE_MAX) {
    return Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - start)) / 60000));
  }
  user.integrationRate = { count: (r.count || 0) + 1, windowStart: r.windowStart };
  return null;
}

async function resolveAccountId(req, userId) {
  const cookieAcct = req.cookies?.accountId;
  if (cookieAcct) return cookieAcct;
  const acct = await Account.findOne({ userId }).sort({ updatedAt: -1 });
  return acct?._id || null;
}

function toTradeDoc(t, userId, accountId, exchange) {
  const openTime = t.openTime ? new Date(t.openTime) : new Date();
  const closeTime = t.closeTime ? new Date(t.closeTime) : openTime;
  return {
    userId,
    accountId,
    symbol: t.symbol || "—",
    direction: t.direction === "short" ? "short" : "long",
    quantityUSD: Number(t.quantityUSD) || 0,
    leverage: Number(t.leverage) || 1,
    totalQuantity: Number(t.qty) || 0,
    sizeUnit: "asset",
    tradeStatus: "closed",
    source: "auto",
    externalId: t.externalId,
    entries: t.entry ? [{ price: t.entry, allocation: 100, quantity: t.qty }] : [],
    exits: t.exit ? [{ mode: "price", price: t.exit, allocation: 100, quantity: t.qty }] : [],
    avgEntryPrice: Number(t.entry) || 0,
    avgExitPrice: Number(t.exit) || 0,
    feeAmount: Number(t.fees) || 0,
    pnl: Number(t.pnl) || 0,
    pnlAfterFee: Number(t.pnl) || 0,
    openTime,
    closeTime,
    duration: Math.max(0, (closeTime - openTime) / 36e5),
    timeframe: "",
    learnings: `Imported from ${exchange} (${t.market})`,
  };
}

/* ---- POST /exchange/:id/connect ---- */
exports.connectExchange = async (req, res) => {
  try {
    const id = String(req.params.id || "").toLowerCase();
    const cfg = EXCHANGES[id];
    if (!cfg) return res.status(400).json({ message: "Unsupported exchange" });

    const userId = req.cookies?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!isPro(user))
      return res.status(403).json({ code: "PRO_REQUIRED", message: "Exchange integrations are a Pro feature" });

    // rate limit connect attempts
    const blocked = rateBlockedMinutes(user);
    if (blocked) {
      await user.save();
      return res.status(429).json({
        code: "RATE_LIMIT",
        message: `Too many attempts. Try again in ${blocked} minute${blocked === 1 ? "" : "s"}.`,
      });
    }

    const apiKey = String(req.body.apiKey || "").trim();
    const secret = String(req.body.secret || req.body.secretKey || "").trim();
    let markets = Array.isArray(req.body.markets) ? req.body.markets : [];
    markets = markets.filter((m) => cfg.markets.includes(m));
    if (!markets.length) markets = [cfg.single ? cfg.markets[0] : cfg.markets[1] || cfg.markets[0]];
    if (cfg.single) markets = [markets[0]];
    const windowDays = ALLOWED_WINDOWS.includes(Number(req.body.window)) ? Number(req.body.window) : 90;

    if (!apiKey || !secret)
      return res.status(400).json({ message: "API key and secret are required" });

    const extra = {};
    for (const f of cfg.extraFields || []) {
      extra[f] = String(req.body[f] || "").trim();
      if (!extra[f]) return res.status(400).json({ message: `${f[0].toUpperCase()}${f.slice(1)} is required` });
    }
    const state = {};

    // verify credentials
    try {
      await cfg.verify({ apiKey, secret, markets, extra, state });
    } catch (e) {
      await user.save(); // persist the rate-limit increment
      return res.status(400).json({ code: "AUTH", message: e.message || "Invalid API credentials" });
    }

    // store encrypted
    user.integrations = user.integrations || {};
    user.integrations[id] = {
      connected: true,
      apiKeyEnc: encrypt(apiKey),
      apiSecretEnc: encrypt(secret),
      keyHint: keyHint(apiKey),
      markets,
      window: windowDays,
      connectedAt: new Date(),
      lastSyncAt: null,
      autoSync: true,
      ...(cfg.extraFields ? { extraEnc: encJson(extra) } : {}),
      accountId: (await resolveAccountId(req, userId)) || null,
    };
    persistState(user.integrations[id], state);
    user.markModified("integrations");
    // successful connect resets the rate window
    user.integrationRate = { count: 0, windowStart: new Date() };
    await user.save();

    // preview (fetch only, no insert)
    const sinceMs = Date.now() - windowDays * 864e5;
    let preview = [];
    try {
      preview = await cfg.fetch({ apiKey, secret, markets, sinceMs, extra, state });
      if (persistState(user.integrations[id], state)) {
        user.markModified("integrations");
        await user.save();
      }
    } catch (e) {
      if (e.code === "AUTH")
        return res.status(400).json({ code: "AUTH", message: e.message });
      console.warn(`${id} preview failed:`, e.message);
    }
    preview.sort((a, b) => (b.closeTime || 0) - (a.closeTime || 0));

    res.json({
      success: true,
      connected: true,
      keyHint: user.integrations[id].keyHint,
      markets,
      window: windowDays,
      preview: preview.slice(0, 200),
      totalPreview: preview.length,
    });
  } catch (err) {
    console.error("connectExchange error:", err);
    res.status(500).json({ message: "Could not connect exchange" });
  }
};

/* Core sync for one user + exchange. Used by the HTTP route and the background
   job. Returns { imported, skipped, total, lastSyncAt }; throws errors with
   .code = "NOT_CONNECTED" | "AUTH" | "NO_JOURNAL" for the caller to map. */
async function runSync(user, id, { accountId: preferAccountId } = {}) {
  const cfg = EXCHANGES[id];
  const conn = user.integrations?.[id];
  const fail = (code, message) => Object.assign(new Error(message), { code });
  if (!cfg) throw fail("UNSUPPORTED", "Unsupported exchange");
  if (!conn?.connected) throw fail("NOT_CONNECTED", "Exchange not connected");

  const apiKey = decrypt(conn.apiKeyEnc);
  const secret = decrypt(conn.apiSecretEnc);
  if (!apiKey || !secret) throw fail("NOT_CONNECTED", "Stored keys unreadable, reconnect");
  const extra = cfg.extraFields ? decJson(conn.extraEnc) : {};
  if (cfg.extraFields && cfg.extraFields.some((f) => !extra[f]))
    throw fail("NOT_CONNECTED", "Stored login unreadable, reconnect");
  const state = decJson(conn.stateEnc);

  const userId = user._id;
  let accountId = preferAccountId || conn.accountId;
  if (!accountId) {
    const acct = await Account.findOne({ userId }).sort({ updatedAt: -1 });
    accountId = acct?._id || null;
  }
  if (!accountId) throw fail("NO_JOURNAL", "No journal found to import into");

  // sync from a little before the last sync (overlap is fine — dedup handles it)
  const winMs = (conn.window || 90) * 864e5;
  const lastMs = conn.lastSyncAt ? new Date(conn.lastSyncAt).getTime() - 6 * 36e5 : 0;
  const sinceMs = Math.max(Date.now() - winMs, lastMs || Date.now() - winMs);

  let fetched;
  try {
    fetched = await cfg.fetch({ apiKey, secret, markets: conn.markets, sinceMs, extra, state });
  } finally {
    // keep a renewed/new session token even if the fetch itself failed
    if (persistState(conn, state)) user.markModified("integrations");
  }

  let imported = 0;
  let skipped = 0;
  for (const t of fetched) {
    if (!t.externalId) { skipped++; continue; }
    const doc = toTradeDoc(t, userId, accountId, id);
    try {
      const r = await Trade.updateOne(
        { userId, accountId, externalId: t.externalId },
        { $setOnInsert: doc },
        { upsert: true },
      );
      if (r.upsertedCount) imported++;
      else skipped++;
    } catch (e) {
      // duplicate key (race) → treat as skipped
      if (e.code === 11000) skipped++;
      else throw e;
    }
  }

  conn.lastSyncAt = new Date();
  user.markModified("integrations");
  await user.save();
  return { imported, skipped, total: fetched.length, lastSyncAt: conn.lastSyncAt };
}
exports.runSync = runSync;
exports.EXCHANGES = EXCHANGES;
exports.isPro = isPro;

/* ---- POST /exchange/:id/sync ---- */
exports.syncExchange = async (req, res) => {
  try {
    const id = String(req.params.id || "").toLowerCase();
    if (!EXCHANGES[id]) return res.status(400).json({ message: "Unsupported exchange" });

    const userId = req.cookies?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!isPro(user))
      return res.status(403).json({ code: "PRO_REQUIRED", message: "Exchange integrations are a Pro feature" });

    // the journal open in the browser wins; otherwise the one saved at connect
    const accountId = req.cookies?.accountId || null;
    try {
      const out = await runSync(user, id, { accountId });
      res.json({ success: true, ...out });
    } catch (e) {
      if (e.code === "NOT_CONNECTED" || e.code === "AUTH")
        return res.status(400).json({ code: e.code, message: e.message || "Credentials rejected, reconnect" });
      if (e.code === "NO_JOURNAL") return res.status(400).json({ message: e.message });
      if (e.code === "RATE") return res.status(429).json({ code: "RATE_LIMIT", message: e.message });
      throw e;
    }
  } catch (err) {
    console.error("syncExchange error:", err);
    res.status(500).json({ message: "Sync failed" });
  }
};

/* ---- POST /exchange/:id/disconnect ---- */
exports.disconnectExchange = async (req, res) => {
  try {
    const id = String(req.params.id || "").toLowerCase();
    if (!EXCHANGES[id]) return res.status(400).json({ message: "Unsupported exchange" });
    const userId = req.cookies?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.integrations = user.integrations || {};
    user.integrations[id] = {
      connected: false, apiKeyEnc: "", apiSecretEnc: "", keyHint: "",
      markets: [], window: 90, connectedAt: null, lastSyncAt: null, autoSync: true,
      extraEnc: "", stateEnc: "", accountId: null,
    };
    user.markModified("integrations");
    await user.save();
    res.json({ success: true, disconnected: true });
  } catch (err) {
    console.error("disconnectExchange error:", err);
    res.status(500).json({ message: "Could not disconnect" });
  }
};

/* ---- GET /exchange/status ---- */
exports.exchangeStatus = async (req, res) => {
  try {
    const userId = req.cookies?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const out = {};
    for (const id of Object.keys(EXCHANGES)) {
      const c = user.integrations?.[id] || {};
      out[id] = {
        connected: !!c.connected,
        keyHint: c.keyHint || "",
        markets: c.markets || [],
        window: c.window || 90,
        lastSyncAt: c.lastSyncAt || null,
        autoSync: c.autoSync !== false,
      };
    }
    res.json({ pro: isPro(user), exchanges: out });
  } catch (err) {
    console.error("exchangeStatus error:", err);
    res.status(500).json({ message: "Could not load status" });
  }
};
