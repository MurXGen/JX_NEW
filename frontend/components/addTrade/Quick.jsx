import React from "react";

const QuickSection = ({ currency, form, handleChange }) => {
  if (form.tradeStatus !== "quick") return null;

  return (
    <div className="tradeGrid" style={{ padding: "0 0 32px 0" }}>
      <span className="label">Net P/L</span>
      <div style={{ position: "relative" }}>
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "12px",
            transform: "translateY(-50%)",
            color: "#666",
            fontSize: "14px",
            pointerEvents: "none",
          }}
        >
          {currency}
        </span>
        <div className="inputLabelShift">
          <input
            type="number"
            name="pnl"
            value={form.pnl || ""}
            onChange={handleChange}
            placeholder="Enter PnL"
            style={{ paddingLeft: "40px" }}
          />
        </div>
      </div>
    </div>
  );
};

export default QuickSection;
