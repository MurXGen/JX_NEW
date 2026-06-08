"use client";

import { TrendingUp, TrendingDown, CircleDollarSign } from "lucide-react";

/**
 * revampV2 StatCard — Figma "Components / Stat Cards"
 * props:
 *  label, value          — required
 *  delta (number %), deltaLabel
 *  icon (lucide component)
 *  bars (number[])       — mini bar sparkline, sign decides color
 *  positive (bool)       — force delta direction
 */
export default function StatCard({
  label,
  value,
  delta,
  deltaLabel = "vs last week",
  icon: Icon = CircleDollarSign,
  bars,
  positive,
}) {
  const isUp = positive !== undefined ? positive : (delta ?? 0) >= 0;

  return (
    <div className="jx-stat-card">
      <div className="jx-stat-card__head">
        <span className="jx-stat-card__label">{label}</span>
        <span className="jx-stat-card__icon">
          <Icon size={16} />
        </span>
      </div>

      <span className="jx-stat-card__value">{value}</span>

      {delta !== undefined && (
        <span className="jx-stat-card__delta">
          <span
            className={`jx-badge ${isUp ? "jx-badge--success" : "jx-badge--danger"}`}
          >
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(Number(delta)).toFixed(1)}%
          </span>
          {deltaLabel}
        </span>
      )}

      {bars && bars.length > 0 && (
        <div
          style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 36 }}
        >
          {bars.map((v, i) => {
            const max = Math.max(...bars.map((b) => Math.abs(b)), 1);
            return (
              <span
                key={i}
                style={{
                  width: 6,
                  borderRadius: 3,
                  height: `${Math.max(15, (Math.abs(v) / max) * 100)}%`,
                  background:
                    i === bars.length - 1
                      ? "var(--color-primary)"
                      : v >= 0
                        ? "var(--color-success)"
                        : "var(--color-danger)",
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
