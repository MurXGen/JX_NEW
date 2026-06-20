"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft,
  Calendar,
  Check,
  ChevronRight,
  Download,
  FileText,
  LineChart,
  Upload,
} from "lucide-react";
import Button from "./Button";
import Toast from "./Toast";
import { QUICK_TEMPLATE, DETAILED_TEMPLATE, downloadTemplate } from "@/utils/csvTemplates";

/* Figma "Import & Export · Desktop" (22825:54050).
   CSV and PDF exports are generated client-side from the journal's
   trades (notes live inside the trade-logs section). */

const WHAT = [
  { id: "logs", icon: FileText, title: "Trade logs", sub: "Every trade with entries, exits, P&L & notes" },
  { id: "analytics", icon: LineChart, title: "Analytics summary", sub: "Win rate, P&L, averages, streaks" },
  { id: "bysymbol", icon: ArrowRightLeft, title: "P&L by symbol", sub: "Per-instrument breakdown" },
];

const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: null },
];

const RECENT_KEY = "jx-recent-exports";
const fmt = (v, d = 2) => Number(v).toLocaleString(undefined, { maximumFractionDigits: d });

/* ---- data builders ---- */
const buildStats = (list) => {
  const wins = list.filter((t) => t.pnl > 0);
  const losses = list.filter((t) => t.pnl < 0);
  const net = list.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  return {
    total: list.length,
    wins: wins.length,
    losses: losses.length,
    winRate: list.length ? ((wins.length / list.length) * 100).toFixed(1) : "0",
    net: net.toFixed(2),
    avgWin: wins.length ? (wins.reduce((s, t) => s + t.pnl, 0) / wins.length).toFixed(2) : "0",
    avgLoss: losses.length ? (losses.reduce((s, t) => s + t.pnl, 0) / losses.length).toFixed(2) : "0",
    best: list.length ? Math.max(...list.map((t) => Number(t.pnl) || 0)).toFixed(2) : "0",
    worst: list.length ? Math.min(...list.map((t) => Number(t.pnl) || 0)).toFixed(2) : "0",
  };
};

const bySymbol = (list) => {
  const m = new Map();
  list.forEach((t) => {
    const s = t.symbol || t.ticker || "—";
    if (!m.has(s)) m.set(s, { pnl: 0, n: 0, w: 0 });
    const e = m.get(s);
    e.pnl += Number(t.pnl) || 0;
    e.n++;
    if (t.pnl > 0) e.w++;
  });
  return [...m.entries()].sort((a, b) => b[1].pnl - a[1].pnl);
};

const logRows = (list) =>
  list.map((t) => [
    t.symbol || t.ticker || "",
    t.direction || "",
    t.avgEntryPrice || t.entryPrice || "",
    t.avgExitPrice || t.exitPrice || "",
    t.totalQuantity ?? "",
    Number(t.pnl || 0).toFixed(2),
    t.strategy || (t.reason || [])[0] || "",
    t.closeTime ? new Date(t.closeTime).toLocaleDateString("en-GB") : "",
    String(t.learnings || t.notes || "").replace(/\n/g, " "),
  ]);

export default function ImportExportPanel({ trades = [] }) {
  const [selected, setSelected] = useState(["logs", "analytics"]);
  const [range, setRange] = useState("Last 30 days");
  const [format, setFormat] = useState("CSV");
  const [importedName, setImportedName] = useState(null);
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
  });
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);
  const flash = (type, msg, ms = 3000) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), ms);
  };

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const filtered = useMemo(() => {
    const closed = trades.filter((t) => t.closeTime);
    const days = RANGES.find((r) => r.label === range)?.days;
    if (!days) return closed;
    const from = Date.now() - days * 864e5;
    return closed.filter((t) => new Date(t.closeTime).getTime() >= from);
  }, [trades, range]);

  const rememberExport = (name, size) => {
    const next = [{ name, meta: `${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · ${size}` }, ...recent].slice(0, 5);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  /* ---- CSV ---- */
  const downloadCsv = () => {
    const parts = [];
    if (selected.includes("logs")) {
      parts.push("TRADE LOGS");
      parts.push("symbol,direction,entry,exit,size,pnl,strategy,date,notes");
      logRows(filtered).forEach((r) => parts.push(r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")));
      parts.push("");
    }
    if (selected.includes("analytics")) {
      const s = buildStats(filtered);
      parts.push("ANALYTICS SUMMARY");
      parts.push("metric,value");
      Object.entries({ "Total trades": s.total, Wins: s.wins, Losses: s.losses, "Win rate %": s.winRate, "Net P&L": s.net, "Avg win": s.avgWin, "Avg loss": s.avgLoss, "Best trade": s.best, "Worst trade": s.worst }).forEach(([m, v]) => parts.push(`${m},${v}`));
      parts.push("");
    }
    if (selected.includes("bysymbol")) {
      parts.push("P&L BY SYMBOL");
      parts.push("symbol,trades,wins,pnl");
      bySymbol(filtered).forEach(([s, e]) => parts.push(`${s},${e.n},${e.w},${e.pnl.toFixed(2)}`));
    }
    const csv = parts.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const name = `journalx_export_${new Date().toISOString().slice(0, 10)}.csv`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    rememberExport(name, `${Math.max(1, Math.round(blob.size / 1024))} KB`);
  };

  /* ---- PDF (jspdf + autotable) ---- */
  const downloadPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    const yellow = [240, 185, 11];

    /* brand header */
    doc.setFillColor(...yellow);
    doc.rect(0, 0, 210, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 35, 41);
    doc.text("JournalX — Trading Report", 14, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${range} · generated ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`, 14, 25);

    let y = 32;

    if (selected.includes("analytics")) {
      const s = buildStats(filtered);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Analytics summary", 14, y);
      autoTable(doc, {
        startY: y + 3,
        head: [["Metric", "Value"]],
        body: [
          ["Total trades", s.total], ["Wins / Losses", `${s.wins} / ${s.losses}`],
          ["Win rate", `${s.winRate}%`], ["Net P&L", s.net],
          ["Avg win / loss", `${s.avgWin} / ${s.avgLoss}`],
          ["Best / worst trade", `${s.best} / ${s.worst}`],
        ],
        theme: "grid",
        headStyles: { fillColor: yellow, textColor: [30, 35, 41], fontStyle: "bold" },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    if (selected.includes("bysymbol")) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("P&L by symbol", 14, y);
      autoTable(doc, {
        startY: y + 3,
        head: [["Symbol", "Trades", "Wins", "P&L"]],
        body: bySymbol(filtered).map(([s, e]) => [s, e.n, e.w, e.pnl.toFixed(2)]),
        theme: "grid",
        headStyles: { fillColor: yellow, textColor: [30, 35, 41], fontStyle: "bold" },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    if (selected.includes("logs")) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Trade logs", 14, y);
      autoTable(doc, {
        startY: y + 3,
        head: [["Symbol", "Side", "Entry", "Exit", "Size", "P&L", "Strategy", "Date", "Notes"]],
        body: logRows(filtered),
        theme: "striped",
        headStyles: { fillColor: yellow, textColor: [30, 35, 41], fontStyle: "bold" },
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        columnStyles: { 8: { cellWidth: 45 } },
        margin: { left: 14, right: 14 },
      });
    }

    /* footer */
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(112, 122, 138);
      doc.text(`journalx.app · page ${i}/${pages}`, 105, 292, { align: "center" });
    }

    const name = `journalx_report_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(name);
    rememberExport(name, "PDF");
  };

  const doDownload = async () => {
    if (!selected.length) return flash("danger", "Pick at least one section to export");
    if (!filtered.length) return flash("danger", "No closed trades in this range");
    try {
      if (format === "CSV") downloadCsv();
      else await downloadPdf();
      flash("success", `${format} downloaded`);
    } catch (e) {
      console.error(e);
      flash("danger", "Export failed — try again");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <Toast toast={toast} />

      <div>
        <div style={{ font: "var(--text-h2)" }}>Import &amp; Export</div>
        <div style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>
          Download your trade logs and analytics, or bring in trades from a CSV.
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(260px, 1fr)", gap: "var(--space-4)", alignItems: "start" }}
        className="jx-ie-grid"
      >
        {/* ===== Export ===== */}
        <div className="jx-card">
          <div className="jx-card__title">Export data</div>
          <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-4)" }}>
            Pick what to include, choose a format, then download.
          </div>

          <span className="jx-sidebar__section" style={{ padding: 0 }}>What to export</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-3)", margin: "var(--space-2) 0 var(--space-4)" }}>
            {WHAT.map(({ id, icon: Icon, title, sub }) => {
              const sel = selected.includes(id);
              return (
                <button key={id} type="button" className={`jx-exportopt ${sel ? "jx-exportopt--selected" : ""}`} onClick={() => toggle(id)}>
                  <span style={{
                    position: "absolute", top: 10, right: 10, width: 18, height: 18, borderRadius: 5,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: sel ? "var(--color-primary)" : "var(--color-bg-muted)",
                    border: sel ? "none" : "1px solid var(--color-border-strong)",
                    color: "var(--color-primary-foreground)",
                  }}>
                    {sel && <Check size={12} />}
                  </span>
                  <span className="jx-sect__icon"><Icon size={15} /></span>
                  <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{title}</span>
                  <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{sub}</span>
                </button>
              );
            })}
          </div>

          <div className="jx-form-row" style={{ marginBottom: "var(--space-4)" }}>
            <div className="jx-field" style={{ flex: 1 }}>
              <span className="jx-sidebar__section" style={{ padding: 0 }}>Date range</span>
              <div className="jx-input">
                <span className="jx-input__icon"><Calendar size={15} /></span>
                <select value={range} onChange={(e) => setRange(e.target.value)}>
                  {RANGES.map((r) => (<option key={r.label}>{r.label}</option>))}
                </select>
              </div>
            </div>
            <div className="jx-field" style={{ flex: 1 }}>
              <span className="jx-sidebar__section" style={{ padding: 0 }}>Format</span>
              <div className="jx-seg">
                {["CSV", "PDF"].map((f) => (
                  <button key={f} className={`jx-seg__btn ${format === f ? "jx-seg__btn--active" : ""}`} onClick={() => setFormat(f)}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-4)" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{filtered.length} trades</span>
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                {selected.length} section{selected.length === 1 ? "" : "s"} · {format}
              </span>
            </div>
            <Button variant="primary" icon={Download} onClick={doDownload}>
              Download {format}
            </Button>
          </div>
        </div>

        {/* ===== Right column ===== */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="jx-card">
            <div className="jx-card__title">Import trades</div>
            <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-3)" }}>
              Bring in trades from a CSV or exchange.
            </div>

            <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => setImportedName(e.target.files?.[0]?.name || null)} />
            <div
              className="jx-dropzone"
              style={{ borderColor: "var(--color-primary)", background: "var(--color-primary-subtle)" }}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); setImportedName(e.dataTransfer.files?.[0]?.name || null); }}
            >
              <span className="jx-sect__icon" style={{ borderRadius: "50%", width: 36, height: 36 }}>
                <Upload size={16} />
              </span>
              <strong style={{ color: "var(--color-text-primary)" }}>
                {importedName || "Drag & drop your CSV"}
              </strong>
              <span style={{ font: "var(--text-caption)" }}>
                Use the Import flow in Trades log for validation &amp; bulk upload
              </span>
            </div>

            <button className="jx-sidebar__item" style={{ marginTop: "var(--space-3)", border: "1px solid var(--color-border)", background: "var(--color-bg-muted)" }}>
              <ArrowRightLeft size={16} />
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flex: 1 }}>
                <span style={{ fontWeight: 600 }}>Connect an exchange instead</span>
                <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>Auto-sync trades via API — see Settings</span>
              </span>
              <ChevronRight size={15} />
            </button>
          </div>

          {/* ===== Sample CSV templates ===== */}
          <div className="jx-card">
            <div className="jx-card__title">Sample CSV templates</div>
            <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-2)" }}>
              Download a ready-to-fill template, then import it above or from the Trades log.
            </div>

            {[QUICK_TEMPLATE, DETAILED_TEMPLATE].map((t) => (
              <div key={t.key} className="jx-setrow" style={{ padding: "var(--space-3) 0" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", minWidth: 0 }}>
                  <span className="jx-sect__icon"><FileText size={14} /></span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{t.label} template</span>
                    <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{t.hint}</span>
                    <span style={{ font: "var(--text-caption)", color: "var(--color-text-disabled)", marginTop: 2 }}>
                      {t.columns.length} columns
                    </span>
                  </span>
                </div>
                <Button variant="outline" size="sm" icon={Download} onClick={() => downloadTemplate(t.key)}>
                  CSV
                </Button>
              </div>
            ))}
          </div>

          <div className="jx-card">
            <div className="jx-card__title">Recent exports</div>
            <div style={{ marginTop: "var(--space-2)" }}>
              {recent.length === 0 && (
                <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>
                  Your downloads will show up here.
                </span>
              )}
              {recent.map((f, i) => (
                <div key={`${f.name}-${i}`} className="jx-setrow" style={{ padding: "var(--space-3) 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <span className="jx-sect__icon"><FileText size={14} /></span>
                    <span style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{f.name}</span>
                      <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{f.meta}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .jx-ie-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
