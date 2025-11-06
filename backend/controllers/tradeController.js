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

    // --- Prepare tradeData ---
    const tradeData = {
      ...body,
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
      userId,
      accountId,
    };

    // --- Handle images ---
    if (files?.openImage?.[0]) {
      const { url, sizeKB } = await handleUpload(
        files.openImage[0],
        "open-images"
      );
      tradeData.openImageUrl = url;
      tradeData.openImageSizeKB = sizeKB;
    }
    if (files?.closeImage?.[0]) {
      const { url, sizeKB } = await handleUpload(
        files.closeImage[0],
        "close-images"
      );
      tradeData.closeImageUrl = url;
      tradeData.closeImageSizeKB = sizeKB;
    }

    // --- Save Trade ---
    const newTrade = await new Trade(tradeData).save();

    // --- Use Aggregation Pipeline to fetch minimal updated context ---
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
          duration: 1,
          entries: 1,
          exits: 1,
          accountId: 1,
          accountName: "$accountDetails.name",
          avgEntryPrice: 1,
          avgExitPrice: 1,
          avgTPPrice: 1,
          avgSLPrice: 1,
          openImageUrl: 1,
          closeImageUrl: 1,
          expectedProfit: 1,
          expectedLoss: 1,
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
    res
      .status(500)
      .json({ success: false, message: err.message || "Failed to add trade" });
  }
};

exports.updateTrade = async (req, res) => {
  try {
    const tradeId = req.params.id;
    const { body = {}, files = {} } = req;

    // --- Extract and normalize accountId ---
    const accountId = Array.isArray(req.body.accountId)
      ? req.body.accountId[0]
      : req.body.accountId;

    const userId = req.cookies.userId;

    // --- Validate trade existence ---
    const oldTrade = await Trade.findById(tradeId);
    if (!oldTrade) {
      return res.status(404).json({
        success: false,
        message: "Trade not found",
      });
    }

    // --- Parse and normalize trade data ---
    const tradeData = {
      ...body,
      userId,
      accountId,

      // Numeric conversions
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

      // JSON-parsed arrays
      entries: body.entries ? JSON.parse(body.entries) : [],
      exits: body.exits ? JSON.parse(body.exits) : [],
      sls: body.sls ? JSON.parse(body.sls) : [],
      tps: body.tps ? JSON.parse(body.tps) : [],

      // Array normalization
      reason: body.reason
        ? Array.isArray(body.reason)
          ? body.reason
          : [body.reason]
        : [],

      // Optional fields
      closeTime: body.closeTime || null,
    };

    const removeOpenImage = body.removeOpenImage === "true";
    const removeCloseImage = body.removeCloseImage === "true";

    // --- Handle image uploads / removals ---
    if (files?.openImage?.[0]) {
      const { url, sizeKB } = await handleUpload(
        files.openImage[0],
        "open-images"
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
        "close-images"
      );
      tradeData.closeImageUrl = url;
      tradeData.closeImageSizeKB = sizeKB;
    } else if (removeCloseImage) {
      tradeData.closeImageUrl = null;
      tradeData.closeImageSizeKB = 0;
    }

    // --- Update trade in DB ---
    const trade = await Trade.findByIdAndUpdate(tradeId, tradeData, {
      new: true,
    });

    // --- Fetch updated user data ---
    const user = await User.findById(userId);
    const userData = await getUserData(user);

    res.json({
      success: true,
      message: "Trade updated successfully",
      userData,
    });

    // --- Background cleanup: delete old images if replaced or removed ---
    process.nextTick(async () => {
      try {
        // Remove old open image if replaced
        if (
          oldTrade.openImageUrl &&
          oldTrade.openImageUrl !== trade.openImageUrl
        ) {
          await deleteImageFromB2(oldTrade.openImageUrl);
        }

        // Remove old close image if replaced
        if (
          oldTrade.closeImageUrl &&
          oldTrade.closeImageUrl !== trade.closeImageUrl
        ) {
          await deleteImageFromB2(oldTrade.closeImageUrl);
        }
      } catch (cleanupErr) {
        console.error("Image cleanup failed:", cleanupErr);
      }
    });
  } catch (err) {
    console.error("Error updating trade:", err);
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

    // ✅ Cleanup images asynchronously
    if (openImageUrl) deleteImageFromB2(openImageUrl);
    if (closeImageUrl) deleteImageFromB2(closeImageUrl);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete trade" });
  }
};
