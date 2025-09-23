import {
  ArrowDownRight,
  ArrowDownRightFromCircle,
  ArrowUpRight,
  ArrowUpRightFromCircle,
} from "lucide-react";
import PNLChart from "@/components/Charts/PnlChart";
import DailyPnLChart from "@/components/Charts/DailyPnlChart";
import { formatCurrency, formatNumber } from "@/utils/formatNumbers";
import DailyPnlChart from "@/components/Charts/DailyPnlChart";
import { processPnLCandles } from "@/utils/processPnLCandles";
import { getCurrencySymbol } from "@/utils/currencySymbol";

export default function Overview({ stats, trades }) {
  const currencyCode = localStorage.getItem("currencyCode");

  if (!stats)
    return (
      <p className="font_12" style={{ textAlign: "center", marginTop: "50%" }}>
        No trade logged to show analysis
      </p>
    );

  const gfValue = stats.greedFear?.value || 50;
  const gfLabel = stats.greedFear?.label || "Neutral";

  // Needle rotation (-90° to +90° for 0–100)
  const angle = (gfValue / 100) * 180 - 90;

  // Use pre-calculated values from main page
  const total = stats.winTrades + stats.loseTrades;
  const winPercent = total > 0 ? (stats.winTrades / total) * 100 : 0;
  const lossPercent = total > 0 ? (stats.loseTrades / total) * 100 : 0;

  const candleData = processPnLCandles(trades);

  // For clock

  const timePeriods = [
    {
      name: "Night",
      range: "12 am - 6 am",
      color: "#6366f1",
      startAngle: 0,
      endAngle: 90,
    },
    {
      name: "Morning",
      range: "6 am - 12 pm",
      color: "#f59e0b",
      startAngle: 90,
      endAngle: 180,
    },
    {
      name: "Afternoon",
      range: "12 pm - 6 pm",
      color: "#10b981",
      startAngle: 180,
      endAngle: 270,
    },
    {
      name: "Evening",
      range: "6 pm - 12 am",
      color: "#ef4444",
      startAngle: 270,
      endAngle: 360,
    },
  ];

  const getTimePeriodAngles = (periodName) => {
    const period = timePeriods.find((p) => p.name === periodName);
    return period
      ? { start: period.startAngle, end: period.endAngle }
      : { start: 0, end: 0 };
  };

  const bestTimeAngles = getTimePeriodAngles(stats.bestTime);
  const worstTimeAngles = getTimePeriodAngles(stats.worstTime);

  const calculateArc = (startAngle, endAngle) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 60 + 50 * Math.cos(startRad);
    const y1 = 60 + 50 * Math.sin(startRad);
    const x2 = 60 + 50 * Math.cos(endRad);
    const y2 = 60 + 50 * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return `M ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  };

  return (
    <div className="overview flexClm gap_32">
      <div className="otherStats flexClm gap_24">
        <span className="font_12">Overview</span>

        <div
          className="totalTrades flexClm gap_12 chart_boxBg"
          style={{ padding: "16px 16px" }}
        >
          <div className="flexRow flexRow_stretch">
            <span className="font_12">Total Trades</span>
            <span className="font_12">{stats.totalTrades}</span>
          </div>

          {/* Progress Bar */}
          <div className="progress-bar">
            <div
              className="progress-win"
              style={{ width: `${winPercent}%` }}
            ></div>
            <div
              className="progress-loss"
              style={{ width: `${lossPercent}%` }}
            ></div>
          </div>

          <div className="flexRow flexRow_stretch">
            <span className="font_12">Wins: {stats.winTrades}</span>
            <span className="font_12">Losses: {stats.loseTrades}</span>
          </div>
        </div>

        <div className="bestTime flexRow flexRow_stretch gap_12">
          {/* Best Time */}
          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <span className="font_12">Best Time</span>
            <div className="flexRow flexRow_stretch">
              {stats.bestTime === "Night" && (
                <>
                  <span className="font_16">Night</span>
                  <span className="font_12">12 am - 6 am</span>
                </>
              )}
              {stats.bestTime === "Morning" && (
                <>
                  <span className="font_16">Morning</span>
                  <span className="font_12">6 am - 12 pm</span>
                </>
              )}
              {stats.bestTime === "Afternoon" && (
                <>
                  <span className="font_16">Afternoon</span>
                  <span className="font_12">12 pm - 6 pm</span>
                </>
              )}
              {stats.bestTime === "Evening" && (
                <>
                  <span className="font_16">Evening</span>
                  <span className="font_12">6 pm - 12 am</span>
                </>
              )}
            </div>
          </div>

          {/* Worst Time */}
          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <span className="font_12">Worst Time</span>
            <div className="flexRow flexRow_stretch">
              {stats.worstTime === "Night" && (
                <>
                  <span className="font_16">Night</span>
                  <span className="font_12">12 am - 6 am</span>
                </>
              )}
              {stats.worstTime === "Morning" && (
                <>
                  <span className="font_16">Morning</span>
                  <span className="font_12">6 am - 12 pm</span>
                </>
              )}
              {stats.worstTime === "Afternoon" && (
                <>
                  <span className="font_16">Afternoon</span>
                  <span className="font_12">12 pm - 6 pm</span>
                </>
              )}
              {stats.worstTime === "Evening" && (
                <>
                  <span className="font_16">Evening</span>
                  <span className="font_12">6 pm - 12 am</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bestTime flexRow flexRow_stretch gap_12">
          {/* Win Ratio */}
          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <span className="font_12">Win ratio</span>
            <span
              className={`font_16 ${
                stats?.winRatio > 70
                  ? "success"
                  : stats?.winRatio >= 50
                  ? "warning"
                  : "error"
              }`}
            >
              {stats?.winRatio}%
            </span>
          </div>

          {/* Average P/L */}
          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <span className="font_12">Average p/l</span>
            <span
              className={`font_16 ${
                stats?.averagePnL >= 0 ? "success" : "error"
              }`}
            >
              {stats?.averagePnL}
            </span>
          </div>
        </div>

        <div
          className="totalTrades flexClm gap_12 chart_boxBg"
          style={{ padding: "16px 16px" }}
        >
          {/* Streak Section */}
          <div className="flexRow flexRow_stretch font_12">
            <span>Streak</span>
            <span
              className={stats?.streak?.includes("win") ? "success" : "error"}
            >
              {stats?.streak || "0"}
            </span>
          </div>

          {/* Last 10 Trades */}
          <div className="streakTrades">
            <div className="flexRow flexRow_scroll removeScrollBar gap_12">
              {stats?.last10
                ?.slice() // copy to avoid mutating original
                .reverse() // reverse so latest trade comes first
                .map((trade, idx) => {
                  const isWin = trade.pnl > 0;
                  const isLong = trade.direction === "long"; // assuming "long"/"short"

                  return (
                    <div
                      key={idx}
                      className={`tradeItem font_12 flexRow gap_12 ${
                        isWin ? "tradeWin" : "tradeLoss"
                      }`}
                    >
                      {isLong ? (
                        <ArrowUpRightFromCircle size={16} />
                      ) : (
                        <ArrowDownRightFromCircle size={16} />
                      )}
                      <span>{formatNumber(trade.pnl)}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="chart_boxBg flexClm gap_12" style={{ padding: "16px" }}>
          <span className="font_12">Total volume</span>
          <span className="font_16 flexRow gap_4">
            <span>{getCurrencySymbol(currencyCode)}</span>
            {stats?.totalVolume?.toLocaleString()}
          </span>
        </div>
      </div>

      <hr width={100} color="grey" />

      <div className="flexClm gap_24">
        <span className="font_12">Chart analysis</span>

        <div
          className="pnlChart chart_boxBg flexClm gap_12"
          style={{ padding: "16px 16px" }}
        >
          <span className="font_12">Weekly PnL</span>
          <div className="flexRow flexRow_stretch gap_12">
            {/* Max Run up */}
            <div
              className="boxBg flexClm gap_12"
              style={{ width: "100%", padding: "12px" }}
            >
              <span className="font_12">Max Run up</span>
              <span
                className={`${
                  stats?.maxProfit >= 0 ? "success" : "error"
                } stats-text`}
              >
                <span style={{ paddingRight: "4px" }}>
                  {getCurrencySymbol(currencyCode)}
                </span>
                {stats?.maxProfit?.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            {/* Max Drawdown */}
            <div
              className="boxBg flexClm gap_12"
              style={{ width: "100%", padding: "12px" }}
            >
              <span className="font_12">Max Drawdown</span>
              <span
                className={`${
                  stats?.maxLoss < 0 ? "error" : "success"
                } stats-text`}
              >
                <span style={{ paddingRight: "4px" }}>
                  {getCurrencySymbol(currencyCode)}
                </span>
                {stats?.maxLoss?.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          <PNLChart dailyData={stats.dailyData} />
        </div>

        <div
          className="pnlChart chart_boxBg flexClm gap_12"
          style={{ padding: "16px 16px" }}
        >
          <span className="font_12">PnL Candlestick Chart</span>
          <div className="flexRow flexRow_stretch gap_12">
            {/* Total Volume */}
            <div
              className="boxBg flexClm gap_12"
              style={{ width: "100%", padding: "12px" }}
            >
              <span className="font_12">Total Volume</span>
              <span className="stats-text">
                <span style={{ paddingRight: "4px" }}>
                  {getCurrencySymbol(currencyCode)}
                </span>
                {stats?.totalVolume?.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            {/* Net PnL */}
            <div
              className="boxBg flexClm gap_12"
              style={{ width: "100%", padding: "12px" }}
            >
              <span className="font_12">Net PnL</span>
              <span
                className={`${
                  stats?.netPnL >= 0 ? "success" : "error"
                } stats-text`}
              >
                <span style={{ paddingRight: "4px" }}>
                  {getCurrencySymbol(currencyCode)}
                </span>
                {stats?.netPnL?.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
          <DailyPnLChart data={candleData} />
        </div>

        <div className="greedAndFear flexRow flexRow_stretch chart_boxBg">
          <div className="gfHeader flexClm gap_12">
            <span className=" font_12 ">Greed & Fear Index</span>
            <span>{gfValue}</span>
          </div>

          {/* Gauge */}
          <div className="gfGauge">
            <svg width="130" height="80" viewBox="0 0 200 120">
              {/* Background semi-circle */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#444"
                strokeWidth="14"
              />

              {/* Colored stroke (Fear→Neutral→Greed) */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#gfGradient)"
                strokeWidth="14"
                strokeLinecap="round"
              />

              <defs>
                <linearGradient id="gfGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ef4444" /> {/* Fear */}
                  <stop offset="50%" stopColor="#fbbf24" /> {/* Neutral */}
                  <stop offset="100%" stopColor="#22c55e" /> {/* Greed */}
                </linearGradient>
              </defs>

              {/* Needle */}
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="25"
                stroke="white"
                strokeWidth="3"
                transform={`rotate(${angle} 100 100)`}
              />

              {/* Circle pivot */}
              <circle cx="100" cy="100" r="5" fill="white" />

              {/* Text inside semicircle */}
              <text
                x="100"
                y="75"
                textAnchor="middle"
                fontSize="20"
                fontWeight="bold"
                fill="white"
              >
                {gfValue}
              </text>
              <text
                x="100"
                y="95"
                textAnchor="middle"
                fontSize="14"
                fill={
                  gfLabel === "Fear"
                    ? "#ef4444"
                    : gfLabel === "Greed"
                    ? "#22c55e"
                    : "#fbbf24"
                }
              >
                {gfLabel}
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
