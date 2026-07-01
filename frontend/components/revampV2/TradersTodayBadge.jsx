"use client";

/* Social-proof / trust badge — "X traders logged today · Y% in profit · Z% in
   loss". Numbers are DUMMY but move like real data: they seed from the time of
   day (so they grow through the day and sit in a believable 1k–2k band) and
   tick up live while the badge is on screen. Reusable on the log modal,
   dashboard, or landing. Swap the seed for real analytics when available. */

import { useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export default function TradersTodayBadge({ style }) {
  const [count, setCount] = useState(1240);
  const [win, setWin] = useState(58);
  const winRef = useRef(58);

  useEffect(() => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    // grows through the day: ~950 at midnight → ~2000 by late evening
    const base = 950 + Math.floor(mins * 0.72) + Math.floor((now.getSeconds() / 60) * 30);
    setCount(base);
    const w0 = Math.round(58 + 3 * Math.sin(mins / 45));
    winRef.current = w0;
    setWin(w0);

    const id = setInterval(() => {
      // live-feeling tick: a few more traders, small win-rate drift
      setCount((c) => c + 1 + Math.floor(Math.random() * 3));
      const next = clamp(winRef.current + (Math.random() < 0.5 ? -1 : 1), 53, 64);
      winRef.current = next;
      setWin(next);
    }, 4200 + Math.random() * 3000);
    return () => clearInterval(id);
  }, []);

  const loss = 100 - win;
  const fmt = (n) => n.toLocaleString();

  return (
    <div
      style={{
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border)",
        background: "var(--color-bg-surface)",
        padding: "var(--space-3)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ position: "relative", display: "inline-flex" }}>
          <Users size={15} style={{ color: "var(--color-success)" }} />
          <span
            style={{
              position: "absolute", top: -2, right: -3, width: 7, height: 7, borderRadius: "50%",
              background: "var(--color-success)", boxShadow: "0 0 0 2px var(--color-bg-surface)",
              animation: "jx-pulse 1.6s ease-in-out infinite",
            }}
          />
        </span>
        <span style={{ font: "var(--text-body-md)", fontWeight: 700 }}>{fmt(count)}</span>
        <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>traders logged today</span>
      </div>

      {/* profit / loss split */}
      <div style={{ display: "flex", height: 7, borderRadius: 999, overflow: "hidden", background: "var(--color-bg-muted)" }}>
        <span style={{ width: `${win}%`, background: "var(--color-success)", transition: "width 0.6s ease" }} />
        <span style={{ width: `${loss}%`, background: "var(--color-danger)", transition: "width 0.6s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", font: "var(--text-caption)" }}>
        <span style={{ color: "var(--color-success)" }}>{win}% in profit</span>
        <span style={{ color: "var(--color-danger)" }}>{loss}% in loss today</span>
      </div>

      <style jsx>{`
        @keyframes jx-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
