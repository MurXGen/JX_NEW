import React from "react";

const StopLossSection = ({
  form,
  setForm,
  calcPriceFromPercent,
  formatPrice,
  currencySymbol,
  handleSLAllocationBlur,
}) => {
  if (form.tradeStatus !== "running") return null;

  return (
    <div className="tradeGrid" style={{ padding: "0 0 24px 0" }}>
      <span className="label">Stop Loss</span>

      <div className="flexClm gap_32">
        {form.sls.map((sl, idx) => {
          const entryPrice = form.avgEntryPrice || form.entries[0]?.price;
          const slPrice =
            sl.mode === "percent"
              ? calcPriceFromPercent(entryPrice, sl.percent, form.direction)
              : sl.price;

          const usedOther = form.sls.reduce(
            (sum, s, i) => (i !== idx ? sum + Number(s.allocation || 0) : sum),
            0
          );
          const remaining = Math.max(0, 100 - usedOther);

          return (
            <div key={idx} className="flexClm gap_32">
              {/* Price / Percent Input */}
              <div className="flexRow flexRow_stretch gap_4">
                <div className="inputLabelShift">
                  {sl.mode === "price" ? (
                    <div className="inputLabelShift">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="SL Price"
                        value={sl.price ?? ""}
                        onChange={(e) => {
                          let val = Math.abs(Number(e.target.value));
                          if (isNaN(val)) val = "";
                          const sls = [...form.sls];
                          sls[idx].price = val;
                          setForm({ ...form, sls });
                        }}
                      />
                      <label>SL Price</label>
                    </div>
                  ) : (
                    <div className="inputLabelShift">
                      <input
                        type="number"
                        step="any"
                        placeholder="SL %"
                        value={sl.percent ?? ""}
                        onChange={(e) => {
                          let val = Number(e.target.value);
                          if (form.direction === "long" && val < -100)
                            val = -100;
                          if (form.direction === "short" && val > 100)
                            val = 100;
                          const sls = [...form.sls];
                          sls[idx].percent = isNaN(val) ? "" : val;
                          setForm({ ...form, sls });
                        }}
                      />
                      <label>SL %</label>
                      <div className="font_12" style={{ position: "relative" }}>
                        <span
                          style={{
                            position: "absolute",
                            bottom: "-20px",
                            right: "1px",
                          }}
                        >
                          SL Price:{" "}
                          {slPrice ? formatPrice(Number(slPrice)) : "0"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mode Toggle */}
                <div className="flexRow gap_4">
                  <button
                    type="button"
                    className={`button_sec icon-wrapper ${
                      sl.mode === "price" ? "active" : ""
                    }`}
                    onClick={() => {
                      const sls = [...form.sls];
                      sls[idx].mode = "price";
                      setForm({ ...form, sls });
                    }}
                  >
                    {currencySymbol}
                  </button>
                  <button
                    type="button"
                    className={`button_sec icon-wrapper ${
                      sl.mode === "percent" ? "active" : ""
                    }`}
                    onClick={() => {
                      const sls = [...form.sls];
                      sls[idx].mode = "percent";
                      setForm({ ...form, sls });
                    }}
                  >
                    %
                  </button>
                </div>
              </div>

              {/* Allocation Input */}
              <div className="inputLabelShift">
                <input
                  type="number"
                  min="0"
                  max={remaining}
                  placeholder="Allocation %"
                  value={sl.allocation ?? 0}
                  onChange={(e) => {
                    let val = Number(e.target.value);
                    if (val < 0) val = 0;
                    if (val > remaining) val = remaining;
                    const sls = [...form.sls];
                    sls[idx].allocation = val;
                    setForm({ ...form, sls });
                  }}
                  onBlur={(e) => handleSLAllocationBlur(idx, e.target.value)}
                />
                <label>Allocation %</label>
              </div>
            </div>
          );
        })}

        {form.avgSLPrice && (
          <span className="font_12 avgValue">
            Average stop loss price: {form.avgSLPrice}
          </span>
        )}
      </div>
    </div>
  );
};

export default StopLossSection;
