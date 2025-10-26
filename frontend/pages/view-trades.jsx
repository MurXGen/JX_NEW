"use client";

import FullPageLoader from "@/components/ui/FullPageLoader";
import dayjs from "dayjs";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Calendar,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import JournalXCTA from "@/components/ui/JournalXCTA";
import GoogleBannerAd from "@/components/ads/GoogleBannerAd";

const ViewTrades = () => {
  const [sharedData, setSharedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isClient, setIsClient] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsClient(true);
    loadSharedData();
  }, [searchParams]);

  const loadSharedData = () => {
    if (!isClient) return;

    try {
      setLoading(true);
      setError("");
      const dataParam = searchParams.get("data");

      if (!dataParam) {
        setError(
          "No trade data found in the URL. Please check that you're using a valid share link."
        );
        setLoading(false);
        return;
      }

      // Decode base64 data
      try {
        // Clean the data parameter (remove any URL encoding issues)
        const cleanData = dataParam.replace(/\s/g, "+");

        // Decode base64
        const decodedData = atob(cleanData);

        const parsedData = JSON.parse(decodedData);

        // Validate data structure
        if (!parsedData.trades || !Array.isArray(parsedData.trades)) {
          throw new Error("Invalid trade data format - missing trades array");
        }

        if (parsedData.trades.length === 0) {
          throw new Error("No trades found in the shared data");
        }

        setSharedData(parsedData);
      } catch (parseError) {
        error("❌ Parse error:", parseError);
        throw new Error(
          "Failed to parse trade data. The link may be corrupted or expired."
        );
      }
    } catch (err) {
      error("❌ Error loading shared data:", err);
      setError(err.message || "Invalid or corrupted share link");
    } finally {
      setLoading(false);
    }
  };

  const getStats = (tradesData) => {
    const totalTrades = tradesData.length;
    const winningTrades = tradesData.filter((t) => t.pnl > 0).length;
    const losingTrades = tradesData.filter((t) => t.pnl < 0).length;
    const breakEvenTrades = tradesData.filter((t) => t.pnl === 0).length;
    const totalPnL = tradesData.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0;

    // Best and worst trades
    const bestTrade = [...tradesData].sort((a, b) => b.pnl - a.pnl)[0];
    const worstTrade = [...tradesData].sort((a, b) => a.pnl - b.pnl)[0];

    // Long/Short stats
    const longTrades = tradesData.filter((t) => t.direction === "long");
    const shortTrades = tradesData.filter((t) => t.direction === "short");
    const longWinRate =
      longTrades.length > 0
        ? (longTrades.filter((t) => t.pnl > 0).length / longTrades.length) * 100
        : 0;
    const shortWinRate =
      shortTrades.length > 0
        ? (shortTrades.filter((t) => t.pnl > 0).length / shortTrades.length) *
          100
        : 0;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      breakEvenTrades,
      totalPnL,
      winRate: winRate.toFixed(1),
      avgPnL: avgPnL.toFixed(2),
      bestTrade,
      worstTrade,
      longTrades: longTrades.length,
      shortTrades: shortTrades.length,
      longWinRate: longWinRate.toFixed(1),
      shortWinRate: shortWinRate.toFixed(1),
    };
  };

  const getTimeRangeLabel = (timeRange) => {
    const labels = {
      today: "Today",
      last_week: "Last 7 Days",
      last_30_days: "Last 30 Days",
    };
    return labels[timeRange] || "Custom Range";
  };

  if (loading) {
    <FullPageLoader />;
  }

  if (error || !sharedData) {
    return (
      <div className="viewTradesPage flexClm gap_24 pad_24">
        <div className="chart_boxBg flexClm gap_16 pad_32 flex_center text_center">
          <div className="flexClm gap_12">
            <span className="font_16 font_weight_600 error">
              Unable to Load Trades
            </span>
            <span className="font_14 shade_50">{error}</span>
            <div className="flexClm gap_8 font_12 shade_50">
              <span>• Make sure you're using a valid share link</span>
              <span>• The link might have expired or been corrupted</span>
              <span>• Try asking the sender to generate a new share link</span>
            </div>
            <button
              onClick={loadSharedData}
              className="button_secondary font_12 pad_8_16"
            >
              <RefreshCw size={14} />
              Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = getStats(sharedData.trades);

  const formatCurrency = (val) =>
    val ? `$${Number(val).toFixed(2)}` : "$0.00";

  const getPnlColorClass = (pnl) =>
    pnl >= 0 ? "success" : pnl < 0 ? "error" : "shade_50";

  return (
    <div className="viewTradesPage flexClm gap_24 pad_24">
      {/* Header */}
      <div className="headerSection flexClm gap_16">
        <div className="flexRow flexRow_stretch">
          <div className="flexClm flex1">
            <span className="font_24 font_weight_600">Trading Performance</span>
            <span className="font_14 shade_50">
              Shared trading results{" "}
              {sharedData.meta.account ? `from ${sharedData.meta.account}` : ""}
            </span>
          </div>
          {/* <div className="flexClm gap_4 boxBg">
            <div
              className="flexRow gap_8"
              style={{
                display: "flex",
                justifyContent: "end",
              }}
            >
              <Calendar size={16} className="shade_50" />
              <span className="font_12">
                {getTimeRangeLabel(sharedData.meta.timeRange)}
              </span>
            </div>
            <span
              className="font_14 shade_50 flexRow_mobile"
              style={{ textAlign: "right" }}
            >
              Shared on{" "}
              <span>
                {dayjs(sharedData.meta.generatedAt).format(
                  "MMM D, YYYY [at] h:mm A"
                )}
              </span>
            </span>
          </div> */}
        </div>

        {/* Key Stats */}
        <div className="flexRow flexRow_stretch gap_16">
          <div className="chart_boxBg flexClm gap_8 pad_16 width100">
            {" "}
            <span className="font_12 shade_50">Win Rate</span>
            <span className="font_16 font_weight_600">{stats.winRate}%</span>
          </div>

          <div className="chart_boxBg flexClm gap_8 pad_16 width100">
            {" "}
            <span className="font_12 shade_50">Total Trades</span>
            <span className="font_16 font_weight_600">{stats.totalTrades}</span>
          </div>

          <div className="chart_boxBg flexClm gap_8 pad_16 width100">
            <span className="font_12 shade_50">Total P&L</span>
            <span
              className={`font_16 font_weight_600 ${
                stats.totalPnL >= 0 ? "success" : "error"
              }`}
            >
              {stats.totalPnL >= 0 ? "+" : ""}
              {stats.totalPnL.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="flexClm gap_24">
        <span className="font_18 font_weight_600">Performance Overview</span>

        <div className="flexRow gap_16">
          <div className="chart_boxBg flexClm gap_12 pad_16 width100">
            <span className="font_14 font_weight_600">Trade Distribution</span>
            <div className="flexClm gap_8">
              <div className="flexRow flexRow_stretch">
                <span className="font_12 shade_50">Winning Trades</span>
                <span className="font_12 success">
                  {stats.winningTrades} ({stats.winRate}%)
                </span>
              </div>
              <div className="flexRow flexRow_stretch">
                <span className="font_12 shade_50">Losing Trades</span>
                <span className="font_12 error">{stats.losingTrades}</span>
              </div>
              <div className="flexRow flexRow_stretch">
                <span className="font_12 shade_50">Break-even Trades</span>
                <span className="font_12 shade_50">
                  {stats.breakEvenTrades}
                </span>
              </div>
            </div>
          </div>

          <div className="chart_boxBg flexClm gap_12 width100 pad_16">
            <span className="font_14 font_weight_600">Strategy Analysis</span>
            <div className="flexClm gap_8">
              <div className="flexRow flexRow_stretch">
                <span className="font_12 shade_50">Long Trades</span>
                <span className="font_12">
                  {stats.longTrades}
                  {/* ({stats.longWinRate}% WR) */}
                </span>
              </div>
              <div className="flexRow flexRow_stretch">
                <span className="font_12 shade_50">Short Trades</span>
                <span className="font_12">
                  {stats.shortTrades}
                  {/* ({stats.shortWinRate}% WR) */}
                </span>
              </div>
              <div className="flexRow flexRow_stretch">
                <span className="font_12 shade_50">Avg P&L per Trade</span>
                <span
                  className={`font_12 ${
                    stats.avgPnL >= 0 ? "success" : "error"
                  }`}
                >
                  {stats.avgPnL >= 0 ? "+" : ""}
                  {stats.avgPnL}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Trades Table */}
      <div className=" flexClm gap_16">
        <span className="font_18 font_weight_600">
          All Trades ({sharedData.trades.length})
        </span>

        <div className="flexClm gap_24">
          <AnimatePresence>
            {sharedData.trades.map((trade, index) => (
              <motion.div
                key={trade._id || trade.id || index}
                className="chart_boxBg flexClm gap_12 pad_16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ y: -2 }}
              >
                {/* Header Row */}
                <div className="flexRow flexRow_stretch ">
                  <div className="flexRow gap_12 flex_center">
                    {/* Direction Icon */}
                    <div
                      className={`positionIcon ${
                        trade.direction?.toLowerCase() || "long"
                      }`}
                    >
                      {trade.direction?.toLowerCase() === "long" ? (
                        <ArrowUp size={16} />
                      ) : (
                        <ArrowDown size={16} />
                      )}
                    </div>

                    <div className="flexClm">
                      {/* Symbol */}
                      <span className="font_14">{trade.symbol || "N/A"}</span>

                      {/* Open Time */}
                      <span className="font_12 shade_50">
                        {dayjs(trade.openTime).format("MMM D, YYYY")}
                      </span>
                    </div>
                  </div>

                  {/* P&L */}
                  <div className={`font_16 ${getPnlColorClass(trade.pnl)}`}>
                    {trade.pnl > 0 ? "+" : ""}
                    {formatCurrency(trade.pnl)}
                  </div>
                </div>

                {/* Bottom Info */}
                <div className="flexRow flexRow_stretch">
                  <div className="font_12 shade_50">
                    <span>Size: </span>
                    <span className="font_12">
                      {formatCurrency(trade.quantityUSD)}
                    </span>
                  </div>

                  <div className="font_12 shade_50">
                    <span>Fees: </span>
                    <span>{trade.feeAmount?.toFixed(2) || "0.00"}</span>
                  </div>

                  <span
                    className={`font_12 ${
                      trade.tradeStatus === "closed"
                        ? "success"
                        : trade.tradeStatus === "running"
                        ? "warning"
                        : "shade_50"
                    }`}
                  >
                    Status : {trade.tradeStatus}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <JournalXCTA />

      <GoogleBannerAd />

      {/* Footer */}
      <div className="footerSection flexRow flexRow_center">
        <span className="font_12 shade_50">
          Shared via Trading Journal • {sharedData.meta.totalTrades} trades •
          Generated on{" "}
          {dayjs(sharedData.meta.generatedAt).format("MMM D, YYYY")}
        </span>
      </div>
    </div>
  );
};

export default ViewTrades;
