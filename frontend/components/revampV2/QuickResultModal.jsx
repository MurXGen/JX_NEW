"use client";

/* QuickResultModal — the lowest-friction way to journal: capture just the
   result of a trade (win/loss + amount) in one tap and save instantly. Built
   for the days you don't feel like logging — especially losses. Everything
   else is optional via "Add full details". Saves to the same endpoint as the
   full Log-trade modal (tradeStatus: "quick"). */

import { useEffect, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { TrendingUp, TrendingDown, X, ArrowRight, Check, Sparkles } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const PRESETS = [100, 250, 500, 1000];

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
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setOutcome("win"); setAmount(""); setSymbol(""); setSaving(false); setDone(false); setError("");
    }
  }, [open]);

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
      fd.append("learnings", "");
      fd.append("rulesFollowed", "");
      fd.append("strategy", "");
      fd.append("marketCondition", "");
      fd.append("timeframe", "");
      fd.append("confidence", "");
      fd.append("emotion", "");
      fd.append("mistakes", "[]");

      const res = await axios.post(`${API_BASE}/api/trades/addd`, fd, { withCredentials: true });
      const trade = res.data?.trade || res.data?.data || res.data;
      setDone(true);
      onSaved?.(trade && trade._id ? trade : null);
      setTimeout(() => onClose?.(), 850);
    } catch (e) {
      console.error("Quick result save failed:", e);
      setError(e?.response?.data?.message || "Couldn't save — try again.");
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
                  Nice — that's the habit. You can add details anytime.
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "var(--space-4)" }}>
                  <h2 style={{ font: "var(--text-h3)", fontWeight: 700, margin: 0 }}>Quick result</h2>
                  <p style={{ font: "var(--text-small)", color: C.muted, margin: "4px 0 0" }}>
                    Just log the outcome — win or loss. 5 seconds, no judgment.
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
                <div className="jx-input" style={{ height: 52 }}>
                  <span style={{ font: "var(--text-h3)", fontWeight: 700, color: accent }}>
                    {outcome === "loss" ? "-" : "+"}{currencySymbol}
                  </span>
                  <input inputMode="decimal" autoFocus placeholder="0" value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && save()}
                    style={{ font: "var(--text-h3)", fontWeight: 700 }} />
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {PRESETS.map((p) => (
                    <button key={p} type="button" className="jx-chip" style={{ padding: "6px 12px" }}
                      onClick={() => setAmount(String(p))}>
                      {currencySymbol}{p.toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* optional symbol */}
                <div className="jx-input" style={{ height: 40, marginTop: "var(--space-3)" }}>
                  <input placeholder="Symbol (optional, e.g. BTC)" value={symbol}
                    onChange={(e) => setSymbol(e.target.value)} />
                </div>

                {error && <p style={{ font: "var(--text-small)", color: C.red, margin: "12px 0 0" }}>{error}</p>}

                <button onClick={save} disabled={saving}
                  style={{
                    width: "100%", marginTop: "var(--space-4)", padding: "14px", borderRadius: "var(--radius-md)",
                    border: "none", cursor: saving ? "progress" : "pointer", display: "inline-flex",
                    alignItems: "center", justifyContent: "center", gap: 9, font: "var(--text-body-md)", fontWeight: 700,
                    color: "#1e2329", background: `linear-gradient(145deg, ${C.yellow}, ${C.yellowDeep})`,
                  }}>
                  {saving ? <Spinner /> : <><Check size={18} /> Log it</>}
                </button>

                <button type="button" onClick={() => { onClose?.(); onMoreDetails?.(); }}
                  style={{ width: "100%", marginTop: 10, padding: "8px", background: "none", border: "none",
                    color: C.muted, font: "var(--text-small)", cursor: "pointer", display: "inline-flex",
                    alignItems: "center", justifyContent: "center", gap: 6 }}>
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
