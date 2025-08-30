export default function TickerAnalysis({ trades }) {
  const tickerMap = {};

  trades.forEach((t) => {
    if (!tickerMap[t.symbol]) tickerMap[t.symbol] = { count: 0, pnl: 0 };
    tickerMap[t.symbol].count++;
    tickerMap[t.symbol].pnl += t.pnl || 0;
  });

  return (
    <div>
      <h2>Ticker Analysis</h2>
      {Object.entries(tickerMap).map(([symbol, data]) => (
        <p key={symbol}>
          {symbol}: {data.count} trades, PnL {data.pnl}
        </p>
      ))}
    </div>
  );
}
