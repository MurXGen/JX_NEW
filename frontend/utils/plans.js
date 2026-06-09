/* Shared plan config — used by the public /pricing page and the in-dashboard
   Upgrade panel so prices/features never drift between them. */

export const monthlyPriceId = process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID;
export const yearlyPriceId = process.env.NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID;
export const lifetimePriceId = process.env.NEXT_PUBLIC_PADDLE_LIFETIME_PRICE_ID;

export const PLANS_FEATURES = {
  free: [
    { text: "30 trades / month" },
    { text: "1 journal" },
    { text: "1 screenshot per trade" },
    { text: "Basic charts · 30-day history" },
  ],
  pro: [
    { text: "Unlimited trades" },
    { text: "Advanced analytics" },
    { text: "3 accounts" },
    { text: "Full trade history" },
  ],
  lifetime: [
    { text: "Lifetime updates" },
    { text: "All Pro features" },
    { text: "Priority support" },
    { text: "Early beta access" },
  ],
};

/* Display prices per currency. Amounts sent to Paddle/crypto are the same
   regardless (USD-denominated); only the displayed label changes. */
export const PRICE_LABELS = {
  USD: { free: "$0", monthly: "$3.49", yearly: "$29.99", lifetime: "$99" },
  INR: { free: "₹0", monthly: "₹149", yearly: "₹1,499", lifetime: "₹7,999" },
};

export const getUserCurrency = () => {
  if (typeof window === "undefined") return "USD";
  const locale = navigator.language || "";
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  if (locale.startsWith("en-IN")) return "INR";
  if (timeZone.includes("Asia/Calcutta") || timeZone.includes("Asia/Kolkata")) return "INR";
  return "USD";
};

/* Build the plan config for a given currency. Defaults to USD so SSR and the
   first client render match (avoids hydration mismatch). */
export function buildPlansConfig(currency = "USD") {
  const label = PRICE_LABELS[currency] || PRICE_LABELS.USD;
  return {
    free: { title: "Free", price: label.free, amount: "0", currency, period: "monthly", planName: "Pro", tagline: "Flexible monthly access", popular: false, paddlePriceId: monthlyPriceId },
    monthly: { title: "Pro Monthly", price: label.monthly, amount: "3.49", currency, period: "monthly", planName: "Pro", tagline: "Flexible monthly access", popular: false, paddlePriceId: monthlyPriceId },
    yearly: { title: "Pro Yearly", price: label.yearly, amount: "29.99", currency, period: "yearly", planName: "Pro", tagline: "Most popular • Save 28%", popular: true, savings: "28%", paddlePriceId: yearlyPriceId },
    lifetime: { title: "Lifetime", price: label.lifetime, amount: "99", currency, period: "lifetime", planName: "Lifetime", tagline: "One payment, forever access", popular: false, value: "Best value", paddlePriceId: lifetimePriceId },
  };
}

export const PLANS_CONFIG = buildPlansConfig("USD");
