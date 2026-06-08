"use client";

/* Subscription success — v2 redesign. Theme-aware, token-based.
   Keeps the confetti burst + auto-redirect and the order summary. */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Crown,
  ShieldCheck,
} from "lucide-react";
import Cookies from "js-cookie";
import FullPageLoader from "@/components/ui/FullPageLoader";

export default function SubscriptionSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderDetails, setOrderDetails] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const isVerified = Cookies.get("isVerified");
    if (!isVerified || isVerified !== "yes") router.replace("/login");
    else setChecking(false);
  }, [router]);

  // 🎊 confetti burst, then redirect to the dashboard
  useEffect(() => {
    if (checking) return;
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        router.push("/dashboard");
        return;
      }
      confetti({
        ...defaults,
        particleCount: 5 + Math.random() * 5,
        origin: { x: Math.random(), y: 0 },
      });
    }, 250);
    return () => clearInterval(interval);
  }, [checking, router]);

  useEffect(() => {
    setOrderDetails({
      planName: searchParams.get("planName") || "Pro Plan",
      period: searchParams.get("period") || "monthly",
      amount: searchParams.get("amount") || "0",
      orderId: searchParams.get("orderId") || "N/A",
      paymentMethod: searchParams.get("method") || "crypto",
      isLifetime: searchParams.get("isLifetime") === "true",
    });
  }, [searchParams]);

  if (checking) return <FullPageLoader />;

  const card = {
    background: "var(--color-bg-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-6)",
  };
  const muted = { color: "var(--color-text-muted)" };
  const amountLabel =
    orderDetails?.paymentMethod === "crypto"
      ? `${orderDetails?.amount || "0"} USDT`
      : `${orderDetails?.amount || "0"}`;

  const Row = ({ label, value, strong }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
      <span style={{ font: "var(--text-small)", ...muted }}>{label}</span>
      <span style={{ font: strong ? "var(--text-body-md)" : "var(--text-small)", fontWeight: 600, textAlign: "right", textTransform: label === "Plan" || label === "Billing" ? "capitalize" : "none" }}>
        {value}
      </span>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg-canvas)", fontFamily: "var(--jx-font)", color: "var(--color-text-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring" }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "var(--space-3)" }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.15 }}
            style={{ width: 88, height: 88, borderRadius: "50%", background: "var(--color-success-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <CheckCircle2 size={52} style={{ color: "var(--color-success)" }} />
          </motion.div>
          <span style={{ font: "var(--text-h2)", fontWeight: 700 }}>Payment confirmed 🎉</span>
          <span style={{ font: "var(--text-body)", ...muted, maxWidth: 360 }}>
            Your subscription is now active. Get ready to transform your trading.
          </span>
        </motion.div>

        {/* Order summary */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
            <span style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--color-primary-subtle)", color: "var(--yellow-500)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Crown size={20} />
            </span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>Order confirmed</span>
              <span style={{ font: "var(--text-caption)", ...muted, wordBreak: "break-all" }}>
                Order ID: {orderDetails?.orderId}
              </span>
            </div>
          </div>

          <Row label="Plan" value={orderDetails?.planName} />
          <Row label="Billing" value={orderDetails?.isLifetime ? "One-time · lifetime" : orderDetails?.period} />
          <Row label="Payment method" value={(orderDetails?.paymentMethod || "").toUpperCase()} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12 }}>
            <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>Amount paid</span>
            <span style={{ font: "var(--text-h3)", fontWeight: 700, color: "var(--color-success-strong)" }}>{amountLabel}</span>
          </div>
        </motion.div>

        {/* Trust + CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-5)", flexWrap: "wrap", font: "var(--text-caption)", ...muted }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={15} style={{ color: "var(--color-success)" }} /> Secure payment
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={15} style={{ color: "var(--color-success)" }} /> Instant activation
            </span>
          </div>

          <button className="jx-btn jx-btn--primary" onClick={() => router.push("/accounts")} style={{ width: "100%", justifyContent: "center" }}>
            Go to dashboard <ArrowRight size={17} />
          </button>
          <button className="jx-btn jx-btn--ghost jx-btn--sm" onClick={() => router.push("/contact")} style={{ alignSelf: "center" }}>
            Need help? Contact support
          </button>
        </motion.div>
      </div>
    </div>
  );
}
