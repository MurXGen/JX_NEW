// utils/gtag.js — GA4 + (optional) Meta Pixel event layer.
// GA loads in _app.js when NEXT_PUBLIC_GA_MEASUREMENT_ID is set; the Meta Pixel
// loads when NEXT_PUBLIC_FB_PIXEL_ID is set. Every helper is a safe no-op if the
// relevant tag isn't present, so nothing breaks in dev or without env vars.

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// page_view event (kept for backwards-compat; called from _app.js)
export const pageview = (url) => {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("config", GA_MEASUREMENT_ID, { page_path: url });
};

// generic custom event (kept for backwards-compat)
export const event = ({ action, category, label, value }) => {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", action, { event_category: category, event_label: label, value });
};

/* ---- internal: fire one funnel step to GA4 and Meta Pixel ---- */
function fire(gaName, gaParams = {}, fbName = null, fbParams = {}) {
  if (typeof window === "undefined") return;
  try { if (window.gtag) window.gtag("event", gaName, gaParams); } catch {}
  try { if (window.fbq && fbName) window.fbq("track", fbName, fbParams); } catch {}
}

/* ============================================================
   Funnel events — the pipeline you actually want to measure:
   page_view → sign_up → email_verified → begin_checkout
             → add_payment_info → purchase
   ============================================================ */

// Account created (registration form submitted successfully)
export const trackSignUp = (method = "email") =>
  fire("sign_up", { method }, "CompleteRegistration", { status: "started", method });

// Email/OTP verified — the real activation of a new account
export const trackEmailVerified = () =>
  fire("email_verified", {}, "Lead", { content_name: "email_verified" });

// User picked a plan and opened checkout
export const trackBeginCheckout = ({ plan, value, currency = "USD" } = {}) =>
  fire(
    "begin_checkout",
    { currency, value: Number(value) || undefined, items: plan ? [{ item_id: plan, item_name: plan }] : undefined },
    "InitiateCheckout",
    { content_name: plan, value: Number(value) || undefined, currency },
  );

// User chose a payment method (card/paypal/crypto)
export const trackAddPaymentInfo = ({ plan, method, value, currency = "USD" } = {}) =>
  fire(
    "add_payment_info",
    { payment_type: method, currency, value: Number(value) || undefined, items: plan ? [{ item_id: plan, item_name: plan }] : undefined },
    "AddPaymentInfo",
    { content_name: plan, value: Number(value) || undefined, currency },
  );

// Subscription became active. De-duped within a browser session so the card
// (polling) and crypto (success-page) paths can't double-count the same sale.
export const trackPurchase = ({ plan, value, currency = "USD", id } = {}) => {
  if (typeof window === "undefined") return;
  try {
    const key = "jx-purchase-tracked";
    const stamp = id || plan || "purchase";
    if (sessionStorage.getItem(key) === stamp) return; // already counted this one
    sessionStorage.setItem(key, stamp);
  } catch {}
  fire(
    "purchase",
    { transaction_id: id || `${plan || "sub"}-${Date.now()}`, currency, value: Number(value) || undefined, items: plan ? [{ item_id: plan, item_name: plan }] : undefined },
    "Purchase",
    { content_name: plan, value: Number(value) || undefined, currency },
  );
};
