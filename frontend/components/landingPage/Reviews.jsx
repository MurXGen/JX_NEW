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
      "Before JournalX, I tracked my trades in Excel — messy and slow. Now I can instantly see where I went wrong, track emotions, and spot patterns that improved my consistency. My monthly PnL has grown 18%.",
    icon: <TrendingUp size={28} />,
  },
  {
    name: "Sophia Chen",
    role: "Crypto Swing Trader, Singapore",
    feedback:
      "I used to lose track of my trades across multiple exchanges. JournalX automatically syncs and organizes everything. The AI insights helped me identify over-trading habits — now I trade less but win more.",
    icon: <BarChart3 size={28} />,
  },
  {
    name: "David Martinez",
    role: "Futures & Indices Trader, USA",
    feedback:
      "Old spreadsheets gave me no clarity on performance or risk. JournalX shows my R:R, emotions, and setups visually. Risk management feels effortless — my drawdowns dropped by 30%.",
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
        content="Read how traders improved profitability, consistency, and emotional control using JournalX – the AI-powered trading journal at JournalX.app."
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
