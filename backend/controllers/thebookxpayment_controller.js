import crypto from "crypto";
import axios from "axios";

const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX;

export const createOrder = async (req, res) => {
  try {
    const { amount, city, pincode, address, cartItems } = req.body;

    if (!amount) {
      return res.status(400).json({ message: "Amount is required" });
    }

    const transactionId = "TXN_" + Date.now();

    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: "USER_" + Date.now(),
      amount: amount * 100, // paise
      redirectUrl: "https://thebookx.in/payment-success",
      redirectMode: "POST",
      callbackUrl: "https://api.journalx.com/api/payments/webhook",
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

    const response = await axios.post(
      "https://api.phonepe.com/apis/hermes/pg/v1/pay",
      { request: payloadBase64 },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
        },
      },
    );

    return res.status(200).json({
      paymentUrl: response.data.data.instrumentResponse.redirectInfo.url,
      transactionId,
    });
  } catch (error) {
    console.error(
      "PhonePe create order error:",
      error?.response?.data || error,
    );

    return res.status(500).json({
      message: "Payment initiation failed",
      error: error?.response?.data || error.message,
    });
  }
};
