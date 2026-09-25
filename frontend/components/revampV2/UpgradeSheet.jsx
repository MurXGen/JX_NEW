"use client";

/* Shared upgrade prompt — one component for EVERY plan-limit trigger (trade
   cap, history lock, etc.). Bottom slide-up on mobile, centred popup on
   desktop (same shell as ConfirmDialog). Shows a short benefit list,
   currency-aware plan prices, a direct upgrade CTA, and an "email us" option. */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Crown, Mail, X } from "lucide-react";
import { PRICE_LABELS, getUserCurrency, detectCurrencyByIP } from "@/utils/plans";

const SUPPORT_EMAIL = "support@journalx.app";

const BENEFITS = [
  "Unlimited trades every month",
  "Full trade history — nothing locked",
  "Up to 3 journals + exchange auto-sync",
  "Advanced analytics & unlimited chart logs",
];

export default function UpgradeSheet({
  open,
  onClose,
  title = "Upgrade to keep going",
  reason = "You've reached your Free plan limit.",
}) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [cur, setCur] = useState("USD");

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  useEffect(() => {
    if (!open) return;
    setCur(getUserCurrency());
    detectCurrencyByIP().then((c) => c && setCur(c)).catch(() => {});
  }, [open]);

  if (!mounted) return null;

  const p = PRICE_LABELS[cur] || PRICE_LABELS.USD;
  const plans = [
    { id: "monthly", label: "Monthly", price: p.monthly, sub: "/mo" },
    { id: "yearly", label: "Yearly", price: p.yearly, sub: "/yr", best: true },
    { id: "lifetime", label: "Lifetime", price: p.lifetime, sub: "once" },
  ];

  const goPricing = (plan) => {
    try { window.location.href = `/pricing${plan ? `?plan=${plan}` : ""}`; } catch {}
  };
  const emailUs = () => {
    const subject = encodeURIComponent("JournalX Pro — pricing question");
    const body = encodeURIComponent(
      `Hi JournalX team,\n\nI'd like to know more about upgrading to Pro${reason ? ` (I hit: ${reason})` : ""}.\n\nMy question: `,
    );
    try { window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`; } catch {}
  };

  const body = (
    <div style={{ padding: "var(--space-5) var(--space-6) var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}>
        <span style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-primary-subtle)", color: "var(--yellow-500)" }}>
          <Crown size={19} />
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
          <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>{title}</span>
          <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>{reason}</span>
        </div>
        <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} aria-label="Close" style={{ padding: 7 }}>
          <X size={14} />
        </button>
      </div>

      {/* benefits */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
        {BENEFITS.map((b) => (
          <span key={b} style={{ display: "flex", alignItems: "flex-start", gap: 7, font: "var(--text-caption)", color: "var(--color-text-secondary)" }}>
            <Check size={14} style={{ color: "var(--color-success)", flexShrink: 0, marginTop: 1 }} /> {b}
          </span>
        ))}
      </div>

      {/* plan prices */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-2)" }}>
        {plans.map((pl) => (
          <button
            key={pl.id}
            type="button"
            onClick={() => goPricing(pl.id)}
            style={{
              position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              padding: "12px 8px", borderRadius: "var(--radius-md)", cursor: "pointer",
              border: `1px solid ${pl.best ? "var(--color-primary)" : "var(--color-border)"}`,
              background: pl.best ? "var(--color-primary-subtle)" : "var(--color-bg-muted)",
              color: "var(--color-text-primary)",
            }}
          >
            {pl.best && (
              <span style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", background: "var(--color-primary)", color: "var(--color-primary-foreground)", font: "700 8.5px Poppins", letterSpacing: "0.4px", textTransform: "uppercase", padding: "2px 7px", borderRadius: 999, whiteSpace: "nowrap" }}>
                Best value
              </span>
            )}
            <span style={{ font: "var(--text-label)", letterSpacing: "0.4px", textTransform: "uppercase", color: "var(--color-text-muted)" }}>{pl.label}</span>
            <span style={{ font: "600 17px Poppins", fontVariantNumeric: "tabular-nums" }}>{pl.price}</span>
            <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{pl.sub}</span>
          </button>
        ))}
      </div>

      {/* actions */}
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button className="jx-btn jx-btn--outline" onClick={emailUs} style={{ flex: 1, justifyContent: "center" }}>
          <Mail size={15} /> Email us
        </button>
        <button className="jx-btn jx-btn--primary" onClick={() => goPricing("yearly")} style={{ flex: 1.4, justifyContent: "center" }}>
          <Crown size={15} /> Upgrade to Pro
        </button>
      </div>
    </div>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ position: "fixed", inset: 0, zIndex: 5000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center" }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
        >
          {isMobile ? (
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              style={{ width: "100%", background: "var(--color-bg-elevated)", borderTopLeftRadius: "var(--radius-xl)", borderTopRightRadius: "var(--radius-xl)", borderTop: "1px solid var(--color-border)", paddingBottom: "env(safe-area-inset-bottom)", boxShadow: "0 -14px 44px rgba(0,0,0,0.45)" }}
            >
              <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--color-border-strong)", margin: "10px auto 0" }} />
              {body}
            </motion.div>
          ) : (
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="jx-ltmodal jx-ltmodal--popup jx-ltmodal--flat"
              style={{ width: "min(460px, 94vw)" }}
            >
              {body}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
