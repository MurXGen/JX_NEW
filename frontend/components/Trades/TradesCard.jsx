"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import TradeInfo from "./TradeInfo";

const TRADE_KEY = "__t_rd_iD";

const TradeCardModal = ({ trades, onClose, onAddNew }) => {
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [pnlFilter, setPnlFilter] = useState("all"); // "all", "profit", "loss"
  const [currentPage, setCurrentPage] = useState(1);
  const tradesPerPage = 6;

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

  // Filter trades based on PnL
  const filteredTrades = trades.filter((trade) => {
    if (pnlFilter === "profit") return trade.pnl > 0;
    if (pnlFilter === "loss") return trade.pnl < 0;
    return true; // "all"
  });

  // Pagination
  const totalPages = Math.ceil(filteredTrades.length / tradesPerPage);
  const indexOfLastTrade = currentPage * tradesPerPage;
  const indexOfFirstTrade = indexOfLastTrade - tradesPerPage;
  const currentTrades = filteredTrades.slice(
    indexOfFirstTrade,
    indexOfLastTrade,
  );

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  if (!trades || trades.length === 0) {
    return (
      <div
        className="radius-12 stats-card flexClm flex_center"
        style={{
          minHeight: "300px",
          textAlign: "center",
        }}
      >
        <div
          className="flexClm  flex_center"
          style={{
            maxWidth: "300px",
            width: "100%",
          }}
        >
          {/* GIF */}
          <img
            src="/assets/notFound.png"
            alt="No Trades Found"
            width={200}
            height={200}
            style={{ objectFit: "contain" }}
          />

          <span className="font_20 font_weight_600">
            Log trades to see history
          </span>

          {/* Create Button */}
          <div style={{ marginTop: "24px" }}>
            <button
              className="primary-btn flexRow flex_center gap_8"
              onClick={() => router.push("/add-trade")}
            >
              Log first trade
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      {/* Filter Section */}
      <div className="flexRow gap_8" style={{ marginBottom: "20px" }}>
        <button
          className={`btn ${pnlFilter === "all" ? "primary-btn" : "secondary-btn"}`}
          onClick={() => {
            setPnlFilter("all");
            setCurrentPage(1);
          }}
        >
          All
        </button>
        <button
          className={`btn ${pnlFilter === "profit" ? "primary-btn" : "secondary-btn"}`}
          onClick={() => {
            setPnlFilter("profit");
            setCurrentPage(1);
          }}
        >
          Profit
        </button>
        <button
          className={`btn ${pnlFilter === "loss" ? "primary-btn" : "secondary-btn"}`}
          onClick={() => {
            setPnlFilter("loss");
            setCurrentPage(1);
          }}
        >
          Loss
        </button>
      </div>

      <div className="flexRow flexRow_scroll gap_24">
        {currentTrades.map((trade) => (
          <div
            key={trade._id}
            className="tradeStackCard"
            onClick={() => handleTradeClick(trade._id)}
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

      {/* Footer with Total Trades and Pagination */}
      <div
        className="flexRow flexRow_stretch"
        style={{ marginTop: "24px", alignItems: "center" }}
      >
        <div className="font_14">
          Total Trades: <strong>{filteredTrades.length}</strong>
        </div>

        {totalPages > 1 && (
          <div className="flexRow gap_8">
            <button
              className="btn secondary-btn"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              style={{ padding: "8px 12px" }}
            >
              <ChevronLeft size={16} />
            </button>

            <span className="font_14">
              {currentPage} of {totalPages}
            </span>

            <button
              className="btn secondary-btn"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              style={{ padding: "8px 12px" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {showTradeModal && <TradeInfo onClose={() => setShowTradeModal(false)} />}
    </div>
  );
};

export default TradeCardModal;
