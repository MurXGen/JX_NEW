import Dropdown from "../ui/Dropdown";

const QuantityGrid = ({ form, handleChange, currencySymbol }) => {
  // Wrap the handler to enforce non-negative
  const handleNonNegativeChange = (e) => {
    const { name, value } = e.target;
    const sanitized = Math.max(0, Number(value)); // force value >= 0

    handleChange({
      target: { name, value: sanitized },
    });
  };

  // Handle fee type change
  const handleFeeTypeChange = (e) => {
    const { value } = e.target;
    handleChange({
      target: { name: "feeType", value },
    });

    // Reset fee value when type changes
    handleChange({
      target: { name: "feeValue", value: "" },
    });
  };

  // Calculate fee and PnL after fee
  const calculateFeeAndPnL = () => {
    const totalQuantity = form.totalQuantity || 0;
    const pnl = form.pnl || 0;
    let feeAmount = 0;

    if (form.feeType === "percent" && form.feeValue) {
      feeAmount = totalQuantity * (form.feeValue / 100);
    } else if (form.feeType === "currency" && form.feeValue) {
      feeAmount = parseFloat(form.feeValue);
    }

    const pnlAfterFee = pnl - feeAmount;
    return { feeAmount, pnlAfterFee };
  };

  const { feeAmount, pnlAfterFee } = calculateFeeAndPnL();

  return (
    <div className="tradeGrid">
      <span className="label">Quantity</span>

      <div className="flexClm gap_12">
        <div className="flexRow flexRow_stretch gap_12">
          <div className="inputLabelShift">
            <input
              type="number"
              name="quantityUSD"
              placeholder="Margin"
              value={form.quantityUSD}
              onChange={handleNonNegativeChange}
              required
              min="0"
            />
            <label>Margin</label>
          </div>

          <div className="inputLabelShift">
            <input
              type="number"
              name="leverage"
              value={form.leverage}
              onChange={handleNonNegativeChange}
              placeholder="Leverage"
              min="0"
            />
            <label>Leverage</label>
          </div>
        </div>

        <span className="flexRow flex_center font_12 avgValue">
          Total value : {currencySymbol} {form.totalQuantity}
        </span>

        {/* Fee Section */}
        <div className="flexRow flexRow_stretch gap_12">
          <div className="inputLabelShift">
            <input
              type="number"
              name="feeValue"
              placeholder="Fee Value"
              value={form.feeValue || ""}
              onChange={handleNonNegativeChange}
              min="0"
              step={form.feeType === "percent" ? "0.01" : "0.000001"}
            />
            <label>
              {form.feeType === "percent" ? "Fee %" : `Fee (${currencySymbol})`}
            </label>
          </div>
          <div className="inputLabelShift">
            <Dropdown
              value={form.feeType} // always has a value ("percent" by default)
              onChange={(val) =>
                handleFeeTypeChange({ target: { value: val } })
              }
              options={[
                { value: "percent", label: "Percent (%)" },
                { value: "currency", label: `Value (${currencySymbol})` },
              ]}
            />
            {/* <label>Fee Type</label> */}
          </div>
        </div>

        {/* Fee Display */}
        {form.feeValue && form.feeType && (
          <div className="flexRow flex_center font_12 avgValue">
            <span>
              Trade open fees: {currencySymbol} {feeAmount.toFixed(2)}
            </span>
            {/* <span style={{ marginLeft: "20px" }}>
              PnL After Fee: {currencySymbol} {pnlAfterFee.toFixed(2)}
            </span> */}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuantityGrid;
