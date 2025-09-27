import { getCurrencySymbol } from "@/utils/currencySymbol";
import { formatNumber } from "@/utils/formatNumbers";
import { ArrowDownRightFromCircle, ArrowUpRightFromCircle } from "lucide-react";

export default function OverviewSection({ stats, trades }) {
  const currencyCode = localStorage.getItem("currencyCode");

  const totalTrades = stats?.totalTrades || 0;
  const winPercent = totalTrades ? (stats.winTrades / totalTrades) * 100 : 0;
  const lossPercent = totalTrades ? (stats.loseTrades / totalTrades) * 100 : 0;

  const isShade = (val) =>
    val === 0 || val === undefined || val === "Not available";

  return (
    <div className="otherStats flexClm gap_24">
      {/* Total Trades */}
      <div
        className="totalTrades flexClm gap_12 chart_boxBg"
        style={{ padding: "16px 16px" }}
      >
        <div className="flexRow flexRow_stretch">
          <span className="font_12">Total Trades</span>
          <span
            className={`font_12 ${
              isShade(stats?.totalTrades) ? "shade_50" : ""
            }`}
          >
            {stats?.totalTrades ?? "0"}
          </span>
        </div>

        {/* Progress Bar */}
        <div
          className={`progress-bar ${
            isShade(stats?.winTrades) && isShade(stats?.loseTrades)
              ? "shade_50"
              : ""
          }`}
        >
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
          <span
            className={`font_12 ${isShade(stats?.winTrades) ? "shade_50" : ""}`}
          >
            Wins: {stats?.winTrades ?? "0"}
          </span>
          <span
            className={`font_12 ${
              isShade(stats?.loseTrades) ? "shade_50" : ""
            }`}
          >
            Losses: {stats?.loseTrades ?? "0"}
          </span>
        </div>
      </div>

      {/* Best/Worst Time */}
      <div className="bestTime flexRow flexRow_stretch gap_12">
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

      {/* Win Ratio & Avg P/L */}
      <div className="bestTime flexRow flexRow_stretch gap_12">
        <div
          className="chart_boxBg width100 flexClm gap_12"
          style={{ padding: "16px" }}
        >
          <span className="font_12">Win ratio</span>
          <span
            className={`font_16 ${
              isShade(stats?.winRatio)
                ? "shade_50"
                : stats?.winRatio > 70
                ? "success"
                : stats?.winRatio >= 50
                ? "warning"
                : "error"
            }`}
          >
            {stats?.winRatio ?? "0"}%
          </span>
        </div>

        <div
          className="chart_boxBg width100 flexClm gap_12"
          style={{ padding: "16px" }}
        >
          <span className="font_12">Average p/l</span>
          <span
            className={`font_16 ${
              isShade(stats?.averagePnL)
                ? "shade_50"
                : stats?.averagePnL >= 0
                ? "success"
                : "error"
            }`}
          >
            {stats?.averagePnL ?? "0"}
          </span>
        </div>
      </div>

      {/* Total Volume & Fees */}
      <div className="flexRow flexRow_stretch gap_12">
        <div
          className="chart_boxBg width100 flexClm gap_12"
          style={{ padding: "16px" }}
        >
          <span className="font_12">Total volume</span>
          <span
            className={`font_16 flexRow gap_4 ${
              isShade(stats?.totalVolume) ? "shade_50" : ""
            }`}
          >
            <span>{getCurrencySymbol(currencyCode)}</span>
            {stats?.totalVolume?.toLocaleString() ?? "0"}
          </span>
        </div>

        <div
          className="chart_boxBg width100 flexClm gap_12"
          style={{ padding: "16px" }}
        >
          <span className="font_12">Total fees</span>
          <span
            className={`font_16 flexRow gap_4 ${
              isShade(stats?.totalFees) ? "shade_50" : ""
            }`}
          >
            <span>{getCurrencySymbol(currencyCode)}</span>
            {stats?.totalFees?.toLocaleString() ?? "0"}
          </span>
        </div>
      </div>
    </div>
  );
}
