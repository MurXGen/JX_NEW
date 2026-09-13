"use client";

/* Shared section eyebrow badge — one professional style reused across every
   landing section (hero sub-sections, bento, analytics, how-it-works, etc.).
   Monochrome pill with a single yellow accent dot; self-contained inline
   styles so it renders identically wherever it's imported. */

export default function Eyebrow({ children, style }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        font: "600 11.5px Poppins, sans-serif",
        letterSpacing: "1.4px",
        textTransform: "uppercase",
        color: "#c7ccd3",
        background: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 999,
        padding: "6px 14px",
        marginBottom: 16,
        ...style,
      }}
    >
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "#fcd535", boxShadow: "0 0 8px rgba(252,213,53,0.8)", flex: "0 0 auto" }} />
      {children}
    </span>
  );
}
