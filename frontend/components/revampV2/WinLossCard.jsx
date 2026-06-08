"use client";

/**
 * revampV2 WinLossCard — win/loss split with progress bar.
 */
export default function WinLossCard({ title, total, wins, losses }) {
  const winPct = total ? (wins / total) * 100 : 0;
  const lossPct = total ? (losses / total) * 100 : 0;

  return (
    <div className="jx-card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="jx-card__title">{title}</span>
        <span style={{ font: "var(--text-body-md)", color: "var(--color-text-muted)" }}>
          {total ?? 0} trades
        </span>
      </div>

      <div className="jx-progress">
        <div className="jx-progress__win" style={{ width: `${winPct}%` }} />
        <div className="jx-progress__loss" style={{ width: `${lossPct}%` }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", font: "var(--text-caption)" }}>
        <span style={{ color: "var(--color-success)" }}>Wins: {wins}</span>
        <span style={{ color: "var(--color-danger)" }}>Losses: {losses}</span>
      </div>
    </div>
  );
}
