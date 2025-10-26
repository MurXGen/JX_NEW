"use client";

import React from "react";
import {
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BookCheck,
} from "lucide-react";

const iconVariants = {
  info: BookCheck,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

/**
 * Reusable message card for displaying info, warnings, or success states
 *
 * @param {string} type - "info" | "success" | "warning" | "error"
 * @param {string} title - Main header text
 * @param {string} description - Optional subtext (shown in brackets)
 * @param {JSX.Element} customIcon - Optional custom Lucide icon
 * @param {string} className - Optional extra CSS classes
 */
const MessageCard = ({
  type = "info",
  title,
  description,
  customIcon,
  className = "",
}) => {
  const Icon = customIcon || iconVariants[type] || Info;

  const colors = {
    info: "var(--info-color, #2196f3)",
    success: "var(--success-color, #4caf50)",
    warning: "var(--warning-color, #ff9800)",
    error: "var(--error-color, #f44336)",
  };

  return (
    <div className={`flexRow gap_12 pad_12 radius_12 boxBg`}>
      <Icon size={22} color={colors[type]} />
      <div className="flexClm">
        <h4 className="font_12 marg_0">{title}</h4>
        {description && (
          <p className="font_12 shade_50 marg_0">({description})</p>
        )}
      </div>
    </div>
  );
};

export default MessageCard;
