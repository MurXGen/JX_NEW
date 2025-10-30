"use client";
import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import HeaderSection from "./HeaderSection";

const reasons = [
  {
    title: "Pass Funding Accounts",
    description:
      "Master your trades, impress funders, and unlock limitless capital growth.",
  },
  {
    title: "Grow Personal Account",
    description:
      "Turn consistent analysis into compounding profits and real financial freedom.",
  },
  {
    title: "No Main Emotion Damage",
    description:
      "Trade calmly, think clearly, and protect your edge from emotions.",
  },
  {
    title: "Build Powerful Strategies",
    description:
      "Design data-driven trading systems that adapt, scale, and win consistently.",
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
              <Check size={14} className="successBg" />
            </motion.div>

            <div>
              <h3 className="font_16 marg_0">
                {highlightLastTwoWords(reason.title)}
              </h3>
              <p className="font_14 shade_50 marg_0">{reason.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default WhyJournalSection;
