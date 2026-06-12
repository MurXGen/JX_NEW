/* Shared payment modal (Cards/PayPal + Crypto) — used by /pricing and the
   landing page pricing section so both share one in-page checkout experience. */
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bitcoin,
  Check,
  CreditCard,
  Crown,
  Lock,
  Shield,
  Sparkles,
  X,
} from "lucide-react";

/* small inline spinner for button loading states */
function BtnSpinner({ color = "currentColor" }) {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      style={{
        width: 16, height: 16, borderRadius: "50%", display: "inline-block", flexShrink: 0,
        border: `2px solid color-mix(in srgb, ${color} 30%, transparent)`, borderTopColor: color,
      }}
    />
  );
}

export default function PaymentModal({
  isOpen,
  onClose,
  planTitle,
  planPrice,
  onPaymentOptionClick,
  loadingOption,
}) {
  if (!isOpen) return null;
  const busy = !!loadingOption;

  const paymentOptions = [
    {
      id: "cards_paypal",
      title: "Cards & PayPal",
      description: "Visa, Mastercard, Amex or PayPal",
      icon: <CreditCard size={22} />,
      accent: "#3b82f6",
      tags: ["Instant access", "Most popular"],
    },
    {
      id: "crypto",
      title: "Crypto (USDT)",
      description: "Pay with USDT on ETH, TRON, BSC, SOL & more",
      icon: <Bitcoin size={22} />,
      accent: "#f59e0b",
      tags: ["Low fees", "No card needed"],
    },
  ];

  const benefits = [
    "Advanced analytics & risk metrics",
    "Unlimited trade logging",
    "Priority support",
  ];

  return (
    <motion.div
      className="jx-modal-overlay jx-modal-overlay--blur"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose?.()}
      style={{ fontFamily: "var(--jx-font)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        className="jx-ltmodal"
        style={{ width: "min(820px, 96vw)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cb-pay-grid" style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr" }}>
          {/* Left — payment choices */}
          <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-3)" }}>
              <div>
                <h2 style={{ font: "var(--text-h3)", fontWeight: 700, margin: 0 }}>Complete your purchase</h2>
                <p style={{ font: "var(--text-small)", color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                  Select your preferred payment method
                </p>
              </div>
              <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} disabled={busy} aria-label="Close" style={{ padding: 8, opacity: busy ? 0.5 : 1, cursor: busy ? "not-allowed" : "pointer" }}>
                <X size={16} />
              </button>
            </div>

            {/* Plan summary */}
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)",
                padding: "var(--space-4)", borderRadius: "var(--radius-md)",
                background: "var(--color-bg-muted)", border: "1px solid var(--color-border)",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, font: "var(--text-body-md)", fontWeight: 600 }}>
                <Crown size={16} style={{ color: "var(--yellow-500)" }} /> {planTitle}
              </span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ font: "var(--text-title)", fontWeight: 700 }}>{planPrice}</span>
                <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>One-time payment</span>
              </span>
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {paymentOptions.map((option, index) => {
                const isLoading = loadingOption === option.id;
                return (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  whileHover={busy ? undefined : { y: -2 }}
                  whileTap={busy ? undefined : { scale: 0.99 }}
                  disabled={busy}
                  onClick={() => onPaymentOptionClick(option.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--space-3)", textAlign: "left",
                    padding: "var(--space-4)", borderRadius: "var(--radius-md)",
                    cursor: busy ? (isLoading ? "progress" : "not-allowed") : "pointer",
                    opacity: busy && !isLoading ? 0.55 : 1,
                    background: "var(--color-bg-surface)", border: `1px solid ${isLoading ? option.accent : "var(--color-border)"}`,
                    color: "var(--color-text-primary)", transition: "border-color .15s ease",
                  }}
                  onMouseEnter={(e) => !busy && (e.currentTarget.style.borderColor = option.accent)}
                  onMouseLeave={(e) => !busy && (e.currentTarget.style.borderColor = "var(--color-border)")}
                >
                  <span
                    style={{
                      width: 44, height: 44, borderRadius: "var(--radius-md)", flexShrink: 0,
                      background: `${option.accent}1f`, color: option.accent,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {option.icon}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                    <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{option.title}</span>
                    <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{option.description}</span>
                    <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                      {option.tags.map((tg) => (
                        <span
                          key={tg}
                          style={{
                            font: "var(--text-caption)", fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                            background: "var(--color-bg-muted)", color: "var(--color-text-secondary)",
                          }}
                        >
                          {tg}
                        </span>
                      ))}
                    </span>
                  </span>
                  {isLoading
                    ? <BtnSpinner color={option.accent} />
                    : <ArrowRight size={18} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />}
                </motion.button>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
              <Lock size={14} style={{ color: "var(--color-success)" }} /> Secure payment · 256-bit encryption
            </div>
          </div>

          {/* Right — value panel */}
          <div
            className="cb-pay-aside"
            style={{
              padding: "var(--space-6)",
              background: "linear-gradient(160deg, color-mix(in srgb, var(--color-primary) 16%, var(--color-bg-surface)) 0%, var(--color-bg-surface) 70%)",
              borderLeft: "1px solid var(--color-border)",
              display: "flex", flexDirection: "column", justifyContent: "center", gap: "var(--space-4)",
            }}
          >
            <span style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "var(--color-primary-subtle)", color: "var(--yellow-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={22} />
            </span>
            <div>
              <h3 style={{ font: "var(--text-title)", fontWeight: 700, margin: 0 }}>Unlock your trading edge</h3>
              <p style={{ font: "var(--text-small)", color: "var(--color-text-secondary)", margin: "6px 0 0" }}>
                Join thousands of traders who trust JournalX to sharpen their edge.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {benefits.map((b) => (
                <span key={b} style={{ display: "flex", alignItems: "center", gap: 10, font: "var(--text-small)" }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--color-success-subtle)", color: "var(--color-success-strong)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Check size={12} />
                  </span>
                  {b}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>
              <Shield size={14} /> 7-day money-back guarantee
            </div>
          </div>
        </div>

        <style jsx global>{`
          @media (max-width: 640px) {
            .cb-pay-grid { grid-template-columns: 1fr !important; }
            .cb-pay-aside { display: none !important; }
          }
        `}</style>
      </motion.div>
    </motion.div>
  );
}
