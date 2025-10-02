import { getCurrencySymbol } from "./currencySymbol";

export const formatNumber = (value, decimalPlaces = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) return "0";

  // ✅ Ensure decimalPlaces is always between 0–20 (JS limit)
  const safeDecimalPlaces =
    typeof decimalPlaces === "number" &&
    decimalPlaces >= 0 &&
    decimalPlaces <= 20
      ? decimalPlaces
      : 2;

  const absValue = Math.abs(num);

  // Millions
  if (absValue >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(safeDecimalPlaces);
    return `${parseFloat(formatted)}M`;
  }

  // 100k or above → show in K
  if (absValue >= 100_000) {
    const formatted = (num / 1_000).toFixed(safeDecimalPlaces);
    return `${parseFloat(formatted)}K`;
  }

  // < 100k → show commas
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: safeDecimalPlaces,
  });
};

export const formatCurrency = (value, symbolOverride, decimalPlaces = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) return "0";

  const formatted = formatNumber(num, decimalPlaces);

  const symbol =
    symbolOverride ||
    getCurrencySymbol(localStorage.getItem("currencyCode") || "usd");

  return `${num < 0 ? "-" : ""}${symbol}\u00A0${formatted.replace("-", "")}`;
};
