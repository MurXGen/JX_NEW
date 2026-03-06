import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Zap,
} from "lucide-react";

const STORAGE_KEY = "quick_pnl_values";

const QuickSection = ({ currency, form, handleChange, setForm }) => {
  const [inputValue, setInputValue] = useState(form.pnl || "");
  const [savedPnLs, setSavedPnLs] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  if (form.tradeStatus !== "quick") return null;

  // Load saved PnLs from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      setSavedPnLs(saved);

      // Auto-fill with last used value if available and current is empty
      if (!form.pnl && saved.length > 0) {
        setForm((prev) => ({ ...prev, pnl: saved[0] }));
        setInputValue(saved[0]);
      }
    } catch (error) {
      console.error("Failed to load saved PnLs:", error);
    }
  }, []);

  // Update input when form changes externally
  useEffect(() => {
    setInputValue(form.pnl || "");
  }, [form.pnl]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
  };

  const handleInputBlur = () => {
    setIsFocused(false);

    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      setForm((prev) => ({ ...prev, pnl: numValue }));
      savePnL(numValue);
    } else if (inputValue === "") {
      setForm((prev) => ({ ...prev, pnl: "" }));
    }
  };

  const handleSignChange = (sign) => {
    const currentValue = parseFloat(inputValue) || 0;
    const newValue =
      sign === "positive" ? Math.abs(currentValue) : -Math.abs(currentValue);

    setInputValue(newValue);
    setForm((prev) => ({ ...prev, pnl: newValue }));
    savePnL(newValue);
  };

  const savePnL = (val) => {
    if (!val || val === 0) return;

    setSavedPnLs((prev) => {
      // Remove if exists
      const filtered = prev.filter((v) => v !== val);
      // Add to front, limit to 8
      const updated = [val, ...filtered].slice(0, 8);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save PnL:", error);
      }

      return updated;
    });
  };

  const handleQuickSelect = (val) => {
    setInputValue(val);
    setForm((prev) => ({ ...prev, pnl: val }));
    savePnL(val);
  };

  const removeSavedPnL = (val, e) => {
    e.stopPropagation();

    setSavedPnLs((prev) => {
      const updated = prev.filter((v) => v !== val);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (form.pnl === val) {
      setForm((prev) => ({ ...prev, pnl: "" }));
      setInputValue("");
    }
  };

  const clearHistory = () => {
    setSavedPnLs([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isPositive = parseFloat(inputValue) >= 0;
  const displayColor = isPositive ? "var(--success)" : "var(--error)";
  const bgColor = isPositive ? "var(--success-10)" : "var(--error-10)";

  // Quick amount buttons for easy entry
  const quickAmounts = [10, 25, 50, 100, 250, 500];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flexRow flexRow_stretch" style={{ marginBottom: "20px" }}>
        <div className="flexRow gap_8">
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "14px",
              background: bgColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: displayColor,
            }}
          >
            {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </div>
          <div className="flexClm ">
            <span className="font_14 black-text font_weight_600">
              Net Profit/Loss
            </span>
            <span className="font_12 black-text">Enter your trade outcome</span>
          </div>
        </div>

        {/* History Toggle */}
        {savedPnLs.length > 0 && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowHistory(!showHistory)}
            className="btn flexRow gap_4"
            style={{
              background: "var(--black-4)",
              border: "1px solid var(--border-color)",
              borderRadius: "30px",
              padding: "8px 16px",
            }}
          >
            <DollarSign size={14} style={{ color: "var(--primary)" }} />
            <span className="font_12 black-text">Recent</span>
            {showHistory ? (
              <ChevronUp size={14} className="black-text" />
            ) : (
              <ChevronDown size={14} className="black-text" />
            )}
          </motion.button>
        )}
      </div>

      {/* Main Input Section */}
      <div className="flexClm gap_16">
        {/* Big PnL Input - Payment App Style */}
        <div
          style={{
            position: "relative",
            background: "var(--black-4)",
            borderRadius: "20px",
            padding: "20px",
          }}
        >
          <div
            className="flexRow flexRow_stretch gap_24"
            style={{ alignItems: "center" }}
          >
            <div
              className="flexRow gap_16"
              style={{ flex: 1, alignItems: "center" }}
            >
              <span className="font_32">{currency}</span>
              <div className="flexRow" style={{ flex: "1" }}>
                <input
                  type="number"
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onFocus={() => setIsFocused(true)}
                  placeholder="0.00"
                  step="any"
                  className="quickPnl width100"
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: "48px",
                    fontWeight: "700",
                    outline: "none",
                    color: displayColor,
                    padding: 0,
                  }}
                />
              </div>
            </div>

            {/* Sign Toggle Buttons */}
            <div className="flexRow gap_8">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                className="btn flexRow"
                onClick={() => handleSignChange("positive")}
                style={{
                  background: isPositive ? "var(--success)" : "var(--black-4)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "14px",
                  padding: "12px",
                  color: isPositive ? "white" : "var(--text-secondary)",
                }}
              >
                <Plus size={20} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                className="btn flexRow"
                onClick={() => handleSignChange("negative")}
                style={{
                  background: !isPositive ? "var(--error)" : "var(--black-4)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "14px",
                  padding: "12px",
                  color: !isPositive ? "white" : "var(--text-secondary)",
                }}
              >
                <Minus size={20} />
              </motion.button>
            </div>
          </div>

          {/* Quick Amount Selector */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "20px",
            }}
          >
            {quickAmounts.map((amount) => (
              <motion.button
                key={amount}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => handleQuickSelect(amount)}
                className="btn"
              >
                <div className="flexRow gap_8">
                  {"+"}
                  <span>
                    {currency}
                    {amount}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* History Section */}
        <AnimatePresence>
          {showHistory && savedPnLs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: "hidden" }}
            >
              <div
                style={{
                  background: "var(--black-4)",
                  borderRadius: "16px",
                  padding: "16px",
                }}
              >
                <div
                  className="flexRow flexRow_stretch"
                  style={{ marginBottom: "12px" }}
                >
                  <span
                    className="font_12"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Recent PnL Values
                  </span>
                  <button
                    onClick={clearHistory}
                    className="font_12 error"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  {savedPnLs.map((val, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      style={{
                        background:
                          form.pnl === val
                            ? val >= 0
                              ? "var(--success)"
                              : "var(--error)"
                            : "var(--card-bg)",
                        border: `1px solid var(--border-color)`,
                        borderRadius: "30px",
                        padding: "8px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                      }}
                      onClick={() => handleQuickSelect(val)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color:
                            form.pnl === val
                              ? "white"
                              : val >= 0
                                ? "var(--success)"
                                : "var(--error)",
                        }}
                      >
                        {currency}
                        {Math.abs(val)}
                      </span>
                      <button
                        onClick={(e) => removeSavedPnL(val, e)}
                        style={{
                          background: "none",
                          border: "none",
                          padding: "2px",
                          display: "flex",
                          cursor: "pointer",
                          color:
                            form.pnl === val
                              ? "white"
                              : "var(--text-secondary)",
                        }}
                      >
                        <Minus size={10} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Stats */}
        {/* {inputValue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flexRow gap_16"
            style={{
              padding: "12px 16px",
              background: "var(--black-4)",
              borderRadius: "16px",
              justifyContent: "space-between",
            }}
          >
            <div className="flexRow gap_8">
              <Zap size={16} color="var(--primary)" />
              <span
                className="font_12"
                style={{ color: "var(--text-secondary)" }}
              >
                Quick Trade
              </span>
            </div>
            <div className="flexRow gap_4">
              <Sparkles size={14} color="var(--primary)" />
              <span className="font_12" style={{ color: "var(--primary)" }}>
                Auto-saved
              </span>
            </div>
          </motion.div>
        )} */}
      </div>
    </motion.div>
  );
};

export default QuickSection;
