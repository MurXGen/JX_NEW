"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import Badge from "./Badge";

/**
 * revampV2 TradesTable — recent trades list per Figma table styling.
 * trades: [{ symbol|ticker, direction, pnl, closeTime, totalQuantity }]
 */
export default function TradesTable({ trades = [], currencySymbol = "$", limit = 8 }) {
  const rows = [...trades]
    .filter((t) => t.closeTime)
    .sort((a, b) => new Date(b.closeTime) - new Date(a.closeTime))
    .slice(0, limit);

  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-muted)",
          font: "var(--text-body)",
        }}
      >
        No closed trades yet — log your first trade to see it here.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="jx-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Side</th>
            <th>Qty</th>
            <th>Closed</th>
            <th style={{ textAlign: "right" }}>P&L</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => {
            const isLong = t.direction?.toLowerCase() === "long";
            const pnl = Number(t.pnl) || 0;
            return (
              <tr key={t._id || i}>
                <td style={{ fontWeight: 600 }}>{t.symbol || t.ticker || "—"}</td>
                <td>
                  <Badge
                    variant={isLong ? "success" : "danger"}
                    icon={isLong ? TrendingUp : TrendingDown}
                  >
                    {isLong ? "Buy / Long" : "Sell / Short"}
                  </Badge>
                </td>
                <td>{t.totalQuantity ?? "—"}</td>
                <td>
                  {t.closeTime
                    ? new Date(t.closeTime).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })
                    : "—"}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontWeight: 600,
                    color:
                      pnl >= 0 ? "var(--color-success)" : "var(--color-danger)",
                  }}
                >
                  {pnl >= 0 ? "+" : "−"}
                  {currencySymbol}
                  {Math.abs(pnl).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
