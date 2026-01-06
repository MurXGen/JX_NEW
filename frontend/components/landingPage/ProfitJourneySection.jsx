"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Confetti from "react-confetti";
import { Plus, TrendingUp } from "lucide-react";

const steps = ["Get analysis", "Find mistakes", "Know strategy", "Improve"];

const ProfitJourneySection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const [startAnim, setStartAnim] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);

  // Detect mobile once on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth <= 768);
    }
  }, []);

  useEffect(() => {
    if (inView) {
      setStartAnim(true);

      // Calculate precise timing for each step based on glow position
      const totalDuration = 4000; // 4 seconds total
      const stepInterval = totalDuration / (steps.length + 1); // +1 for start to first step

      steps.forEach((_, index) => {
        setTimeout(
          () => {
            setActiveStep(index);
          },
          1000 + (index + 1) * stepInterval
        ); // Start after initial delay
      });

      // Show confetti at the end
      setTimeout(() => {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }, totalDuration + 1000);
    }
  }, [inView]);

  return (
    <>
      {showConfetti && (
        <Confetti
          width={typeof window !== "undefined" ? window.innerWidth : 300}
          height={typeof window !== "undefined" ? window.innerHeight : 300}
          recycle={false}
          numberOfPieces={100}
          gravity={0.3}
        />
      )}

      <section className="mrgin_tp_100 profitJourneySection" ref={ref}>
        <div className="profitJourneyWrapper">
          {/* START BUTTON */}
          <motion.div
            className="startButton flexRow gap_12 flex_center"
            animate={
              startAnim
                ? {
                    scale: [1, 0.85],
                    boxShadow: [
                      "0 4px 15px rgba(255, 255, 255, 0.5)",
                      "0 2px 5px rgba(255, 255, 255, 1)",
                      "0 1px 1px rgba(0, 0, 0, 1)",
                    ],
                  }
                : {}
            }
            transition={{
              duration: 0.15,
              times: [0, 0.3, 1],
            }}
          >
            Log Trades <Plus size={20} />
          </motion.div>

          {/* LINE CONTAINER */}
          <div
            className={`lineContainer ${isMobile ? "vertical" : "horizontal"}`}
          >
            {/* BACKGROUND LINE - Connected from start to end */}
            <div className="backgroundLine" />

            {/* ANIMATED GLOW */}
            <motion.div
              className="glowLine"
              animate={
                startAnim
                  ? isMobile
                    ? {
                        top: ["-190px", "90px"],
                      }
                    : {
                        left: ["-20%", "120%"],
                      }
                  : {}
              }
              transition={{
                duration: 7,
                ease: "easeInOut",
              }}
            />

            {/* STEPS CONTAINER */}
            <div
              className={`stepsContainer ${
                isMobile ? "vertical" : "horizontal"
              }`}
            >
              {steps.map((step, index) => (
                <div key={index} className="stepWrapper">
                  {/* CONNECTION DOT */}
                  <motion.div
                    className="stepDot"
                    initial={{ backgroundColor: "#6B7280", scale: 1 }}
                    animate={
                      startAnim && activeStep >= index
                        ? {
                            backgroundColor: "#10B981",
                            scale: [1, 1.4, 1.2],
                            boxShadow: [
                              "0 0 0px rgba(16, 185, 129, 0)",
                              "0 0 20px rgba(16, 185, 129, 0.8)",
                              "0 0 10px rgba(16, 185, 129, 0.6)",
                            ],
                          }
                        : {}
                    }
                    transition={{
                      duration: 0.4,
                      delay: 0, // No delay - triggered by activeStep state
                    }}
                  />

                  {/* STEP TEXT */}
                  <motion.span
                    className="stepText"
                    initial={{ opacity: 0.3, color: "#6B7280" }}
                    animate={
                      startAnim && activeStep >= index
                        ? {
                            opacity: 1,
                            color: "#ffffff",
                            textShadow: "0 0 10px rgba(16, 185, 129, 0.8)",
                            y: isMobile ? 0 : [-5, 0],
                            x: isMobile ? [-5, 0] : 0,
                          }
                        : {}
                    }
                    transition={{
                      duration: 0.3,
                      delay: 0, // No delay - triggered by activeStep state
                    }}
                  >
                    {step}
                  </motion.span>
                </div>
              ))}
            </div>
          </div>

          {/* END BUTTON */}
          <motion.div
            className="endButton flexRow gap_12 flex_center"
            animate={
              startAnim
                ? {
                    scale: [0.85, 1],
                    boxShadow: [
                      "0 4px 15px rgba(0,0,0,0.1)",
                      "0 0 30px rgba(34, 197, 94, 0.6)",
                      "0 0px 25px rgba(34, 197, 94, 0.8)",
                    ],
                    backgroundColor: ["#10B981", "#059669", "#10B981"],
                  }
                : {}
            }
            transition={{
              duration: 0.4,
              delay: 5,
              times: [0, 0.5, 1],
            }}
          >
            Get Profitable <TrendingUp size={20} />
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default ProfitJourneySection;
