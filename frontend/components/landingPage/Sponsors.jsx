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
    { icon: <Bitcoin size={32} strokeWidth={1.8} />, text: "Crypto Markets" },
    { icon: <CandlestickChart size={32} strokeWidth={1.8} />, text: "Forex" },
    {
      icon: <Coins size={32} strokeWidth={1.8} />,
      text: "Commodities & Metals",
    },
    { icon: <LineChart size={32} strokeWidth={1.8} />, text: "Equities" },
    { icon: <Layers size={32} strokeWidth={1.8} />, text: "Futures" },
    { icon: <BarChart3 size={32} strokeWidth={1.8} />, text: "Options" },
  ];

  return (
    <section
      className="landingBody flex_center flexClm gap_32"
      aria-label="Markets supported by JournalX"
    >
      <HeaderSection
        title="Built for Every Market You Trade"
        subtitle="No matter how or where you trade, JournalX adapts to your style and helps you stay disciplined and consistent."
      />

      <div className="marquee_wrapper" role="list">
        <motion.div
          className="marquee_track"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            ease: "linear",
            duration: 30,
            repeat: Infinity,
          }}
        >
          {[...Array(2)].map((_, i) => (
            <ul key={i} className="marquee_content">
              {markets.map((item, index) => (
                <li
                  key={`${item.text}-${index}-${i}`}
                  className="marquee_item"
                  role="listitem"
                >
                  <div
                    className="icon_wrapper"
                    aria-label={item.text}
                    title={item.text}
                  >
                    {item.icon}
                  </div>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default SponsorsSection;
