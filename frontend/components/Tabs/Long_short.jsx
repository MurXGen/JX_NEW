import OverviewSection from "@/components/Tabs/OverviewSection";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";
import VolumeChart from "../Charts/VolumeChart";
import { calculateStats } from "@/utils/calculateStats"; // ✅ import the utility
import SectionHeader from "../ui/SectionHeader";

export default function LongShorts({ stats, longTrades, shortTrades }) {
  // Use utility function for stats
  const longStats = calculateStats(longTrades);
  const shortStats = calculateStats(shortTrades);

  return (
    <div className="flexClm gap_32">
      {/* Long Trades Section */}
      <div className="longTradesSection flexClm gap_24">
        <SectionHeader
          title="Longs analysis"
          description="Analysis of logged long trades"
          level={2} // uses <h2>
          // showButton={accounts.length > 0}
          // buttonLabel="Create journal"
          // onButtonClick={handleCreateAccount}
          // loading={loading}
        />
        <OverviewSection stats={longStats} trades={longTrades} />
      </div>

      <hr width={100} color="grey" />

      {/* Short Trades Section */}
      <div className="shortTradesSection flexClm gap_24">
        <SectionHeader
          title="Shorts analysis"
          description="Analysis of logged short trades"
          level={2} // uses <h2>
          // showButton={accounts.length > 0}
          // buttonLabel="Create journal"
          // onButtonClick={handleCreateAccount}
          // loading={loading}
        />
        <OverviewSection stats={shortStats} trades={shortTrades} />
      </div>
      <hr width={100} color="grey" />
      <div className="flexClm gap_24">
        <SectionHeader
          title="Chart Analysis"
          description="Visual analysis of logged trades"
          level={2} // uses <h2>
          // showButton={accounts.length > 0}
          // buttonLabel="Create journal"
          // onButtonClick={handleCreateAccount}
          // loading={loading}
        />
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
    </div>
  );
}
