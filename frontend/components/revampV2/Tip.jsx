"use client";

import { useRef, useState } from "react";

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
  const [pos, setPos] = useState(null); // {x,y} relative to the wrapper

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

  const onMove = (e) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <span
      ref={wrapRef}
      className={`jx-tip jx-tip--follow ${block ? "jx-tip--block" : ""}`}
      style={{ ...style, position: "relative" }}
      onMouseMove={onMove}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && (
        <span
          className="jx-tip__bubble jx-tip__bubble--follow"
          role="tooltip"
          style={{ left: pos.x, top: pos.y - 14 }}
        >
          <TipBody content={content} />
        </span>
      )}
    </span>
  );
}
