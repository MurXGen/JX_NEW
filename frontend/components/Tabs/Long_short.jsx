import OverviewSection from "@/components/Tabs/OverviewSection";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";
import VolumeChart from "../Charts/VolumeChart";

function calculateStats(tradesArray) {
  if (!tradesArray || tradesArray.length === 0) {
    return {
      totalTrades: 0,
      winTrades: 0,
      loseTrades: 0,
      winRatio: "0.00",
      averagePnL: "0.00",
      maxProfit: 0,
      maxLoss: 0,
      totalVolume: 0,
      totalFees: 0,
      last10: [],
      dailyVolumeData: [],
      bestTime: "Not available",
      worstTime: "Not available",
    };
  }

  const pnlValues = tradesArray.map((t) => t.pnl || 0);
  const netPnL = pnlValues.reduce((sum, p) => sum + p, 0);
  const totalTrades = tradesArray.length;
  const winTrades = tradesArray.filter((t) => t.pnl > 0).length;
  const loseTrades = tradesArray.filter((t) => t.pnl < 0).length;
  const winRatio = totalTrades ? (winTrades / totalTrades) * 100 : 0;
  const averagePnL = totalTrades ? netPnL / totalTrades : 0;
  const maxProfit = Math.max(...pnlValues.filter((p) => p > 0), 0);
  const maxLoss = Math.min(...pnlValues.filter((p) => p < 0), 0);
  const totalVolume = tradesArray.reduce(
    (sum, t) => sum + (t.totalQuantity || 0),
    0
  );
  const totalFees = tradesArray.reduce((sum, t) => sum + (t.feeAmount || 0), 0);

  // last 10 trades
  const last10 = tradesArray.slice(-10);

  // daily volume aggregation
  const dailyVolumeData = {};
  tradesArray.forEach((trade) => {
    const date = new Date(trade.closeTime || trade.openTime).toLocaleDateString(
      "en-GB",
      { day: "2-digit", month: "short", year: "numeric" }
    );

    if (!dailyVolumeData[date])
      dailyVolumeData[date] = { longVolume: 0, shortVolume: 0 };

    if (trade.direction?.toLowerCase() === "long") {
      dailyVolumeData[date].longVolume += trade.totalQuantity || 0;
    } else if (trade.direction?.toLowerCase() === "short") {
      dailyVolumeData[date].shortVolume += trade.totalQuantity || 0;
    }
  });

  const dailyVolume = Object.entries(dailyVolumeData)
    .map(([date, { longVolume, shortVolume }]) => ({
      date,
      longVolume: longVolume || 0,
      shortVolume: shortVolume || 0,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // 🔹 Best / Worst Time calculation
  const timeRanges = [
    { label: "Night", start: 0, end: 6 },
    { label: "Morning", start: 6, end: 12 },
    { label: "Afternoon", start: 12, end: 18 },
    { label: "Evening", start: 18, end: 24 },
  ];

  const pnlByTimeRange = { Night: 0, Morning: 0, Afternoon: 0, Evening: 0 };
  const tradesByRange = { Night: [], Morning: [], Afternoon: [], Evening: [] };

  tradesArray.forEach((trade) => {
    const hour = new Date(trade.closeTime || trade.openTime).getHours();
    const range = timeRanges.find((r) => hour >= r.start && hour < r.end);

    if (range) {
      pnlByTimeRange[range.label] += trade.pnl || 0;
      tradesByRange[range.label].push(trade);
    }
  });

  console.log("📊 PnL by Time Range:", pnlByTimeRange);
  console.log("📝 Trades grouped by range:", tradesByRange);

  const bestEntry = Object.entries(pnlByTimeRange).reduce((a, b) =>
    b[1] > a[1] ? b : a
  );
  const worstEntry = Object.entries(pnlByTimeRange).reduce((a, b) =>
    b[1] < a[1] ? b : a
  );

  let bestTime = "Not available";
  let worstTime = "Not available";

  if (bestEntry[1] > 0) {
    bestTime = bestEntry[0];
  }

  if (worstEntry[1] < 0) {
    worstTime = worstEntry[0];
  }

  console.log("✅ Best Time:", bestTime, "->", tradesByRange[bestTime]);
  console.log("❌ Worst Time:", worstTime, "->", tradesByRange[worstTime]);

  return {
    totalTrades,
    winTrades,
    loseTrades,
    winRatio: winRatio.toFixed(2),
    averagePnL: averagePnL.toFixed(2),
    maxProfit: maxProfit || 0,
    maxLoss: maxLoss || 0,
    totalVolume: totalVolume || 0,
    totalFees: totalFees || 0,
    last10,
    dailyVolumeData: dailyVolume,
    bestTime,
    worstTime,
  };
}

export default function LongShorts({ stats, longTrades, shortTrades }) {
  const longStats = calculateStats(longTrades);
  const shortStats = calculateStats(shortTrades);

  return (
    <div className="flexClm gap_32">
      {/* Long Trades Section */}
      <div className="longTradesSection flexClm gap_24">
        <span className="font_12">Long Trades</span>
        <OverviewSection stats={longStats} trades={longTrades} />
      </div>

      <hr width={100} color="grey" />

      {/* Short Trades Section */}
      <div className="shortTradesSection flexClm gap_24">
        <span className="font_12">Short Trades</span>
        <OverviewSection stats={shortStats} trades={shortTrades} />
      </div>
      <hr width={100} color="grey" />
      <div
        className="pnlChart chart_boxBg flexClm gap_12"
        style={{ padding: "16px 16px" }}
      >
        <span className="font_12">Daily Volume chart</span>

        <div className="flexRow flexRow_stretch gap_12">
          {/* Total Long Volume */}
          <div
            className="boxBg flexRow flexRow_center gap_8"
            style={{ width: "100%", padding: "12px" }}
          >
            <div className="flexClm gap_12">
              <span className="font_12">Total Long Volume</span>
              <span className="flexRow gap_8">
                {(
                  stats?.dailyVolumeData?.reduce(
                    (sum, day) => sum + (day.longVolume || 0),
                    0
                  ) || 0
                ).toLocaleString("en-US")}
                <ArrowUpRightIcon className="success" size={20} />
              </span>
            </div>
          </div>

          {/* Total Short Volume */}
          <div
            className="boxBg flexRow flexRow_center gap_8"
            style={{ width: "100%", padding: "12px" }}
          >
            <div className="flexClm gap_12">
              <span className="font_12">Total Short Volume</span>
              <span className="flexRow gap_8">
                {(
                  stats?.dailyVolumeData?.reduce(
                    (sum, day) => sum + (day.shortVolume || 0),
                    0
                  ) || 0
                ).toLocaleString("en-US")}
                <ArrowDownRightIcon className="error" size={20} />
              </span>
            </div>
          </div>
        </div>

        {stats && stats.dailyVolumeData && (
          <VolumeChart dailyData={stats.dailyVolumeData} />
        )}
      </div>
    </div>
  );
}
