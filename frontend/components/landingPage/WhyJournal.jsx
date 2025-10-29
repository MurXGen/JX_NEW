"use client";
import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import HeaderSection from "./HeaderSection";

const reasons = [
  {
    title: "Pass Funding Accounts",
    description: "Your performance decides your profitability",
  },
  {
    title: "Grow Personal Account",
    description: "Your performance decides your profitability",
  },
  {
    title: "No Main Emotion Damage",
    description: "Your performance decides your profitability",
  },
  {
    title: "Build Powerful Strategies",
    description: "Your performance decides your profitability",
  },
];

// helper to highlight last two words
const highlightLastTwoWords = (text) => {
  const words = text.split(" ");
  const firstPart = words.slice(0, -2).join(" ");
  const lastPart = words.slice(-2).join(" ");
  return (
    <>
      {firstPart} <span className="vector">{lastPart}</span>
    </>
  );
};

const WhyJournalSection = () => {
  return (
    <section className="flexClm landingBody gap_32 mrgin_tp_100">
      <HeaderSection
        title="Why Journal Your Trades?"
        subtitle="4 reasons every trader needs JournalX"
      />

      <div className="section_grid">
        {reasons.map((reason, index) => (
          <motion.div
            key={index}
            className="chart_boxBg flexRow gap_12 pad_32"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: index * 0.15 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="chart_boxBg flexRow flex_center br_24"
              style={{ width: 36, height: 36, minWidth: 36 }}
              initial={{ scale: 0.8, color: "#fff" }}
              whileInView={{
                scale: 1,
                color: "var(--success)",
              }}
              transition={{ duration: 0.8, delay: index * 0.8 }}
              viewport={{ once: true }}
            >
              <Check size={14} />
            </motion.div>

            <div>
              <h3 className="font_16 marg_0">
                {highlightLastTwoWords(reason.title)}
              </h3>
              <p className="font_16 shade_50 marg_0">{reason.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default WhyJournalSection;
