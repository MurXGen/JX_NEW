// utils/currencySymbol.js
export const getCurrencySymbol = (currencyCode) => {
  const map = {
    usd: "$",
    inr: "₹",
    eur: "€",
    gbp: "£",
    jpy: "¥",
    usdt: "₮",
  };

  // Defensive check
  if (!currencyCode || typeof currencyCode !== "string") {
    warn(
      "⚠️ Invalid currencyCode provided to getCurrencySymbol:",
      currencyCode
    );
    return "$"; // Fallback generic token icon
  }

  return map[currencyCode.toLowerCase()] || "$";
};
