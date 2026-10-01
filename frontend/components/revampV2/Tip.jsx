"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
 * The bubble is rendered in a portal on <body> and positioned with fixed
 * coordinates clamped to the viewport, so it never gets clipped by a card's
 * overflow or trapped inside a transformed (animated) ancestor.
 *
 * follow: the bubble tracks the cursor (use on tall chart bars); otherwise it
 *   anchors just above the hovered element.
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
  const [anchor, setAnchor] = useState(null); // {x, y} viewport coords
  const [place, setPlace] = useState(null); // clamped {left, top}

  // keep the bubble fully inside the viewport (never clipped / off-screen)
  useLayoutEffect(() => {
    if (!anchor || !bubbleRef.current) return;
    const b = bubbleRef.current.getBoundingClientRect();
    const PAD = 8;
    let left = anchor.x - b.width / 2;
    left = Math.max(PAD, Math.min(left, window.innerWidth - b.width - PAD));
    let top = anchor.y - b.height - 10; // prefer above
    if (top < PAD) top = anchor.y + 16; // flip below if no room above
    top = Math.min(top, window.innerHeight - b.height - PAD);
    setPlace({ left, top });
  }, [anchor]);

  if (content == null || content === "") return children || null;

  const showAtPointer = (e) => setAnchor({ x: e.clientX, y: e.clientY });
  const showAtElement = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({ x: r.left + r.width / 2, y: r.top });
  };
  const clear = () => { setAnchor(null); setPlace(null); };

  return (
    <span
      ref={wrapRef}
      className={`jx-tip ${block ? "jx-tip--block" : ""}`}
      style={{ ...style, position: "relative" }}
      onMouseEnter={follow ? undefined : showAtElement}
      onMouseMove={follow ? showAtPointer : undefined}
      onMouseLeave={clear}
    >
      {children}
      {anchor && typeof document !== "undefined" &&
        createPortal(
          <span
            ref={bubbleRef}
            className="jx-tip__bubble jx-tip__bubble--portal"
            role="tooltip"
            style={{
              position: "fixed",
              left: place ? place.left : anchor.x,
              top: place ? place.top : anchor.y,
              transform: "none",
              opacity: place ? 1 : 0,
            }}
          >
            <TipBody content={content} />
          </span>,
          document.body,
        )}
    </span>
  );
}
