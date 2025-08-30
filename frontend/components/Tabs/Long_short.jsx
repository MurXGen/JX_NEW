export default function LongShorts({ trades }) {
  const longs = trades.filter((t) => t.side === "LONG").length;
  const shorts = trades.filter((t) => t.side === "SHORT").length;

  return (
    <div>
      <h2>Long vs Shorts</h2>
      <p>Long Trades: {longs}</p>
      <p>Short Trades: {shorts}</p>
    </div>
  );
}
