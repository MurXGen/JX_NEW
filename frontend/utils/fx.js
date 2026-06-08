/* fx.js — base-currency conversion for revamp v2.
   Stored trade values are treated as USD; rates from open.er-api.com
   (no key needed), cached in localStorage for 12h. */

const CACHE_KEY = "jx-fx-rates";
const CACHE_MS = 12 * 60 * 60 * 1000;

export const getBaseCurrency = () => {
  if (typeof window === "undefined") return "USD";
  return localStorage.getItem("jx-base-currency") || "USD";
};

export const setBaseCurrency = (cur) => {
  localStorage.setItem("jx-base-currency", cur);
  window.dispatchEvent(new CustomEvent("jx-currency-changed", { detail: cur }));
};

export async function getRate(toCurrency) {
  const to = (toCurrency || "USD").toUpperCase();
  if (to === "USD" || to === "USDT") return 1;

  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && Date.now() - cached.ts < CACHE_MS && cached.rates?.[to]) {
      return cached.rates[to];
    }
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    if (data?.rates) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), rates: data.rates }));
      return data.rates[to] || 1;
    }
  } catch (e) {
    console.error("FX rates fetch failed:", e);
  }
  return 1;
}

/* Convert a trade's monetary fields (assumed USD) into the base currency. */
export const convertTrade = (t, rate) => {
  if (!rate || rate === 1) return t;
  const m = (v) => (v == null || v === "" ? v : Number(v) * rate);
  return {
    ...t,
    pnl: m(t.pnl),
    pnlAfterFee: m(t.pnlAfterFee),
    feeAmount: m(t.feeAmount),
    quantityUSD: m(t.quantityUSD),
    entryPrice: m(t.entryPrice),
    exitPrice: m(t.exitPrice),
    avgEntryPrice: m(t.avgEntryPrice),
    avgExitPrice: m(t.avgExitPrice),
    avgSLPrice: m(t.avgSLPrice),
    avgTPPrice: m(t.avgTPPrice),
    expectedProfit: m(t.expectedProfit),
    expectedLoss: m(t.expectedLoss),
  };
};
