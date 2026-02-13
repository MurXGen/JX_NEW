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
          1000 + (index + 1) * stepInterval,
        ); // Start after initial delay
      });

      // Show confetti at the end
      setTimeout(() => {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }, totalDuration + 1000);
    }
  }, [inView]);

  return <></>;
};

export default ProfitJourneySection;
