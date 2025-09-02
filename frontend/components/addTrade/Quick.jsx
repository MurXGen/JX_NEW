import React from "react";

const QuickSection = ({ form, handleChange }) => {
  if (form.tradeStatus !== "quick") return null;

  return (
    <div className="tradeGrid" style={{ padding: "0 0 32px 0" }}>
      <span className="label">Net Profit or Loss</span>
      <input
        type="number"
        name="pnl"
        value={form.pnl || ""}
        onChange={handleChange}
        placeholder="Enter PnL"
      />
    </div>
  );
};

export default QuickSection;
