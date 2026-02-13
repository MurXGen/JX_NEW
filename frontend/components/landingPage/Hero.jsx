"use client";

import { ArrowRight, Star } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const HeroSection = () => {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  // Track image load state
  const [bgLoaded, setBgLoaded] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);

  const words = ["winning", "refining", "journaling", "improving"];

  const [index, setIndex] = useState(0);

  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "center center"],
  });

  // Rotate from slanted → flat
  const rotateX = useTransform(scrollYProgress, [0, 1], [12, 0]);
  const rotateY = useTransform(scrollYProgress, [0, 1], [-10, 0]);
  const rotateZ = useTransform(scrollYProgress, [0, 1], [-4, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Detect mobile device
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkScreen = () => setIsMobile(window.innerWidth <= 768);
      checkScreen();
      window.addEventListener("resize", checkScreen);
      return () => window.removeEventListener("resize", checkScreen);
    }
  }, []);

  return (
    <>
      <div className="hero-bg-layer"></div>
      <section className="hero-bg flexClm flex_center">
        <div
          className="chart_boxBg font_12 flexRow flex_center gap_12"
          style={{ padding: "4px 16px", cursor: "pointer" }}
          onClick={() => {
            window.location.href = `https://journalx.app/login`;
          }}
        >
          <span>Journalx 2.0 released</span>
          <ArrowRight size={12} className="vector" />
        </div>
        {/* Hero Text */}
        <div
          className="flexClm gap_46 flex_center heroContent"
          style={{ minWidth: "400px", maxWidth: "1200px" }}
        >
          <div className="flexClm gap_12 flex_center">
            <h1
              className="marg_0 font_52"
              style={{
                lineHeight: "1.125",
                letterSpacing: "0.64px",
                textAlign: "center",
              }}
            >
              Stop guessing.
              <br />
              Start{" "}
              <span className="wordWrapper">
                <span key={index} className="animatedWord">
                  {words[index]}
                </span>
              </span>{" "}
              smarter.
            </h1>

            <p
              className="marg_0 font_16 shade_50"
              style={{
                width: "80%",
                lineHeight: "1.375",
                letterSpacing: "-0.4px",
                marginTop: "12px",
                textAlign: "center",
              }}
            >
              Log in 10 seconds. Analyze in minutes. Trade with clarity.
            </p>
          </div>

          <div className="flexRow gap_12 flex_center">
            <button
              className="cta_button flexRow gap_4"
              onClick={() => {
                window.location.href = `https://journalx.app/login`;
              }}
            >
              Start 7-Day Pro — It’s Free
            </button>
            {/* <button
              className="cta_button_sec flexRow gap_4"
              onClick={() => {
                window.location.href = `https://journalx.app/login`;
              }}
            >
              Sample journal
            </button> */}
          </div>

          <div className="flexRow flex_center gap_8 trust_badge">
            <Star
              size={16}
              strokeWidth={2}
              className="trust_star"
              style={{
                color: "var(--primary-light)",
                filter: "drop-shadow(0 0 6px var(--primary-light))",
              }}
            />
            <span className="font_12 shade_50">
              Trusted and journaled by traders across markets
            </span>
          </div>
        </div>

        {/* Hero Image with fade-in */}
        <motion.div
          ref={ref}
          style={{
            rotateX,
            rotateY,
            rotateZ,
            scale,
            opacity: heroLoaded ? 1 : 0,
          }}
          transition={{ duration: 1.2 }}
          className="heroImageSec"
        >
          <div className="shootingLine">
            <div className="shootingGlow"></div>
          </div>

          {isMobile ? (
            <Image
              src="/assets/hero_mob_bg.png"
              alt="Trading analytics dashboard mobile"
              width={800}
              height={600}
              className="heroImage"
              priority={false}
              onLoadingComplete={() => setHeroLoaded(true)}
            />
          ) : (
            <Image
              src="/assets/hero_image.svg"
              alt="Trading analytics dashboard"
              width={1200}
              height={600}
              className="heroImage"
              priority={false}
              onLoadingComplete={() => setHeroLoaded(true)}
            />
          )}
        </motion.div>
      </section>
    </>
  );
};

export default HeroSection;
