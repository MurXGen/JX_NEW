import React from "react";

const TradeCard = ({ trade, onClick, currencySymbol = "$" }) => {
  const pnlValue =
    trade.pnlAfterFee && trade.pnlAfterFee !== 0
      ? trade.pnlAfterFee
      : trade.pnl;

  const isProfit = pnlValue > 0;

  const closeDateObj = trade.closeTime ? new Date(trade.closeTime) : null;

  const openDateObj = trade.openTime ? new Date(trade.openTime) : null;

  const formattedDate = closeDateObj ? closeDateObj.toLocaleDateString() : "-";

  const formattedTime = closeDateObj
    ? closeDateObj.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  // Calculate Duration
  const duration =
    openDateObj && closeDateObj
      ? Math.round((closeDateObj - openDateObj) / 1000)
      : null;

  const formatDuration = (seconds) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);

    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    if (mins > 0) return `${mins}m`;
    return `${seconds}s`;
  };

  return (
    <div className="trade-card radius-12" onClick={() => onClick(trade._id)}>
      {/* Middle - Info */}
      <div className="trade-info">
        <div className="trade-header">
          <span className="trade-symbol">{trade.symbol}</span>

          <span
            className={`trade-direction ${
              trade.direction === "long" ? "long" : "short"
            }`}
          >
            {trade.direction?.toUpperCase()}
          </span>
        </div>

        <div className="trade-meta">
          <span>📅 {formattedDate}</span>
          <span>⏰ {formattedTime}</span>
          {duration && <span>⏳ {formatDuration(duration)}</span>}
        </div>
      </div>

      {/* Right - PnL */}
      <div className="trade-pnl">
        <span className={isProfit ? "success" : "error"}>
          {isProfit ? "+" : ""}
          {currencySymbol}
          {pnlValue.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

const TradeList = ({ trades = [], handleTradeClick, currencySymbol = "$" }) => {
  if (!trades.length) return <div className="no-trades">No trades found</div>;

  return (
    <div className="trade-list flexClm gap_12">
      {trades.map((trade) => (
        <TradeCard
          key={trade._id}
          trade={trade}
          onClick={handleTradeClick}
          currencySymbol={currencySymbol}
        />
      ))}
    </div>
  );
};

export default TradeList;
