import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Dropdown from "../ui/Dropdown";

const QuantityGrid = ({ form, handleChange, currencySymbol }) => {
  const [showLeverage, setShowLeverage] = useState(false);
  const [showFees, setShowFees] = useState(false);

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

  // Framer Motion animation variants
  const sectionVariants = {
    hidden: { opacity: 0, height: 0, overflow: "hidden" },
    visible: { opacity: 1, height: "auto" },
  };

  return (
    <div className="tradeGrid">
      <div className="flexClm gap_12">
        {/* Margin Input */}
        <div className="inputLabelShift">
          <input
            type="number"
            name="quantityUSD"
            placeholder="Margin"
            value={form.quantityUSD || ""}
            onChange={handleNonNegativeChange}
            required
            min="0"
          />
          <label>Margin</label>
        </div>

        {/* Leverage Checkbox */}
        <label className="customCheckbox">
          <input
            type="checkbox"
            checked={showLeverage}
            onChange={(e) => setShowLeverage(e.target.checked)}
          />
          Use Leverage
        </label>

        {/* Leverage Section */}
        <AnimatePresence>
          {showLeverage && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={sectionVariants}
              transition={{ duration: 0.3 }}
              className="flexClm gap_8"
              style={{ padding: "12px 0" }}
            >
              <div className="flexRow flexRow_stretch gap_12">
                <div className="inputLabelShift">
                  <input
                    type="number"
                    name="leverage"
                    value={form.leverage || ""}
                    onChange={handleNonNegativeChange}
                    placeholder="Leverage"
                    min="0"
                  />
                  <label>Leverage</label>
                </div>

                {/* Show total value if leverage entered */}
                {form.leverage > 0 && (
                  <span className="flexRow flex_center font_12 avgValue">
                    Total value: {currencySymbol} {form.totalQuantity || 0}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fees Checkbox */}
        <label className="customCheckbox">
          <input
            type="checkbox"
            checked={showFees}
            onChange={(e) => setShowFees(e.target.checked)}
          />
          Show Fees
        </label>

        {/* Fees Section */}
        <AnimatePresence>
          {showFees && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={sectionVariants}
              transition={{ duration: 0.3 }}
              className="flexRow flexRow_stretch gap_12"
              style={{ padding: "12px 0" }}
            >
              <div className="inputLabelShift">
                <input
                  type="number"
                  name="openFeeValue"
                  placeholder="Open Fee"
                  value={form.openFeeValue || ""}
                  onChange={(e) => {
                    handleNonNegativeChange(e);

                    // auto-set close fee if empty
                    if (!form.closeFeeValue) {
                      handleChange({
                        target: {
                          name: "closeFeeValue",
                          value: e.target.value,
                        },
                      });
                    }
                  }}
                  min="0"
                  step={form.feeType === "percent" ? "0.01" : "0.000001"}
                />
                <label>
                  {form.feeType === "percent"
                    ? "Open Fee %"
                    : `Open Fee (${currencySymbol})`}
                </label>
              </div>

              <div className="inputLabelShift">
                <input
                  type="number"
                  name="closeFeeValue"
                  placeholder="Close Fee"
                  value={form.closeFeeValue || ""}
                  onChange={handleNonNegativeChange}
                  min="0"
                  step={form.feeType === "percent" ? "0.01" : "0.000001"}
                />
                <label>
                  {form.feeType === "percent"
                    ? "Close Fee %"
                    : `Close Fee (${currencySymbol})`}
                </label>
              </div>

              <div className="inputLabelShift">
                <Dropdown
                  value={form.feeType}
                  onChange={(val) =>
                    handleFeeTypeChange({ target: { value: val } })
                  }
                  options={[
                    { value: "percent", label: "%" },
                    { value: "currency", label: `${currencySymbol}` },
                  ]}
                />
              </div>

              {/* Fee Display */}
              {form.feeValue && form.feeType && (
                <div className="flexRow flex_center font_12 avgValue">
                  <span>
                    Trade open fees: {currencySymbol} {feeAmount.toFixed(2)}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- Checkbox Styling --- */}
      <style jsx>{`
        .customCheckbox {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-weight: 500;
          color: var(--primary);
        }

        .customCheckbox input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: var(--primary);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default QuantityGrid;
