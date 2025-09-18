// utils/processPnLCandles.js
export const processPnLCandles = (trades) => {
  if (!trades || trades.length === 0) return [];

  // Group trades by date
  const tradesByDate = {};

  trades.forEach((trade) => {
    // Extract date part only (ignore time)
    const date = new Date(trade.openTime).toISOString().split("T")[0];

    if (!tradesByDate[date]) {
      tradesByDate[date] = [];
    }

    tradesByDate[date].push(trade);
  });

  // Sort dates chronologically
  const sortedDates = Object.keys(tradesByDate).sort();

  // Calculate candlestick data for each date
  const candleData = [];
  let previousClose = 0;

  sortedDates.forEach((date) => {
    const dateTrades = tradesByDate[date];
    let dayPnl = 0;
    let maxProfit = 0;
    let maxLoss = 0;

    // Calculate cumulative PnL for the day and track extremes
    dateTrades.forEach((trade) => {
      dayPnl += trade.pnl;

      // Track the highest positive value reached during the day
      if (dayPnl > maxProfit) {
        maxProfit = dayPnl;
      }

      // Track the lowest negative value reached during the day
      if (dayPnl < maxLoss) {
        maxLoss = dayPnl;
      }
    });

    // Determine open, high, low, close values
    const open = previousClose;
    const close = previousClose + dayPnl;

    // High is the maximum of (open, close, or any peak during the day)
    const high = Math.max(open, close, previousClose + maxProfit);

    // Low is the minimum of (open, close, or any trough during the day)
    const low = Math.min(open, close, previousClose + maxLoss);

    candleData.push({
      date,
      open,
      high,
      low,
      close,
      trades: dateTrades.length,
    });

    // Set previous close for next day
    previousClose = close;
  });

  return candleData;
};
