"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import SectionHeader from "./SectionHeader";

const guideSteps = [
  {
    title: "Create Your Journal",
    description:
      "Maintain trades from different markets like Forex, Stocks, Crypto, etc., organized in one place.",
    image: "/assets/multiple_journal.svg",
  },
  {
    title: "Log Trades",
    description:
      "Easily log your trades with all details to track performance and analyze trends.",
    image: "/assets/log_entries.svg",
  },
  {
    title: "Get Analysis",
    description:
      "Receive insights and analysis based on your trading activity to make informed decisions.",
    image: "/assets/many_more2.svg",
  },
];

const BeginnerGuide = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Preload images
  useEffect(() => {
    const preloadImages = async () => {
      const promises = guideSteps.map(
        (step) =>
          new Promise((resolve) => {
            const img = new Image();
            img.src = step.image;
            img.onload = resolve;
            img.onerror = resolve;
          }),
      );
      await Promise.all(promises);
      setImagesLoaded(true);
    };
    preloadImages();
  }, []);

  const handleNext = () => {
    if (step < guideSteps.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      onClose?.();
    }
  };

  const handlePrevious = () => {
    if (step > 0) setStep((prev) => prev - 1);
  };

  const handleSkip = () => {
    onClose?.();
  };

  const current = guideSteps[step];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "var(--white)",
        zIndex: 1000,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header with Close Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px",
          borderBottom: "1px solid var(--border-color, #334155)",
        }}
      >
        <button onClick={handleSkip} className="btn">
          Skip tour
        </button>

        <div
          style={{
            display: "flex",
            gap: "4px",
            background: "var(--black)",
            padding: "4px 12px",
            borderRadius: "20px",
          }}
        >
          <span style={{ color: "var(--primary, #a77d02)", fontWeight: 600 }}>
            {step + 1}
          </span>
          <span style={{ color: "var(--text-secondary, #94a3b8)" }}>
            / {guideSteps.length}
          </span>
        </div>

        <button
          onClick={handleSkip}
          style={{
            background: "var(--black)",
            border: "none",
            color: "var(--white)",
            cursor: "pointer",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "24px",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        {/* Image Section */}
        <div
          style={{
            height: "350px",
            marginBottom: "40px",
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "12px",
            background: "black",
          }}
        >
          {imagesLoaded ? (
            <img
              key={current.image}
              src={current.image}
              alt={current.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                boxShadow: "1px 1px 12px var(--black-50)",
                animation: "fadeIn 0.3s ease",
                borderRadius: "12px",
              }}
            />
          ) : (
            <div
              style={{
                width: "48px",
                height: "48px",
                border: "3px solid var(--border-color, #334155)",
                borderTopColor: "var(--primary, #a77d02)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          )}
        </div>

        {/* Content Section */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--primary, #a77d02)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "12px",
              display: "block",
            }}
          >
            Step {step + 1}
          </span>

          <h2 className="font_24" style={{ margin: "0" }}>
            {" "}
            {current.title}
          </h2>

          <p
            className="font_16"
            style={{ color: "var(--black-50)", margin: "0" }}
          >
            {current.description}
          </p>
        </div>

        {/* Progress Dots */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            marginBottom: "40px",
          }}
        >
          {guideSteps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              style={{
                width: idx === step ? "32px" : "10px",
                height: "10px",
                borderRadius: idx === step ? "20px" : "50%",
                background:
                  idx === step
                    ? "var(--primary, #a77d02)"
                    : "var(--border-color, #334155)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            width: "100%",
          }}
        >
          <button
            onClick={handlePrevious}
            disabled={step === 0}
            className="primary-btn secondary-btn width100 flexRow flex_center"
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          <button
            onClick={handleNext}
            className="primary-btn width100 flexRow flex_center"
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.02)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {step === guideSteps.length - 1 ? "Finish" : "Next"}
            {step !== guideSteps.length - 1 && <ChevronRight size={18} />}
          </button>
        </div>

        {/* Skip link for mobile */}
        <button
          onClick={handleSkip}
          style={{
            marginTop: "24px",
            background: "none",
            border: "none",
            color: "var(--text-secondary, #94a3b8)",
            fontSize: "14px",
            textDecoration: "underline",
            cursor: "pointer",
            display: "none", // Hide on desktop, show on mobile via media query
          }}
          className="mobile-skip"
        />
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 640px) {
          .mobile-skip {
            display: block;
          }
        }
      `}</style>
    </div>
  );
};

export default BeginnerGuide;
