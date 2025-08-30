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

export const formatCurrency = (value, symbol = "$", decimalPlaces = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) return `${symbol}0`;

  const formatted = formatNumber(num, decimalPlaces);

  return `${num < 0 ? "-" : ""}${symbol}${formatted.replace("-", "")}`;
};
