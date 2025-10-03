import React from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

const TakeProfitSection = ({
  form,
  setForm,
  calcPriceFromPercent,
  formatPrice,
  currencySymbol,
  handleTPAllocationBlur,
}) => {
  if (form.tradeStatus !== "running") return null;

  const roundToTwoDecimals = (val) =>
    isNaN(val) ? "" : parseFloat(Number(val).toFixed(2));

  const enforceSLRule = (val, mode, entryPrice, minSLPrice, direction) => {
    let finalVal = val;

    if (mode === "price") {
      if (minSLPrice !== null) {
        if (direction === "long" && finalVal <= minSLPrice) {
          finalVal = minSLPrice + 0.01;
        }
        if (direction === "short" && finalVal >= minSLPrice) {
          finalVal = minSLPrice - 0.01;
        }
      }
    }

    if (mode === "percent") {
      let tpPriceFromPercent = calcPriceFromPercent(
        entryPrice,
        finalVal,
        direction
      );
      if (minSLPrice !== null) {
        if (direction === "long" && tpPriceFromPercent <= minSLPrice) {
          finalVal = ((minSLPrice + 0.01 - entryPrice) / entryPrice) * 100;
        }
        if (direction === "short" && tpPriceFromPercent >= minSLPrice) {
          finalVal = ((minSLPrice - 0.01 - entryPrice) / entryPrice) * 100;
        }
      }
    }

    return roundToTwoDecimals(finalVal);
  };

  const AllocationSlider = ({ value, onChange, max }) => {
    const snapPoints = [25, 50, 75, 100];
    const snapDistance = 3;

    const snapValue = (val) => {
      for (let point of snapPoints) {
        if (Math.abs(val - point) <= snapDistance) return point;
      }
      return val;
    };

    return (
      <div style={{ padding: "24px", overflow: "hidden" }}>
        <Slider
          min={0}
          max={max || 100}
          value={value ?? 0}
          onChange={(val) => onChange(snapValue(val))}
          marks={{ 25: "25%", 50: "50%", 75: "75%", 100: "100%" }}
          step={1}
          trackStyle={{ backgroundColor: "var(--primary)", height: "6px" }}
          handleStyle={{
            borderColor: "var(--white-80)",
            height: 24,
            width: 24,
            marginTop: -9, // center handle
          }}
          dotStyle={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "var(--white-80)",
            border: "2px solid var(--white-80)",
            top: "-6px", // center dots
          }}
          activeDotStyle={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            backgroundColor: "var(--primary)",
            border: "2px solid var(--white-80)",
            top: "-7px", // center active dot
          }}
          markStyle={{
            fontSize: "12px",
            marginTop: "12px", // distance from line
          }}
        />
      </div>
    );
  };

  return (
    <div className="tradeGrid" style={{ padding: "0 0 24px 0" }}>
      {/* <span className="label">Take Profits</span> */}

      <div className="flexClm gap_32">
        {form.tps.map((tp, idx) => {
          const entryPrice = form.avgEntryPrice || form.entries[0]?.price;

          const slPrices = form.sls
            .map((sl) =>
              sl.mode === "percent"
                ? calcPriceFromPercent(entryPrice, sl.percent, form.direction)
                : sl.price
            )
            .filter((p) => !!p && !isNaN(p));

          const minSLPrice = slPrices.length ? Math.min(...slPrices) : null;

          const usedOther = form.tps.reduce(
            (sum, t, i) => (i !== idx ? sum + Number(t.allocation || 0) : sum),
            0
          );
          const remaining = Math.max(0, 100 - usedOther);

          let tpPrice =
            tp.mode === "percent"
              ? calcPriceFromPercent(entryPrice, tp.percent, form.direction)
              : tp.price;

          return (
            <div key={idx} className="flexClm gap_32">
              {/* Price / Percent Input */}
              <div className="flexRow flexRow_stretch gap_4">
                <div className="inputLabelShift">
                  {tp.mode === "price" ? (
                    <div className="inputLabelShift">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="TP Price"
                        value={tp.price ?? ""}
                        onChange={(e) => {
                          let val = Math.abs(Number(e.target.value));
                          const tps = [...form.tps];
                          tps[idx].price = isNaN(val) ? "" : val;
                          setForm({ ...form, tps });
                        }}
                        onBlur={(e) => {
                          let val = Math.abs(Number(e.target.value));
                          const tps = [...form.tps];
                          val = enforceSLRule(
                            val,
                            "price",
                            entryPrice,
                            minSLPrice,
                            form.direction
                          );
                          tps[idx].price = val;
                          setForm({ ...form, tps });
                        }}
                      />
                      <label>TP Price</label>
                    </div>
                  ) : (
                    <div className="inputLabelShift">
                      <input
                        type="number"
                        step="any"
                        placeholder="TP %"
                        value={tp.percent ?? ""}
                        onChange={(e) => {
                          let val = Number(e.target.value);
                          const tps = [...form.tps];
                          tps[idx].percent = isNaN(val) ? "" : val;
                          setForm({ ...form, tps });
                        }}
                        onBlur={(e) => {
                          let val = Number(e.target.value);
                          const tps = [...form.tps];
                          val = enforceSLRule(
                            val,
                            "percent",
                            entryPrice,
                            minSLPrice,
                            form.direction
                          );
                          tps[idx].percent = val;
                          setForm({ ...form, tps });
                        }}
                      />
                      <label>TP %</label>
                      <div className="font_12" style={{ position: "relative" }}>
                        <span
                          style={{
                            position: "absolute",
                            bottom: "-20px",
                            right: "1px",
                          }}
                        >
                          TP Price:{" "}
                          {tpPrice ? formatPrice(Number(tpPrice)) : "0"}
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
                      tp.mode === "price" ? "active" : ""
                    }`}
                    onClick={() => {
                      const tps = [...form.tps];
                      tps[idx].mode = "price";
                      setForm({ ...form, tps });
                    }}
                  >
                    {currencySymbol}
                  </button>
                  <button
                    type="button"
                    className={`button_sec icon-wrapper ${
                      tp.mode === "percent" ? "active" : ""
                    }`}
                    onClick={() => {
                      const tps = [...form.tps];
                      tps[idx].mode = "percent";
                      setForm({ ...form, tps });
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
                  value={tp.allocation ?? 0}
                  onChange={(e) => {
                    let val = Number(e.target.value);
                    if (val < 0) val = 0;
                    if (val > remaining) val = remaining;
                    const tps = [...form.tps];
                    tps[idx].allocation = val;
                    setForm({ ...form, tps });
                  }}
                  onBlur={(e) => handleTPAllocationBlur(idx, e.target.value)}
                />
                <label>Allocation %</label>
              </div>
              <AllocationSlider
                value={tp.allocation ?? 0}
                max={remaining}
                onChange={(val) => handleTPAllocationBlur(idx, val)}
              />
            </div>
          );
        })}

        {form.avgTPPrice && (
          <span className="font_12 avgValue">
            Average take profit price : {form.avgTPPrice}
          </span>
        )}
      </div>
    </div>
  );
};

export default TakeProfitSection;
