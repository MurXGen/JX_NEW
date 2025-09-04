import React from "react";

const ExitsSection = ({
  form,
  currencySymbol,
  firstExitRef,
  updateExit,
  handleExitAllocationBlur,
  calcPriceFromPercent,
  formatPrice,
  formatNumber,
}) => {
  if (form.tradeStatus !== "closed") return null;

  return (
    <div className="tradeGrid" style={{ padding: "0 0 32px 0" }}>
      <span className="label">Exits</span>
      <div className="flexClm gap_32">
        {form.exits.map((exit, idx) => {
          const exitMode = exit.mode || "price";
          const exitPrice =
            exitMode === "percent"
              ? calcPriceFromPercent(
                  Number(form.avgEntryPrice) || 0,
                  Number(exit.percent) || 0,
                  form.direction
                )
              : exit.price;

          const usedOther = form.exits.reduce(
            (sum, e, i) => (i !== idx ? sum + Number(e.allocation || 0) : sum),
            0
          );
          const remaining = Math.max(0, 100 - usedOther);

          return (
            <div key={idx} className="flexClm gap_32">
              <div className="flexRow flexRow_stretch gap_4 ">
                {/* Exit Price / Percent Input */}
                <div className="inputLabelShift">
                  {exitMode === "price" ? (
                    <div className="inputLabelShift">
                      <input
                        ref={idx === 0 ? firstExitRef : null}
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Exit Price"
                        value={exit.price ?? ""}
                        onChange={(e) => {
                          let val = Number(e.target.value);
                          if (val < 0) val = 0;
                          updateExit(idx, "price", val);
                        }}
                      />
                      <label>Exit price</label>
                    </div>
                  ) : (
                    <div>
                      <div
                        className="inputLabelShift"
                        style={{ position: "relative" }}
                      >
                        <input
                          ref={idx === 0 ? firstExitRef : null}
                          type="number"
                          step="any"
                          placeholder="Enter % away from entry"
                          value={exit.percent ?? ""}
                          onChange={(e) => {
                            let val = Number(e.target.value);
                            if (form.direction === "long" && val < -100)
                              val = -100;
                            if (form.direction === "short" && val > 100)
                              val = 100;
                            updateExit(idx, "percent", val);
                          }}
                        />
                        <label>Enter % away from entry </label>
                      </div>
                      <span
                        className="font_12"
                        style={{
                          position: "absolute",
                          bottom: "-20px",
                          right: "1px",
                        }}
                      >
                        Exit Price:{" "}
                        {exitPrice ? formatPrice(Number(exitPrice)) : "0"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Mode Switch Buttons */}
                <div className="flexRow gap_4">
                  <button
                    type="button"
                    className={`button_sec icon-wrapper ${
                      exit.mode === "price" ? "active" : ""
                    }`}
                    onClick={() => updateExit(idx, "mode", "price")}
                  >
                    {currencySymbol}
                  </button>
                  <button
                    type="button"
                    className={`button_sec icon-wrapper ${
                      exit.mode === "percent" ? "active" : ""
                    }`}
                    onClick={() => updateExit(idx, "mode", "percent")}
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
                  value={exit.allocation ?? 0}
                  disabled={
                    (!exit.price || Number(exit.price) <= 0) &&
                    (!exit.percent || exit.percent === "")
                  }
                  onChange={(e) => {
                    let val = Number(e.target.value);
                    if (val < 0) val = 0;
                    if (val > remaining) val = remaining;
                    updateExit(idx, "allocation", val);
                  }}
                  onBlur={(e) => handleExitAllocationBlur(idx, e.target.value)}
                />
                <label>Allocation in %</label>
                <div className="font_12" style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      bottom: "-20px",
                      right: "1px",
                    }}
                  >
                    Allocated: {currencySymbol}
                    {formatNumber(
                      ((exit.allocation || 0) / 100) *
                        (form.totalQuantity || 0).toFixed(2)
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {/* Weighted Average Exit Price */}
        {form.avgExitPrice && (
          <span className="font_12 avgValue">
            Average Exit Price : {form.avgExitPrice}
          </span>
        )}
      </div>
    </div>
  );
};

export default ExitsSection;
