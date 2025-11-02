import React from "react";

const QuickSection = ({ currency, form, handleChange }) => {
  if (form.tradeStatus !== "quick") return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "32px 16px",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.06)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      }}
    >
      <label
        style={{
          fontSize: "20px",
          fontWeight: "600",
          marginBottom: "12px",
          color: "var(--text-primary, #fff)",
        }}
      >
        Enter your Net P/L
      </label>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "40px",
          fontWeight: "700",
          color: form.pnl >= 0 ? "#2ecc71" : "#e74c3c",
          gap: "8px",
          width: "100%",
        }}
      >
        <span style={{ opacity: 0.8 }}>{currency}</span>
        <input
          type="number"
          name="pnl"
          value={form.pnl || ""}
          onChange={handleChange}
          placeholder="0.00"
          inputMode="decimal"
          style={{
            border: "none",
            background: "transparent",
            fontSize: "48px",
            fontWeight: "700",
            textAlign: "center",
            outline: "none",
            color: form.pnl >= 0 ? "#2ecc71" : "#e74c3c",
            width: "140px",
          }}
        />
      </div>

      <p
        style={{
          fontSize: "14px",
          color: "var(--text-secondary, #aaa)",
          marginTop: "12px",
          letterSpacing: "0.3px",
        }}
      >
        Record your quick trade result instantly
      </p>
    </div>
  );
};

export default QuickSection;
