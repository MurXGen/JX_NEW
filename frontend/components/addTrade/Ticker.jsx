import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import Dropdown from "@/components/ui/Dropdown"; // ✅ adjust import path as needed

const Ticker = ({ form, setForm }) => {
  const [storedSymbols, setStoredSymbols] = useState([]);
  const [filteredSymbols, setFilteredSymbols] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("tickers")) || [];
    setStoredSymbols(saved);
    setFilteredSymbols(saved);
  }, []);

  const handleSymbolChange = (e) => {
    const upperValue = e.target.value.toUpperCase();
    setForm({ ...form, symbol: upperValue });

    // Filter stored symbols dynamically
    if (upperValue.trim()) {
      const filtered = storedSymbols.filter((sym) => sym.includes(upperValue));
      setFilteredSymbols(filtered);
    } else {
      setFilteredSymbols(storedSymbols);
    }
  };

  const handleSymbolBlur = () => {
    const trimmed = form.symbol.trim();
    if (!trimmed) return;

    // Save to localStorage if new
    const saved = JSON.parse(localStorage.getItem("tickers")) || [];
    if (!saved.includes(trimmed)) {
      const updated = [trimmed, ...saved].slice(0, 10); // limit to 10
      localStorage.setItem("tickers", JSON.stringify(updated));
      setStoredSymbols(updated);
      setFilteredSymbols(updated);
    }
  };

  const handleSymbolSelect = (symbol) => {
    setForm({ ...form, symbol });
  };

  return (
    <div className="tradeGrid">
      <div className="flexClm gap_12">
        {/* Symbol Input with Dropdown */}
        <div className="inputLabelShift">
          <input
            name="symbol"
            value={form.symbol}
            onChange={handleSymbolChange}
            onBlur={handleSymbolBlur}
            placeholder="Ticker name"
            autoComplete="off"
          />
          <label>Ticker name</label>
        </div>

        {/* Only show dropdown if there are suggestions */}
        {filteredSymbols.length > 0 && (
          <Dropdown
            options={filteredSymbols.map((sym) => ({
              value: sym,
              label: sym,
            }))}
            value={form.symbol}
            onChange={handleSymbolSelect}
            placeholder="Select recent ticker"
          />
        )}

        {/* Long / Short Buttons */}
        <div
          className="flexRow flexRow_stretch gap_12"
          style={{ width: "100%" }}
        >
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
    </div>
  );
};

export default Ticker;
