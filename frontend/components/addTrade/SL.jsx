import React from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

const StopLossSection = ({
  form,
  setForm,
  calcPriceFromPercent,
  formatPrice,
  currencySymbol,
  handleSLAllocationBlur,
}) => {
  if (form.tradeStatus !== "running") return null;

  const updateSLAllocation = (idx, value) => {
    setForm((prev) => {
      let sls = [...prev.sls];
      let currentVal = Number(value);

      if (isNaN(currentVal) || currentVal <= 0) {
        return prev;
      }

      const usedOther = sls.reduce(
        (sum, sl, i) => (i !== idx ? sum + Number(sl.allocation || 0) : sum),
        0
      );
      const remaining = Math.max(0, 100 - usedOther);

      if (currentVal > remaining) currentVal = remaining;
      sls[idx].allocation = currentVal;

      const totalAllocated = sls.reduce(
        (sum, sl) => sum + Number(sl.allocation || 0),
        0
      );

      // 🔁 Add another SL row if total < 100 and this is last row
      if (totalAllocated < 100 && idx === sls.length - 1) {
        sls.push({ mode: "price", price: "", percent: "", allocation: "" });
      } else if (totalAllocated >= 100) {
        sls = sls.slice(0, idx + 1);
      }

      // --- Weighted Average SL Price ---
      let weightedSum = 0;
      let totalWeight = 0;

      sls.forEach((s) => {
        let slPrice;
        if (s.mode === "percent") {
          const percentNum = Number(s.percent);
          slPrice = calcPriceFromPercent(
            form.avgEntryPrice,
            percentNum,
            prev.direction
          );
        } else {
          slPrice = s.price;
        }

        const priceNum = Number(slPrice);
        const alloc = Number(s.allocation);

        if (!isNaN(priceNum) && alloc > 0) {
          weightedSum += priceNum * (alloc / 100);
          totalWeight += alloc / 100;
        }
      });

      const avgSLPrice =
        totalWeight > 0 ? formatPrice(weightedSum / totalWeight) : "";

      return { ...prev, sls, avgSLPrice };
    });
  };

  const snapPoints = [25, 50, 75, 100];
  const snapDistance = 3; // how close before it "pulls" (tightness)

  function snapValue(val) {
    for (let point of snapPoints) {
      if (Math.abs(val - point) <= snapDistance) {
        return point; // snap!
      }
    }
    return val; // otherwise keep exact
  }
  const AllocationSlider = ({ value, onChange, max }) => {
    return (
      <div style={{ padding: "24px", overflow: "hidden" }}>
        <Slider
          min={0}
          max={max || 100} // fallback
          value={value ?? 0} // always number
          onChange={(val) => {
            const snapped = snapValue(val);
            onChange(snapped);
          }}
          marks={{ 25: "25%", 50: "50%", 75: "75%", 100: "100%" }}
          step={1}
          trackStyle={{ backgroundColor: "var(--primary)", height: "6px" }} // thicker line
          handleStyle={{
            borderColor: "var(--white-80)",
            height: 24,
            width: 24,
            marginTop: -9, // center handle on line
          }}
          dotStyle={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "var(--white-80)",
            border: "2px solid var(--white-80)",
            top: "-6px", // align dot center with line
          }}
          activeDotStyle={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            backgroundColor: "var(--primary)",
            border: "2px solid var(--white-80)",
            top: "-7px", // align active dot center
          }}
          // Optional: style marks text
          markStyle={{
            fontSize: "12px",
            marginTop: "12px", // distance from line
          }}
        />
      </div>
    );
  };

  return (
    <div className="tradeGrid">
      {/* <span className="label">Stop Loss</span> */}

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

              <div className="inputLabelShift">
                <AllocationSlider
                  value={Number(sl.allocation) || 0} // ✅ ensure numeric, fallback to 0
                  max={remaining}
                  onChange={(val) => updateSLAllocation(idx, val)}
                />
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
