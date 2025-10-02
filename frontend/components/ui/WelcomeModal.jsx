"use client";

import { motion, useAnimation } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti"; // npm install canvas-confetti

export default function WelcomeModal({ username, onClose }) {
  const router = useRouter();
  const controls = useAnimation();
  const [showConfetti, setShowConfetti] = useState(false);

  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // Animate circle stroke from 0 to full over 10s
    controls.start({
      strokeDashoffset: 0,
      transition: { duration: 3, ease: "linear" },
    });

    // Trigger confetti after 10s
    const confettiTimer = setTimeout(() => {
      setShowConfetti(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.5 },
      });
    }, 3000);

    // Auto redirect after 11s
    const redirectTimer = setTimeout(() => {
      if (onClose) onClose();
      router.push("/");
    }, 4000);

    return () => {
      clearTimeout(confettiTimer);
      clearTimeout(redirectTimer);
    };
  }, [controls, onClose, router]);

  const handleProceed = () => {
    if (onClose) onClose();
    router.push("/");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Poppins",
        zIndex: 9999,
      }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 12 }}
        style={{
          background: "#222222",
          padding: "32px",
          borderRadius: "16px",
          minWidth: "300px",
          maxWidth: "500px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* Rotating Circle with Tick */}
        <div style={{ position: "relative", width: 120, height: 120 }}>
          <svg width={120} height={120}>
            <circle
              cx={60}
              cy={60}
              r={radius}
              stroke="#555"
              strokeWidth={6}
              fill="none"
            />
            <motion.circle
              cx={60}
              cy={60}
              r={radius}
              stroke="var(--success)"
              strokeWidth={6}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference}
              strokeLinecap="round"
              animate={controls}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <Check size={60} color="var(--success)" />
          </div>
        </div>

        {showConfetti && <div id="confetti"></div>}

        <div style={{ textAlign: "center" }}>
          <span className="font_16">Hey, welcome back!</span>
          <div className="font_24">{username}</div>
        </div>

        <button onClick={handleProceed} className="button_sec width100">
          Yes, thanks, proceed
        </button>
      </motion.div>
    </div>
  );
}
