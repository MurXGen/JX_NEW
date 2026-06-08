const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");

const Trade = require("../models/Trade");
const User = require("../models/User");
const Account = require("../models/Account");

/* ======================================================
   TRADINGVIEW — issue/fetch a per-user webhook token
   (called from Settings to set up the Pine indicator)
====================================================== */
router.get("/tradingview/token", async (req, res) => {
  try {
    const userId = req.cookies.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.tvWebhookToken) {
      user.tvWebhookToken = crypto.randomBytes(24).toString("hex");
      await user.save();
    }
    const base = process.env.PUBLIC_API_URL || "https://api.journalx.com";
    res.json({
      token: user.tvWebhookToken,
      webhookUrl: `${base}/api/integrations/tradingview`,
    });
  } catch (err) {
    console.error("TV token error:", err);
    res.status(500).json({ message: "Could not issue token" });
  }
});

router.post("/tradingview/token/rotate", async (req, res) => {
  try {
    const userId = req.cookies.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.tvWebhookToken = crypto.randomBytes(24).toString("hex");
    await user.save();
    res.json({ token: user.tvWebhookToken });
  } catch (err) {
    res.status(500).json({ message: "Could not rotate token" });
  }
});

/* ======================================================
   TRADINGVIEW WEBHOOK — ingest a marked trade from the
   Pine "Trade Marker" alert. Auth is the per-user token
   inside the JSON body (TradingView can't send cookies).
====================================================== */
router.post(
  "/tradingview",
  express.json({ type: () => true, limit: "64kb" }), // TV may send text/plain
  async (req, res) => {
    try {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
      }

      const token = body?.token;
      if (!token) return res.status(400).json({ message: "Missing token" });

      const user = await User.findOne({ tvWebhookToken: token });
      if (!user) return res.status(401).json({ message: "Invalid token" });

      // pick the user's default / most-recent account
      const account =
        (await Account.findOne({ userId: user._id }).sort({ updatedAt: -1 })) || null;
      if (!account) {
        return res.status(400).json({ message: "No journal found for user" });
      }

      const entryPrice = Number(body.entryPrice) || 0;
      const exitPrice = Number(body.exitPrice) || 0;
      const assetQty = Number(body.assetQty) || Number(body.size) || 0;
      const direction = body.direction === "short" ? "short" : "long";
      const lev = Number(body.leverage) || 1;
      const notional = entryPrice * assetQty;
      const pnl =
        body.pnl != null
          ? Number(body.pnl)
          : (exitPrice - entryPrice) * assetQty * (direction === "long" ? 1 : -1);

      // TradingView times are unix ms strings
      const toDate = (v) => {
        const n = Number(v);
        return n > 0 ? new Date(n) : null;
      };
      const openTime = toDate(body.entryTime) || new Date();
      const closeTime = toDate(body.exitTime) || new Date();

      const stop = Number(body.stopPrice) || 0;
      const tp = Number(body.takeProfit) || 0;
      const plannedRR =
        stop > 0 && tp > 0 && Math.abs(entryPrice - stop) > 0
          ? Math.abs(tp - entryPrice) / Math.abs(entryPrice - stop)
          : null;

      const trade = await new Trade({
        userId: user._id,
        accountId: account._id,
        symbol: body.symbol || "—",
        direction,
        quantityUSD: lev > 0 ? notional / lev : notional,
        leverage: lev,
        totalQuantity: assetQty,
        sizeUnit: body.sizeUnit === "usd" ? "usd" : "asset",
        tradeStatus: "closed",
        source: "tradingview",
        entries: entryPrice ? [{ price: entryPrice, allocation: 100, quantity: assetQty }] : [],
        exits: exitPrice ? [{ mode: "price", price: exitPrice, allocation: 100, quantity: assetQty }] : [],
        sls: stop ? [{ mode: "price", price: stop, allocation: 100 }] : [],
        tps: tp ? [{ mode: "price", price: tp, allocation: 100 }] : [],
        avgEntryPrice: entryPrice,
        avgExitPrice: exitPrice,
        avgSLPrice: stop,
        avgTPPrice: tp,
        rr: plannedRR ? `1:${plannedRR.toFixed(1)}` : "",
        pnl,
        pnlAfterFee: pnl,
        openTime,
        closeTime,
        duration: Math.max(0, (closeTime - openTime) / 36e5),
        strategy: body.strategy || "",
        timeframe: body.timeframe || "",
        learnings: body.note || "",
        // chart-marker metadata so the details page can redraw it
        tvChart: {
          symbol: body.symbol || "",
          exchange: body.exchange || "",
          timeframe: body.timeframe || "",
          entryTime: openTime,
          exitTime: closeTime,
          entryPrice,
          exitPrice,
          stopPrice: stop,
          takeProfit: tp,
        },
      }).save();

      // award XP (risk set on most chart-marked trades)
      let xp = 10;
      if (stop > 0 && tp > 0) xp += 20;
      if (body.strategy) xp += 10;
      if (body.note) xp += 10;
      try { await Account.findByIdAndUpdate(account._id, { $inc: { xp, xpTrades: 1 } }); } catch {}

      res.status(201).json({ success: true, tradeId: trade._id });
    } catch (err) {
      console.error("TradingView webhook error:", err);
      res.status(500).json({ message: "Failed to ingest trade" });
    }
  },
);

/* ======================================
   BINANCE PREVIEW TRADES (LAST 3 MONTHS)
====================================== */
router.post("/binance/preview", async (req, res) => {
  const { apiKey, secretKey } = req.body;

  if (!apiKey || !secretKey) {
    return res.status(400).json({
      message: "API key and Secret key are required",
    });
  }

  try {
    const headers = { "X-MBX-APIKEY": apiKey };
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    /* =============================
       1️⃣ FETCH USER FILLS
    ============================= */

    const tradeTimestamp = Date.now();
    const tradeQuery = `startTime=${sevenDaysAgo}&timestamp=${tradeTimestamp}`;

    const tradeSignature = crypto
      .createHmac("sha256", secretKey)
      .update(tradeQuery)
      .digest("hex");

    const tradeURL = `https://fapi.binance.com/fapi/v1/userTrades?${tradeQuery}&signature=${tradeSignature}`;

    const tradeRes = await axios.get(tradeURL, { headers });
    const fills = tradeRes.data || [];

    /* =============================
       2️⃣ FETCH REALIZED PNL
    ============================= */

    const incomeTimestamp = Date.now();
    const incomeQuery = `incomeType=REALIZED_PNL&startTime=${sevenDaysAgo}&timestamp=${incomeTimestamp}`;

    const incomeSignature = crypto
      .createHmac("sha256", secretKey)
      .update(incomeQuery)
      .digest("hex");

    const incomeURL = `https://fapi.binance.com/fapi/v1/income?${incomeQuery}&signature=${incomeSignature}`;

    const incomeRes = await axios.get(incomeURL, { headers });

    // Map PnL by trade ID
    const pnlByTradeId = {};
    incomeRes.data.forEach((i) => {
      if (i.tradeId) {
        pnlByTradeId[i.tradeId] = Number(i.income);
      }
    });

    /* =============================
       3️⃣ GROUP FILLS BY ORDER ID
       Each order (even with partial fills) should be tracked together
    ============================= */

    // First, group fills by orderId to track partial fills
    const ordersByOrderId = {};

    fills.forEach((fill) => {
      const orderId = fill.orderId;

      if (!ordersByOrderId[orderId]) {
        ordersByOrderId[orderId] = {
          orderId,
          symbol: fill.symbol,
          side: fill.side,
          fills: [],
          totalQty: 0,
          totalValue: 0,
          avgPrice: 0,
          fees: 0,
          firstFillTime: fill.time,
          lastFillTime: fill.time,
          tradeIds: [],
        };
      }

      const order = ordersByOrderId[orderId];
      const qty = Number(fill.qty);
      const price = Number(fill.price);
      const value = qty * price;

      order.fills.push(fill);
      order.totalQty += qty;
      order.totalValue += value;
      order.fees += Number(fill.commission || 0);
      order.lastFillTime = Math.max(order.lastFillTime, fill.time);
      order.tradeIds.push(fill.id);

      // Recalculate average price
      order.avgPrice = order.totalValue / order.totalQty;
    });

    /* =============================
       4️⃣ MATCH BUY AND SELL ORDERS TO CREATE TRADES
    ============================= */

    const trades = [];
    const processedOrders = new Set();

    // Separate orders by symbol
    const ordersBySymbol = {};

    Object.values(ordersByOrderId).forEach((order) => {
      if (!ordersBySymbol[order.symbol]) {
        ordersBySymbol[order.symbol] = [];
      }
      ordersBySymbol[order.symbol].push(order);
    });

    // For each symbol, match buy and sell orders
    Object.keys(ordersBySymbol).forEach((symbol) => {
      const symbolOrders = ordersBySymbol[symbol];

      // Separate into buy and sell orders
      const buyOrders = symbolOrders
        .filter((o) => o.side === "BUY")
        .sort((a, b) => a.firstFillTime - b.firstFillTime);

      const sellOrders = symbolOrders
        .filter((o) => o.side === "SELL")
        .sort((a, b) => a.firstFillTime - b.firstFillTime);

      // Match orders FIFO style
      let buyIndex = 0;
      let sellIndex = 0;

      while (buyIndex < buyOrders.length && sellIndex < sellOrders.length) {
        const buyOrder = buyOrders[buyIndex];
        const sellOrder = sellOrders[sellIndex];

        // Determine which order happened first to set direction
        const isLong = buyOrder.firstFillTime < sellOrder.firstFillTime;

        // Calculate matched quantity (minimum of remaining quantities)
        const buyQty = buyOrder.totalQty;
        const sellQty = sellOrder.totalQty;
        const matchedQty = Math.min(buyQty, sellQty);

        // Calculate proportional values
        const buyValue = (matchedQty / buyQty) * buyOrder.totalValue;
        const sellValue = (matchedQty / sellQty) * sellOrder.totalValue;

        // Calculate average prices for this matched portion
        const avgEntryPrice = buyValue / matchedQty;
        const avgExitPrice = sellValue / matchedQty;

        // Calculate fees proportionally
        const buyFees = (matchedQty / buyQty) * buyOrder.fees;
        const sellFees = (matchedQty / sellQty) * sellOrder.fees;
        const totalFees = buyFees + sellFees;

        // Calculate PnL from matched trade IDs
        let totalPnl = 0;
        buyOrder.tradeIds.forEach((tradeId) => {
          if (pnlByTradeId[tradeId]) {
            totalPnl += pnlByTradeId[tradeId] * (matchedQty / buyQty);
          }
        });
        sellOrder.tradeIds.forEach((tradeId) => {
          if (pnlByTradeId[tradeId]) {
            totalPnl += pnlByTradeId[tradeId] * (matchedQty / sellQty);
          }
        });

        // If no PnL from trade IDs, calculate from price difference
        if (totalPnl === 0) {
          const priceDiff = isLong
            ? avgExitPrice - avgEntryPrice
            : avgEntryPrice - avgExitPrice;
          totalPnl = priceDiff * matchedQty;
        }

        // Calculate position size (in quote currency)
        const positionSize = isLong ? buyValue : sellValue;

        // Calculate duration
        const openTime = isLong
          ? buyOrder.firstFillTime
          : sellOrder.firstFillTime;
        const closeTime = isLong
          ? sellOrder.lastFillTime
          : buyOrder.lastFillTime;
        const durationMs = closeTime - openTime;
        const durationMin = Math.round(durationMs / 60000);

        // Create trade
        trades.push({
          symbol,
          side: isLong ? "LONG" : "SHORT",
          size: Number(positionSize.toFixed(2)),
          entry: Number(avgEntryPrice.toFixed(4)),
          exit: Number(avgExitPrice.toFixed(4)),
          leverage: "-",
          pnl: Number(totalPnl.toFixed(4)),
          fees: Number(totalFees.toFixed(4)),
          roi: Number(((totalPnl / positionSize) * 100).toFixed(2)),
          duration: `${durationMin}m`,
          openTime: new Date(openTime),
          closeTime: new Date(closeTime),
          status: "CLOSED",
          fillDetails: {
            buyFills: buyOrder.fills.length,
            sellFills: sellOrder.fills.length,
            totalFills: buyOrder.fills.length + sellOrder.fills.length,
          },
        });

        // Reduce quantities
        buyOrder.totalQty -= matchedQty;
        buyOrder.totalValue =
          (buyOrder.totalQty / buyQty) * buyOrder.totalValue;
        sellOrder.totalQty -= matchedQty;
        sellOrder.totalValue =
          (sellOrder.totalQty / sellQty) * sellOrder.totalValue;

        // Move to next order if current is fully matched
        if (buyOrder.totalQty < 0.000001) buyIndex++;
        if (sellOrder.totalQty < 0.000001) sellIndex++;
      }
    });

    /* =============================
       5️⃣ OPEN POSITIONS
    ============================= */

    const posTimestamp = Date.now();
    const posQuery = `timestamp=${posTimestamp}`;

    const posSignature = crypto
      .createHmac("sha256", secretKey)
      .update(posQuery)
      .digest("hex");

    const posURL = `https://fapi.binance.com/fapi/v2/positionRisk?${posQuery}&signature=${posSignature}`;

    const posRes = await axios.get(posURL, { headers });

    const openTrades = posRes.data
      .filter((p) => Number(p.positionAmt) !== 0)
      .map((p) => {
        const size = Math.abs(Number(p.positionAmt)) * Number(p.entryPrice);

        return {
          symbol: p.symbol,
          side: Number(p.positionAmt) > 0 ? "LONG" : "SHORT",
          size: Number(size.toFixed(2)),
          entry: Number(p.entryPrice),
          exit: null,
          leverage: Number(p.leverage),
          pnl: null,
          unrealizedPnl: Number(p.unRealizedProfit),
          fees: null,
          roi: null,
          duration: null,
          openTime: null,
          closeTime: null,
          status: "OPEN",
        };
      });

    /* =============================
       FINAL RESULT
    ============================= */

    const allTrades = [...trades, ...openTrades];

    res.json({
      totalTrades: allTrades.length,
      trades: allTrades,
    });
  } catch (error) {
    console.error("Binance preview error:", error?.response?.data || error);

    res.status(500).json({
      message: "Failed to fetch Binance trades",
    });
  }
});

/* ======================================
   IMPORT TRADES INTO JOURNALX
====================================== */

router.post("/binance/import", async (req, res) => {
  try {
    const { trades } = req.body;

    if (!trades || !trades.length) {
      return res.status(400).json({
        message: "No trades provided for import",
      });
    }

    /* =============================
       GET USER + ACCOUNT FROM COOKIE
    ============================= */

    const userId = req.cookies.userId;
    const accountId = req.cookies.accountId;

    if (!userId || !accountId) {
      return res.status(401).json({
        message: "User or Account not found",
      });
    }

    /* =============================
       FORMAT TRADES
    ============================= */

    const formattedTrades = trades.map((t) => {
      const direction = t.side === "LONG" ? "long" : "short";

      const quantityUSD = Number(t.size) || 0;
      const leverage =
        typeof t.leverage === "number" && !isNaN(t.leverage) ? t.leverage : 1;
      const totalQuantity = quantityUSD * leverage;

      return {
        userId,
        accountId,
        symbol: t.symbol,
        direction,
        quantityUSD,
        leverage,
        totalQuantity,
        tradeStatus: t.status === "OPEN" ? "running" : "closed",

        entries: [
          {
            price: Number(t.entry || 0),
            allocation: 100,
            quantity: totalQuantity,
          },
        ],

        exits:
          t.exit !== null
            ? [
                {
                  mode: "price",
                  price: Number(t.exit),
                  allocation: 100,
                  quantity: totalQuantity,
                },
              ]
            : [],

        feeAmount: Number(t.fees || 0),
        pnl: Number(t.pnl || t.unrealizedPnl || 0),
        pnlAfterFee:
          Number(t.pnl || t.unrealizedPnl || 0) - Number(t.fees || 0),

        avgEntryPrice: Number(t.entry || 0),
        avgExitPrice: Number(t.exit || 0),

        openTime: t.openTime ? new Date(t.openTime) : new Date(),
        closeTime: t.closeTime ? new Date(t.closeTime) : null,
      };
    });

    /* =============================
       REMOVE DUPLICATE IMPORTS
    ============================= */

    await Trade.deleteMany({
      userId,
      accountId,
      symbol: { $in: trades.map((t) => t.symbol) },
      openTime: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    });

    /* =============================
       INSERT NEW TRADES
    ============================= */

    const inserted = await Trade.insertMany(formattedTrades, {
      ordered: false,
    });

    res.json({
      imported: inserted.length,
      message: "Trades imported successfully",
    });
  } catch (error) {
    console.error("Binance import error:", error);

    res.status(500).json({
      message: "Trade import failed",
    });
  }
});

module.exports = router;
