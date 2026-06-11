/* Shared formatting helpers (ported from the web behaviour). */

export const currencySymbol = (code) =>
  ({ INR: "₹", USD: "$", USDT: "$", EUR: "€", GBP: "£" }[code] || "$");

// numbers >= 1250 abbreviate to k (matches the web demo): 1250 -> 1.25k
export const abbr = (abs) =>
  abs >= 1250 ? `${(abs / 1000).toFixed(2).replace(/\.?0+$/, "")}k` : abs.toLocaleString();

export const money = (n, sym = "$") => `${n < 0 ? "−" : "+"}${sym}${abbr(Math.abs(Number(n) || 0))}`;

export const fmt = (n, d = 1) => (Number(n) || 0).toFixed(d);
