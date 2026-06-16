import { getCurrencySymbol } from "./currencySymbol";

/* YouTube-style compact numbers (always 2 decimals on k/m):
   1212 → 1.21k · 10550 → 10.55k · 120050 → 120.50k · 1_200_000 → 1.20m
   Below 1000 shows the plain number (max 2 decimals). */
export const compactNumber = (value) => {
  const num = Number(value);
  if (!isFinite(num)) return "0";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(2)}k`;
  return `${sign}${abs.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

/* Same scheme, prefixed with a currency symbol (sign before the symbol). */
export const compactMoney = (value, symbol = "$") => {
  const num = Number(value);
  if (!isFinite(num)) return `${symbol}0`;
  const sign = num < 0 ? "-" : "";
  return `${sign}${symbol}${compactNumber(Math.abs(num))}`;
};

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
