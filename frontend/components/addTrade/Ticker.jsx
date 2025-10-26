import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, X } from "lucide-react";
import { getFromIndexedDB, saveToIndexedDB } from "../utils/indexedDB"; // ✅ your existing helper

const Ticker = ({ form, setForm }) => {
  const [storedSymbols, setStoredSymbols] = useState([]);
  const [filteredSymbols, setFilteredSymbols] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_KEY = import.meta.env.VITE_TWELVE_DATA_API_KEY; // ✅ Twelve Data API key
  const API_URL = "https://api.twelvedata.com/price";

  // 🧠 Load previously searched tickers from IndexedDB
  useEffect(() => {
    const loadTickers = async () => {
      const saved = (await getFromIndexedDB("searched-tickers")) || [];
      setStoredSymbols(saved);
      setFilteredSymbols(saved);
    };
    loadTickers();
  }, []);

  // 🕵️ Handle search input
  const handleSymbolChange = async (e) => {
    const upperValue = e.target.value.toUpperCase();
    setForm((prev) => ({ ...prev, symbol: upperValue }));

    if (isSelecting) return;

    // Show locally stored tickers first
    if (upperValue.trim()) {
      const filtered = storedSymbols.filter((sym) =>
        sym.symbol.toUpperCase().includes(upperValue)
      );
      setFilteredSymbols(filtered);
    } else {
      setFilteredSymbols(storedSymbols);
    }
  };

  // 📈 Fetch live price and store in IndexedDB
  const fetchAndStoreTicker = async (symbol) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}?symbol=${symbol}/USD&apikey=${API_KEY}`
      );
      const data = await res.json();

      if (data?.price) {
        const newEntry = {
          symbol: `${symbol.toUpperCase()}USDT`,
          price: parseFloat(data.price),
          timestamp: Date.now(),
        };

        const existing = (await getFromIndexedDB("searched-tickers")) || [];
        const updated = [
          newEntry,
          ...existing.filter((t) => t.symbol !== newEntry.symbol),
        ].slice(0, 10);

        await saveToIndexedDB("searched-tickers", updated);
        setStoredSymbols(updated);
        setFilteredSymbols(updated);
      }
    } catch (err) {
      console.error("Error fetching price:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ On blur (user finished typing), fetch from API if not in cache
  const handleSymbolBlur = async () => {
    if (isSelecting) return;
    const trimmed = form.symbol.trim();
    if (!trimmed) return;

    const existing = storedSymbols.find((t) =>
      t.symbol.toUpperCase().includes(trimmed.toUpperCase())
    );
    if (!existing) {
      await fetchAndStoreTicker(trimmed);
    }
  };

  const handleSymbolSelect = (symbol) => {
    setIsSelecting(true);
    setForm((prev) => ({ ...prev, symbol: symbol.symbol }));
    setFilteredSymbols([]);
    setTimeout(() => setIsSelecting(false), 200);
  };

  const removeSymbol = async (symbol) => {
    const updated = storedSymbols.filter((s) => s.symbol !== symbol);
    await saveToIndexedDB("searched-tickers", updated);
    setStoredSymbols(updated);
    setFilteredSymbols(updated);
    if (form.symbol === symbol) setForm((prev) => ({ ...prev, symbol: "" }));
  };

  const clearInput = () => setForm((prev) => ({ ...prev, symbol: "" }));

  return (
    <div className="tradeGrid flexClm gap_12">
      {/* Symbol Input */}
      <div className="inputLabelShift" style={{ position: "relative" }}>
        <input
          name="symbol"
          value={form.symbol}
          onChange={handleSymbolChange}
          onBlur={handleSymbolBlur}
          placeholder="Ticker name (e.g. BTC)"
          autoComplete="off"
          style={{ paddingRight: "28px" }}
        />
        <label>Ticker name</label>

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

      {/* Suggested / Cached Tickers */}
      {filteredSymbols.length > 0 && (
        <div
          className="flexRow gap_8 flexRow_scroll removeScrollBar"
          style={{ marginTop: 8 }}
        >
          {filteredSymbols.map((sym) => (
            <div
              key={sym.symbol}
              className={`button_ter font_14 flexRow flex_center gap_8 ${
                form.symbol === sym.symbol ? "selected" : ""
              }`}
              onMouseDown={() => handleSymbolSelect(sym)}
            >
              <span>
                {sym.symbol}{" "}
                <span style={{ color: "#888", fontSize: "12px" }}>
                  (${sym.price})
                </span>
              </span>
              <X
                size={12}
                className="chart_boxBg"
                style={{ padding: "4px" }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  removeSymbol(sym.symbol);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {loading && <p style={{ fontSize: "13px" }}>Fetching live price...</p>}

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
