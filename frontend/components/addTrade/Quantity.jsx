const QuantityGrid = ({ form, handleChange, currencySymbol }) => {
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
              onChange={handleChange}
              required
            />
            <label>Margin</label>
          </div>

          <div className="inputLabelShift">
            <input
              type="number"
              name="leverage"
              value={form.leverage}
              onChange={handleChange}
              placeholder="Leverage"
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
