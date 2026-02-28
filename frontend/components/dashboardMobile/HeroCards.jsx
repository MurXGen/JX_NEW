"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { formatCurrency, formatNumber } from "@/utils/formatNumbers";

export default function HeroCards({
  balance = 0,
  netPnL = 0,
  winTrades = 0,
  loseTrades = 0,
  maxProfit = 0,
  maxLoss = 0,
  currencySymbol = "$",
}) {
  const contentRef = useRef(null);
  const [height, setHeight] = useState("auto");

  const pnlPositive = netPnL >= 0;

  const [open, setOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("hero_cards_open");
      return stored !== null ? JSON.parse(stored) : true;
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem("hero_cards_open", JSON.stringify(open));
  }, [open]);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(open ? `${contentRef.current.scrollHeight}px` : "0px");
    }
  }, [open]);

  return (
    <div className="flexClm">
      {/* Toggle Header */}
      <div
        className="flexRow stats-card radius-12 pad_16"
        style={{
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => setOpen(!open)}
      >
        <span className="font_14" style={{ fontWeight: 600 }}>
          Quick stats
        </span>

        <ChevronDown
          size={18}
          style={{
            transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </div>

      {/* Animated Container */}
      <div
        style={{
          height,
          transition:
            "height 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease",
          opacity: open ? 1 : 0,
        }}
      >
        <div ref={contentRef}>
          <div className="stats-cards">
            {/* Balance */}
            <div className="stats-card border-right">
              <span className="card-label">Balance</span>
              <span className="card-value">
                {formatCurrency(balance, currencySymbol)}
              </span>

              <div className="card-info">
                <span>PNL</span>
                <span className={pnlPositive ? "success" : "error"}>
                  {formatCurrency(netPnL, currencySymbol)}
                </span>
              </div>
            </div>

            {/* Trades Won */}
            <div className="stats-card">
              <span className="card-label">Trades won</span>
              <span className="card-value">{formatNumber(winTrades, 0)}</span>

              <div className="card-info">
                <span>High</span>
                <span className="success">
                  {formatCurrency(maxProfit, currencySymbol)}
                </span>
              </div>
            </div>

            {/* Trades Lost */}
            <div className="stats-card border-left">
              <span className="card-label">Trades lost</span>
              <span className="card-value">{formatNumber(loseTrades, 0)}</span>

              <div className="card-info">
                <span>Low</span>
                <span className="error">
                  {formatCurrency(maxLoss, currencySymbol)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
