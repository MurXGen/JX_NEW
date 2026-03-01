import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  DollarSign,
  History,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const STORAGE_KEY = "trade_quantities";
const MAX_STORED = 8;

const QuantityGrid = ({ form, handleChange, currencySymbol }) => {
  const [showLeverage, setShowLeverage] = useState(false);
  const [storedQuantities, setStoredQuantities] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingQuantity, setPendingQuantity] = useState(
    form.quantityUSD || "",
  );

  // Load saved quantities from localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      setStoredQuantities(saved);

      // Auto-fill with last used value if available and current is empty
      if (!form.quantityUSD && saved.length > 0) {
        handleChange({ target: { name: "quantityUSD", value: saved[0] } });
        setPendingQuantity(saved[0]);
      }
    } catch (error) {
      console.error("Failed to load saved quantities:", error);
    }
  }, []);

  // Update pending quantity when form changes externally
  useEffect(() => {
    setPendingQuantity(form.quantityUSD || "");
  }, [form.quantityUSD]);

  // Handle quantity input change (only updates local state, not form)
  const handleQuantityChange = (e) => {
    const { value } = e.target;
    const sanitized = value === "" ? "" : Math.max(0, Number(value) || 0);
    setPendingQuantity(sanitized);
  };

  // Save quantity on blur
  const handleQuantityBlur = () => {
    if (isSelecting) return;

    const numValue = Number(pendingQuantity);
    if (!isNaN(numValue) && numValue > 0) {
      // Update form
      handleChange({ target: { name: "quantityUSD", value: numValue } });

      // Save to history
      saveQuantity(numValue);
    } else if (pendingQuantity === "" || pendingQuantity === "0") {
      // Clear form if empty or zero
      handleChange({ target: { name: "quantityUSD", value: "" } });
    }
  };

  // Save quantity to localStorage
  const saveQuantity = (val) => {
    if (!val || val <= 0) return;

    setStoredQuantities((prev) => {
      // Remove if exists
      const filtered = prev.filter((q) => q !== val);
      // Add to front, limit to MAX_STORED
      const updated = [val, ...filtered].slice(0, MAX_STORED);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save quantity:", error);
      }

      return updated;
    });
  };

  // Select quantity from history
  const handleQuantitySelect = (val) => {
    setIsSelecting(true);
    setPendingQuantity(val);
    handleChange({ target: { name: "quantityUSD", value: val } });
    setTimeout(() => setIsSelecting(false), 200);
  };

  // Remove quantity from history
  const removeQuantity = (val, e) => {
    e.stopPropagation();
    e.preventDefault();

    setStoredQuantities((prev) => {
      const updated = prev.filter((q) => q !== val);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to remove quantity:", error);
      }
      return updated;
    });

    if (form.quantityUSD === val) {
      handleChange({ target: { name: "quantityUSD", value: "" } });
      setPendingQuantity("");
    }
  };

  // Clear all history
  const clearHistory = () => {
    setStoredQuantities([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Handle leverage change
  const handleLeverageChange = (e) => {
    const { value } = e.target;
    const sanitized = Math.max(1, Number(value) || 1);
    handleChange({ target: { name: "leverage", value: sanitized } });
  };

  // Quick leverage select
  const handleLeverageSelect = (lev) => {
    handleChange({ target: { name: "leverage", value: lev } });
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <motion.div
      className="tradeGrid flexClm gap_16"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <div className="flexRow flexRow_stretch">
        <div className="flexClm">
          <span className="font_14 font_weight_600 black-text">Set Margin</span>
        </div>

        {/* History Toggle */}
        {storedQuantities.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowHistory(!showHistory)}
            className="flexRow gap_4 btn"
            style={{
              background: "var(--black-4)",
              border: "1px solid var(--border-color)",
              borderRadius: "30px",
              padding: "6px 12px",
            }}
          >
            <History size={14} className="black-text" />
            <span className="font_12 black-text">History</span>
            {showHistory ? (
              <ChevronUp size={14} className="black-text" />
            ) : (
              <ChevronDown size={14} className="black-text" />
            )}
          </motion.button>
        )}
      </div>

      {/* Main Input Section */}
      <div className="flexClm gap_16 width100">
        {/* Margin Input with Currency */}
        <div style={{ position: "relative", width: "100%" }}>
          <div
            style={{
              position: "absolute",
              left: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "16px",
              fontWeight: "600",
              color: "var(--primary)",
              zIndex: 1,
            }}
          >
            {currencySymbol}
          </div>
          <div className="flexRow" style={{ flex: "1" }}>
            <input
              type="number"
              name="quantityUSD"
              value={pendingQuantity}
              onChange={handleQuantityChange}
              onBlur={handleQuantityBlur}
              placeholder="0.00"
              min="0"
              step="any"
              className="font_16 flexRow"
              style={{ flex: "1", paddingLeft: "32px" }}
            />
          </div>

          {/* Clear Button */}
          {pendingQuantity > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                position: "absolute",
                right: "12px",
                top: "20%",
                transform: "translateY(-50%)",
                background: "var(--black-10)",
                border: "none",
                borderRadius: "50%",
                width: "28px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--black)",
              }}
              onClick={() => {
                setPendingQuantity("");
                handleChange({ target: { name: "quantityUSD", value: "" } });
              }}
              whileHover={{ scale: 1.1, background: "var(--error-10)" }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={14} />
            </motion.button>
          )}
        </div>

        {/* History Chips Section */}
        <AnimatePresence>
          {showHistory && storedQuantities.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flexClm gap_12"
              style={{ overflow: "hidden" }}
            >
              <div className="flexRow flexRow_stretch">
                <span className="font_12 black-text">Recent Quantities</span>
                <button
                  onClick={clearHistory}
                  className="font_12 error"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Clear All
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {storedQuantities.map((q) => (
                  <motion.div
                    key={q}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    style={{
                      background:
                        form.quantityUSD === q
                          ? "var(--primary)"
                          : "var(--card-bg)",
                      border: `1px solid ${
                        form.quantityUSD === q
                          ? "var(--primary)"
                          : "var(--border-color)"
                      }`,
                      borderRadius: "30px",
                      padding: "6px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleQuantitySelect(q)}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "500",
                        color:
                          form.quantityUSD === q
                            ? "white"
                            : "var(--text-primary)",
                      }}
                    >
                      {currencySymbol}
                      {q}
                    </span>
                    <button
                      onClick={(e) => removeQuantity(q, e)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: "2px",
                        display: "flex",
                        cursor: "pointer",
                        color:
                          form.quantityUSD === q
                            ? "white"
                            : "var(--text-secondary)",
                      }}
                    >
                      <X size={10} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Leverage Checkbox */}
        <label
          className="flexRow gap_8"
          style={{ cursor: "pointer", width: "fit-content" }}
        >
          <input
            type="checkbox"
            checked={showLeverage}
            onChange={(e) => setShowLeverage(e.target.checked)}
            style={{
              width: "18px",
              height: "18px",
              accentColor: "var(--primary)",
              cursor: "pointer",
            }}
          />
          <span className="font_14 black-text flexRow gap_4">
            <Zap size={16} className="primary" />
            Use Leverage
          </span>
        </label>

        {/* Leverage Section - Only shown when checkbox is checked */}
        <AnimatePresence>
          {showLeverage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flexClm gap_12"
              style={{ overflow: "hidden" }}
            >
              <div className="flexRow gap_12">
                <div style={{ flex: 1, position: "relative" }}>
                  <div className="flexRow" style={{ flex: "1" }}>
                    <input
                      type="number"
                      name="leverage"
                      value={form.leverage || "1"}
                      onChange={handleLeverageChange}
                      placeholder="Leverage"
                      min="1"
                      step="1"
                      className="font_14"
                      style={{
                        flex: "1",
                      }}
                    />
                  </div>

                  <span
                    style={{
                      position: "absolute",
                      right: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "var(--primary)",
                    }}
                  >
                    x
                  </span>
                </div>

                {/* Total Value Display */}
                {form.leverage > 0 && form.quantityUSD > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flexClm flex_center"
                    style={{
                      background: "var(--primary-10)",
                      padding: "8px 16px",
                      borderRadius: "12px",
                      minWidth: "120px",
                    }}
                  >
                    <span className="font_14 font_weight_600 black-text">
                      Total
                    </span>
                    <span className="font_14 font_weight_600 black-text">
                      {currencySymbol}
                      {(form.quantityUSD * form.leverage).toLocaleString()}
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Leverage Quick Select */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                {[2, 3, 5, 10, 20, 50, 100].map((lev) => (
                  <motion.button
                    key={lev}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleLeverageSelect(lev)}
                    className="btn font_14 font_weight_600"
                    style={{
                      flex: 1,
                      minWidth: "50px",
                      padding: "8px",
                      background:
                        form.leverage == lev
                          ? "var(--primary)"
                          : "var(--card-bg)",
                      border: `1px solid ${
                        form.leverage == lev
                          ? "var(--primary)"
                          : "var(--border-color)"
                      }`,
                      borderRadius: "10px",
                      color: form.leverage == lev ? "white" : "var(--black)",
                    }}
                  >
                    {lev}x
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default QuantityGrid;
