"use client";

import React, { useState } from "react";
import SectionHeader from "./SectionHeader";

const guideSteps = [
  {
    title: "Create Your Journal",
    description:
      "Maintain trades from different markets like Forex, Stocks, Crypto, etc., organized in one place.",
    image:
      "https://cdn.journalx.app/trades/close-images/1761478467537-Frame_588-4.png",
  },
  {
    title: "Log Trades",
    description:
      "Easily log your trades with all details to track performance and analyze trends.",
    image:
      "https://cdn.journalx.app/trades/open-images/1761478464677-Frame_588-3.png",
  },
  {
    title: "Get Analysis",
    description:
      "Receive insights and analysis based on your trading activity to make informed decisions.",
    image:
      "https://cdn.journalx.app/trades/open-images/1761478613157-Group_19-3.png",
  },
];

const BeginnerGuide = ({ onClose }) => {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < guideSteps.length - 1) setStep(step + 1);
    else onClose?.();
  };

  const handlePrevious = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    onClose?.();
  };

  const current = guideSteps[step];

  return (
    <div className="cm-backdrop">
      <div
        className="bg_blur_40 flexClm gap_32 pad_16 chart_boxBg flex_center beginnerGuideContainer"
        style={{
          position: "fixed",
          bottom: "32px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          borderRadius: "16px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          minWidth: "260px",
          maxWidth: "650px",
          width: "85%",
          textAlign: "center",
        }}
      >
        <span className="font_12" style={{ color: "var(--primary)" }}>
          How to journal trades?
        </span>

        {/* Section 2: Content */}
        <div className="guideContent flexClm gap_16">
          <SectionHeader
            title={current.title}
            description={current.description}
            level={2}
          />
        </div>

        {/* Section 1: Image */}
        <div className="guideImageContainer flex_center">
          <img
            src={current.image}
            alt={current.title}
            className="guideImageShake"
          />
          <div className="guideImageShadow" />
        </div>

        {/* Section 3: Progress Dots */}
        <div className="flexRow flex_center gap_8">
          {guideSteps.map((_, idx) => (
            <span
              key={idx}
              className={`progressDot ${idx === step ? "active" : ""}`}
              onClick={() => setStep(idx)}
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: idx === step ? "var(--primary)" : "var(--white-20)",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flexRow flexRow_stretch gap_16 width100">
          <button
            className="button_sec width100"
            onClick={handlePrevious}
            disabled={step === 0}
          >
            Previous
          </button>

          <button
            className="shade_50 width100"
            onClick={handleSkip}
            style={{
              color: "var(--base-text)",
              background: "none",
              border: "none",
            }}
          >
            Skip
          </button>

          <button
            className="button_pri width100"
            onClick={handleNext}
            aria-label={step === guideSteps.length - 1 ? "Finish" : "Next"}
          >
            {step === guideSteps.length - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BeginnerGuide;
