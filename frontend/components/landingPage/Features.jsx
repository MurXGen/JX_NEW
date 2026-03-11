"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Layers,
  GitBranch,
  Image as ImageIcon,
  LineChart,
  Calendar,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import HeaderSection from "./HeaderSection";

const features = [
  {
    title: "Multiple Journal Accounts",
    desc: "Manage different trading strategies in separate journals.",
    icon: Layers,
    image: "/assets/multiple_journal1.svg",
  },
  {
    title: "Multiple Entries & Exits",
    desc: "Track partial entries and exits with precision.",
    icon: GitBranch,
    image: "/assets/log_entries1.svg",
  },
  {
    title: "Trade Image Snapshot",
    desc: "Attach chart screenshots to every trade.",
    icon: ImageIcon,
    image: "/assets/snapshots.svg",
  },
  {
    title: "Quick PnL Log",
    desc: "Instantly record profits and losses.",
    icon: LineChart,
    image: "/assets/pnl_graph.svg",
  },
  {
    title: "Calendar Analysis",
    desc: "Review performance by day and week.",
    icon: Calendar,
    image: "/assets/calendar_view1.svg",
  },
  {
    title: "And Many More",
    desc: "Advanced tools for serious traders.",
    icon: MoreHorizontal,
    image: "/assets/many_more.svg",
  },
];

export default function FeatureSection() {
  const [index, setIndex] = useState(0);
  const timeoutRef = useRef(null);

  const next = () => setIndex((prev) => (prev + 1) % features.length);
  const prev = () =>
    setIndex((prev) => (prev - 1 + features.length) % features.length);

  // Auto slide every 2s
  useEffect(() => {
    timeoutRef.current = setTimeout(next, 2000);
    return () => clearTimeout(timeoutRef.current);
  }, [index]);

  const activeFeature = features[index];
  const Icon = activeFeature.icon;

  return (
    <section className="feature-section">
      <HeaderSection
        title="Powerful Trading Journal Features"
        subtitle="Tools built to improve discipline, execution, and performance."
        glowLight={false}
      />

      {/* Slider */}
      <div className="feature-slider-wrapper">
        {/* Desktop arrows */}
        <button className="icon-dot left" onClick={prev}>
          <ChevronLeft size={28} />
        </button>

        <div className="feature-slider-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              className="feature-card"
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -80 }}
              transition={{ duration: 0.5 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(e, info) => {
                if (info.offset.x < -100) next();
                if (info.offset.x > 100) prev();
              }}
            >
              <Image
                src={activeFeature.image}
                alt={activeFeature.title}
                width={400}
                height={300}
                className="feature-image"
                priority={false}
              />
              <div className="flexClm flex_center">
                <h3 className="feature-title font_24">{activeFeature.title}</h3>
                <p className="feature-desc font_16 shade_50">
                  {activeFeature.desc}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <button className="icon-dot right" onClick={next}>
          <ChevronRight size={28} />
        </button>
      </div>

      {/* Mobile icon pagination */}
      <div className="mobile-icon-pagination">
        {features.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={i}
              className={`icon-dot ${i === index ? "active" : ""}`}
              onClick={() => setIndex(i)}
            >
              <Icon size={20} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
