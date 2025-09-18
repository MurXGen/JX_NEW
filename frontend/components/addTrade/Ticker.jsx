import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const Ticker = ({ form, setForm }) => {
  const handleSymbolChange = (e) => {
    const upperValue = e.target.value.toUpperCase(); // ✅ force uppercase
    setForm({ ...form, symbol: upperValue });
  };

  return (
    <div className="tradeGrid">
      <span className="label">Ticker name</span>
      <div className="flexClm gap_12">
        <div className="inputLabelShift">
          <input
            name="symbol"
            value={form.symbol}
            onChange={handleSymbolChange} // ✅ overridden to capitalize
            placeholder="Ticker name"
          />
          <label>Ticker name</label>
        </div>

        <div
          className="flexRow flexRow_stretch gap_12"
          style={{ width: "100%" }}
        >
          <div
            className={`toggleOption button_sec flexRow flex_center ${
              form.direction === "long" ? "success" : ""
            }`}
            style={{ width: "100%" }}
            onClick={() => setForm({ ...form, direction: "long" })}
          >
            Long <ArrowUpRight size={20} />
          </div>
          <div
            className={`toggleOption button_sec flexRow flex_center ${
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
