"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import HeroSection from "./Hero";
import HeaderSection from "./HeaderSection";

const faqs = [
  {
    question: "What is JournalX and how does it help traders?",
    answer:
      "JournalX is a smart trading journal that tracks your performance, analyzes emotional patterns, and provides insights to improve profitability. It helps traders build discipline and consistent strategies using AI-driven analytics.",
  },
  {
    question: "Is JournalX free to use?",
    answer:
      "Yes, JournalX offers a free plan to start journaling your trades instantly. You can upgrade anytime for advanced features like analytics, insights, and funding account tracking.",
  },
  {
    question: "How does JournalX help me pass funding accounts?",
    answer:
      "JournalX tracks your funded account performance and provides emotional and statistical analysis to help you maintain consistency, manage drawdowns, and meet your funding goals faster.",
  },
  {
    question: "Can I connect my broker or trading platform to JournalX?",
    answer:
      "Yes, JournalX supports integration with popular brokers and trading platforms. You can automatically sync trades, saving you time and ensuring accurate records.",
  },
  {
    question: "Will my trading data remain private and secure?",
    answer:
      "Absolutely. JournalX uses end-to-end encryption and secure servers to keep your data 100% private. Your logs and performance analytics are visible only to you.",
  },
  {
    question: "Does JournalX support both demo and live accounts?",
    answer:
      "Yes, you can log both demo and live trades to analyze your performance and emotions under different trading conditions.",
  },
  {
    question: "Can JournalX track my emotions and mindset?",
    answer:
      "Yes, JournalX lets you record emotional states before and after trades, providing AI-driven insights into how mindset impacts your performance.",
  },
  {
    question: "How does JournalX improve my risk management?",
    answer:
      "JournalX visualizes your risk-to-reward ratios, win/loss patterns, and position sizing behavior—helping you make data-driven decisions and reduce emotional trades.",
  },
  {
    question: "Does JournalX work on mobile devices?",
    answer:
      "Yes, JournalX is fully responsive and optimized for both desktop and mobile, allowing you to log and review trades anytime, anywhere.",
  },
  {
    question: "Can JournalX help me build a consistent strategy?",
    answer:
      "Definitely. JournalX tracks your historical data, highlights strengths and weaknesses, and helps you refine a trading system that aligns with your psychology and market style.",
  },
];

export default function Faqs() {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="flexClm gap_32">
      <HeaderSection
        title="Faqs"
        subtitle="Checkout Faqs to understand using Journalx"
      />

      <div
        className="flexClm gap_4 width100 chart_boxBg"
        style={{ minWidth: "300px", maxWidth: "600px", margin: "auto" }}
      >
        {faqs.map((faq, index) => (
          <div key={index} className="flexClm gap_12 ">
            <button
              onClick={() => toggleFAQ(index)}
              className=" flexRow flexRow_stretch width100 pad_16"
              style={{
                color: "white",
                border: "none",
                background: "var(--white-4)",
              }}
            >
              <h3 className="font_16 font_weight_500">{faq.question}</h3>
              {activeIndex === index ? (
                <Minus className="" size={20} />
              ) : (
                <Plus className="" size={20} />
              )}
            </button>

            <AnimatePresence initial={false}>
              {activeIndex === index && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="pad_16"
                >
                  <span className="font_14">{faq.answer}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}
