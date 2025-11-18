"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import HeaderSection from "./HeaderSection";

const features = [
  {
    title: "Free to Use — No Barriers",
    description:
      "Get started instantly and experience the power of trading insights without spending a dime. Build habits that improve your results from day one.",
    image: "/assets/free_use.svg",
  },
  {
    title: "Unlimited Logs, Effortless Flow",
    description:
      "Journal every trade in seconds — no limits, no clutter. Stay consistent, stay in control, and let JournalX do the heavy lifting.",
    image: "/assets/easy_smooth.svg",
  },
  {
    title: "Advanced Chart Analytics",
    description:
      "Transform your trade history into winning insights. Visualize performance trends, emotions, and strategies that drive consistent profitability.",
    image: "/assets/advanced_charts.svg",
  },
];

const ChooseJournalX = () => {
  return (
    <section className="flexClm gap_32 mrgin_tp_100 landingBody">
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
              transition={{ duration: 1.4, ease: [0.25, 0.1, 0.25, 1] }} // smoother, slower easing
              viewport={{ once: true, amount: 0.3 }}
            >
              {/* Text Section */}
              <motion.div
                className="choose_text flexClm gap_12"
                variants={textVariant}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              >
                <h3 className="font_24 marg_0">{item.title}</h3>
                <p className="font_14 shade_50 marg_0">{item.description}</p>
              </motion.div>

              <motion.div
                className="choose_text_mobile flexClm gap_12"
                variants={textVariant}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              >
                <span className="marg_0 flexClm">
                  <strong
                    className="font_20 marg_0"
                    style={{ paddingRight: "4px" }}
                  >
                    {item.title}
                  </strong>
                  <span className="font_14 shade_50">{item.description}</span>
                </span>
              </motion.div>

              {/* Image Section */}
              <motion.div
                className="choose_image"
                variants={imageVariant}
                transition={{ duration: 1.3, ease: "easeInOut" }}
              >
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
