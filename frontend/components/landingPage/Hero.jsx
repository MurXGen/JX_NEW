"use client";

import { ArrowRight, Star } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const HeroSection = () => {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  // Track image load state
  const [bgLoaded, setBgLoaded] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);

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
        {/* Hero Text */}
        <div
          className="flexClm gap_46 flex_center heroContent"
          style={{ minWidth: "400px", maxWidth: "600px" }}
        >
          <div className="flexClm gap_12 flex_center">
            <h1
              className="marg_0 font_52"
              style={{
                lineHeight: "52px",
                textAlign: "center",
              }}
            >
              Journal trades like
              <br />
              <strong
                className="vector"
                style={{
                  color: "var(--primary-light)",
                  textShadow: "0px 0px 16px var(--primary)",
                }}
              >
                never before
              </strong>
            </h1>

            <p
              className="marg_0 font_16 shade_50"
              style={{
                width: "340px",
                textAlign: "center",
              }}
            >
              Track your trades, analyze your performance, and master your
              emotions.
            </p>
          </div>

          <button
            className="cta_button flexRow gap_4"
            onClick={() => {
              window.location.href = `https://journalx.app/login`;
            }}
          >
            Try it for free
          </button>

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
          initial={{ opacity: 0 }}
          animate={{ opacity: heroLoaded ? 1 : 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
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
