// pages/pricing.js
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
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Cookies from "js-cookie";
import PaddleLoader from "../components/payments/PaddleLoader";
import { LandingNav, LandingFooter } from "@/components/landingPage/LandingChrome";

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

import {
  PLANS_FEATURES,
  getUserCurrency,
  detectCurrencyByIP,
  buildPlansConfig,
  PLANS_CONFIG,
} from "@/utils/plans";

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [hoveredPlan, setHoveredPlan] = useState(null);
  const [payLoading, setPayLoading] = useState(null); // which payment option is loading
  // Start with USD so SSR and first client render match; detect after mount.
  const [currency, setCurrency] = useState("USD");
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    // instant best-guess, then refine by IP-based location
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

  const openPaddleCheckout = async (priceId) => {
    if (!priceId) {
      alert("This plan isn't available for card payment right now. Please try crypto, or contact support.");
      return;
    }
    if (!window?.Paddle?.Checkout) {
      alert("Payment system is still loading. Please wait a moment and try again.");
      return;
    }

    // The Paddle webhook activates the subscription via custom_data.userId.
    // The userId cookie is httpOnly (not readable here), so fetch it from the
    // authenticated user-info endpoint instead.
    let userId;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/user-info`, {
        credentials: "include",
      });
      const json = await res.json();
      userId = json?.userData?.userId || json?.userData?._id || json?.userId;
    } catch (e) {
      console.error("Could not resolve user for checkout:", e);
    }

    if (!userId) {
      router.push("/login?redirect=/pricing");
      return;
    }

    try {
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        // attaches userId to transaction.completed → handlePaddleWebhook
        customData: { userId },
        settings: { displayMode: "overlay" },

        successCallback: () => {
          console.log("⚡ Payment successCallback triggered");
          startSubscriptionPolling();
        },

        closeCallback: () => {
          console.log(
            "🔄 Checkout closed – starting subscription verification...",
          );
          startSubscriptionPolling();
        },
      });
    } catch (error) {
      console.error("Error opening Paddle checkout:", error);
      alert("Failed to open checkout. Please try again.");
    }
  };

  const startSubscriptionPolling = () => {
    let attempts = 0;
    const maxAttempts = 12; // try for 60 seconds

    const interval = setInterval(async () => {
      attempts++;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/user-info`,
          {
            credentials: "include",
          },
        );

        const json = await res.json();
        // user-info returns { userData: { subscription: { status } } }
        const status =
          json?.userData?.subscription?.status ??
          json?.subscription?.status ??
          json?.subscriptionStatus;

        console.log("🔍 Checking subscription:", status);

        if (status === "active") {
          clearInterval(interval);
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Polling error:", err);
      }

      if (attempts >= maxAttempts) {
        console.warn("⛔ Stopping polling – max attempts reached.");
        clearInterval(interval);
      }
    }, 5000); // every 5 seconds
  };

  const handlePlanClick = (planKey) => {
    // Not logged in → send them to login first (return to pricing after).
    if (Cookies.get("isVerified") !== "yes") {
      router.push("/login?redirect=/pricing");
      return;
    }
    setSelectedPlan(planKey);
    setIsModalOpen(true);
  };

  const handlePaymentOptionClick = async (option) => {
    if (!selectedPlan || payLoading) return;

    const planConfig = plans[selectedPlan];

    if (option === "crypto") {
      // loader stays on the crypto button until the navigation happens
      setPayLoading("crypto");
      router.push({
        pathname: "/cryptobillingpage",
        query: {
          planName: planConfig.planName,
          period: planConfig.period,
          amount: planConfig.amount,
        },
      });
      return;
    }

    if (option === "cards_paypal") {
      // show the loader immediately and keep it visible (modal stays open)
      // until Paddle's overlay has been opened, then close.
      setPayLoading("cards_paypal");
      try {
        await openPaddleCheckout(planConfig.paddlePriceId);
      } finally {
        setPayLoading(null);
        setIsModalOpen(false);
      }
    }
  };

  const C = { text: "#fff", muted: "#aeb4bc", dim: "#707a8a", surface: "#161a20", border: "rgba(255,255,255,0.08)", yellow: "#fcd535", green: "#2ebd85" };
  const SITE_URL = "https://journalx.app";

  const CARDS = [
    { key: "free", title: "Free", price: plans.free.price, period: "forever", features: PLANS_FEATURES.free, cta: "Start free", current: true },
    { key: "monthly", title: "Pro Monthly", price: plans.monthly.price, period: "/ month", features: PLANS_FEATURES.pro, cta: "Get monthly" },
    { key: "yearly", title: "Pro Yearly", price: plans.yearly.price, period: "/ year", features: PLANS_FEATURES.pro, cta: "Get yearly", popular: true, badge: "Save 28%" },
    { key: "lifetime", title: "Lifetime", price: plans.lifetime.price, period: "once", features: PLANS_FEATURES.lifetime, cta: "Get lifetime", badge: "Best value" },
  ];

  const pricingLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "JournalX Pro",
    description: "JournalX trading journal — advanced analytics, unlimited trades, risk and psychology tracking.",
    brand: { "@type": "Brand", name: "JournalX" },
    offers: CARDS.filter((c) => c.key !== "free").map((c) => ({
      "@type": "Offer",
      name: c.title,
      price: PLANS_CONFIG[c.key].amount,
      priceCurrency: PLANS_CONFIG[c.key].currency,
      url: `${SITE_URL}/pricing`,
      availability: "https://schema.org/InStock",
    })),
  };

  return (
    <>
      <Head>
        <title>Pricing — JournalX | Start Free, Upgrade Anytime</title>
        <meta name="description" content="Simple, affordable pricing for the JournalX trading journal. Start free, then unlock unlimited trades and advanced analytics with Pro monthly, yearly, or lifetime plans." />
        <meta name="keywords" content="journalx pricing, trading journal price, trading journal subscription, trade tracker cost, best value trading journal" />
        <link rel="canonical" href={`${SITE_URL}/pricing`} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="JournalX Pricing — Start Free, Upgrade Anytime" />
        <meta property="og:description" content="Simple, affordable pricing for the JournalX trading journal. Start free; unlock advanced analytics with Pro." />
        <meta property="og:url" content={`${SITE_URL}/pricing`} />
        <meta property="og:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingLd) }} />
      </Head>

      <PaddleLoader />
      <LandingNav />

      <div style={{ background: "#0d1117", color: C.text, fontFamily: "Poppins, sans-serif", minHeight: "100vh" }}>
        {/* Hero */}
        <section style={{ maxWidth: 1160, margin: "0 auto", padding: "72px 20px 32px", textAlign: "center", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(600px 320px at 50% -10%, rgba(252,213,53,0.16), transparent 70%)", pointerEvents: "none" }} />
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ position: "relative" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(252,213,53,0.12)", border: "1px solid rgba(252,213,53,0.3)", color: C.yellow, borderRadius: 999, padding: "6px 14px", font: "600 13px Poppins", marginBottom: 20 }}>
              <Sparkles size={14} /> Trusted by traders worldwide
            </span>
            <h1 style={{ font: "700 clamp(32px,5vw,52px)/1.1 Poppins", margin: "0 auto 14px", maxWidth: 640, letterSpacing: "-1.5px" }}>
              Invest in your <span style={{ color: C.yellow }}>edge</span>
            </h1>
            <p style={{ font: "400 clamp(16px,2vw,18px)/1.6 Poppins", color: C.muted, maxWidth: 520, margin: "0 auto" }}>
              Start free and upgrade when you're ready. Every plan pays for itself the first time it saves you from one bad habit.
            </p>
          </motion.div>
        </section>

        {/* Plans */}
        <section style={{ maxWidth: 1160, margin: "0 auto", padding: "0 20px 40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 18, alignItems: "stretch" }}>
            {CARDS.map((c, i) => (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                style={{
                  position: "relative", display: "flex", flexDirection: "column",
                  background: c.popular ? "linear-gradient(160deg, rgba(252,213,53,0.1), rgba(22,26,32,1))" : C.surface,
                  border: `1px solid ${c.popular ? "rgba(252,213,53,0.4)" : C.border}`,
                  borderRadius: 20, padding: 26,
                }}
              >
                {c.popular && (
                  <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: C.yellow, color: "#1e2329", font: "700 11px Poppins", padding: "4px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Crown size={12} /> MOST POPULAR
                  </span>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ font: "600 17px Poppins" }}>{c.title}</span>
                  {c.badge && !c.popular && (
                    <span style={{ background: "rgba(46,189,133,0.15)", color: C.green, font: "600 11px Poppins", padding: "3px 9px", borderRadius: 999 }}>{c.badge}</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "10px 0 4px" }}>
                  <span style={{ font: "700 34px Poppins", letterSpacing: "-1px" }}>{c.price}</span>
                  <span style={{ font: "400 14px Poppins", color: C.dim }}>{c.period}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 11, margin: "20px 0 24px", flex: 1 }}>
                  {c.features.map((f) => (
                    <span key={f.text} style={{ display: "flex", alignItems: "center", gap: 9, font: "400 14px Poppins", color: C.muted }}>
                      <Check size={16} style={{ color: C.green, flexShrink: 0 }} /> {f.text}
                    </span>
                  ))}
                </div>
                <button
                  onClick={c.current ? undefined : () => handlePlanClick(c.key)}
                  disabled={c.current}
                  style={{
                    width: "100%", justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 8,
                    borderRadius: 12, padding: "13px", cursor: c.current ? "default" : "pointer",
                    font: "600 14px Poppins", border: "none",
                    background: c.current ? "rgba(255,255,255,0.08)" : c.popular ? C.yellow : "rgba(255,255,255,0.1)",
                    color: c.current ? C.dim : c.popular ? "#1e2329" : "#fff",
                  }}
                >
                  {c.current ? <><Check size={15} /> Current plan</> : <><Zap size={15} /> {c.cta}</>}
                </button>
              </motion.div>
            ))}
          </div>

          {/* trust row */}
          <div style={{ display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap", marginTop: 36, font: "400 13px Poppins", color: C.dim }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Shield size={15} style={{ color: C.green }} /> 256-bit encrypted</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Lock size={15} style={{ color: C.green }} /> Cancel anytime</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><CreditCard size={15} style={{ color: C.green }} /> Cards, PayPal & crypto</span>
          </div>
        </section>

        <LandingFooter />
      </div>

      {/* Payment Modal */}
      {isClient &&
        isModalOpen &&
        selectedPlan &&
        createPortal(
          <PaymentModal
            isOpen={isModalOpen}
            onClose={() => !payLoading && setIsModalOpen(false)}
            planTitle={plans[selectedPlan]?.title || ""}
            planPrice={plans[selectedPlan]?.price || ""}
            onPaymentOptionClick={handlePaymentOptionClick}
            loadingOption={payLoading}
          />,
          document.body,
        )}
    </>
  );
}

function PricingCard({
  plan,
  title,
  price,
  period,
  features,
  buttonText,
  isCurrent = false,
  highlight = false,
  popular = false,
  savings,
  valueBadge,
  onClick,
  onHover,
  isHovered,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -10, transition: { duration: 0.2 } }}
      onMouseEnter={() => onHover(plan)}
      onMouseLeave={() => onHover(null)}
      className={`pricing-card ${highlight ? "highlight" : ""} ${isHovered ? "hovered" : ""}`}
    >
      <div className="card-header">
        <div className="flexRow flexRow_stretch">
          <span className="card-title">{title}</span>
          {popular && (
            <div className="popular-badge">
              <Crown size={14} />
              <span>MOST POPULAR</span>
            </div>
          )}

          {valueBadge && (
            <div className="value-badge">
              <TrendingUp size={14} />
              <span>{valueBadge}</span>
            </div>
          )}

          {savings && (
            <div className="savings-badge">
              <span>Save {savings}</span>
            </div>
          )}
        </div>

        <div className="card-price flexRow flexRow_stretch">
          <span className="price">{price}</span>
          <span className="period">{period}</span>
        </div>
      </div>

      <span className="feature-list">
        {features.map((feature, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="feature-item"
          >
            <Check size={16} className="feature-icon" />
            <span className="feature-text">{feature.text}</span>
          </motion.span>
        ))}
      </span>

      <motion.button
        className={`pricing-button ${isCurrent ? "current" : ""}`}
        onClick={isCurrent ? null : onClick}
        whileHover={{ scale: isCurrent ? 1 : 1.05 }}
        whileTap={{ scale: isCurrent ? 1 : 0.95 }}
        disabled={isCurrent}
      >
        {isCurrent ? (
          <>
            <Check size={16} />
            <span>Current Plan</span>
          </>
        ) : (
          <>
            <Zap size={16} />
            <span>{buttonText}</span>
          </>
        )}
      </motion.button>
    </motion.div>
  );
}

function PaymentModal({
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
                      {option.tags.map((t) => (
                        <span
                          key={t}
                          style={{
                            font: "var(--text-caption)", fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                            background: "var(--color-bg-muted)", color: "var(--color-text-secondary)",
                          }}
                        >
                          {t}
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
