"use client";

import { motion, useAnimation, AnimatePresence } from "framer-motion";
import {
  Check,
  Sparkles,
  PartyPopper,
  Zap,
  Star,
  Rocket,
  Heart,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";

export default function WelcomeModal({ onClose, userName = "Trader" }) {
  const router = useRouter();
  const controls = useAnimation();
  const textControls = useAnimation();
  const [currentStep, setCurrentStep] = useState(0);
  const [showElements, setShowElements] = useState(false);

  const celebrationMessages = [
    "Welcome back, champion! 🏆",
    "Ready to crush the markets? 💪",
    "Your trading journey continues! 🚀",
    "Let's make today profitable! 📈",
    "Success awaits! 🎯",
  ];

  useEffect(() => {
    const sequence = async () => {
      // Initial entrance
      await controls.start({
        scale: 1,
        rotate: 0,
        transition: { type: "spring", stiffness: 120, damping: 12 },
      });

      // Step 1: Welcome text animation
      setCurrentStep(1);
      await textControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.6 },
      });

      // Step 2: Celebration elements
      setCurrentStep(2);
      setShowElements(true);

      // Step 3: Confetti explosion
      setCurrentStep(3);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 🔹 Confetti burst 1
      confetti({
        particleCount: 10,
        spread: 100,
        origin: { y: 0.3 },
        colors: ["#a77d02", "#22c55e", "#fdda70", "#ffffff"],
      });
      bringConfettiToFront(); // ✅ Ensure confetti stays on top

      await new Promise((resolve) => setTimeout(resolve, 300));

      // 🔹 Confetti burst 2 (left)
      confetti({
        particleCount: 10,
        angle: 60,
        spread: 80,
        origin: { x: 0, y: 0.3 },
        colors: ["#a77d02", "#22c55e"],
      });
      bringConfettiToFront();

      // 🔹 Confetti burst 3 (right)
      confetti({
        particleCount: 10,
        angle: 120,
        spread: 80,
        origin: { x: 1, y: 0.3 },
        colors: ["#a77d02", "#22c55e"],
      });
      bringConfettiToFront();

      // Step 4: Final celebration
      setCurrentStep(4);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Auto redirect after full celebration
      setTimeout(() => {
        if (onClose) onClose();
        router.push("/dashboard");
      }, 4000);
    };

    // ✅ Helper: Move confetti canvas to top
    const bringConfettiToFront = () => {
      const confettiCanvas = document.querySelector("canvas");
      if (confettiCanvas) {
        confettiCanvas.style.position = "fixed";
        confettiCanvas.style.top = "0";
        confettiCanvas.style.left = "0";
        confettiCanvas.style.pointerEvents = "none";
        confettiCanvas.style.zIndex = "99999"; // 🔥 Topmost layer
      }
    };

    sequence();
  }, [controls, textControls, onClose, router]);

  const handleProceed = () => {
    // One final mini celebration when user clicks
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#a77d02", "#22c55e"],
    });

    setTimeout(() => {
      if (onClose) onClose();
      router.push("/dashboard");
    }, 300);
  };

  const getCurrentMessage = () => {
    return celebrationMessages[
      Math.min(currentStep - 1, celebrationMessages.length - 1)
    ];
  };

  return (
    <div className="cm-backdrop">
      {/* Animated Background Particles */}
      <div className="floating-particles">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="floating-particle"
            initial={{
              opacity: 0,
              scale: 0,
              x: Math.random() * 100 - 50,
              y: Math.random() * 100 - 50,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              rotate: [0, 180, 360],
              x: Math.random() * 200 - 100,
              y: Math.random() * 200 - 100,
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      <motion.div
        className="chart_boxBg flexClm gap_32 flex_center"
        style={{
          padding: "24px",
          minWidth: "300px",
          maxWidth: "600px",
          width: "100%",
          margin: "50px",
        }}
        initial={{ scale: 0, rotate: -180 }}
        animate={controls}
      >
        {/* Main Celebration Circle */}
        <div className="celebration-center">
          <motion.div
            className="glowing-orbit outer"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="glowing-orbit middle"
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />

          <motion.div
            className="success-circle"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          >
            <div className="check-background">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  delay: 0.5,
                }}
              >
                <Check size={48} className="check-icon" />
              </motion.div>
            </div>
          </motion.div>

          {/* Floating Celebration Icons */}
          <AnimatePresence>
            {showElements && (
              <>
                <motion.div
                  className="floating-icon rocket"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    y: [-20, 20, -20],
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: 0.2,
                  }}
                >
                  <Rocket size={24} />
                </motion.div>

                <motion.div
                  className="floating-icon trophy"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    y: [20, -20, 20],
                    rotate: [0, -15, 15, 0],
                  }}
                  transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    delay: 0.4,
                  }}
                >
                  <Trophy size={20} />
                </motion.div>

                <motion.div
                  className="floating-icon star"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    y: [-15, 15, -15],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    delay: 0.6,
                  }}
                >
                  <Star size={18} />
                </motion.div>

                <motion.div
                  className="floating-icon heart"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    y: [15, -15, 15],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 3.2,
                    repeat: Infinity,
                    delay: 0.8,
                  }}
                >
                  <Heart size={16} />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Animated Text Content */}
        <motion.div
          className="welcome-content"
          initial={{ opacity: 0, y: 30 }}
          animate={textControls}
        >
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flexClm gap_4"
          >
            <span className="font_20 font_weight_700">
              {getCurrentMessage()}
            </span>
            <span className="font_14 shade_50">
              {currentStep >= 3 ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Your trading journal is ready! 📊
                </motion.span>
              ) : (
                "Great to see you again!"
              )}
            </span>
          </motion.div>

          {/* Progress Dots */}
          <div className="progress-dots">
            {[1, 2, 3, 4].map((step) => (
              <motion.div
                key={step}
                className={`progress-dot ${
                  currentStep >= step ? "active" : ""
                }`}
                animate={{
                  scale: currentStep === step ? 1.2 : 1,
                  backgroundColor:
                    currentStep >= step ? "var(--primary)" : "var(--white-20)",
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        </motion.div>

        {/* Action Button */}
        <motion.button
          className="button_pri flexRow gap_8 flex_center"
          onClick={handleProceed}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: currentStep >= 2 ? 1 : 0,
            scale: currentStep >= 2 ? 1 : 0.8,
          }}
          whileHover={{
            scale: 1.05,
            boxShadow: "0 8px 30px rgba(167, 125, 2, 0.4)",
          }}
          whileTap={{ scale: 0.95 }}
        >
          <span>Start journaling</span>
          <ArrowRight size={18} />
        </motion.button>

        {/* Celebration Emojis */}
        <AnimatePresence>
          {currentStep >= 3 && (
            <div className="celebration-emojis">
              {["🎯", "📈", "💎", "🔥", "⭐"].map((emoji, index) => (
                <motion.span
                  key={emoji}
                  className="celebration-emoji"
                  initial={{ opacity: 0, scale: 0, y: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    y: [0, -80, -160],
                    x: Math.random() * 100 - 50,
                  }}
                  transition={{
                    duration: 2,
                    delay: index * 0.2,
                    ease: "easeOut",
                  }}
                >
                  {emoji}
                </motion.span>
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
