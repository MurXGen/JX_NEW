"use client";

/* Plan status banner — shows at the top of the dashboard on desktop AND
   mobile. Two states:
   • subscription inactive/expired → "upgrade now" (brand/urgent)
   • active 7-day trial ending within 5 days → countdown nudge
   Renders nothing when the user is comfortably active. */

import { Crown, Clock, ArrowRight } from "lucide-react";
import Button from "./Button";

export default function PlanBanner({ subscription, onUpgrade }) {
  const sub = subscription || {};
  const plan = (sub.plan || "free").toLowerCase();

  const expiresAt = sub.expiresAt ? new Date(sub.expiresAt) : null;
  const daysLeft = expiresAt
    ? Math.ceil((expiresAt.getTime() - Date.now()) / 864e5)
    : null;

  const isLifetime = plan.includes("lifetime");

  // Only show within 5 days of a dated plan ending (or already expired).
  // Healthy plans, lifetime, and plain free accounts show nothing.
  if (isLifetime || daysLeft == null || daysLeft > 5) return null;

  const expired = daysLeft <= 0;
  const mode = expired ? "expired" : "trial";
  const urgent = expired;
  const bg = urgent ? "var(--color-danger-subtle)" : "var(--color-primary-subtle)";
  const bd = urgent ? "var(--color-danger)" : "var(--color-primary)";
  const Icon = urgent ? Crown : Clock;

  const title = urgent
    ? "Your plan is inactive"
    : `Your Pro trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
  const sub2 = urgent
    ? "Upgrade to unlock unlimited trades, analytics and exports."
    : "Upgrade now to keep Pro features when your trial ends.";

  return (
    <div
      className="jx-planbanner"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        flexWrap: "wrap",
        padding: "12px 16px",
        marginBottom: "var(--space-4)",
        background: bg,
        border: `1px solid ${bd}`,
        borderRadius: "var(--radius-md)",
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: "var(--radius-md)",
          background: "var(--color-bg-surface)",
          color: urgent ? "var(--color-danger-strong)" : "var(--yellow-500)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </span>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ font: "var(--text-body-md)", fontWeight: 700 }}>{title}</div>
        <div style={{ font: "var(--text-caption)", color: "var(--color-text-secondary)" }}>{sub2}</div>
      </div>
      <Button variant="primary" icon={ArrowRight} onClick={onUpgrade} style={{ flexShrink: 0 }}>
        Upgrade
      </Button>
    </div>
  );
}
