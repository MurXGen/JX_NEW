import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, X } from "lucide-react";

const Ticker = ({ form, setForm }) => {
  const [storedSymbols, setStoredSymbols] = useState([]);
  const [filteredSymbols, setFilteredSymbols] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("tickers")) || [];
    setStoredSymbols(saved);
    setFilteredSymbols(saved);
  }, []);

  const handleSymbolChange = (e) => {
    const upperValue = e.target.value.toUpperCase();
    setForm((prev) => ({ ...prev, symbol: upperValue }));

    if (isSelecting) return;

    if (upperValue.trim()) {
      const filtered = storedSymbols.filter((sym) =>
        sym.toUpperCase().includes(upperValue)
      );
      setFilteredSymbols(filtered);
    } else {
      setFilteredSymbols(storedSymbols);
    }
  };

  const handleSymbolBlur = () => {
    if (isSelecting) return;

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

  const handleSymbolSelect = (symbol) => {
    setIsSelecting(true);
    setForm((prev) => ({ ...prev, symbol }));
    setFilteredSymbols([]);
    setTimeout(() => setIsSelecting(false), 200);
  };

  const removeSymbol = (symbol) => {
    const updated = storedSymbols.filter((s) => s !== symbol);
    localStorage.setItem("tickers", JSON.stringify(updated));
    setStoredSymbols(updated);
    setFilteredSymbols(updated);
    if (form.symbol === symbol) setForm((prev) => ({ ...prev, symbol: "" }));
  };

  // 🟢 Clear input function
  const clearInput = () => setForm((prev) => ({ ...prev, symbol: "" }));

  return (
    <div className="tradeGrid">
      {/* Symbol Input with Clear Icon */}
      <div className="flexRow gap_12" style={{ position: "relative" }}>
        <div className="inputLabelShift flexRow gap_12">
          <input
            name="symbol"
            value={form.symbol}
            onChange={handleSymbolChange}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => {
              setTimeout(() => setIsFocused(false), 150); // small delay so clicks register
              handleSymbolBlur(e);
            }}
            placeholder="Traded symbol : Nifty, Bitcoin etf.."
            autoComplete="off"
            style={{ paddingRight: "28px" }}
          />
          <label>Traded symbol</label>

          {/* Clear Input Icon */}
          {form.symbol && (
            <X
              size={16}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "#888",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                clearInput();
              }}
            />
          )}
        </div>

        {/* Long / Short Buttons */}
        <div className="flexRow flexRow_stretch gap_12">
          <div
            className={`button_sec flexRow flex_center font_weight_600 ${
              form.direction === "long" ? "longBg" : ""
            }`}
            style={{ width: "100%" }}
            onClick={() => setForm({ ...form, direction: "long" })}
          >
            Long <ArrowUpRight size={20} />
          </div>
          <div
            className={`button_sec flexRow flex_center font_weight_600 ${
              form.direction === "short" ? "shortBg" : ""
            }`}
            style={{ width: "100%" }}
            onClick={() => setForm({ ...form, direction: "short" })}
          >
            Short <ArrowDownRight size={20} />
          </div>
        </div>
      </div>

      {/* Show ticker suggestions only if input is focused */}
      {isFocused && filteredSymbols.length > 0 && (
        <div
          className="flexClm gap_8 flexRow_scroll removeScrollBar"
          style={{
            background: "var(--white-4)",
            borderRadius: "var(--px-12)",
            maxHeight: "150px",
            overflowY: "auto",
          }}
        >
          {filteredSymbols.map((sym) => (
            <div
              key={sym}
              className={`font_14 pad_16 flexRow flexRow_stretch gap_8 ${
                form.symbol === sym ? "selected" : ""
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Ticker;
