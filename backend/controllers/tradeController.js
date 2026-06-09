const Account = require("../models/Account");
const Trade = require("../models/Trade");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { deleteImageFromB2 } = require("../utils/backblaze");
const getUserData = require("../utils/getUserData");

const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const s3 = new S3Client({
  region: process.env.B2_REGION,
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APP_KEY,
  },
});

// --- Upload images ---
const handleUpload = async (file, folder) => {
  const key = await uploadToB2(file, folder);
  return {
    url: `https://cdn.journalx.app/${key}`,
    sizeKB: Math.round(file.size / 1024),
  };
};

async function uploadToB2(file, folder) {
  const safeName = file.originalname.replace(/\s+/g, "_");
  const fileName = `${folder}/${Date.now()}-${safeName}`;

  const key = `trades/${fileName}`; // must start with trades/

  const command = new PutObjectCommand({
    Bucket: process.env.B2_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3.send(command);

  // ✅ Return key only, not S3 raw URL
  return key;
}

// controllers/tradeController.js

exports.addTrade = async (req, res) => {
  try {
    const { body, files } = req;
    const userId = req.cookies.userId;
    const accountId = req.body.accountId;

    if (!userId || !accountId) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    // ✅ Parse structured fields safely
    const tradeData = {
      ...body,
      entries: JSON.parse(body.entries || "[]"),
      exits: JSON.parse(body.exits || "[]"),
      sls: JSON.parse(body.sls || "[]"),
      tps: JSON.parse(body.tps || "[]"),
      reason: body.reason ? JSON.parse(body.reason) : [],
      rulesFollowed:
        body.rulesFollowed === "true" || body.rulesFollowed === true,
      learnings: body.learnings || "",

      // ✅ Numbers
      quantityUSD: Number(body.quantityUSD || 0),
      leverage: Number(body.leverage || 1),
      totalQuantity: Number(body.totalQuantity || 0),
      duration: Number(body.duration || 0),
      pnl: Number(body.pnl || 0),
      expectedProfit: Number(body.expectedProfit || 0),
      expectedLoss: Number(body.expectedLoss || 0),
      avgEntryPrice: Number(body.avgEntryPrice || 0),
      avgExitPrice: Number(body.avgExitPrice || 0),
      avgTPPrice: Number(body.avgTPPrice || 0),
      avgSLPrice: Number(body.avgSLPrice || 0),

      // ✅ Fees
      feeType: body.feeType || "percent",
      openFeeValue: Number(body.openFeeValue || 0),
      closeFeeValue: Number(body.closeFeeValue || 0),
      openFeeAmount: Number(body.openFeeAmount || 0),
      closeFeeAmount: Number(body.closeFeeAmount || 0),
      feeAmount: Number(body.feeAmount || 0),
      pnlAfterFee: Number(body.pnlAfterFee || 0),

      // ✅ Other
      tradeStatus: body.tradeStatus || "quick",
      openTime: body.openTime || new Date(),
      closeTime: body.closeTime || null,

      // ✅ Revamp v2 context fields
      sizeUnit: body.sizeUnit || "",
      strategy: body.strategy || "",
      marketCondition: body.marketCondition || "",
      timeframe: body.timeframe || "",
      confidence: Number(body.confidence || 0),
      emotion: body.emotion || "",
      mistakes: body.mistakes ? JSON.parse(body.mistakes) : [],

      // ✅ source + chart metadata (chart-logged trades) — tvChart arrives as
      // a JSON string and must be parsed into the nested object so the
      // details page can redraw the entry/exit chart
      source: body.source || "manual",
      tvChart: (() => {
        try { return body.tvChart ? JSON.parse(body.tvChart) : undefined; }
        catch { return undefined; }
      })(),

      userId,
      accountId,
    };

    // --- Handle images ---
    if (files?.openImage?.[0]) {
      const { url, sizeKB } = await handleUpload(
        files.openImage[0],
        "open-images",
      );
      tradeData.openImageUrl = url;
      tradeData.openImageSizeKB = sizeKB;
    }

    if (files?.closeImage?.[0]) {
      const { url, sizeKB } = await handleUpload(
        files.closeImage[0],
        "close-images",
      );
      tradeData.closeImageUrl = url;
      tradeData.closeImageSizeKB = sizeKB;
    }

    // --- v2 screenshots: up to 4 images, 10MB combined ---
    if (files?.images?.length) {
      const totalBytes = files.images.reduce((s, f) => s + f.size, 0);
      if (files.images.length > 4 || totalBytes > 10 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: "Max 4 screenshots and 10MB total per trade",
        });
      }
      tradeData.images = await Promise.all(
        files.images.map((f) => handleUpload(f, "trade-images")),
      );
    }

    // --- Save Trade ---
    const newTrade = await new Trade(tradeData).save();

    // --- Award XP to the journal based on log quality ---
    // base 10; +20 risk set (SL+TP), +10 strategy, +10 emotion,
    // +10 notes, +15 screenshots — mirrors the log-trade quality model
    let xp = 10;
    if (Number(tradeData.avgSLPrice) > 0 && Number(tradeData.avgTPPrice) > 0) xp += 20;
    if (tradeData.strategy) xp += 10;
    if (tradeData.emotion) xp += 10;
    if (tradeData.learnings && String(tradeData.learnings).trim()) xp += 10;
    if (Array.isArray(tradeData.images) && tradeData.images.length) xp += 15;
    try {
      await Account.findByIdAndUpdate(accountId, { $inc: { xp, xpTrades: 1 } });
    } catch (e) {
      console.error("XP update failed:", e.message);
    }

    // --- Aggregation Pipeline (include tradeStatus)
    const pipeline = [
      { $match: { _id: newTrade._id } },
      {
        $lookup: {
          from: "accounts",
          localField: "accountId",
          foreignField: "_id",
          as: "accountDetails",
        },
      },
      {
        $unwind: { path: "$accountDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 1,
          symbol: 1,
          direction: 1,
          openTime: 1,
          closeTime: 1,
          pnl: 1,
          quantityUSD: 1,
          leverage: 1,
          totalQuantity: 1,
          duration: 1,
          entries: 1,
          exits: 1,
          sls: 1,
          tps: 1,
          reason: 1,
          rulesFollowed: 1,
          learnings: 1,
          accountId: 1,
          accountName: "$accountDetails.name",
          avgEntryPrice: 1,
          avgExitPrice: 1,
          avgTPPrice: 1,
          avgSLPrice: 1,
          expectedProfit: 1,
          expectedLoss: 1,
          openImageUrl: 1,
          closeImageUrl: 1,
          // ✅ Include tradeStatus in returned trade
          tradeStatus: 1,
          // ✅ v2 fields
          sizeUnit: 1,
          strategy: 1,
          marketCondition: 1,
          timeframe: 1,
          confidence: 1,
          emotion: 1,
          mistakes: 1,
          images: 1,
          feeType: 1,
          feeAmount: 1,
          rr: 1,
        },
      },
    ];

    const [newTradeData] = await Trade.aggregate(pipeline);

    res.status(201).json({
      success: true,
      message: "Trade added successfully",
      trade: newTradeData,
    });
  } catch (err) {
    console.error("Add trade error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to add trade",
    });
  }
};

exports.updateTrade = async (req, res) => {
  try {
    const tradeId = req.params.id;
    const { body = {}, files = {} } = req;
    const userId = req.cookies.userId;

    if (!userId || !tradeId)
      return res.status(401).json({
        success: false,
        message: "Unauthorized or missing trade ID",
      });

    const oldTrade = await Trade.findById(tradeId);
    if (!oldTrade)
      return res.status(404).json({
        success: false,
        message: "Trade not found",
      });

    const accountId = Array.isArray(body.accountId)
      ? body.accountId[0]
      : body.accountId;

    // ✅ Safely parse arrays
    const parseJSON = (val, fallback = []) => {
      try {
        return typeof val === "string"
          ? JSON.parse(val || "[]")
          : val || fallback;
      } catch {
        return fallback;
      }
    };

    // ✅ Structured field normalization
    const tradeData = {
      ...body,
      entries: parseJSON(body.entries),
      exits: parseJSON(body.exits),
      sls: parseJSON(body.sls),
      tps: parseJSON(body.tps),
      reason: parseJSON(body.reason),
      mistakes: parseJSON(body.mistakes), // v2 — arrives as JSON string
      confidence: Number(body.confidence || 0),
      rulesFollowed:
        body.rulesFollowed === "true" || body.rulesFollowed === true,
      learnings: body.learnings || "",

      // ✅ Numbers
      quantityUSD: Number(body.quantityUSD || 0),
      leverage: Number(body.leverage || 1),
      totalQuantity: Number(body.totalQuantity || 0),
      duration: Number(body.duration || 0),
      pnl: Number(body.pnl || 0),
      expectedProfit: Number(body.expectedProfit || 0),
      expectedLoss: Number(body.expectedLoss || 0),
      avgEntryPrice: Number(body.avgEntryPrice || 0),
      avgExitPrice: Number(body.avgExitPrice || 0),
      avgTPPrice: Number(body.avgTPPrice || 0),
      avgSLPrice: Number(body.avgSLPrice || 0),

      // ✅ Fees
      feeType: body.feeType || "percent",
      openFeeValue: Number(body.openFeeValue || 0),
      closeFeeValue: Number(body.closeFeeValue || 0),
      openFeeAmount: Number(body.openFeeAmount || 0),
      closeFeeAmount: Number(body.closeFeeAmount || 0),
      feeAmount: Number(body.feeAmount || 0),
      pnlAfterFee: Number(body.pnlAfterFee || 0),

      // ✅ source + chart metadata (parse tvChart JSON string → object)
      source: body.source || oldTrade.source || "manual",
      tvChart: (() => {
        try { return body.tvChart ? JSON.parse(body.tvChart) : oldTrade.tvChart; }
        catch { return oldTrade.tvChart; }
      })(),

      // ✅ Time & identifiers
      openTime: body.openTime || oldTrade.openTime,
      closeTime: body.closeTime || null,
      userId,
      accountId,
    };

    const removeOpenImage = body.removeOpenImage === "true";
    const removeCloseImage = body.removeCloseImage === "true";

    // --- Handle image uploads ---
    if (files?.openImage?.[0]) {
      const { url, sizeKB } = await handleUpload(
        files.openImage[0],
        "open-images",
      );
      tradeData.openImageUrl = url;
      tradeData.openImageSizeKB = sizeKB;
    } else if (removeOpenImage) {
      tradeData.openImageUrl = null;
      tradeData.openImageSizeKB = 0;
    }

    if (files?.closeImage?.[0]) {
      const { url, sizeKB } = await handleUpload(
        files.closeImage[0],
        "close-images",
      );
      tradeData.closeImageUrl = url;
      tradeData.closeImageSizeKB = sizeKB;
    } else if (removeCloseImage) {
      tradeData.closeImageUrl = null;
      tradeData.closeImageSizeKB = 0;
    }

    // ✅ Update trade
    const updatedTrade = await Trade.findByIdAndUpdate(tradeId, tradeData, {
      new: true,
    });

    // --- Aggregation to return minimal enriched data ---
    const pipeline = [
      { $match: { _id: updatedTrade._id } },
      {
        $lookup: {
          from: "accounts",
          localField: "accountId",
          foreignField: "_id",
          as: "accountDetails",
        },
      },
      {
        $unwind: { path: "$accountDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 1,
          symbol: 1,
          direction: 1,
          quantityUSD: 1,
          leverage: 1,
          totalQuantity: 1,
          openTime: 1,
          closeTime: 1,
          pnl: 1,
          duration: 1,
          entries: 1,
          exits: 1,
          sls: 1,
          tps: 1,
          reason: 1,
          rulesFollowed: 1,
          learnings: 1,
          accountId: 1,
          accountName: "$accountDetails.name",
          avgEntryPrice: 1,
          avgExitPrice: 1,
          avgTPPrice: 1,
          avgSLPrice: 1,
          expectedProfit: 1,
          expectedLoss: 1,
          openImageUrl: 1,
          closeImageUrl: 1,
          tradeStatus: 1,
          // ✅ v2 fields
          sizeUnit: 1,
          strategy: 1,
          marketCondition: 1,
          timeframe: 1,
          confidence: 1,
          emotion: 1,
          mistakes: 1,
          images: 1,
          feeType: 1,
          feeAmount: 1,
          rr: 1,
        },
      },
    ];

    const [updatedTradeData] = await Trade.aggregate(pipeline);

    res.json({
      success: true,
      message: "Trade updated successfully",
      trade: updatedTradeData,
    });

    // ✅ Cleanup replaced images asynchronously
    process.nextTick(async () => {
      try {
        if (
          oldTrade.openImageUrl &&
          oldTrade.openImageUrl !== updatedTrade.openImageUrl
        ) {
          await deleteImageFromB2(oldTrade.openImageUrl);
        }
        if (
          oldTrade.closeImageUrl &&
          oldTrade.closeImageUrl !== updatedTrade.closeImageUrl
        ) {
          await deleteImageFromB2(oldTrade.closeImageUrl);
        }
      } catch (cleanupErr) {
        console.error("Image cleanup failed:", cleanupErr.message);
      }
    });
  } catch (err) {
    console.error("Trade update error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to update trade",
    });
  }
};

exports.tradeChat = async (req, res) => {
  try {
    const { query, trades } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, message: "Missing query" });
    }

    if (!trades || trades.length === 0) {
      return res.json({
        success: true,
        reply:
          "📭 You don’t have any trades yet. Start journaling to see your progress!",
      });
    }

    // ✅ Trim trades to reduce token usage (only last 5 trades for analysis)
    const limitedTrades = trades.slice(-5);

    // ✅ Master system prompt
    const systemPrompt = `

    first analyse that the queryis related to trading context or not if yes then proceed below otherwise not.

You are a professional trade analysis assistant for a trading journal platform. 
Your job is to help the trader analyze their trades and improve performance. 

Each trade contains:
- Trade ID(dont show this id or header), Status (Closed | Running | Quick Trade Log(means they are just logging their past trade but only pnl so dont emphasis more on this)), Direction (Long | Short),
- Quantity, Margin, Entry Price, Exit Price, TPSL (analyse and show only if available),
- Net P&L, Open/Close Time (show in 21st aug,2025 format), Reason, Learning.(analyse and show only if available)

### Your Tasks:
- If the user asks about a specific trade, show that trade in a **table**.
- If the user asks for analysis (e.g., "why do I lose trades?", "how to improve"):
  1. Show relevant trades in a **table** (latest, losing trades, etc.).
  2. Provide analysis with:
     - **Summary**
     - **Patterns** (direction bias, overtrading, timing issues, repeated mistakes)
     - **Strengths**
     - **Weaknesses**
     - **Actionable Suggestions**
  3. If open/close times suggest poor timing, highlight it.(only if status is running or closed)
  4. If direction bias is noticed, point it out based on the current market sentiment.
  5. if he asks something which is confusing and other than trading then tell it doesnt not align with context
  6. Give some tips or strategies based on their patterns

### Response Format:
- Use **Markdown**.
- Include **tables** for trades.
- Use clear **headings** (Summary, Strengths, Weaknesses, Suggestions).
- No raw JSON in response — only human-readable insights.
    `;

    // ✅ Shortened user query message
    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `User question: "${query}". Analyze based on these trades: ${JSON.stringify(
          limitedTrades,
        )}`,
      },
    ];

    // ✅ Call GPT
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // efficient model
      messages,
      max_tokens: 800, // enough for tables + analysis
    });

    const reply = completion.choices[0]?.message?.content || "⚠️ No response";

    res.json({ success: true, reply });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error processing trade insights" });
  }
};

exports.deleteTrade = async (req, res) => {
  try {
    const tradeId = req.cookies.TRADE_KEY || req.headers["x-trade-id"];

    if (!tradeId) {
      return res.status(400).json({ error: "Trade ID not found" });
    }

    const trade = await Trade.findById(tradeId);
    if (!trade) return res.status(404).json({ error: "Trade not found" });

    const { openImageUrl, closeImageUrl, userId } = trade;

    // ✅ Delete trade
    await Trade.findByIdAndDelete(tradeId);

    const user = await User.findById(userId);
    const userData = await getUserData(user);

    res.json({
      success: true,
      tradeId,
      message: "Trade deleted successfully!",
      userData,
    });

    // ✅ Cleanup images asynchronously (legacy + v2 screenshots)
    if (openImageUrl) deleteImageFromB2(openImageUrl);
    if (closeImageUrl) deleteImageFromB2(closeImageUrl);
    if (Array.isArray(trade.images)) {
      trade.images.forEach((img) => img?.url && deleteImageFromB2(img.url));
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to delete trade" });
  }
};

// --- v2: trade screenshot CRUD (Backblaze) ---
exports.addTradeImage = async (req, res) => {
  try {
    const userId = req.cookies.userId;
    const trade = await Trade.findById(req.params.id);
    if (!userId || !trade || String(trade.userId) !== String(userId)) {
      return res.status(404).json({ success: false, message: "Trade not found" });
    }
    const file = req.files?.image?.[0] || req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No image provided" });
    }
    const existing = trade.images || [];
    const totalKB = existing.reduce((s, i) => s + (i.sizeKB || 0), 0);
    if (existing.length >= 4 || totalKB * 1024 + file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Max 4 screenshots and 10MB total per trade",
      });
    }
    const uploaded = await handleUpload(file, "trade-images");
    trade.images = [...existing, uploaded];
    await trade.save();
    res.json({ success: true, images: trade.images });
  } catch (err) {
    console.error("Add trade image error:", err);
    res.status(500).json({ success: false, message: "Could not add image" });
  }
};

exports.deleteTradeImage = async (req, res) => {
  try {
    const userId = req.cookies.userId;
    const { url } = req.body;
    const trade = await Trade.findById(req.params.id);
    if (!userId || !trade || String(trade.userId) !== String(userId)) {
      return res.status(404).json({ success: false, message: "Trade not found" });
    }
    if (!url) {
      return res.status(400).json({ success: false, message: "No image url" });
    }
    trade.images = (trade.images || []).filter((i) => i.url !== url);
    await trade.save();
    deleteImageFromB2(url); // async cleanup
    res.json({ success: true, images: trade.images });
  } catch (err) {
    console.error("Delete trade image error:", err);
    res.status(500).json({ success: false, message: "Could not delete image" });
  }
};

// --- v2: chart annotation (mark entry/exit on a chart in the details page) ---
// Free plan is limited to 5 chart logs per calendar month; Pro/Lifetime
// are unlimited. Only touches chart fields — never the trade's P&L/sizing.
exports.annotateTrade = async (req, res) => {
  try {
    const userId = req.cookies.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const trade = await Trade.findById(req.params.id);
    if (!trade || String(trade.userId) !== String(userId)) {
      return res.status(404).json({ success: false, message: "Trade not found" });
    }

    const { entryPrice, exitPrice, timeframe, symbol, direction, totalQuantity, pnl, stopPrice, takeProfit } = req.body || {};
    if (!entryPrice) {
      return res.status(400).json({ success: false, message: "Entry price is required" });
    }

    // enforce the monthly limit for free users
    const user = await User.findById(userId);
    const plan = (user?.subscriptionPlan || "free").toLowerCase();
    const active = user?.subscriptionStatus === "active";
    const isPaid = active && (plan.includes("pro") || plan.includes("lifetime"));
    if (!isPaid) {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const used = await Trade.countDocuments({
        userId,
        chartAnnotatedAt: { $gte: start },
      });
      if (used >= 5) {
        return res.status(403).json({
          success: false,
          limit: true,
          message: "Free plan allows 5 chart logs per month. Upgrade for unlimited.",
        });
      }
    }

    const eIn = Number(entryPrice);
    const xIn = Number(exitPrice) || 0;
    const slIn = Number(stopPrice) || Number(trade.avgSLPrice) || 0;
    const tpIn = Number(takeProfit) || Number(trade.avgTPPrice) || 0;
    const qty = Number(totalQuantity) || Number(trade.totalQuantity) || 0;
    const dir = (direction || trade.direction || "long").toLowerCase();

    trade.tvChart = {
      symbol: symbol || trade.symbol,
      exchange: "BINANCE",
      timeframe: timeframe || "60",
      entryTime: trade.openTime || new Date(),
      exitTime: trade.closeTime || new Date(),
      entryPrice: eIn,
      exitPrice: xIn,
      stopPrice: slIn,
      takeProfit: tpIn,
    };

    // also sync the trade's own entry/exit + recompute P&L so the rest of the
    // app (cards, analytics) reflects the marked prices
    trade.avgEntryPrice = eIn;
    if (xIn) trade.avgExitPrice = xIn;
    if (slIn) trade.avgSLPrice = slIn;
    if (tpIn) trade.avgTPPrice = tpIn;
    if (direction) trade.direction = dir;
    if (Array.isArray(trade.entries) && trade.entries[0]) trade.entries[0].price = eIn;
    if (xIn && Array.isArray(trade.exits) && trade.exits[0]) trade.exits[0].price = xIn;

    if (pnl !== undefined && pnl !== null && pnl !== "") {
      trade.pnl = Number(pnl);
      trade.pnlAfterFee = Number(pnl);
    } else if (eIn && xIn && qty) {
      const computed = (xIn - eIn) * qty * (dir === "long" ? 1 : -1);
      trade.pnl = computed;
      trade.pnlAfterFee = computed;
    }

    trade.source = trade.source && trade.source !== "manual" ? trade.source : "tradingview";
    trade.chartAnnotatedAt = new Date();
    await trade.save();

    res.json({ success: true, trade });
  } catch (err) {
    console.error("Annotate trade error:", err);
    res.status(500).json({ success: false, message: "Could not save chart" });
  }
};

// --- v2: bulk import quick-log trades from CSV ---
exports.addTradesBulk = async (req, res) => {
  try {
    const userId = req.cookies.userId;
    const { accountId, trades } = req.body;

    if (!userId || !accountId) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }
    if (!Array.isArray(trades) || trades.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No trades to import" });
    }
    if (trades.length > 500) {
      return res
        .status(400)
        .json({ success: false, message: "Max 500 trades per import" });
    }

    const docs = [];
    const errors = [];
    trades.forEach((t, i) => {
      const symbol = String(t.symbol || "").trim().toUpperCase();
      const direction = String(t.direction || "").trim().toLowerCase();
      const pnl = Number(t.pnl);
      const closeTime = t.closeTime ? new Date(t.closeTime) : new Date();
      if (!symbol) return errors.push(`Row ${i + 1}: missing symbol`);
      if (!["long", "short"].includes(direction))
        return errors.push(`Row ${i + 1}: direction must be long or short`);
      if (Number.isNaN(pnl)) return errors.push(`Row ${i + 1}: invalid pnl`);
      if (Number.isNaN(closeTime.getTime()))
        return errors.push(`Row ${i + 1}: invalid closeTime`);

      docs.push({
        userId,
        accountId,
        symbol,
        direction,
        pnl,
        pnlAfterFee: pnl,
        quantityUSD: Number(t.size) || 0,
        totalQuantity: Number(t.size) || 0,
        leverage: 1,
        tradeStatus: "quick",
        openTime: closeTime,
        closeTime,
        learnings: String(t.notes || ""),
        entries: [],
        exits: [],
        sls: [],
        tps: [],
      });
    });

    if (errors.length) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const inserted = await Trade.insertMany(docs);
    // base 10 XP per imported quick-log trade
    try {
      await Account.findByIdAndUpdate(accountId, {
        $inc: { xp: inserted.length * 10, xpTrades: inserted.length },
      });
    } catch (e) {
      console.error("Bulk XP update failed:", e.message);
    }
    res.status(201).json({
      success: true,
      message: `${inserted.length} trades imported`,
      trades: inserted,
    });
  } catch (err) {
    console.error("Bulk import error:", err);
    res.status(500).json({ success: false, message: "Bulk import failed" });
  }
};
