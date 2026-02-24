import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, X } from "lucide-react";

const Ticker = ({ form, setForm }) => {
  const [storedSymbols, setStoredSymbols] = useState([]);
  const [filteredSymbols, setFilteredSymbols] = useState([]);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("tickers")) || [];
    setStoredSymbols(saved);
    setFilteredSymbols(saved);
  }, []);

  // 🔎 Handle typing
  const handleSymbolChange = (e) => {
    const upperValue = e.target.value.toUpperCase();
    setForm((prev) => ({ ...prev, symbol: upperValue }));

    if (upperValue.trim() === "") {
      // Show default suggestions when empty
      setFilteredSymbols(storedSymbols);
    } else {
      const filtered = storedSymbols.filter((sym) =>
        sym.toUpperCase().includes(upperValue),
      );
      setFilteredSymbols(filtered);
    }
  };

  // 💾 Save on blur
  const handleSymbolBlur = () => {
    const trimmed = form.symbol.trim();
    if (!trimmed) return;

    const saved = JSON.parse(localStorage.getItem("tickers")) || [];

    if (!saved.includes(trimmed)) {
      const updated = [trimmed, ...saved].slice(0, 10);
      localStorage.setItem("tickers", JSON.stringify(updated));
      setStoredSymbols(updated);
      setFilteredSymbols(updated);
    }
  };

  // ✅ Select from dropdown
  const handleSymbolSelect = (symbol) => {
    setForm((prev) => ({ ...prev, symbol }));
    setFilteredSymbols(storedSymbols);
    setIsFocused(false);
  };

  // ❌ Remove saved ticker
  const removeSymbol = (symbol) => {
    const updated = storedSymbols.filter((s) => s !== symbol);
    localStorage.setItem("tickers", JSON.stringify(updated));
    setStoredSymbols(updated);

    // Refresh suggestions if focused
    if (isFocused) {
      setFilteredSymbols(updated);
    }

    if (form.symbol === symbol) {
      setForm((prev) => ({ ...prev, symbol: "" }));
    }
  };

  // 🟢 Clear input
  const clearInput = () => {
    setForm((prev) => ({ ...prev, symbol: "" }));
    setFilteredSymbols(storedSymbols); // show suggestions again
  };

  return (
    <div className="">
      {/* Symbol Input with Clear Icon */}
      <div className="flexClm gap_24" style={{ position: "relative" }}>
        <div
          className="addTradeContainer width100"
          style={{ position: "relative" }}
        >
          <label className="font_14">Traded ticker</label>
          <input
            name="symbol"
            value={form.symbol}
            onChange={handleSymbolChange}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => {
              setTimeout(() => setIsFocused(false), 150); // small delay so clicks register
              handleSymbolBlur(e);
            }}
            placeholder=""
            autoComplete="off"
            style={{ paddingRight: "28px" }}
          />
          {/* Clear Input Icon */}
          {form.symbol && (
            <X
              size={16}
              style={{
                position: "absolute",
                right: 8,
                top: "70%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "var(--black)",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                clearInput();
              }}
            />
          )}
        </div>

        {/* Show ticker suggestions only if input is focused */}
        {isFocused && (
          <div
            className="flexRow gap_8 stats-card radius-12"
            style={{
              flexWrap: "wrap",
              boxShadow: "1px 1px 12px rgba(0,0,0,0.2)",
              padding: "8px",
              position: "absolute",
              top: "80px",
              left: "0",
              right: "0",
            }}
          >
            {filteredSymbols.length > 0 ? (
              filteredSymbols.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  className={`font_14 pad_16 flexRow flexRow_stretch btn gap_8 ${
                    form.symbol === sym ? "now" : ""
                  }`}
                  style={{ cursor: "pointer" }}
                  onMouseDown={() => handleSymbolSelect(sym)}
                >
                  <span>{sym}</span>
                  <X
                    size={12}
                    style={{ padding: "4px" }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      removeSymbol(sym);
                    }}
                  />
                </button>
              ))
            ) : (
              <div
                className="font_14"
                style={{
                  padding: "12px",
                  width: "100%",
                  textAlign: "center",
                  opacity: 0.6,
                }}
              >
                No traded ticker name found
              </div>
            )}
          </div>
        )}

        <div className="addTradeContainer width100">
          <label>Direction</label>

          <div className="flexRow flexRow_stretch gap_12 width100">
            <button
              type="button"
              className={`primary-btn secondary-btn width100 flexRow flex_center font_weight_600 direction-btn ${
                form.direction === "long" ? "longBg active" : ""
              }`}
              onClick={() => setForm({ ...form, direction: "long" })}
            >
              Long
              <span className="arrow-wrapper">
                <ArrowUpRight size={20} className="arrow-icon long-arrow" />
              </span>
            </button>

            <button
              type="button"
              className={`primary-btn secondary-btn width100 flexRow flex_center font_weight_600 direction-btn ${
                form.direction === "short" ? "shortBg active" : ""
              }`}
              onClick={() => setForm({ ...form, direction: "short" })}
            >
              Short
              <span className="arrow-wrapper">
                <ArrowDownRight size={20} className="arrow-icon short-arrow" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ticker;
