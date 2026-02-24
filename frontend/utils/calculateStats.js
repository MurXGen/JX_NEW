export const calculateStats = (accountTrades = []) => {
  // Only include trades that are closed
  const closedTrades = accountTrades.filter((t) => t.closeTime);

  if (!Array.isArray(closedTrades) || closedTrades.length === 0) {
    return {
      netPnL: 0,
      maxProfit: 0,
      maxLoss: 0,
      totalTrades: 0,
      streak: "0",
      totalSymbols: 0,
      winTrades: 0,
      loseTrades: 0,
      dailyData: [],
      dailyVolumeData: [],
      last10: [],
      greedFear: { value: 50, label: "Neutral" },
      bestTime: "N/A",
      worstTime: "N/A",
      winRatio: 0,
      averagePnL: 0,
      totalVolume: 0,
      totalFees: 0,
      tagAnalysis: [],
    };
  }

  // PnL calculations
  const pnlValues = closedTrades.map((t) => t.pnl || 0);
  const netPnL = pnlValues.reduce((sum, p) => sum + p, 0);
  const totalFees = closedTrades.reduce(
    (sum, t) => sum + (t.feeAmount || 0),
    0,
  );
  const maxProfit = Math.max(...pnlValues.filter((p) => p > 0), 0);
  const maxLoss = Math.min(...pnlValues.filter((p) => p < 0), 0);
  const totalTrades = closedTrades.length;

  // Streak calculation
  const last10 = closedTrades.slice(-10);
  let streakType = null;
  let streakCount = 0;
  for (let i = last10.length - 1; i >= 0; i--) {
    const result =
      last10[i].pnl > 0 ? "win" : last10[i].pnl < 0 ? "loss" : "break-even";
    if (!streakType) {
      streakType = result;
      streakCount = 1;
    } else if (streakType === result) {
      streakCount++;
    } else {
      break;
    }
  }

  const uniqueSymbols = new Set(closedTrades.map((t) => t.symbol)).size;
  const winTrades = closedTrades.filter((t) => t.pnl > 0).length;
  const loseTrades = closedTrades.filter((t) => t.pnl < 0).length;
  const winRatio = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;
  const averagePnL = totalTrades > 0 ? netPnL / totalTrades : 0;

  // Best/Worst Time calculation with formatted time labels
  const timeRanges = [
    { label: "00AM-06AM", start: 0, end: 6 },
    { label: "06AM-12PM", start: 6, end: 12 },
    { label: "12PM-06PM", start: 12, end: 18 },
    { label: "06PM-12AM", start: 18, end: 24 },
  ];

  const pnlByTimeRange = {
    "00AM-06AM": 0,
    "06AM-12PM": 0,
    "12PM-06PM": 0,
    "06PM-12AM": 0,
  };

  closedTrades.forEach((trade) => {
    const hour = new Date(trade.closeTime).getHours();
    const range = timeRanges.find((r) => hour >= r.start && hour < r.end);
    if (range) {
      pnlByTimeRange[range.label] += trade.pnl || 0;
    }
  });

  const bestEntry = Object.entries(pnlByTimeRange).reduce(
    (a, b) => (b[1] > a[1] ? b : a),
    ["N/A", 0],
  );
  const worstEntry = Object.entries(pnlByTimeRange).reduce(
    (a, b) => (b[1] < a[1] ? b : a),
    ["N/A", 0],
  );

  const bestTime = bestEntry[1] > 0 ? bestEntry[0] : "N/A";
  const worstTime = worstEntry[1] < 0 ? worstEntry[0] : "N/A";

  // Total volume & daily aggregations
  const totalVolume = closedTrades.reduce(
    (sum, t) => sum + (t.totalQuantity || 0),
    0,
  );

  const dailyPnL = {};
  const dailyVolume = {};
  closedTrades.forEach((trade) => {
    const date = new Date(trade.closeTime).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    dailyPnL[date] = (dailyPnL[date] || 0) + (trade.pnl || 0);

    const qty = trade.totalQuantity || 0;
    if (!dailyVolume[date])
      dailyVolume[date] = { longVolume: 0, shortVolume: 0 };

    if (trade.direction?.toLowerCase() === "long")
      dailyVolume[date].longVolume += qty;
    else if (trade.direction?.toLowerCase() === "short")
      dailyVolume[date].shortVolume += qty;
  });

  const dailyData = Object.entries(dailyPnL)
    .map(([date, pnl]) => ({ date, pnl }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const dailyVolumeData = Object.entries(dailyVolume)
    .map(([date, { longVolume, shortVolume }]) => ({
      date,
      longVolume,
      shortVolume,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Greed/Fear index
  let gfIndex = 50;
  last10.forEach((trade) => {
    if (trade.pnl > 0) gfIndex += 5;
    else if (trade.pnl < 0) gfIndex -= 5;
  });
  gfIndex = Math.max(0, Math.min(100, gfIndex));
  const gfLabel = gfIndex < 50 ? "Fear" : gfIndex > 50 ? "Greed" : "Neutral";

  // Tag/Reason analysis
  const tagAnalysis = {};
  closedTrades.forEach((trade) => {
    const reasons = trade.reason || [];
    const pnl = trade.pnl || 0;
    const isWin = pnl > 0;
    const isLoss = pnl < 0;

    reasons.forEach((reason) => {
      if (!tagAnalysis[reason]) {
        tagAnalysis[reason] = {
          tag: reason,
          totalTrades: 0,
          winTrades: 0,
          loseTrades: 0,
          totalPnL: 0,
          avgPnL: 0,
          winRate: 0,
        };
      }
      tagAnalysis[reason].totalTrades++;
      tagAnalysis[reason].totalPnL += pnl;
      if (isWin) tagAnalysis[reason].winTrades++;
      if (isLoss) tagAnalysis[reason].loseTrades++;
    });
  });

  Object.values(tagAnalysis).forEach((tag) => {
    tag.avgPnL = tag.totalTrades > 0 ? tag.totalPnL / tag.totalTrades : 0;
    tag.winRate =
      tag.totalTrades > 0 ? (tag.winTrades / tag.totalTrades) * 100 : 0;
  });

  const sortedTagAnalysis = Object.values(tagAnalysis).sort(
    (a, b) => b.totalPnL - a.totalPnL,
  );

  return {
    netPnL,
    maxProfit,
    maxLoss,
    totalTrades,
    streak: `${streakCount} ${streakType || ""}`,
    totalSymbols: uniqueSymbols,
    winTrades,
    loseTrades,
    dailyData,
    dailyVolumeData,
    last10,
    greedFear: { value: gfIndex, label: gfLabel },
    bestTime,
    worstTime,
    winRatio: winRatio.toFixed(2),
    averagePnL: averagePnL.toFixed(2),
    totalVolume,
    totalFees,
    tagAnalysis: sortedTagAnalysis,
  };
};

export const calculateTickerStats = (closedTrades) => {
  if (!closedTrades.length) {
    return {
      totalTickers: 0,
      mostTraded: "-",
      bestPerformer: "-",
      worstPerformer: "-",
      highestWinRate: "-",
      bestLong: null,
      bestShort: null,
      worstLong: null,
      worstShort: null,
    };
  }

  const tickerMap = {};

  let bestLong = null;
  let bestShort = null;
  let worstLong = null;
  let worstShort = null;

  closedTrades.forEach((trade) => {
    const { ticker, pnl, direction } = trade;
    if (!ticker) return;

    // Initialize ticker
    if (!tickerMap[ticker]) {
      tickerMap[ticker] = {
        trades: 0,
        totalPnl: 0,
        wins: 0,
      };
    }

    tickerMap[ticker].trades += 1;
    tickerMap[ticker].totalPnl += pnl || 0;
    if (pnl > 0) tickerMap[ticker].wins += 1;

    // Track best/worst by direction
    if (direction === "long") {
      if (!bestLong || pnl > bestLong.pnl) bestLong = trade;
      if (!worstLong || pnl < worstLong.pnl) worstLong = trade;
    }

    if (direction === "short") {
      if (!bestShort || pnl > bestShort.pnl) bestShort = trade;
      if (!worstShort || pnl < worstShort.pnl) worstShort = trade;
    }
  });

  const tickers = Object.entries(tickerMap);

  const totalTickers = tickers.length;

  const mostTraded = tickers.reduce((a, b) =>
    b[1].trades > a[1].trades ? b : a,
  )[0];

  const bestPerformer = tickers.reduce((a, b) =>
    b[1].totalPnl > a[1].totalPnl ? b : a,
  )[0];

  const worstPerformer = tickers.reduce((a, b) =>
    b[1].totalPnl < a[1].totalPnl ? b : a,
  )[0];

  const highestWinRate = tickers
    .map(([ticker, data]) => ({
      ticker,
      winRate: data.trades > 0 ? data.wins / data.trades : 0,
    }))
    .reduce((a, b) => (b.winRate > a.winRate ? b : a)).ticker;

  return {
    totalTickers,
    mostTraded,
    bestPerformer,
    worstPerformer,
    highestWinRate,
    bestLong,
    bestShort,
    worstLong,
    worstShort,
  };
};
