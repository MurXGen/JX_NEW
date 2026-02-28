import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Dropdown from "../ui/Dropdown";
import { X } from "lucide-react";

const QuantityGrid = ({ form, handleChange, currencySymbol }) => {
  const [showLeverage, setShowLeverage] = useState(false);
  const [showFees, setShowFees] = useState(false);
  const [storedQuantities, setStoredQuantities] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
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

  // Load saved quantities from localStorage on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("quantities")) || [];
    setStoredQuantities(saved);
  }, []);

  // Handle quantity input change
  const handleNonNegativeChange = (e) => {
    const { name, value } = e.target;
    const sanitized = Math.max(0, Number(value));
    handleChange({ target: { name, value: sanitized } });
  };

  // Save quantity to localStorage on blur
  const handleQuantityBlur = () => {
    if (isSelecting) return; // ignore when selecting chip

    const val = form.quantityUSD;
    if (!val) return;

    const saved = JSON.parse(localStorage.getItem("quantities")) || [];
    if (!saved.includes(val)) {
      const updated = [val, ...saved].slice(0, 10); // keep last 10
      localStorage.setItem("quantities", JSON.stringify(updated));
      setStoredQuantities(updated);
    }
  };

  // Select quantity from chip
  const handleQuantitySelect = (val) => {
    setIsSelecting(true);
    handleChange({ target: { name: "quantityUSD", value: val } });
    setTimeout(() => setIsSelecting(false), 200);
  };

  // Remove quantity from chips and localStorage
  const removeQuantity = (val) => {
    const updated = storedQuantities.filter((q) => q !== val);
    localStorage.setItem("quantities", JSON.stringify(updated));
    setStoredQuantities(updated);
    if (form.quantityUSD === val)
      handleChange({ target: { name: "quantityUSD", value: "" } });
  };

  // Framer Motion animation variants
  const sectionVariants = {
    hidden: { opacity: 0, height: 0, overflow: "hidden" },
    visible: { opacity: 1, height: "auto" },
  };

  return (
    <div className="tradeGrid">
      <label className="label">Set margin</label>
      <div className="flexClm gap_12">
        {/* Margin Input */}
        <div className=" flexRow width100" style={{ position: "relative" }}>
          <input
            type="number"
            name="quantityUSD"
            placeholder="Margin"
            value={form.quantityUSD || ""}
            onChange={handleNonNegativeChange}
            onBlur={handleQuantityBlur}
            min="0"
            style={{ flex: "1" }}
          />

          {/* Clear input icon */}
          {form.quantityUSD && (
            <X
              size={16}
              style={{
                position: "absolute",
                right: 46,
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "#888",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleChange({ target: { name: "quantityUSD", value: "" } });
              }}
            />
          )}
        </div>

        {/* Saved Quantities Chips */}
        {storedQuantities.length > 0 && (
          <div
            className="flexRow gap_8 flexRow_scroll removeScrollBar"
            style={{ marginTop: 8 }}
          >
            {storedQuantities.map((q) => (
              <div
                key={q}
                className="button_ter font_14 flexRow flex_center gap_8"
                onMouseDown={() => handleQuantitySelect(q)}
              >
                <span>{q}</span>
                <X
                  size={12}
                  className="btn"
                  style={{ padding: "4px" }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    removeQuantity(q);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Leverage Checkbox */}
        <label className="customCheckbox font_16">
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
                <div className="flexRow" style={{ flex: "1" }}>
                  <input
                    type="number"
                    name="leverage"
                    value={form.leverage || ""}
                    onChange={handleNonNegativeChange}
                    placeholder="Leverage"
                    min="0"
                    style={{ flex: "1" }}
                  />
                  {/* <label>Leverage</label> */}
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
        {/* <label className="customCheckbox font_16">
          <input
            type="checkbox"
            checked={showFees}
            onChange={(e) => setShowFees(e.target.checked)}
          />
          Show Fees
        </label> */}

        {/* Fees Section */}
        {/* <AnimatePresence>
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
              <div style={{ flex: "1" }}>
                <input
                  type="number"
                  name="openFeeValue"
                  placeholder="Open Fee"
                  value={form.openFeeValue || ""}
                  onChange={(e) => {
                    handleNonNegativeChange(e);

               
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
                <label className="font_12 black-text">
                  {form.feeType === "percent"
                    ? "Open Fee %"
                    : `Open Fee (${currencySymbol})`}
                </label>
              </div>

              <div className="" style={{ flex: "1" }}>
                <input
                  type="number"
                  name="closeFeeValue"
                  placeholder="Close Fee"
                  value={form.closeFeeValue || ""}
                  onChange={handleNonNegativeChange}
                  min="0"
                  step={form.feeType === "percent" ? "0.01" : "0.000001"}
                />
                <label className="font_12 black-text">
                  {form.feeType === "percent"
                    ? "Close Fee %"
                    : `Close Fee (${currencySymbol})`}
                </label>
              </div>

              <div className="" style={{ flex: "1" }}>
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

          
              {form.feeValue && form.feeType && (
                <div className="flexRow flex_center font_12 avgValue">
                  <span>
                    Trade open fees: {currencySymbol} {feeAmount.toFixed(2)}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence> */}
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
