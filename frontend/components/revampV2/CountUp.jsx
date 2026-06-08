"use client";

import { useEffect, useRef, useState } from "react";
import { jxEase } from "./easing";

/**
 * revampV2 CountUp — animates from 0 on first mount and between value
 * changes afterwards, using the JX cubic-bezier curve (0.16, 1, 0.3, 1).
 *
 *   <CountUp value={netPnl} format={(v) => money(v, "$")} />
 */
export default function CountUp({
  value,
  format = (v) => Math.round(v).toLocaleString(),
  duration = 1.1,
  ease = jxEase,
}) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(0);
  const prev = useRef(null);

  useEffect(() => {
    const from = prev.current == null ? 0 : prev.current; // 0 on load
    prev.current = target;
    if (from === target) {
      setDisplay(target);
      return;
    }
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      setDisplay(from + (target - from) * ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, ease]);

  return <>{format(display)}</>;
}
