"use client";

/* Checkout logic shared by in-dashboard upgrade surfaces that show the plan,
   payment method and Paddle form in ONE window (no second modal on top).
     card / PayPal → Paddle inline checkout mounted into `.jx-paddle-frame`
     crypto        → /cryptobillingpage
   After Paddle's checkout.completed the window shows the success screen:
     phase "activating" → waiting for the server to apply the plan
     phase "active"     → plan confirmed; counts down, then opens the dashboard
     phase "slow"       → not confirmed yet after 45s; offers a manual refresh
   `receipt` carries the price breakdown Paddle reported (incl. coupon).
   PaymentModal keeps its own copy for the public pricing pages. */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { saveToIndexedDB } from "@/utils/indexedDB";
import { markJustUpgraded } from "@/components/app/celebrate";

const API = process.env.NEXT_PUBLIC_API_URL;
const COUNTDOWN = 6;

export function paymentMethods(currency) {
  const inr = currency === "INR";
  return [
    { id: "card", title: inr ? "UPI & Cards" : "Card", desc: inr ? "UPI autopay, Visa, Mastercard, Amex" : "Visa, Mastercard, Amex & more" },
    { id: "paypal", title: "PayPal", desc: "Pay with your PayPal balance" },
    { id: "crypto", title: "Crypto (USDT)", desc: "USDT on ETH, TRON, BSC, SOL" },
  ];
}

/* Paddle.js checkout.completed data → a plain receipt. Totals in event data
   are in major units (e.g. 29.99). */
function toReceipt(data, meta) {
  if (!data) return null;
  const num = (v) => (v == null || v === "" ? null : Number(v));
  const t = data.totals || {};
  const item = data.items?.[0] || {};
  return {
    txnId: data.transaction_id || data.id || null,
    currency: data.currency_code || "USD",
    planKey: meta?.key || null,
    planName: meta?.name || item.product?.name || "Pro",
    subtotal: num(t.subtotal),
    discount: num(t.discount) || 0,
    tax: num(t.tax) || 0,
    total: num(t.total),
    code: data.discount?.code || meta?.promo || null,
    interval: item.billing_cycle?.interval || (meta?.key === "lifetime" ? null : meta?.key === "yearly" ? "year" : "month"),
  };
}

export default function useCheckout({ open, plans, planKey, loginRedirect = "/dashboard" }) {
  const router = useRouter();
  const [view, setView] = useState("select"); // select | checkout | success
  const [method, setMethod] = useState("card");
  const [promoOpen, setPromoOpen] = useState(false);
  const [promo, setPromo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [args, setArgs] = useState(null);
  const [phase, setPhaseState] = useState("activating"); // activating | active | slow
  const [receipt, setReceipt] = useState(null);
  const [countdown, setCountdown] = useState(COUNTDOWN);
  const phaseRef = useRef("activating");
  const metaRef = useRef(null);
  const pollRef = useRef(null);
  const timersRef = useRef([]);
  const openedRef = useRef(false);

  const setPhase = (p) => { phaseRef.current = p; setPhaseState(p); };
  const clearTimers = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    timersRef.current.forEach((t) => { clearTimeout(t); clearInterval(t); });
    timersRef.current = [];
  };

  // fresh state each time the window opens
  useEffect(() => {
    if (!open) return;
    setView("select"); setMethod("card"); setPromoOpen(false); setPromo("");
    setError(""); setBusy(false); setArgs(null); setPhase("activating"); setReceipt(null); setCountdown(COUNTDOWN);
    openedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // tidy up polling, timers and any Paddle frame
  useEffect(() => () => {
    clearTimers();
    try { window?.Paddle?.Checkout?.close?.(); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (open) return;
    try { window?.Paddle?.Checkout?.close?.(); } catch {}
  }, [open]);

  const upgradedPlan = () => (metaRef.current?.key === "lifetime" ? "lifetime" : "pro");

  // Go to a fresh dashboard that celebrates. router.push("/dashboard") does
  // nothing when the window is already open ON /dashboard, so reload there.
  const goDashboard = () => {
    clearTimers();
    markJustUpgraded(upgradedPlan());
    if (router.pathname === "/dashboard") window.location.reload();
    else router.push("/dashboard");
  };

  // plan confirmed on the server: show it, then continue automatically
  const activate = async (userData) => {
    if (phaseRef.current === "active") return;
    setPhase("active");
    if (pollRef.current) clearInterval(pollRef.current);
    try {
      if (userData) await saveToIndexedDB("user-data", userData);
      window.dispatchEvent(new CustomEvent("jx-sub-changed"));
    } catch {}
    let n = COUNTDOWN;
    setCountdown(n);
    const id = setInterval(() => {
      n -= 1;
      setCountdown(Math.max(0, n));
      if (n <= 0) { clearInterval(id); goDashboard(); }
    }, 1000);
    timersRef.current.push(id);
  };

  const fetchUser = async () => {
    const res = await fetch(`${API}/api/auth/user-info`, { credentials: "include" });
    const json = await res.json();
    return { json, userData: json?.userData || json };
  };

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const { json, userData } = await fetchUser();
        const status = userData?.subscription?.status ?? json?.subscription?.status ?? userData?.subscriptionStatus;
        const p = (userData?.subscription?.plan || "").toLowerCase();
        if (status === "active" && (p.includes("pro") || p.includes("lifetime"))) {
          activate(userData);
          return;
        }
      } catch {}
      if (attempts >= 24) {
        clearInterval(pollRef.current);
        if (phaseRef.current !== "active") setPhase("slow");
      }
    }, 5000);
  };

  // Paddle's checkout.completed (bridged by PaddleLoader) and the server's
  // confirmation (PaddleLoader's retrying verify)
  useEffect(() => {
    if (!open) return undefined;
    const onPaddle = (e) => {
      if (e?.detail?.name !== "checkout.completed") return;
      setReceipt(toReceipt(e.detail.data, metaRef.current));
      setView("success");
      setPhase("activating");
      startPolling();
      const t = setTimeout(() => { if (phaseRef.current === "activating") setPhase("slow"); }, 45000);
      timersRef.current.push(t);
    };
    const onVerified = async (e) => {
      if (!e?.detail?.ok) { if (phaseRef.current !== "active") setPhase("slow"); return; }
      let userData = null;
      try { ({ userData } = await fetchUser()); } catch {}
      activate(userData);
    };
    window.addEventListener("jx-paddle", onPaddle);
    window.addEventListener("jx-paddle-verified", onVerified);
    return () => { window.removeEventListener("jx-paddle", onPaddle); window.removeEventListener("jx-paddle-verified", onVerified); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // open Paddle inline once the frame container is in the DOM
  useEffect(() => {
    if (view !== "checkout" || !args || openedRef.current) return undefined;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      const el = document.querySelector(".jx-paddle-frame");
      if (el && window?.Paddle?.Checkout) {
        clearInterval(id);
        openedRef.current = true;
        try {
          const customer = args.email && /\S+@\S+\.\S+/.test(args.email) ? { email: args.email } : undefined;
          window.Paddle.Checkout.open({
            items: [{ priceId: args.priceId, quantity: 1 }],
            customData: { userId: args.userId },
            ...(customer ? { customer } : {}),
            ...(args.promo ? { discountCode: args.promo } : {}),
            settings: {
              displayMode: "inline",
              frameTarget: "jx-paddle-frame",
              frameInitialHeight: 460,
              frameStyle: "width:100%; min-width:280px; background-color: #ffffff; border: none;",
              theme: "light",
              allowLogout: false,
              showAddDiscounts: !args.promo,
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
        setError("Payment system is still loading, please try again.");
        setView("select");
      }
    }, 50);
    return () => clearInterval(id);
  }, [view, args]);

  const resolveUser = async () => {
    try {
      const res = await fetch(`${API}/api/auth/user-info`, { credentials: "include" });
      const json = await res.json();
      return {
        userId: json?.userData?.userId || json?.userData?._id || json?.userId,
        email: json?.userData?.email || json?.email,
      };
    } catch {
      return { userId: null, email: null };
    }
  };

  const plan = plans?.[planKey] || {};

  const start = async () => {
    if (busy) return;
    setError("");
    if (method === "crypto") {
      setBusy(true);
      router.push({ pathname: "/cryptobillingpage", query: { planName: plan.planName, period: plan.period, amount: plan.amount } });
      return;
    }
    if (!plan?.paddlePriceId) { setError("This plan isn't available for card payment right now. Try crypto or contact support."); return; }
    if (!window?.Paddle?.Checkout) { setError("Payment system is still loading, please try again in a moment."); return; }
    setBusy(true);
    const { userId, email } = await resolveUser();
    if (!userId) { router.push(`/login?redirect=${encodeURIComponent(loginRedirect)}`); return; }
    openedRef.current = false;
    metaRef.current = { key: planKey, name: plan.planName, promo: promo.trim() || null };
    setArgs({ priceId: plan.paddlePriceId, userId, email, promo: promo.trim() });
    setView("checkout");
    setBusy(false);
  };

  const back = () => {
    try { window?.Paddle?.Checkout?.close?.(); } catch {}
    openedRef.current = false;
    setArgs(null);
    setView("select");
  };

  return { view, phase, slow: phase === "slow", receipt, countdown, goDashboard, method, setMethod, promoOpen, setPromoOpen, promo, setPromo, busy, error, start, back };
}
