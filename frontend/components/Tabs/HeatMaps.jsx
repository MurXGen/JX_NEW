"use client";

import React, { useEffect, useRef, useState } from "react";
import Timer from "../ui/Timer";
import SectionHeader from "../ui/SectionHeader";

const MarketNews = () => {
  const globalRef = useRef(null);
  const indiaRef = useRef(null);
  const cryptoRef = useRef(null);

  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [loadingIndia, setLoadingIndia] = useState(true);
  const [loadingCrypto, setLoadingCrypto] = useState(true);

  // Global Market (SPX500)
  useEffect(() => {
    if (!globalRef.current) return;
    globalRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js";
    script.async = true;

    script.textContent = JSON.stringify({
      dataSource: "SPX500",
      blockSize: "market_cap_basic",
      blockColor: "change",
      grouping: "sector",
      locale: "en",
      colorTheme: "dark",
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: "100%",
      height: "600",
    });

    script.onload = () => setLoadingGlobal(false);
    globalRef.current.appendChild(script);
  }, []);

  // Indian Market (SENSEX)
  useEffect(() => {
    if (!indiaRef.current) return;
    indiaRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js";
    script.async = true;

    script.textContent = JSON.stringify({
      dataSource: "SENSEX",
      blockSize: "market_cap_basic",
      blockColor: "change",
      grouping: "sector",
      locale: "en",
      colorTheme: "dark",
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: "100%",
      height: "600",
    });

    script.onload = () => setLoadingIndia(false);
    indiaRef.current.appendChild(script);
  }, []);

  // Crypto Heatmap
  useEffect(() => {
    if (!cryptoRef.current) return;
    cryptoRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js";
    script.async = true;

    script.textContent = JSON.stringify({
      dataSource: "Crypto",
      blockSize: "market_cap_calc",
      blockColor: "24h_close_change|5",
      locale: "en",
      symbolUrl: "",
      colorTheme: "dark",
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: "100%",
      height: "600",
    });

    script.onload = () => setLoadingCrypto(false);
    cryptoRef.current.appendChild(script);
  }, []);

  return (
    <section className="flexClm gap_24">
      <Timer />

      {/* Global Heatmap */}
      <div className="flexClm gap_24">
        <SectionHeader
          title="Global Heatmap"
          description="Heatmap helps in analysing trends"
          level={2}
        />
        <div style={{ width: "100%", height: "600px", position: "relative" }}>
          {loadingGlobal && (
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
          <div
            ref={globalRef}
            className="tradingview-widget-container"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>

      <hr color="grey" width="100" />

      {/* Indian Heatmap */}
      <div className="flexClm gap_24">
        <SectionHeader title="India's Heatmap" level={2} />
        <div style={{ width: "100%", height: "600px", position: "relative" }}>
          {loadingIndia && (
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
          <div
            ref={indiaRef}
            className="tradingview-widget-container"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>

      <hr color="grey" width="100" />

      {/* Crypto Heatmap */}
      <div className="flexClm gap_24">
        <SectionHeader title="Crypto Heatmap" level={2} />
        <div style={{ width: "100%", height: "600px", position: "relative" }}>
          {loadingCrypto && (
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
          <div
            ref={cryptoRef}
            className="tradingview-widget-container"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>

      {/* Attribution */}
      <div
        className="font_12"
        style={{ textAlign: "center", color: "var(--white-50)" }}
      >
        Data provided by{" "}
        <a
          href="https://www.tradingview.com/heatmap/stock/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--primary)", textDecoration: "underline" }}
        >
          TradingView
        </a>
      </div>
    </section>
  );
};

export default MarketNews;
