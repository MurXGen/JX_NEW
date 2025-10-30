"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import HeaderSection from "./HeaderSection";

const features = [
  {
    title: "Free to use",
    description:
      "Start journaling instantly — no hidden fees, no paywalls. JournalX empowers every trader to track, learn, and grow with low cost barriers.",
    image: "/assets/free_use.svg",
  },
  {
    title: "Unlimited logs, seamless flow",
    description:
      "Log every trade effortlessly. JournalX’s smooth, intuitive design keeps your focus on performance, not paperwork — unlimited trades, unlimited learning.",
    image: "/assets/easy_smooth.svg",
  },
  {
    title: "Advanced chart analytics",
    description:
      "Turn data into decisions. Get intelligent visual insights, win-rate tracking, and strategy patterns — all designed to elevate your trading confidence.",
    image: "/assets/advanced_charts.svg",
  },
];

const ChooseJournalX = () => {
  return (
    <section className="flexClm gap_32">
      <HeaderSection
        title="Why Choose JournalX?"
        subtitle="Powerful, Intuitive, and Made for Every Trader"
      />

      <div className="flexClm gap_32">
        {features.map((item, index) => {
          const isEven = index % 2 === 1;

          // animation variants for large devices
          const textVariant = {
            hidden: { opacity: 0, x: isEven ? 80 : -80 },
            visible: { opacity: 1, x: 0 },
          };

          const imageVariant = {
            hidden: { opacity: 0, x: isEven ? -80 : 80 },
            visible: { opacity: 1, x: 0 },
          };

          return (
            <motion.div
              key={index}
              className={`choose_container ${isEven ? "reverse" : ""} flexRow`}
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 0.8, ease: "easeOut" }}
              viewport={{ once: true, amount: 0.3 }}
            >
              {/* Text Section */}
              <motion.div
                className="choose_text flexClm gap_12"
                variants={textVariant}
              >
                <h3 className="font_24 marg_0">{item.title}</h3>
                <p className="font_16 shade_50 marg_0">{item.description}</p>
              </motion.div>

              {/* Image Section */}
              <motion.div className="choose_image" variants={imageVariant}>
                <Image
                  src={item.image}
                  alt={item.title}
                  width={400}
                  height={300}
                  className="choose_img"
                />
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default ChooseJournalX;
