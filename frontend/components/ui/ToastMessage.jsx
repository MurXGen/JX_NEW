"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import confetti from "canvas-confetti";

const ToastMessage = ({ type = "success", message = "", duration = 3000 }) => {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (message) {
      setVisible(true);

      if (type === "success") {
        setTimeout(() => {
          confetti({
            particleCount: 2,
            spread: 80,
            origin: { y: 0.3 },
          });
        }, 100);
      }

      if (type === "error") {
        const audio = new Audio("/assets/faaaa.mp3");
        audio.play().catch(() => {});
      }

      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message, duration, type]);

  if (!mounted || !visible) return null;

  const iconColor = type === "success" ? "#22C55E" : "#EF4444";

  const toast = (
    <div className={`toastMessage ${type} flexRow gap_12`}>
      {type === "success" ? (
        <CheckCircle size={20} style={{ color: iconColor }} />
      ) : (
        <XCircle size={20} style={{ color: iconColor }} />
      )}
      <span>{message}</span>
    </div>
  );

  return createPortal(toast, document.body);
};

export default ToastMessage;
