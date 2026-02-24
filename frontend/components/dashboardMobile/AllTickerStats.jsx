import React, { useMemo } from "react";

const AllTickerStats = ({ trades = [], currencySymbol = "$" }) => {
  const tickerStats = useMemo(() => {
    if (!trades.length) return null;

    const closedTrades = trades.filter((t) => t.pnl !== undefined && t.symbol);

    const tickerMap = {};

    closedTrades.forEach((trade) => {
      const { symbol, pnl = 0, direction } = trade;

      if (!tickerMap[symbol]) {
        tickerMap[symbol] = {
          totalTrades: 0,
          wins: 0,
          totalPnl: 0,
          longPnl: 0,
          shortPnl: 0,
        };
      }

      tickerMap[symbol].totalTrades += 1;
      tickerMap[symbol].totalPnl += pnl;

      if (pnl > 0) tickerMap[symbol].wins += 1;

      if (direction === "long") {
        tickerMap[symbol].longPnl += pnl;
      } else if (direction === "short") {
        tickerMap[symbol].shortPnl += pnl;
      }
    });

    const entries = Object.entries(tickerMap);
    if (!entries.length) return null;

    const totalTickers = entries.length;

    const mostTraded = entries.reduce((a, b) =>
      b[1].totalTrades > a[1].totalTrades ? b : a,
    )[0];

    const bestPerformer = entries.reduce((a, b) =>
      b[1].totalPnl > a[1].totalPnl ? b : a,
    )[0];

    const worstPerformer = entries.reduce((a, b) =>
      b[1].totalPnl < a[1].totalPnl ? b : a,
    )[0];

    const highestWinRate = entries
      .map(([symbol, data]) => ({
        symbol,
        winRate: (data.wins / data.totalTrades) * 100,
      }))
      .reduce((a, b) => (b.winRate > a.winRate ? b : a)).symbol;

    const bestLong = entries.reduce((a, b) =>
      b[1].longPnl > a[1].longPnl ? b : a,
    )[0];

    const worstLong = entries.reduce((a, b) =>
      b[1].longPnl < a[1].longPnl ? b : a,
    )[0];

    const bestShort = entries.reduce((a, b) =>
      b[1].shortPnl > a[1].shortPnl ? b : a,
    )[0];

    const worstShort = entries.reduce((a, b) =>
      b[1].shortPnl < a[1].shortPnl ? b : a,
    )[0];

    return {
      totalTickers,
      mostTraded,
      bestPerformer,
      worstPerformer,
      highestWinRate,
      bestLong,
      worstLong,
      bestShort,
      worstShort,
    };
  }, [trades]);

  if (!tickerStats) return null;

  const StatCard = ({ title, value }) => (
    <div className="stats-card radius-12">
      <span className="card-label">{title}</span>
      <span className="card-value">{value}</span>
    </div>
  );

  return (
    <div className="analytics flexClm">
      <div className="overall">
        <StatCard title="Total Tickers" value={tickerStats.totalTickers} />
        <StatCard title="Most Traded" value={tickerStats.mostTraded} />
        <StatCard title="Best Performer" value={tickerStats.bestPerformer} />
        <StatCard title="Worst Performer" value={tickerStats.worstPerformer} />
        <StatCard title="Highest Win Rate" value={tickerStats.highestWinRate} />
        <StatCard title="Best Long" value={tickerStats.bestLong} />
        <StatCard title="Worst Long" value={tickerStats.worstLong} />
        <StatCard title="Best Short" value={tickerStats.bestShort} />
        <StatCard title="Worst Short" value={tickerStats.worstShort} />
      </div>
    </div>
  );
};

export default AllTickerStats;
