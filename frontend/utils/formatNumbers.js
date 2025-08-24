export const formatNumber = (value, decimalPlaces = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  
  const absValue = Math.abs(num);
  
  if (absValue >= 1000000) {
    const formatted = (num / 1000000).toFixed(decimalPlaces);
    return `${formatted.replace(/\.0+$/, '')}M`;
  }
  
  if (absValue >= 1000) {
    const formatted = (num / 1000).toFixed(decimalPlaces);
    return `${formatted.replace(/\.0+$/, '')}K`;
  }
  
  return num.toFixed(decimalPlaces);
};

export const formatCurrency = (value, symbol = '$', decimalPlaces = 2) => {
  const formatted = formatNumber(value, decimalPlaces);
  return `${value >= 0 ? '' : '-'}${symbol}${formatted.replace('-', '')}`;
};