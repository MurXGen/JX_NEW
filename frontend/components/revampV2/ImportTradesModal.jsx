"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import Cookies from "js-cookie";
import Papa from "papaparse";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  FileDown,
  FileSpreadsheet,
  ListChecks,
  Upload,
  X,
  Zap,
} from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";
import Toast from "./Toast";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { logTradeToSheet, tradeToSheetPayload } from "@/utils/tradeSheetLog";
import { scheduleAutoBackup } from "@/utils/driveBackup";
import { getPlanRules, tradesRemaining } from "@/utils/planRestrictions";
import UpgradeSheet from "./UpgradeSheet";
import { QUICK_TEMPLATE, DETAILED_TEMPLATE, downloadTemplate } from "@/utils/csvTemplates";
import { parseImportRows } from "@/utils/importParse";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/* Figma "Import trades" modal, CSV template (quick-log columns),
   parse + validate with papaparse, then bulk POST /api/trades/bulk. */

/* Required: symbol, direction. Everything else is optional, use the Quick log
   template (result-only) or the Detailed template (entry/exit, risk, strategy,
   psychology). Templates are shared with the Import/Export page. */

const compactHdr = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const OUR_COLUMNS = new Set([...QUICK_TEMPLATE.columns, ...DETAILED_TEMPLATE.columns].map(compactHdr));

/* Only accept a JournalX template CSV. Requires symbol + direction and rejects
   any unknown columns, so users get a clear "use our template" message instead
   of a raw broker export producing wrong data. */
function checkTemplate(fields = []) {
  const hs = fields.map(compactHdr).filter(Boolean);
  if (!hs.length) return { ok: false, reason: "empty" };
  if (!hs.includes("symbol") || !hs.includes("direction")) return { ok: false, reason: "missing" };
  const unknown = [...new Set((fields || []).filter((f) => f && !OUR_COLUMNS.has(compactHdr(f))))];
  if (unknown.length) return { ok: false, reason: "unknown", unknown };
  return { ok: true };
}

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

/* matches the Log-trade sheet's section header (uppercase label under --sheet) */
function Sect({ icon: Icon, title, hint }) {
  return (
    <div className="jx-sect">
      <div className="jx-sect__left">
        <span className="jx-sect__icon">
          <Icon size={15} />
        </span>
        <span className="jx-sect__title">{title}</span>
      </div>
      {hint && <span className="jx-sect__hint">{hint}</span>}
    </div>
  );
}

export default function ImportTradesModal({ open, onClose, onImported }) {
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [computedCount, setComputedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [freeRemaining, setFreeRemaining] = useState(Infinity); // free monthly slots left
  // guided flow: 1 template → 2 upload → 3 review
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState("quick");
  const [dragOver, setDragOver] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches,
  );
  useEffect(() => {
    if (!open) return;
    setIsMobile(window.matchMedia("(max-width: 640px)").matches);
  }, [open]);
  // a clean parse jumps straight to the review step
  useEffect(() => { if (rows.length > 0) setStep(3); }, [rows.length]);
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const userData = await getFromIndexedDB("user-data");
        setFreeRemaining(tradesRemaining(userData));
      } catch { setFreeRemaining(Infinity); }
    })();
  }, [open]);
  const flash = (type, msg, ms = 3500) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), ms);
  };

  const reset = () => {
    setRows([]);
    setErrors([]);
    setFileName(null);
    setComputedCount(0);
    setStep(1);
  };

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        // 1) must be a JournalX template, reject raw broker exports clearly
        const tpl = checkTemplate(meta?.fields || []);
        if (!tpl.ok) {
          const msg =
            tpl.reason === "unknown"
              ? `That's not a JournalX template (unexpected column “${tpl.unknown[0]}”). Download the template below, paste your trades into it, and upload that.`
              : tpl.reason === "missing"
                ? `This file is missing the “symbol” and “direction” columns. Please use the JournalX template.`
                : `This file has no columns. Please use the JournalX template.`;
          setRows([]);
          setComputedCount(0);
          setErrors([msg]);
          flash("danger", "Please upload a JournalX template CSV");
          return;
        }
        // 2) parse rows (P&L taken as-is if present; futures point values applied)
        const { errs, clean, computedCount } = parseImportRows(data);
        setErrors(errs);
        setRows(errs.length ? [] : clean);
        setComputedCount(computedCount);
        if (!errs.length && clean.length === 0) setErrors(["No trades found, add rows to the template and upload again."]);
      },
      error: () => setErrors(["Could not read this file, is it a valid CSV?"]),
    });
  };

  const doImport = async () => {
    // resolve the journal: cookie → localStorage → first journal in cache
    let accountId =
      Cookies.get("accountId") ||
      (typeof window !== "undefined" && localStorage.getItem("jx-account-id"));
    if (!accountId) {
      try {
        const ud = await getFromIndexedDB("user-data");
        accountId = ud?.accounts?.[0]?._id || "";
      } catch {}
    }
    if (!accountId) return flash("danger", "No journal found, create a journal first");
    // persist so the rest of the app stays in sync
    Cookies.set("accountId", accountId, { expires: 365 });
    try { localStorage.setItem("jx-account-id", accountId); } catch {}

    setSaving(true);
    try {
      // the backend caps Free imports to the remaining monthly slots and skips
      // rows already logged (dedup) — we just send everything and read the result
      const res = await axios.post(
        `${API_BASE}/api/trades/bulk`,
        { accountId, trades: rows },
        { withCredentials: true },
      );
      const trades = res.data?.trades || [];

      // mirror imported trades to the tracking sheet (client-only, capped)
      trades.slice(0, 100).forEach((t) =>
        logTradeToSheet(tradeToSheetPayload(t, "csv-import")),
      );

      try {
        const userData = (await getFromIndexedDB("user-data")) || {};
        userData.trades = [...(userData.trades || []), ...trades];
        await saveToIndexedDB("user-data", userData);
      } catch (e) {
        console.error("IndexedDB sync failed:", e);
      }

      // one background Drive backup after the whole import (debounced, silent)
      scheduleAutoBackup();

      onImported?.(trades);
      flash(res.data?.imported ? "success" : "info", res.data?.message || `${trades.length} trades imported`);
      setTimeout(() => {
        reset();
        onClose?.();
      }, 1400);
    } catch (err) {
      console.error("Import failed:", err);
      // free monthly cap fully used → prompt upgrade
      if (err.response?.status === 403 && err.response?.data?.code === "LIMIT") {
        setUpgradeReason(err.response.data.message || "You've used your Free import allowance this month.");
        setShowUpgrade(true);
      } else {
        flash("danger", err.response?.data?.message || "Import failed, try again");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <UpgradeSheet open={showUpgrade} onClose={() => setShowUpgrade(false)} title="Import allowance reached" reason={upgradeReason} />
    <AnimatePresence>
      {open && (
        <motion.div
          className={`jx-modal-overlay jx-modal-overlay--blur ${isMobile ? "jx-modal-overlay--sheet" : ""}`}
          style={isMobile ? { alignItems: "flex-end", justifyContent: "center", padding: 0 } : undefined}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose?.()}
        >
          <Toast toast={toast} />
          <motion.div
            initial={isMobile ? { y: "100%", opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className={`jx-ltmodal jx-td jx-imp ${isMobile ? "jx-ltmodal--sheet" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="imp-title"
            style={{ position: "relative" }}
          >
            {isMobile && (
              <div className="jx-lt-grab" aria-hidden="true" style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px" }}>
                <span style={{ width: 40, height: 4, borderRadius: 999, background: "var(--color-border-strong)" }} />
              </div>
            )}

            {/* header + stepper */}
            <div className="jx-ltmodal__header jx-imp__head">
              <div className="jx-imp__titlerow">
                <div>
                  <h2 id="imp-title" className="jx-imp__title">Import trades</h2>
                  <p className="jx-imp__sub">Bring your history in from a spreadsheet in three steps.</p>
                </div>
                <button className="jx-btn jx-btn--secondary jx-btn--sm jx-td__close" onClick={onClose} aria-label="Close" style={{ padding: 8 }} disabled={saving}>
                  <X size={16} />
                </button>
              </div>
              <ol className="jx-imp__steps" aria-label="Import steps">
                {["Get the template", "Upload your file", "Review & import"].map((label, i) => {
                  const n = i + 1;
                  const state = step > n ? "done" : step === n ? "current" : "todo";
                  const reachable = n < step || (n === 2 && step === 1);
                  return (
                    <li key={label} className="jx-imp__step" data-state={state}>
                      <button
                        type="button"
                        onClick={() => reachable && !saving && setStep(n)}
                        disabled={!reachable || saving}
                        aria-current={state === "current" ? "step" : undefined}
                      >
                        <span className="jx-imp__dot" aria-hidden="true">{state === "done" ? <Check size={12} strokeWidth={3} /> : n}</span>
                        <span className="jx-imp__steplbl">{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="jx-ltmodal__body jx-imp__body">
              <div className="jx-ltmodal__form jx-imp__form">
                {freeRemaining !== Infinity && (
                  <div className="jx-banner jx-banner--warn" style={{ alignItems: "flex-start" }}>
                    <AlertTriangle size={16} style={{ color: "var(--yellow-500)", flexShrink: 0, marginTop: 1 }} />
                    <span style={{ font: "var(--text-caption)" }}>
                      Free plan: only the <strong>latest {freeRemaining}</strong> trade{freeRemaining === 1 ? "" : "s"} you can still log this month will be imported. Rows already logged are skipped automatically. <strong>Upgrade</strong> to import everything.
                    </span>
                  </div>
                )}

                {/* ---------- step 1: pick + download a template ---------- */}
                {step === 1 && (() => {
                  const t = kind === "quick" ? QUICK_TEMPLATE : DETAILED_TEMPLATE;
                  // required per the import parser: symbol + direction, plus pnl
                  // (Only P&L) or an entry price (Detailed has no pnl column)
                  const required = new Set(["symbol", "direction", kind === "quick" ? "pnl" : "entry"]);
                  const cols = t.columns.slice(0, isMobile ? 3 : 5);
                  const more = t.columns.length - cols.length;
                  return (
                    <>
                      <div className="jx-imp__lead">
                        <b>Which template fits how you journal?</b>
                        <span>Only the columns marked * are required. Leave the rest empty if you don&apos;t track them.</span>
                      </div>
                      <div className="jx-imp__kinds" role="radiogroup" aria-label="Template">
                        {[
                          { k: "quick", icon: Zap, title: "Only P&L", desc: "Symbol, side and result. Fastest way to bring history in.", n: QUICK_TEMPLATE.columns.length },
                          { k: "detailed", icon: ListChecks, title: "Detailed", desc: "Entry/exit, size, risk, strategy and psychology.", n: DETAILED_TEMPLATE.columns.length },
                        ].map((o) => (
                          <button key={o.k} type="button" role="radio" aria-checked={kind === o.k} className="jx-imp__kind" onClick={() => setKind(o.k)}>
                            <span className="jx-imp__kindico" aria-hidden="true"><o.icon size={16} /></span>
                            <span className="jx-imp__kindtxt">
                              <b>{o.title}</b>
                              <span>{o.desc}</span>
                              <small>{o.n} columns</small>
                            </span>
                            <span className="jx-imp__radio" aria-hidden="true" />
                          </button>
                        ))}
                      </div>

                      <div className="jx-imp__preview">
                        <div className="jx-imp__previewhead">
                          <span><FileSpreadsheet size={14} aria-hidden="true" /> {t.fileName}</span>
                          <small>Sample rows · replace them with your trades</small>
                        </div>
                        <div className="jx-imp__tablewrap">
                          <table className="jx-imp__table">
                            <thead>
                              <tr>
                                {cols.map((c) => (
                                  <th key={c}>{c}{required.has(c) && <em className="jx-req" aria-label="required">*</em>}</th>
                                ))}
                                {more > 0 && <th className="jx-imp__more">+{more} more</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {t.rows.map((r, i) => (
                                <tr key={i}>
                                  {cols.map((c) => <td key={c}>{r[t.columns.indexOf(c)]}</td>)}
                                  {more > 0 && <td className="jx-imp__more">…</td>}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <ul className="jx-imp__tips">
                          <li><b>direction</b> is long or short (buy/sell also works)</li>
                          {kind === "quick"
                            ? <li><b>pnl</b> is your net result; negative for a loss</li>
                            : <li><b>entry</b> is required; add <b>exit</b> and <b>size</b> and we work out the P&amp;L</li>}
                          <li>Dates like <b>2026-06-01 14:30</b></li>
                        </ul>
                      </div>
                    </>
                  );
                })()}

                {/* ---------- step 2: upload ---------- */}
                {step === 2 && (
                  <>
                    <div className="jx-imp__lead">
                      <b>Upload your filled template</b>
                      <span>We check every row before anything is saved, so nothing is imported until you confirm.</span>
                    </div>
                    <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
                    <button
                      type="button"
                      className={`jx-imp__drop${dragOver ? " jx-imp__drop--over" : ""}${errors.length ? " jx-imp__drop--err" : ""}`}
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
                    >
                      <span className="jx-imp__dropico" aria-hidden="true"><Upload size={20} /></span>
                      <b>{fileName || "Drop your CSV here"}</b>
                      <span>{fileName ? "Choose a different file" : "or click to browse · .csv only"}</span>
                    </button>

                    {errors.length > 0 && (
                      <div className="jx-imp__err" role="alert">
                        <AlertTriangle size={15} aria-hidden="true" />
                        <div>
                          <b>Fix these and upload again</b>
                          <ul>
                            {errors.slice(0, 6).map((e, i) => (<li key={i}>{e}</li>))}
                            {errors.length > 6 && <li>…and {errors.length - 6} more</li>}
                          </ul>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ---------- step 3: review ---------- */}
                {step === 3 && rows.length > 0 && (() => {
                  const net = rows.reduce((a, r) => a + (Number(r.pnl) || 0), 0);
                  const wins = rows.filter((r) => Number(r.pnl) > 0).length;
                  const losses = rows.filter((r) => Number(r.pnl) < 0).length;
                  const fmtN = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
                  const when = (r) => {
                    const d = r.closeTime || r.openTime;
                    const dt = d ? new Date(d) : null;
                    return dt && !Number.isNaN(dt.getTime()) ? dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
                  };
                  return (
                    <>
                      <div className="jx-imp__ok">
                        <CheckCircle2 size={18} aria-hidden="true" />
                        <div>
                          <b>{rows.length} trade{rows.length === 1 ? "" : "s"} ready from {fileName}</b>
                          <span>Every row passed the checks. Review the preview, then import.</span>
                        </div>
                      </div>
                      <div className="jx-imp__sum">
                        <div><span>Trades</span><b>{rows.length}</b></div>
                        <div><span>Net P&amp;L</span><b className={net > 0 ? "is-pos" : net < 0 ? "is-neg" : undefined}>{fmtN(net)}</b></div>
                        <div><span>Wins · losses</span><b>{wins} · {losses}</b></div>
                      </div>
                      <div className="jx-imp__preview">
                        <div className="jx-imp__tablewrap">
                          <table className="jx-imp__table">
                            <thead><tr><th>Symbol</th><th>Side</th><th>Date</th><th style={{ textAlign: "right" }}>P&amp;L</th></tr></thead>
                            <tbody>
                              {rows.slice(0, 8).map((r, i) => (
                                <tr key={i}>
                                  <td><b>{r.symbol}</b></td>
                                  <td style={{ textTransform: "capitalize" }}>{r.direction}</td>
                                  <td>{when(r)}</td>
                                  <td style={{ textAlign: "right" }} className={Number(r.pnl) > 0 ? "is-pos" : Number(r.pnl) < 0 ? "is-neg" : undefined}>{fmtN(Number(r.pnl) || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {rows.length > 8 && <small className="jx-imp__morerows">+{rows.length - 8} more rows will be imported</small>}
                      </div>
                      {computedCount > 0 && (
                        <p className="jx-imp__note">
                          {computedCount} trade{computedCount === 1 ? "" : "s"} had no P&amp;L, so we worked it out from entry, exit and size (with futures point values). Add your platform&apos;s realised P&amp;L column for exact numbers.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* footer */}
            <div className="jx-ltmodal__footer jx-imp__foot">
              {step > 1 ? (
                <button className="jx-btn jx-btn--ghost" onClick={() => setStep(step === 3 ? 2 : 1)} disabled={saving}>
                  <ArrowLeft size={15} aria-hidden="true" /> Back
                </button>
              ) : (
                <button className="jx-btn jx-btn--ghost" onClick={() => setStep(2)}>
                  I already have a file
                </button>
              )}
              <span style={{ flex: 1 }} />
              {step === 1 && (
                <>
                  <button className="jx-btn jx-btn--outline" onClick={() => downloadTemplate(kind)}>
                    <Download size={15} aria-hidden="true" /> Download template
                  </button>
                  <button className="jx-btn jx-btn--primary" onClick={() => setStep(2)}>
                    Next <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </>
              )}
              {step === 2 && (
                <button className="jx-btn jx-btn--primary" onClick={() => fileRef.current?.click()}>
                  <Upload size={15} aria-hidden="true" /> Choose file
                </button>
              )}
              {step === 3 && (
                <button className="jx-btn jx-btn--primary" onClick={doImport} disabled={saving || rows.length === 0} style={{ minWidth: 150 }}>
                  {saving ? <><Spinner /> Importing…</> : <><Upload size={15} aria-hidden="true" /> Import {rows.length} trade{rows.length === 1 ? "" : "s"}</>}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
