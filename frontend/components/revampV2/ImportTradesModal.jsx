"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import Cookies from "js-cookie";
import Papa from "papaparse";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileDown,
  Upload,
  X,
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
          className="jx-modal-overlay jx-modal-overlay--blur jx-modal-overlay--sheet"
          style={{ alignItems: "flex-end", justifyContent: "center", padding: 0 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose?.()}
        >
          <Toast toast={toast} />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="jx-ltmodal jx-ltmodal--sheet"
            style={{ position: "relative" }}
          >
            {/* grab handle */}
            <div className="jx-lt-grab" aria-hidden="true" style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px" }}>
              <span style={{ width: 40, height: 4, borderRadius: 999, background: "var(--color-border-strong)" }} />
            </div>

            {/* header */}
            <div className="jx-ltmodal__header" style={{ flexDirection: "column", alignItems: "stretch", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-2)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ font: "var(--text-h2)" }}>Import trades</span>
                  <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>
                    Download a template, fill in your trades, and upload it here.
                  </span>
                </div>
                <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} aria-label="Close" style={{ padding: 8 }} disabled={saving}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="jx-ltmodal__body">
              <div className="jx-ltmodal__form">
                {/* Free-plan import allowance warning */}
                {freeRemaining !== Infinity && (
                  <div className="jx-banner jx-banner--warn" style={{ alignItems: "flex-start" }}>
                    <AlertTriangle size={16} style={{ color: "var(--yellow-500)", flexShrink: 0, marginTop: 1 }} />
                    <span style={{ font: "var(--text-caption)" }}>
                      Free plan: only the <strong>latest {freeRemaining}</strong> trade{freeRemaining === 1 ? "" : "s"} you can still log this month will be imported. Rows already logged are skipped automatically. <strong>Upgrade</strong> to import everything.
                    </span>
                  </div>
                )}

                {/* Templates section */}
                <div className="jx-ltgroup">
                  <Sect icon={FileDown} title="Download a template" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
                      <span style={{ font: "var(--text-body-md)", fontWeight: 500 }}>Only P&amp;L log</span>
                      <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={() => downloadTemplate(QUICK_TEMPLATE.key)}>
                        <Download size={14} /> Download
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
                      <span style={{ font: "var(--text-body-md)", fontWeight: 500 }}>Detailed log</span>
                      <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={() => downloadTemplate(DETAILED_TEMPLATE.key)}>
                        <Download size={14} /> Download
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upload section */}
                <div className="jx-ltgroup">
                  <Sect icon={Upload} title="Upload your filled file" />
                  <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
                  <div
                    className="jx-dropzone"
                    style={{ cursor: "pointer", background: "var(--color-bg-elevated)" }}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
                  >
                    <span className="jx-sect__icon" style={{ borderRadius: "50%", width: 40, height: 40, display: "flex" }}>
                      <Upload size={17} />
                    </span>
                    <strong style={{ color: "var(--color-text-primary)" }}>
                      {fileName || "Drop your CSV here"}
                    </strong>
                    <span style={{ font: "var(--text-caption)" }}>Click or drag &amp; drop · CSV</span>
                  </div>

                  {/* validation errors */}
                  {errors.length > 0 && (
                    <div className="jx-banner" style={{ alignItems: "flex-start", background: "var(--color-danger-subtle)", marginTop: "var(--space-1)" }}>
                      <AlertTriangle size={15} style={{ color: "var(--color-danger)", flexShrink: 0, marginTop: 1 }} />
                      <span style={{ font: "var(--text-caption)" }}>
                        <strong style={{ color: "var(--color-danger-strong)" }}>Fix these and re-upload</strong>
                        <ul style={{ margin: "6px 0 0", paddingLeft: 16, color: "var(--color-text-secondary)" }}>
                          {errors.slice(0, 6).map((e, i) => (<li key={i}>{e}</li>))}
                          {errors.length > 6 && <li>…and {errors.length - 6} more</li>}
                        </ul>
                      </span>
                    </div>
                  )}
                </div>

                {/* Ready-to-import preview */}
                {rows.length > 0 && (
                  <div className="jx-ltgroup">
                    <Sect icon={CheckCircle2} title={`Ready · ${rows.length} trades`} />
                    <div className="jx-banner jx-banner--success">
                      <CheckCircle2 size={16} style={{ color: "var(--color-success)" }} />
                      <span>All looks good, <strong style={{ color: "var(--color-success-strong)" }}>{rows.length} trades</strong> ready to import.</span>
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                      {rows.slice(0, 6).map((r, i) => (
                        <Badge key={i} variant={r.pnl >= 0 ? "success" : "danger"}>
                          {r.symbol} {r.pnl >= 0 ? "+" : ""}{r.pnl}
                        </Badge>
                      ))}
                      {rows.length > 6 && <Badge variant="neutral">+{rows.length - 6} more</Badge>}
                    </div>
                    {computedCount > 0 && (
                      <div style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", display: "flex", gap: 6 }}>
                        <AlertTriangle size={13} style={{ color: "var(--yellow-500)", flexShrink: 0, marginTop: 1 }} />
                        <span>{computedCount} trade{computedCount === 1 ? "" : "s"} had no P&amp;L column, we computed it from entry/exit/size (with futures point values). For exact numbers, include your platform&apos;s realized P&amp;L column and re-upload.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* footer */}
            <div className="jx-ltmodal__footer" style={{ justifyContent: "flex-end" }}>
              <button className="jx-btn jx-btn--ghost" onClick={() => { reset(); onClose?.(); }} disabled={saving}>
                Cancel
              </button>
              <button className="jx-btn jx-btn--primary" onClick={doImport} disabled={saving || rows.length === 0} style={{ minWidth: 150 }}>
                {saving ? <><Spinner /> Importing…</> : <><Upload size={15} /> Import {rows.length > 0 ? `${rows.length} trades` : ""}</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
