// components/CryptoBilling/CryptoBillingPage.js
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  Clock,
  Shield,
  Zap,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Mail,
  ArrowLeft,
} from "lucide-react";
import axios from "axios";
import Dropdown from "@/components/ui/Dropdown";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const NETWORKS = [
  {
    id: "erc20",
    name: "Ethereum (ERC20)",
    symbol: "ETH",
    fee: "Network fee: $5-15",
  },
  {
    id: "trc20",
    name: "Tron (TRC20)",
    symbol: "TRX",
    fee: "Network fee: $1-2",
  },
  {
    id: "bep20",
    name: "BSC (BEP20)",
    symbol: "BNB",
    fee: "Network fee: $0.5-1",
  },
  {
    id: "avaxc",
    name: "Avalanche C-Chain",
    symbol: "AVAX",
    fee: "Network fee: $0.5-1",
  },
  { id: "sol", name: "Solana", symbol: "SOL", fee: "Network fee: $0.01-0.1" },
  { id: "ton", name: "Toncoin", symbol: "TON", fee: "Network fee: $0.1-0.5" },
];

const NETWORK_ADDRESSES = {
  erc20: "0x742d35Cc6634C0532925a3b8Dc9B6e7f6C5A8E1F",
  trc20: "TXYZ1234567890abcdefghijklmnopqrstuvw",
  bep20: "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
  avaxc: "0x9Ab3FD5c9d5e6B6d6C9B9E8D8F7A6D5C4B3A2E1F",
  sol: "7Z5XWY6ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789",
  ton: "EQABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz",
};

export default function CryptoBillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [confirmTimer, setConfirmTimer] = useState(30);
  const [paymentStatus, setPaymentStatus] = useState("selecting"); // selecting, waiting, confirming, processing, success, failed
  const [processingTime, setProcessingTime] = useState(0);
  const [cryptoOrderId, setCryptoOrderId] = useState("");
  const [verificationAttempts, setVerificationAttempts] = useState(0);

  const planNameRaw = searchParams.get("planName");
  const periodRaw = searchParams.get("period");

  const capitalize = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

  const planName = capitalize(planNameRaw);
  const period = capitalize(periodRaw);
  const amount = searchParams.get("amount");

  // 30-second confirmation timer
  useEffect(() => {
    if (paymentStatus === "waiting" && confirmTimer > 0) {
      const timer = setTimeout(() => {
        setConfirmTimer(confirmTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (paymentStatus === "waiting" && confirmTimer === 0) {
      setPaymentStatus("confirming");
    }
  }, [paymentStatus, confirmTimer]);

  // 5-minute processing timer + periodic verification
  useEffect(() => {
    if (paymentStatus === "processing") {
      const startTime = Date.now();
      localStorage.setItem("cryptoPaymentInitiated", startTime.toString());

      // Run every 10 seconds for verification + UI timer every second
      const interval = setInterval(async () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setProcessingTime(elapsed);

        // ⏱️ Verify every 10 seconds
        if (elapsed % 10 === 0) {
          try {
            const storedOrderId = localStorage.getItem("cryptoOrderId");
            if (!storedOrderId) return;

            const res = await axios.post(
              `${API_BASE}/api/crypto-payments/verify-payment`,
              { orderId: storedOrderId },
              { withCredentials: true }
            );

            if (res.data.success) {
              clearInterval(interval);
              setPaymentStatus("success");

              router.push(
                `/subscription-success?planName=${encodeURIComponent(
                  planName
                )}&period=${period}&amount=${amount}&method=crypto&orderId=${storedOrderId}`
              );
            }
          } catch (err) {
            console.warn("⚠️ Verification error:", err.message);
          }
        }

        // 🕐 Timeout after 5 minutes (300s)
        if (elapsed >= 300) {
          clearInterval(interval);
          handlePaymentTimeout();
        }
      }, 1000);

      // Cleanup when status changes or component unmounts
      return () => clearInterval(interval);
    }
  }, [paymentStatus]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const createCryptoOrder = async () => {
    try {
      console.log("🚀 Creating crypto order...");
      const response = await axios.post(
        `${API_BASE}/api/crypto-payments/create-order`,
        {
          planName,
          period,
          amount,
          network: selectedNetwork,
          currency: "USDT",
        },
        { withCredentials: true } // ✅ Required to set cookie
      );

      console.log("✅ Crypto order created successfully:", response.data);
      return response.data.orderId; // ✅ Now orderId is returned
    } catch (error) {
      console.error("🔥 Failed to create crypto order:", error);
      throw new Error("Failed to create payment order");
    }
  };

  const handlePaymentTimeout = () => {
    console.warn("⏰ Payment timeout reached — marking as failed");
    setPaymentStatus("failed");
    localStorage.removeItem("cryptoPaymentInitiated");
    localStorage.removeItem("cryptoOrderId");
  };

  const handleConfirmPayment = async () => {
    try {
      setPaymentStatus("processing");

      const orderId = await createCryptoOrder(); // ✅ fixed destructuring bug
      if (!orderId) throw new Error("Order ID not received from server");

      setCryptoOrderId(orderId);
      localStorage.setItem("cryptoOrderId", orderId);
      localStorage.setItem("cryptoPaymentInitiated", "true");

      console.log("✅ Polling started for order:", orderId);

      // ✅ Poll every 10 seconds
      const interval = setInterval(async () => {
        try {
          const res = await axios.post(
            `${API_BASE}/api/crypto-payments/verify-payment`,
            { orderId },
            { withCredentials: true }
          );

          console.log("🔍 Poll result:", res.data);

          if (res.data.success) {
            clearInterval(interval);
            setPaymentStatus("success");

            router.push(
              `/subscription-success?planName=${encodeURIComponent(
                planName
              )}&period=${period}&amount=${amount}&method=crypto&orderId=${orderId}`
            );
          }
        } catch (err) {
          console.error("🔥 Crypto verification failed:", err);
        }
      }, 10000);

      // ❌ Stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(interval);
        handlePaymentTimeout();
      }, 10 * 60 * 1000);
    } catch (err) {
      console.error("❌ handleConfirmPayment failed:", err);
      setPaymentStatus("failed");
    }
  };

  const selectedNetworkData = NETWORKS.find(
    (net) => net.id === selectedNetwork
  );

  const handleBackClick = () => {
    router.push("/pricing");
  };

  const networkOptions = NETWORKS.map((network) => ({
    value: network.id,
    label: `${network.name} (${network.symbol}) - ${network.fee}`,
  }));

  return (
    <div className="">
      <div className="flexClm gap_32">
        {/* Header */}
        <div className="flexRow gap_12">
          <button className="button_sec flexRow" onClick={handleBackClick}>
            <ArrowLeft size={20} />
          </button>
          <div className="flexClm">
            <span className="font_20">Pay Crypto</span>
            <span className="font_12">Deposit to confirm your payment</span>
          </div>
        </div>

        {/* Order Summary */}
        <motion.div
          className="chart_boxBg flexClm gap_12"
          style={{ padding: "16px" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* <div className="order-header">
            <span className="font_16 font_weight_600">Order Details</span>
          </div> */}
          <div className="flexRow flexRow_stretch">
            <div className="flexClm gap_4">
              <span className="font_weight_600">{planName} Plan</span>
              <span className="font_12">{period}</span>
            </div>
            <div className="detail-item flexRow flexRow_stretch"></div>
            <div className="flexClm gap_4" style={{ textAlign: "right" }}>
              <span className="font_12">Amount</span>
              <span className="font_weight_600 success">{amount} USDT</span>
            </div>
          </div>
        </motion.div>

        {/* Network Selection */}
        <AnimatePresence>
          {paymentStatus === "selecting" && (
            <motion.div
              className="chart_boxBg flexClm gap_24"
              style={{ padding: "16px" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flexClm">
                <span className="font_16 font_weight_600">Select Network</span>
                <span className="font_12" style={{ color: "var(--white-50)" }}>
                  Choose your preferred blockchain network
                </span>
              </div>

              <div className="flexClm gap_12">
                <Dropdown
                  options={networkOptions}
                  value={selectedNetwork}
                  onChange={(val) => setSelectedNetwork(val)}
                  placeholder="Select a network"
                />
              </div>

              {selectedNetwork && (
                <motion.div
                  className="chart_boxBg flexClm gap_24"
                  style={{ padding: "16px" }}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.4 }}
                >
                  <div
                    className="flexRow flexRow_stretch gap_24 boxBg"
                    style={{
                      wordBreak: "break-all",
                      overflowWrap: "anywhere",
                      padding: "12px",
                    }}
                  >
                    <code
                      className="flexClm"
                      style={{
                        wordBreak: "break-all",
                        whiteSpace: "normal",
                        background: "var(--black-10)",
                        borderRadius: "8px",
                        padding: "8px",
                      }}
                    >
                      <span
                        className="font_12"
                        style={{ marginBottom: "12px" }}
                      >
                        Deposit Address
                      </span>
                      {NETWORK_ADDRESSES[selectedNetwork]}
                    </code>

                    <button
                      className="button_ter"
                      style={{
                        alignSelf: "center",
                        marginTop: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      onClick={() =>
                        copyToClipboard(NETWORK_ADDRESSES[selectedNetwork])
                      }
                    >
                      {copiedAddress ? (
                        <Check size={16} className="success" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>

                  <div className="flexRow gap_12 flexRow_stretch">
                    <span className="font_12">Network selected:</span>
                    <span className="font_12 font_weight_600">
                      {NETWORKS.find((n) => n.id === selectedNetwork)?.name} (
                      {NETWORKS.find((n) => n.id === selectedNetwork)?.symbol})
                    </span>
                  </div>
                  <div className="flexRow gap_8">
                    <AlertCircle size={16} className="error" />
                    <span className="font_12">
                      Send exactly{" "}
                      <u className="font_weight_600">{amount} USDT</u> excluding
                      fees
                    </span>
                  </div>

                  <div className="flexRow gap_8">
                    <AlertCircle size={16} className="error" />
                    <span className="font_12">
                      Only send USDT on {selectedNetworkData?.name}. Sending
                      other tokens may result in permanent loss.
                    </span>
                  </div>

                  <motion.button
                    className="button_pri flexRow gap_8 flex_center"
                    onClick={() => setPaymentStatus("waiting")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Zap size={18} />
                    I've Sent the Payment
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Waiting for Confirmation */}
        <AnimatePresence>
          {paymentStatus === "waiting" && (
            <motion.div
              className="confirmation-section chart_boxBg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
            >
              <div className="confirmation-header text-center">
                <Clock size={48} className="vector" />
                <h3 className="font_18 font_weight_600">
                  Waiting for Confirmation
                </h3>
                <p className="font_14" style={{ color: "var(--white-50)" }}>
                  Please confirm that you've sent the payment
                </p>
              </div>

              <div className="timer-display">
                <div className="timer-circle">
                  <span className="timer-value font_20 font_weight_700">
                    {confirmTimer}s
                  </span>
                </div>
                <span className="timer-label font_12">
                  Confirm within {confirmTimer} seconds
                </span>
              </div>

              <div className="address-reminder">
                <span className="font_12" style={{ color: "var(--white-50)" }}>
                  Sent to: {NETWORK_ADDRESSES[selectedNetwork]}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ready to Confirm */}
        <AnimatePresence>
          {paymentStatus === "confirming" && (
            <motion.div
              className="ready-section chart_boxBg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="ready-header text-center">
                <Zap size={48} className="vector" />
                <h3 className="font_18 font_weight_600">Ready to Confirm</h3>
                <p className="font_14" style={{ color: "var(--white-50)" }}>
                  Click confirm to start payment verification
                </p>
              </div>

              <motion.button
                className="confirm-payment-button"
                onClick={handleConfirmPayment}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Shield size={18} />
                Confirm Payment
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing Payment */}
        <AnimatePresence>
          {paymentStatus === "processing" && (
            <motion.div
              className="processing-section chart_boxBg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
            >
              <div className="processing-header text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw size={48} className="vector" />
                </motion.div>
                <h3 className="font_18 font_weight_600">Processing Payment</h3>
                <p className="font_14" style={{ color: "var(--white-50)" }}>
                  Verifying your transaction on the blockchain
                </p>
              </div>

              <div className="processing-details">
                <div className="time-elapsed">
                  <span className="font_14">Time Elapsed:</span>
                  <span className="font_16 font_weight_600">
                    {Math.floor(processingTime / 60)}m {processingTime % 60}s
                  </span>
                </div>
                <div className="verification-attempts">
                  <span className="font_14">Verification Checks:</span>
                  <span className="font_16 font_weight_600">
                    {verificationAttempts}
                  </span>
                </div>
              </div>

              <div className="processing-note">
                <Clock size={16} className="vector" />
                <span className="font_12">
                  This may take up to 5 minutes. Please don't close this page.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Payment Failed */}
        <AnimatePresence>
          {paymentStatus === "failed" && (
            <motion.div
              className="failed-section chart_boxBg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="failed-header text-center">
                <AlertCircle size={48} className="error" />
                <h3 className="font_18 font_weight_600">
                  Payment Not Detected
                </h3>
                <p className="font_14" style={{ color: "var(--white-50)" }}>
                  We couldn't verify your payment within the expected time.
                </p>
              </div>

              <div className="failed-actions">
                <button
                  className="retry-button"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw size={16} />
                  Try Again
                </button>
                <button
                  className="support-button"
                  onClick={() => router.push("/support")}
                >
                  <Mail size={16} />
                  Contact Support
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Payment Success */}
        <AnimatePresence>
          {paymentStatus === "success" && (
            <motion.div
              className="success-section chart_boxBg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="success-header text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <Check size={48} className="success" />
                </motion.div>
                <h3 className="font_18 font_weight_600">Payment Confirmed!</h3>
                <p className="font_14" style={{ color: "var(--white-50)" }}>
                  Your subscription is now active. Redirecting...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security Footer */}
        <motion.div
          className="security-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="security-badge flexRow gap_8 flex_center">
            <Shield size={16} className="vector" />
            <span className="font_12">
              Secure Crypto Payment • Blockchain Verified
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
