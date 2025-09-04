import React from "react";

const QuickSection = ({ currency, form, handleChange }) => {
  if (form.tradeStatus !== "quick") return null;

  return (
    <div className="tradeGrid" style={{ padding: "0 0 32px 0" }}>
      <span className="label">Net P/L</span>
      <div style={{ position: "relative", width: "100%" }}>

        <div className="inputLabelShift">
          <input
            type="number"
            name="pnl"
            value={form.pnl || ""}
            onChange={handleChange}
            placeholder="Enter PnL"
            style={{  width: "100%" }}
          />

          <label>
            <span style={{ marginRight: '4px' }}>
              {currency}
            </span>
            Net P/L</label>
        </div>
      </div>
    </div>
  );
};

export default QuickSection;
