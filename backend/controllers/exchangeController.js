"use strict";

/* Exchange integrations (Binance, Bybit) — Pro-only.
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
};

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
    if (!markets.length) markets = [cfg.markets[1] || cfg.markets[0]];
    const windowDays = ALLOWED_WINDOWS.includes(Number(req.body.window)) ? Number(req.body.window) : 90;

    if (!apiKey || !secret)
      return res.status(400).json({ message: "API key and secret are required" });

    // verify credentials
    try {
      await cfg.verify({ apiKey, secret, markets });
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
    };
    // successful connect resets the rate window
    user.integrationRate = { count: 0, windowStart: new Date() };
    await user.save();

    // preview (fetch only, no insert)
    const sinceMs = Date.now() - windowDays * 864e5;
    let preview = [];
    try {
      preview = await cfg.fetch({ apiKey, secret, markets, sinceMs });
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

/* ---- POST /exchange/:id/sync ---- */
exports.syncExchange = async (req, res) => {
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

    const conn = user.integrations?.[id];
    if (!conn?.connected)
      return res.status(400).json({ code: "NOT_CONNECTED", message: "Exchange not connected" });

    const apiKey = decrypt(conn.apiKeyEnc);
    const secret = decrypt(conn.apiSecretEnc);
    if (!apiKey || !secret)
      return res.status(400).json({ code: "NOT_CONNECTED", message: "Stored keys unreadable, reconnect" });

    const accountId = await resolveAccountId(req, userId);
    if (!accountId) return res.status(400).json({ message: "No journal found to import into" });

    // sync from a little before the last sync (overlap is fine — dedup handles it)
    const winMs = (conn.window || 90) * 864e5;
    const lastMs = conn.lastSyncAt ? new Date(conn.lastSyncAt).getTime() - 6 * 36e5 : 0;
    const sinceMs = Math.max(Date.now() - winMs, lastMs || Date.now() - winMs);

    let fetched = [];
    try {
      fetched = await cfg.fetch({ apiKey, secret, markets: conn.markets, sinceMs });
    } catch (e) {
      if (e.code === "AUTH")
        return res.status(400).json({ code: "AUTH", message: e.message || "Credentials rejected, reconnect" });
      throw e;
    }

    let imported = 0;
    let skipped = 0;
    for (const t of fetched) {
      if (!t.externalId) { skipped++; continue; }
      const doc = toTradeDoc(t, userId, accountId, id);
      try {
        await Trade.updateOne(
          { userId, accountId, externalId: t.externalId },
          { $setOnInsert: doc },
          { upsert: true },
        ).then((r) => {
          if (r.upsertedCount) imported++;
          else skipped++;
        });
      } catch (e) {
        // duplicate key (race) → treat as skipped
        if (e.code === 11000) skipped++;
        else throw e;
      }
    }

    conn.lastSyncAt = new Date();
    user.markModified("integrations");
    await user.save();

    res.json({ success: true, imported, skipped, total: fetched.length, lastSyncAt: conn.lastSyncAt });
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
