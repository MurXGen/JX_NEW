import {
  FcCurrencyExchange,
  FcBullish,
  FcTimeline,
  FcComboChart,
  FcParallelTasks,
  FcStatistics,
} from "react-icons/fc";
import { motion } from "framer-motion";

const SponsorsSection = () => {
  const markets = [
    { icon: <FcCurrencyExchange size={40} />, text: "Crypto" },
    { icon: <FcBullish size={40} />, text: "Forex" },
    { icon: <FcTimeline size={40} />, text: "Metals" },
    { icon: <FcComboChart size={40} />, text: "Stocks" },
    { icon: <FcParallelTasks size={40} />, text: "Futures" },
    { icon: <FcStatistics size={40} />, text: "Options" },
  ];

  // Duplicate array for seamless looping
  const loopMarkets = [...markets, ...markets];

  return (
    <section className="sponsor_container flex_center flexClm gap_32">
      <div className="flexClm gap_4 flex_center">
        <h2 className="font_32 marg_0">Journal What You Trade</h2>
        <p className="font_16 marg_0 shade_50">
          Track different market trades with JournalX
        </p>
      </div>

      <div className="sponsor_marquee_container">
        <motion.div
          className="sponsor_marquee"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            ease: "linear",
            duration: 20,
            repeat: Infinity,
          }}
        >
          {loopMarkets.map((item, index) => (
            <div key={index} className="sponsor_item flexRow gap_8 flex_center">
              {item.icon}
              <span className="font_18">{item.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default SponsorsSection;
