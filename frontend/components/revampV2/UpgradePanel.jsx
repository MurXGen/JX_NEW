"use client";

/* In-dashboard upgrade view — mirrors the public /pricing page (cards +
   payment-method chooser) but theme-aware on the v2 design tokens.
   Cards → Paddle checkout; Crypto → /cryptobillingpage. */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bitcoin,
  Check,
  CreditCard,
  Crown,
  Lock,
  Sparkles,
  X,
} from "lucide-react";
import Button from "./Button";
import PaddleLoader from "@/components/payments/PaddleLoader";
import PaymentModal from "@/components/payments/PaymentModal";
import { buildPlansConfig, getUserCurrency, detectCurrencyByIP, PLANS_FEATURES } from "@/utils/plans";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function UpgradePanel({ currentPlan }) {
  const router = useRouter();
  const [currency, setCurrency] = useState("USD");
  const [selected, setSelected] = useState(null); // plan key for method modal

  useEffect(() => {
    setCurrency(getUserCurrency());
    let active = true;
    detectCurrencyByIP().then((c) => {
      if (active) setCurrency(c);
    });
    return () => {
      active = false;
    };
  }, []);

  const plans = buildPlansConfig(currency);
  const cards = [
    { key: "free", price: plans.free.price, period: "forever", features: PLANS_FEATURES.free, current: !currentPlan || currentPlan === "free" },
    { key: "monthly", price: plans.monthly.price, period: "/ month", features: PLANS_FEATURES.pro },
    { key: "yearly", price: plans.yearly.price, period: "/ year", features: PLANS_FEATURES.pro, popular: true, badge: "Save 28%" },
    { key: "lifetime", price: plans.lifetime.price, period: "once", features: PLANS_FEATURES.lifetime, badge: "Best value" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <PaddleLoader />

      {/* hero */}
      <div style={{ position: "relative", textAlign: "center", padding: "var(--space-6) var(--space-4)", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(500px 240px at 50% -10%, color-mix(in srgb, var(--color-primary) 22%, transparent), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--color-primary-subtle)", border: "1px solid var(--color-primary)", color: "var(--yellow-600)", borderRadius: 999, padding: "5px 13px", font: "var(--text-caption)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
            <Sparkles size={13} /> Invest in your edge
          </span>
          <div style={{ font: "var(--text-h2)", fontWeight: 700, letterSpacing: "-1px" }}>Upgrade your plan</div>
          <div style={{ font: "var(--text-body)", color: "var(--color-text-muted)", maxWidth: 480, margin: "6px auto 0" }}>
            Unlock unlimited trades, advanced analytics and exports. Cancel anytime.
          </div>
        </div>
      </div>

      {/* plan cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "var(--space-4)", alignItems: "stretch" }}>
        {cards.map((c, i) => {
          const cfg = plans[c.key];
          return (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                position: "relative", display: "flex", flexDirection: "column",
                background: "var(--color-bg-surface)",
                border: `1.5px solid ${c.popular ? "var(--color-primary)" : "var(--color-border)"}`,
                borderRadius: "var(--radius-lg)", padding: "var(--space-6)",
                boxShadow: c.popular ? "var(--shadow-md)" : "none",
              }}
            >
              {c.popular && (
                <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "var(--color-primary)", color: "var(--color-primary-foreground)", font: "var(--text-caption)", fontWeight: 700, padding: "4px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Crown size={12} /> MOST POPULAR
                </span>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ font: "var(--text-title)", fontWeight: 600 }}>{cfg.title}</span>
                {c.badge && !c.popular && (
                  <span style={{ background: "var(--color-success-subtle)", color: "var(--color-success-strong)", font: "var(--text-caption)", fontWeight: 600, padding: "3px 9px", borderRadius: 999 }}>{c.badge}</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "10px 0 4px" }}>
                <span style={{ font: "var(--text-stat)", letterSpacing: "-1px" }}>{c.price}</span>
                <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{c.period}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "16px 0 20px", flex: 1 }}>
                {c.features.map((f) => (
                  <span key={f.text} style={{ display: "flex", alignItems: "center", gap: 9, font: "var(--text-small)", color: "var(--color-text-secondary)" }}>
                    <Check size={15} style={{ color: "var(--color-success)", flexShrink: 0 }} /> {f.text}
                  </span>
                ))}
              </div>
              {c.current ? (
                <button className="jx-btn jx-btn--secondary" disabled style={{ width: "100%", justifyContent: "center" }}>Current plan</button>
              ) : (
                <Button variant={c.popular ? "primary" : "outline"} onClick={() => setSelected(c.key)} style={{ width: "100%", justifyContent: "center" }}>
                  Choose {cfg.title}
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
        <Lock size={14} style={{ color: "var(--color-success)" }} /> Secure checkout · cancel anytime · 7-day money-back guarantee
      </div>

      <AnimatePresence>
        {selected && (
          <PaymentModal
            isOpen={!!selected}
            onClose={() => setSelected(null)}
            plans={plans}
            currency={currency}
            initialPlan={selected}
            loginRedirect="/dashboard"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
