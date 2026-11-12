"use client";

/* Checkout logic shared by in-dashboard upgrade surfaces that show the plan,
   payment method and Paddle form in ONE window (no second modal on top).
   Mirrors PaymentModal's flow exactly:
     card / PayPal → Paddle inline checkout mounted into `.jx-paddle-frame`
     crypto        → /cryptobillingpage
     checkout.completed → success view + poll user-info until the plan is active.
   PaymentModal keeps its own copy for the public pricing pages. */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { saveToIndexedDB } from "@/utils/indexedDB";

const API = process.env.NEXT_PUBLIC_API_URL;

export function paymentMethods(currency) {
  const inr = currency === "INR";
  return [
    { id: "card", title: inr ? "UPI & Cards" : "Card", desc: inr ? "UPI autopay, Visa, Mastercard, Amex" : "Visa, Mastercard, Amex & more" },
    { id: "paypal", title: "PayPal", desc: "Pay with your PayPal balance" },
    { id: "crypto", title: "Crypto (USDT)", desc: "USDT on ETH, TRON, BSC, SOL" },
  ];
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
  const pollRef = useRef(null);
  const openedRef = useRef(false);

  // fresh state each time the window opens
  useEffect(() => {
    if (!open) return;
    setView("select"); setMethod("card"); setPromoOpen(false); setPromo("");
    setError(""); setBusy(false); setArgs(null); openedRef.current = false;
  }, [open]);

  // tidy up polling + any Paddle frame
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    try { window?.Paddle?.Checkout?.close?.(); } catch {}
  }, []);
  useEffect(() => {
    if (open) return;
    try { window?.Paddle?.Checkout?.close?.(); } catch {}
  }, [open]);

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${API}/api/auth/user-info`, { credentials: "include" });
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

  // Paddle's checkout.completed (bridged by PaddleLoader)
  useEffect(() => {
    if (!open) return undefined;
    const onPaddle = (e) => {
      if (e?.detail?.name === "checkout.completed") { setView("success"); startPolling(); }
    };
    // server confirmed the payment (PaddleLoader's retrying verify): refresh
    // the stored user and go, instead of waiting for the next poll
    const onVerified = async (e) => {
      if (!e?.detail?.ok) return;
      try {
        const res = await fetch(`${API}/api/auth/user-info`, { credentials: "include" });
        const json = await res.json();
        const userData = json?.userData || json;
        if (userData) await saveToIndexedDB("user-data", userData);
        window.dispatchEvent(new CustomEvent("jx-sub-changed"));
      } catch {}
      if (pollRef.current) clearInterval(pollRef.current);
      router.push("/dashboard");
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

  return { view, method, setMethod, promoOpen, setPromoOpen, promo, setPromo, busy, error, start, back };
}
