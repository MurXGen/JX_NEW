"use client";

import GoogleBannerAd from "@/components/ads/GoogleBannerAd";
import Dropdown from "@/components/ui/Dropdown";
import UpgradeButton from "@/components/ui/UpgradeButton";
import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";
import { getCurrentPlanRules } from "@/utils/planRestrictions";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronLeft,
  Copy,
  Share2,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const ShareTrades = () => {
  const [accounts, setAccounts] = useState([]);
  const [trades, setTrades] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [timeRange, setTimeRange] = useState("last_week");
  const [hasAccess, setHasAccess] = useState(false);
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [shareUrl, setShareUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shortening, setShortening] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadDataAndCheckAccess();
  }, []);

  useEffect(() => {
    filterTrades();
  }, [selectedAccount, timeRange, trades]);

  const loadDataAndCheckAccess = async () => {
    try {
      const rules = await getCurrentPlanRules();
      const canShareTrades = rules.features?.shareTrades || false;
      setHasAccess(canShareTrades);

      if (canShareTrades) {
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
    const now = dayjs();

    if (selectedAccount !== "all") {
      filtered = filtered.filter((t) => t.accountId === selectedAccount);
    }

    switch (timeRange) {
      case "today":
        filtered = filtered.filter((t) => dayjs(t.openTime).isSame(now, "day"));
        break;
      case "last_week":
        filtered = filtered.filter((t) =>
          dayjs(t.openTime).isAfter(now.subtract(1, "week")),
        );
        break;
      case "last_30_days":
        filtered = filtered.filter((t) =>
          dayjs(t.openTime).isAfter(now.subtract(30, "day")),
        );
        break;
      default:
        break;
    }

    setFilteredTrades(filtered);
  };

  const generateShareUrl = async () => {
    if (filteredTrades.length === 0) {
      alert("No trades found for the selected filters.");
      return;
    }

    setLoading(true);
    setShortUrl("");
    try {
      const shareData = filteredTrades.map((trade) => ({
        symbol: trade.symbol,
        direction: trade.direction,
        quantityUSD: trade.quantityUSD,
        leverage: trade.leverage,
        totalQuantity: trade.totalQuantity,
        tradeStatus: trade.tradeStatus,
        openFeeAmount: trade.openFeeAmount,
        closeFeeAmount: trade.closeFeeAmount,
        feeAmount: trade.feeAmount,
        pnlAfterFee: trade.pnlAfterFee,
        pnl: trade.pnl,
        openTime: trade.openTime,
        closeTime: trade.closeTime,
        duration: trade.duration,
        rulesFollowed: trade.rulesFollowed,
        reason: trade.reason,
        learnings: trade.learnings,
        rr: trade.rr,
        expectedProfit: trade.expectedProfit,
        expectedLoss: trade.expectedLoss,
        avgEntryPrice: trade.avgEntryPrice,
        avgExitPrice: trade.avgExitPrice,
        avgTPPrice: trade.avgTPPrice,
        avgSLPrice: trade.avgSLPrice,
      }));

      const dataString = JSON.stringify({
        trades: shareData,
        meta: {
          totalTrades: shareData.length,
          timeRange,
          account: getAccountName(selectedAccount),
          generatedAt: new Date().toISOString(),
          version: "1.0",
        },
      });

      const encodedData = btoa(unescape(encodeURIComponent(dataString)));
      const baseUrl = window.location.origin;
      const fullShareUrl = `${baseUrl}/view-trades?data=${encodedData}`;

      setShareUrl(fullShareUrl);
      await shortenUrl(fullShareUrl);
    } catch (err) {
      console.error("Error generating share link:", err);
      alert("Error generating share link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const shortenUrl = async (longUrl) => {
    setShortening(true);
    try {
      const response = await fetch(
        `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`,
      );
      if (!response.ok) throw new Error("TinyURL failed");
      const shortUrl = await response.text();
      setShortUrl(shortUrl.startsWith("http") ? shortUrl : longUrl);
    } catch (err) {
      console.error("URL shortening failed:", err);
      setShortUrl(longUrl);
    } finally {
      setShortening(false);
    }
  };

  const copyToClipboard = async (url = shortUrl || shareUrl) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getTimeRangeLabel = () => {
    const labels = {
      today: "Today",
      last_week: "Last 7 Days",
      last_30_days: "Last 30 Days",
    };
    return labels[timeRange] || "Select Range";
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

  const stats = getStats(filteredTrades);

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
          <span className="font_20 font_weight_600">
            Share Trades Feature Locked
          </span>

          {/* Description */}
          <span className="font_14 shade_70">
            You need a Pro or Lifetime plan to export your trade data.
          </span>

          <div className="flexClm gap_6 font_14 shade_60">
            <span>
              Upgrade your plan to unlock sharing trades log across community
            </span>
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
    <div className="shareTradesPage flexClm gap_24 pad_16" style={{}}>
      {/* Header */}
      <div className="flexRow gap_8">
        <div
          className=" flexRow gap_4"
          onClick={() => router.push("/dashboard")}
          style={{ cursor: "pointer" }}
        >
          <ChevronLeft size={20} />
          <span className="font_20">Share trade</span>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filtersSection flexRow flexRow_stretch gap_16">
        {/* Account Filter */}
        <div className="filterGroup flexClm gap_8 width100">
          <span className="font_14">Choose Account</span>
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

        {/* Time Range Filter */}
        <div className="filterGroup flexClm gap_8 width100">
          <span className="font_14">Choose Duration</span>
          <Dropdown
            options={[
              { value: "today", label: "Today" },
              { value: "last_week", label: "Last 7 Days" },
              { value: "last_30_days", label: "Last 30 Days" },
            ]}
            value={timeRange}
            onChange={setTimeRange}
            placeholder="Select Range"
          />
        </div>
      </div>

      {/* Stats Overview - same as before */}
      <div className="statsOverview flexRow gap_16">
        <div className="stats-card radius-12 flexClm gap_8 pad_16 width100">
          <span className="card-label">Total Trades</span>
          <span className="card-value">{stats.totalTrades}</span>
        </div>

        <div className="stats-card radius-12 flexClm gap_8 pad_16 width100">
          <span className="card-label">Win Rate</span>
          <span className="card-value">{stats.winRate}%</span>
        </div>

        <div className="stats-card radius-12 flexClm gap_8 pad_16 width100">
          <span className="card-label">Total P&L</span>
          <span
            className={`card-value ${
              stats.totalPnL >= 0 ? "success" : "error"
            }`}
          >
            {stats.totalPnL >= 0 ? "+" : ""}
            {stats.totalPnL.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Generate Share Link Section */}
      <div className="shareSection flexClm gap_16">
        <button
          className="upgrade_btn flexRow flex_center gap_8 pad_16_24 font_14 font_weight_600"
          onClick={generateShareUrl}
          disabled={loading || filteredTrades.length === 0}
        >
          <Sparkles size={18} />
          {loading
            ? "Generating..."
            : `Generate Share Link (${filteredTrades.length} trades)`}
        </button>

        {(shareUrl || shortUrl) && (
          <div className="flexClm gap_12">
            <span className="font_14">
              {shortening ? "Shortening URL..." : "Share this URL with others:"}
            </span>

            {/* Short URL (Primary) */}
            {shortUrl && !shortening && (
              <div className="urlContainer flexClm gap_8">
                <div className="flexRow gap_8">
                  <input
                    type="text"
                    value={shortUrl}
                    readOnly
                    className="black-text flex1 pad_12 font_12 width100"
                  />
                  <button
                    className="button_ter flexRow flex_center gap_4 pad_12 font_12 success_border"
                    onClick={() => copyToClipboard(shortUrl)}
                  >
                    <Copy size={14} />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <span className="font_12 success flexRow gap_4">
                  <Sparkles size={10} />
                  Short URL generated successfully!
                </span>
              </div>
            )}

            {/* Original Long URL (Fallback) */}
            {shareUrl && !shortUrl && !shortening && (
              <div className="urlContainer flexClm gap_8">
                <div className="flexRow gap_8">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="urlInput flex1 pad_12 font_12"
                  />
                  <button
                    className="copyButton flexRow flex_center gap_4 pad_12 font_12"
                    onClick={() => copyToClipboard(shareUrl)}
                  >
                    <Copy size={14} />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <span className="font_12 warning">
                  ⚠️ Shortening service unavailable - using original URL
                </span>
              </div>
            )}

            {/* Loading state for shortening */}
            {shortening && (
              <div className="urlContainer flexClm gap_8">
                <div className="flexRow gap_8">
                  <input
                    type="text"
                    value="Shortening URL..."
                    readOnly
                    className="urlInput flex1 pad_12 font_12 shade_50"
                  />
                  <button
                    className="copyButton flexRow flex_center gap_4 pad_12 font_12"
                    disabled
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                </div>
              </div>
            )}

            <div className="flexClm boxBg gap_12">
              <span className="font_14">
                - This link will open a dedicated page showing your trading
                performance
              </span>
              <span className="font_14">
                - Contains {filteredTrades.length} trades from{" "}
                {getAccountName(selectedAccount)} ({getTimeRangeLabel()})
              </span>
              <span className="font_14">
                - No login required to view the shared trades
              </span>
              {shortUrl && (
                <span className="font_14 success flexRow gap_4">
                  - URL shortened for easy sharing <Check size={14} />
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <hr width="100" color="grey" />

      {/* Preview Section */}
      {filteredTrades.length > 0 && (
        <div className="previewSection flexClm gap_16">
          <div className="flexRow flexRow_stretch">
            <div className="flexClm">
              <span className="font_20 font_weight_600">Preview</span>
              <span className="font_14">
                This is how it will appear to the receiver.
              </span>
            </div>
          </div>

          <div className="flexClm gap_24">
            <AnimatePresence>
              {filteredTrades.slice(0, 5).map((trade, index) => (
                <motion.div
                  key={trade._id || trade.id || index}
                  className="boxBg flexClm gap_12 pad_16"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ y: -2 }}
                >
                  {/* Header Row */}
                  <div className="flexRow flexRow_stretch">
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
                        <span className="font_14 font_weight_600">
                          {trade.symbol || "N/A"}
                          <div className="font_14">
                            <span>Margin: </span>
                            <span>
                              {trade.quantityUSD?.toFixed(2) || "0.00"}
                            </span>
                          </div>
                        </span>

                        {/* Open Time */}
                        <span className="font_14">
                          {dayjs(trade.openTime).format("MMM D, YYYY")}
                        </span>
                      </div>
                    </div>

                    {/* P&L */}
                    <div
                      className={`font_16 ${
                        trade.pnl >= 0 ? "success" : "error"
                      }`}
                    >
                      {trade.pnl >= 0 ? "+" : ""}
                      {trade.pnl?.toFixed(2) || "0.00"}
                    </div>
                  </div>

                  {/* Bottom Info */}
                  <div className="flexRow flexRow_stretch">
                    {/* <div className="font_14">
                      <span>Fees: </span>
                      <span>{trade.feeAmount?.toFixed(2) || "0.00"}</span>
                    </div> */}

                    {/* <span
                      className={`font_14 ${
                        trade.tradeStatus === "closed"
                          ? "success"
                          : trade.tradeStatus === "running"
                            ? "warning"
                            : "shade_50"
                      }`}
                    >
                      Status: {trade.tradeStatus}
                    </span> */}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Show more indicator */}
            {filteredTrades.length > 5 && (
              <div className="flexRow flexRow_center">
                <span className="font_14">
                  ... and {filteredTrades.length - 5} more trades
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <GoogleBannerAd />
    </div>
  );
};

export default ShareTrades;
