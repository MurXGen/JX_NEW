const Account = require('../models/Account');
const Trade = require('../models/Trade');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;
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

// Upload helper
async function uploadToB2(file, folder) {
  const fileName = `${folder}/${Date.now()}-${file.originalname}`;
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

  return `${process.env.B2_ENDPOINT}/${process.env.B2_BUCKET}/${key}`;
}


exports.addTrade = async (req, res) => {
  try {
    const { body, files } = req;

    let openImageUrl = null;
    let closeImageUrl = null;
    let openImageSizeKB = null;
    let closeImageSizeKB = null;

    // Max file size (5MB in bytes)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;

    if (files?.openImage) {
      const file = files.openImage[0];
      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          error: "Open image exceeds 5MB limit. Please upload a smaller file.",
        });
      }

      openImageUrl = await uploadToB2(file, "open-images");
      openImageSizeKB = Math.round(file.size / 1024); // ✅ convert to KB
    }

    if (files?.closeImage) {
      const file = files.closeImage[0];
      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          error: "Close image exceeds 5MB limit. Please upload a smaller file.",
        });
      }

      closeImageUrl = await uploadToB2(file, "close-images");
      closeImageSizeKB = Math.round(file.size / 1024);
    }

    // Build trade object
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
      openImageUrl,
      closeImageUrl,
      openImageSizeKB,
      closeImageSizeKB,
      userId: req.cookies.userId,
      accountId: req.cookies.accountId,
    };

    const newTrade = new Trade(tradeData);
    await newTrade.save();

    const accounts = await Account.find({ userId: req.cookies.userId });
    const trades = await Trade.find({ userId: req.cookies.userId });

    res.status(201).json({
      success: true,
      message: "Trade added successfully",
      trade: newTrade,
      accounts,
      trades
    });
  } catch (err) {
    console.error("❌ [addTrade ERROR]:", err);
    res.status(500).json({ success: false, error: "Failed to add trade" });
  }
};



exports.updateTrade = async (req, res) => {
  try {
    const tradeId = req.params.id;
    const { body = {}, files = {} } = req;

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
      reason: body.reason ? (Array.isArray(body.reason) ? body.reason : [body.reason]) : [],
      userId: req.cookies.userId,
      accountId: req.cookies.accountId,
    };

    // Handle optional new images
    if (files?.openImage) {
      tradeData.openImageUrl = await uploadToB2(files.openImage[0], "open-images");
    }
    if (files?.closeImage) {
      tradeData.closeImageUrl = await uploadToB2(files.closeImage[0], "close-images");
    }

    const trade = await Trade.findByIdAndUpdate(tradeId, tradeData, {
      new: true,
    });

    if (!trade) {
      return res.status(404).json({ success: false, message: "Trade not found" });
    }

    const accounts = await Account.find({ userId: req.cookies.userId });
    const trades = await Trade.find({ userId: req.cookies.userId });

    res.json({ success: true, trade, trades, accounts });
  } catch (err) {
    console.error("❌ [updateTrade ERROR]:", err);
    res.status(500).json({ success: false, message: "Error updating trade" });
  }
};

exports.tradeChat = async (req, res) => {
  try {
    const { query, trades } = req.body;

    if (!query || !trades) {
      return res
        .status(400)
        .json({ success: false, message: "Missing query or trades" });
    }

    const messages = [
      {
        role: "system",
        content:
          "You are a professional trading coach. Analyse the user's trade history JSON and answer clearly with concise, structured insights. Always format the response with headings, bullet points, or numbered lists so it’s easy to read.",
      },
      {
        role: "user",
        content: `Here is my trades data in JSON: ${JSON.stringify(trades)}.
        The user asked: ${query}. 
        Please provide a short, structured, and well-formatted response.`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or gpt-4.1 if enabled
      messages,
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

    // respond immediately
    res.json({ success: true, tradeId, accounts, trades });

    // async cleanup of images
    if (openImageUrl) {
      console.log("🪓 Deleting OPEN image from B2:", openImageUrl);
      deleteImageFromB2(openImageUrl);
    }
    if (closeImageUrl) {
      console.log("🪓 Deleting CLOSE image from B2:", closeImageUrl);
      deleteImageFromB2(closeImageUrl);
    }

  } catch (err) {
    console.error("❌ Error deleting trade:", err);
    res.status(500).json({ error: "Failed to delete trade" });
  }
};
