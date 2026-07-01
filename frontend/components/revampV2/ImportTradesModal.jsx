"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import Cookies from "js-cookie";
import Papa from "papaparse";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Upload,
  X,
} from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";
import Toast from "./Toast";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { logTradeToSheet, tradeToSheetPayload } from "@/utils/tradeSheetLog";
import { scheduleAutoBackup } from "@/utils/driveBackup";
import { getPlanRules } from "@/utils/planRestrictions";
import { QUICK_TEMPLATE, DETAILED_TEMPLATE, downloadTemplate } from "@/utils/csvTemplates";
import { parseImportRows } from "@/utils/importParse";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/* Figma "Import trades" modal — CSV template (quick-log columns),
   parse + validate with papaparse, then bulk POST /api/trades/bulk. */

/* Required: symbol, direction. Everything else is optional — use the Quick log
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

/* three-step progress bar (replaces the "1 · / 2 ·" numbering) */
function Stepper({ step }) {
  const labels = ["Get template", "Upload CSV", "Review & import"];
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "active" : "todo";
        const on = state !== "todo";
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < labels.length - 1 ? 1 : "0 0 auto", minWidth: 0 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", font: "700 11px Poppins",
                background: on ? "var(--color-primary)" : "var(--color-bg-muted)",
                color: on ? "var(--color-primary-foreground)" : "var(--color-text-muted)",
                boxShadow: state === "active" ? "0 0 0 3px var(--color-primary-subtle)" : "none",
              }}>
                {state === "done" ? <Check size={13} /> : n}
              </span>
              <span style={{ font: "var(--text-caption)", fontWeight: state === "active" ? 600 : 400, color: on ? "var(--color-text-primary)" : "var(--color-text-muted)", whiteSpace: "nowrap" }}>{label}</span>
            </span>
            {i < labels.length - 1 && (
              <span style={{ flex: 1, height: 2, margin: "0 8px", borderRadius: 2, background: n < step ? "var(--color-primary)" : "var(--color-border)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
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

export default function ImportTradesModal({ open, onClose, onImported }) {
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [computedCount, setComputedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
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
        // 1) must be a JournalX template — reject raw broker exports clearly
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
        if (!errs.length && clean.length === 0) setErrors(["No trades found — add rows to the template and upload again."]);
      },
      error: () => setErrors(["Could not read this file — is it a valid CSV?"]),
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
    if (!accountId) return flash("danger", "No journal found — create a journal first");
    // persist so the rest of the app stays in sync
    Cookies.set("accountId", accountId, { expires: 365 });
    try { localStorage.setItem("jx-account-id", accountId); } catch {}

    /* plan limit: free plans can't bulk-import beyond their monthly cap */
    try {
      const userData = await getFromIndexedDB("user-data");
      const limit = getPlanRules(userData).limits.tradeLimitPerMonth;
      if (limit !== Infinity) {
        return flash("danger", `Bulk import is a Pro feature. Your plan is capped at ${limit} trades/month — upgrade to import in bulk.`);
      }
    } catch {}

    setSaving(true);
    try {
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
      flash("success", `${trades.length} trades imported`);
      setTimeout(() => {
        reset();
        onClose?.();
      }, 1000);
    } catch (err) {
      console.error("Import failed:", err);
      flash("danger", err.response?.data?.message || "Import failed — try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay jx-modal-overlay--blur"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose?.()}
        >
          <Toast toast={toast} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="jx-ltmodal jx-ltmodal--narrow"
            style={{ width: "min(560px, 96vw)" }}
          >
            {/* header */}
            <div className="jx-ltmodal__header">
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>Import trades</span>
                <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>
                  Download the template, fill in your trades, and upload it here.
                </span>
              </div>
              <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} aria-label="Close" style={{ padding: 8 }} disabled={saving}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "var(--space-5) var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)", overflowY: "auto" }}>
              {/* progress */}
              <Stepper step={rows.length > 0 ? 3 : fileName ? 2 : 1} />

              {/* Step 1 — get the template */}
              <div className="jx-card jx-card--flat" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div>
                  <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>Get the JournalX template</span>
                  <div style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: 2 }}>
                    Download it, paste your trades into the columns, and save. <strong>Quick</strong> = just the result (symbol, side, P&amp;L). <strong>Detailed</strong> = full trade.
                  </div>
                </div>
                {[QUICK_TEMPLATE, DETAILED_TEMPLATE].map((t) => (
                  <div key={t.key} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <span style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{t.label}</span>
                      <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{t.hint}</span>
                    </span>
                    <Button variant="outline" size="sm" icon={Download} onClick={() => downloadTemplate(t.key)}>
                      Download
                    </Button>
                  </div>
                ))}
              </div>

              {/* Step 2 — upload the filled template */}
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
              <div
                className="jx-dropzone"
                style={{ borderColor: "var(--color-primary)", background: "var(--color-primary-subtle)", cursor: "pointer" }}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
              >
                <span className="jx-sect__icon" style={{ borderRadius: "50%", width: 36, height: 36 }}>
                  <Upload size={16} />
                </span>
                <strong style={{ color: "var(--color-text-primary)" }}>
                  {fileName || "Upload your filled template"}
                </strong>
                <span style={{ font: "var(--text-caption)" }}>Click or drag &amp; drop · JournalX template CSV only</span>
              </div>

              {/* validation results */}
              {errors.length > 0 && (
                <div className="jx-card jx-card--flat" style={{ padding: "var(--space-3) var(--space-4)", borderColor: "var(--color-danger)" }}>
                  <span style={{ font: "var(--text-body-md)", fontWeight: 600, color: "var(--color-danger)", display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={15} /> Fix these and re-upload
                  </span>
                  <ul style={{ margin: "var(--space-2) 0 0", paddingLeft: 18, font: "var(--text-small)", color: "var(--color-text-secondary)" }}>
                    {errors.slice(0, 6).map((e, i) => (<li key={i}>{e}</li>))}
                    {errors.length > 6 && <li>…and {errors.length - 6} more</li>}
                  </ul>
                </div>
              )}

              {rows.length > 0 && (
                <div className="jx-card jx-card--flat" style={{ padding: "var(--space-3) var(--space-4)" }}>
                  <span style={{ font: "var(--text-body-md)", fontWeight: 600, color: "var(--color-success-strong)", display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle2 size={15} /> All looks good — {rows.length} trades ready
                  </span>
                  <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-2)" }}>
                    {rows.slice(0, 5).map((r, i) => (
                      <Badge key={i} variant={r.pnl >= 0 ? "success" : "danger"}>
                        {r.symbol} {r.pnl >= 0 ? "+" : ""}{r.pnl}
                      </Badge>
                    ))}
                    {rows.length > 5 && <Badge variant="neutral">+{rows.length - 5} more</Badge>}
                  </div>
                  {computedCount > 0 && (
                    <div style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: "var(--space-2)", display: "flex", gap: 6 }}>
                      <AlertTriangle size={13} style={{ color: "var(--color-warning, var(--yellow-500))", flexShrink: 0, marginTop: 1 }} />
                      <span>{computedCount} trade{computedCount === 1 ? "" : "s"} had no P&amp;L column — we computed it from entry/exit/size (with futures point values). For exact numbers, include your platform&apos;s realized P&amp;L column and re-upload.</span>
                    </div>
                  )}
                </div>
              )}
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
  );
}
