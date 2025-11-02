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
      if (e.shiftKey && e.key === "ArrowRight") {
        nextStep();
      } else if (e.shiftKey && e.key === "ArrowLeft") {
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [step]);

  const progressRef = useRef(null);
  const sliderDotRef = useRef(null);

  const startDrag = (e) => {
    const progress = progressRef.current;

    const onMove = (moveEvent) => {
      const rect = progress.getBoundingClientRect();
      let pos = moveEvent.clientX - rect.left;
      pos = Math.max(0, Math.min(rect.width, pos));
      const newStep = Math.round((pos / rect.width) * (grids.length - 1));
      setStep(newStep);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div className="flexClm gap_24 stepWizard">
      {/* Progress bar */}
      {/* <div className="stepperProgress">
        <div
          className="stepperProgressBar"
          style={{ width: `${((step + 1) / grids.length) * 100}%` }}
        />
      </div> */}
      {/* <div className="stepperSliderWrapper stepWizard">
        <div
          className="stepperProgress"
          onMouseDown={(e) => startDrag(e)}
          ref={progressRef}
        >
          <div
            className="stepperProgressBar"
            style={{
              width:
                grids.length > 1
                  ? `${(step / (grids.length - 1)) * 100}%`
                  : "100%",
            }}
          />

          <div
            className="stepperSliderDot"
            style={{
              left:
                grids.length > 1
                  ? `${(step / (grids.length - 1)) * 100}%`
                  : "0%",
            }}
            ref={sliderDotRef}
          />
        </div>
      </div> */}

      {/* Stepper scrollable & center active */}
      {/* <div className="stepper-scroll-wrapper removeScollbar" ref={stepperRef}>
        <div className="stepperContainer">
          {grids.map((g, index) => (
            <div
              key={g.key}
              data-step={index}
              className={`stepperItem ${index === step ? "active" : ""}`}
              onClick={() => setStep(index)}
            >
              <div className="stepperDot">{index + 1}</div>
              <span className="stepperLabel">
                {g.key.charAt(0).toUpperCase() + g.key.slice(1)}
              </span>
            </div>
          ))}
        </div>
 
        <div
          className="stepNavigation flexClm flexRow_stretch flex_center gap_12"
          style={{}}
        >
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
      </div> */}

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
