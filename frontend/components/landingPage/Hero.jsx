"use client";
import Image from "next/image";
import React from "react";

const HeroSection = () => {
  return (
    <section className="hero flexClm flex_center">
      {/* Background Image */}
      <Image
        src="/assets/hero_bg.svg"
        alt="Trading analytics dashboard background"
        width={1200}
        height={1000}
        className="heroBg"
        priority
      />

      {/* Hero Text */}
      <div className="flexClm gap_12 flex_center">
        <div
          className="flexClm gap_12 flex_center heroContent"
          style={{ minWidth: "400px", maxWidth: "600px" }}
        >
          <h1 className="marg_0 font_52" style={{ lineHeight: "52px" }}>
            Journal trades like
            <br />
            <strong className="vector">never before</strong>
          </h1>
          <p className="marg_0 font_14 shade_50" style={{ width: "300px" }}>
            Track your trades, analyze your performance, and master your
            emotions.
          </p>
        </div>

        <button className="button_pri" style={{ maxWidth: "fit-content" }}>
          Start Journaling
        </button>
      </div>

      {/* Hero Image Section */}
      <div className="heroImageSec">
        <div className="shootingLine">
          <div className="shootingGlow"></div>
        </div>
        <Image
          src="/assets/hero_image.svg"
          alt="Trading analytics dashboard"
          width={1200}
          height={600}
          className="heroImage"
          style={{ borderTop: "1px solid var(--white-20)" }}
          priority
        />
      </div>
    </section>
  );
};

export default HeroSection;
