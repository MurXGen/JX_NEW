import { getCurrencySymbol } from "./currencySymbol";

export const formatNumber = (value, decimalPlaces = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) return "0";

  const absValue = Math.abs(num);

  // Millions
  if (absValue >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(decimalPlaces);
    return `${parseFloat(formatted)}M`;
  }

  // 100k or above → show in K (not commas)
  if (absValue >= 100_000) {
    const formatted = (num / 1_000).toFixed(decimalPlaces);
    return `${parseFloat(formatted)}K`;
  }

  // < 100k → show commas
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalPlaces,
  });
};

export const formatCurrency = (value, decimalPlaces = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) return "0";

  // 🔑 Get currencyCode from localStorage
  const currencyCode = localStorage.getItem("currencyCode") || "usd";
  const symbol = getCurrencySymbol(currencyCode);

  const formatted = formatNumber(num, decimalPlaces);

  // 👉 Add spacing (acts like padding-right for the symbol)
  return `${num < 0 ? "-" : ""}${symbol}\u00A0${formatted.replace("-", "")}`;
};
