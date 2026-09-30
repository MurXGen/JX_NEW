"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * revampV2 Tip, lightweight hover tooltip.
 *
 * content:
 *   - string            → plain (multi-line strings render first line as a
 *                          bold title + the remaining lines below)
 *   - {title, rows}     → structured, styled exactly like the candlestick
 *                          Open/Close/High/Low tooltip (bold title + aligned
 *                          key → value rows)
 *   - any React node    → rendered as-is
 *
 * follow: the bubble tracks the cursor and appears right next to the pointer
 *   instead of anchored to the top of the element, use it on tall chart bars
 *   so the tooltip shows where the user is actually hovering.
 */
function TipBody({ content }) {
  // structured { title, rows: [[key, value], …] }, OHLC-style
  if (
    content &&
    typeof content === "object" &&
    !Array.isArray(content) &&
    (content.title != null || content.rows)
  ) {
    return (
      <span style={{ display: "block", textAlign: "left", minWidth: 136 }}>
        {content.title != null && (
          <span style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>
            {content.title}
          </span>
        )}
        {(content.rows || []).map(([k, v], i) => (
          <span key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "var(--color-text-muted)" }}>{k}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{v}</span>
          </span>
        ))}
      </span>
    );
  }
  // multi-line string → bold title + lines
  if (typeof content === "string" && content.includes("\n")) {
    const [first, ...rest] = content.split("\n");
    return (
      <span style={{ display: "block" }}>
        <span style={{ display: "block", fontWeight: 700, marginBottom: 2 }}>{first}</span>
        {rest.map((l, i) => (
          <span key={i} style={{ display: "block", color: "var(--color-text-secondary)" }}>{l}</span>
        ))}
      </span>
    );
  }
  return content;
}

export default function Tip({ content, children, style, block, follow = false }) {
  const wrapRef = useRef(null);
  const bubbleRef = useRef(null);
  const [pos, setPos] = useState(null); // {x,y} in client (viewport) coords
  const [place, setPlace] = useState(null); // clamped {left, top}

  // keep the follow bubble fully inside the viewport (never off the edge)
  useLayoutEffect(() => {
    if (!follow || !pos || !bubbleRef.current) return;
    const b = bubbleRef.current.getBoundingClientRect();
    const PAD = 8;
    let left = pos.x - b.width / 2;
    left = Math.max(PAD, Math.min(left, window.innerWidth - b.width - PAD));
    let top = pos.y - b.height - 14; // prefer above the cursor
    if (top < PAD) top = pos.y + 18;  // flip below if there's no room above
    top = Math.min(top, window.innerHeight - b.height - PAD);
    setPlace({ left, top });
  }, [pos, follow]);

  if (content == null || content === "") return children || null;

  if (!follow) {
    return (
      <span className={`jx-tip ${block ? "jx-tip--block" : ""}`} style={style}>
        {children}
        <span className="jx-tip__bubble" role="tooltip">
          <TipBody content={content} />
        </span>
      </span>
    );
  }

  const onMove = (e) => setPos({ x: e.clientX, y: e.clientY });
  const clear = () => { setPos(null); setPlace(null); };

  return (
    <span
      ref={wrapRef}
      className={`jx-tip jx-tip--follow ${block ? "jx-tip--block" : ""}`}
      style={{ ...style, position: "relative" }}
      onMouseMove={onMove}
      onMouseLeave={clear}
    >
      {children}
      {pos && (
        <span
          ref={bubbleRef}
          className="jx-tip__bubble jx-tip__bubble--follow"
          role="tooltip"
          style={{
            position: "fixed",
            left: place ? place.left : pos.x,
            top: place ? place.top : pos.y,
            transform: "none",
            opacity: place ? 1 : 0,
          }}
        >
          <TipBody content={content} />
        </span>
      )}
    </span>
  );
}
