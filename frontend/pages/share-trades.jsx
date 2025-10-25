"use client";

import Dropdown from "@/components/ui/Dropdown";
import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";
import { getCurrentPlanRules } from "@/utils/planRestrictions";
import dayjs from "dayjs";
import {
  ArrowLeft,
  Check,
  Copy,
  Share2,
  Sparkles,
  Users,
  BarChart3,
  Link,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useRouter } from "next/router";

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
      const canShare = rules.canShareTrades;
      setHasAccess(canShare);

      if (canShare) {
        const data = await fetchAccountsAndTrades();
        setAccounts(data.accounts || []);
        setTrades(data.trades || []);
      }
    } catch (error) {
      error("Error loading data:", error);
    }
  };

  const filterTrades = () => {
    let filtered = [...trades];

    // Filter by account
    if (selectedAccount !== "all") {
      filtered = filtered.filter(
        (trade) => trade.accountId === selectedAccount
      );
    }

    // Filter by time range (max 30 days for sharing)
    const now = dayjs();
    switch (timeRange) {
      case "today":
        filtered = filtered.filter((trade) =>
          dayjs(trade.openTime).isSame(now, "day")
        );
        break;
      case "last_week":
        filtered = filtered.filter((trade) =>
          dayjs(trade.openTime).isAfter(now.subtract(1, "week"))
        );
        break;
      case "last_30_days":
        filtered = filtered.filter((trade) =>
          dayjs(trade.openTime).isAfter(now.subtract(30, "day"))
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
    setShortUrl(""); // Reset short URL
    try {
      // Prepare trade data for sharing
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

      // Create a compressed data string
      const dataString = JSON.stringify({
        trades: shareData,
        meta: {
          totalTrades: shareData.length,
          timeRange: timeRange,
          account: getAccountName(selectedAccount),
          generatedAt: new Date().toISOString(),
          version: "1.0",
        },
      });

      // Encode to base64 for URL (more efficient than JSON in URL)
      const encodedData = btoa(unescape(encodeURIComponent(dataString)));

      // Create the full URL first
      const baseUrl = window.location.origin;
      const fullShareUrl = `${baseUrl}/view-trades?data=${encodedData}`;

      setShareUrl(fullShareUrl);

      // Automatically shorten the URL
      await shortenUrl(fullShareUrl);
    } catch (error) {
      error("Error generating share URL:", error);
      alert("Error generating share link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const shortenUrl = async (longUrl) => {
    setShortening(true);
    try {
      // Method 1: TinyURL API (Free, no auth required)
      const shortenedUrl = await shortenWithTinyURL(longUrl);
      setShortUrl(shortenedUrl);
    } catch (error) {
      error("URL shortening failed:", error);
      // Fallback: Use the original long URL
      setShortUrl(longUrl);
    } finally {
      setShortening(false);
    }
  };

  const shortenWithTinyURL = async (longUrl) => {
    try {
      // TinyURL expects the URL as a query parameter
      const tinyUrlApi = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(
        longUrl
      )}`;

      const response = await fetch(tinyUrlApi, {
        method: "GET",
        headers: {
          Accept: "text/plain",
        },
      });

      if (!response.ok) {
        throw new Error(`TinyURL API error: ${response.status}`);
      }

      // TinyURL returns plain text, not JSON
      const shortUrl = await response.text();

      // Validate that we got a proper URL back
      if (!shortUrl.startsWith("http")) {
        throw new Error(`Invalid TinyURL response: ${shortUrl}`);
      }

      return shortUrl;
    } catch (error) {
      error("❌ TinyURL failed:", error);
      throw error;
    }
  };

  const copyToClipboard = async (url = shortUrl || shareUrl) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      error("Error copying to clipboard:", error);
      // Fallback for older browsers
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

  const getAccountName = (accountId) => {
    if (accountId === "all") return "All Accounts";
    const account = accounts.find((acc) => acc._id === accountId);
    return account ? account.name : "Unknown Account";
  };

  const getStats = (tradesData) => {
    const totalTrades = tradesData.length;
    const winningTrades = tradesData.filter((t) => t.pnl > 0).length;
    const losingTrades = tradesData.filter((t) => t.pnl < 0).length;
    const totalPnL = tradesData.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      totalPnL,
      winRate: winRate.toFixed(1),
      avgPnL: avgPnL.toFixed(2),
    };
  };

  const stats = getStats(filteredTrades);

  if (!hasAccess) {
    return (
      <div className="chart_boxBg pad_16 flexClm flex_center">No access</div>
    );
  }
  const handleBackClick = () => {
    router.push("/accounts");
  };

  return (
    <div className="shareTradesPage flexClm gap_24 pad_24">
      {/* Header */}
      <div className="flexRow gap_8">
        <button className="button_sec flexRow" onClick={handleBackClick}>
          <ArrowLeft size={20} />
        </button>
        <div className="flexClm">
          <span className="font_20 font_weight_600">Share Trades</span>
          <span className="font_14 shade_50">
            Showcase your trading performance
          </span>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filtersSection flexRow flexRow_stretch gap_16">
        {/* Account Filter */}
        <div className="filterGroup flexClm gap_8 width100">
          <span className="font_12 shade_50">Account</span>
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
          <span className="font_12 shade_50">Time Range</span>
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
        <div className="statBox chart_boxBg flexClm gap_8 pad_16 width100">
          <span className="font_12 shade_50">Total Trades</span>
          <span className="font_16 font_weight_600">{stats.totalTrades}</span>
        </div>

        <div className="statBox chart_boxBg flexClm gap_8 pad_16 width100">
          <span className="font_12 shade_50">Win Rate</span>
          <span className="font_16 font_weight_600">{stats.winRate}%</span>
        </div>

        <div className="statBox chart_boxBg flexClm gap_8 pad_16 width100">
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
            <span className="font_12 shade_50">
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
                    className="urlInput flex1 pad_12 font_12 width100"
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
              <span className="font_14 shade_50">
                - This link will open a dedicated page showing your trading
                performance
              </span>
              <span className="font_14 shade_50">
                - Contains {filteredTrades.length} trades from{" "}
                {getAccountName(selectedAccount)} ({getTimeRangeLabel()})
              </span>
              <span className="font_14 shade_50">
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
              <span className="font_14 shade_50">
                This is how it will appear to the receiver.
              </span>
            </div>
          </div>

          <div className="flexClm gap_24">
            <AnimatePresence>
              {filteredTrades.slice(0, 5).map((trade, index) => (
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
                        <span className="font_14">{trade.symbol || "N/A"}</span>

                        {/* Open Time */}
                        <span className="font_12 shade_50">
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
                    <div className="font_12 shade_50">
                      <span>Size: </span>
                      <span>{trade.quantityUSD?.toFixed(2) || "0.00"}</span>
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
                      Status: {trade.tradeStatus}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Show more indicator */}
            {filteredTrades.length > 5 && (
              <div className="flexRow flexRow_center">
                <span className="font_12 shade_50">
                  ... and {filteredTrades.length - 5} more trades
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareTrades;
