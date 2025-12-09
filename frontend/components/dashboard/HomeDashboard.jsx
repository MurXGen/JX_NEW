import {
  ArrowDown,
  ArrowDownRightIcon,
  ArrowUp,
  ArrowUpRightIcon,
} from "lucide-react";
import React, { useState, useMemo, useEffect } from "react";
import DailyPnlChart from "../Charts/DailyPnlChart";
import PnLAreaChart from "../Charts/PnLAreaChart";
import PNLChart from "../Charts/PnlChart";
import { formatNumber } from "@/utils/formatNumbers";
import AllVolume from "../Charts/AllVolume";
import VolumeChart from "../Charts/VolumeChart";
import TradeCalendar from "../../components/Trades/TradeCalendarDashboard"; // Import the calendar component
import TagAnalysis from "../Charts/TagAnalysis";
import DashboardNavbar from "./DashboardNavbar";
import Cookies from "js-cookie";
import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";
import TickerAnalysis from "../Tabs/TickerAnalysis";
import TickerOverview from "../Tabs/Tickeroverview";

function TradesCard({ title, total, wins, losses }) {
  const winPercent = total ? (wins / total) * 100 : 0;
  const lossPercent = total ? (losses / total) * 100 : 0;

  return (
    <div
      className="totalTrades flexClm gap_12 chart_boxBg width100"
      style={{ padding: "16px 16px" }}
    >
      <div className="flexRow flexRow_stretch">
        <span className="font_12">{title}</span>
        <span className="font_12">{total ?? 0}</span>
      </div>

      <div className="progress-bar">
        <div className="progress-win" style={{ width: `${winPercent}%` }}></div>
        <div
          className="progress-loss"
          style={{ width: `${lossPercent}%` }}
        ></div>
      </div>

      <div className="flexRow flexRow_stretch">
        <span className="font_12">Wins: {wins}</span>
        <span className="font_12">Losses: {losses}</span>
      </div>
    </div>
  );
}

function MaxPnlCard({ maxProfit, maxLoss }) {
  const total = Math.abs(maxProfit) + Math.abs(maxLoss);
  const winPercent = total ? (Math.abs(maxProfit) / total) * 100 : 0;
  const lossPercent = total ? (Math.abs(maxLoss) / total) * 100 : 0;

  return (
    <div
      className="totalTrades flexClm gap_12 chart_boxBg width100"
      style={{ padding: "16px 16px" }}
    >
      <div className="flexRow flexRow_stretch">
        <span className="font_12">Max Win</span>
        <span className="font_12">Max Loss</span>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-win" style={{ width: `${winPercent}%` }}></div>
        <div
          className="progress-loss"
          style={{ width: `${lossPercent}%` }}
        ></div>
      </div>

      <div className="flexRow flexRow_stretch">
        <span className="font_12 success">Win: {maxProfit}</span>
        <span className="font_12 error">Loss: {maxLoss}</span>
      </div>
    </div>
  );
}

function StreakCard({ stats }) {
  return (
    <div
      className="totalTrades flexClm gap_12 chart_boxBg width100"
      style={{ padding: "16px 16px" }}
    >
      <div className="flexRow flexRow_stretch font_12">
        <span className="analysisCardTitle">Streak</span>
        <span
          className={` ${
            !stats?.streak || stats?.streak === "0"
              ? "shade_50"
              : stats?.streak.toLowerCase().includes("win")
                ? "success"
                : stats?.streak.toLowerCase().includes("breakeven") ||
                    stats?.streak.toLowerCase().includes("break-even")
                  ? "shade_50"
                  : "error"
          }`}
        >
          {stats?.streak || "0"}
        </span>
      </div>

      <div className="streakTrades">
        <div
          className="flexRow flexRow_scroll removeScrollBar gap_12"
          style={{ minWidth: "100%", maxWidth: "100px" }}
        >
          {stats?.last10 && stats.last10.length > 0 ? (
            stats.last10
              .slice()
              .reverse()
              .map((trade, idx) => {
                const isWin = trade.pnl > 0;
                const isLoss = trade.pnl < 0;
                const isBreakEven = trade.pnl === 0;
                const isLong = trade.direction === "long";

                return (
                  <div
                    key={idx}
                    className={`tradeItem flexRow flex_center font_14 gap_4 ${
                      isWin
                        ? "boxBg success"
                        : isLoss
                          ? "boxBg error"
                          : "tradeBrk"
                    }`}
                  >
                    {isLong ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                    <span>
                      {isWin
                        ? `+${formatNumber(trade.pnl)}`
                        : isLoss
                          ? `-${formatNumber(Math.abs(trade.pnl))}`
                          : formatNumber(trade.pnl)}
                    </span>
                  </div>
                );
              })
          ) : (
            <span className="shade_50 font_12">No trade data</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomeContent({
  stats,
  accountTrades,
  dailyData,
  candleData,
  longTrades,
  shortTrades,
}) {
  // State for calendar
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [openSection, setOpenSection] = useState("overview");

  const toggle = (name) => {
    setOpenSection(openSection === name ? null : name);
  };

  // Generate available years from trades data
  const years = useMemo(() => {
    const uniqueYears = new Set();
    accountTrades.forEach((trade) => {
      if (trade.closeTime) {
        const year = new Date(trade.closeTime).getFullYear();
        uniqueYears.add(year);
      }
    });
    if (uniqueYears.size === 0) {
      uniqueYears.add(new Date().getFullYear());
    }
    return Array.from(uniqueYears).sort((a, b) => b - a);
  }, [accountTrades]);

  // Handler for when a date is selected in calendar
  const handleDateSelect = (dateStr, dayTrades) => {
    console.log("Selected date:", dateStr, "with trades:", dayTrades);
    // You can add logic here to show detailed trade info for the selected date
  };

  return (
    <>
      <div className="flexClm gap_24">
        {/* Overview section starts */}
        <span className="font_16 font_weight_500">Overview</span>

        <div className="flexRow flexRow_stretch gap_24">
          <TradesCard
            title="Total Trades"
            total={stats.totalTrades}
            wins={stats.winTrades}
            losses={stats.loseTrades}
          />

          <TradesCard
            title="Long Trades"
            total={longTrades}
            wins={
              accountTrades.filter(
                (t) => t.direction?.toLowerCase() === "long" && t.pnl > 0
              ).length
            }
            losses={
              accountTrades.filter(
                (t) => t.direction?.toLowerCase() === "long" && t.pnl < 0
              ).length
            }
          />

          <TradesCard
            title="Short Trades"
            total={shortTrades}
            wins={
              accountTrades.filter(
                (t) => t.direction?.toLowerCase() === "short" && t.pnl > 0
              ).length
            }
            losses={
              accountTrades.filter(
                (t) => t.direction?.toLowerCase() === "short" && t.pnl < 0
              ).length
            }
          />
        </div>

        <div className="flexRow flexRow_stretch gap_24">
          <MaxPnlCard maxProfit={stats.maxProfit} maxLoss={stats.maxLoss} />
          <StreakCard stats={stats} />
        </div>

        <div className="boxBg">
          <PNLChart dailyData={dailyData} />
        </div>

        <div className="flexRow flexRow_stretch gap_24">
          <div className="chart_boxBg flexClm gap_12 width100 pad_16">
            <span className="font_12">Avg PnL</span>
            <span className="font_20">{stats.averagePnL}</span>
          </div>

          <div className="chart_boxBg flexClm gap_12 width100 pad_16">
            <span className="font_12">Avg Win Ratio</span>
            <span className="font_20">{stats.winRatio}%</span>
          </div>
        </div>

        <div className="flexRow gap_24">
          <div className="boxBg radius_16 padding_16 width100">
            <PnLAreaChart data={candleData} />
          </div>

          <div className="boxBg radius_16 padding_16 width100">
            <DailyPnlChart data={candleData} />
          </div>
        </div>

        {/* CALENDAR SECTION starts here */}
        <div className="flexClm gap_24">
          <span className="font_16 font_weight_500">Trade Calendar</span>

          <div className="boxBg radius_16 padding_16">
            <TradeCalendar
              trades={accountTrades}
              onDateSelect={handleDateSelect}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              years={years}
              setSelectedMonth={setSelectedMonth}
              setSelectedYear={setSelectedYear}
            />
          </div>
        </div>

        <div className="flexClm gap_24">
          <span className="font_16 font_weight_500">Ticker Analysis</span>
          <TickerOverview trades={accountTrades} />
        </div>

        {/* Volume section starts */}

        <div className="flexClm gap_24">
          <span className="font_16 font_weight_500">Volume Analysis</span>

          {/* ROW OF 4 VOLUME CARDS */}
          <div className="flexRow gap_24 flexRow_stretch">
            {/* TOTAL VOLUME */}
            <div className="chart_boxBg flexClm gap_12 width100 pad_16">
              <span className="font_12 shade_50">Total Volume</span>
              <span className="font_20 font_weight_600">
                {stats.totalVolume?.toLocaleString()}
              </span>
            </div>

            {/* AVG VOLUME PER TRADE */}
            <div className="chart_boxBg flexClm gap_12 width100 pad_16">
              <span className="font_12 shade_50">Avg Volume / Trade</span>
              <span className="font_20 font_weight_600">
                {stats.totalTrades > 0
                  ? (stats.totalVolume / stats.totalTrades).toFixed(2)
                  : 0}
              </span>
            </div>

            {/* TOTAL LONG VOLUME */}
            <div className="chart_boxBg flexClm gap_12 width100 pad_16">
              <span className="font_12 shade_50">Total Long Volume</span>
              <span className="font_20 font_weight_600 success">
                {accountTrades
                  .filter((t) => t.direction?.toLowerCase() === "long")
                  .reduce((sum, t) => sum + (t.totalQuantity || 0), 0)
                  .toLocaleString()}
              </span>
            </div>

            {/* TOTAL SHORT VOLUME */}
            <div className="chart_boxBg flexClm gap_12 width100 pad_16">
              <span className="font_12 shade_50 ">Total Short Volume</span>
              <span className="font_20 font_weight_600 error">
                {accountTrades
                  .filter((t) => t.direction?.toLowerCase() === "short")
                  .reduce((sum, t) => sum + (t.totalQuantity || 0), 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>

          {/* DAILY VOLUME CHART */}
          <div className="boxBg radius_16 padding_16">
            <AllVolume dailyData={stats.dailyVolumeData} />
          </div>

          {/* Long short VOLUME CHART */}
          <div className="boxBg radius_16 padding_16">
            <VolumeChart dailyData={stats.dailyVolumeData} />
          </div>
        </div>

        {/* Tags analysis starts here */}

        <div>
          <TagAnalysis tagAnalysis={stats?.tagAnalysis} />
        </div>
      </div>
    </>
  );
}
