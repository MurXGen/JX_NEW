"use client";

import GoogleBannerAd from "@/components/ads/GoogleBannerAd";
import Dropdown from "@/components/ui/Dropdown";
import UpgradeButton from "@/components/ui/UpgradeButton";
import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";
import { formatCurrency } from "@/utils/formatNumbers";
import { getFromIndexedDB } from "@/utils/indexedDB";
import { canAccessFeature, getPlanRules } from "@/utils/planRestrictions";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronLeft,
  Download,
  Info,
} from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const ExportPage = () => {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [trades, setTrades] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [timeRange, setTimeRange] = useState("this_month");
  const [exporting, setExporting] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [filteredTrades, setFilteredTrades] = useState([]);

  useEffect(() => {
    loadDataAndCheckAccess();
  }, []);

  useEffect(() => {
    filterTrades();
  }, [selectedAccount, timeRange, trades]);

  const loadDataAndCheckAccess = async () => {
    try {
      const userData = await getFromIndexedDB("user-data");
      const rules = getPlanRules(userData);

      // ✅ Check if export feature is allowed by plan
      const canExport = canAccessFeature(userData, "exportTrades");
      setHasAccess(canExport);

      if (canExport) {
        const data = await fetchAccountsAndTrades();
        setAccounts(data.accounts || []);
        setTrades(data.trades || []);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  const filterTrades = () => {
    let filtered = [...trades];

    if (selectedAccount !== "all") {
      filtered = filtered.filter(
        (trade) => trade.accountId === selectedAccount,
      );
    }

    const now = dayjs();
    switch (timeRange) {
      case "today":
        filtered = filtered.filter((t) => dayjs(t.openTime).isSame(now, "day"));
        break;
      case "last_week":
        filtered = filtered.filter((t) =>
          dayjs(t.openTime).isAfter(now.subtract(1, "week")),
        );
        break;
      case "this_month":
        filtered = filtered.filter((t) =>
          dayjs(t.openTime).isSame(now, "month"),
        );
        break;
      case "last_month":
        filtered = filtered.filter((t) =>
          dayjs(t.openTime).isSame(now.subtract(1, "month"), "month"),
        );
        break;
      default:
        break;
    }

    setFilteredTrades(filtered);
  };

  const exportToCSV = () => {
    if (!hasAccess) {
      alert("Upgrade to Pro or Master plan to export trades.");
      return;
    }

    if (filteredTrades.length === 0) {
      alert("No trades found for the selected filters.");
      return;
    }

    setExporting(true);

    try {
      const headers = [
        "Symbol",
        "Direction",
        "Quantity USD",
        "Leverage",
        "Total Quantity",
        "Trade Status",
        "Open Fee Amount",
        "Close Fee Amount",
        "Total Fee Amount",
        "PNL After Fees",
        "PNL",
        "Open Time",
        "Close Time",
        "Duration (hours)",
        "Rules Followed",
        "Reason",
        "Learnings",
        "Risk Reward Ratio",
        "Expected Profit",
        "Expected Loss",
        "Average Entry Price",
        "Average Exit Price",
        "Average TP Price",
        "Average SL Price",
      ];

      const csvRows = filteredTrades.map((trade) => [
        trade.symbol || "",
        trade.direction || "",
        trade.quantityUSD || 0,
        trade.leverage || 0,
        trade.totalQuantity || 0,
        trade.tradeStatus || "",
        trade.openFeeAmount || 0,
        trade.closeFeeAmount || 0,
        trade.feeAmount || 0,
        trade.pnlAfterFee || 0,
        trade.pnl || 0,
        trade.openTime
          ? dayjs(trade.openTime).format("YYYY-MM-DD HH:mm:ss")
          : "",
        trade.closeTime
          ? dayjs(trade.closeTime).format("YYYY-MM-DD HH:mm:ss")
          : "",
        trade.duration || 0,
        trade.rulesFollowed ? "Yes" : "No",
        Array.isArray(trade.reason) ? trade.reason.join("; ") : "",
        trade.learnings || "",
        trade.rr || "",
        trade.expectedProfit || 0,
        trade.expectedLoss || 0,
        trade.avgEntryPrice || 0,
        trade.avgExitPrice || 0,
        trade.avgTPPrice || 0,
        trade.avgSLPrice || 0,
      ]);

      const csvContent = [headers, ...csvRows]
        .map((row) =>
          row
            .map((field) => {
              const str = String(field);
              if (
                str.includes(",") ||
                str.includes('"') ||
                str.includes("\n")
              ) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(","),
        )
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const timestamp = dayjs().format("YYYY-MM-DD_HH-mm-ss");
      const accountLabel =
        selectedAccount === "all"
          ? "all_accounts"
          : getAccountName(selectedAccount).toLowerCase().replace(/\s+/g, "_");

      link.href = url;
      link.download = `trades_${accountLabel}_${timeRange}_${timestamp}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting CSV:", err);
      alert("Error exporting data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const getAccountName = (id) => {
    if (id === "all") return "All Accounts";
    const acc = accounts.find((a) => a._id === id);
    return acc ? acc.name : "Unknown";
  };

  const getStats = () => {
    const totalTrades = filteredTrades.length;
    const winningTrades = filteredTrades.filter((t) => t.pnl > 0).length;
    const losingTrades = filteredTrades.filter((t) => t.pnl < 0).length;
    const totalPnL = filteredTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      totalPnL,
      winRate: winRate.toFixed(1),
    };
  };

  const getPnlColorClass = (pnl) =>
    pnl >= 0 ? "success" : pnl < 0 ? "error" : "shade_50";

  const stats = getStats();

  if (!hasAccess) {
    return (
      <div
        className="flexClm flex_center"
        style={{
          minHeight: "100vh",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div
          className="flexClm gap_20 flex_center"
          style={{
            maxWidth: "420px",
            width: "100%",
          }}
        >
          {/* GIF */}
          <img
            src="/assets/upgrade.gif"
            alt="Upgrade Required"
            width={200}
            height={200}
            style={{ objectFit: "contain" }}
          />

          {/* Heading */}
          <span className="font_20 font_weight_600">Export Feature Locked</span>

          {/* Description */}
          <span className="font_14 shade_70">
            You need a Pro or Master plan to export your trade data.
          </span>

          <div className="flexClm gap_6 font_14 shade_60">
            <span>Upgrade your plan to unlock full export access</span>
            <span>and download your trading history anytime.</span>
          </div>

          {/* Upgrade Button */}
          <div style={{ marginTop: "8px" }}>
            <UpgradeButton label="Upgrade to Pro" title="Upgrade to Pro" />
          </div>
        </div>
      </div>
    );
  }

  const handleBackClick = () => router.push("/accounts");
  return (
    <div
      className="flexClm gap_24 pad_24"
      style={{
        maxWidth: "1200px",
        minWidth: "300px",
        margin: "24px auto",
        padding: "0 12px 100px 12px",
      }}
    >
      {/* Header */}
      <div className="flexRow gap_8">
        <div
          className=" flexRow gap_4"
          onClick={() => router.push("/dashboard")}
          style={{ cursor: "pointer" }}
        >
          <ChevronLeft size={20} />
          <span className="font_20">Export trade</span>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filtersSection flexRow flexRow_stretch gap_16">
        {/* Account Selector */}
        <div className="filterGroup flexClm gap_8 width100">
          <span className="font_14">Choose account</span>
          <Dropdown
            options={[
              { value: "all", label: "All Accounts" },
              ...accounts.map((account) => ({
                value: account._id,
                label: account.name,
              })),
            ]}
            value={selectedAccount}
            onChange={setSelectedAccount}
            placeholder="Select Account"
          />
        </div>

        {/* Time Range Selector */}
        <div className="filterGroup flexClm gap_8 width100">
          <span className="font_14">Choose duration</span>
          <Dropdown
            options={[
              { value: "today", label: "Today" },
              { value: "last_week", label: "Last 7 Days" },
              { value: "this_month", label: "This Month" },
              { value: "last_month", label: "Last Month" },
              { value: "all_time", label: "All Time" },
            ]}
            value={timeRange}
            onChange={setTimeRange}
            placeholder="Select Time Range"
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="statsOverview flexRow gap_16">
        <div className="stats-card radius-12 flexClm gap_8 pad_16 width100">
          <span className="font_14">Total Trades</span>
          <span className="font_16 font_weight_600">{stats.totalTrades}</span>
        </div>

        <div className="stats-card radius-12 flexClm gap_8 pad_16 width100">
          <span className="font_14">Win Rate</span>
          <span className="font_16 font_weight_600">{stats.winRate}%</span>
        </div>

        <div className="stats-card radius-12 flexClm gap_8 pad_16 width100">
          <span className="font_14">Total P&L</span>
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

      {/* Export Button */}
      <div className="exportSection flexClm gap_16">
        <button
          className="upgrade_btn flexRow flex_center gap_8 pad_16_24 font_14 font_weight_600"
          onClick={exportToCSV}
          disabled={exporting || filteredTrades.length === 0}
        >
          <Download size={18} />
          {exporting
            ? "Exporting..."
            : `Export ${filteredTrades.length} logged trades as CSV`}
        </button>

        <div className="flexRow flexRow_center">
          <span className="font_14 text_center flexRow gap_8">
            <Info size={14} />
            CSV will include symbol, direction, P&L, fees, timestamps, and
            trading metrics
          </span>
        </div>
      </div>

      {/* Preview Table */}
      {filteredTrades.length > 0 && (
        <div className="previewSection flexClm gap_16">
          <span className="font_20 font_weight_600">
            Preview (First 5 Trades)
          </span>

          <div className="flexClm gap_12">
            <AnimatePresence>
              {filteredTrades.slice(0, 5).map((trade, index) => (
                <motion.div
                  key={trade._id || trade.id || index}
                  className="stats-card radius-12 flexClm gap_8 pad_16"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ y: -2 }}
                >
                  {/* Header Row */}
                  <div className="flexRow flexRow_stretch flex_between">
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
                        <span className="font_14">{trade.symbol || "N/A"}</span>
                        <span className="font_14">
                          Margin: {formatCurrency(trade.quantityUSD)}
                        </span>
                        <span className="font_14">
                          {dayjs(trade.openTime).format("MMM D, YYYY")}
                        </span>
                      </div>
                    </div>

                    {/* P&L */}
                    <div className={`font_16 ${getPnlColorClass(trade.pnl)}`}>
                      {trade.pnl >= 0 ? "+" : ""}
                      {formatCurrency(trade.pnl)}
                    </div>
                  </div>

                  {/* Bottom Info */}
                  {/* <div className="flexRow flexRow_stretch justify_between font_14">
                    
                    <div>Fees: {trade.feeAmount?.toFixed(2) || "0.00"}</div>
                    <div
                      className={`tag ${
                        trade.tradeStatus === "closed"
                          ? "success"
                          : trade.tradeStatus === "running"
                            ? "warning"
                            : "shade_50"
                      }`}
                    >
                      {trade.tradeStatus}
                    </div>
                  </div> */}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredTrades.length > 5 && (
            <div className="flexRow flexRow_center font_14">
              ... and {filteredTrades.length - 5} more trades
            </div>
          )}
        </div>
      )}

      <GoogleBannerAd />
    </div>
  );
};

export default ExportPage;
