"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

const ToastMessage = ({ type = "success", message = "", duration = 3000 }) => {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (message) {
      setVisible(true);
      setProgress(0);

      const interval = 10; // update every 10ms
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
  }, [message, duration]);

  if (!visible) return null;

  const iconColor = type === "success" ? "#22C55E" : "#EF4444";

  return (
    <>
      {/* Full-screen blue overlay */}
      <div className="cm-backdrop" />

      {/* Toast message */}
      <div
        className={`popups_top ${type} flexRow gap_12`}
        // style={{ position: "relative", overflow: "hidden" }}
      >
        {type === "success" ? (
          <CheckCircle
            className="icon"
            size={20}
            style={{ color: iconColor }}
          />
        ) : (
          <XCircle className="icon" size={20} style={{ color: iconColor }} />
        )}
        <span className="text">{message}</span>

        {/* Progress bar at the bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: "4px",
            backgroundColor: iconColor,
            width: `${progress}%`,
            transition: "width 0.1s linear",
          }}
        />
      </div>
    </>
  );
};

export default ToastMessage;
