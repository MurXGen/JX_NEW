"use client";

/* Subscription failed — v2 redesign. Theme-aware, token-based. */

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CreditCard,
  Mail,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

export default function SubscriptionFailed() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorMessage =
    searchParams.get("message") ||
    "We couldn't confirm your payment. If you've already sent it, contact us and we'll activate your plan.";

  const card = {
    background: "var(--color-bg-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-6)",
  };
  const muted = { color: "var(--color-text-muted)" };

  const reasons = [
    "The deposit hasn't been confirmed on-chain yet",
    "Sent on a different network than selected",
    "Amount received was less than required",
    "Network congestion delayed the transfer",
  ];

  const fixes = [
    { icon: RefreshCw, title: "Try again", sub: "Re-check and retry the payment" },
    { icon: CreditCard, title: "Use another method", sub: "Pay with card, PayPal or another network" },
    { icon: Mail, title: "Contact support", sub: "We'll verify your transfer manually" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg-canvas)", fontFamily: "var(--jx-font)", color: "var(--color-text-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "var(--space-3)" }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.15 }}
            style={{ width: 88, height: 88, borderRadius: "50%", background: "var(--color-danger-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <XCircle size={52} style={{ color: "var(--color-danger)" }} />
          </motion.div>
          <span style={{ font: "var(--text-h2)", fontWeight: 700 }}>Payment not confirmed</span>
          <span style={{ font: "var(--text-body)", ...muted, maxWidth: 380 }}>{errorMessage}</span>
        </motion.div>

        {/* Reasons */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} style={card}>
          <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>Possible reasons</span>
          <ul style={{ margin: "var(--space-3) 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
            {reasons.map((r) => (
              <li key={r} style={{ font: "var(--text-small)", ...muted }}>{r}</li>
            ))}
          </ul>
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <button className="jx-btn jx-btn--secondary" onClick={() => router.push("/pricing")} style={{ flex: 1, justifyContent: "center", minWidth: 150 }}>
              <ArrowLeft size={17} /> Choose another plan
            </button>
            <button className="jx-btn jx-btn--primary" onClick={() => router.back()} style={{ flex: 1, justifyContent: "center", minWidth: 150 }}>
              <RefreshCw size={17} /> Try again
            </button>
          </div>
        </motion.div>

        {/* Fixes */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} style={card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "var(--space-4)" }}>
            {fixes.map(({ icon: Icon, title, sub }) => (
              <div key={title} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ width: 34, height: 34, borderRadius: "var(--radius-md)", background: "var(--color-bg-muted)", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={17} />
                </span>
                <span style={{ font: "var(--text-small)", fontWeight: 600 }}>{title}</span>
                <span style={{ font: "var(--text-caption)", ...muted }}>{sub}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <button className="jx-btn jx-btn--ghost jx-btn--sm" onClick={() => router.push("/contact")} style={{ alignSelf: "center" }}>
          Need help? Contact support
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, font: "var(--text-caption)", ...muted }}>
          <ShieldCheck size={15} style={{ color: "var(--color-success)" }} /> Your payment information is secure and encrypted
        </div>
      </div>
    </div>
  );
}
