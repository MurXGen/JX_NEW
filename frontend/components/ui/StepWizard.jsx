"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

const StepWizard = ({ grids, onFinish }) => {
  const [step, setStep] = useState(0);
  const stepperRef = useRef(null);

  const nextStep = () => {
    if (step < grids.length - 1) setStep(step + 1);
    else onFinish();
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  useEffect(() => {
    if (stepperRef.current) {
      const activeEl = stepperRef.current.querySelector(
        `.stepperItem[data-step="${step}"]`
      );
      if (activeEl) {
        const containerWidth = stepperRef.current.offsetWidth;
        const containerScroll = stepperRef.current.scrollLeft;
        const activeRect = activeEl.getBoundingClientRect();
        const containerRect = stepperRef.current.getBoundingClientRect();

        // Compute the absolute scroll position
        const scrollLeft =
          containerScroll +
          (activeRect.left - containerRect.left) -
          containerWidth / 2 +
          activeRect.width / 2;

        stepperRef.current.scrollTo({
          left: scrollLeft,
          behavior: "smooth",
        });
      }
    }
  }, [step]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") {
        nextStep();
      } else if (e.key === "ArrowLeft") {
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [step]);

  return (
    <div className="flexClm gap_24 stepWizard">
      {/* Progress bar */}
      <div className="stepperProgress">
        <div
          className="stepperProgressBar"
          style={{ width: `${((step + 1) / grids.length) * 100}%` }}
        />
      </div>

      {/* Stepper scrollable & center active */}
      <div className="stepper-scroll-wrapper removeScollbar" ref={stepperRef}>
        <div className="stepperContainer">
          {grids.map((g, index) => (
            <div
              key={g.key}
              data-step={index}
              className={`stepperItem ${index === step ? "active" : ""}`}
              onClick={() => setStep(index)}
            >
              <div className="stepperDot">{index + 1}</div>
              <span className="stepperLabel">{g.key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="step-navigation flexRow flexRow_stretch gap_12">
        {step > 0 && (
          <button
            className="button_ter width100"
            type="button"
            onClick={prevStep}
          >
            <ArrowLeft size={18} />
          </button>
        )}

        {step < grids.length - 1 && (
          <button
            className="button_ter width100"
            type="button"
            onClick={nextStep}
          >
            <ArrowRight size={18} />
          </button>
        )}
      </div>

      {/* Step Content */}
      <div className="stepContainer">
        <AnimatePresence mode="wait">
          <motion.div
            key={grids[step].key}
            className="step-content"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            {grids[step].content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StepWizard;
