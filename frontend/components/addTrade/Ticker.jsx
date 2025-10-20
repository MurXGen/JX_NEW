import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, X } from "lucide-react";

const Ticker = ({ form, setForm }) => {
  const [storedSymbols, setStoredSymbols] = useState([]);
  const [filteredSymbols, setFilteredSymbols] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);

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
    <div className="tradeGrid flexClm gap_12">
      {/* Symbol Input with Clear Icon */}
      <div className="inputLabelShift" style={{ position: "relative" }}>
        <input
          name="symbol"
          value={form.symbol}
          onChange={handleSymbolChange}
          onBlur={handleSymbolBlur}
          placeholder="Ticker name"
          autoComplete="off"
          style={{ paddingRight: "28px" }} // space for X icon
        />
        <label>Ticker name</label>

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
              e.preventDefault(); // prevent blur
              clearInput();
            }}
          />
        )}
      </div>

      {/* Chip-style suggestions */}
      {filteredSymbols.length > 0 && (
        <div
          className="flexRow gap_8 flexRow_scroll removeScrollBar"
          style={{ marginTop: 8 }}
        >
          {filteredSymbols.map((sym) => (
            <div
              key={sym}
              className={`button_ter font_14 flexRow flex_center gap_8 ${
                form.symbol === sym ? "selected" : ""
              }`}
              onMouseDown={() => handleSymbolSelect(sym)}
            >
              <span>{sym}</span>
              <X
                size={12}
                className="chart_boxBg"
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

      <hr width={100} color="grey" />

      {/* Long / Short Buttons */}
      <div className="flexRow flexRow_stretch gap_12" style={{ width: "100%" }}>
        <div
          className={`button_sec flexRow flex_center ${
            form.direction === "long" ? "success" : ""
          }`}
          style={{ width: "100%" }}
          onClick={() => setForm({ ...form, direction: "long" })}
        >
          Long <ArrowUpRight size={20} />
        </div>
        <div
          className={`button_sec flexRow flex_center ${
            form.direction === "short" ? "error" : ""
          }`}
          style={{ width: "100%" }}
          onClick={() => setForm({ ...form, direction: "short" })}
        >
          Short <ArrowDownRight size={20} />
        </div>
      </div>
    </div>
  );
};

export default Ticker;
