"use client";

/* Connect + sync a live exchange (Binance / Bybit) — Pro only.
   Flow: enter read-only key/secret → pick markets + period → Connect (verify +
   store encrypted + preview) → review preview → Sync (dedup import).
   Also manages an already-connected exchange (sync now / disconnect). */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import {
  ArrowLeft, Check, Crown, Download, ExternalLink, Eye, EyeOff, KeyRound,
  Lock, ShieldCheck, Trash2, X,
} from "lucide-react";
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
  const [showSecret, setShowSecret] = useState(false);
  const flash = (type, msg, ms = 4000) => { setToast({ type, msg }); setTimeout(() => setToast(null), ms); };

  useEffect(() => {
    if (!open) return;
    setStep("form"); setApiKey(""); setSecret(""); setShowSecret(false); setPreview([]); setTotalPreview(0);
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
  const keysOk = !!apiKey.trim() && !!secret.trim();
  const previewNet = preview.reduce((a, t) => a + Number(t.pnl || 0), 0);
  const previewWins = preview.filter((t) => Number(t.pnl || 0) > 0).length;
  const lastSync = status?.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay jx-xs-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onMouseDown={(e) => e.target === e.currentTarget && !loading && onClose?.()}
        >
          <Toast toast={toast} />
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="jx-xs-title"
            initial={{ opacity: 0, scale: 0.97, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="jx-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <header className="jx-xs__head">
              {step === "preview" && (
                <button type="button" className="jx-xs__icon" onClick={() => setStep("form")} aria-label="Back to settings" disabled={loading}>
                  <ArrowLeft size={16} />
                </button>
              )}
              <div className="jx-xs__titles">
                <span className="jx-xs__eyebrow">
                  {step === "preview" ? "Step 2 of 2 · Review" : isPro ? "Step 1 of 2 · Connect" : "Exchange sync"}
                </span>
                <h2 id="jx-xs-title">{step === "preview" ? `Review your ${meta.name} trades` : `Connect ${meta.name}`}</h2>
              </div>
              <button type="button" className="jx-xs__icon" onClick={onClose} aria-label="Close" disabled={loading}>
                <X size={16} />
              </button>
            </header>

            <div className="jx-xs__body">
              {!isPro ? (
                <div className="jx-xs__pro">
                  <span className="jx-xs__proIco"><Crown size={18} /></span>
                  <div>
                    <b>Exchange sync is a Pro feature</b>
                    <p>Upgrade to connect Binance and Bybit and have your closed trades imported automatically.</p>
                  </div>
                </div>
              ) : step === "form" ? (
                <>
                  {connected && (
                    <div className="jx-xs__status">
                      <span className="jx-xs__dot" aria-hidden="true" />
                      <span>
                        <b>Connected</b> · key ••••{status.keyHint}
                        {lastSync ? <small>Last sync {lastSync}</small> : null}
                      </span>
                    </div>
                  )}

                  {/* 1 · create key */}
                  <section className="jx-xs__step" aria-labelledby="jx-xs-s1">
                    <span className="jx-xs__num" aria-hidden="true">1</span>
                    <div className="jx-xs__stepBody">
                      <h3 id="jx-xs-s1">Create a read-only API key</h3>
                      <ul className="jx-xs__checks">
                        <li><Check size={13} /> Enable <b>read</b> permission only</li>
                        <li className="off"><X size={13} /> Leave trading and withdrawals off</li>
                      </ul>
                      <a href={meta.apiPage} target="_blank" rel="noopener noreferrer" className="jx-xs__link">
                        Open {meta.name} API settings <ExternalLink size={13} />
                        <span className="jx-sr">(opens in a new tab)</span>
                      </a>
                    </div>
                  </section>

                  {/* 2 · paste keys */}
                  <section className="jx-xs__step" aria-labelledby="jx-xs-s2">
                    <span className={`jx-xs__num ${keysOk ? "is-done" : ""}`} aria-hidden="true">{keysOk ? <Check size={13} /> : 2}</span>
                    <div className="jx-xs__stepBody">
                      <h3 id="jx-xs-s2">Paste your key and secret</h3>
                      <label className="jx-xs__field">
                        <span className="jx-xs__lbl">API key <i aria-hidden="true">*</i><span className="jx-sr">(required)</span></span>
                        <span className="jx-xs__input">
                          <KeyRound size={14} aria-hidden="true" />
                          <input type="password" autoComplete="off" spellCheck={false} required
                            placeholder={connected ? "Enter a new key to replace" : "Paste your API key"}
                            value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                        </span>
                      </label>
                      <label className="jx-xs__field">
                        <span className="jx-xs__lbl">API secret <i aria-hidden="true">*</i><span className="jx-sr">(required)</span></span>
                        <span className="jx-xs__input">
                          <Lock size={14} aria-hidden="true" />
                          <input type={showSecret ? "text" : "password"} autoComplete="off" spellCheck={false} required
                            placeholder="Paste your API secret"
                            value={secret} onChange={(e) => setSecret(e.target.value)} />
                          <button type="button" className="jx-xs__eye" onClick={() => setShowSecret((v) => !v)}
                            aria-label={showSecret ? "Hide secret" : "Show secret"} aria-pressed={showSecret}>
                            {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </span>
                      </label>
                    </div>
                  </section>

                  {/* 3 · what to sync */}
                  <section className="jx-xs__step" aria-labelledby="jx-xs-s3">
                    <span className="jx-xs__num" aria-hidden="true">3</span>
                    <div className="jx-xs__stepBody">
                      <h3 id="jx-xs-s3">Choose what to sync</h3>
                      <div className="jx-xs__field">
                        <span className="jx-xs__lbl" id="jx-xs-mk">Markets <i aria-hidden="true">*</i><span className="jx-sr">(pick at least one)</span></span>
                        <div className="jx-xs__chips" role="group" aria-labelledby="jx-xs-mk">
                          {meta.markets.map((m) => {
                            const on = markets.includes(m.id);
                            return (
                              <button key={m.id} type="button" role="checkbox" aria-checked={on} onClick={() => toggleMarket(m.id)}>
                                <span className="jx-xs__box" aria-hidden="true">{on && <Check size={11} strokeWidth={3} />}</span>
                                {m.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="jx-xs__field">
                        <span className="jx-xs__lbl" id="jx-xs-win">History to pull</span>
                        <div className="jx-xs__seg" role="radiogroup" aria-labelledby="jx-xs-win">
                          {WINDOWS.map((w) => (
                            <button key={w.d} type="button" role="radio" aria-checked={windowDays === w.d} onClick={() => setWindowDays(w.d)}>
                              {w.d} days
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  <p className="jx-xs__note">
                    <ShieldCheck size={14} aria-hidden="true" />
                    <span>Keys are encrypted at rest and only used to read your closed trades. Nothing is imported until you review it.</span>
                  </p>
                </>
              ) : (
                <>
                  <div className="jx-xs__sum">
                    <div><span>Trades found</span><b>{totalPreview}</b></div>
                    <div><span>Net P&amp;L</span>
                      <b className={previewNet >= 0 ? "pos" : "neg"}>{previewNet >= 0 ? "+" : "−"}{fmt(Math.abs(previewNet))}</b></div>
                    <div><span>Win rate</span><b>{preview.length ? `${Math.round((previewWins / preview.length) * 100)}%` : "–"}</b></div>
                  </div>
                  <p className="jx-xs__meta">
                    {markets.map(marketLabel).join(" · ")} · last {windowDays} days
                    {preview.length && preview.length < totalPreview ? ` · stats from the ${preview.length} latest shown` : ""}
                  </p>

                  <ul className="jx-xs__list" aria-label="Trades to import">
                    {preview.map((t, i) => {
                      const pnl = Number(t.pnl || 0);
                      return (
                        <li key={t.externalId || i} data-tone={pnl >= 0 ? "pos" : "neg"}>
                          <span className="jx-xs__sym">
                            <b>{t.symbol}</b>
                            <em>{t.direction === "long" ? "Long" : "Short"}</em>
                          </span>
                          <span className="jx-xs__px">
                            {t.entry ? fmt(t.entry) : ""}{t.exit ? ` → ${fmt(t.exit)}` : ""}
                            {t.closeTime ? <small>{new Date(t.closeTime).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</small> : null}
                          </span>
                          <b className={`jx-xs__pnl ${pnl >= 0 ? "pos" : "neg"}`}>{pnl >= 0 ? "+" : "−"}{fmt(Math.abs(pnl))}</b>
                        </li>
                      );
                    })}
                    {preview.length === 0 && (
                      <li className="jx-xs__empty">No closed trades in the last {windowDays} days. Try a longer period or another market.</li>
                    )}
                  </ul>

                  <p className="jx-xs__note">
                    <ShieldCheck size={14} aria-hidden="true" />
                    <span>Trades you already logged are skipped automatically, so nothing is duplicated.</span>
                  </p>
                </>
              )}
            </div>

            {/* footer */}
            <footer className="jx-xs__foot">
              {isPro && connected && step === "form" ? (
                <button type="button" className="jx-xs__danger" onClick={disconnect} disabled={loading}>
                  <Trash2 size={14} /> Disconnect
                </button>
              ) : <span />}
              <div className="jx-xs__actions">
                <button type="button" className="jx-xs__ghost" onClick={onClose} disabled={loading}>
                  {isPro ? "Cancel" : "Close"}
                </button>
                {isPro && step === "form" && (
                  <button type="button" className="jx-xs__gold" onClick={connect} disabled={loading}>
                    {loading ? <><Spinner /> Connecting…</> : "Connect & preview"}
                  </button>
                )}
                {isPro && step === "preview" && (
                  <button type="button" className="jx-xs__gold" onClick={sync} disabled={loading}>
                    {loading ? <><Spinner /> Syncing…</> : <><Download size={15} /> {totalPreview ? `Sync ${totalPreview} trade${totalPreview === 1 ? "" : "s"}` : "Sync trades"}</>}
                  </button>
                )}
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
