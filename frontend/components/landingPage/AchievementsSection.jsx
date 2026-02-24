"use client";

import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 54000, suffix: "+", label: "Trades Logged", prefix: "" },
  { value: 20000, suffix: "+", label: "Traders worldwide", prefix: "" },
  { value: 10, suffix: "s", label: "Log in seconds", prefix: "<" },
  { value: 80, suffix: "+", label: "Countries supported", prefix: "" },
];

function Counter({ value }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 60,
    damping: 20,
  });

  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  useEffect(() => {
    return spring.on("change", (latest) => {
      setDisplayValue(Math.floor(latest));
    });
  }, [spring]);

  return <span ref={ref}>{displayValue.toLocaleString()}</span>;
}

export default function AchievementsSection() {
  return (
    <section className="achievementsSection" style={{ marginTop: "100px" }}>
      {stats.map((stat, index) => (
        <div key={index} className="achievementCard ">
          <p className="achievementLabel">{stat.label}</p>
          <h2 className="achievementNumber shinyText">
            {stat.prefix}
            <Counter value={stat.value} />
            {stat.suffix}
          </h2>
        </div>
      ))}
    </section>
  );
}
