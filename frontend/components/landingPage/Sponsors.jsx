"use client";
import {
  FcCurrencyExchange,
  FcBullish,
  FcTimeline,
  FcComboChart,
  FcParallelTasks,
  FcStatistics,
} from "react-icons/fc";
import { motion } from "framer-motion";
import HeaderSection from "./HeaderSection";

const SponsorsSection = () => {
  const markets = [
    { icon: <FcCurrencyExchange size={40} />, text: "Crypto" },
    { icon: <FcBullish size={40} />, text: "Forex" },
    { icon: <FcTimeline size={40} />, text: "Metals" },
    { icon: <FcComboChart size={40} />, text: "Stocks" },
    { icon: <FcParallelTasks size={40} />, text: "Futures" },
    { icon: <FcStatistics size={40} />, text: "Options" },
  ];

  // Duplicate for continuous flow
  const loopMarkets = [...markets, ...markets];

  return (
    <section className="mrgin_tp_100 landingBody flex_center flexClm gap_32">
      <HeaderSection
        title="Journal What You Trade"
        subtitle="Track different market trades with JournalX"
      />

      <div className="sponsor_marquee_container">
        <motion.div
          className="sponsor_marquee"
          animate={{ x: ["-50%", "0%"] }}
          transition={{
            ease: "linear",
            duration: 5, // completes one round in 5 seconds
            repeat: Infinity,
          }}
        >
          <div className="sponsor_marquee_content">
            {loopMarkets.map((item, index) => (
              <div
                key={index}
                className="sponsor_item flexRow gap_8 flex_center"
              >
                {item.icon}
                <span className="font_18">{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SponsorsSection;
