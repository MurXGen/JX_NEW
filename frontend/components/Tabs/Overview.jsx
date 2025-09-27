import DailyPnLChart from "@/components/Charts/DailyPnlChart";
import PNLChart from "@/components/Charts/PnlChart";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import { formatNumber } from "@/utils/formatNumbers";
import { processPnLCandles } from "@/utils/processPnLCandles";
import {
  ArrowDownRightFromCircle,
  ArrowDownRightIcon,
  ArrowUpRightFromCircle,
  ArrowUpRightIcon,
} from "lucide-react";
import AllVolume from "../Charts/AllVolume";
import TagAnalysis from "./TagAnalysis";

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

  const isShade = (val) =>
    val === 0 || val === undefined || val === "Not available";

  // For clock

  // const timePeriods = [
  //   {
  //     name: "Night",
  //     range: "12 am - 6 am",
  //     color: "#6366f1",
  //     startAngle: 0,
  //     endAngle: 90,
  //   },
  //   {
  //     name: "Morning",
  //     range: "6 am - 12 pm",
  //     color: "#f59e0b",
  //     startAngle: 90,
  //     endAngle: 180,
  //   },
  //   {
  //     name: "Afternoon",
  //     range: "12 pm - 6 pm",
  //     color: "#10b981",
  //     startAngle: 180,
  //     endAngle: 270,
  //   },
  //   {
  //     name: "Evening",
  //     range: "6 pm - 12 am",
  //     color: "#ef4444",
  //     startAngle: 270,
  //     endAngle: 360,
  //   },
  // ];

  // const getTimePeriodAngles = (periodName) => {
  //   const period = timePeriods.find((p) => p.name === periodName);
  //   return period
  //     ? { start: period.startAngle, end: period.endAngle }
  //     : { start: 0, end: 0 };
  // };

  // const bestTimeAngles = getTimePeriodAngles(stats.bestTime);
  // const worstTimeAngles = getTimePeriodAngles(stats.worstTime);

  // const calculateArc = (startAngle, endAngle) => {
  //   const startRad = (startAngle * Math.PI) / 180;
  //   const endRad = (endAngle * Math.PI) / 180;

  //   const x1 = 60 + 50 * Math.cos(startRad);
  //   const y1 = 60 + 50 * Math.sin(startRad);
  //   const x2 = 60 + 50 * Math.cos(endRad);
  //   const y2 = 60 + 50 * Math.sin(endRad);

  //   const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  //   return `M ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  // };

  return (
    <div className="overview flexClm gap_32">
      <div className="otherStats flexClm gap_24">
        <span className="font_12">Overview</span>

        {/* 🔹 Total Trades */}
        <div
          className="totalTrades flexClm gap_12 chart_boxBg"
          style={{ padding: "16px 16px" }}
        >
          <div className="flexRow flexRow_stretch">
            <span className="font_12">Total Trades</span>
            <span
              className={`font_12 ${
                !stats?.totalTrades || stats?.totalTrades === 0
                  ? "shade_50"
                  : ""
              }`}
            >
              {stats?.totalTrades || "0"}
            </span>
          </div>

          {/* Progress Bar */}
          <div
            className={`progress-bar ${
              (!stats?.winTrades && !stats?.loseTrades) ||
              stats?.totalTrades === 0
                ? "shade_50"
                : ""
            }`}
          >
            <div
              className={`progress-win ${
                !stats?.winTrades || stats?.winTrades === 0 ? "shade_50" : ""
              }`}
              style={{ width: `${winPercent}%` }}
            ></div>
            <div
              className={`progress-loss ${
                !stats?.loseTrades || stats?.loseTrades === 0 ? "shade_50" : ""
              }`}
              style={{ width: `${lossPercent}%` }}
            ></div>
          </div>

          <div className="flexRow flexRow_stretch">
            <span
              className={`font_12 ${
                !stats?.winTrades || stats?.winTrades === 0 ? "shade_50" : ""
              }`}
            >
              Wins: {stats?.winTrades || "0"}
            </span>
            <span
              className={`font_12 ${
                !stats?.loseTrades || stats?.loseTrades === 0 ? "shade_50" : ""
              }`}
            >
              Losses: {stats?.loseTrades || "0"}
            </span>
          </div>
        </div>

        {/* 🔹 Best & Worst Time */}
        <div className="bestTime flexRow flexRow_stretch gap_12">
          {/* Best Time */}
          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <span className="font_12">Best Time</span>
            <div className="flexRow flexRow_stretch">
              <span
                className={`font_16 ${
                  isShade(stats?.bestTime) ? "shade_50" : ""
                }`}
              >
                {stats?.bestTime ?? "Not available"}
              </span>
            </div>
          </div>

          {/* Worst Time */}
          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <span className="font_12">Worst Time</span>
            <div className="flexRow flexRow_stretch">
              <span
                className={`font_16 ${
                  isShade(stats?.worstTime) ? "shade_50" : ""
                }`}
              >
                {stats?.worstTime ?? "Not available"}
              </span>
            </div>
          </div>
        </div>

        {/* 🔹 Win Ratio & Average P/L */}
        <div className="bestTime flexRow flexRow_stretch gap_12">
          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <span className="font_12">Win ratio</span>
            <span
              className={`font_16 ${
                !stats?.winRatio || stats?.totalTrades === 0
                  ? "shade_50"
                  : stats?.winRatio > 70
                  ? "success"
                  : stats?.winRatio >= 50
                  ? "warning"
                  : "error"
              }`}
            >
              {stats?.winRatio || "0"}%
            </span>
          </div>

          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <span className="font_12">Average p/l</span>
            <span
              className={`font_16 ${
                stats?.totalTrades === 0 || stats?.averagePnL === undefined
                  ? "shade_50"
                  : stats?.averagePnL >= 0
                  ? "success"
                  : "error"
              }`}
            >
              {stats?.totalTrades === 0 ? "-" : stats?.averagePnL}
            </span>
          </div>
        </div>

        {/* 🔹 Volume & Fees */}
        <div className="flexRow flexRow_stretch gap_12">
          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <span className="font_12">Total volume</span>
            <span
              className={`font_16 flexRow gap_4 ${
                !stats?.totalVolume || stats?.totalVolume === 0
                  ? "shade_50"
                  : ""
              }`}
            >
              <span>{getCurrencySymbol(currencyCode)}</span>
              {stats?.totalVolume?.toLocaleString() || "0"}
            </span>
          </div>

          <div
            className="chart_boxBg width100 flexClm gap_12"
            style={{ padding: "16px" }}
          >
            <span className="font_12">Total fees</span>
            <span
              className={`font_16 flexRow gap_4 ${
                !stats?.totalFees || stats?.totalFees === 0 ? "shade_50" : ""
              }`}
            >
              <span>{getCurrencySymbol(currencyCode)}</span>
              {stats?.totalFees?.toLocaleString() || "0"}
            </span>
          </div>
        </div>

        {/* 🔹 Streak & Last 10 Trades */}
        <div
          className="totalTrades flexClm gap_12 chart_boxBg"
          style={{ padding: "16px 16px" }}
        >
          <div className="flexRow flexRow_stretch font_12">
            <span>Streak</span>
            <span
              className={`${
                !stats?.streak || stats?.streak === "0"
                  ? "shade_50"
                  : stats?.streak?.includes("win")
                  ? "success"
                  : "error"
              }`}
            >
              {stats?.streak || "0"}
            </span>
          </div>

          <div className="streakTrades">
            <div className="flexRow flexRow_scroll removeScrollBar gap_12">
              {stats?.last10 && stats?.last10.length > 0 ? (
                stats?.last10
                  ?.slice()
                  .reverse()
                  .map((trade, idx) => {
                    const isWin = trade.pnl > 0;
                    const isLoss = trade.pnl < 0;
                    const isLong = trade.direction === "long";

                    return (
                      <div
                        key={idx}
                        className={`tradeItem font_12 flexRow gap_12 ${
                          isWin ? "tradeWin" : isLoss ? "tradeLoss" : "shade_50"
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
                  })
              ) : (
                <span className="shade_50 font_12">No trade data</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <hr width={100} color="grey" />

      <div className="flexClm gap_24">
        <span className="font_12">Chart analysis</span>
        <div
          className="pnlChart chart_boxBg flexClm gap_12"
          style={{ padding: "16px 16px" }}
        >
          <span className="font_12">Daily PnL</span>
          <div className="flexRow flexRow_stretch gap_12">
            {/* Max Run up */}
            <div
              className="boxBg flexClm gap_12"
              style={{ width: "100%", padding: "12px" }}
            >
              <span className="font_12">Max profit</span>
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
              <span className="font_12">Max loss</span>
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
        <div
          className="pnlChart chart_boxBg flexClm gap_12"
          style={{ padding: "16px 16px" }}
        >
          <span className="font_12">Daily Volume chart</span>

          <div className="flexRow flexRow_stretch gap_12">
            {/* Total Long Volume */}
            {/* <div
              className="boxBg flexRow flexRow_center gap_8"
              style={{ width: "100%", padding: "12px" }}
            >
              <div className="flexClm gap_12">
                <span className="font_12">Total Long Volume</span>
                <span className="success flexRow gap_8">
                  {stats.dailyVolumeData
                    ?.reduce((sum, day) => sum + (day.longVolume || 0), 0)
                    .toLocaleString("en-US")}
                  <ArrowUpRightIcon className="success" size={20} />
                </span>
              </div>
            </div> */}

            {/* Total Short Volume */}
            <div
              className="boxBg flexRow flexRow_center gap_8"
              style={{ width: "100%", padding: "12px" }}
            >
              <div className="flexClm gap_12">
                <span className="font_12">Total Volume</span>
                <span className="flexRow gap_8">{stats.totalVolume}</span>
              </div>
            </div>
          </div>

          <AllVolume dailyData={stats.dailyVolumeData} />
        </div>

        <div>
          <TagAnalysis tagAnalysis={stats?.tagAnalysis} />
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
