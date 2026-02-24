"use client";

import React from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { ArrowUpIcon, ArrowDownIcon, Crown } from "lucide-react";
import { formatCurrency } from "@/utils/formatNumbers";

const dummyTrades = [
  {
    id: "1",
    symbol: "AAPL",
    pnl: 1240.56,
    direction: "long",
    openTime: "2025-02-01T09:30:00",
    closeTime: "2025-02-01T11:30:00",
    duration: 2,
  },
  {
    id: "2",
    symbol: "TSLA",
    pnl: -540.12,
    direction: "short",
    openTime: "2025-02-01T12:00:00",
    closeTime: "2025-02-01T13:00:00",
    duration: 1,
  },
  {
    id: "3",
    symbol: "BTCUSDT",
    pnl: 3240.22,
    direction: "long",
    openTime: "2025-02-01T14:00:00",
    closeTime: "2025-02-01T17:00:00",
    duration: 3,
  },
];

const LockedTradesPreview = () => {
  const router = useRouter();
  const headerDate = new Date("2025-02-01");

  return (
    <div className="lockedWrapper">
      {/* Overlay */}
      <div className="lockedOverlay">
        <button
          className="upgrade_btn flexRow gap_8 flex_center"
          onClick={() => router.push("/pricing")}
        >
          <Crown size={16} /> Unlock 30+ Days
        </button>
      </div>

      {/* Blurred Content */}
      <div className="lockedContent">
        <div className="tradeCards flexClm">
          {/* Date Header */}
          <motion.div
            className="dateHeader flexRow flexRow_stretch"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flexRow flexRow_stretch width100">
              <div className="flexRow gap_8">
                <span className="dayPart">
                  {headerDate.toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
                </span>

                {"|"}

                <span className="datePart">
                  {headerDate.toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              <span className="daysAgo">Locked Preview</span>
            </div>
          </motion.div>

          {/* Trades List */}
          <div className="flexClm gap_12">
            {dummyTrades.map((trade, index) => (
              <motion.div
                key={trade.id}
                className="tradeCard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className="flexRow flexRow_stretch">
                  <div className="flexRow gap_12">
                    <div className={`positionIcon ${trade.direction}`}>
                      {trade.direction === "long" ? (
                        <ArrowUpIcon size={20} />
                      ) : (
                        <ArrowDownIcon size={20} />
                      )}
                    </div>

                    <div className="flexClm">
                      <span className="font_16 font_weight_600">
                        {trade.symbol}
                      </span>
                      <span className="font_14 gap_8">
                        {new Date(trade.openTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" → "}
                        {new Date(trade.closeTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {trade.duration > 0 && (
                          <span style={{ paddingLeft: "4px" }}>
                            | {trade.duration}hr
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`font_16 ${
                      trade.pnl >= 0 ? "success" : "error"
                    }`}
                  >
                    {trade.pnl > 0 ? "+" : ""}
                    {formatCurrency(trade.pnl)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LockedTradesPreview;
