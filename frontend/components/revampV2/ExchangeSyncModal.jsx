"use client";

/* Connect + sync a live exchange (Binance / Bybit) — Pro only.
   Flow: enter read-only key/secret → pick markets + period → Connect (verify +
   store encrypted + preview) → review preview → Sync (dedup import).
   Also manages an already-connected exchange (sync now / disconnect). */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import {
  ArrowLeft, CheckSquare, Crown, Download, ExternalLink, KeyRound,
  RefreshCw, Square, Trash2, X,
} from "lucide-react";
import Badge from "./Badge";
import Toast from "./Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const META = {
  binance: {
    name: "Binance",
    apiPage: "https://www.binance.com/en/my/settings/api-management",
    markets: [
      { id: "usdm", label: "USDT-M Futures" },
      { id: "coinm", label: "COIN-M Futures" },
      { id: "spot", label: "Spot" },
    ],
  },
  bybit: {
    name: "Bybit",
    apiPage: "https://www.bybit.com/app/user/api-management",
    markets: [
      { id: "linear", label: "USDT-M (Linear)" },
      { id: "inverse", label: "COIN-M (Inverse)" },
      { id: "spot", label: "Spot" },
    ],
  },
};

const WINDOWS = [
  { d: 7, label: "Last 7 days" },
  { d: 90, label: "Last 90 days" },
  { d: 120, label: "Last 120 days" },
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

export default function ExchangeSyncModal({ open, exchange, status, isPro, onClose, onChanged }) {
  const meta = META[exchange] || META.binance;
  const connected = !!status?.connected;

  const [step, setStep] = useState("form"); // form | preview
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [markets, setMarkets] = useState([meta.markets[0].id]);
  const [windowDays, setWindowDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [totalPreview, setTotalPreview] = useState(0);
  const [toast, setToast] = useState(null);
  const flash = (type, msg, ms = 4000) => { setToast({ type, msg }); setTimeout(() => setToast(null), ms); };

  useEffect(() => {
    if (!open) return;
    setStep("form"); setApiKey(""); setSecret(""); setPreview([]); setTotalPreview(0);
    setMarkets(status?.markets?.length ? status.markets : [meta.markets[0].id]);
    setWindowDays(WINDOWS.some((w) => w.d === status?.window) ? status.window : 90);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exchange]);

  const toggleMarket = (id) =>
    setMarkets((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  const apiErr = (err, fallback) => {
    const d = err?.response?.data;
    if (d?.code === "RATE_LIMIT") return d.message;
    if (d?.code === "PRO_REQUIRED") return "Exchange sync is a Pro feature — upgrade to connect.";
    if (d?.code === "AUTH") return d.message || "Those keys were rejected. Use a read-only key.";
    return d?.message || fallback;
  };

  const connect = async () => {
    if (!apiKey.trim() || !secret.trim()) return flash("danger", "Enter both API key and secret");
    if (!markets.length) return flash("danger", "Pick at least one market");
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/integrations/exchange/${exchange}/connect`,
        { apiKey: apiKey.trim(), secret: secret.trim(), markets, window: windowDays },
        { withCredentials: true },
      );
      setPreview(res.data?.preview || []);
      setTotalPreview(res.data?.totalPreview || 0);
      setStep("preview");
      onChanged?.();
      if (!(res.data?.preview || []).length)
        flash("info", `Connected — no closed trades found in the last ${windowDays} days`);
    } catch (err) {
      flash("danger", apiErr(err, "Could not connect, check your keys"));
    } finally {
      setLoading(false);
    }
  };

  const sync = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/integrations/exchange/${exchange}/sync`,
        {}, { withCredentials: true },
      );
      const n = res.data?.imported ?? 0;
      flash("success", n ? `${n} new trade${n === 1 ? "" : "s"} synced${res.data.skipped ? ` · ${res.data.skipped} already logged` : ""}` : "Up to date — no new trades");
      onChanged?.();
      if (n) setTimeout(() => window.location.reload(), 1200);
      else setLoading(false);
    } catch (err) {
      flash("danger", apiErr(err, "Sync failed, try again"));
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/integrations/exchange/${exchange}/disconnect`, {}, { withCredentials: true });
      flash("success", `${meta.name} disconnected`);
      onChanged?.();
      setTimeout(() => onClose?.(), 700);
    } catch (err) {
      flash("danger", "Could not disconnect");
      setLoading(false);
    }
  };

  const marketLabel = (id) => meta.markets.find((m) => m.id === id)?.label || id;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-3)" }}
          onMouseDown={(e) => e.target === e.currentTarget && !loading && onClose?.()}
        >
          <Toast toast={toast} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="jx-ltmodal jx-ltmodal--popup"
            style={{ width: "min(560px, 96vw)", maxHeight: "90dvh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="jx-ltmodal__header" style={{ alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                {step === "preview" && (
                  <button className="jx-btn jx-btn--secondary jx-btn--sm" style={{ padding: 8, borderRadius: "50%" }} onClick={() => setStep("form")} aria-label="Back">
                    <ArrowLeft size={15} />
                  </button>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>Connect {meta.name}</span>
                  <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>
                    {step === "preview" ? "Preview · then sync into your journal" : "Read-only API key · Pro feature"}
                  </span>
                </div>
              </div>
              <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} aria-label="Close" style={{ padding: 8 }} disabled={loading}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "var(--space-5) var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)", overflowY: "auto" }}>
              {!isPro ? (
                <div className="jx-banner jx-banner--warn" style={{ alignItems: "flex-start" }}>
                  <Crown size={16} style={{ color: "var(--yellow-500)", flexShrink: 0 }} />
                  <span>Exchange auto-sync is a <strong>Pro</strong> feature. Upgrade to connect Binance &amp; Bybit and import trades automatically.</span>
                </div>
              ) : step === "form" ? (
                <>
                  {connected && (
                    <div className="jx-banner jx-banner--success" style={{ alignItems: "center" }}>
                      <span style={{ flex: 1 }}>
                        Connected · key ••••{status.keyHint}
                        {status.lastSyncAt ? ` · last sync ${new Date(status.lastSyncAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
                      </span>
                    </div>
                  )}
                  <a href={meta.apiPage} target="_blank" rel="noopener noreferrer" className="jx-btn jx-btn--secondary" style={{ textDecoration: "none", justifyContent: "center" }}>
                    <ExternalLink size={15} /> Open {meta.name} API page
                  </a>
                  <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                    Create a <strong>read-only</strong> key (no withdrawal / trade permissions). Keys are encrypted at rest and only used to fetch your trades.
                  </span>

                  <div className="jx-field">
                    <span className="jx-sidebar__section" style={{ padding: 0 }}>API key</span>
                    <div className="jx-input">
                      <span className="jx-input__icon"><KeyRound size={14} /></span>
                      <input type="password" autoComplete="off" placeholder={connected ? "Enter a new key to replace" : "Paste your API key"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                    </div>
                  </div>
                  <div className="jx-field">
                    <span className="jx-sidebar__section" style={{ padding: 0 }}>API secret</span>
                    <div className="jx-input">
                      <span className="jx-input__icon"><KeyRound size={14} /></span>
                      <input type="password" autoComplete="off" placeholder="Paste your API secret" value={secret} onChange={(e) => setSecret(e.target.value)} />
                    </div>
                  </div>

                  <div className="jx-field">
                    <span className="jx-sidebar__section" style={{ padding: 0 }}>Markets to sync</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                      {meta.markets.map((m) => {
                        const on = markets.includes(m.id);
                        return (
                          <button key={m.id} type="button" onClick={() => toggleMarket(m.id)}
                            className="jx-chip" style={{
                              display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, cursor: "pointer",
                              border: `1px solid ${on ? "var(--color-primary)" : "var(--color-border)"}`,
                              background: on ? "var(--color-primary-subtle)" : "var(--color-bg-muted)",
                              color: on ? "var(--color-text-primary)" : "var(--color-text-secondary)", font: "var(--text-body-md)", fontWeight: 500,
                            }}>
                            {on ? <CheckSquare size={14} /> : <Square size={14} />} {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="jx-field">
                    <span className="jx-sidebar__section" style={{ padding: 0 }}>History to pull</span>
                    <div className="jx-seg" style={{ maxWidth: 360 }}>
                      {WINDOWS.map((w) => (
                        <button key={w.d} type="button" className={`jx-seg__btn ${windowDays === w.d ? "jx-seg__btn--active" : ""}`} onClick={() => setWindowDays(w.d)}>
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{totalPreview} closed trade{totalPreview === 1 ? "" : "s"} found</span>
                    <Badge variant="brand">{markets.map(marketLabel).join(" · ")}</Badge>
                  </div>
                  <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                    Syncing imports these into your journal. Already-logged trades are skipped automatically — nothing is duplicated.
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", maxHeight: 320, overflowY: "auto" }}>
                    {preview.map((t, i) => {
                      const pnl = Number(t.pnl || 0);
                      return (
                        <div key={t.externalId || i} className="jx-card jx-card--flat" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)" }}>
                          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                            <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>
                              {t.symbol} <Badge variant="neutral">{t.direction === "long" ? "Long" : "Short"}</Badge>
                            </span>
                            <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                              {t.entry ? `in ${fmt(t.entry)}` : ""}{t.exit ? ` → out ${fmt(t.exit)}` : ""}
                              {t.closeTime ? ` · ${new Date(t.closeTime).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}` : ""}
                            </span>
                          </span>
                          <span style={{ fontWeight: 700, color: pnl >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)", whiteSpace: "nowrap" }}>
                            {pnl >= 0 ? "+" : "−"}{fmt(Math.abs(pnl))}
                          </span>
                        </div>
                      );
                    })}
                    {preview.length === 0 && (
                      <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)", textAlign: "center", padding: "var(--space-6)" }}>
                        No closed trades in this period.
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* footer */}
            <div className="jx-ltmodal__footer" style={{ justifyContent: "space-between", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {isPro && connected && step === "form" ? (
                <button className="jx-btn jx-btn--ghost" onClick={disconnect} disabled={loading} style={{ color: "var(--color-danger)" }}>
                  <Trash2 size={15} /> Disconnect
                </button>
              ) : <span />}
              <div style={{ display: "flex", gap: "var(--space-2)", marginLeft: "auto" }}>
                <button className="jx-btn jx-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
                {isPro && step === "form" && (
                  <button className="jx-btn jx-btn--primary" onClick={connect} disabled={loading} style={{ minWidth: 130 }}>
                    {loading ? <><Spinner /> Connecting…</> : "Connect & preview"}
                  </button>
                )}
                {isPro && step === "preview" && (
                  <button className="jx-btn jx-btn--primary" onClick={sync} disabled={loading} style={{ minWidth: 150 }}>
                    {loading ? <><Spinner /> Syncing…</> : <><Download size={15} /> Sync trades</>}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
