"use client";
import React from "react";
import {
  Bitcoin,
  LineChart,
  CandlestickChart,
  BarChart3,
  Layers,
  Coins,
} from "lucide-react";
import { motion } from "framer-motion";
import HeaderSection from "./HeaderSection";

const SponsorsSection = () => {
  const markets = [
    { icon: <Bitcoin size={32} strokeWidth={1.8} />, text: "Crypto" },
    { icon: <CandlestickChart size={32} strokeWidth={1.8} />, text: "Forex" },
    { icon: <Coins size={32} strokeWidth={1.8} />, text: "Metals" },
    { icon: <LineChart size={32} strokeWidth={1.8} />, text: "Stocks" },
    { icon: <Layers size={32} strokeWidth={1.8} />, text: "Futures" },
    { icon: <BarChart3 size={32} strokeWidth={1.8} />, text: "Options" },
  ];

  return (
    <section className="landingBody flex_center flexClm gap_32">
      <HeaderSection
        title="Journal What You Trade"
        subtitle="Track different market trades with JournalX"
      />

      <div className="marquee_wrapper">
        <motion.div
          className="marquee_track"
          animate={{ x: ["0%", "-50%"] }} // move half (since we duplicate)
          transition={{
            ease: "linear",
            duration: 30, // adjust for speed
            repeat: Infinity,
          }}
        >
          {/* Duplicate list twice for continuous loop */}
          {[...Array(2)].map((_, i) => (
            <div key={i} className="marquee_content">
              {markets.map((item, index) => (
                <div
                  key={`${item.text}-${index}-${i}`}
                  className="marquee_item"
                >
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    transition={{ duration: 0.3 }}
                    className="icon_wrapper"
                  >
                    {item.icon}
                  </motion.div>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default SponsorsSection;
