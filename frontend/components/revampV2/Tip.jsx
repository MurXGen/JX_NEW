"use client";

/**
 * revampV2 Tip — lightweight hover tooltip.
 *   <Tip content={"Mar 18\n+$1.2k"}>…</Tip>
 * Pure CSS show/hide (works for hundreds of bars), supports \n line
 * breaks, follows the theme via tokens.
 */
export default function Tip({ content, children, style, block }) {
  if (!content) return children || null;
  return (
    <span className={`jx-tip ${block ? "jx-tip--block" : ""}`} style={style}>
      {children}
      <span className="jx-tip__bubble" role="tooltip">
        {content}
      </span>
    </span>
  );
}
