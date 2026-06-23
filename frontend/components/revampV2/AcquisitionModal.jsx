"use client";

/* AcquisitionModal — asks a new user where they heard about JournalX and saves
   it to the backend. Shown right after registration, before the get-started
   guide. "Other" reveals a free-text field. */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { Check, Compass, X } from "lucide-react";

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
      /* best-effort — never block onboarding */
    } finally {
      setBusy(false);
      try { localStorage.setItem("jx-acq-done", "1"); } catch {}
      onDone?.();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay jx-modal-overlay--blur"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="jx-card"
            style={{ width: "min(460px, 94vw)", padding: "var(--space-6)", position: "relative", color: "var(--color-text-primary)" }}
          >
            <button
              className="jx-btn jx-btn--secondary jx-btn--sm"
              onClick={() => submit(true)}
              aria-label="Skip"
              style={{ position: "absolute", top: 12, right: 12, padding: 8 }}
              disabled={busy}
            >
              <X size={16} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, background: "var(--color-primary-subtle)", color: "var(--yellow-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Compass size={20} />
              </span>
              <h2 style={{ font: "var(--text-h2)", margin: 0, color: "var(--color-text-primary)" }}>How did you find JournalX?</h2>
            </div>
            <p style={{ font: "var(--text-body)", color: "var(--color-text-secondary)", margin: "0 0 var(--space-4)" }}>
              Quick one, it helps us reach more traders like you.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
              {SOURCES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`jx-chip ${source === s.id ? "jx-chip--selected" : ""}`}
                  onClick={() => setSource(s.id)}
                >
                  {source === s.id && <Check size={14} />} {s.label}
                </button>
              ))}
            </div>

            {source === "other" && (
              <div className="jx-input" style={{ marginBottom: "var(--space-3)" }}>
                <input
                  autoFocus
                  placeholder="Where did you hear about us?"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  maxLength={200}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button className="jx-btn jx-btn--ghost" onClick={() => submit(true)} disabled={busy} style={{ flex: 1, justifyContent: "center" }}>
                Skip
              </button>
              <button className="jx-btn jx-btn--primary" onClick={() => submit(false)} disabled={busy || !source} style={{ flex: 1.4, justifyContent: "center" }}>
                {busy ? "Saving…" : "Continue"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
