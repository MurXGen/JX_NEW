"use client";

import { useMemo, useState } from "react";
import { ruleStatusOf } from "@/utils/tradeRules";
import {
  ArrowRightLeft,
  Calendar,
  Check,
  Download,
  FileText,
  LineChart,
  Upload,
  FileSpreadsheet,
  FileDown,
  Trash2,
  PencilLine,
} from "lucide-react";
import ov from "@/components/app/Overview.module.css";
import dt from "@/components/app/Data.module.css";
import Button from "./Button";
import Toast from "./Toast";
import ImportTradesModal from "./ImportTradesModal";

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

// "Yes 4/4" | "Partial 2/4" | "No 0/4" (or plain Yes/No without a checklist)
const rulesCell = (t) => {
  const st = ruleStatusOf(t);
  if (!st) return "";
  const word = { yes: "Yes", partial: "Partial", no: "No" }[st];
  const c = Array.isArray(t.ruleChecks) ? t.ruleChecks : [];
  return c.length ? `${word} ${c.filter((x) => x.checked).length}/${c.length}` : word;
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
    rulesCell(t),
    String(t.learnings || t.notes || "").replace(/\n/g, " "),
  ]);

export default function ImportExportPanel({ trades = [], onImported }) {
  const [selected, setSelected] = useState(["logs", "analytics"]);
  const [range, setRange] = useState("Last 30 days");
  const [format, setFormat] = useState("CSV");
  const [showImport, setShowImport] = useState(false);
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
  });
  const [toast, setToast] = useState(null);
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
      parts.push("symbol,direction,entry,exit,size,pnl,strategy,date,followedPlan,notes");
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
    doc.text("JournalX, Trading Report", 14, 12);
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
        head: [["Symbol", "Side", "Entry", "Exit", "Size", "P&L", "Strategy", "Date", "Rules", "Notes"]],
        body: logRows(filtered),
        theme: "striped",
        headStyles: { fillColor: yellow, textColor: [30, 35, 41], fontStyle: "bold" },
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        columnStyles: { 9: { cellWidth: 45 } },
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
      flash("danger", "Export failed, try again");
    }
  };

  const symbols = useMemo(() => new Set(filtered.map((t) => t.symbol || t.ticker)).size, [filtered]);
  const contents = [
    selected.includes("logs") && `${filtered.length} trade row${filtered.length === 1 ? "" : "s"}`,
    selected.includes("analytics") && "9 summary metrics",
    selected.includes("bysymbol") && `${symbols} symbol${symbols === 1 ? "" : "s"}`,
  ].filter(Boolean);
  const clearRecent = () => { setRecent([]); try { localStorage.removeItem(RECENT_KEY); } catch {} };

  return (
    <div className={`${ov.root} ${dt.root}`}>
      <Toast toast={toast} />

      <header className={ov.head}>
        <div>
          <h1 className={ov.title}>Import &amp; Export</h1>
          <p className={ov.sub}>Download your trades and analytics, or bring trades in from a spreadsheet.</p>
        </div>
      </header>

      <div className={dt.split}>
        {/* ===== Export ===== */}
        <section className={dt.card} aria-labelledby="ie-exp">
          <div className={dt.cardHead}>
            <span className={dt.ico} aria-hidden="true"><Download size={17} /></span>
            <div>
              <h2 id="ie-exp" className={dt.cardTitle}>Export data</h2>
              <p className={dt.cardSub}>Choose what to include, the period and a format.</p>
            </div>
          </div>

          <div className={dt.step}>
            <span className={dt.stepNum}>1</span>
            <div className={dt.stepBody}>
              <span className={dt.label}>What to include</span>
              <div className={dt.opts}>
                {WHAT.map(({ id, icon: Icon, title, sub }) => {
                  const sel = selected.includes(id);
                  return (
                    <button key={id} type="button" role="checkbox" aria-checked={sel} className={dt.opt} onClick={() => toggle(id)}>
                      <span className={dt.box} aria-hidden="true">{sel && <Check size={12} strokeWidth={3} />}</span>
                      <span className={dt.optIco} aria-hidden="true"><Icon size={15} /></span>
                      <b>{title}</b>
                      <small>{sub}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={dt.step}>
            <span className={dt.stepNum}>2</span>
            <div className={dt.stepBody}>
              <span className={dt.label} id="ie-range"><Calendar size={13} aria-hidden="true" /> Date range</span>
              <div className={dt.chips} role="radiogroup" aria-labelledby="ie-range">
                {RANGES.map((r) => (
                  <button key={r.label} type="button" role="radio" aria-checked={range === r.label} onClick={() => setRange(r.label)}>{r.label}</button>
                ))}
              </div>
            </div>
          </div>

          <div className={dt.step}>
            <span className={dt.stepNum}>3</span>
            <div className={dt.stepBody}>
              <span className={dt.label}>Format</span>
              <div className={dt.formats} role="radiogroup" aria-label="Format">
                {[
                  { f: "CSV", icon: FileSpreadsheet, d: "Opens in Excel or Google Sheets" },
                  { f: "PDF", icon: FileText, d: "A formatted report to share or print" },
                ].map(({ f, icon: Icon, d }) => (
                  <button key={f} type="button" role="radio" aria-checked={format === f} className={dt.format} onClick={() => setFormat(f)}>
                    <Icon size={16} aria-hidden="true" />
                    <span><b>{f}</b><small>{d}</small></span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={dt.summary}>
            <div>
              <b>{filtered.length ? `${filtered.length} trades · ${range}` : `No trades in ${range.toLowerCase()}`}</b>
              <small>{contents.length ? `Your ${format} will contain ${contents.join(", ")}` : "Pick at least one section"}</small>
            </div>
            <button type="button" className={`${ov.btn} ${ov.gold}`} onClick={doDownload} disabled={!selected.length || !filtered.length}>
              <Download size={15} aria-hidden="true" /> Download {format}
            </button>
          </div>
        </section>

        {/* ===== Import + recent ===== */}
        <aside className={dt.side}>
          <section
            className={dt.card}
            aria-labelledby="ie-imp"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); setShowImport(true); }}
          >
            <div className={dt.cardHead}>
              <span className={dt.ico} aria-hidden="true"><Upload size={17} /></span>
              <div>
                <h2 id="ie-imp" className={dt.cardTitle}>Import trades</h2>
                <p className={dt.cardSub}>Bring your history in from a spreadsheet.</p>
              </div>
            </div>
            <ol className={dt.howto}>
              <li><FileDown size={14} aria-hidden="true" /><span><b>Get the template</b> Only P&amp;L or detailed</span></li>
              <li><PencilLine size={14} aria-hidden="true" /><span><b>Fill in your trades</b> One row per trade</span></li>
              <li><Upload size={14} aria-hidden="true" /><span><b>Upload &amp; review</b> Nothing saves until you confirm</span></li>
            </ol>
            <button type="button" className={`${ov.btn} ${ov.gold}`} onClick={() => setShowImport(true)} style={{ width: "100%" }}>
              <Upload size={15} aria-hidden="true" /> Import trades
            </button>
          </section>

          <section className={dt.card} aria-labelledby="ie-rec">
            <div className={dt.previewHead}>
              <h2 id="ie-rec" className={dt.cardTitle}>Recent exports</h2>
              {recent.length > 0 && <button type="button" className={dt.textBtn} onClick={clearRecent}><Trash2 size={13} aria-hidden="true" /> Clear</button>}
            </div>
            {recent.length === 0 ? (
              <p className={dt.hint}>Files you download appear here so you can keep track.</p>
            ) : (
              <ul className={dt.files}>
                {recent.map((f, i) => {
                  const pdf = /\.pdf$/i.test(f.name);
                  const Icon = pdf ? FileText : FileSpreadsheet;
                  return (
                    <li key={`${f.name}-${i}`}>
                      <span className={dt.optIco} aria-hidden="true"><Icon size={14} /></span>
                      <span className={dt.fileTxt}><b>{f.name}</b><small>{f.meta}</small></span>
                      <span className={dt.fileTag}>{pdf ? "PDF" : "CSV"}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <ImportTradesModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={(newTrades) => { onImported?.(newTrades); flash("success", `${newTrades?.length || 0} trades imported`); }}
      />
    </div>
  );
}
