"use client";

/* QuickResultModal — the lowest-friction way to journal: capture just the
   result of a trade (win/loss + amount) in one tap and save instantly. Built
   for the days you don't feel like logging — especially losses. Everything
   else is optional via "Add full details". Saves to the same endpoint as the
   full Log-trade modal (tradeStatus: "quick"). */

import { useEffect, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { TrendingUp, TrendingDown, X, ArrowRight, Check, Sparkles, ImagePlus } from "lucide-react";
import VoiceNoteRecorder from "./VoiceNoteRecorder";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const PRESETS = [100, 250, 500, 1000];

/* recent symbols shared with the full Log-trade modal + quick amounts — both
   live in localStorage so the dropdowns learn what the user actually uses. */
const SYMBOLS_KEY = "jx-symbols";
const AMOUNTS_KEY = "jx-quick-amounts";
const readRecentSymbols = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(SYMBOLS_KEY) || "null");
    if (Array.isArray(raw) && raw.length) return raw.slice(0, 8);
  } catch {}
  return ["BTC", "ETH"]; // 2 sensible defaults until they save their own
};
const readRecentAmounts = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(AMOUNTS_KEY) || "null");
    if (Array.isArray(raw) && raw.length) return raw.slice(0, 8);
  } catch {}
  return [100, 250, 500, 1000];
};
/* prepend a freshly-used value (dedup, capped) so most-used surfaces first */
const pushRecent = (key, value, cap = 8) => {
  if (value === "" || value == null) return;
  try {
    const cur = JSON.parse(localStorage.getItem(key) || "[]");
    const list = Array.isArray(cur) ? cur : [];
    const next = [value, ...list.filter((x) => String(x) !== String(value))].slice(0, cap);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {}
};

function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      style={{ width: 16, height: 16, borderRadius: "50%", display: "inline-block",
        border: "2px solid color-mix(in srgb, #1e2329 35%, transparent)", borderTopColor: "#1e2329" }}
    />
  );
}

export default function QuickResultModal({
  open,
  onClose,
  accountId,
  currencySymbol = "$",
  onSaved,
  onMoreDetails,
  onNoJournal,
}) {
  const [outcome, setOutcome] = useState("win"); // win | loss
  const [amount, setAmount] = useState("");
  const [symbol, setSymbol] = useState("");
  const [recent, setRecent] = useState([]);
  const [amounts, setAmounts] = useState([]);
  const [voice, setVoice] = useState(null); // { blob, transcript, durationSec }
  const [images, setImages] = useState([]); // File[]
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setOutcome("win"); setAmount(""); setSymbol(""); setSaving(false); setDone(false); setError("");
      setRecent(readRecentSymbols());
      setAmounts(readRecentAmounts());
      setVoice(null); setImages([]);
    }
  }, [open]);

  const addImages = (fileList) => {
    const picked = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    setImages((prev) => [...prev, ...picked].slice(0, 4));
  };

  const num = (v) => {
    const n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const save = async () => {
    setError("");
    const amt = num(amount);
    if (!amt) return setError("Enter the amount you won or lost.");
    if (!accountId) { onNoJournal?.(); return; }
    const pnl = outcome === "loss" ? -Math.abs(amt) : Math.abs(amt);
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const fd = new FormData();
      fd.append("accountId", accountId);
      fd.append("symbol", (symbol.trim() || "TRADE").toUpperCase());
      fd.append("direction", "long");
      fd.append("tradeStatus", "quick");
      fd.append("quantityUSD", 0);
      fd.append("leverage", 1);
      fd.append("totalQuantity", 0);
      fd.append("sizeUnit", "asset");
      fd.append("entries", "[]");
      fd.append("exits", "[]");
      fd.append("sls", "[]");
      fd.append("tps", "[]");
      fd.append("avgEntryPrice", 0);
      fd.append("avgExitPrice", 0);
      fd.append("avgSLPrice", 0);
      fd.append("avgTPPrice", 0);
      fd.append("expectedProfit", 0);
      fd.append("expectedLoss", 0);
      fd.append("rr", "");
      fd.append("feeType", "percent");
      fd.append("openFeeValue", 0);
      fd.append("feeAmount", 0);
      fd.append("pnl", pnl);
      fd.append("pnlAfterFee", pnl);
      fd.append("openTime", now);
      fd.append("closeTime", now);
      fd.append("duration", 0);
      fd.append("reason", "[]");
      // voice-note transcript → notes; audio file + meta → voiceNote
      const vt = (voice?.transcript || "").trim();
      fd.append("learnings", vt ? `🎙 Voice note: ${vt}` : "");
      if (voice?.blob) {
        fd.append("voiceNote", voice.blob, "voice-note.webm");
        fd.append("voiceNoteTranscript", vt);
        fd.append("voiceNoteDuration", String(voice.durationSec || 0));
      }
      images.forEach((f) => fd.append("images", f));
      fd.append("rulesFollowed", "");
      fd.append("strategy", "");
      fd.append("marketCondition", "");
      fd.append("timeframe", "");
      fd.append("confidence", "");
      fd.append("emotion", "");
      fd.append("mistakes", "[]");

      const res = await axios.post(`${API_BASE}/api/trades/addd`, fd, { withCredentials: true });
      const trade = res.data?.trade || res.data?.data || res.data;
      // remember what they used so the dropdowns learn over time
      const symClean = symbol.trim().toUpperCase();
      if (symClean) pushRecent(SYMBOLS_KEY, symClean);
      pushRecent(AMOUNTS_KEY, Math.abs(amt));
      setDone(true);
      onSaved?.(trade && trade._id ? trade : null);
      setTimeout(() => onClose?.(), 850);
    } catch (e) {
      console.error("Quick result save failed:", e);
      setError(e?.response?.data?.message || "Couldn't save, please try again.");
      setSaving(false);
    }
  };

  const C = {
    text: "var(--color-text-primary)",
    muted: "var(--color-text-muted)",
    green: "var(--color-success, #2ebd85)",
    red: "var(--color-danger, #f6465d)",
    yellow: "#fcd535",
    yellowDeep: "#f0b90b",
  };
  const accent = outcome === "win" ? C.green : C.red;
  // single horizontal row of chips — scrolls sideways, never wraps
  const chipRow = { display: "flex", gap: 8, marginTop: 8, overflowX: "auto", flexWrap: "nowrap", paddingBottom: 2, WebkitOverflowScrolling: "touch" };
  // dashed attachment button (matches the voice recorder's idle trigger)
  const dashedBtn = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "12px", borderRadius: "var(--radius-md)",
    border: "1.5px dashed var(--color-border-strong)", background: "transparent",
    color: "var(--color-text-secondary)", font: "var(--text-body-md)", fontWeight: 600, cursor: "pointer",
  };
  // tertiary "link" style CTA (not a filled button)
  const linkCta = {
    width: "100%", marginTop: 12, background: "none", border: "none",
    color: "var(--yellow-600)", font: "var(--text-small)", fontWeight: 600, cursor: "pointer",
    textDecoration: "underline", textUnderlineOffset: 3,
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay jx-modal-overlay--blur"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose?.()}
        >
          <motion.div
            className="jx-ltmodal jx-ltmodal--narrow jx-ltmodal--popup"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            style={{ width: "min(440px, 96vw)", padding: "var(--space-6)" }}
          >
            <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} aria-label="Close"
              style={{ position: "absolute", top: 14, right: 14, padding: 8 }} disabled={saving}>
              <X size={16} />
            </button>

            {done ? (
              <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
                <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  style={{ display: "inline-flex", width: 64, height: 64, borderRadius: "50%", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, var(--color-success) 16%, transparent)", color: C.green, marginBottom: 14 }}>
                  <Check size={34} />
                </motion.span>
                <div style={{ font: "var(--text-title)", fontWeight: 700 }}>Logged 🎉</div>
                <div style={{ font: "var(--text-small)", color: C.muted, marginTop: 4 }}>
                  Nice, that's the habit. You can add details anytime.
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "var(--space-4)" }}>
                  <h2 style={{ font: "var(--text-h3)", fontWeight: 700, margin: 0 }}>Quick result</h2>
                  <p style={{ font: "var(--text-small)", color: C.muted, margin: "4px 0 0" }}>
                    Just log the outcome: win or loss. 5 seconds, no judgment.
                  </p>
                </div>

                {/* win / loss */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "var(--space-4)" }}>
                  {[
                    { id: "win", label: "Win", icon: TrendingUp, color: C.green },
                    { id: "loss", label: "Loss", icon: TrendingDown, color: C.red },
                  ].map((o) => {
                    const on = outcome === o.id;
                    return (
                      <button key={o.id} type="button" onClick={() => setOutcome(o.id)}
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                          padding: "13px", borderRadius: "var(--radius-md)", cursor: "pointer",
                          font: "var(--text-body-md)", fontWeight: 700,
                          border: `1.5px solid ${on ? o.color : "var(--color-border)"}`,
                          background: on ? `color-mix(in srgb, ${o.color} 14%, transparent)` : "transparent",
                          color: on ? o.color : "var(--color-text-secondary)",
                        }}>
                        <o.icon size={18} /> {o.label}
                      </button>
                    );
                  })}
                </div>

                {/* amount */}
                <label style={{ font: "var(--text-caption)", color: C.muted, display: "block", marginBottom: 6 }}>
                  Net P&L amount
                </label>
                {/* amount — type your own, or tap a saved amount below */}
                <div className="jx-input">
                  <span style={{ fontWeight: 700, color: accent }}>
                    {outcome === "loss" ? "-" : "+"}{currencySymbol}
                  </span>
                  <input inputMode="decimal" autoFocus placeholder="0" value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && save()} />
                </div>
                <div style={chipRow}>
                  {amounts.map((a) => (
                    <button key={a} type="button" className="jx-chip" style={{ flexShrink: 0, padding: "6px 12px" }}
                      onClick={() => setAmount(String(a))}>
                      {currencySymbol}{Number(a).toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* optional symbol — type, or tap a saved symbol below */}
                <div className="jx-input" style={{ marginTop: "var(--space-3)" }}>
                  <input placeholder="Symbol (optional, e.g. BTC)" value={symbol}
                    onChange={(e) => setSymbol(e.target.value)} />
                </div>
                <div style={chipRow}>
                  {recent.map((s) => (
                    <button key={s} type="button"
                      className={`jx-chip ${symbol.trim().toUpperCase() === String(s).toUpperCase() ? "jx-chip--selected" : ""}`}
                      style={{ flexShrink: 0, padding: "5px 12px" }}
                      onClick={() => setSymbol(String(s))}>
                      {s}
                    </button>
                  ))}
                </div>

                {/* attachments — record + image in one row (dashed, consistent) */}
                <div style={{ display: "flex", gap: 10, marginTop: "var(--space-4)", alignItems: "stretch" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <VoiceNoteRecorder dashed onChange={setVoice} />
                  </div>
                  {images.length < 4 && (
                    <label style={{ ...dashedBtn, flex: 1 }}>
                      <ImagePlus size={16} /> Add image
                      <input type="file" accept="image/*" multiple hidden onChange={(e) => addImages(e.target.files)} />
                    </label>
                  )}
                </div>

                {/* image thumbnails */}
                {images.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "var(--space-3)" }}>
                    {images.map((f, i) => (
                      <span key={i} style={{ position: "relative", width: 52, height: 52, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--color-border)", flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(f)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))} aria-label="Remove image"
                          style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {error && <p style={{ font: "var(--text-small)", color: C.red, margin: "12px 0 0" }}>{error}</p>}

                {/* submit */}
                <button
                  onClick={save}
                  disabled={saving}
                  className="jx-btn jx-btn--primary"
                  style={{ width: "100%", marginTop: "var(--space-4)", justifyContent: "center" }}
                >
                  {saving ? <Spinner /> : <><Check size={18} /> Log it</>}
                </button>

                {/* tertiary link */}
                <button type="button" onClick={() => { onClose?.(); onMoreDetails?.(); }} style={linkCta}>
                  Add full details instead <ArrowRight size={14} />
                </button>

                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, width: "100%", justifyContent: "center", font: "var(--text-caption)", color: C.muted }}>
                  <Sparkles size={12} style={{ color: C.yellow }} /> Even losses logged build your edge.
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
