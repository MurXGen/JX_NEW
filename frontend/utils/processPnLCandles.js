// utils/processPnLCandles.js
export const processPnLCandles = (trades) => {
  if (!trades || trades.length === 0) return [];

  // Filter out trades without closeTime
  const filteredTrades = trades.filter((trade) => trade.closeTime);

  if (filteredTrades.length === 0) return [];

  // Group trades by date
  const tradesByDate = {};

  filteredTrades.forEach((trade) => {
    const d = new Date(trade.closeTime);
    const date = `${d.getFullYear()}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;

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

    dateTrades.forEach((trade) => {
      dayPnl += trade.pnl;
      if (dayPnl > maxProfit) maxProfit = dayPnl;
      if (dayPnl < maxLoss) maxLoss = dayPnl;
    });

    const open = previousClose;
    const close = previousClose + dayPnl;
    const high = Math.max(open, close, previousClose + maxProfit);
    const low = Math.min(open, close, previousClose + maxLoss);

    candleData.push({
      date,
      open,
      high,
      low,
      close,
      trades: dateTrades.length,
    });

    previousClose = close;
  });

  return candleData;
};
