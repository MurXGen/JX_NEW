"use client";

import { TrendingUp, TrendingDown, CircleDollarSign } from "lucide-react";

/**
 * Analytics stat card — Figma "Components / Stat Cards".
 * props: label, value, delta (number, %), deltaLabel, icon, bars (number[])
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
          <span className={`jx-badge ${isUp ? "jx-badge--success" : "jx-badge--danger"}`}>
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta)}%
          </span>
          {deltaLabel}
        </span>
      )}

      {bars && bars.length > 0 && (
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 36 }}>
          {bars.map((v, i) => (
            <span
              key={i}
              style={{
                width: 6,
                borderRadius: 3,
                height: `${Math.max(15, Math.min(100, Math.abs(v)))}%`,
                background:
                  i === bars.length - 1
                    ? "var(--color-primary)"
                    : v >= 0
                      ? "var(--color-success)"
                      : "var(--color-danger)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
