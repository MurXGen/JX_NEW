"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import {
  ArrowLeft,
  CheckSquare,
  Download,
  KeyRound,
  Square,
  X,
} from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";
import Toast from "./Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const PLATFORMS = [
  { id: "binance", name: "Binance", live: true, fields: [{ key: "apiKey", label: "API key" }, { key: "secretKey", label: "API secret" }], note: "Read-only futures key recommended" },
  { id: "bybit", name: "Bybit", live: false, fields: [{ key: "apiKey", label: "API key" }, { key: "secretKey", label: "API secret" }] },
  { id: "coinbase", name: "Coinbase", live: false, fields: [{ key: "apiKey", label: "API key" }, { key: "secretKey", label: "API secret" }, { key: "passphrase", label: "Passphrase" }] },
  { id: "okx", name: "OKX", live: false, fields: [{ key: "apiKey", label: "API key" }, { key: "secretKey", label: "API secret" }, { key: "passphrase", label: "Passphrase" }] },
  { id: "kucoin", name: "KuCoin", live: false, fields: [{ key: "apiKey", label: "API key" }, { key: "secretKey", label: "API secret" }, { key: "passphrase", label: "Passphrase" }] },
];

const fmt = (v, d = 2) => Number(v).toLocaleString(undefined, { maximumFractionDigits: d });

function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      style={{
        width: 14, height: 14, borderRadius: "50%", display: "inline-block",
        border: "2px solid color-mix(in srgb, currentColor 30%, transparent)",
        borderTopColor: "currentColor",
      }}
    />
  );
}

/**
 * ExchangeConnectModal — connect an exchange with API keys, preview
 * trade activity, multi-select and import into the trades log.
 * Binance is live (reuses /api/integrations/binance/*); other
 * platforms are scaffolded as coming soon.
 */
export default function ExchangeConnectModal({ open, platform, onClose, onImported }) {
  const meta = PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];
  const [creds, setCreds] = useState({});
  const [step, setStep] = useState("credentials"); // credentials | preview
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [toast, setToast] = useState(null);
  const flash = (type, msg, ms = 3500) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), ms);
  };

  const reset = () => {
    setCreds({});
    setStep("credentials");
    setActivities([]);
    setSelected(new Set());
  };

  const connect = async () => {
    if (meta.fields.some((f) => !creds[f.key]?.trim())) {
      return flash("danger", "Fill in all the credentials first");
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/integrations/binance/preview`,
        { apiKey: creds.apiKey.trim(), secretKey: creds.secretKey.trim() },
        { withCredentials: true },
      );
      const trades = res.data?.trades || [];
      /* connection is valid — persist for auto-import */
      localStorage.setItem("binance_api_key", creds.apiKey.trim());
      localStorage.setItem("binance_secret_key", creds.secretKey.trim());
      if (localStorage.getItem("binance_auto_sync") === null) {
        localStorage.setItem("binance_auto_sync", "1");
      }
      setActivities(trades);
      setSelected(new Set(trades.map((_, i) => i)));
      setStep("preview");
      if (!trades.length) flash("info", "Connected — no recent activity found (last 7 days)");
    } catch (err) {
      console.error("Exchange connect failed:", err);
      flash("danger", err.response?.data?.message || "Could not connect — check your keys");
    } finally {
      setLoading(false);
    }
  };

  const doImport = async () => {
    const list = activities.filter((_, i) => selected.has(i));
    if (!list.length) return flash("danger", "Select at least one trade");
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/integrations/binance/import`,
        { trades: list },
        { withCredentials: true },
      );
      flash("success", `${res.data?.imported ?? list.length} trades imported — refreshing…`);
      onImported?.();
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error("Import failed:", err);
      flash("danger", err.response?.data?.message || "Import failed — try again");
      setLoading(false);
    }
  };

  const allSelected = selected.size === activities.length && activities.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay jx-modal-overlay--blur"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && !loading && onClose?.()}
        >
          <Toast toast={toast} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="jx-ltmodal jx-ltmodal--narrow"
            style={{ width: "min(620px, 96vw)" }}
          >
            {/* header */}
            <div className="jx-ltmodal__header" style={{ alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                {step === "preview" && (
                  <button className="jx-btn jx-btn--secondary jx-btn--sm" style={{ padding: 8, borderRadius: "50%" }} onClick={() => setStep("credentials")} aria-label="Back">
                    <ArrowLeft size={15} />
                  </button>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>
                    Connect {meta.name}
                  </span>
                  <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>
                    {step === "credentials"
                      ? meta.note || "Enter your read-only API credentials"
                      : `Recent activity · select what to import`}
                  </span>
                </div>
              </div>
              <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={() => { reset(); onClose?.(); }} aria-label="Close" style={{ padding: 8 }} disabled={loading}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "var(--space-5) var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)", overflowY: "auto", minHeight: 220 }}>
              {!meta.live ? (
                <div className="jx-banner jx-banner--warn">
                  <KeyRound size={16} style={{ color: "var(--yellow-500)" }} />
                  <span>
                    <strong>{meta.name} is coming soon.</strong> Binance is available today — more exchanges are on the way.
                  </span>
                </div>
              ) : step === "credentials" ? (
                <>
                  {meta.fields.map((f) => (
                    <div className="jx-field" key={f.key}>
                      <span className="jx-sidebar__section" style={{ padding: 0 }}>{f.label}</span>
                      <div className="jx-input">
                        <span className="jx-input__icon"><KeyRound size={14} /></span>
                        <input
                          type="password"
                          autoComplete="off"
                          placeholder={`Paste your ${f.label.toLowerCase()}`}
                          value={creds[f.key] || ""}
                          onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))}
                        />
                      </div>
                    </div>
                  ))}
                  <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                    Keys are stored locally on this device and only used to fetch your trades. Use read-only keys.
                  </span>
                </>
              ) : (
                <>
                  {/* select all */}
                  <button
                    type="button"
                    className="jx-dd__option"
                    style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}
                    onClick={() =>
                      setSelected(allSelected ? new Set() : new Set(activities.map((_, i) => i)))
                    }
                  >
                    {allSelected ? <CheckSquare size={15} style={{ color: "var(--yellow-500)" }} /> : <Square size={15} />}
                    <span style={{ flex: 1, fontWeight: 600 }}>Select all</span>
                    <Badge variant="brand">{selected.size}/{activities.length}</Badge>
                  </button>

                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", maxHeight: 320, overflowY: "auto" }}>
                    {activities.map((t, i) => {
                      const sel = selected.has(i);
                      const pnl = Number(t.pnl ?? t.unrealizedPnl ?? 0);
                      return (
                        <button
                          key={i}
                          type="button"
                          className={`jx-journalrow ${sel ? "jx-journalrow--active" : ""}`}
                          style={{ padding: "var(--space-2) var(--space-3)" }}
                          onClick={() =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              next.has(i) ? next.delete(i) : next.add(i);
                              return next;
                            })
                          }
                        >
                          {sel ? <CheckSquare size={15} style={{ color: "var(--yellow-500)", flexShrink: 0 }} /> : <Square size={15} style={{ flexShrink: 0 }} />}
                          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, textAlign: "left" }}>
                            <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>
                              {t.symbol}{" "}
                              <Badge variant={t.side === "LONG" ? "success" : "danger"}>{t.side === "LONG" ? "Long" : "Short"}</Badge>
                              {t.status === "OPEN" && <Badge variant="brand"> Open</Badge>}
                            </span>
                            <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                              {t.entry ? `in $${fmt(t.entry)}` : ""}{t.exit ? ` → out $${fmt(t.exit)}` : ""}
                              {t.closeTime ? ` · ${new Date(t.closeTime).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}` : ""}
                            </span>
                          </span>
                          <span style={{ fontWeight: 600, color: pnl >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)", whiteSpace: "nowrap" }}>
                            {pnl >= 0 ? "+" : "−"}${fmt(Math.abs(pnl))}
                          </span>
                        </button>
                      );
                    })}
                    {activities.length === 0 && (
                      <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)", textAlign: "center", padding: "var(--space-6)" }}>
                        No activity in the last 7 days.
                      </span>
                    )}
                  </div>

                  <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                    Already-imported trades are replaced, not duplicated. Auto-import runs every 30 min while enabled in Settings.
                  </span>
                </>
              )}
            </div>

            {/* footer */}
            <div className="jx-ltmodal__footer" style={{ justifyContent: "flex-end" }}>
              <button className="jx-btn jx-btn--ghost" onClick={() => { reset(); onClose?.(); }} disabled={loading}>
                Cancel
              </button>
              {meta.live && step === "credentials" && (
                <button className="jx-btn jx-btn--primary" onClick={connect} disabled={loading} style={{ minWidth: 130 }}>
                  {loading ? <><Spinner /> Connecting…</> : "Connect"}
                </button>
              )}
              {meta.live && step === "preview" && (
                <button className="jx-btn jx-btn--primary" onClick={doImport} disabled={loading || selected.size === 0} style={{ minWidth: 160 }}>
                  {loading ? <><Spinner /> Importing…</> : <><Download size={15} /> Import {selected.size} trades</>}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
