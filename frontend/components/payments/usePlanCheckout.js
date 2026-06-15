/* Shared plan-checkout logic (currency detection + Paddle/crypto flow +
   payment-modal state). Used by /pricing and the landing pricing section. */
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { getUserCurrency, detectCurrencyByIP, buildPlansConfig } from "@/utils/plans";

export function usePlanCheckout({ loginRedirect = "/pricing" } = {}) {
  const router = useRouter();
  const [currency, setCurrency] = useState("USD"); // SSR-safe default
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payLoading, setPayLoading] = useState(null);

  useEffect(() => {
    setCurrency(getUserCurrency());
    let active = true;
    detectCurrencyByIP().then((c) => { if (active) setCurrency(c); });
    return () => { active = false; };
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
    let userId;
    let email;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/user-info`, { credentials: "include" });
      const json = await res.json();
      userId = json?.userData?.userId || json?.userData?._id || json?.userId;
      email = json?.userData?.email || json?.email;
    } catch (e) {
      console.error("Could not resolve user for checkout:", e);
    }
    if (!userId) {
      router.push(`/login?redirect=${encodeURIComponent(loginRedirect)}`);
      return;
    }

    // Pre-fill the buyer's email so logged-in users don't retype it (like
    // UltraTrader). IMPORTANT: we deliberately do NOT pass a partial address.
    // Paddle ignores ALL prefill if the address is incomplete (e.g. a country
    // that requires a postal code, like India, without one) — so passing only
    // a valid email guarantees the email prefills; Paddle auto-detects country
    // by IP and only asks for ZIP where required.
    const customer = email && /\S+@\S+\.\S+/.test(email) ? { email } : undefined;

    // Match the checkout chrome to the user's current theme for a premium feel.
    let theme = "light";
    try { theme = localStorage.getItem("theme") === "dark" ? "dark" : "light"; } catch {}

    try {
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { userId },
        ...(customer ? { customer } : {}),
        settings: {
          displayMode: "overlay",
          theme,
          allowLogout: false, // hide "Not you? Change" — we already know the user
          showAddDiscounts: true,
          showAddTaxId: true,
        },
        successCallback: () => startSubscriptionPolling(),
        closeCallback: () => startSubscriptionPolling(),
      });
    } catch (error) {
      console.error("Error opening Paddle checkout:", error);
      alert("Failed to open checkout. Please try again.");
    }
  };

  const startSubscriptionPolling = () => {
    let attempts = 0;
    const maxAttempts = 12;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/user-info`, { credentials: "include" });
        const json = await res.json();
        const status =
          json?.userData?.subscription?.status ??
          json?.subscription?.status ??
          json?.subscriptionStatus;
        if (status === "active") {
          clearInterval(interval);
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
      if (attempts >= maxAttempts) clearInterval(interval);
    }, 5000);
  };

  // open the payment modal for a plan (or send to login first)
  const handlePlanClick = (planKey) => {
    if (Cookies.get("isVerified") !== "yes") {
      router.push(`/login?redirect=${encodeURIComponent(loginRedirect)}`);
      return;
    }
    setSelectedPlan(planKey);
    setIsModalOpen(true);
  };

  const handlePaymentOptionClick = async (option) => {
    if (!selectedPlan || payLoading) return;
    const planConfig = plans[selectedPlan];
    if (option === "crypto") {
      setPayLoading("crypto");
      router.push({
        pathname: "/cryptobillingpage",
        query: { planName: planConfig.planName, period: planConfig.period, amount: planConfig.amount },
      });
      return;
    }
    if (option === "cards_paypal") {
      setPayLoading("cards_paypal");
      try {
        await openPaddleCheckout(planConfig.paddlePriceId);
      } finally {
        setPayLoading(null);
        setIsModalOpen(false);
      }
    }
  };

  const closeModal = () => { if (!payLoading) setIsModalOpen(false); };

  return { currency, plans, selectedPlan, isModalOpen, payLoading, handlePlanClick, handlePaymentOptionClick, closeModal };
}
