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

const features = [
  { title: "Multiple Journal Accounts", icon: Layers },
  { title: "Multiple Entries & Exits Journal", icon: GitBranch },
  { title: "Trade Image Snapshot", icon: ImageIcon },
  { title: "Quick PnL Log", icon: LineChart },
  { title: "Calendar Analysis", icon: Calendar },
  { title: "And Many More...", icon: MoreHorizontal },
];

const FeatureSection = () => {
  return (
    <section className="flexClm landingBody gap_32 mrgin_tp_100">
      <HeaderSection
        title="Feature Overview"
        subtitle="Powerful tools designed to simplify your trading journey"
      />

      <div className="section_grid">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={index}
              className="chart_boxBg flexRow gap_12 pad_32 br_24"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.12 }}
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

              <div>
                <h3 className="font_16 marg_0">{feature.title}</h3>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* CTA */}
      <motion.div
        className="flexCenter"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        viewport={{ once: true }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="button_pri"
        >
          Explore JournalX Features
        </motion.button>
      </motion.div>
    </section>
  );
};

export default FeatureSection;
