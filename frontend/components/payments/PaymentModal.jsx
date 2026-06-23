"use client";

/* Premium payment modal — one shared component used by /pricing, /pricingpage,
   the landing pricing section and the in-dashboard upgrade flow.

   Design goal: a self-contained, premium dark checkout (inspired by the best
   Paddle integrations) that's fully on-brand. It runs in two views inside the
   same dialog so the experience never breaks to a jarring white popup:

     1. "select"  — plan period toggle, price, feature grid, payment-method
                    pills, promo code and a single CTA.
     2. "checkout" — Paddle's INLINE checkout embedded in our own dark surface
                    (theme:"dark", transparent frame) on the left, with our own
                    branded order summary on the right.

   Paddle only lets you theme the payment form (light/dark) + brand colour/logo
   in the dashboard — the form fields themselves can't be restyled. So the win
   is in this wrapper + embedding inline (dark) instead of the default overlay,
   which removes the white-popup hand-off entirely.

   The modal is self-sufficient: it resolves the logged-in user, opens Paddle,
   routes crypto to the crypto page, polls for the new subscription and shows a
   success state. Call sites only pass plans + currency + the selected plan. */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bitcoin,
  Check,
  CheckCircle2,
  CreditCard,
  Crown,
  Lock,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { PLANS_FEATURES } from "@/utils/plans";
import { saveToIndexedDB } from "@/utils/indexedDB";

/* Fixed premium-dark palette so the checkout looks identical (and on-brand)
   regardless of the surrounding app theme — like the best SaaS checkouts. */
const C = {
  text: "#ffffff",
  muted: "#aeb4bc",
  dim: "#707a8a",
  canvas: "#0d1117",
  surface: "#161a20",
  surface2: "#1b2027",
  border: "rgba(255,255,255,0.10)",
  borderSoft: "rgba(255,255,255,0.06)",
  yellow: "#fcd535",
  yellowDeep: "#f0b90b",
  green: "#2ebd85",
  blue: "#4f7cff",
};

const FONT = "Poppins, system-ui, sans-serif";

function BtnSpinner({ color = "#1e2329" }) {
  return (
    <motion.span
      aria-hidden="true"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      style={{
        width: 18, height: 18, borderRadius: "50%", display: "inline-block", flexShrink: 0,
        border: `2px solid color-mix(in srgb, ${color} 35%, transparent)`, borderTopColor: color,
      }}
    />
  );
}

/* period helpers ------------------------------------------------------------ */
const PERIOD_META = {
  monthly: { tab: "Monthly", unit: "/ month", note: "Billed monthly · cancel anytime" },
  yearly: { tab: "Yearly", unit: "/ year", note: "Billed annually · cancel anytime", badge: "Save 28%" },
  lifetime: { tab: "Lifetime", unit: "once", note: "One-time payment · yours forever" },
};
const PERIOD_ORDER = ["monthly", "yearly", "lifetime"];

export default function PaymentModal({
  isOpen,
  onClose,
  plans,
  currency = "USD",
  initialPlan = "yearly",
  loginRedirect = "/pricing",
}) {
  const router = useRouter();
  const [view, setView] = useState("select"); // select | checkout | success
  const [planKey, setPlanKey] = useState(initialPlan);
  const [method, setMethod] = useState("card"); // card | paypal | crypto
  const [promoOpen, setPromoOpen] = useState(false);
  const [promo, setPromo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkoutArgs, setCheckoutArgs] = useState(null);
  const pollRef = useRef(null);
  const openedRef = useRef(false);

  const availablePlans = useMemo(
    () => PERIOD_ORDER.filter((k) => plans && plans[k] && plans[k].paddlePriceId != null),
    [plans],
  );

  // Reset to a clean state every time the modal is (re)opened.
  useEffect(() => {
    if (isOpen) {
      setView("select");
      setMethod("card");
      setPromoOpen(false);
      setPromo("");
      setError("");
      setBusy(false);
      setCheckoutArgs(null);
      openedRef.current = false;
      setPlanKey(initialPlan && plans?.[initialPlan] ? initialPlan : (availablePlans[0] || "yearly"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialPlan]);

  // Clean up polling + any open Paddle frame when the modal closes/unmounts.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      try { window?.Paddle?.Checkout?.close?.(); } catch {}
    };
  }, []);

  // Listen for Paddle's checkout.completed (bridged from PaddleLoader) so we can
  // show success + poll for the upgraded subscription.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPaddle = (e) => {
      const ev = e?.detail;
      if (ev?.name === "checkout.completed") {
        setView("success");
        startPolling();
      }
    };
    window.addEventListener("jx-paddle", onPaddle);
    return () => window.removeEventListener("jx-paddle", onPaddle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Open Paddle's inline checkout once the frame container has mounted.
  useEffect(() => {
    if (view !== "checkout" || !checkoutArgs || openedRef.current) return undefined;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      const el = document.querySelector(".jx-paddle-frame");
      if (el && window?.Paddle?.Checkout) {
        clearInterval(id);
        openedRef.current = true;
        try {
          const customer = checkoutArgs.email && /\S+@\S+\.\S+/.test(checkoutArgs.email) ? { email: checkoutArgs.email } : undefined;
          window.Paddle.Checkout.open({
            items: [{ priceId: checkoutArgs.priceId, quantity: 1 }],
            customData: { userId: checkoutArgs.userId },
            ...(customer ? { customer } : {}),
            ...(checkoutArgs.promo ? { discountCode: checkoutArgs.promo } : {}),
            settings: {
              displayMode: "inline",
              frameTarget: "jx-paddle-frame",
              frameInitialHeight: 460,
              frameStyle: "width:100%; min-width:312px; background-color: transparent; border: none;",
              theme: "dark",
              allowLogout: false,
              showAddDiscounts: !checkoutArgs.promo,
              showAddTaxId: true,
            },
          });
        } catch (err) {
          console.error("Paddle inline open failed:", err);
          setError("Couldn't open checkout. Please try again.");
          setView("select");
        }
      } else if (tries > 60) {
        clearInterval(id);
        setError("Payment system is still loading — please try again.");
        setView("select");
      }
    }, 50);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, checkoutArgs]);

  if (!isOpen) return null;

  const plan = plans?.[planKey] || {};
  const meta = PERIOD_META[planKey] || PERIOD_META.yearly;
  const features = (planKey === "lifetime" ? PLANS_FEATURES.lifetime : PLANS_FEATURES.pro) || [];
  const isINR = currency === "INR";

  const methods = [
    {
      id: "card",
      title: isINR ? "UPI & Cards" : "Card",
      desc: isINR ? "UPI autopay, Visa, Mastercard, Amex" : "Visa, Mastercard, Amex & more",
      icon: <CreditCard size={20} />,
      accent: C.blue,
    },
    { id: "paypal", title: "PayPal", desc: "Pay with your PayPal balance", icon: <PayPalGlyph />, accent: "#2790c3" },
    { id: "crypto", title: "Crypto (USDT)", desc: "USDT on ETH, TRON, BSC, SOL", icon: <Bitcoin size={20} />, accent: "#f0b90b" },
  ];

  const closeIfIdle = () => { if (!busy) onClose?.(); };

  /* --- actions ------------------------------------------------------------ */
  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/user-info`, { credentials: "include" });
        const json = await res.json();
        const userData = json?.userData || json;
        const status = userData?.subscription?.status ?? json?.subscription?.status ?? userData?.subscriptionStatus;
        const p = (userData?.subscription?.plan || "").toLowerCase();
        if (status === "active" && (p.includes("pro") || p.includes("lifetime"))) {
          clearInterval(pollRef.current);
          try {
            if (userData) await saveToIndexedDB("user-data", userData);
            window.dispatchEvent(new CustomEvent("jx-sub-changed"));
          } catch {}
          router.push("/dashboard");
        }
      } catch {}
      if (attempts >= 24) clearInterval(pollRef.current);
    }, 5000);
  };

  const resolveUser = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/user-info`, { credentials: "include" });
      const json = await res.json();
      const userId = json?.userData?.userId || json?.userData?._id || json?.userId;
      const email = json?.userData?.email || json?.email;
      return { userId, email };
    } catch {
      return { userId: null, email: null };
    }
  };

  const openInlineCheckout = async () => {
    setError("");
    if (!plan?.paddlePriceId) {
      setError("This plan isn't available for card payment right now. Try crypto or contact support.");
      return;
    }
    if (!window?.Paddle?.Checkout) {
      setError("Payment system is still loading — please try again in a moment.");
      return;
    }
    setBusy(true);
    const { userId, email } = await resolveUser();
    if (!userId) {
      router.push(`/login?redirect=${encodeURIComponent(loginRedirect)}`);
      return;
    }
    // Stash the args and switch view. The effect below opens Paddle once the
    // frame container is actually mounted in the DOM (avoids appendChild on an
    // element that doesn't exist yet).
    openedRef.current = false;
    setCheckoutArgs({ priceId: plan.paddlePriceId, userId, email, promo: promo.trim() });
    setView("checkout");
    setBusy(false);
  };

  const goCrypto = () => {
    setBusy(true);
    router.push({
      pathname: "/cryptobillingpage",
      query: { planName: plan.planName, period: plan.period, amount: plan.amount },
    });
  };

  const onCTA = () => {
    if (busy) return;
    if (method === "crypto") return goCrypto();
    return openInlineCheckout();
  };

  /* --- render ------------------------------------------------------------- */
  return (
    <motion.div
      className="jx-pay-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && closeIfIdle()}
      style={{
        position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, background: "rgba(4,6,10,0.66)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        fontFamily: FONT,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ type: "spring", stiffness: 360, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Upgrade to JournalX Pro"
        style={{
          position: "relative", width: view === "checkout" ? "min(940px, 96vw)" : "min(880px, 96vw)",
          maxHeight: "92vh", overflowY: "auto", color: C.text,
          background: `linear-gradient(180deg, ${C.surface2} 0%, ${C.surface} 100%)`,
          border: `1px solid ${C.border}`, borderRadius: 22,
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)", transition: "width .35s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <button
          onClick={closeIfIdle}
          aria-label="Close"
          style={{
            position: "absolute", top: 14, right: 14, zIndex: 3, width: 34, height: 34, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: busy ? "not-allowed" : "pointer",
            background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: C.muted, opacity: busy ? 0.5 : 1,
          }}
        >
          <X size={16} />
        </button>

        <AnimatePresence>
          {view === "select" && (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <div className="jx-pay-select" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                {/* LEFT — plan + price + features */}
                <div style={{ padding: "26px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
                  {/* header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(145deg, ${C.yellow}, ${C.yellowDeep})`, color: "#1e2329", boxShadow: `0 6px 20px ${C.yellow}40` }}>
                      <Crown size={22} />
                    </span>
                    <div>
                      <h2 style={{ font: "700 19px Poppins", margin: 0, letterSpacing: "-0.3px" }}>JournalX Pro</h2>
                      <p style={{ font: "400 12.5px Poppins", color: C.muted, margin: "2px 0 0" }}>
                        Unlock your real trading edge.
                      </p>
                    </div>
                  </div>

                  {/* period toggle */}
                  <div style={{ display: "flex", gap: 6, padding: 5, borderRadius: 14, background: "rgba(0,0,0,0.25)", border: `1px solid ${C.borderSoft}` }}>
                    {availablePlans.map((k) => {
                      const active = k === planKey;
                      const m = PERIOD_META[k];
                      return (
                        <button
                          key={k}
                          onClick={() => setPlanKey(k)}
                          style={{
                            flex: 1, position: "relative", padding: "9px 4px", borderRadius: 10, cursor: "pointer",
                            font: `600 12.5px Poppins`, border: "none",
                            background: active ? `linear-gradient(145deg, ${C.yellow}, ${C.yellowDeep})` : "transparent",
                            color: active ? "#1e2329" : C.muted, transition: "all .18s ease",
                          }}
                        >
                          {m.tab}
                          {m.badge && (
                            <span style={{ position: "absolute", top: -9, right: -4, font: "700 9px Poppins", padding: "2px 6px", borderRadius: 999, background: active ? "#1e2329" : C.green, color: "#fff", whiteSpace: "nowrap" }}>
                              {m.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* price */}
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ font: "700 38px Poppins", letterSpacing: "-1.5px", lineHeight: 1 }}>{plan.price}</span>
                      <span style={{ font: "500 15px Poppins", color: C.dim }}>{meta.unit}</span>
                    </div>
                    <p style={{ font: "400 12.5px Poppins", color: C.dim, margin: "6px 0 0" }}>{meta.note}</p>
                  </div>

                  {/* features */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 11, paddingTop: 16, borderTop: `1px solid ${C.borderSoft}` }}>
                    {features.map((f) => (
                      <span key={f.text} style={{ display: "flex", alignItems: "center", gap: 9, font: "400 13px Poppins", color: "#d6dae0" }}>
                        <span style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(46,189,133,0.16)", color: C.green }}>
                          <Check size={11} />
                        </span>
                        {f.text}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: "auto", paddingTop: 10, font: "400 11.5px Poppins", color: C.dim }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><ShieldCheck size={13} style={{ color: C.green }} /> 7-day money-back</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Lock size={13} style={{ color: C.green }} /> 256-bit secure</span>
                  </div>
                </div>

                {/* RIGHT — payment method + promo + CTA */}
                <div className="jx-pay-select__right" style={{ padding: "26px 24px", background: "linear-gradient(165deg, rgba(252,213,53,0.06), rgba(13,17,23,0.35))", borderLeft: `1px solid ${C.borderSoft}`, display: "flex", flexDirection: "column" }}>
                  <p style={{ font: "600 12px Poppins", color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px" }}>Payment method</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {methods.map((opt) => {
                      const active = opt.id === method;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setMethod(opt.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 12, textAlign: "left", padding: "11px 13px", borderRadius: 13, cursor: "pointer",
                            background: active ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.15)",
                            border: `1.5px solid ${active ? opt.accent : C.border}`, color: C.text, transition: "all .15s ease",
                          }}
                        >
                          <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${opt.accent}22`, color: opt.accent }}>
                            {opt.icon}
                          </span>
                          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                            <span style={{ font: "600 14px Poppins" }}>{opt.title}</span>
                            <span style={{ font: "400 12px Poppins", color: C.dim }}>{opt.desc}</span>
                          </span>
                          <span style={{ width: 19, height: 19, borderRadius: "50%", flexShrink: 0, border: `2px solid ${active ? opt.accent : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", background: active ? opt.accent : "transparent" }}>
                            {active && <Check size={11} color="#fff" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* promo code */}
                  <div style={{ marginTop: 14 }}>
                    {!promoOpen ? (
                      <button onClick={() => setPromoOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.muted, font: "500 13px Poppins", cursor: "pointer", padding: 0 }}>
                        <Tag size={14} /> Have a promo code?
                      </button>
                    ) : (
                      <input
                        value={promo}
                        onChange={(e) => setPromo(e.target.value)}
                        placeholder="Promo code"
                        autoFocus
                        style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, background: "rgba(0,0,0,0.25)", border: `1px solid ${C.border}`, color: C.text, font: "500 13px Poppins", outline: "none" }}
                      />
                    )}
                  </div>

                  {error && (
                    <p style={{ font: "500 13px Poppins", color: "#f6465d", margin: "14px 0 0" }}>{error}</p>
                  )}

                  {/* CTA */}
                  <button
                    onClick={onCTA}
                    disabled={busy}
                    style={{
                      width: "100%", marginTop: "auto", padding: "15px", borderRadius: 14, border: "none", cursor: busy ? "progress" : "pointer",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
                      font: "700 15.5px Poppins", color: "#1e2329",
                      background: `linear-gradient(145deg, ${C.yellow}, ${C.yellowDeep})`, boxShadow: `0 10px 28px ${C.yellow}33`,
                    }}
                  >
                    {busy ? <BtnSpinner /> : <>{method === "crypto" ? "Continue with crypto" : "Continue to payment"} <ArrowRight size={18} /></>}
                  </button>

                  <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 12, font: "400 11.5px Poppins", color: C.dim }}>
                    <Sparkles size={13} style={{ color: C.yellow }} /> Cancel anytime · instant access
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === "checkout" && (
            <motion.div key="checkout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <div className="jx-pay-checkout" style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr" }}>
                {/* left — Paddle inline frame */}
                <div style={{ padding: "22px 22px 26px", minWidth: 0 }}>
                  <button onClick={() => { try { window?.Paddle?.Checkout?.close?.(); } catch {} openedRef.current = false; setCheckoutArgs(null); setView("select"); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.muted, font: "500 13px Poppins", cursor: "pointer", padding: 0, marginBottom: 14 }}>
                    <ArrowLeft size={15} /> Back
                  </button>
                  {/* Paddle.js mounts the secure card/PayPal form into this element. */}
                  <div className="jx-paddle-frame" style={{ minHeight: 460 }} />
                </div>

                {/* right — branded order summary */}
                <aside className="jx-pay-summary" style={{ padding: "26px 24px", background: "linear-gradient(165deg, rgba(252,213,53,0.08), rgba(13,17,23,0.4))", borderLeft: `1px solid ${C.borderSoft}`, display: "flex", flexDirection: "column", gap: 18 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, alignSelf: "flex-start", padding: "5px 12px", borderRadius: 999, background: `linear-gradient(145deg, ${C.yellow}, ${C.yellowDeep})`, color: "#1e2329", font: "700 12px Poppins" }}>
                    <Crown size={13} /> Premium
                  </span>
                  <div>
                    <div style={{ font: "400 12px Poppins", color: C.dim, textTransform: "uppercase", letterSpacing: "0.5px" }}>Plan</div>
                    <div style={{ font: "700 22px Poppins", letterSpacing: "-0.5px", marginTop: 2 }}>{meta.tab}</div>
                  </div>
                  <div style={{ height: 1, background: C.borderSoft }} />
                  <div>
                    <div style={{ font: "400 12px Poppins", color: C.dim }}>Total today</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                      <span style={{ font: "700 30px Poppins", letterSpacing: "-1px" }}>{plan.price}</span>
                      <span style={{ font: "500 13px Poppins", color: C.dim }}>{meta.unit}</span>
                    </div>
                    <div style={{ font: "400 11.5px Poppins", color: C.dim, marginTop: 6 }}>Taxes (if any) calculated at checkout.</div>
                  </div>
                  <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 9 }}>
                    {features.slice(0, 3).map((f) => (
                      <span key={f.text} style={{ display: "flex", alignItems: "center", gap: 8, font: "400 12.5px Poppins", color: "#d6dae0" }}>
                        <Check size={14} style={{ color: C.green, flexShrink: 0 }} /> {f.text}
                      </span>
                    ))}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "400 11.5px Poppins", color: C.dim, marginTop: 4 }}>
                      <ShieldCheck size={13} style={{ color: C.green }} /> {meta.note}
                    </span>
                  </div>
                </aside>
              </div>
            </motion.div>
          )}

          {view === "success" && (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{ padding: "48px 30px", textAlign: "center" }}>
              <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} style={{ display: "inline-flex", width: 72, height: 72, borderRadius: "50%", alignItems: "center", justifyContent: "center", background: "rgba(46,189,133,0.16)", color: C.green, marginBottom: 18 }}>
                <CheckCircle2 size={40} />
              </motion.span>
              <h2 style={{ font: "700 22px Poppins", margin: "0 0 8px" }}>Payment successful</h2>
              <p style={{ font: "400 14px Poppins", color: C.muted, margin: "0 auto", maxWidth: 360 }}>
                Activating your Pro access now. You'll be taken to your dashboard in a moment.
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginTop: 22, font: "500 13px Poppins", color: C.dim }}>
                <BtnSpinner color={C.yellow} /> Confirming your subscription…
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <style jsx global>{`
          .jx-pay-overlay input::placeholder { color: ${C.dim}; }
          @media (max-width: 720px) {
            .jx-pay-checkout { grid-template-columns: 1fr !important; }
            .jx-pay-summary { order: -1; border-left: none !important; border-bottom: 1px solid ${C.borderSoft}; }
            .jx-pay-select { grid-template-columns: 1fr !important; }
            .jx-pay-select__right { border-left: none !important; border-top: 1px solid ${C.borderSoft}; }
          }
        `}</style>
      </motion.div>
    </motion.div>
  );
}

/* Minimal PayPal wordmark glyph (keeps bundle light, no extra dep). */
function PayPalGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.5 21l1.2-7.2h2.9c3.6 0 6.1-1.8 6.7-5.2.5-2.9-1.2-4.6-4.6-4.6H8.3a.8.8 0 0 0-.8.7L5 20.4a.5.5 0 0 0 .5.6h2z" fill="currentColor" opacity="0.55"/>
      <path d="M9.7 19l1.1-6.8h2.7c3.4 0 5.8-1.7 6.4-4.9.1-.4.1-.8.1-1.1 1 .6 1.5 1.7 1.1 3.6-.6 3.4-3 5.2-6.6 5.2h-2.6L10.6 19H9.7z" fill="currentColor"/>
    </svg>
  );
}
