import React from "react";
import { Plus, Minus } from "lucide-react";

const QuickSection = ({ currency, form, handleChange, setForm }) => {
  if (form.tradeStatus !== "quick") return null;

  const handleSignChange = (sign) => {
    const currentValue = Number(form.pnl) || 0;
    const newValue =
      sign === "positive" ? Math.abs(currentValue) : -Math.abs(currentValue);
    setForm((prev) => ({ ...prev, pnl: newValue }));
  };

  return (
    <div className="flexClm pad_32 chart_boxBg">
      <label className="font_16 font_weight_600">Net P/L</label>

      <div className="flexRow flexRow_stretch">
        <div className="flexRow">
          <span style={{ opacity: 0.8, fontSize: "40px", fontWeight: "700" }}>
            {currency}
          </span>

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
              textAlign: "left",
              outline: "none",
              color: form.pnl >= 0 ? "var(--success)" : "var(--error)",
              width: "140px",
            }}
          />
        </div>

        <div className="flexRow gap_4">
          <button
            type="button"
            className="button_ter flexRow gap_4"
            title="Set Positive"
            onClick={() => handleSignChange("positive")}
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            className="button_ter flexRow gap_4"
            title="Set Negative"
            onClick={() => handleSignChange("negative")}
          >
            <Minus size={18} />
          </button>
        </div>
      </div>

      <p className="marg_0 font_14 shade_50">
        Quickly log just profit and loss
      </p>
    </div>
  );
};

export default QuickSection;
