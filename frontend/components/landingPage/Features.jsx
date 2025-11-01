"use client";
import React from "react";
import { motion } from "framer-motion";
import {
  Layers,
  GitBranch,
  Image as ImageIcon,
  LineChart,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import HeaderSection from "./HeaderSection";
import { useRouter } from "next/router";

const features = [
  { title: "Multiple Journal Accounts", icon: Layers },
  { title: "Multiple Entries & Exits Journal", icon: GitBranch },
  { title: "Trade Image Snapshot", icon: ImageIcon },
  { title: "Quick PnL Log", icon: LineChart },
  { title: "Calendar Analysis", icon: Calendar },
  { title: "And Many More...", icon: MoreHorizontal },
];

const FeatureSection = () => {
  const router = useRouter();
  return (
    <section className="feature-section">
      <div className="feature-gradient" />
      <HeaderSection
        title="Feature Overview"
        subtitle="Powerful tools designed to simplify your trading journey"
      />

      <div className="feature-grid">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const randomDelay = Math.random() * 0.3 + index * 0.15;

          return (
            <motion.div
              key={index}
              className="chart_boxBg pad_32 gap_24 flexRow featureCard"
              initial={{
                opacity: 0,
                y: 60,
                rotate: Math.random() * 5 - 2.5,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
                rotate: 0,
              }}
              transition={{
                duration: 0.8,
                delay: randomDelay,
                ease: [0.25, 0.1, 0.25, 1],
              }}
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
                <Icon size={14} className="successBg" />
              </motion.div>
              <h3 className="font_16">{feature.title}</h3>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className="feature-cta"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        viewport={{ once: true }}
      >
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="cta-button"
          onClick={() => router.push("/register")}
        >
          Explore JournalX Features
        </motion.button>
      </motion.div>
    </section>
  );
};

export default FeatureSection;
