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
  ExternalLink,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const NETWORKS = [
  {
    id: "ethereum",
    name: "Ethereum (ERC20)",
    symbol: "ETH",
    address: "0x742d35Cc6634C0532925a3b8D4B99986b2b2a1b2",
    explorer: "https://etherscan.io/address/",
    fee: "Moderate",
    speed: "2-5 mins",
  },
  {
    id: "tron",
    name: "Tron (TRC20)",
    symbol: "TRX",
    address: "TQrQFddwvj8CJd8V8VpVbVbV8V8V8V8V8V8",
    explorer: "https://tronscan.org/#/address/",
    fee: "Low",
    speed: "1-3 mins",
  },
  {
    id: "bsc",
    name: "BSC (BEP20)",
    symbol: "BNB",
    address: "0x742d35Cc6634C0532925a3b8D4B99986b2b2a1b2",
    explorer: "https://bscscan.com/address/",
    fee: "Low",
    speed: "1-3 mins",
  },
  {
    id: "avax",
    name: "Avalanche (AVAX C-Chain)",
    symbol: "AVAX",
    address: "0x742d35Cc6634C0532925a3b8D4B99986b2b2a1b2",
    explorer: "https://snowtrace.io/address/",
    fee: "Low",
    speed: "2-5 mins",
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    address: "7Q4af7R7f7z7f7z7f7z7f7z7f7z7f7z7f7z7f7z7f7",
    explorer: "https://explorer.solana.com/address/",
    fee: "Very Low",
    speed: "< 1 min",
  },
  {
    id: "ton",
    name: "TON",
    symbol: "TON",
    address: "EQD__________________________________________bo",
    explorer: "https://tonscan.org/address/",
    fee: "Low",
    speed: "1-3 mins",
  },
];

export default function CryptoBillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const planName = searchParams.get("planName");
  const period = searchParams.get("period");
  const amount = searchParams.get("amount");

  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [step, setStep] = useState(1); // 1: Select network, 2: Payment, 3: Confirmation
  const [paymentTimer, setPaymentTimer] = useState(30);
  const [confirmationTimer, setConfirmationTimer] = useState(300); // 5 minutes
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderId, setOrderId] = useState(null);

  // Payment timer
  useEffect(() => {
    if (step === 2 && paymentTimer > 0) {
      const timer = setTimeout(() => setPaymentTimer(paymentTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === 2 && paymentTimer === 0) {
      // Auto-advance to payment confirmation
      handleIPaidClick();
    }
  }, [step, paymentTimer]);

  // Confirmation timer
  useEffect(() => {
    if (step === 3 && confirmationTimer > 0) {
      const timer = setTimeout(
        () => setConfirmationTimer(confirmationTimer - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [step, confirmationTimer]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleNetworkSelect = (network) => {
    setSelectedNetwork(network);
    setStep(2);
  };

  const handleIPaidClick = async () => {
    setIsProcessing(true);

    try {
      // Create crypto order in database
      const response = await axios.post(
        `${API_BASE}/api/payments/create-crypto-order`,
        {
          planName,
          period,
          amount,
          network: selectedNetwork.id,
          walletAddress: selectedNetwork.address,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        setOrderId(response.data.orderId);
        setOrderCreated(true);
        setStep(3);
      }
    } catch (error) {
      console.error("Failed to create order:", error);
      alert("Failed to process your payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecheckPayment = async () => {
    // In a real app, this would check blockchain for transaction
    alert(
      "Payment status checked. If you've sent the payment, it should be confirmed shortly."
    );
  };

  const handleBackClick = () => {
    router.push("/profile");
  };

  return (
    <div className="crypto-billing-page">
      <div className="flexClm gap_32">
        {/* Header */}
        <div className="flexRow gap_12">
          <button className="button_sec flexRow" onClick={handleBackClick}>
            <ArrowLeft size={20} />
          </button>
          <div className="flexClm">
            <span className="font_20">Choose network</span>
            <span className="font_12">Pay with what suits you</span>
          </div>
        </div>

        {/* Progress Steps */}
        <motion.div
          className="progress-steps"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="steps-container">
            <div className={`step ${step >= 1 ? "active" : ""}`}>
              <div className="step-number">1</div>
              <span className="step-label font_12">Select Network</span>
            </div>
            <div className={`step ${step >= 2 ? "active" : ""}`}>
              <div className="step-number">2</div>
              <span className="step-label font_12">Make Payment</span>
            </div>
            <div className={`step ${step >= 3 ? "active" : ""}`}>
              <div className="step-number">3</div>
              <span className="step-label font_12">Confirmation</span>
            </div>
          </div>
        </motion.div>

        {/* Step 1: Network Selection */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="step-content"
            >
              <div className="flexClm gap_8">
                <span className="font_18 font_weight_600">Select Network</span>
                <span className="font_12" style={{ color: "var(--white-50)" }}>
                  Choose your preferred blockchain network
                </span>
              </div>

              <div className="flexClm gap_12">
                {NETWORKS.map((network) => (
                  <motion.button
                    key={network.id}
                    className={`button_sec ${
                      selectedNetwork?.id === network.id ? "selected" : ""
                    }`}
                    onClick={() => handleNetworkSelect(network)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="">
                      <div className="network-icon">
                        <Zap size={20} />
                      </div>
                      <div className="network-info">
                        <span className="network-name font_14 font_weight_600">
                          {network.name}
                        </span>
                        <span className="network-symbol font_12">
                          {network.symbol}
                        </span>
                      </div>
                    </div>

                    <div className="network-details">
                      <div className="detail-item">
                        <span className="font_10">Fee:</span>
                        <span className="font_10 font_weight_600">
                          {network.fee}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="font_10">Speed:</span>
                        <span className="font_10 font_weight_600">
                          {network.speed}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="security-notice">
                <Shield size={16} className="vector" />
                <span className="font_12">
                  All transactions are secure and encrypted
                </span>
              </div>
            </motion.div>
          )}

          {/* Step 2: Payment Details */}
          {step === 2 && selectedNetwork && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="step-content"
            >
              <div className="step-header">
                <h2 className="font_18 font_weight_600">Send Payment</h2>
                <p className="font_12" style={{ color: "var(--white-50)" }}>
                  Send exact amount to the address below
                </p>
              </div>

              {/* Timer */}
              <div className="payment-timer">
                <Clock size={20} className="vector" />
                <div className="timer-content">
                  <span className="font_14 font_weight_600">
                    {formatTime(paymentTimer)}
                  </span>
                  <span
                    className="font_12"
                    style={{ color: "var(--white-50)" }}
                  >
                    Address expires in
                  </span>
                </div>
              </div>

              {/* Amount Card */}
              <div className="amount-card chart_boxBg">
                <div className="amount-header">
                  <span className="font_14">Amount to Send</span>
                  <span className="font_16 font_weight_700 success">
                    {amount} USDT
                  </span>
                </div>
                <div className="network-info">
                  <span className="font_12">Network:</span>
                  <span className="font_12 font_weight_600">
                    {selectedNetwork.name}
                  </span>
                </div>
              </div>

              {/* Wallet Address */}
              <div className="address-card chart_boxBg">
                <div className="address-header">
                  <span className="font_14 font_weight_600">
                    Wallet Address
                  </span>
                  <button
                    className="copy-button"
                    onClick={() => copyToClipboard(selectedNetwork.address)}
                  >
                    {copiedAddress ? (
                      <Check size={16} className="success" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>

                <div className="address-display">
                  <code className="address-text font_12">
                    {selectedNetwork.address}
                  </code>
                </div>

                <a
                  href={`${selectedNetwork.explorer}${selectedNetwork.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link flexRow gap_8"
                >
                  <ExternalLink size={14} />
                  <span className="font_12">View on Explorer</span>
                </a>
              </div>

              {/* Important Notes */}
              <div className="notes-card">
                <AlertCircle size={16} className="vector" />
                <div className="notes-content">
                  <span className="font_12 font_weight_600">Important:</span>
                  <ul
                    className="notes-list font_12"
                    style={{ color: "var(--white-50)" }}
                  >
                    <li>Send exact amount of {amount} USDT</li>
                    <li>Use only {selectedNetwork.name} network</li>
                    <li>Do not send other cryptocurrencies</li>
                    <li>Transaction may take 2-5 minutes to confirm</li>
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <motion.button
                className="confirm-payment-button"
                onClick={handleIPaidClick}
                disabled={isProcessing}
                whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                whileTap={{ scale: isProcessing ? 1 : 0.98 }}
              >
                {isProcessing ? (
                  <>
                    <div className="spinner"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Check size={18} />I Have Paid
                  </>
                )}
              </motion.button>
            </motion.div>
          )}

          {/* Step 3: Payment Confirmation */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="step-content"
            >
              <div className="step-header text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="success-icon"
                >
                  <Check size={48} className="success" />
                </motion.div>
                <h2 className="font_18 font_weight_600">Payment Received!</h2>
                <p className="font_12" style={{ color: "var(--white-50)" }}>
                  We're confirming your transaction on the blockchain
                </p>
              </div>

              {/* Order Details */}
              <div className="order-details-card chart_boxBg">
                <div className="order-header">
                  <span className="font_14 font_weight_600">Order Details</span>
                  {orderId && (
                    <span
                      className="font_10"
                      style={{ color: "var(--white-50)" }}
                    >
                      ID: {orderId}
                    </span>
                  )}
                </div>

                <div className="order-info">
                  <div className="info-row">
                    <span>Plan:</span>
                    <span className="font_weight_600">{planName}</span>
                  </div>
                  <div className="info-row">
                    <span>Amount:</span>
                    <span className="font_weight_600 success">
                      {amount} USDT
                    </span>
                  </div>
                  <div className="info-row">
                    <span>Network:</span>
                    <span className="font_weight_600">
                      {selectedNetwork?.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confirmation Timer */}
              <div className="confirmation-timer">
                <Clock size={20} className="vector" />
                <div className="timer-content">
                  <span className="font_14 font_weight_600">
                    {formatTime(confirmationTimer)}
                  </span>
                  <span
                    className="font_12"
                    style={{ color: "var(--white-50)" }}
                  >
                    Confirmation pending
                  </span>
                </div>
              </div>

              {/* Status Message */}
              <div className="status-message">
                <RefreshCw size={16} className="vector" />
                <div className="message-content">
                  <span className="font_12 font_weight_600">
                    Processing Transaction
                  </span>
                  <span
                    className="font_10"
                    style={{ color: "var(--white-50)" }}
                  >
                    This may take up to 5 minutes. You'll be redirected
                    automatically.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="confirmation-actions">
                <motion.button
                  className="recheck-button"
                  onClick={handleRecheckPayment}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <RefreshCw size={16} />
                  Recheck Payment Status
                </motion.button>

                <button
                  className="support-button"
                  onClick={() => router.push("/support")}
                >
                  Need Help? Contact Support
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
