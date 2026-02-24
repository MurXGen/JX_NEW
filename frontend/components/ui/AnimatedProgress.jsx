import React, { useEffect, useRef, useState } from "react";

const AnimatedProgress = ({ value, delay = 0 }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(false); // reset
          setTimeout(() => setVisible(true), 60);
        } else {
          setVisible(false); // reset when leaving
        }
      },
      { threshold: 0.4 },
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  const safeValue = Math.min(Math.max(value, 0), 100);

  const getBarClass = () => {
    if (safeValue <= 25) return "bar-danger";
    if (safeValue <= 50) return "bar-warning";
    return "bar-success";
  };

  const getEmoji = () => {
    if (safeValue <= 25) return "🚨"; // Critical
    if (safeValue <= 50) return "⚠️"; // Warning
    return "😄"; // Strong strategy
  };

  return (
    <div className="tag-progress-wrapper" ref={ref}>
      <div className="tag-progress-bar">
        <div
          className={`tag-progress-fill ${getBarClass()} ${
            visible ? "fill-animate" : ""
          }`}
          style={{
            "--target-width": `${safeValue}%`,
            animationDelay: `${delay}s`,
          }}
        >
          <div className="progress-icon">{getEmoji()}</div>
        </div>
      </div>

      <div className="tag-progress-label">{safeValue.toFixed(1)}%</div>
    </div>
  );
};

export default AnimatedProgress;
