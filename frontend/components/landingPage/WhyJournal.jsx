"use client";
import React from "react";
import { motion } from "framer-motion";
import HeaderSection from "./HeaderSection";

const reasons = [
  {
    title: "Know What’s Right & Wrong",
    description:
      "Identify mistakes instantly and reinforce winning behaviors through structured trade review.",
    image: "/assets/reason-1.png",
  },
  {
    title: "Understand Trading Patterns",
    description:
      "Discover recurring setups and eliminate strategies that silently drain your capital.",
    image: "/assets/reason-2.png",
  },
  {
    title: "Take Better Future Decisions",
    description:
      "Turn past data into future confidence with objective performance insights.",
    image: "/assets/reason-3.png",
  },
  {
    title: "Track & Analyze Trades",
    description:
      "Maintain complete visibility over entries, exits, risk, and consistency.",
    image: "/assets/reason-4.png",
  },
  {
    title: "Control Trading Emotions",
    description:
      "Reduce impulsive decisions and build a disciplined trading mindset.",
    image: "/assets/reason-5.png",
  },
];

const WhyJournalSection = () => {
  return (
    <section className="flexClm mrgin_tp_100 landingBody gap_40">
      <HeaderSection
        title="Why Journal Your Trades?"
        subtitle="5 powerful reasons every serious trader needs it"
      />

      <div className="bento-grid">
        {reasons.map((reason, index) => (
          <motion.div
            key={index}
            className="bento-card"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true }}
          >
            {/* Top Left Content */}
            <div className="bento-content">
              <h3 className="font_18 font_weight_600">{reason.title}</h3>
              <p className="font_14 shade_60">{reason.description}</p>
            </div>

            {/* Bottom Right Image */}
            <div className="bento-image">
              <img src={reason.image} alt={reason.title} />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default WhyJournalSection;
