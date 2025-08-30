import { ArrowDownRight, ArrowDownRightFromCircle, ArrowUpRight, ArrowUpRightFromCircle } from "lucide-react";
import PNLChart from "../Charts/PnlChart";
import { formatCurrency, formatNumber } from "@/utils/formatNumbers";

export default function Overview({ stats }) {

    if (!stats) return <p className="font_12" style={{ textAlign: 'center', marginTop: '50%' }}>No trade logged to show analysis</p>;

    const gfValue = stats.greedFear?.value || 50;
    const gfLabel = stats.greedFear?.label || "Neutral";

    // Needle rotation (-90° to +90° for 0–100)
    const angle = (gfValue / 100) * 180 - 90;

    // Use pre-calculated values from main page
    const total = stats.winTrades + stats.loseTrades;
    const winPercent = total > 0 ? (stats.winTrades / total) * 100 : 0;
    const lossPercent = total > 0 ? (stats.loseTrades / total) * 100 : 0;

    return (
        <div className="overview flexClm gap_12">
            <div className="totalTrades flexClm gap_12 boxBg" style={{ padding: "16px 16px" }}>
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

            <div className="pnlChart chart_boxBg flexClm gap_12" style={{ padding: '16px 16px' }}>
                <span className="font_12">This Week's PnL</span>
                <div className="flexRow flexRow_stretch gap_12">
                    {/* Max Run up */}
                    <div className="boxBg flexClm gap_12" style={{ width: '100%', padding: '12px' }}>
                        <span className="font_12">Max Run up</span>
                        <span className={`success stats?.maxProfit >= 0 ? "text-green-500" : "text-red-500"`}>
                            {stats?.maxProfit?.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    {/* Max Drawdown */}
                    <div className="boxBg flexClm gap_12" style={{ width: '100%', padding: '12px' }}>
                        <span className="font_12">Max Drawdown</span>
                        <span className={`error stats?.maxLoss < 0 ? "text-red-500" : "text-green-500"`}>
                            {stats?.maxLoss?.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
                <PNLChart dailyData={stats.dailyData} />
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
                                <stop offset="0%" stopColor="#ef4444" />  {/* Fear */}
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

            <div className="totalTrades flexClm gap_12 boxBg" style={{ padding: "16px 16px" }}>
                {/* Streak Section */}
                <div className="flexRow flexRow_stretch font_12">
                    <span>Streak</span>
                    <span className={stats?.streak?.includes("win") ? "success" : "error"}>
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
                                        className={`tradeItem font_12 flexRow gap_12 ${isWin ? "tradeWin" : "tradeLoss"
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


        </div>
    );
}
