"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import HeaderSection from "./HeaderSection";

const features = [
  {
    title: "Multiple Journal Accounts",
    description:
      "Manage different trading strategies and accounts separately to track performance accurately.",
    image: "/assets/multiple_journal.svg",
  },
  {
    title: "Entries & Exits Timeline",
    description:
      "Review every trade with a structured execution history and clear insights.",
    image: "/assets/log_entries.svg",
  },
  {
    title: "Trade Image Snapshots",
    description:
      "Attach chart screenshots to analyze decisions visually and reduce emotional trading.",
    image: "/assets/snapshots.svg",
  },
  {
    title: "Instant P&L Tracking",
    description: "Get real-time profit and loss summaries after every trade.",
    image: "/assets/log_pnl.svg",
  },
  {
    title: "Calendar Performance View",
    description: "Identify winning and losing trading days at a glance.",
    image: "/assets/calendar_view.svg",
  },
];

const FeatureSlider = () => {
  const [index, setIndex] = useState(0);

  const nextSlide = () => {
    setIndex((prev) => (prev + 1) % features.length);
  };

  const prevSlide = () => {
    setIndex((prev) => (prev - 1 + features.length) % features.length);
  };

  // ✅ Auto slide every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="featureSliderSection">
      <HeaderSection
        title="JournalX Features"
        subtitle="Explore the tools that help traders build discipline and consistency."
        glowLight={false}
      />

      <div className="sliderWrapper">
        {/* Left Arrow */}
        <button className="sliderArrow" onClick={prevSlide}>
          <ChevronLeft size={22} />
        </button>

        {/* Slide Container */}
        <div className="sliderContainer">
          <AnimatePresence mode="wait">
            <motion.article
              key={index}
              className="featureSlide"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.5 }}
            >
              {/* Swipe only content */}
              <motion.div
                className="slideContent"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, info) => {
                  if (info.offset.x < -120) nextSlide();
                  if (info.offset.x > 120) prevSlide();
                }}
              >
                <div className="featureImage">
                  <Image
                    src={features[index].image}
                    alt={features[index].title}
                    width={300}
                    height={300}
                  />
                </div>
                <div className="flexClm ">
                  <h3>{features[index].title}</h3>
                  <p>{features[index].description}</p>
                </div>
              </motion.div>
            </motion.article>
          </AnimatePresence>
        </div>

        {/* Right Arrow */}
        <button className="sliderArrow" onClick={nextSlide}>
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Dots */}
      <div className="sliderDots">
        {features.map((_, i) => (
          <span
            key={i}
            className={`dot ${i === index ? "active" : ""}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
};

export default FeatureSlider;
