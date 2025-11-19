"use client";
import React from "react";
import { motion } from "framer-motion";
import { Star, TrendingUp, BarChart3, ShieldCheck } from "lucide-react";
import HeaderSection from "./HeaderSection";

const reviews = [
  {
    name: "Aarav Patel",
    role: "Forex Trader, Mumbai",
    feedback:
      "Before JournalX, I tracked trades in Excel — it was messy and time-consuming. With JournalX, I can clearly see my mistakes, log emotions, and review patterns that actually improved my consistency. My discipline and clarity have never been better.",
    icon: <TrendingUp size={28} />,
  },
  {
    name: "Sophia Chen",
    role: "Crypto Swing Trader, Singapore",
    feedback:
      "Journaling trades across exchanges was overwhelming. JournalX keeps everything organized, clean, and easy to review. I became much more aware of my over-trading habits and now take fewer but higher-quality trades.",
    icon: <BarChart3 size={28} />,
  },
  {
    name: "David Martinez",
    role: "Futures & Indices Trader, USA",
    feedback:
      "Spreadsheets gave me zero clarity about performance. JournalX helps me track R:R, my emotions, and setups in a visual, structured way. My risk management improved significantly and my drawdowns reduced because I can finally see what’s working.",
    icon: <ShieldCheck size={28} />,
  },
];

export default function ReviewsSection() {
  return (
    <section
      id="reviews"
      className="reviews_section landingBody flexClm gap_32 flex_center"
      itemScope
      itemType="https://schema.org/Product"
    >
      <meta
        itemProp="name"
        content="JournalX – Journal trades and increase profitability"
      />
      <meta
        itemProp="description"
        content="Read how traders improved profitability, consistency, and emotional control using JournalX – best trading journal at JournalX.app."
      />
      <meta itemProp="brand" content="JournalX.app" />

      <HeaderSection
        title="Trusted by Traders Worldwide"
        subtitle="See how JournalX transformed trading journeys across markets"
      />

      <motion.div
        className="reviews_grid"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ staggerChildren: 0.2 }}
      >
        {reviews.map((rev, i) => (
          <motion.article
            key={i}
            className="review_card flexClm flexRow_stretch"
            itemProp="review"
            itemScope
            itemType="https://schema.org/Review"
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="review_icon">{rev.icon}</div>
            <p className="review_text" itemProp="reviewBody">
              “{rev.feedback}”
            </p>
            <div className="flexClm gap_12">
              <div className="flexClm">
                <strong itemProp="author" className="font_16">
                  {rev.name}
                </strong>
                <span className="font_12 shade_50">{rev.role}</span>
              </div>
              <div className="review_stars">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={10} fill="var(--primary)" stroke="none" />
                ))}
              </div>
            </div>
          </motion.article>
        ))}
      </motion.div>

      <motion.p
        className="font_14 shade_50 center_txt"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Join thousands of traders already journaling smarter with{" "}
        <strong>JournalX.app</strong> — not spreadsheets.
      </motion.p>
    </section>
  );
}
