import OverviewSection from "@/components/Tabs/OverviewSection";
import { calculateStats } from "@/utils/calculateStats";
import { ArrowDownRightIcon, ArrowUpRightIcon, Circle } from "lucide-react";
import VolumeChart from "../Charts/LongShortVolumes";

export default function LongShorts({ stats, longTrades, shortTrades }) {
  // Stats
  const longStats = calculateStats(longTrades);
  const shortStats = calculateStats(shortTrades);

  // ➕ Calculate PNL totals
  const totalLongPNL = longTrades.reduce(
    (sum, t) => sum + (Number(t.pnl) || 0),
    0,
  );

  const totalShortPNL = shortTrades.reduce(
    (sum, t) => sum + (Number(t.pnl) || 0),
    0,
  );

  return (
    <div className="flexClm gap_32">
      {/* Long Trades Section */}
      <div className="longTradesSection flexClm gap_24">
        <span className="font_16">Long trades analysis</span>
        <OverviewSection stats={longStats} trades={longTrades} />
      </div>

      {/* Short Trades Section */}
      <div className="shortTradesSection flexClm gap_24">
        <span className="font_16">Short trades analysis</span>
        <OverviewSection stats={shortStats} trades={shortTrades} />
      </div>

      <div className="flexClm gap_24">
        <div
          className="pnlChart chart_boxBg flexClm gap_12"
          style={{ padding: "16px 16px" }}
        >
          {stats?.dailyVolumeData && (
            <VolumeChart dailyData={stats.dailyVolumeData} />
          )}

          <div className="flexRow flexRow_stretch gap_12">
            {/* Total Long Volume + Long PNL */}
            <div
              className="boxBg flexClm gap_24"
              style={{ width: "100%", padding: "12px" }}
            >
              <div className="flexClm gap_8">
                <span className="font_12">Total Long Volume</span>
                <span className="flexRow gap_8">
                  {(
                    stats?.dailyVolumeData?.reduce(
                      (sum, day) => sum + (day.longVolume || 0),
                      0,
                    ) || 0
                  ).toLocaleString("en-US")}
                  <ArrowUpRightIcon className="success" size={20} />
                </span>
              </div>

              <div className="flexClm gap_8">
                <span className="font_12">Total Long PNL</span>
                <span className="flexRow gap_8">
                  {totalLongPNL.toLocaleString("en-US")}
                  <Circle
                    className={totalLongPNL >= 0 ? "success" : "error"}
                    size={16}
                  />
                </span>
              </div>
            </div>

            {/* Total Short Volume + Short PNL */}
            <div
              className="boxBg flexClm gap_24"
              style={{ width: "100%", padding: "12px" }}
            >
              <div className="flexClm gap_8">
                <span className="font_12">Total Short Volume</span>
                <span className="flexRow gap_8">
                  {(
                    stats?.dailyVolumeData?.reduce(
                      (sum, day) => sum + (day.shortVolume || 0),
                      0,
                    ) || 0
                  ).toLocaleString("en-US")}
                  <ArrowDownRightIcon className="error" size={20} />
                </span>
              </div>

              <div className="flexClm gap_8">
                <span className="font_12">Total Short PNL</span>
                <span className="flexRow gap_8">
                  {totalShortPNL.toLocaleString("en-US")}
                  <Circle
                    className={totalShortPNL >= 0 ? "success" : "error"}
                    size={16}
                  />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
