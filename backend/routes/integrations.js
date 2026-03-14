const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");

const Trade = require("../models/Trade");

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

    const pnlMap = {};
    incomeRes.data.forEach((i) => {
      if (!pnlMap[i.symbol]) pnlMap[i.symbol] = 0;
      pnlMap[i.symbol] += Number(i.income);
    });

    /* =============================
       3️⃣ GROUP FILLS → POSITIONS
    ============================= */

    const symbolMap = {};

    fills.forEach((t) => {
      if (!symbolMap[t.symbol]) {
        symbolMap[t.symbol] = {
          symbol: t.symbol,
          buyQty: 0,
          sellQty: 0,
          buyValue: 0,
          sellValue: 0,
          fees: 0,
          firstSide: t.side, // 👈 important
          openTime: t.time,
          closeTime: t.time,
        };
      }

      const s = symbolMap[t.symbol];

      const qty = Number(t.qty);
      const price = Number(t.price);
      const value = qty * price;

      if (t.side === "BUY") {
        s.buyQty += qty;
        s.buyValue += value;
      } else {
        s.sellQty += qty;
        s.sellValue += value;
      }

      s.fees += Number(t.commission || 0);

      s.openTime = Math.min(s.openTime, t.time);
      s.closeTime = Math.max(s.closeTime, t.time);
    });

    /* =============================
       4️⃣ BUILD CLOSED POSITIONS
    ============================= */

    const closedTrades = Object.values(symbolMap)
      .filter((t) => t.buyQty > 0 && t.sellQty > 0)
      .map((t) => {
        const entry = t.buyValue / t.buyQty;
        const exit = t.sellValue / t.sellQty;

        const size = Math.min(t.buyValue, t.sellValue);
        const side = t.firstSide === "BUY" ? "LONG" : "SHORT";

        const pnl = pnlMap[t.symbol] || 0;

        const roi = size ? (pnl / size) * 100 : 0;

        const durationMs = t.closeTime - t.openTime;
        const durationMin = Math.round(durationMs / 60000);

        return {
          symbol: t.symbol,
          side,
          size: Number(size.toFixed(2)),
          entry: Number(entry.toFixed(4)),
          exit: Number(exit.toFixed(4)),
          leverage: "-",
          pnl: Number(pnl.toFixed(4)),
          fees: Number(t.fees.toFixed(4)),
          roi: Number(roi.toFixed(2)),
          duration: `${durationMin}m`,
          openTime: new Date(t.openTime),
          closeTime: new Date(t.closeTime),
          status: "CLOSED",
        };
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

    const trades = [...closedTrades, ...openTrades];

    res.json({
      totalTrades: trades.length,
      trades,
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

    console.log("Incoming trades:", trades);
    console.log("Trades count:", trades?.length);

    console.log("UserID:", userId);
    console.log("AccountID:", accountId);

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
    console.log("Formatted Trades:", formattedTrades);

    const inserted = await Trade.insertMany(formattedTrades, {
      ordered: false,
    });

    res.json({
      imported: inserted.length,
      message: "Trades imported successfully",
    });
    console.log("Inserted:", inserted.length);
  } catch (error) {
    console.error("Binance import error:", error);

    res.status(500).json({
      message: "Trade import failed",
    });
  }
});

module.exports = router;
