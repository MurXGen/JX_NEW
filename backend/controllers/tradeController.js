const Account = require("../models/Account");
const Trade = require("../models/Trade");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { deleteImageFromB2 } = require("../utils/backblaze");

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

async function uploadToB2(file, folder) {
  const safeName = file.originalname.replace(/\s+/g, "_");
  const fileName = `${folder}/${Date.now()}-${safeName}`;

  const key = `trades/${fileName}`; // must start with trades/

  console.log("🔍 [B2 DEBUG] Preparing upload...");
  console.log("   Bucket:   ", process.env.B2_BUCKET);
  console.log("   Endpoint: ", process.env.B2_ENDPOINT);
  console.log("   Region:   ", process.env.B2_REGION);
  console.log("   Key:      ", key);
  console.log("   File mimetype:", file.mimetype);
  console.log("   File size (bytes):", file.size);

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

exports.addTrade = async (req, res) => {
  try {
    const { body, files } = req;

    // Build base trade object
    const tradeData = {
      ...body,
      quantityUSD: Number(body.quantityUSD),
      leverage: Number(body.leverage),
      totalQuantity: Number(body.totalQuantity),
      entries: JSON.parse(body.entries || "[]"),
      exits: JSON.parse(body.exits || "[]"),
      sls: JSON.parse(body.sls || "[]"),
      tps: JSON.parse(body.tps || "[]"),
      duration: Number(body.duration || 0),
      pnl: Number(body.pnl || 0),
      expectedProfit: Number(body.expectedProfit || 0),
      expectedLoss: Number(body.expectedLoss || 0),
      avgEntryPrice: Number(body.avgEntryPrice || 0),
      avgExitPrice: Number(body.avgExitPrice || 0),
      avgTPPrice: Number(body.avgTPPrice || 0),
      avgSLPrice: Number(body.avgSLPrice || 0),
      reason: body.reason ? [body.reason] : [],
      userId: req.cookies.userId,
      accountId: req.cookies.accountId,
    };

    // --- Upload images BEFORE saving trade ---
    if (files?.openImage) {
      const file = files.openImage[0];
      console.log("📂 [UPLOAD] Open image file received:", {
        name: file.originalname,
        sizeKB: Math.round(file.size / 1024),
        mimetype: file.mimetype,
      });

      const key = await uploadToB2(file, "open-images"); // only call ONCE
      console.log("✅ [UPLOAD] Raw B2 key returned:", key);

      const finalUrl = `https://cdn.journalx.app/${key}`;
      console.log("🌐 [FINAL] Open Image CDN URL:", finalUrl);

      tradeData.openImageUrl = finalUrl;
      tradeData.openImageSizeKB = Math.round(file.size / 1024);
    }

    if (files?.closeImage) {
      const file = files.closeImage[0];
      console.log("📂 [UPLOAD] Close image file received:", {
        name: file.originalname,
        sizeKB: Math.round(file.size / 1024),
        mimetype: file.mimetype,
      });

      const key = await uploadToB2(file, "close-images"); // only call ONCE
      console.log("✅ [UPLOAD] Raw B2 key returned:", key);

      const finalUrl = `https://cdn.journalx.app/${key}`;
      console.log("🌐 [FINAL] Close Image CDN URL:", finalUrl);

      tradeData.closeImageUrl = finalUrl;
      tradeData.closeImageSizeKB = Math.round(file.size / 1024);
    }

    // Save trade (with images included)
    const newTrade = new Trade(tradeData);
    await newTrade.save();

    // Fetch fresh accounts + trades
    const accounts = await Account.find({ userId: req.cookies.userId });
    const trades = await Trade.find({ userId: req.cookies.userId });

    // Respond AFTER images + DB done ✅
    res.status(201).json({
      success: true,
      message: "Trade added successfully",
      trade: newTrade,
      accounts,
      trades,
    });
  } catch (err) {
    console.error("[addTrade ERROR]:", err);

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

    // 🔍 Get old trade first (to compare old image URLs later)
    const oldTrade = await Trade.findById(tradeId);
    if (!oldTrade) {
      return res
        .status(404)
        .json({ success: false, message: "Trade not found" });
    }

    const tradeData = {
      ...body,
      quantityUSD: Number(body.quantityUSD || 0),
      leverage: Number(body.leverage || 1),
      totalQuantity: Number(body.totalQuantity || 0),
      entries: body.entries ? JSON.parse(body.entries) : [],
      exits: body.exits ? JSON.parse(body.exits) : [],
      sls: body.sls ? JSON.parse(body.sls) : [],
      tps: body.tps ? JSON.parse(body.tps) : [],
      duration: Number(body.duration || 0),
      pnl: Number(body.pnl || 0),
      expectedProfit: Number(body.expectedProfit || 0),
      expectedLoss: Number(body.expectedLoss || 0),
      avgEntryPrice: Number(body.avgEntryPrice || 0),
      avgExitPrice: Number(body.avgExitPrice || 0),
      avgTPPrice: Number(body.avgTPPrice || 0),
      avgSLPrice: Number(body.avgSLPrice || 0),
      reason: body.reason
        ? Array.isArray(body.reason)
          ? body.reason
          : [body.reason]
        : [],
      userId: req.cookies.userId,
      accountId: req.cookies.accountId,
    };
    if (!body.closeTime) {
      tradeData.closeTime = null; // <-- explicitly clear it in DB
      console.log("📝 Cleared closeTime in tradeData");
    }

    // --- Handle optional new images ---
    if (files?.openImage) {
      const file = files.openImage[0];
      const key = await uploadToB2(file, "open-images");
      tradeData.openImageUrl = `https://cdn.journalx.app/${key}`;
      tradeData.openImageSizeKB = Math.round(file.size / 1024);
    }

    if (files?.closeImage) {
      const file = files.closeImage[0];
      const key = await uploadToB2(file, "close-images");
      tradeData.closeImageUrl = `https://cdn.journalx.app/${key}`;
      tradeData.closeImageSizeKB = Math.round(file.size / 1024);
    }

    // ✅ Update trade
    const trade = await Trade.findByIdAndUpdate(tradeId, tradeData, {
      new: true,
    });

    const accounts = await Account.find({ userId: req.cookies.userId });
    const trades = await Trade.find({ userId: req.cookies.userId });

    // Respond immediately for fast UI
    res.json({ success: true, trade, trades, accounts });

    // --- Background cleanup: delete old images if replaced ---
    process.nextTick(async () => {
      try {
        if (
          oldTrade.openImageUrl &&
          trade.openImageUrl &&
          oldTrade.openImageUrl !== trade.openImageUrl
        ) {
          const oldKey = oldTrade.openImageUrl.replace(
            "https://cdn.journalx.app/",
            ""
          );
          await deleteImageFromB2(oldKey);
          console.log("🗑️ Deleted old openImage:", oldKey);
        }

        if (
          oldTrade.closeImageUrl &&
          trade.closeImageUrl &&
          oldTrade.closeImageUrl !== trade.closeImageUrl
        ) {
          const oldKey = oldTrade.closeImageUrl.replace(
            "https://cdn.journalx.app/",
            ""
          );
          await deleteImageFromB2(oldKey);
          console.log("🗑️ Deleted old closeImage:", oldKey);
        }
      } catch (cleanupErr) {
        console.error("⚠️ Error deleting old images:", cleanupErr);
      }
    });
  } catch (err) {
    console.error("[updateTrade ERROR]:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Error updating trade",
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
          limitedTrades
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
    console.error("❌ tradeChat error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error processing trade insights" });
  }
};

exports.deleteTrade = async (req, res) => {
  try {
    const tradeId = req.cookies.TRADE_KEY || req.headers["x-trade-id"];
    console.log("🪵 Deleting trade:", tradeId);

    if (!tradeId) {
      return res.status(400).json({ error: "Trade ID not found" });
    }

    const trade = await Trade.findById(tradeId);
    if (!trade) return res.status(404).json({ error: "Trade not found" });

    const { openImageUrl, closeImageUrl, userId } = trade;

    // delete trade first
    await Trade.findByIdAndDelete(tradeId);
    console.log("✅ Trade deleted from DB:", tradeId);

    // refresh accounts + trades
    const accounts = await Account.find({ userId });
    const trades = await Trade.find({ userId });

    // respond immediately (don't block frontend)
    res.json({ success: true, tradeId, accounts, trades });

    // async cleanup of images
    if (openImageUrl) deleteImageFromB2(openImageUrl);
    if (closeImageUrl) deleteImageFromB2(closeImageUrl);
  } catch (err) {
    console.error("❌ Error deleting trade:", err);
    res.status(500).json({ error: "Failed to delete trade" });
  }
};
