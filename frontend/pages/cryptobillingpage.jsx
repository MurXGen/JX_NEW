// components/CryptoBilling/CryptoBillingPage.js
"use client";

import Dropdown from "@/components/ui/Dropdown";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Mail,
  RefreshCw,
  Shield,
  ShieldCheckIcon,
  Zap,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const NETWORKS = [
  { id: "erc20", name: "Ethereum (ERC20)", symbol: "ETH" },
  { id: "trc20", name: "Tron (TRC20)", symbol: "TRX" },
  { id: "bep20", name: "BSC (BEP20)", symbol: "BNB" },
  { id: "avaxc", name: "Avalanche C-Chain", symbol: "AVAX" },
  { id: "sol", name: "Solana", symbol: "SOL" },
  { id: "ton", name: "Toncoin", symbol: "TON" },
];

const NETWORK_ADDRESSES = {
  erc20: "0x3757a7076cb4eab649de3b44747f260f619ba754",
  trc20: "TP4aBJBJaRL8Qumcb9TTGxecxryQhh8LTT",
  bep20: "0x3757a7076cb4eab649de3b44747f260f619ba754",
  avaxc: "0x3757a7076cb4eab649de3b44747f260f619ba754",
  sol: "Acw24wYJFWhQyk9NR8EHdpCAr53Wsuf1X78A2UPsvWDf",
  ton: "UQAaj0aa-jfxE27qof_4pDByzX2lr9381xeaj6QZAabRUsr1",
};

export default function CryptoBillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [confirmTimer, setConfirmTimer] = useState(60); // Changed from 30 to 60 seconds
  const [paymentStatus, setPaymentStatus] = useState("selecting"); // selecting, waiting, confirming, processing, success, failed
  const [processingTime, setProcessingTime] = useState(0);
  const [cryptoOrderId, setCryptoOrderId] = useState("");
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [showModal, setShowModal] = useState(false); // New state for modal

  const planName = searchParams.get("planName");
  const period = searchParams.get("period");
  const amount = searchParams.get("amount");

  // 60-second confirmation timer (changed from 30)
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

  // 🕒 5-minute countdown timer + periodic verification
  useEffect(() => {
    if (paymentStatus === "processing") {
      const startTime = Date.now();
      const totalTime = 300; // 5 minutes = 300s
      localStorage.setItem("cryptoPaymentInitiated", startTime.toString());

      const interval = setInterval(async () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(totalTime - elapsed, 0);
        setProcessingTime(remaining); // store remaining seconds

        // ✅ Verify every 60 seconds
        if (elapsed % 60 === 0 && elapsed > 0) {
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
          } catch (err) {}
        }

        // ⏰ Timeout after 5 minutes
        if (elapsed >= totalTime) {
          clearInterval(interval);
          handlePaymentTimeout();
          setShowModal(false);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [paymentStatus]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {}
  };

  const createCryptoOrder = async () => {
    try {
      // Calculate start and expiry dates like Razorpay
      const now = new Date();
      const expiry = new Date(now);
      if (period === "yearly") expiry.setFullYear(expiry.getFullYear() + 1);
      else expiry.setMonth(expiry.getMonth() + 1);

      const response = await axios.post(
        `${API_BASE}/api/crypto-payments/create-order`,
        {
          planName,
          period,
          amount,
          network: selectedNetwork,
          currency: "USDT",
          startAt: now.toISOString(),
          expiresAt: expiry.toISOString(),
        },
        { withCredentials: true }
      );

      // Store in localStorage for later verification
      localStorage.setItem("cryptoOrderId", response.data.orderId);
      localStorage.setItem("cryptoPaymentStart", now.toISOString());
      localStorage.setItem("cryptoPaymentExpiry", expiry.toISOString());

      return response.data.orderId;
    } catch (error) {
      throw new Error("Failed to create payment order");
    }
  };

  const handlePaymentTimeout = () => {
    setPaymentStatus("failed");
    localStorage.removeItem("cryptoPaymentInitiated");
    localStorage.removeItem("cryptoOrderId");
  };

  const handleProceedToPay = () => {
    setShowModal(true);
    setPaymentStatus("waiting");
    setConfirmTimer(60); // Reset to 60 seconds
  };

  const handleVerifyPayment = async () => {
    try {
      setPaymentStatus("processing");

      const orderId = await createCryptoOrder();
      if (!orderId) throw new Error("Order ID not received from server");

      setCryptoOrderId(orderId);
      localStorage.setItem("cryptoOrderId", orderId);
      localStorage.setItem("cryptoPaymentInitiated", "true");

      // ✅ Poll every 60 seconds (changed from 10s)
      const interval = setInterval(async () => {
        try {
          const res = await axios.post(
            `${API_BASE}/api/crypto-payments/verify-payment`,
            { orderId },
            { withCredentials: true }
          );

          if (res.data.success) {
            clearInterval(interval);
            setPaymentStatus("success");
            setShowModal(false);

            router.push(
              `/subscription-success?planName=${encodeURIComponent(
                planName
              )}&period=${period}&amount=${amount}&method=crypto&orderId=${orderId}`
            );
          }
        } catch (err) {}
      }, 60000); // Changed from 10000 to 60000 (60 seconds)

      // ❌ Stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(interval);
        handlePaymentTimeout();
      }, 10 * 60 * 1000);
    } catch (err) {
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
    label: `${network.name} (${network.symbol})`,
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
                      Only send USDT on {selectedNetworkData?.name}.
                    </span>
                  </div>

                  <motion.button
                    className="button_pri flexRow gap_8 flex_center"
                    onClick={handleProceedToPay} // Changed to show modal
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Zap size={18} />
                    Proceed to pay
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal for Waiting Confirmation */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                padding: "20px",
              }}
            >
              <motion.div
                className="modal-content chart_boxBg"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{
                  maxWidth: "500px",
                  width: "100%",
                  padding: "24px",
                  borderRadius: "12px",
                }}
              >
                {paymentStatus === "waiting" && (
                  <div className="flexClm gap_12">
                    <div className="flexRow flexRow_stretch boxBg">
                      <div className="flexClm gap_4">
                        <span className="font_16 font_weight_600">
                          Waiting for Confirmation
                        </span>
                        <span
                          className="font_12"
                          style={{ color: "var(--white-50)" }}
                        >
                          Kindly make the payment to the above address
                        </span>
                      </div>
                      <div
                        className="timer-circle"
                        style={{
                          width: "80px",
                          height: "80px",
                          borderRadius: "50%",
                          border: "2px solid var(--primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span className="timer-value font_20 font_weight_700">
                          {confirmTimer}s
                        </span>
                      </div>
                    </div>
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
                          {NETWORKS.find((n) => n.id === selectedNetwork)?.name}{" "}
                          (
                          {
                            NETWORKS.find((n) => n.id === selectedNetwork)
                              ?.symbol
                          }
                          )
                        </span>
                      </div>
                      <div className="flexRow gap_8">
                        <AlertCircle size={16} className="error" />
                        <span className="font_12">
                          Send exactly{" "}
                          <u className="font_weight_600">{amount} USDT</u>{" "}
                          excluding fees
                        </span>
                      </div>

                      <div className="flexRow gap_8">
                        <AlertCircle size={16} className="error" />
                        <span className="font_12">
                          Only send USDT on {selectedNetworkData?.name}.
                        </span>
                      </div>
                    </motion.div>
                  </div>
                )}

                {paymentStatus === "confirming" && (
                  <div className="verify-section">
                    <div className="flexRow gap_12">
                      <ShieldCheckIcon size={48} className="vector" />
                      <div className="flexClm gap_4">
                        <span className="font_18 font_weight_600">
                          Verify Payment
                        </span>
                        <span
                          className="font_14"
                          style={{ color: "var(--white-50)" }}
                        >
                          Click verify to start payment verification process
                        </span>
                      </div>
                    </div>

                    <motion.button
                      className="upgrade_btn flexRow gap_8 flex_center"
                      style={{ width: "100%", marginTop: "24px" }}
                      onClick={handleVerifyPayment}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Shield size={18} />
                      Verify Payment
                    </motion.button>
                  </div>
                )}

                {paymentStatus === "processing" && (
                  <div className="flexClm gap_24">
                    {/* Progress Bar */}
                    <div
                      style={{
                        display: "flex",
                        gap: "4px",
                        width: "100%",
                        marginTop: "12px",
                      }}
                    >
                      {[0, 1, 2, 3].map((barIndex) => {
                        const elapsed = 300 - processingTime;
                        let fillPercent = 0;

                        if (barIndex === 0)
                          fillPercent = Math.min((elapsed / 30) * 100, 100);
                        else if (barIndex === 1)
                          fillPercent = Math.min(
                            ((elapsed - 30) / 30) * 100,
                            100
                          );
                        else if (barIndex === 2)
                          fillPercent = Math.min(
                            ((elapsed - 60) / 30) * 100,
                            100
                          );
                        else if (barIndex === 3)
                          fillPercent = Math.min(
                            ((elapsed - 90) / 180) * 100,
                            100
                          );

                        fillPercent = Math.max(0, Math.min(100, fillPercent));

                        return (
                          <div
                            key={barIndex}
                            style={{
                              flex: 1,
                              height: "6px",
                              background: "rgba(255,255,255,0.1)",
                              borderRadius: "4px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${fillPercent}%`,
                                background: "var(--success)",
                                transition: "width 1s linear",
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="flexRow flexRow_stretch gap_12">
                      <div className="flexClm">
                        <span className="font_18 font_weight_600">
                          Verifying Payment
                        </span>
                        <span
                          className="font_14"
                          style={{ color: "var(--white-50)" }}
                        >
                          Verifying and processing your transaction...
                        </span>
                      </div>
                      <div className="flexRow gap_12">
                        <span
                          className="font_16 font_weight_600"
                          style={{ marginLeft: "8px" }}
                        >
                          {Math.floor(processingTime / 60)}:
                          {(processingTime % 60).toString().padStart(2, "0")}
                        </span>
                        <motion.div className="spinner">
                          {/* < size={48} className="vector" /> */}
                        </motion.div>
                      </div>
                    </div>
                    <hr width={100} color="grey" />

                    <div className=" flexRow gap_8">
                      <Clock size={16} className="vector" />
                      <span className="font_12">
                        This may take up to 5 minutes. Please don't close this
                        page.
                      </span>
                    </div>
                  </div>
                )}

                {/* Close button for modal */}
                {(paymentStatus === "waiting" ||
                  paymentStatus === "confirming") && (
                  <button
                    className="button_sec"
                    style={{ width: "100%", marginTop: "12px" }}
                    onClick={() => {
                      setShowModal(false);
                      setPaymentStatus("selecting");
                    }}
                  >
                    Cancel
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Payment Failed */}
        <AnimatePresence>
          {paymentStatus === "failed" && (
            <motion.div
              className="flexClm gap_24 chart_boxBg"
              style={{ padding: "16px" }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flexClm gap_12">
                <AlertCircle size={32} className="error" />
                <div className="flexClm">
                  <span className="font_18 font_weight_600">
                    Payment Not Detected
                  </span>
                  <span
                    className="font_14"
                    style={{ color: "var(--white-50)" }}
                  >
                    We couldn't verify your payment within the expected time.
                    Contact us if you have made the payment
                  </span>
                </div>
              </div>

              <div className="flexRow gap_12">
                <button
                  className="button_sec flexRow gap_12"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw size={16} />
                  Try Again
                </button>
                <button
                  className="button_ter flexRow gap_12"
                  onClick={() => router.push("/contact")}
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
              className="flexClm gap_24 chart_boxBg"
              style={{ padding: "16px" }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flexClm gap_12">
                <Check size={32} className="success" />
                <div className="flexClm">
                  <span className="font_18 font_weight_600">
                    Payment Confirmed!
                  </span>
                  <span
                    className="font_14"
                    style={{ color: "var(--white-50)" }}
                  >
                    Your subscription is now active. You’ll be redirected
                    shortly.
                  </span>
                </div>
              </div>

              <div className="flexRow gap_12">
                <button
                  className="button_pri flexRow gap_12"
                  onClick={() => router.push("/accounts")}
                >
                  <RefreshCw size={16} />
                  Go to Dashboard
                </button>
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
