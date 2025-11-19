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
      "JournalX is a structured trading journal that helps traders log trades, track performance, and understand patterns. It promotes discipline and consistency by allowing you to review your setups, mistakes, and improvements over time.",
  },
  {
    question: "Is JournalX free to use?",
    answer:
      "Yes, JournalX includes a free plan to start logging your trades instantly. You can upgrade anytime to unlock advanced features like detailed analytics, notes, tags, and funded account tracking.",
  },
  {
    question: "How does JournalX help me pass funding accounts?",
    answer:
      "JournalX helps you stay consistent by tracking your funded account metrics, daily drawdown, trade behavior, and performance stats so you can maintain discipline during challenges.",
  },
  {
    question: "Can I connect my broker or trading platform to JournalX?",
    answer:
      "We are currently working on integrations with popular brokers and trading platforms. Once live, you will be able to sync trades automatically for accurate and faster journaling.",
  },
  {
    question: "Will my trading data remain private and secure?",
    answer:
      "Yes. JournalX uses secure servers and encrypted data handling. Your trade logs and journal entries remain private and are visible only to you.",
  },
  {
    question: "Does JournalX support both demo and live accounts?",
    answer:
      "Yes, you can log trades from both demo and live accounts to understand your performance and behavior in different conditions.",
  },
  {
    question: "Can JournalX track my emotions and mindset?",
    answer:
      "Yes, JournalX allows you to record your emotions, thoughts, and observations for each trade so you can identify psychological patterns that affect your consistency.",
  },
  {
    question: "How does JournalX improve my risk management?",
    answer:
      "JournalX helps you review your risk-to-reward ratios, win/loss patterns, and position sizing habits over time so you can make better decisions and avoid impulsive trades.",
  },
  {
    question: "Does JournalX work on mobile devices?",
    answer:
      "Yes, JournalX is fully responsive and optimized for both mobile and desktop, making it easy to log and review trades anytime.",
  },
  {
    question: "Can JournalX help me build a consistent strategy?",
    answer:
      "Yes. JournalX highlights your strengths and weaknesses through your trade history, helping you refine a trading system that fits your style and improves consistency over time.",
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
        className="flexClm width100 chart_boxBg"
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
              <motion.button
                onClick={() => toggleFAQ(index)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 250, damping: 18 }}
                className="flexRow flexRow_stretch width100 pad_16"
                style={{
                  color: "white",
                  border: "none",
                  background: "transparent",
                  fontFamily: "var(--ff-Pop)",
                  cursor: "pointer",
                  justifyContent: "space-between",
                  alignItems: "center",
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
              </motion.button>

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
