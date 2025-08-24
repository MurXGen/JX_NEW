"use client";

import React, { useState, useEffect } from "react";
import TradeInfo from "./TradeInfo";

const TRADE_KEY = "__t_rd_iD";

const TradesHistory = ({ trades, selectedDate }) => {
    const [displayedTrades, setDisplayedTrades] = useState(trades.slice(0, 5));
    const [visibleCount, setVisibleCount] = useState(20);
    const [showTradeModal, setShowTradeModal] = useState(false);

    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedYear, setSelectedYear] = useState("");
    const [filter, setFilter] = useState("");

    useEffect(() => {
        let filtered = [...trades];

        if (selectedDate) {
            filtered = trades.filter((trade) => {
                const tradeDate = new Date(trade.openTime);
                return (
                    tradeDate.getFullYear() === selectedDate.getFullYear() &&
                    tradeDate.getMonth() === selectedDate.getMonth() &&
                    tradeDate.getDate() === selectedDate.getDate()
                );
            });
        }

        // apply month/year filter
        if (selectedMonth || selectedYear) {
            filtered = filtered.filter((trade) => {
                const date = new Date(trade.openTime);
                const monthMatches =
                    selectedMonth === "" || date.getMonth() + 1 === parseInt(selectedMonth);
                const yearMatches =
                    selectedYear === "" || date.getFullYear() === parseInt(selectedYear);
                return monthMatches && yearMatches;
            });
        }

        // apply PnL filter
        if (filter === "profit") {
            filtered = filtered.filter((t) => t.pnl > 0).sort((a, b) => a.pnl - b.pnl);
        } else if (filter === "loss") {
            filtered = filtered.filter((t) => t.pnl < 0).sort((a, b) => a.pnl - b.pnl);
        } else if (filter === "breakeven") {
            filtered = filtered.filter((t) => t.pnl === 0).sort((a, b) => a.pnl - b.pnl);
        }

        setDisplayedTrades(filtered.slice(0, visibleCount));
    }, [trades, selectedDate, selectedMonth, selectedYear, filter, visibleCount]);

    const handleTradeClick = (tradeId) => {
        localStorage.setItem(TRADE_KEY, tradeId); // store trade ID secretly
        setShowTradeModal(true); // open modal
    };

    const applyFilters = (month = selectedMonth, year = selectedYear, pnlFilter = filter) => {
        let filtered = [...trades];

        // Month/year filter
        if (month || year) {
            filtered = filtered.filter((trade) => {
                const date = new Date(trade.openTime);
                const monthMatches = month === "" || date.getMonth() + 1 === parseInt(month);
                const yearMatches = year === "" || date.getFullYear() === parseInt(year);
                return monthMatches && yearMatches;
            });
        }

        // PnL filter
        if (pnlFilter === "profit") {
            filtered = filtered.filter((t) => t.pnl > 0).sort((a, b) => a.pnl - b.pnl);
        } else if (pnlFilter === "loss") {
            filtered = filtered.filter((t) => t.pnl < 0).sort((a, b) => a.pnl - b.pnl);
        } else if (pnlFilter === "breakeven") {
            filtered = filtered.filter((t) => t.pnl === 0).sort((a, b) => a.pnl - b.pnl);
        }

        setDisplayedTrades(filtered.slice(0, visibleCount));
    };

    const handleMonthChange = (e) => {
        const value = e.target.value;
        setSelectedMonth(value);
        applyFilters(value, selectedYear, filter);
    };

    const handleYearChange = (e) => {
        const value = e.target.value;
        setSelectedYear(value);
        applyFilters(selectedMonth, value, filter);
    };

    const handleFilterClick = (type) => {
        setFilter(type);
        applyFilters(selectedMonth, selectedYear, type);
    };

    const loadMore = () => {
        setVisibleCount((prev) => {
            const newCount = prev + 5;
            applyFilters(selectedMonth, selectedYear, filter);
            return newCount;
        });
    };

    return (
        <div style={{ marginBottom: "30px" }}>
            <h2>Trade History</h2>

            {/* Dropdowns */}
            <div style={{ marginBottom: "10px" }}>
                <label>
                    Month:{" "}
                    <select value={selectedMonth} onChange={handleMonthChange}>
                        <option value="">All</option>
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {new Date(0, i).toLocaleString("default", { month: "long" })}
                            </option>
                        ))}
                    </select>
                </label>
                &nbsp;&nbsp;
                <label>
                    Year:{" "}
                    <select value={selectedYear} onChange={handleYearChange}>
                        <option value="">All</option>
                        {Array.from({ length: 5 }, (_, i) => {
                            const year = new Date().getFullYear() - i;
                            return (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            );
                        })}
                    </select>
                </label>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: "10px" }}>
                <button onClick={() => handleFilterClick("profit")}>Profit</button>
                <button onClick={() => handleFilterClick("loss")}>Loss</button>
                <button onClick={() => handleFilterClick("breakeven")}>Breakeven</button>
                <button onClick={() => handleFilterClick("")}>Clear</button>
            </div>

            {/* Trades List */}
            {displayedTrades.length > 0 ? (
                <div>
                    {Object.entries(
                        displayedTrades.reduce((acc, trade) => {
                            const dateObj = new Date(trade.openTime);
                            const dateKey = dateObj.toDateString();
                            if (!acc[dateKey]) acc[dateKey] = [];
                            acc[dateKey].push(trade);
                            return acc;
                        }, {})
                    ).map(([dateKey, tradesForDay]) => {
                        const firstTradeDate = new Date(tradesForDay[0].openTime);
                        const formattedHeader = firstTradeDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        });

                        return (
                            <div key={dateKey} style={{ marginBottom: "20px" }}>
                                <h3 style={{ marginBottom: "8px", borderBottom: "1px solid #ddd" }}>
                                    {formattedHeader}
                                </h3>

                                <ul>
                                    {tradesForDay.map((trade) => (
                                        <li
                                            key={trade._id}
                                            style={{ marginBottom: "6px", cursor: "pointer" }}
                                            onClick={() => handleTradeClick(trade._id)}
                                        >
                                            <span>
                                                {trade.symbol || "N/A"} | PnL:{" "}
                                                <span
                                                    style={{
                                                        color:
                                                            trade.pnl > 0
                                                                ? "green"
                                                                : trade.pnl < 0
                                                                    ? "red"
                                                                    : "gray",
                                                    }}
                                                >
                                                    {trade.pnl}
                                                </span>{" "}
                                                | Open Time:{" "}
                                                {new Date(trade.openTime).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p>No trades found.</p>
            )}

            {/* Trade Info Modal */}
            {showTradeModal && (
                <TradeInfo onClose={() => setShowTradeModal(false)} />
            )}

            {/* Load More Button */}
            {displayedTrades.length < trades.length && (
                <button onClick={loadMore} style={{ marginTop: "10px" }}>
                    Load More
                </button>
            )}

        </div>
    );
};

export default TradesHistory;
