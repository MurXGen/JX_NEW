const crypto = require("crypto");
const axios = require("axios");

const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX;

exports.createOrder = async (req, res) => {
  try {
    const { amount, city, pincode, address, cartItems } = req.body;

    console.log("Incoming body:", req.body);

    if (!MERCHANT_ID || !SALT_KEY || !SALT_INDEX) {
      return res.status(500).json({
        message: "PhonePe env variables missing",
      });
    }

    const transactionId = "TXN_" + Date.now();

    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: "USER_" + Date.now(),
      amount: amount * 100,
      redirectUrl: "https://thebookx.in/payment-success",
      redirectMode: "POST",
      callbackUrl: "https://api.journalx.app/api/thebooks/payments/webhook",
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(
      "base64",
    );

    const checksum =
      crypto
        .createHash("sha256")
        .update(payloadBase64 + "/pg/v1/pay" + SALT_KEY)
        .digest("hex") +
      "###" +
      SALT_INDEX;

    console.log("Sending to PhonePe...");

    const response = await axios.post(
      "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay",
      { request: payloadBase64 },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
        },
        timeout: 15000,
      },
    );

    console.log("PhonePe response:", response.data);

    const paymentUrl =
      response.data?.data?.instrumentResponse?.redirectInfo?.url;

    if (!paymentUrl) {
      return res.status(500).json({
        message: "PhonePe did not return payment URL",
        response: response.data,
      });
    }

    res.json({
      paymentUrl,
      transactionId,
    });
  } catch (error) {
    console.error("PhonePe error:", error.response?.data || error.message);

    res.status(500).json({
      message: "Payment initiation failed",
      error: error.response?.data || error.message,
    });
  }
};
