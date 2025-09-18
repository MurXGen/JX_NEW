const QuantityGrid = ({ form, handleChange, currencySymbol }) => {
  // Wrap the handler to enforce non-negative
  const handleNonNegativeChange = (e) => {
    const { name, value } = e.target;
    const sanitized = Math.max(0, Number(value)); // force value >= 0

    handleChange({
      target: { name, value: sanitized },
    });
  };

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
              onChange={handleNonNegativeChange} // ✅ strict enforcement
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
              onChange={handleNonNegativeChange} // ✅ strict enforcement
              placeholder="Leverage"
              min="0"
            />
            <label>Leverage</label>
          </div>
        </div>

        <span className="flexRow flex_center font_12 avgValue">
          Total value : {currencySymbol} {form.totalQuantity}
        </span>
      </div>
    </div>
  );
};

export default QuantityGrid;
