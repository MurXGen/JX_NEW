"use client";

import React, { useState } from "react";
import Timer from "../ui/Timer";

const MarketNews = () => {
  const [loading, setLoading] = useState(true);

  return (
    <section
      className="chart_boxBg pad_16"
      style={{ display: "flex", flexDirection: "column", gap: "16px" }}
    >
      <Timer />

      {/* Calendar iframe with loader */}
      <div style={{ width: "100%", height: "600px", position: "relative" }}>
        {loading && (
          <div
            className="spinner"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 10,
            }}
          />
        )}

        <iframe
          src="https://tradingeconomics.com/calendar?embed=true"
          style={{ width: "100%", height: "100%", border: "0" }}
          title="Trading Economics Calendar"
          allowFullScreen
          onLoad={() => setLoading(false)}
        ></iframe>
      </div>

      {/* Legal credits */}
      <div
        className="font_12"
        style={{ textAlign: "center", color: "var(--white-50)" }}
      >
        Data provided by{" "}
        <a
          href="https://tradingeconomics.com/calendar"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--primary)", textDecoration: "underline" }}
        >
          Trading Economics
        </a>
      </div>
    </section>
  );
};

export default MarketNews;
