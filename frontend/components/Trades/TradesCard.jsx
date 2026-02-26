"use client";

import React, { useState } from "react";
import { X, Plus, TrendingUp, TrendingDown } from "lucide-react";
import TradeInfo from "./TradeInfo";

const TRADE_KEY = "__t_rd_iD";

const TradeCardModal = ({ trades, onClose, onAddNew }) => {
  const [showTradeModal, setShowTradeModal] = useState(false);
  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);

    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();

    const hours = date.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Day suffix (st, nd, rd, th)
    const suffix =
      day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
          ? "nd"
          : day % 10 === 3 && day !== 13
            ? "rd"
            : "th";

    return `${day}${suffix} ${month}, ${year} | ${hours}`;
  };

  const handleTradeClick = (tradeId) => {
    localStorage.setItem(TRADE_KEY, tradeId); // store trade ID secretly
    setShowTradeModal(true); // open modal
  };

  if (!trades || trades.length === 0) {
    return (
      <div
        className="radius-12 stats-card flexClm flex_center"
        style={{
          minHeight: "300px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div
          className="flexClm gap_16 flex_center"
          style={{
            maxWidth: "300px",
            width: "100%",
          }}
        >
          {/* GIF */}
          <img
            src="/assets/cards.gif"
            alt="No Trades Found"
            width={200}
            height={200}
            style={{ objectFit: "contain" }}
          />

          {/* Heading */}
          <span className="font_16 font_weight_600">No Trades Found</span>

          {/* Description */}
          <span className="font_13 shade_60">
            There are no trades available in this journal yet.
          </span>

          {/* Optional CTA */}
          {onAddNew && (
            <div style={{ marginTop: "8px" }}>
              <button className="primary-btn" onClick={onAddNew}>
                Add Trade
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="flexRow tradeStackGrid gap_24">
        {trades.map((trade) => (
          <div
            key={trade._id}
            className="tradeStackCard"
            onClick={() => handleTradeClick(trade._id)}
            // style={{
            //   background:
            //     trade.pnl >= 0 ? "var(--success-10)" : "var(--error-10)",
            // }}
          >
            {/* Image Preview */}
            <div className="imageBox">
              {trade.closeImageUrl ? (
                <img src={trade.closeImageUrl} alt="Trade image" />
              ) : (
                <div className="noImage">No Image</div>
              )}
            </div>

            {/* Trade Info */}
            <div className="tradeStackDetails flexClm gap_12">
              <div className="flexRow flexRow_stretch">
                <div className="flexClm">
                  <span className="font_20">{trade.symbol}</span>
                  <span className="font_14 flexRow gap_4">
                    {trade.direction === "long" ? (
                      <>
                        Long{" "}
                        <TrendingUp size={14} className="trendUpIcon success" />
                      </>
                    ) : (
                      <>
                        Short{" "}
                        <TrendingDown
                          size={14}
                          className="trendDownIcon error"
                        />
                      </>
                    )}
                  </span>
                </div>
                <span
                  className={`font_20 ${trade.pnl >= 0 ? "success" : "error"}`}
                >
                  {trade.pnl >= 0 ? "+" : "-"}${Math.abs(trade.pnl)}
                </span>
              </div>

              {/* Open Time */}
              <div
                className="flexRow flexRow_stretch gap_12 font_14"
                style={{
                  paddingTop: "12px",
                  borderTop: "1px dashed var(--black-50)",
                }}
              >
                {trade.openTime && (
                  <span className="openTime">
                    {formatDateTime(trade.openTime)}
                  </span>
                )}

                {/* Duration only if present */}
                {/* {trade.duration > 0 && (
                  <span className="duration">{trade.duration} hrs</span>
                )} */}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showTradeModal && <TradeInfo onClose={() => setShowTradeModal(false)} />}
    </div>
  );
};

export default TradeCardModal;
