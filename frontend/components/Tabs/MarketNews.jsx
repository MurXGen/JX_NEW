"use client";

import React, { useEffect, useRef, useState } from "react";
import Timer from "../ui/Timer";
import SectionHeader from "../ui/SectionHeader";
import { ChevronDown, ChevronUp } from "lucide-react";

const MarketNews = () => {
  const globalRef = useRef(null);
  const indiaRef = useRef(null);
  const cryptoRef = useRef(null);
  const calendarRef = useRef(null);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [loadingIndia, setLoadingIndia] = useState(true);
  const [loadingCrypto, setLoadingCrypto] = useState(true);

  // Economic Calendar
  useEffect(() => {
    if (!calendarRef.current) return;
    calendarRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.async = true;

    script.textContent = JSON.stringify({
      colorTheme: "dark",
      isTransparent: false,
      locale: "en",
      width: "100%",
      height: 550,
      importanceFilter: "-1,0,1",
      countryFilter:
        "ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu",
    });

    script.onload = () => setLoadingCalendar(false);
    calendarRef.current.appendChild(script);
  }, []);

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

  // Add this to your component
  const [expandedSections, setExpandedSections] = useState({
    calendar: true,
    global: true,
    india: true,
    crypto: true,
  });

  const sectionRefs = {
    calendar: useRef(null),
    global: useRef(null),
    india: useRef(null),
    crypto: useRef(null),
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const scrollToSection = (section) => {
    sectionRefs[section].current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    // Main component JSX
    <section className="flexClm gap_24 heatmapsContainer">
      {/* Navigation Dots - Vertical Slider */}

      <div className="flexRow flexRow_stretch">
        <div className="flexRow gap_12">
          <div className="flexClm">
            <span className="font_24 font_weight_600">Heatmaps & Events</span>
          </div>
        </div>
      </div>

      <div className="flexClm gap_24">
        {/* Economic Calendar Section */}
        <div className="sectionWrapper" ref={sectionRefs.calendar}>
          <div
            className="sectionHeader"
            onClick={() => toggleSection("calendar")}
          >
            <div className="sectionHeaderContent">
              <div className="sectionTitle">
                <SectionHeader title="Economic Calendar" level={4} />
              </div>
              <div className="expandIcon">
                {expandedSections.calendar ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </div>
            </div>
          </div>

          <div
            className={`sectionContent ${expandedSections.calendar ? "expanded" : ""}`}
          >
            <div
              style={{ width: "100%", height: "550px", position: "relative" }}
            >
              {loadingCalendar && (
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
                ref={calendarRef}
                className="tradingview-widget-container"
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* Heatmaps Grid */}
        <div className="gridContainer">
          {/* Global Heatmap Section */}
          <div className="sectionWrapper" ref={sectionRefs.global}>
            <div
              className="sectionHeader"
              onClick={() => toggleSection("global")}
            >
              <div className="sectionHeaderContent">
                <div className="sectionTitle">
                  <SectionHeader title="Global Heatmap" level={4} />
                </div>
                <div className="expandIcon">
                  {expandedSections.global ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </div>
            </div>

            <div
              className={`sectionContent ${expandedSections.global ? "expanded" : ""}`}
            >
              <div
                style={{ width: "100%", height: "600px", position: "relative" }}
              >
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
          </div>

          {/* Indian Heatmap Section */}
          <div className="sectionWrapper" ref={sectionRefs.india}>
            <div
              className="sectionHeader"
              onClick={() => toggleSection("india")}
            >
              <div className="sectionHeaderContent">
                <div className="sectionTitle">
                  <SectionHeader title="India's Heatmap" level={4} />
                </div>
                <div className="expandIcon">
                  {expandedSections.india ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </div>
            </div>

            <div
              className={`sectionContent ${expandedSections.india ? "expanded" : ""}`}
            >
              <div
                style={{ width: "100%", height: "600px", position: "relative" }}
              >
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
          </div>

          {/* Crypto Heatmap Section */}
          <div className="sectionWrapper" ref={sectionRefs.crypto}>
            <div
              className="sectionHeader"
              onClick={() => toggleSection("crypto")}
            >
              <div className="sectionHeaderContent">
                <div className="sectionTitle">
                  <SectionHeader title="Crypto Heatmap" level={4} />
                </div>
                <div className="expandIcon">
                  {expandedSections.crypto ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </div>
            </div>

            <div
              className={`sectionContent ${expandedSections.crypto ? "expanded" : ""}`}
            >
              <div
                style={{ width: "100%", height: "600px", position: "relative" }}
              >
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
          </div>
        </div>
      </div>

      {/* Attribution */}
      <div
        className="font_12"
        style={{ textAlign: "center", color: "var(--white-50)" }}
      >
        Data provided by
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
