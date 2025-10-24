"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";

const JournalXCTA = () => {
  const features = [
    "Turn your trades into powerful insights 📈",
    "Track performance and refine your strategy 🧠",
    "Get personalized analytics & growth metrics 🔍",
    "Journal smarter. Trade better. Join JournalX 🚀",
  ];

  const [index, setIndex] = useState(0);

  // Rotate text every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <div
      className="chart_boxBg pad_16 flexRow "
      style={{
        position: "fixed",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        borderRadius: "16px",
        backdropFilter: "blur(8px)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        flexWrap: "wrap",
        gap: "12px",
        minWidth: "260px",
        maxWidth: "350px",
        width: "90%",
        textAlign: "center",
      }}
    >
      {/* Animated Text */}
      <div
        className="font_14 flexClm flex_center"
        style={{
          overflow: "hidden",
          minHeight: "22px",
          flex: "1 1 auto",
          whiteSpace: "normal",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="shade_50"
            style={{
              display: "inline-block",
              lineHeight: "1.4",
              textAlign: "left",
            }}
          >
            {features[index]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* CTA Button */}
      <button
        className="button_pri flexRow flex_center gap_8"
        style={{
          padding: "8px 16px",
          borderRadius: "12px",
          fontWeight: "600",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
        onClick={() => window.open("https://journalx.app/", "_blank")}
      >
        Join JournalX
        <ArrowRight size={16} />
      </button>
    </div>
  );
};

export default JournalXCTA;
