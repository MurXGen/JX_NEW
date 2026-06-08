"use client";

export default function Card({ title, action, children, className = "", flat }) {
  return (
    <div className={`jx-card ${flat ? "jx-card--flat" : ""} ${className}`}>
      {(title || action) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--space-4)",
          }}
        >
          {title && <span className="jx-card__title">{title}</span>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
