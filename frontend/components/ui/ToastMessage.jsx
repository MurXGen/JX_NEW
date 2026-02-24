"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

const ToastMessage = ({ type = "success", message = "", duration = 3000 }) => {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (message) {
      setVisible(true);
      setProgress(0);

      // ✅ Small confetti burst for success
      if (type === "success") {
        setTimeout(() => {
          confetti({
            particleCount: 2,
            spread: 80,
            origin: { y: 0.3 },
            colors: ["#22C55E", "#86EFAC", "#4ADE80"],
            disableForReducedMotion: true,
          });
        }, 100); // small delay to ensure toast renders
      }

      const interval = 10;
      const step = (interval / duration) * 250;

      const timer = setInterval(() => {
        setProgress((prev) => {
          const next = prev + step;
          if (next >= 100) {
            clearInterval(timer);
            setVisible(false);
            return 100;
          }
          return next;
        });
      }, interval);

      return () => clearInterval(timer);
    }
  }, [message, duration, type]);

  if (!visible) return null;

  const iconColor = type === "success" ? "#22C55E" : "#EF4444";

  return (
    <div
      className={`toastMessage ${type} flexRow gap_12`}
      style={{ position: "absolute" }}
    >
      {type === "success" ? (
        <CheckCircle className="icon" size={20} style={{ color: iconColor }} />
      ) : (
        <XCircle className="icon" size={20} style={{ color: iconColor }} />
      )}
      <span className="text">{message}</span>

      {/* Progress bar */}
      {/* <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "4px",
          backgroundColor: iconColor,
          width: `${progress}%`,
          transition: "width 0.1s linear",
        }}
      /> */}
    </div>
  );
};

export default ToastMessage;
