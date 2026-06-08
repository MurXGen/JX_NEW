"use client";

/* Crypto checkout — v2 redesign.
   Logic (order creation, verification polling, timers, localStorage) is
   unchanged; only the UI/UX and styling were rebuilt on the design tokens
   so it's polished and theme-aware. */

import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const NETWORKS = [
  { id: "erc20", name: "Ethereum", tag: "ERC20", symbol: "ETH", color: "#627eea" },
  { id: "trc20", name: "Tron", tag: "TRC20", symbol: "TRX", color: "#ef0027" },
  { id: "bep20", name: "BNB Smart Chain", tag: "BEP20", symbol: "BNB", color: "#f0b90b" },
  { id: "avaxc", name: "Avalanche", tag: "C-Chain", symbol: "AVAX", color: "#e84142" },
  { id: "sol", name: "Solana", tag: "SOL", symbol: "SOL", color: "#14f195" },
  { id: "ton", name: "Toncoin", tag: "TON", symbol: "TON", color: "#0098ea" },
];

const NETWORK_ADDRESSES = {
  erc20: "0x26013fc3db5eac1c4ff6cf28a107eca908f2f35f",
  trc20: "TV1R4rhR8xJYZD1axRiKoHN2bAsn8SJwaN",
  bep20: "0x26013fc3db5eac1c4ff6cf28a107eca908f2f35f",
  avaxc: "0x26013fc3db5eac1c4ff6cf28a107eca908f2f35f",
  sol: "bvy3Ye5ZDMfpGDkwpnKSAbBbPybWJfaEYQkK3w8DcZt",
  ton: "UQAGm_9b3_y6hjIshL2A-XZ36Cp7RW_tOX3NoVnxdOA94S-Z",
};

export default function CryptoBillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [confirmTimer, setConfirmTimer] = useState(60);
  const [paymentStatus, setPaymentStatus] = useState("selecting");
  const [processingTime, setProcessingTime] = useState(0);
  const [cryptoOrderId, setCryptoOrderId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [planData, setPlanData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const planName = searchParams.get("planName");
  const period = searchParams.get("period");
  const amount = searchParams.get("amount");

  useEffect(() => {
    if (!planName || !period || !amount) {
      router.push("/pricing");
      return;
    }
    setPlanData({ planName, period, amount });
  }, [planName, period, amount, router]);

  const getPlanDisplayName = () => {
    if (!planData) return "";
    const { planName, period } = planData;
    if (period === "lifetime" || planName === "Lifetime") return "Lifetime Access";
    if (period === "monthly") return `${planName} Monthly`;
    if (period === "yearly") return `${planName} Yearly`;
    return `${planName} Plan`;
  };

  // 60-second confirmation timer
  useEffect(() => {
    if (paymentStatus === "waiting" && confirmTimer > 0) {
      const timer = setTimeout(() => setConfirmTimer(confirmTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (paymentStatus === "waiting" && confirmTimer === 0) {
      setPaymentStatus("confirming");
    }
  }, [paymentStatus, confirmTimer]);

  // 5-minute countdown + periodic verification
  useEffect(() => {
    if (paymentStatus === "processing") {
      const startTime = Date.now();
      const totalTime = 300;
      localStorage.setItem("cryptoPaymentInitiated", startTime.toString());

      const interval = setInterval(async () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(totalTime - elapsed, 0);
        setProcessingTime(remaining);

        if (elapsed % 10 === 0 && elapsed > 0) {
          try {
            const storedOrderId = localStorage.getItem("cryptoOrderId");
            if (!storedOrderId) return;
            const res = await axios.post(
              `${API_BASE}/api/crypto-payments/verify-payment`,
              { orderId: storedOrderId },
              { withCredentials: true },
            );
            if (res.data.success) {
              clearInterval(interval);
              setPaymentStatus("success");
              const params = new URLSearchParams({
                planName: planData?.planName || "",
                period: planData?.period || "",
                amount: planData?.amount || "",
                method: "crypto",
                orderId: storedOrderId,
                isLifetime: planData?.period === "lifetime" ? "true" : "false",
              }).toString();
              router.push(`/subscription-success?${params}`);
            }
          } catch (err) {
            console.error("Verification error:", err);
          }
        }

        if (elapsed >= totalTime) {
          clearInterval(interval);
          handlePaymentTimeout();
          setShowModal(false);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [paymentStatus, planData, router]);

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
    if (!planData) throw new Error("Plan data not available");
    const { planName, period, amount } = planData;
    const now = new Date();
    let expiry = new Date(now);
    if (period === "lifetime") expiry.setFullYear(expiry.getFullYear() + 100);
    else if (period === "yearly") expiry.setFullYear(expiry.getFullYear() + 1);
    else expiry.setMonth(expiry.getMonth() + 1);

    const requestData = {
      planName,
      period,
      amount,
      network: selectedNetwork,
      currency: "USDT",
      startAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
    };

    try {
      const response = await axios.post(
        `${API_BASE}/api/crypto-payments/create-order`,
        requestData,
        { withCredentials: true, headers: { "Content-Type": "application/json" } },
      );
      if (!response.data.success) throw new Error(response.data.message || "Failed to create order");

      localStorage.setItem("cryptoOrderId", response.data.orderId);
      localStorage.setItem("cryptoPaymentStart", now.toISOString());
      localStorage.setItem("cryptoPaymentExpiry", expiry.toISOString());
      localStorage.setItem("isLifetimePlan", period === "lifetime" ? "true" : "false");
      return response.data.orderId;
    } catch (error) {
      let errorMsg = "Failed to create payment order";
      if (error.response) errorMsg = error.response.data?.message || `Server error: ${error.response.status}`;
      else if (error.request) errorMsg = "No response from server. Please check your connection.";
      setErrorMessage(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const handlePaymentTimeout = () => {
    setPaymentStatus("failed");
    localStorage.removeItem("cryptoPaymentInitiated");
    localStorage.removeItem("cryptoOrderId");
    localStorage.removeItem("isLifetimePlan");
  };

  const handleProceedToPay = () => {
    if (!selectedNetwork) {
      setErrorMessage("Please select a network first.");
      return;
    }
    setErrorMessage("");
    setShowModal(true);
    setPaymentStatus("waiting");
    setConfirmTimer(10);
  };

  const handleVerifyPayment = async () => {
    try {
      setPaymentStatus("processing");
      setErrorMessage("");
      const orderId = await createCryptoOrder();
      if (!orderId) throw new Error("Order ID not received from server");

      setCryptoOrderId(orderId);
      localStorage.setItem("cryptoOrderId", orderId);
      localStorage.setItem("cryptoPaymentInitiated", "true");

      const interval = setInterval(async () => {
        try {
          const res = await axios.post(
            `${API_BASE}/api/crypto-payments/verify-payment`,
            { orderId },
            { withCredentials: true },
          );
          if (res.data.success) {
            clearInterval(interval);
            setPaymentStatus("success");
            setShowModal(false);
            const params = new URLSearchParams({
              planName: planData?.planName || "",
              period: planData?.period || "",
              amount: planData?.amount || "",
              method: "crypto",
              orderId,
              isLifetime: planData?.period === "lifetime" ? "true" : "false",
            }).toString();
            router.push(`/subscription-success?${params}`);
          }
        } catch (err) {
          console.error("Polling verification error:", err);
        }
      }, 60000);

      setTimeout(() => {
        clearInterval(interval);
        handlePaymentTimeout();
      }, 10 * 60 * 1000);
    } catch (err) {
      console.error("Payment verification failed:", err);
      setErrorMessage(err.message);
      setPaymentStatus("failed");
    }
  };

  const selectedNetworkData = NETWORKS.find((n) => n.id === selectedNetwork);
  const address = selectedNetwork ? NETWORK_ADDRESSES[selectedNetwork] : "";

  // shared style atoms
  const card = {
    background: "var(--color-bg-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-6)",
  };
  const muted = { color: "var(--color-text-muted)" };

  if (!planData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontFamily: "var(--jx-font)" }}>
        <Loader2 size={20} className="jx-spin" /> &nbsp;Loading checkout…
      </div>
    );
  }

  const NetworkBadge = ({ n, size = 34 }) => (
    <span
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: `${n.color}22`, color: n.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        font: "700 11px var(--jx-font)",
      }}
    >
      {n.symbol}
    </span>
  );

  const Step = ({ n, label, active, done }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: active || done ? 1 : 0.5 }}>
      <span
        style={{
          width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          font: "600 12px var(--jx-font)",
          background: done ? "var(--color-success)" : active ? "var(--color-primary)" : "var(--color-bg-muted)",
          color: done ? "#fff" : active ? "var(--color-primary-foreground)" : "var(--color-text-muted)",
        }}
      >
        {done ? <Check size={13} /> : n}
      </span>
      <span style={{ font: "var(--text-small)", fontWeight: active ? 600 : 400, color: active || done ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
        {label}
      </span>
    </div>
  );

  const step = paymentStatus === "selecting" ? (selectedNetwork ? 2 : 1) : 3;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg-canvas)", fontFamily: "var(--jx-font)", color: "var(--color-text-primary)" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 16px 96px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
          <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={() => router.push("/pricing")} aria-label="Back" style={{ padding: 9 }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>Complete your payment</span>
            <span style={{ font: "var(--text-small)", ...muted }}>Pay with USDT — fast, low fees, no card needed.</span>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap", marginBottom: "var(--space-6)" }}>
          <Step n={1} label="Choose network" active={step === 1} done={step > 1} />
          <span style={{ flex: 1, height: 1, minWidth: 16, background: "var(--color-border)" }} />
          <Step n={2} label="Send USDT" active={step === 2} done={step > 2} />
          <span style={{ flex: 1, height: 1, minWidth: 16, background: "var(--color-border)" }} />
          <Step n={3} label="Verify" active={step === 3} done={paymentStatus === "success"} />
        </div>

        {errorMessage && paymentStatus !== "processing" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--space-4)",
              padding: "12px 16px", borderRadius: "var(--radius-md)",
              background: "var(--color-danger-subtle)", border: "1px solid var(--color-danger)",
              color: "var(--color-danger-strong)", font: "var(--text-small)",
            }}
          >
            <AlertCircle size={16} /> {errorMessage}
          </motion.div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: "var(--space-5)", alignItems: "start" }} className="cb-grid">
          {/* LEFT — network + deposit */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <div style={card}>
              <div style={{ font: "var(--text-title)", fontWeight: 600, marginBottom: 4 }}>Select network</div>
              <div style={{ font: "var(--text-small)", ...muted, marginBottom: "var(--space-4)" }}>
                Choose the blockchain you&apos;ll send USDT on. Sending on the wrong network can lose your funds.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-3)" }}>
                {NETWORKS.map((n) => {
                  const on = selectedNetwork === n.id;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setSelectedNetwork(n.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                        padding: "12px 14px", borderRadius: "var(--radius-md)", cursor: "pointer",
                        background: on ? "var(--color-primary-subtle)" : "var(--color-bg-surface)",
                        border: `1.5px solid ${on ? "var(--color-primary)" : "var(--color-border)"}`,
                        color: "var(--color-text-primary)", transition: "all .15s ease",
                      }}
                    >
                      <NetworkBadge n={n} />
                      <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                        <span style={{ font: "var(--text-body-md)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.name}</span>
                        <span style={{ font: "var(--text-caption)", ...muted }}>{n.tag}</span>
                      </span>
                      {on && <Check size={16} style={{ color: "var(--yellow-500)", flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence>
              {selectedNetwork && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  style={card}
                >
                  <div style={{ font: "var(--text-title)", fontWeight: 600, marginBottom: "var(--space-4)" }}>
                    Send <span style={{ color: "var(--yellow-600)" }}>{planData.amount} USDT</span> to this address
                  </div>

                  <div style={{ display: "flex", gap: "var(--space-5)", alignItems: "center", flexWrap: "wrap" }}>
                    {/* Currency / network logo */}
                    {selectedNetworkData && (
                      <div
                        style={{
                          flexShrink: 0, width: 150, height: 150, borderRadius: "var(--radius-lg)",
                          background: `${selectedNetworkData.color}14`,
                          border: `1px solid ${selectedNetworkData.color}33`,
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 64, height: 64, borderRadius: "50%",
                            background: `${selectedNetworkData.color}22`, color: selectedNetworkData.color,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            font: "800 18px var(--jx-font)",
                          }}
                        >
                          {selectedNetworkData.symbol}
                        </span>
                        <span style={{ font: "var(--text-body-md)", fontWeight: 600, color: "var(--color-text-primary)" }}>USDT</span>
                        <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                          on {selectedNetworkData.tag}
                        </span>
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--text-caption)", ...muted }}>
                        <NetworkBadge n={selectedNetworkData} size={22} />
                        USDT on {selectedNetworkData?.name} ({selectedNetworkData?.tag})
                      </div>
                      <div
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          background: "var(--color-bg-muted)", border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)", padding: "10px 12px",
                        }}
                      >
                        <code style={{ flex: 1, font: "var(--text-caption)", wordBreak: "break-all", color: "var(--color-text-primary)" }}>
                          {address}
                        </code>
                        <button
                          className="jx-btn jx-btn--secondary jx-btn--sm"
                          onClick={() => copyToClipboard(address)}
                          style={{ flexShrink: 0, padding: 8 }}
                          aria-label="Copy address"
                        >
                          {copiedAddress ? <Check size={15} style={{ color: "var(--color-success)" }} /> : <Copy size={15} />}
                        </button>
                      </div>

                      <div
                        style={{
                          display: "flex", flexDirection: "column", gap: 8,
                          background: "var(--color-danger-subtle)",
                          border: "1px solid var(--color-danger)",
                          borderRadius: "var(--radius-md)", padding: "12px 14px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--text-caption)", fontWeight: 700, color: "var(--color-danger-strong)" }}>
                          <AlertCircle size={15} style={{ flexShrink: 0 }} /> Read before sending — transfers are irreversible
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
                          <li style={{ font: "var(--text-caption)", color: "var(--color-text-secondary)" }}>
                            Send <strong>USDT only</strong> on the <strong>{selectedNetworkData?.name} ({selectedNetworkData?.tag})</strong> network. Any other coin or network will be permanently lost.
                          </li>
                          <li style={{ font: "var(--text-caption)", color: "var(--color-text-secondary)" }}>
                            Send <strong>at least {planData.amount} USDT</strong> — you cover the network fee, so the amount we receive must equal {planData.amount} USDT.
                          </li>
                          <li style={{ font: "var(--text-caption)", color: "var(--color-text-secondary)" }}>
                            <strong>Double-check the full address</strong> — copy it with the button, don&apos;t type it by hand.
                          </li>
                          <li style={{ font: "var(--text-caption)", color: "var(--color-text-secondary)" }}>
                            Sent to the wrong address or network? It cannot be recovered or refunded.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {paymentStatus === "selecting" && (
                    <motion.button
                      className="jx-btn jx-btn--primary"
                      onClick={handleProceedToPay}
                      whileTap={{ scale: 0.98 }}
                      style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-5)" }}
                    >
                      <Zap size={17} /> I&apos;ve sent the payment
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Failed / success inline (when modal closed) */}
            <AnimatePresence>
              {paymentStatus === "failed" && (
                <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} style={card}>
                  <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                    <AlertCircle size={28} style={{ color: "var(--color-danger)", flexShrink: 0 }} />
                    <div>
                      <div style={{ font: "var(--text-title)", fontWeight: 600 }}>Payment not detected yet</div>
                      <div style={{ font: "var(--text-small)", ...muted }}>
                        {errorMessage || "We couldn't verify your payment in time. If you've already sent it, contact us and we'll activate your plan."}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                    <button className="jx-btn jx-btn--secondary" onClick={() => { setPaymentStatus("selecting"); setErrorMessage(""); }}>
                      <RefreshCw size={15} /> Try again
                    </button>
                    <button className="jx-btn jx-btn--outline" onClick={() => router.push("/contact")}>
                      <Mail size={15} /> Contact support
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT — order summary */}
          <div style={{ ...card, position: "sticky", top: 20 }}>
            <div style={{ font: "var(--text-caption)", textTransform: "uppercase", letterSpacing: 0.5, ...muted, marginBottom: "var(--space-3)" }}>
              Order summary
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <span style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--color-primary-subtle)", color: "var(--yellow-500)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Wallet size={20} />
              </span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{getPlanDisplayName()}</span>
                <span style={{ font: "var(--text-caption)", ...muted }}>
                  {planData.period === "lifetime" ? "One-time payment · never expires" : `Billed ${planData.period}`}
                </span>
              </div>
            </div>

            <div style={{ height: 1, background: "var(--color-border)", margin: "var(--space-4) 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", font: "var(--text-small)", marginBottom: 8 }}>
              <span style={muted}>Subtotal</span>
              <span>{planData.amount} USDT</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", font: "var(--text-small)", marginBottom: "var(--space-4)" }}>
              <span style={muted}>Network fee</span>
              <span style={muted}>Paid by you</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>Total</span>
              <span style={{ font: "var(--text-h3)", fontWeight: 700, color: "var(--color-success-strong)" }}>{planData.amount} USDT</span>
            </div>

            {planData.period === "lifetime" && (
              <div style={{ display: "flex", gap: 8, marginTop: "var(--space-4)", padding: "10px 12px", background: "var(--color-success-subtle)", borderRadius: "var(--radius-md)" }}>
                <Check size={15} style={{ color: "var(--color-success-strong)", flexShrink: 0, marginTop: 2 }} />
                <span style={{ font: "var(--text-caption)", color: "var(--color-success-strong)" }}>
                  Includes all current and future features, forever.
                </span>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "var(--space-5)", font: "var(--text-caption)", ...muted }}>
              <ShieldCheck size={15} style={{ color: "var(--color-success)" }} /> Secured & verified on-chain
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modal ===== */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="jx-modal-overlay jx-modal-overlay--blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && (paymentStatus === "waiting" || paymentStatus === "confirming")) {
                setShowModal(false);
                setPaymentStatus("selecting");
                setErrorMessage("");
              }
            }}
          >
            <motion.div
              className="jx-ltmodal jx-ltmodal--narrow"
              style={{ width: "min(480px, 96vw)", padding: "var(--space-6)" }}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
            >
              {paymentStatus === "waiting" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <span style={{ width: 56, height: 56, borderRadius: "50%", border: "3px solid var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", font: "700 16px var(--jx-font)", flexShrink: 0 }}>
                      {confirmTimer}s
                    </span>
                    <div>
                      <div style={{ font: "var(--text-title)", fontWeight: 600 }}>Confirm your transfer</div>
                      <div style={{ font: "var(--text-small)", ...muted }}>Make sure you&apos;ve sent {planData.amount} USDT to the address.</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--color-bg-muted)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
                    <code style={{ flex: 1, font: "var(--text-caption)", wordBreak: "break-all" }}>{address}</code>
                    <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={() => copyToClipboard(address)} style={{ padding: 8 }}>
                      {copiedAddress ? <Check size={15} style={{ color: "var(--color-success)" }} /> : <Copy size={15} />}
                    </button>
                  </div>
                  <button
                    className="jx-btn jx-btn--secondary"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => { setShowModal(false); setPaymentStatus("selecting"); setErrorMessage(""); }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {paymentStatus === "confirming" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", textAlign: "center", alignItems: "center" }}>
                  <span style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--color-primary-subtle)", color: "var(--yellow-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShieldCheck size={28} />
                  </span>
                  <div>
                    <div style={{ font: "var(--text-title)", fontWeight: 600 }}>Ready to verify</div>
                    <div style={{ font: "var(--text-small)", ...muted, maxWidth: 320 }}>
                      We&apos;ll check the blockchain and confirm your deposit. This can take a few minutes.
                    </div>
                  </div>
                  <button className="jx-btn jx-btn--primary" style={{ width: "100%", justifyContent: "center" }} onClick={handleVerifyPayment}>
                    <Shield size={17} /> Verify payment
                  </button>
                  <button
                    className="jx-btn jx-btn--ghost jx-btn--sm"
                    onClick={() => { setShowModal(false); setPaymentStatus("selecting"); setErrorMessage(""); }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {paymentStatus === "processing" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 1, 2, 3].map((bi) => {
                      const elapsed = 300 - processingTime;
                      let fill = 0;
                      if (bi === 0) fill = (elapsed / 30) * 100;
                      else if (bi === 1) fill = ((elapsed - 30) / 30) * 100;
                      else if (bi === 2) fill = ((elapsed - 60) / 30) * 100;
                      else fill = ((elapsed - 90) / 180) * 100;
                      fill = Math.max(0, Math.min(100, fill));
                      return (
                        <div key={bi} style={{ flex: 1, height: 6, background: "var(--color-bg-muted)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${fill}%`, background: "var(--color-success)", transition: "width 1s linear" }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
                    <div>
                      <div style={{ font: "var(--text-title)", fontWeight: 600 }}>Verifying payment…</div>
                      <div style={{ font: "var(--text-small)", ...muted }}>Checking the blockchain for your deposit.</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>
                        {Math.floor(processingTime / 60)}:{(processingTime % 60).toString().padStart(2, "0")}
                      </span>
                      <Loader2 size={18} className="jx-spin" style={{ color: "var(--yellow-500)" }} />
                    </div>
                  </div>
                  <div style={{ height: 1, background: "var(--color-border)" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--text-caption)", ...muted }}>
                    <Clock size={14} /> This may take up to 5 minutes — please keep this page open.
                  </div>
                  {errorMessage && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--color-danger-subtle)", borderRadius: "var(--radius-md)", font: "var(--text-caption)", color: "var(--color-danger-strong)" }}>
                      <AlertCircle size={14} /> {errorMessage}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* success inline (in case redirect is delayed) */}
      <AnimatePresence>
        {paymentStatus === "success" && (
          <motion.div
            className="jx-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div className="jx-ltmodal jx-ltmodal--narrow" style={{ width: "min(420px, 96vw)", padding: "var(--space-8)", textAlign: "center" }} initial={{ scale: 0.95 }} animate={{ scale: 1 }}>
              <CheckCircle2 size={48} style={{ color: "var(--color-success)", margin: "0 auto" }} />
              <div style={{ font: "var(--text-h3)", fontWeight: 700, marginTop: "var(--space-3)" }}>Payment confirmed!</div>
              <div style={{ font: "var(--text-body)", ...muted, marginTop: 6 }}>
                Your {getPlanDisplayName()} subscription is now active.
              </div>
              <button className="jx-btn jx-btn--primary" style={{ marginTop: "var(--space-5)", width: "100%", justifyContent: "center" }} onClick={() => router.push("/accounts")}>
                Go to dashboard
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .jx-spin { animation: jx-spin 0.9s linear infinite; }
        @keyframes jx-spin { to { transform: rotate(360deg); } }
        @media (max-width: 760px) {
          .cb-grid { grid-template-columns: 1fr !important; }
          .cb-grid > div:last-child { position: static !important; }
        }
      `}</style>
    </div>
  );
}
