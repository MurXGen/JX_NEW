import React from "react";

const EntriesSection = ({
  form,
  setForm,
  currencySymbol,
  formatPrice,
  formatNumber,
  handleAllocationBlur,
}) => {
  if (form.tradeStatus !== "closed" && form.tradeStatus !== "running")
    return null;

  return (
    <div className="tradeGrid">
      <span className="label">Entries</span>

      <div className="flexClm gap_32">
        {form.entries.map((entry, idx) => {
          const usedAllocation = form.entries.reduce(
            (sum, e, i) => (i !== idx ? sum + Number(e.allocation || 0) : sum),
            0
          );
          const remaining = Math.max(0, 100 - usedAllocation);
          const allocatedValue =
            ((entry.allocation || 0) / 100) * form.totalQuantity;

          const handlePriceChange = (e) => {
            let val = Number(e.target.value);
            if (val < 0) val = 0;

            const entries = [...form.entries];
            entries[idx].price = val;
            setForm({ ...form, entries });

            // Recalculate weighted average
            let weightedSum = 0;
            let totalWeight = 0;
            entries.forEach((en) => {
              const price = Number(en.price);
              const alloc = Number(en.allocation);
              if (price > 0 && alloc > 0) {
                weightedSum += price * (alloc / 100);
                totalWeight += alloc / 100;
              }
            });
            const avg = totalWeight > 0 ? weightedSum / totalWeight : "";
            const avgPrice = avg !== "" ? formatPrice(avg) : "";
            setForm((prev) => ({ ...prev, avgEntryPrice: avgPrice }));
          };

          const handleAllocationChange = (e) => {
            const entries = [...form.entries];
            let val = Number(e.target.value);
            if (val > remaining) val = remaining;
            if (val < 0) val = 0;
            entries[idx].allocation = val;
            setForm({ ...form, entries });
          };

          return (
            <div key={idx} className="flexRow flexRow_stretch gap_12">
              {/* Entry Price Input */}
              <div className="flexClm" style={{ flex: "1" }}>
                <div className="inputLabelShift">
                  <input
                    type="number"
                    step="any"
                    name={`entryPrice_${idx}`}
                    value={entry.price}
                    placeholder="Entry Price"
                    min="0"
                    onChange={handlePriceChange}
                  />
                  <label>Entry Price</label>
                </div>
              </div>

              {/* Allocation Input */}
              <div className="flexClm" style={{ flex: "1" }}>
                <div className="inputLabelShift">
                  <input
                    type="number"
                    name={`allocation_${idx}`}
                    placeholder="Allocation %"
                    value={entry.allocation}
                    min="0"
                    max={remaining}
                    disabled={!entry.price || Number(entry.price) <= 0}
                    onChange={handleAllocationChange}
                    onBlur={(e) => handleAllocationBlur(idx, e.target.value)}
                  />
                  <label>Allocation %</label>
                </div>

                {/* Allocation Info */}
                <div className="font_12" style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      bottom: "-20px",
                      right: "1px",
                    }}
                  >
                    Allocated: {currencySymbol}
                    {formatNumber(allocatedValue, 2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {form.avgEntryPrice && (
          <span className="font_12 avgValue">
            Average entry price : {form.avgEntryPrice}
          </span>
        )}
      </div>
    </div>
  );
};

export default EntriesSection;
