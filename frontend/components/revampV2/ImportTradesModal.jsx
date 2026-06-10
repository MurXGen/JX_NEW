"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import Cookies from "js-cookie";
import Papa from "papaparse";
import {
  AlertTriangle,
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
import { getPlanRules } from "@/utils/planRestrictions";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/* Figma "Import trades" modal — CSV template (quick-log columns),
   parse + validate with papaparse, then bulk POST /api/trades/bulk. */

/* Required: symbol, direction. Everything else is optional — fill only the
   quick-log basics (pnl/size) or go deeper with entry/exit/SL/TP, strategy
   and emotion. */
const TEMPLATE_COLUMNS = [
  "symbol", "direction", "pnl", "size", "openTime", "closeTime",
  "entry", "exit", "stopLoss", "takeProfit", "strategy", "emotion", "notes",
];
const TEMPLATE_ROWS = [
  ["BTC/USDT", "long", "1250", "0.5", "2026-06-01 10:00", "2026-06-01 14:30", "61240", "63740", "60000", "65000", "Breakout", "Confident", "Breakout retest"],
  ["ETH/USDT", "short", "-420", "4", "", "2026-06-02 10:05", "", "", "", "", "", "FOMO", "Chased the move"],
  ["SOL/USDT", "long", "", "30", "2026-06-03 09:00", "", "182.4", "", "175", "210", "Trend-follow", "Calm"],
];

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
  };

  const downloadTemplate = () => {
    const csv = [TEMPLATE_COLUMNS.join(","), ...TEMPLATE_ROWS.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "journalx_quick_log_template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const validate = (data) => {
    const errs = [];
    const clean = [];
    data.forEach((r, i) => {
      const n = i + 2; // header is row 1
      const symbol = String(r.symbol || "").trim();
      const direction = String(r.direction || "").trim().toLowerCase();
      const hasPnl = String(r.pnl ?? "").trim() !== "";
      const pnl = Number(r.pnl);
      const entry = Number(r.entry) || 0;
      const exit = Number(r.exit) || 0;
      const size = Number(r.size) || 0;
      const closeTime = r.closeTime ? new Date(r.closeTime) : null;
      const openTime = r.openTime ? new Date(r.openTime) : null;
      // blank line
      if (!symbol && !r.direction && !hasPnl && !r.entry) return;
      if (!symbol) errs.push(`Row ${n}: symbol is missing`);
      if (!["long", "short"].includes(direction)) errs.push(`Row ${n}: direction must be "long" or "short"`);
      // P&L optional — required only if we can't derive it and there's no entry-only (running)
      if (hasPnl && Number.isNaN(pnl)) errs.push(`Row ${n}: pnl must be a number`);
      if (!hasPnl && !entry) errs.push(`Row ${n}: add a pnl, or an entry price for an open trade`);
      if (closeTime && Number.isNaN(closeTime.getTime())) errs.push(`Row ${n}: closeTime is not a valid date`);
      if (openTime && Number.isNaN(openTime.getTime())) errs.push(`Row ${n}: openTime is not a valid date`);

      const dirMul = direction === "long" ? 1 : -1;
      const computedPnl = hasPnl && !Number.isNaN(pnl)
        ? pnl
        : entry && exit && size ? (exit - entry) * size * dirMul : 0;

      clean.push({
        symbol: symbol.toUpperCase(),
        direction,
        pnl: computedPnl,
        size,
        entry, exit,
        stopLoss: Number(r.stopLoss) || 0,
        takeProfit: Number(r.takeProfit) || 0,
        strategy: String(r.strategy || "").trim(),
        emotion: String(r.emotion || "").trim(),
        openTime: openTime && !Number.isNaN(openTime.getTime()) ? openTime.toISOString() : "",
        closeTime: closeTime && !Number.isNaN(closeTime.getTime()) ? closeTime.toISOString() : "",
        notes: String(r.notes || ""),
        _running: !hasPnl && !exit && !!entry,
      });
    });
    return { errs, clean };
  };

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const { errs, clean } = validate(data);
        setErrors(errs);
        setRows(errs.length ? [] : clean);
        if (!errs.length && clean.length === 0) setErrors(["No rows found in the file"]);
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
                  Upload a CSV of quick logs — download the template, fill it, drop it here.
                </span>
              </div>
              <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} aria-label="Close" style={{ padding: 8 }} disabled={saving}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "var(--space-5) var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)", overflowY: "auto" }}>
              {/* step 1: template */}
              <div className="jx-card jx-card--flat" style={{ padding: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span className="jx-sect__icon"><FileText size={15} /></span>
                <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>1 · Download the template</span>
                  <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                    Columns: {TEMPLATE_COLUMNS.join(", ")}
                  </span>
                </span>
                <Button variant="outline" size="sm" icon={Download} onClick={downloadTemplate}>
                  CSV
                </Button>
              </div>

              {/* step 2: upload */}
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
              <div
                className="jx-dropzone"
                style={{ borderColor: "var(--color-primary)", background: "var(--color-primary-subtle)" }}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
              >
                <span className="jx-sect__icon" style={{ borderRadius: "50%", width: 36, height: 36 }}>
                  <Upload size={16} />
                </span>
                <strong style={{ color: "var(--color-text-primary)" }}>
                  {fileName || "2 · Drag & drop your filled CSV"}
                </strong>
                <span style={{ font: "var(--text-caption)" }}>or click to browse · max 500 trades</span>
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
