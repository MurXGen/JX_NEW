"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

const ToastMessage = ({ type = "success", message = "", duration = 3000 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message, duration]);

  if (!visible) return null;

  return (
    <div className={`popups_top ${type} flexRow gap_12`}>
      {type === "success" ? (
        <CheckCircle className="icon" size={20} />
      ) : (
        <XCircle className="icon" size={20} />
      )}
      <span className="text">{message}</span>
    </div>
  );
};

export default ToastMessage;
