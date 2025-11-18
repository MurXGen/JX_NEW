"use client";

import { ArrowRight, Star } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/router";
import React from "react";

const HeroSection = () => {
  const router = useRouter();

  return (
    <section className="hero flexClm flex_center">
      {/* Background Image (ONLY priority image) */}
      <Image
        src="/assets/hero_bg.svg"
        alt="Trading analytics dashboard background"
        width={1200}
        height={1000}
        className="heroBg"
        priority
      />

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

        {/* Trust Indicator */}
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

      {/* Hero Image Section */}
      <div className="heroImageSec">
        <div className="shootingLine">
          <div className="shootingGlow"></div>
        </div>

        {/* Automatically picks mobile or desktop image */}
        <picture>
          <source
            srcSet="/assets/hero_mob_image.svg"
            media="(max-width: 768px)"
          />
          <Image
            src="/assets/hero_image.svg"
            alt="Trading analytics dashboard"
            width={1200}
            height={600}
            className="heroImage"
          />
        </picture>
      </div>
    </section>
  );
};

export default HeroSection;
