"use client";

/* Settings — Plan & limits. Shows the user's current plan, usage of
   each limited resource (trades/month, journals, images/month) with
   progress bars, and an upgrade CTA when they're not on the top tier. */

import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { ArrowRight, Crown, Infinity as InfinityIcon } from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";
import { getPlanRules } from "@/utils/planRestrictions";
import { getFromIndexedDB } from "@/utils/indexedDB";

const sameMonth = (d) => {
  const x = new Date(d);
  const now = new Date();
  return x.getFullYear() === now.getFullYear() && x.getMonth() === now.getMonth();
};

function LimitBar({ label, used, limit, note }) {
  const unlimited = limit === Infinity || limit == null;
  const pct = unlimited ? 0 : Math.min(100, (used / limit) * 100);
  const near = !unlimited && pct >= 80;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", font: "var(--text-small)" }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
          {unlimited ? (
            <><InfinityIcon size={14} /> Unlimited</>
          ) : (
            <span style={{ color: near ? "var(--color-danger)" : "var(--color-text-muted)", fontWeight: near ? 600 : 400 }}>
              {used} / {limit}
            </span>
          )}
        </span>
      </div>
      {!unlimited && (
        <div className="jx-progress" style={{ height: 6 }}>
          <div
            style={{
              width: `${pct}%`,
              background: near ? "var(--color-danger)" : "var(--color-primary)",
              borderRadius: 999,
              transition: "width 0.9s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </div>
      )}
      {note && <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{note}</span>}
    </div>
  );
}

function SubItem({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </span>
      <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{children}</span>
    </div>
  );
}

export default function PlanLimitsCard() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    (async () => {
      try { setUserData(await getFromIndexedDB("user-data")); } catch {}
    })();
  }, []);

  const { rules, planName, isTop, usage, sub, status } = useMemo(() => {
    const rules = getPlanRules(userData);
    const sub = userData?.subscription || {};
    const plan = (sub.plan || "free").toLowerCase();
    const status = sub.status || "none";
    const planName =
      status === "active" && plan.includes("lifetime") ? "Lifetime"
      : status === "active" && plan.includes("pro") ? "Pro"
      : "Free";
    const isTop = planName === "Pro" || planName === "Lifetime";

    const accountId = Cookies.get("accountId");
    const trades = (userData?.trades || []).filter((t) => !accountId || t.accountId === accountId);
    const monthTrades = trades.filter((t) => t.openTime && sameMonth(t.openTime));
    const closedThisMonth = monthTrades.filter((t) => t.tradeStatus !== "running").length;
    const accounts = (userData?.accounts || []).length;
    const imagesThisMonth = monthTrades.reduce(
      (n, t) => n + (t.openImageUrl ? 1 : 0) + (t.closeImageUrl ? 1 : 0) + (Array.isArray(t.images) ? t.images.length : 0),
      0,
    );

    return { rules, planName, isTop, usage: { closedThisMonth, accounts, imagesThisMonth }, sub, status };
  }, [userData]);

  const L = rules.limits;

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
      : null;
  const startStr = fmtDate(sub?.startAt);
  const expiresStr = fmtDate(sub?.expiresAt);
  const isActive = status === "active";
  const isLifetime = planName === "Lifetime";
  // days remaining (only meaningful for an active, dated subscription)
  const daysLeft =
    isActive && sub?.expiresAt
      ? Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 864e5)
      : null;

  return (
    <div className="jx-card">
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: 4 }}>
        <span className="jx-card__title">Plan &amp; limits</span>
        <Badge variant={isTop ? "success" : "neutral"}>
          {isTop && <Crown size={11} />} {planName} plan
        </Badge>
        {!isTop && (
          <a href="/pricing" style={{ marginLeft: "auto", textDecoration: "none" }}>
            <Button variant="primary" size="sm" icon={Crown}>Upgrade</Button>
          </a>
        )}
      </div>
      <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-4)" }}>
        {isTop
          ? "You're on a premium plan — enjoy unlimited logging and analytics."
          : "Usage for the current journal this month. Upgrade for unlimited everything."}
      </div>

      {/* Subscription details */}
      {(isActive || startStr || expiresStr) && (
        <div
          style={{
            marginBottom: "var(--space-4)",
            padding: "var(--space-4)",
            background: "var(--color-bg-muted)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "var(--space-3) var(--space-5)",
          }}
        >
          <SubItem label="Status">
            <Badge variant={isActive ? "success" : "neutral"}>
              <span style={{ textTransform: "capitalize" }}>
                {isActive ? "Active" : status === "none" ? "No subscription" : status}
              </span>
            </Badge>
          </SubItem>
          {sub?.type && (
            <SubItem label="Billing">
              <span style={{ textTransform: "capitalize" }}>
                {sub.type === "one-time" ? "One-time" : sub.type}
              </span>
            </SubItem>
          )}
          {startStr && <SubItem label="Started">{startStr}</SubItem>}
          {!isLifetime && expiresStr && (
            <SubItem label={isActive ? "Renews / expires" : "Expired"}>
              {expiresStr}
              {daysLeft != null && daysLeft >= 0 && (
                <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", display: "block" }}>
                  {daysLeft} day{daysLeft === 1 ? "" : "s"} left
                </span>
              )}
            </SubItem>
          )}
          {isLifetime && <SubItem label="Expires">Never — lifetime access</SubItem>}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <LimitBar label="Trades this month" used={usage.closedThisMonth} limit={L.tradeLimitPerMonth} note="Resets at the start of each month" />
        <LimitBar label="Journals" used={usage.accounts} limit={L.accountLimit} />
        {/* images are gated per trade, not per month */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", font: "var(--text-small)" }}>
          <span style={{ fontWeight: 600 }}>Screenshots per trade</span>
          <Badge variant="neutral">
            {L.imagesPerTrade === Infinity ? "Unlimited" : `${L.imagesPerTrade} per trade`}
          </Badge>
        </div>
      </div>

      {!isTop && (
        <div
          style={{
            marginTop: "var(--space-4)",
            background: "var(--color-primary-subtle)",
            border: "1px solid var(--color-primary)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            flexWrap: "wrap",
          }}
        >
          <Crown size={20} style={{ color: "var(--yellow-500)", flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 180 }}>
            <span style={{ font: "var(--text-body-md)", fontWeight: 600, display: "block" }}>Go unlimited with Pro</span>
            <span style={{ font: "var(--text-caption)", color: "var(--color-text-secondary)" }}>
              Unlimited trades, more journals, image uploads, exports, sharing & advanced analytics.
            </span>
          </span>
          <a href="/pricing" style={{ textDecoration: "none" }}>
            <Button variant="primary" icon={ArrowRight}>See plans</Button>
          </a>
        </div>
      )}
    </div>
  );
}
