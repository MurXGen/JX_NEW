"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import {
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Download,
  Image as ImageIcon,
  MoreVertical,
  Pencil,
  Plus,
  Square,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";
import Dropdown from "./Dropdown";
import Accordion from "./Accordion";
import Toast from "./Toast";
import ConfirmDialog from "./ConfirmDialog";
import TradeDetailsModal from "./TradeDetailsModal";
import ImportTradesModal from "./ImportTradesModal";
import ImageViewerModal from "./ImageViewerModal";
import LogTradeModal from "./LogTradeModal";
import SampleDataBanner from "./SampleDataBanner";
import { generateShareCard } from "./shareCard";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/* Figma "Trades / List · Desktop" (22740:52184 / 22740:52315) +
   "Trades log — Table view" (22831:53489). */

const fmt = (v, d = 2) => Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
const money = (v, sym = "$") => {
  const a = Math.abs(v);
  const s = a >= 1000 ? `${sym}${fmt(a / 1000, 2)}k` : `${sym}${fmt(a)}`;
  return `${v < 0 ? "−" : "+"}${s}`;
};

function dayLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  const base = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  if (same(d, today)) return `Today · ${base}`;
  if (same(d, yest)) return `Yesterday · ${base}`;
  return base;
}

/* ---------- 3-dot row menu ---------- */
function RowMenu({ onEdit, onExport, onDelete, onShareCard }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const item = (Icon, label, fn, danger) => (
    <button
      type="button"
      className="jx-dd__option"
      style={danger ? { color: "var(--color-danger)" } : undefined}
      onClick={(e) => { e.stopPropagation(); setOpen(false); fn(); }}
    >
      <Icon size={14} /> {label}
    </button>
  );
  return (
    <span className="jx-dd" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="jx-btn jx-btn--ghost jx-btn--sm"
        style={{ padding: 5 }}
        onClick={() => setOpen((o) => !o)}
        aria-label="Trade actions"
      >
        <MoreVertical size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="jx-dd__panel"
            style={{ left: "auto", right: 0, minWidth: 160 }}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
          >
            {item(Pencil, "Edit trade", onEdit)}
            {item(Download, "Export CSV", onExport)}
            {item(ImageIcon, "Download JX card", onShareCard)}
            <div style={{ borderTop: "1px solid var(--color-border)", margin: "4px 0" }} />
            {item(Trash2, "Delete", onDelete, true)}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ---------- Trade card ---------- */
function TradeCard({ t, sym, onOpen, selectMode, selected, onToggleSelect, menu, onImageClick }) {
  const isLong = t.direction?.toLowerCase() === "long";
  const pnl = Number(t.pnl) || 0;
  const entry = t.avgEntryPrice || t.entryPrice || t.entries?.[0]?.price;
  const exit = t.avgExitPrice || t.exitPrice || t.exits?.[0]?.price;
  const imgs = t.images?.length || 0;
  return (
    <div
      className="jx-card"
      onClick={() => (selectMode ? onToggleSelect() : onOpen?.(t))}
      style={{
        padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)",
        cursor: "pointer",
        outline: selected ? "2px solid var(--color-primary)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        {selectMode && (
          <span style={{ color: selected ? "var(--yellow-500)" : "var(--color-text-muted)", display: "flex" }}>
            {selected ? <CheckSquare size={17} /> : <Square size={17} />}
          </span>
        )}
        <span style={{ font: "var(--text-title)" }}>{t.symbol || t.ticker || "—"}</span>
        <Badge variant={isLong ? "success" : "danger"}>{isLong ? "Long" : "Short"}</Badge>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, color: "var(--color-text-muted)" }}>
          <span className="jx-badge jx-badge--neutral">
            {t.source === "auto" ? <Download size={11} /> : <User size={11} />}
            {t.source === "auto" ? "Auto" : "Manual"}
          </span>
          {!selectMode && menu}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-2)", font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
        <span>Entry</span><span>Exit</span><span>Size</span><span>R : R</span>
        <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{entry ? `$${fmt(entry)}` : "—"}</span>
        <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{exit ? `$${fmt(exit)}` : "—"}</span>
        <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{t.totalQuantity ?? "—"}</span>
        <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{t.rr ? (String(t.rr).includes(":") ? t.rr : `1 : ${fmt(t.rr, 1)}`) : "—"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <span style={{ font: "var(--text-title)", color: pnl >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>
          {money(pnl, sym)}
        </span>
        {imgs > 0 && (
          <span
            className="jx-badge jx-badge--neutral"
            style={{ cursor: "zoom-in" }}
            onClick={(e) => { e.stopPropagation(); onImageClick?.(); }}
          >
            <ImageIcon size={11} /> {imgs}
          </span>
        )}
        <span style={{ marginLeft: "auto", font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
          {t.closeTime && new Date(t.closeTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <Badge variant={pnl >= 0 ? "success" : "danger"}>{pnl >= 0 ? "Win" : "Loss"}</Badge>
      </div>
    </div>
  );
}

/* ---------- Monthly P&L calendar ---------- */
function PnlCalendar({ trades, sym }) {
  const latest = trades.length
    ? new Date(Math.max(...trades.map((t) => new Date(t.closeTime).getTime())))
    : new Date();
  const [month, setMonth] = useState(new Date(latest.getFullYear(), latest.getMonth(), 1));

  const byDay = useMemo(() => {
    const m = {};
    trades.forEach((t) => {
      const d = new Date(t.closeTime);
      if (d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()) {
        const k = d.getDate();
        m[k] = m[k] || { pnl: 0, n: 0 };
        m[k].pnl += Number(t.pnl) || 0;
        m[k].n += 1;
      }
    });
    return m;
  }, [trades, month]);

  const total = Object.values(byDay).reduce((s, d) => s + d.pnl, 0);
  const firstDow = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const nav = (d) => setMonth(new Date(month.getFullYear(), month.getMonth() + d, 1));

  return (
    <div className="jx-card">
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
        <span className="jx-card__title">{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
        <Button variant="ghost" size="sm" onClick={() => nav(-1)} aria-label="Previous month"><ChevronLeft size={15} /></Button>
        <Button variant="ghost" size="sm" onClick={() => nav(1)} aria-label="Next month"><ChevronRight size={15} /></Button>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-2)", font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
          <span style={{ color: "var(--color-success)" }}>● Profit</span>
          <span style={{ color: "var(--color-danger)" }}>● Loss</span>
          <Badge variant={total >= 0 ? "success" : "danger"}>{money(total, sym)}</Badge>
        </span>
      </div>
      <div className="jx-cal">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <span key={d} className="jx-cal__head">{d}</span>
        ))}
        {[...Array(firstDow)].map((_, i) => (<span key={`e${i}`} />))}
        {[...Array(days)].map((_, i) => {
          const day = i + 1;
          const d = byDay[day];
          return (
            <div key={day} className={`jx-cal__cell ${d ? (d.pnl >= 0 ? "jx-cal__cell--win" : "jx-cal__cell--loss") : ""}`}>
              <span>{day}</span>
              {d && (
                <>
                  <span className={d.pnl >= 0 ? "jx-cal__pnl--win" : "jx-cal__pnl--loss"}>{money(d.pnl, sym)}</span>
                  <span>{d.n}t</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Activity heatmap (Monthly / Yearly) ---------- */
function TradesHeatmap({ trades, sym }) {
  const [view, setView] = useState("monthly");
  const latest = trades.length
    ? new Date(Math.max(...trades.map((t) => new Date(t.closeTime).getTime())))
    : new Date();
  const [month, setMonth] = useState(new Date(latest.getFullYear(), latest.getMonth(), 1));

  const level = (pnl, maxAbs) => {
    if (pnl === 0) return "var(--color-bg-muted)";
    const i = Math.min(1, Math.abs(pnl) / (maxAbs || 1));
    const base = pnl > 0 ? "var(--color-success)" : "var(--color-danger)";
    return `color-mix(in srgb, ${base} ${20 + i * 80}%, var(--color-bg-muted))`;
  };

  const monthly = useMemo(() => {
    const m = {};
    trades.forEach((t) => {
      const d = new Date(t.closeTime);
      if (d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()) {
        m[d.getDate()] = (m[d.getDate()] || 0) + (Number(t.pnl) || 0);
      }
    });
    return m;
  }, [trades, month]);

  const yearly = useMemo(() => {
    const y = Array(12).fill(0);
    trades.forEach((t) => {
      const d = new Date(t.closeTime);
      if (d.getFullYear() === month.getFullYear()) y[d.getMonth()] += Number(t.pnl) || 0;
    });
    return y;
  }, [trades, month]);

  const maxAbsM = Math.max(...Object.values(monthly).map(Math.abs), 1);
  const maxAbsY = Math.max(...yearly.map(Math.abs), 1);
  const firstDow = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  return (
    <div className="jx-card">
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
        <div className="jx-seg jx-seg--inline" style={{ padding: 3 }}>
          {["monthly", "yearly"].map((v) => (
            <button key={v} className={`jx-seg__btn ${view === v ? "jx-seg__btn--active" : ""}`} style={{ padding: "5px 12px", font: "var(--text-caption)", fontWeight: 600 }} onClick={() => setView(v)}>
              {v === "monthly" ? "Monthly" : "Yearly"}
            </button>
          ))}
        </div>
        <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>
          {view === "monthly"
            ? month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
            : month.getFullYear()}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setMonth(new Date(month.getFullYear() - (view === "yearly" ? 1 : 0), month.getMonth() - (view === "monthly" ? 1 : 0), 1))} aria-label="Previous"><ChevronLeft size={15} /></Button>
        <Button variant="ghost" size="sm" onClick={() => setMonth(new Date(month.getFullYear() + (view === "yearly" ? 1 : 0), month.getMonth() + (view === "monthly" ? 1 : 0), 1))} aria-label="Next"><ChevronRight size={15} /></Button>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
          Less
          {[0.2, 0.4, 0.6, 0.8, 1].map((i) => (
            <span key={i} style={{ width: 12, height: 12, borderRadius: 3, background: `color-mix(in srgb, var(--color-success) ${i * 100}%, var(--color-bg-muted))` }} />
          ))}
          More
        </span>
      </div>

      {view === "monthly" ? (
        <div className="jx-cal" style={{ gap: 4 }}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={i} className="jx-cal__head" style={{ textAlign: "center" }}>{d}</span>
          ))}
          {[...Array(firstDow)].map((_, i) => (<span key={`e${i}`} />))}
          {[...Array(days)].map((_, i) => {
            const pnl = monthly[i + 1] || 0;
            return (
              <div
                key={i}
                title={`${i + 1}: ${money(pnl, sym)}`}
                style={{
                  borderRadius: 6, minHeight: 34,
                  background: level(pnl, maxAbsM),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  font: "var(--text-caption)",
                  color: pnl !== 0 ? "#fff" : "var(--color-text-muted)",
                  fontWeight: pnl !== 0 ? 600 : 400,
                }}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(70px, 1fr))", gap: 6 }}>
          {yearly.map((pnl, i) => (
            <div
              key={i}
              title={money(pnl, sym)}
              style={{
                borderRadius: 8, minHeight: 56, padding: 6,
                background: level(pnl, maxAbsY),
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                font: "var(--text-caption)",
                color: pnl !== 0 ? "#fff" : "var(--color-text-muted)",
              }}
            >
              <span>{new Date(2000, i, 1).toLocaleDateString("en-GB", { month: "short" })}</span>
              <span style={{ fontWeight: 600 }}>{pnl !== 0 ? money(pnl, sym) : "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- CSV export helper ---------- */
const exportCsv = (list, name = "journalx_trades") => {
  const header = "symbol,direction,entry,exit,size,pnl,closeTime,notes";
  const rows = list.map((t) =>
    [
      t.symbol || t.ticker || "",
      t.direction || "",
      t.avgEntryPrice || t.entryPrice || "",
      t.avgExitPrice || t.exitPrice || "",
      t.totalQuantity ?? "",
      t.pnl ?? "",
      t.closeTime || "",
      `"${String(t.learnings || t.notes || "").replace(/"/g, '""')}"`,
    ].join(","),
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ================================================================ */
export default function TradesLogPanel({
  trades = [],
  currencySymbol = "$",
  usingDummy,
  onAddTrade,
  onTradesAdded,
  onTradesDeleted,
  onTradeUpdated,
  openImportSignal = 0,
}) {
  const [view, setView] = useState("cards");
  const [direction, setDirection] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const [sort, setSort] = useState("newest");
  const [openTrade, setOpenTrade] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [toast, setToast] = useState(null);
  /* confirm dialog: { type: 'delete'|'export', trades: [...] } */
  const [confirm, setConfirm] = useState(null);

  /* open the import modal when another panel (e.g. overview banner)
     requests it via the dashboard */
  useEffect(() => {
    if (openImportSignal > 0) setShowImport(true);
  }, [openImportSignal]);
  const [busy, setBusy] = useState(false);
  const [viewerTrade, setViewerTrade] = useState(null);
  const [editTrade, setEditTrade] = useState(null);
  const flash = (type, msg, ms = 3000) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), ms);
  };

  const closed = useMemo(() => trades.filter((t) => t.closeTime), [trades]);

  const stats = useMemo(() => {
    const total = closed.length;
    const wins = closed.filter((t) => t.pnl > 0).length;
    const netPnl = closed.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const avgWin = wins ? closed.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) / wins : 0;
    const losses = closed.filter((t) => t.pnl < 0);
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
    return {
      total,
      winRate: total ? ((wins / total) * 100).toFixed(1) : "0",
      netPnl,
      avgRR: avgLoss > 0 ? (avgWin / avgLoss).toFixed(1) : "—",
    };
  }, [closed]);

  const filtered = useMemo(() => {
    let list = closed;
    if (direction !== "all") list = list.filter((t) => t.direction?.toLowerCase() === direction);
    if (outcome !== "all") list = list.filter((t) => (outcome === "win" ? t.pnl > 0 : t.pnl < 0));
    const by = {
      newest: (a, b) => new Date(b.closeTime) - new Date(a.closeTime),
      oldest: (a, b) => new Date(a.closeTime) - new Date(b.closeTime),
      "pnl-high": (a, b) => (b.pnl || 0) - (a.pnl || 0),
      "pnl-low": (a, b) => (a.pnl || 0) - (b.pnl || 0),
    };
    return [...list].sort(by[sort]);
  }, [closed, direction, outcome, sort]);

  const groups = useMemo(() => {
    const g = new Map();
    filtered.forEach((t) => {
      const k = dayLabel(t.closeTime);
      if (!g.has(k)) g.set(k, []);
      g.get(k).push(t);
    });
    return [...g.entries()];
  }, [filtered]);

  /* ---------- actions ---------- */
  const syncDeleteIndexedDB = async (ids) => {
    try {
      const userData = (await getFromIndexedDB("user-data")) || {};
      userData.trades = (userData.trades || []).filter((t) => !ids.includes(t._id));
      await saveToIndexedDB("user-data", userData);
    } catch (e) {
      console.error("IndexedDB sync failed:", e);
    }
  };

  const doDelete = async (ids) => {
    if (usingDummy) {
      setConfirm(null);
      return flash("danger", "Sample data — log a real trade first");
    }
    setBusy(true);
    try {
      await Promise.all(
        ids.map((id) =>
          axios.delete(`${API_BASE}/api/trades/delete`, {
            withCredentials: true,
            headers: { "x-trade-id": id },
          }),
        ),
      );
      await syncDeleteIndexedDB(ids);
      onTradesDeleted?.(ids);
      setSelected(new Set());
      setSelectMode(false);
      setOpenTrade(null);
      setConfirm(null);
      flash("success", `${ids.length > 1 ? `${ids.length} trades` : "Trade"} deleted`);
    } catch (err) {
      console.error("Delete failed:", err);
      flash("danger", "Could not delete — try again");
    } finally {
      setBusy(false);
    }
  };

  const doExport = (list) => {
    exportCsv(list, list.length > 1 ? "journalx_selected" : `journalx_${(list[0]?.symbol || "trade").replace(/\W/g, "")}`);
    setConfirm(null);
    flash("success", `${list.length > 1 ? `${list.length} trades` : "Trade"} exported`);
  };

  const askDelete = (list) => setConfirm({ type: "delete", trades: list });
  const askExport = (list) => setConfirm({ type: "export", trades: list });

  const shareCard = (t) => {
    try {
      generateShareCard(t, currencySymbol);
      flash("success", "JX card downloaded");
    } catch (e) {
      console.error(e);
      flash("danger", "Could not generate card");
    }
  };

  const handleImagesChanged = (tradeId, images) => {
    onTradeUpdated?.({ _id: tradeId, images }, { partial: true });
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedTrades = filtered.filter((t) => selected.has(t._id));
  const selFilters = (direction !== "all" ? 1 : 0) + (outcome !== "all" ? 1 : 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <Toast toast={toast} />

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <div>
          <div style={{ font: "var(--text-h2)" }}>Trades log</div>
          <div style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>
            Every trade you log or auto-import, in one place · {stats.total} total
            {usingDummy && <> <Badge variant="brand">Sample data</Badge></>}
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Button variant="outline" icon={Upload} onClick={() => setShowImport(true)}>Import trades</Button>
          <Button variant="primary" icon={Plus} onClick={onAddTrade}>Add trade</Button>
        </div>
      </div>

      {/* sample-data nudge */}
      {usingDummy && (
        <SampleDataBanner onLog={onAddTrade} onImport={() => setShowImport(true)} />
      )}

      {/* ===== Performance (accordion) ===== */}
      <Accordion id="trades-performance" title="Performance">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
          {[
            { label: "Total trades", value: stats.total },
            { label: "Win rate", value: `${stats.winRate}%` },
            { label: "Net P&L", value: money(stats.netPnl, currencySymbol), color: stats.netPnl >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)" },
            { label: "Avg R : R", value: stats.avgRR === "—" ? "—" : `1 : ${stats.avgRR}`, sub: "target 1 : 2" },
          ].map((k) => (
            <div key={k.label} className="jx-card" style={{ padding: "var(--space-4) var(--space-5)" }}>
              <span className="jx-sidebar__section" style={{ padding: 0 }}>{k.label}</span>
              <div style={{ font: "var(--text-stat)", letterSpacing: "-1px", color: k.color || "var(--color-text-primary)" }}>{k.value}</div>
              {k.sub && <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{k.sub}</span>}
            </div>
          ))}
        </div>
      </Accordion>

      {/* ===== Calendar & heatmap (accordion) ===== */}
      <Accordion id="trades-calendar" title="Calendar & heatmap">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "var(--space-4)" }}>
          <PnlCalendar trades={closed} sym={currencySymbol} />
          <TradesHeatmap trades={closed} sym={currencySymbol} />
        </div>
      </Accordion>

      {/* ===== All trades header + filters ===== */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <span className="jx-card__title">All trades</span>
        <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{filtered.length} trades</span>

        <div style={{ marginLeft: "auto", display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
          {selFilters > 0 && (
            <button className="jx-chip jx-chip--selected" onClick={() => { setDirection("all"); setOutcome("all"); }}>
              Filters {selFilters} · clear
            </button>
          )}
          <div style={{ width: 150 }}>
            <Dropdown
              value={direction}
              onChange={setDirection}
              label="Direction"
              options={[
                { value: "all", label: "Direction: All" },
                { value: "long", label: "Long" },
                { value: "short", label: "Short" },
              ]}
              triggerStyle={{ height: 38 }}
            />
          </div>
          <div style={{ width: 150 }}>
            <Dropdown
              value={outcome}
              onChange={setOutcome}
              label="Outcome"
              options={[
                { value: "all", label: "Outcome: All" },
                { value: "win", label: "Win" },
                { value: "loss", label: "Loss" },
              ]}
              triggerStyle={{ height: 38 }}
            />
          </div>
          <div style={{ width: 175 }}>
            <Dropdown
              value={sort}
              onChange={setSort}
              label="Sort by"
              options={[
                { value: "newest", label: "Sort: Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "pnl-high", label: "P&L: high to low" },
                { value: "pnl-low", label: "P&L: low to high" },
              ]}
              triggerStyle={{ height: 38 }}
            />
          </div>
          <Button
            variant={selectMode ? "primary" : "outline"}
            size="sm"
            icon={CheckSquare}
            onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
          >
            {selectMode ? "Done" : "Select"}
          </Button>
          <div className="jx-seg jx-seg--inline">
            {["cards", "table"].map((v) => (
              <button key={v} className={`jx-seg__btn ${view === v ? "jx-seg__btn--active" : ""}`} onClick={() => setView(v)}>
                {v === "cards" ? "Cards" : "Table"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Bulk action bar ===== */}
      <AnimatePresence>
        {selectMode && selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="jx-card jx-card--flat"
            style={{ padding: "var(--space-3) var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}
          >
            <Badge variant="brand">{selected.size} selected</Badge>
            <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
              Net {money(selectedTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0), currencySymbol)}
            </span>
            <span style={{ marginLeft: "auto", display: "flex", gap: "var(--space-2)" }}>
              <Button variant="outline" size="sm" icon={Download} onClick={() => askExport(selectedTrades)}>
                Export {selected.size}
              </Button>
              <Button variant="danger" size="sm" icon={Trash2} onClick={() => askDelete(selectedTrades)}>
                Delete {selected.size}
              </Button>
              <Button variant="ghost" size="sm" icon={X} onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== views ===== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.16 }}
        >
          {filtered.length === 0 ? (
            <div className="jx-card" style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
              No trades match these filters.
            </div>
          ) : view === "cards" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {groups.map(([label, list]) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{label}</span>
                    <span className="jx-badge jx-badge--neutral">{list.length} trades</span>
                    <span style={{ marginLeft: "auto", font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                      Net {money(list.reduce((s, t) => s + (Number(t.pnl) || 0), 0), currencySymbol)}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
                    {list.map((t, i) => (
                      <TradeCard
                        key={t._id || i}
                        t={t}
                        sym={currencySymbol}
                        onOpen={setOpenTrade}
                        selectMode={selectMode}
                        selected={selected.has(t._id)}
                        onToggleSelect={() => toggleSelect(t._id)}
                        onImageClick={() => setViewerTrade(t)}
                        menu={
                          <RowMenu
                            onEdit={() => setEditTrade(t)}
                            onExport={() => askExport([t])}
                            onShareCard={() => shareCard(t)}
                            onDelete={() => askDelete([t])}
                          />
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="jx-card" style={{ padding: 0, overflowX: "auto" }}>
              <table className="jx-table">
                <thead>
                  <tr>
                    {selectMode && <th style={{ width: 36 }} />}
                    <th>Pair</th><th>Side</th><th>Entry</th><th>Exit</th><th>Size</th>
                    <th>P&L</th><th>R : R</th><th>Date</th><th>Img</th><th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => {
                    const isLong = t.direction?.toLowerCase() === "long";
                    const pnl = Number(t.pnl) || 0;
                    const entry = t.avgEntryPrice || t.entryPrice || t.entries?.[0]?.price;
                    const exit = t.avgExitPrice || t.exitPrice || t.exits?.[0]?.price;
                    return (
                      <tr
                        key={t._id || i}
                        onClick={() => (selectMode ? toggleSelect(t._id) : setOpenTrade(t))}
                        style={{ cursor: "pointer", background: selected.has(t._id) ? "var(--color-primary-subtle)" : undefined }}
                      >
                        {selectMode && (
                          <td onClick={(e) => { e.stopPropagation(); toggleSelect(t._id); }}>
                            <span style={{ color: selected.has(t._id) ? "var(--yellow-500)" : "var(--color-text-muted)", display: "flex" }}>
                              {selected.has(t._id) ? <CheckSquare size={16} /> : <Square size={16} />}
                            </span>
                          </td>
                        )}
                        <td style={{ fontWeight: 600 }}>{t.symbol || t.ticker || "—"}</td>
                        <td><Badge variant={isLong ? "success" : "danger"}>{isLong ? "Long" : "Short"}</Badge></td>
                        <td>{entry ? `$${fmt(entry)}` : "—"}</td>
                        <td>{exit ? `$${fmt(exit)}` : "—"}</td>
                        <td>{t.totalQuantity ?? "—"}</td>
                        <td style={{ fontWeight: 600, color: pnl >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>
                          {money(pnl, currencySymbol)}
                        </td>
                        <td>{t.rr ? (String(t.rr).includes(":") ? t.rr : `1 : ${fmt(t.rr, 1)}`) : "—"}</td>
                        <td style={{ color: "var(--color-text-muted)" }}>
                          {new Date(t.closeTime).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} ·{" "}
                          {new Date(t.closeTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td onClick={(e) => { e.stopPropagation(); setViewerTrade(t); }}>
                          {t.images?.length ? (
                            <span className="jx-badge jx-badge--neutral" style={{ cursor: "zoom-in" }}>
                              <ImageIcon size={11} /> {t.images.length}
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          {!selectMode && (
                            <RowMenu
                              onEdit={() => setEditTrade(t)}
                              onExport={() => askExport([t])}
                              onShareCard={() => shareCard(t)}
                              onDelete={() => askDelete([t])}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Trade details (gamified) */}
      <TradeDetailsModal
        open={!!openTrade}
        trade={openTrade}
        currencySymbol={currencySymbol}
        onClose={() => setOpenTrade(null)}
        onEdit={(t) => { setOpenTrade(null); setEditTrade(t); }}
        onDelete={(t) => askDelete([t])}
        onImageClick={(t) => setViewerTrade(t)}
      />

      {/* Edit trade — prefilled log modal */}
      <LogTradeModal
        open={!!editTrade}
        initialTrade={editTrade}
        onClose={() => setEditTrade(null)}
        onSaved={(trade, meta) => {
          if (meta?.updated) onTradeUpdated?.(trade);
          else onTradesAdded?.([trade]);
        }}
      />

      {/* Screenshot viewer + CRUD */}
      <ImageViewerModal
        open={!!viewerTrade}
        trade={viewerTrade}
        onClose={() => setViewerTrade(null)}
        onImagesChanged={handleImagesChanged}
      />

      {/* Import trades */}
      <ImportTradesModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={(newTrades) => onTradesAdded?.(newTrades)}
      />

      {/* Confirm export / delete */}
      <ConfirmDialog
        open={!!confirm}
        loading={busy}
        variant={confirm?.type === "delete" ? "danger" : "primary"}
        title={
          confirm?.type === "delete"
            ? `Delete ${confirm.trades.length > 1 ? `${confirm.trades.length} trades` : "this trade"}?`
            : `Export ${confirm?.trades.length > 1 ? `${confirm?.trades.length} trades` : "this trade"}?`
        }
        message={
          confirm?.type === "delete"
            ? "Trades and their screenshots will be permanently removed. This can't be undone."
            : "A CSV file will be downloaded with the selected trade data."
        }
        confirmLabel={confirm?.type === "delete" ? "Delete" : "Export CSV"}
        onClose={() => !busy && setConfirm(null)}
        onConfirm={() =>
          confirm?.type === "delete"
            ? doDelete(confirm.trades.map((t) => t._id))
            : doExport(confirm.trades)
        }
      />
    </div>
  );
}
