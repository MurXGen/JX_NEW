"use client";

/* AcquisitionModal, asks a new user where they heard about JournalX and saves
   it to the backend. Shown right after registration, before the get-started
   guide. "Other" reveals a free-text field. */

import { useState } from "react";
import axios from "axios";
import { Check, Compass } from "lucide-react";
import OnboardingFrame, { onbStyles as o } from "@/components/authFlow/OnboardingFrame";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const SOURCES = [
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X / Twitter" },
  { id: "tiktok", label: "TikTok" },
  { id: "reddit", label: "Reddit" },
  { id: "google", label: "Google search" },
  { id: "friend", label: "Friend / referral" },
  { id: "discord", label: "Discord / Telegram" },
  { id: "other", label: "Other" },
];

export default function AcquisitionModal({ open, onDone }) {
  const [source, setSource] = useState(null);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (skip = false) => {
    if (!skip && !source) return;
    setBusy(true);
    try {
      if (!skip && source) {
        await axios.post(
          `${API_BASE}/api/auth/acquisition`,
          { source, detail: source === "other" ? detail.trim() : "" },
          { withCredentials: true },
        );
      }
    } catch {
      /* best-effort, never block onboarding */
    } finally {
      setBusy(false);
      try { localStorage.setItem("jx-acq-done", "1"); } catch {}
      onDone?.();
    }
  };

  return (
    <OnboardingFrame
      open={open}
      icon={Compass}
      kicker="Welcome to JournalX"
      title="How did you find JournalX?"
      lead="Quick one. It helps us reach more traders like you."
      onClose={() => submit(true)}
      onEscape={() => submit(true)}
      busy={busy}
    >
      <div className={o.body}>
        <div className={o.chips} role="group" aria-label="Where you heard about us">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={o.chip}
              aria-pressed={source === s.id}
              onClick={() => setSource(s.id)}
            >
              {source === s.id && <Check size={14} aria-hidden="true" />} {s.label}
            </button>
          ))}
        </div>

        {source === "other" && (
          <>
            <label htmlFor="acq-other" className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
              Where did you hear about us?
            </label>
            <input
              id="acq-other"
              className={o.input}
              autoFocus
              placeholder="Where did you hear about us?"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={200}
            />
          </>
        )}

        <div className={o.actions}>
          <button type="button" className={`${o.btn} ${o.ghost}`} onClick={() => submit(true)} disabled={busy}>
            Skip
          </button>
          <button type="button" className={`${o.btn} ${o.gold}`} onClick={() => submit(false)} disabled={busy || !source}>
            {busy ? "Saving…" : "Continue"}
          </button>
        </div>
      </div>
    </OnboardingFrame>
  );
}
