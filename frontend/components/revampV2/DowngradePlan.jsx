"use client";

/* Settings → Plan & billing: "Switch to Free".
   - Paddle subscriptions are cancelled at the end of the paid period, so the
     user keeps Pro until then and is never charged again (undo available).
   - Trials / crypto / other non-renewing plans switch immediately.
   - Lifetime has nothing to cancel; Google Play plans are managed in Play.
   A confirmation modal spells out exactly what changes before anything runs. */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CalendarClock, Loader2, X } from "lucide-react";
import { PLAN_RULES } from "@/utils/planRestrictions";
import { saveToIndexedDB } from "@/utils/indexedDB";
import d from "./DowngradePlan.module.css";

const API = process.env.NEXT_PUBLIC_API_URL;
const F = PLAN_RULES.free.limits;
const LOSSES = [
  `Logging drops to ${F.tradeLimitPerMonth} trades a month`,
  `Only your last ${F.historyDays} days of history stay visible`,
  `Free includes ${F.accountLimit} journal`,
  "Advanced analytics, exports and exchange auto-sync lock",
];

const fmt = (x) => (x ? new Date(x).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : null);

async function refreshUser() {
  try {
    const res = await fetch(`${API}/api/auth/user-info`, { credentials: "include" });
    const json = await res.json();
    const userData = json?.userData || json;
    if (userData) await saveToIndexedDB("user-data", userData);
    window.dispatchEvent(new CustomEvent("jx-sub-changed"));
  } catch {}
}

export default function DowngradePlan({ sub = {} }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const source = sub.source || "none";
  const recurring = source === "paddle" && (sub.type || "") === "recurring";
  const until = fmt(sub.expiresAt);
  const cancelAt = fmt(sub.cancelAt);
  const daysLeft = sub.expiresAt ? Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 864e5)) : null;

  const call = async (path, body) => {
    setBusy(true); setError("");
    try {
      const res = await fetch(`${API}${path}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Something went wrong. Please try again.");
      await refreshUser();
      return json;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    const r = await call("/api/subscription/downgrade", { confirm: true });
    if (!r) return;
    setOpen(false);
    setDone(r.mode === "scheduled" ? `Done. You'll keep Pro until ${fmt(r.effectiveAt) || "the end of this period"}, then switch to Free. You won't be charged again.` : "Done. You're now on the Free plan.");
  };
  const undo = async () => {
    const r = await call("/api/subscription/downgrade/undo");
    if (r) setDone("Your Pro plan will keep renewing as before.");
  };

  if (source === "play") {
    return (
      <div className={d.row}>
        <span className={d.txt}><b>Switch to Free</b><small>This plan was bought in the Android app. Cancel it from Google Play → Subscriptions.</small></span>
      </div>
    );
  }

  // already scheduled: show when it happens, with an undo
  if (cancelAt) {
    return (
      <div className={`${d.row} ${d.scheduled}`} role="status">
        <span className={d.ico} aria-hidden="true"><CalendarClock size={17} /></span>
        <span className={d.txt}>
          <b>Switching to Free on {cancelAt}</b>
          <small>You keep Pro until then and won&apos;t be charged again.</small>
          {error && <small className={d.err}>{error}</small>}
        </span>
        <button type="button" className={d.keep} onClick={undo} disabled={busy}>
          {busy ? <Loader2 size={15} className={d.spin} aria-hidden="true" /> : null} Keep Pro
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={d.row}>
        <span className={d.txt}>
          <b>Switch to Free</b>
          <small>{recurring ? "Stop renewing. You keep Pro until the end of what you've paid for." : "Move back to the Free plan."}</small>
          {done && <small className={d.ok} role="status">{done}</small>}
        </span>
        <button type="button" className={d.switch} onClick={() => { setError(""); setOpen(true); }}>Switch to Free</button>
      </div>
      {open && (
        <ConfirmModal
          recurring={recurring} until={until} daysLeft={daysLeft}
          busy={busy} error={error}
          onCancel={() => setOpen(false)} onConfirm={confirm}
        />
      )}
    </>
  );
}

function ConfirmModal({ recurring, until, daysLeft, busy, error, onCancel, onConfirm }) {
  const keepRef = useRef(null);
  useEffect(() => {
    keepRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape" && !busy) onCancel(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [busy, onCancel]);

  return createPortal(
    <div className={d.overlay} onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div className={d.modal} role="alertdialog" aria-modal="true" aria-labelledby="jx-dg-title" aria-describedby="jx-dg-desc">
        <button type="button" className={d.close} onClick={onCancel} aria-label="Close" disabled={busy}><X size={17} /></button>
        <span className={d.warnIco} aria-hidden="true"><AlertTriangle size={22} /></span>
        <h2 id="jx-dg-title">Switch to the Free plan?</h2>
        <p id="jx-dg-desc">
          {recurring
            ? <>Your plan stops renewing. You keep every Pro feature until <b>{until || "the end of this billing period"}</b>, and you won&apos;t be charged again.</>
            : <>This takes effect <b>right away</b>.{daysLeft ? <> The {daysLeft} day{daysLeft === 1 ? "" : "s"} left on your plan won&apos;t be refunded.</> : null}</>}
        </p>
        <div className={d.lose}>
          <span>{recurring ? "After that date" : "What changes"}</span>
          <ul>{LOSSES.map((l) => <li key={l}>{l}</li>)}</ul>
          <small>Your trades and journals are never deleted. Upgrade again any time to unlock everything.</small>
        </div>
        {error && <p className={d.err} role="alert">{error}</p>}
        <div className={d.actions}>
          <button type="button" ref={keepRef} className={d.keepBig} onClick={onCancel} disabled={busy}>Keep Pro</button>
          <button type="button" className={d.confirm} onClick={onConfirm} disabled={busy}>
            {busy ? <><Loader2 size={15} className={d.spin} aria-hidden="true" /> Switching…</> : "Yes, switch to Free"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
