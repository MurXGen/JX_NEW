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
      "Yes we are on it as we are gradually integarting and it would be available as soon as possible! JournalX supports integration with popular brokers and trading platforms. You can automatically sync trades, saving you time and ensuring accurate records.",
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
    <section className="flexClm gap_32 landingBody">
      <HeaderSection
        title="FAQs"
        subtitle="Get answers to common questions about JournalX"
      />

      <div
        className="flexClm width100 chart_boxBg_lp"
        style={{
          minWidth: "300px",
          maxWidth: "720px",
          margin: "auto",
        }}
      >
        {faqs.map((faq, index) => {
          const isActive = activeIndex === index;

          return (
            <motion.div
              key={index}
              initial={false}
              animate={{
                backgroundColor: isActive
                  ? "rgba(167,125,2,0.08)"
                  : "rgba(255,255,255,0.03)",
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="faq_item"
              style={{
                borderBottom: "1px solid var(--white-10)",
              }}
            >
              {/* Question Button */}
              <motion.a
                onClick={() => toggleFAQ(index)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 250, damping: 18 }}
                className="flexRow flexRow_stretch pad_16"
                style={{
                  color: "white",
                  border: "none",
                  background: "transparent",
                  fontFamily: "var(--ff-Pop)",
                  cursor: "pointer",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textDecoration: "none",
                }}
              >
                <motion.h3
                  className="font_16 font_weight_500"
                  style={{ textAlign: "left" }}
                  animate={{
                    color: isActive ? "var(--primary-light)" : "white",
                  }}
                  transition={{ duration: 0.25 }}
                >
                  {faq.question}
                </motion.h3>
                <motion.div
                  animate={{ rotate: isActive ? 180 : 0 }}
                  transition={{ duration: 0.35 }}
                >
                  {isActive ? (
                    <Minus size={20} strokeWidth={2} />
                  ) : (
                    <Plus size={20} strokeWidth={2} />
                  )}
                </motion.div>
              </motion.a>

              {/* Animated Answer */}
              <AnimatePresence initial={false}>
                {isActive && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0, y: -5 }}
                    animate={{ height: "auto", opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -5 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="pad_16"
                    style={{
                      color: "var(--white-80)",
                      fontSize: "14px",
                      lineHeight: "1.6",
                    }}
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
