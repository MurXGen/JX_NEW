"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import {
  FlaskConical,
  ArrowUpDown,
  Layers,
  CircleCheck,
  CircleX,
  CircleMinus,
  CalendarArrowDown,
  CalendarArrowUp,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  BookOpen,
  Download,
  Gamepad2,
  Image as ImageIcon,
  ImageOff,
  LayoutGrid,
  List,
  Loader2,
  Minus,
  MoreVertical,
  Pencil,
  Search,
  Wind,
  Plus,
  Square,
  Trash2,
  TrendingDown,
  TrendingUp,
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
import UpgradeSheet from "./UpgradeSheet";
import { getPlanRules } from "@/utils/planRestrictions";
import TradeDetailsModal from "./TradeDetailsModal";
import ImportTradesModal from "./ImportTradesModal";
import ImageViewerModal from "./ImageViewerModal";
import LogTradeModal from "./LogTradeModal";
import SampleDataBanner from "./SampleDataBanner";
import ov from "@/components/app/Overview.module.css";
import tl from "@/components/app/TradesLog.module.css";
import CustomizeSections, { useHiddenSections } from "./CustomizeSections";
import { generateShareCard } from "./shareCard";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { compactNumber } from "@/utils/formatNumbers";
import { convertTrade } from "@/utils/fx";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/* sections the user can show/hide on the trades log */
const TRADESLOG_SECTIONS = [
  { id: "allTrades", label: "All trades table" },
];

/* Figma "Trades / List · Desktop" (22740:52184 / 22740:52315) +
   "Trades log, Table view" (22831:53489). */

const fmt = (v, d = 2) => Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
/* quantity / size, max 2 decimals (avoids 0.293838…) */
const qty = (v) => (v == null || v === "" ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }));
const money = (v, sym = "$") =>
  `${v < 0 ? "−" : "+"}${sym}${compactNumber(Math.abs(v))}`;

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

/* ---------- 3-dot row menu (panel rendered in a portal so cards can't clip it) ---------- */
function RowMenu({ onEdit, onExport, onDelete, onShareCard }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null); // {top,left,openUp}
  const [isMobile, setIsMobile] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const WIDTH = 248;

  const MENU_H = 250;      // approx height of the 5-row menu
  const BOTTOM_SAFE = 100; // mobile bottom nav + browser bar + safe area
  const place = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // usable space below the trigger, discounting the fixed bottom nav so the
    // last item (Delete) never lands behind it
    const spaceBelow = window.innerHeight - r.bottom - BOTTOM_SAFE;
    const openUp = spaceBelow < MENU_H && r.top > MENU_H;
    setCoords({
      top: openUp ? r.top : r.bottom,
      left: Math.max(8, r.right - WIDTH), // right-align to the trigger
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (open) {
      setIsMobile(typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches);
      place();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // keyboard: focus the first action, arrows move, Escape closes
  useEffect(() => {
    if (!open || isMobile) return undefined;
    const id = requestAnimationFrame(() => panelRef.current?.querySelector("[role=menuitem]")?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, isMobile, coords]);
  const onMenuKey = (e) => {
    const items = [...(panelRef.current?.querySelectorAll("[role=menuitem]") || [])];
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === "Home") { e.preventDefault(); items[0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); items[items.length - 1]?.focus(); }
    else if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
  };

  useEffect(() => {
    if (!open) return;
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("mousedown", onDoc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const item = (Icon, label, fn, danger, hint) => (
    <button
      type="button"
      role="menuitem"
      className={`jx-rm__item${danger ? " jx-rm__item--danger" : ""}`}
      onClick={(e) => { e.stopPropagation(); setOpen(false); fn(); }}
    >
      <span className="jx-rm__ico" aria-hidden="true"><Icon size={15} /></span>
      <span className="jx-rm__txt"><b>{label}</b>{hint && <small>{hint}</small>}</span>
    </button>
  );

  // larger, always-visible rows for the mobile bottom sheet
  const sheetItem = (Icon, label, fn, danger, hint) => (
    <button
      type="button"
      className={`jx-rm__item jx-rm__item--sheet${danger ? " jx-rm__item--danger" : ""}`}
      onClick={(e) => { e.stopPropagation(); setOpen(false); fn(); }}
    >
      <span className="jx-rm__ico" aria-hidden="true"><Icon size={17} /></span>
      <span className="jx-rm__txt"><b>{label}</b>{hint && <small>{hint}</small>}</span>
    </button>
  );

  const panel = !open ? null : isMobile ? (
    // ===== Mobile: full-width bottom sheet so every action (incl. Delete) shows
    <>
      <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 4000 }} />
      <motion.div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="jx-rm jx-rm--sheet"
        role="menu"
        aria-label="Trade actions"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 4001,
          background: "var(--color-bg-elevated)",
          borderTopLeftRadius: "var(--radius-xl)", borderTopRightRadius: "var(--radius-xl)",
          borderTop: "1px solid var(--color-border)",
          padding: "8px var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom))",
          boxShadow: "0 -14px 44px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--color-border-strong)", margin: "4px auto 8px" }} />
        {sheetItem(Pencil, "Edit trade", onEdit, false, "Prices, notes, tags and screenshots")}
        {sheetItem(Download, "Export CSV", onExport, false, "This trade as a spreadsheet row")}
        {sheetItem(ImageIcon, "Download share card", onShareCard, false, "An image of the result to post")}
        <div className="jx-rm__sep" />
        {sheetItem(Trash2, "Delete trade", onDelete, true, "Removes it from your journal")}
      </motion.div>
    </>
  ) : coords ? (
    // ===== Desktop: compact panel anchored to the trigger
    <motion.div
      ref={panelRef}
      className="jx-rm"
      role="menu"
      aria-label="Trade actions"
      onKeyDown={onMenuKey}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      initial={{ opacity: 0, y: coords.openUp ? 6 : -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.12 }}
      style={{
        position: "fixed",
        top: coords.openUp ? "auto" : coords.top + 6,
        bottom: coords.openUp ? window.innerHeight - coords.top + 6 : "auto",
        left: coords.left,
        right: "auto",
        minWidth: WIDTH,
        maxHeight: `calc(100vh - ${BOTTOM_SAFE + 24}px)`,
        overflowY: "auto",
        zIndex: 4000,
      }}
    >
      {item(Pencil, "Edit trade", onEdit, false, "Prices, notes, tags and screenshots")}
      {item(Download, "Export CSV", onExport, false, "This trade as a spreadsheet row")}
      {item(ImageIcon, "Download share card", onShareCard, false, "An image of the result to post")}
      <div className="jx-rm__sep" role="separator" />
      {item(Trash2, "Delete trade", onDelete, true, "Removes it from your journal")}
    </motion.div>
  ) : null;

  return (
    <span className="jx-dd" ref={wrapRef} onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className="jx-btn jx-btn--ghost jx-btn--sm jx-rowmenu-btn"
        style={{ padding: 6, borderRadius: "var(--radius-md)" }}
        onClick={() => setOpen((o) => !o)}
        aria-label="Trade actions"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Edit, export or delete this trade"
      >
        <MoreVertical size={15} />
      </button>
      {typeof document !== "undefined" && panel && createPortal(panel, document.body)}
    </span>
  );
}

/* ---------- Trade card ---------- */
function TradeCard({ t, sym, onOpen, selectMode, selected, onToggleSelect, menu, onImageClick, showImages }) {
  const isLong = t.direction?.toLowerCase() === "long";
  const pnl = Number(t.pnl) || 0;
  const images = (t.images || [])
    .map((i) => (typeof i === "string" ? { url: i } : i))
    .filter((i) => i?.url);
  const imgs = images.length;
  const outcome = pnl > 0 ? "win" : pnl < 0 ? "loss" : "even";
  // how long the trade was held, when both times are known
  const heldMs = t.openTime && t.closeTime ? new Date(t.closeTime) - new Date(t.openTime) : 0;
  const held = heldMs > 0
    ? heldMs < 3600000 ? `${Math.max(1, Math.round(heldMs / 60000))}m`
      : heldMs < 86400000 ? `${Math.floor(heldMs / 3600000)}h${Math.round((heldMs % 3600000) / 60000) ? ` ${Math.round((heldMs % 3600000) / 60000)}m` : ""}`
      : `${Math.round(heldMs / 86400000)}d`
    : null;
  const dot = <span className="jx-trow__dot" aria-hidden="true">·</span>;
  return (
    <div
      className={`jx-trow jx-trow--${outcome}${selected ? " jx-trow--selected" : ""}`}
      onClick={() => (selectMode ? onToggleSelect() : onOpen?.(t))}
    >
      <div className="jx-trow__main">
        {selectMode && (
          <span style={{ color: selected ? "var(--yellow-500)" : "var(--color-text-muted)", display: "flex", flexShrink: 0 }}>
            {selected ? <CheckSquare size={17} /> : <Square size={17} />}
          </span>
        )}

        {/* direction tile — the quickest way to scan long vs short */}
        <span className={`jx-trow__tile jx-trow__tile--${isLong ? "long" : "short"}`} aria-hidden="true">
          {isLong ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
        </span>

        <div className="jx-trow__body">
          <div className="jx-trow__titlerow">
            <span className="jx-trow__sym">{t.symbol || t.ticker || "—"}</span>
            <span className={`jx-trow__side jx-trow__side--${isLong ? "long" : "short"}`}>{isLong ? "Long" : "Short"}</span>
          </div>
          <span className="jx-trow__meta" suppressHydrationWarning>
            <Clock size={11} />
            {t.closeTime ? new Date(t.closeTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Open"}
            {held && <>{dot}<span title="Time in trade">Held {held}</span></>}
            {t.strategy && <>{dot}<span className="jx-trow__strat">{t.strategy}</span></>}
            {imgs > 0 && (
              <>
                {dot}
                <span
                  onClick={(e) => { e.stopPropagation(); onImageClick?.(); }}
                  className="jx-trow__imgs"
                  title="View screenshots"
                >
                  <ImageIcon size={11} /> {imgs}
                </span>
              </>
            )}
          </span>
        </div>

        {/* right: P&L with a quiet outcome label under it */}
        <div className="jx-trow__result">
          <span className="jx-trow__pnl">{money(pnl, sym)}</span>
          <span className="jx-trow__outcome">{pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "Breakeven"}</span>
        </div>

        {!selectMode && <span className="jx-trow__menu" onClick={(e) => e.stopPropagation()}>{menu}</span>}
      </div>

      {/* horizontal screenshot strip — tap any thumb to open the zoomable viewer */}
      {showImages && imgs > 0 && (
        <div className="jx-trow__thumbs" onClick={(e) => e.stopPropagation()}>
          {images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.url || i}
              src={img.url}
              alt={`screenshot ${i + 1}`}
              loading="lazy"
              onClick={() => onImageClick?.()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Monthly P&L calendar ---------- */
export function PnlCalendar({ trades, sym }) {
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
        <span style={{ font: "var(--text-label)", fontWeight: 600, letterSpacing: "0.6px", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>Profit &amp; loss · daily</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-2)", font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
          <span style={{ color: "var(--color-success)" }}>● Profit</span>
          <span style={{ color: "var(--color-danger)" }}>● Loss</span>
          <Badge variant={total >= 0 ? "success" : "danger"}>{money(total, sym)}</Badge>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
        <span className="jx-card__title" style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
        <Button variant="ghost" size="sm" onClick={() => nav(-1)} aria-label="Previous month"><ChevronLeft size={15} /></Button>
        <Button variant="ghost" size="sm" onClick={() => nav(1)} aria-label="Next month"><ChevronRight size={15} /></Button>
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
export function TradesHeatmap({ trades, sym }) {
  const [view, setView] = useState("monthly");
  const latest = trades.length
    ? new Date(Math.max(...trades.map((t) => new Date(t.closeTime).getTime())))
    : new Date();
  const [month, setMonth] = useState(new Date(latest.getFullYear(), latest.getMonth(), 1));

  const level = (pnl, maxAbs) => {
    if (pnl === 0) return "rgba(255,255,255,0.03)";
    const i = Math.min(1, Math.abs(pnl) / (maxAbs || 1));
    const base = pnl > 0 ? "var(--color-success)" : "var(--color-danger)";
    // tint on transparent so the greens/reds read the same as the P&L calendar
    return `color-mix(in srgb, ${base} ${18 + i * 44}%, transparent)`;
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
        <span style={{ font: "var(--text-label)", fontWeight: 600, letterSpacing: "0.6px", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>Activity heatmap</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
          Less
          {[0.2, 0.4, 0.6, 0.8, 1].map((i) => (
            <span key={i} style={{ width: 13, height: 13, borderRadius: 3, background: `color-mix(in srgb, var(--color-success) ${18 + i * 44}%, transparent)`, border: "1px solid color-mix(in srgb, var(--color-success) 26%, transparent)" }} />
          ))}
          More
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
        <div className="jx-seg jx-seg--inline" style={{ padding: 3 }}>
          {["monthly", "yearly"].map((v) => (
            <button key={v} className={`jx-seg__btn ${view === v ? "jx-seg__btn--active" : ""}`} style={{ padding: "5px 12px", font: "var(--text-caption)", fontWeight: 600 }} onClick={() => setView(v)}>
              {v === "monthly" ? "Monthly" : "Yearly"}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: "auto", font: "var(--text-body-md)", fontWeight: 600 }}>
          {view === "monthly"
            ? month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
            : month.getFullYear()}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setMonth(new Date(month.getFullYear() - (view === "yearly" ? 1 : 0), month.getMonth() - (view === "monthly" ? 1 : 0), 1))} aria-label="Previous"><ChevronLeft size={15} /></Button>
        <Button variant="ghost" size="sm" onClick={() => setMonth(new Date(month.getFullYear() + (view === "yearly" ? 1 : 0), month.getMonth() + (view === "monthly" ? 1 : 0), 1))} aria-label="Next"><ChevronRight size={15} /></Button>
      </div>

      {view === "monthly" ? (
        <div className="jx-cal">
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
                  borderRadius: 8, minHeight: 56,
                  background: level(pnl, maxAbsM),
                  border: `1px solid ${pnl !== 0 ? "color-mix(in srgb, " + (pnl > 0 ? "var(--color-success)" : "var(--color-danger)") + " 26%, transparent)" : "rgba(255,255,255,0.05)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  font: "var(--text-body-md)",
                  color: pnl > 0 ? "var(--color-success-strong)" : pnl < 0 ? "var(--color-danger-strong)" : "var(--color-text-secondary)",
                  fontWeight: pnl !== 0 ? 600 : 500,
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
                border: `1px solid ${pnl !== 0 ? "color-mix(in srgb, " + (pnl > 0 ? "var(--color-success)" : "var(--color-danger)") + " 26%, transparent)" : "transparent"}`,
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                font: "var(--text-caption)",
                color: pnl > 0 ? "var(--color-success-strong)" : pnl < 0 ? "var(--color-danger-strong)" : "var(--color-text-muted)",
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
  trades: tradesProp = [],
  currencySymbol = "$",
  fxRate = 1,
  usingDummy,
  onAddTrade,
  onTradesAdded,
  onTradesDeleted,
  onTradeUpdated,
  openImportSignal = 0,
  onOpenTab,
  v2 = false, // new dashboard design system (dark shell)
}) {
  // Display trades are converted to the chosen display currency; NATIVE trades
  // are kept for editing (so a converted view can never corrupt a saved trade).
  const trades = useMemo(
    () => (fxRate === 1 ? tradesProp : tradesProp.map((t) => convertTrade(t, fxRate))),
    [tradesProp, fxRate],
  );
  const nativeById = useMemo(
    () => new Map(tradesProp.map((t) => [t._id, t])),
    [tradesProp],
  );
  // always edit the native (journal-currency) trade, never the converted one
  const openEdit = (t) => setEditTrade(nativeById.get(t?._id) || t);
  const [view, setView] = useState("cards");
  const [direction, setDirection] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState(""); // symbol / strategy search
  const [openTrade, setOpenTrade] = useState(null);
  const [opening, setOpening] = useState(false);
  // show an instant loader on click, the details modal (chart, etc.) mounts
  // with a slight delay, so paint a spinner before it appears.
  const handleOpen = (t) => {
    setOpening(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setOpenTrade(t)));
  };
  useEffect(() => { if (openTrade) setOpening(false); }, [openTrade]);
  const [showImport, setShowImport] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  // show screenshot thumbnails on the trade cards (persisted, cards view only)
  const [showCardImages, setShowCardImages] = useState(true);
  useEffect(() => {
    try {
      const v = localStorage.getItem("jx-card-images");
      if (v != null) setShowCardImages(v === "1");
    } catch {}
  }, []);
  const toggleCardImages = () =>
    setShowCardImages((v) => {
      const n = !v;
      try { localStorage.setItem("jx-card-images", n ? "1" : "0"); } catch {}
      return n;
    });
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
  const [showUpgrade, setShowUpgrade] = useState(false);
  // brief skeleton right after a log/edit reload, for a smooth hand-off
  const [booting, setBooting] = useState(false);
  useEffect(() => {
    let flagged = false;
    try { flagged = sessionStorage.getItem("jx-post-save") === "1"; } catch {}
    if (!flagged) return undefined;
    try { sessionStorage.removeItem("jx-post-save"); } catch {}
    setBooting(true);
    const id = setTimeout(() => setBooting(false), 750);
    return () => clearTimeout(id);
  }, []);
  // Free plan history window: trades older than this are locked (blurred)
  const [historyDays, setHistoryDays] = useState(Infinity);
  useEffect(() => {
    (async () => {
      try {
        const userData = await getFromIndexedDB("user-data");
        setHistoryDays(getPlanRules(userData).limits.historyDays);
      } catch { setHistoryDays(Infinity); }
    })();
  }, []);
  const historyCutoffMs = historyDays === Infinity ? -Infinity : Date.now() - historyDays * 864e5;
  const flash = (type, msg, ms = 3000) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), ms);
  };

  const closed = useMemo(() => trades.filter((t) => t.closeTime), [trades]);

  /* ---- overtrading / tilt detector (wellness nudge) ----
     Anchored to the user's most recent activity (works on historical data):
     a burst of trades within an hour, an unusually heavy day, or a run of
     losses are all classic overtrading / revenge-trading signals. */
  const overtrading = useMemo(() => {
    const ts = trades
      .map((t) => new Date(t.closeTime || t.openTime).getTime())
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b);
    if (ts.length < 4) return null;
    const last = ts[ts.length - 1];
    const within1h = ts.filter((x) => last - x <= 60 * 60 * 1000).length;

    const byDay = {};
    ts.forEach((x) => {
      const d = new Date(x);
      const k = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      byDay[k] = (byDay[k] || 0) + 1;
    });
    const counts = Object.values(byDay);
    const avgDay = counts.reduce((a, b) => a + b, 0) / counts.length;
    const lk = (() => { const d = new Date(last); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); })();
    const lastDayCount = byDay[lk] || 0;

    const closedSorted = [...closed].sort((a, b) => new Date(a.closeTime) - new Date(b.closeTime));
    let lossStreak = 0;
    for (let i = closedSorted.length - 1; i >= 0; i--) {
      if ((Number(closedSorted[i].pnl) || 0) < 0) lossStreak++; else break;
    }

    const reasons = [];
    if (within1h >= 4) reasons.push(`${within1h} trades within an hour`);
    if (lastDayCount >= Math.max(6, Math.ceil(avgDay * 2.5))) reasons.push(`${lastDayCount} trades in a single day`);
    if (lossStreak >= 3) reasons.push(`${lossStreak} losses in a row`);
    if (!reasons.length) return null;
    return { reasons, severity: reasons.length };
  }, [trades, closed]);

  // dismiss the nudge for the rest of the day (kept gentle, not naggy)
  const [otDismissed, setOtDismissed] = useState(false);
  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem("jx-overtrade-dismissed") === today) setOtDismissed(true);
    } catch {}
  }, []);
  const dismissOt = () => {
    try { localStorage.setItem("jx-overtrade-dismissed", new Date().toISOString().slice(0, 10)); } catch {}
    setOtDismissed(true);
  };
  const showOvertrading = overtrading && !otDismissed;

  const stats = useMemo(() => {
    const total = closed.length;
    const wins = closed.filter((t) => t.pnl > 0).length;
    const netPnl = closed.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const avgWin = wins ? closed.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) / wins : 0;
    const losses = closed.filter((t) => t.pnl < 0);
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
    const pnls = closed.map((t) => Number(t.pnl) || 0);
    return {
      total,
      wins,
      losses: losses.length,
      best: pnls.length ? Math.max(...pnls) : 0,
      worst: pnls.length ? Math.min(...pnls) : 0,
      winRate: total ? ((wins / total) * 100).toFixed(1) : "0",
      netPnl,
      avgRR: avgLoss > 0 ? (avgWin / avgLoss).toFixed(1) : "—",
    };
  }, [closed]);

  const filtered = useMemo(() => {
    let list = closed;
    if (direction !== "all") list = list.filter((t) => t.direction?.toLowerCase() === direction);
    if (outcome !== "all") {
      list = list.filter((t) => {
        const p = Number(t.pnl) || 0;
        return outcome === "win" ? p > 0 : outcome === "loss" ? p < 0 : p === 0;
      });
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        [t.symbol, t.ticker, t.strategy].some((v) => String(v || "").toLowerCase().includes(q)),
      );
    }
    const by = {
      newest: (a, b) => new Date(b.closeTime) - new Date(a.closeTime),
      oldest: (a, b) => new Date(a.closeTime) - new Date(b.closeTime),
      "pnl-high": (a, b) => (b.pnl || 0) - (a.pnl || 0),
      "pnl-low": (a, b) => (a.pnl || 0) - (b.pnl || 0),
    };
    return [...list].sort(by[sort]);
  }, [closed, direction, outcome, sort, search]);

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
      return flash("danger", "Sample data, log a real trade first");
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
      flash("danger", "Could not delete, try again");
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
    // keep the open details modal in sync so newly added/removed screenshots
    // show up immediately (and still show after the viewer is closed)
    setOpenTrade((prev) => (prev && prev._id === tradeId ? { ...prev, images } : prev));
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedTrades = filtered.filter((t) => selected.has(t._id));
  const allSelected = filtered.length > 0 && selected.size >= filtered.length;
  const toggleSelectAll = () =>
    setSelected(allSelected ? new Set() : new Set(filtered.map((t) => t._id)));
  const selFilters = (direction !== "all" ? 1 : 0) + (outcome !== "all" ? 1 : 0) + (search.trim() ? 1 : 0);
  const clearFilters = () => { setDirection("all"); setOutcome("all"); setSearch(""); };

  const { hidden, toggle, reset, isVisible } = useHiddenSections(
    "jx-tradeslog-sections",
  );

  return (
    <div
      className={v2 ? `${ov.root} ${tl.root}` : undefined}
      style={v2 ? undefined : { display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
    >
      <Toast toast={toast} />

      {/* ===== overtrading / wellness nudge ===== */}
      {showOvertrading && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="jx-card"
          style={{
            background: "color-mix(in srgb, var(--color-primary) 8%, var(--color-bg-surface))",
            border: "1px solid color-mix(in srgb, var(--color-primary) 35%, var(--color-border))",
            display: "flex", gap: "var(--space-3)", alignItems: "center",
            padding: "10px var(--space-4)", flexWrap: "wrap",
          }}
        >
          <span
            style={{
              width: 30, height: 30, borderRadius: "var(--radius-md)", flexShrink: 0,
              background: "var(--color-primary-subtle)", color: "var(--yellow-500)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Wind size={16} />
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 160, flex: "1 1 200px", overflow: "hidden" }}>
            <span style={{ font: "var(--text-body-md)", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>Overtrading</span>
            <span style={{ font: "var(--text-caption)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
              {overtrading.reasons.join(" · ")}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginLeft: "auto", flexShrink: 0, flexWrap: "wrap" }}>
            <button
              className="jx-btn jx-btn--primary jx-btn--sm"
              onClick={() => { dismissOt(); onOpenTab?.("blogs"); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Gamepad2 size={15} /> Calming game
            </button>
            <a href="/blogs" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <button className="jx-btn jx-btn--secondary jx-btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <BookOpen size={15} /> Discipline
              </button>
            </a>
            <button
              onClick={dismissOt}
              aria-label="Dismiss"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 4, lineHeight: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}

      {v2 && (
        <>
          <header className={ov.head}>
            <div>
              <h1 className={ov.title}>Trades log</h1>
              <p className={ov.sub}>
                {stats.total} {stats.total === 1 ? "closed trade" : "closed trades"}
                {usingDummy ? " in the sample journal" : ""}. Open any trade to review it.
              </p>
            </div>
            <div className={ov.headActions}>
              <CustomizeSections sections={TRADESLOG_SECTIONS} hidden={hidden} onToggle={toggle} onReset={reset} fab={false} />
              {!usingDummy && (
                <button type="button" className={`${ov.btn} ${ov.ghost}`} onClick={() => setShowImport(true)}>
                  <Upload size={14} aria-hidden="true" /> Import
                </button>
              )}
              <button type="button" className={`${ov.btn} ${ov.gold} ${tl.headLog}`} onClick={onAddTrade}>
                <Plus size={15} aria-hidden="true" /> Log trade
              </button>
            </div>
          </header>

          {usingDummy && (
            <div className={ov.notice} role="note">
              <span className={ov.noticeIcon} aria-hidden="true"><FlaskConical size={17} /></span>
              <div className={ov.noticeText}>
                <b><span className={ov.hideSm}>You&apos;re looking at </span><span className={ov.showSm}>Viewing </span>sample trades</b>
                <span>Log your first trade or import your history and this list switches to your own trades.</span>
              </div>
              <button type="button" className={`${ov.btn} ${ov.ghost}`} onClick={() => setShowImport(true)}>
                <Upload size={14} aria-hidden="true" /> Import<span className={ov.hideSm}> trades</span>
              </button>
            </div>
          )}

          {stats.total > 0 && (
            <div className={tl.stats} role="list" aria-label="Trade summary">
              <div role="listitem" className={tl.stat}>
                <span>Net P&amp;L</span>
                <b className={stats.netPnl > 0 ? tl.pos : stats.netPnl < 0 ? tl.neg : undefined}>{money(stats.netPnl, currencySymbol)}</b>
                <small>All closed trades</small>
              </div>
              <div role="listitem" className={tl.stat}>
                <span>Win rate</span>
                <b>{Math.round(Number(stats.winRate))}%</b>
                <small>{stats.wins} wins · {stats.losses} losses</small>
              </div>
              <div role="listitem" className={tl.stat}>
                <span>Avg win : loss</span>
                <b>{stats.avgRR === "—" ? "—" : `1 : ${stats.avgRR}`}</b>
                <small>Reward per unit of risk</small>
              </div>
              <div role="listitem" className={tl.stat}>
                <span>Best trade</span>
                <b className={stats.best > 0 ? tl.pos : undefined}>{money(stats.best, currencySymbol)}</b>
                <small>Worst {money(stats.worst, currencySymbol)}</small>
              </div>
            </div>
          )}
        </>
      )}

      {/* header */}
      {!v2 && <div className="jx-tl-tophead" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "nowrap", gap: "var(--space-3)" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ font: "var(--text-h2)" }}>Trades log</div>
          <div style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>
            {stats.total} {stats.total === 1 ? "trade" : "trades"}
            {usingDummy && <> <Badge variant="brand">Sample data</Badge></>}
          </div>
        </div>
        {/* hide header actions while on sample data, the banner below carries
            the primary Import / Log actions (avoids duplicate CTAs) */}
        <div className="jx-tl-topactions" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", flexShrink: 0, justifyContent: "flex-end" }}>
          <CustomizeSections
            sections={TRADESLOG_SECTIONS}
            hidden={hidden}
            onToggle={toggle}
            onReset={reset}
            fab={false}
          />
          {!usingDummy && (
            <>
              <Button variant="outline" icon={Upload} onClick={() => setShowImport(true)} aria-label="Import trades" className="jx-tl-import">
                <span className="jx-lbl-full">Import trades</span>
                <span className="jx-lbl-short">Import</span>
              </Button>
              <Button variant="primary" icon={Plus} onClick={onAddTrade} aria-label="Log trade">
                <span className="jx-lbl-full">Log trade</span>
                <span className="jx-lbl-short">Log</span>
              </Button>
            </>
          )}
        </div>
      </div>}

      {/* sample-data nudge */}
      {!v2 && usingDummy && (
        <SampleDataBanner onLog={onAddTrade} onImport={() => setShowImport(true)} />
      )}

      {/* Performance stats and the Calendar & heatmap moved to the Overview
          (analytics) page to keep the Trades log focused on the trade list. */}

      {/* ===== All trades (header, filters, bulk bar, views) ===== */}
      {isVisible("allTrades") && (
      <>
      {(() => {
        const directionDD = (
          <Dropdown value={direction} onChange={setDirection} label="Direction" triggerPrefix="Direction"
            options={[
              { value: "all", label: "All", icon: ArrowUpDown, hint: "Long and short trades" },
              { value: "long", label: "Long", icon: TrendingUp, hint: "Bought expecting a rise" },
              { value: "short", label: "Short", icon: TrendingDown, hint: "Sold expecting a fall" },
            ]}
            triggerStyle={{ height: 38 }} />
        );
        const outcomeDD = (
          <Dropdown value={outcome} onChange={setOutcome} label="Outcome" triggerPrefix="Outcome"
            options={[
              { value: "all", label: "All", icon: Layers, hint: "Every closed trade" },
              { value: "win", label: "Wins", icon: CircleCheck, hint: "Closed in profit" },
              { value: "loss", label: "Losses", icon: CircleX, hint: "Closed at a loss" },
              { value: "breakeven", label: "Breakeven", icon: CircleMinus, hint: "Closed flat" },
            ]}
            triggerStyle={{ height: 38 }} />
        );
        const sortDD = (
          <Dropdown value={sort} onChange={setSort} label="Sort by" triggerPrefix="Sort"
            options={[
              { value: "newest", label: "Newest first", icon: CalendarArrowDown, hint: "Most recent at the top" },
              { value: "oldest", label: "Oldest first", icon: CalendarArrowUp, hint: "Start from the beginning" },
              { value: "pnl-high", label: "P&L: high to low", icon: ArrowDownWideNarrow, hint: "Biggest winners first" },
              { value: "pnl-low", label: "P&L: low to high", icon: ArrowUpNarrowWide, hint: "Biggest losers first" },
            ]}
            triggerStyle={{ height: 38 }} />
        );
        return (
          <>
          <div className="jx-tl-toolbar">
            {/* row 1: search + view controls */}
            <div className="jx-tl-toolbar__top">
              <div className="jx-input jx-tl-search" role="search">
                <span className="jx-input__icon"><Search size={14} /></span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  aria-label="Search by symbol or strategy"
                />
                {search && (
                  <button type="button" aria-label="Clear search" onClick={() => setSearch("")}
                    style={{ border: "none", background: "transparent", color: "var(--color-text-muted)", cursor: "pointer", display: "flex", padding: 0 }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="jx-tl-toolbar__actions">
                {/* screenshots on cards: one compact toggle instead of a full-width tab */}
                {view === "cards" && (
                  <button
                    type="button"
                    className={`jx-btn jx-btn--sm jx-tl-iconbtn ${showCardImages ? "jx-tl-iconbtn--on" : ""}`}
                    onClick={toggleCardImages}
                    aria-pressed={showCardImages}
                    aria-label={showCardImages ? "Hide screenshots on cards" : "Show screenshots on cards"}
                    title={showCardImages ? "Hide screenshots on cards" : "Show screenshots on cards"}
                  >
                    {showCardImages ? <ImageIcon size={15} /> : <ImageOff size={15} />}
                    <span className="jx-tl-selectlbl">Images</span>
                  </button>
                )}

                {/* cards / table view toggle (icons only) */}
                <div className="jx-seg jx-seg--inline jx-tl-viewseg" role="group" aria-label="View">
                  <button
                    type="button"
                    className={`jx-seg__btn ${view === "cards" ? "jx-seg__btn--active" : ""}`}
                    onClick={() => setView("cards")}
                    title="Cards view"
                    aria-label="Cards view"
                    aria-pressed={view === "cards"}
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    type="button"
                    className={`jx-seg__btn ${view === "table" ? "jx-seg__btn--active" : ""}`}
                    onClick={() => setView("table")}
                    title="Table view"
                    aria-label="Table view"
                    aria-pressed={view === "table"}
                  >
                    <List size={16} />
                  </button>
                </div>

                {/* bulk select */}
                <button
                  type="button"
                  className={`jx-btn jx-btn--sm jx-tl-iconbtn ${selectMode ? "jx-btn--primary" : ""}`}
                  onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
                  aria-pressed={selectMode}
                  aria-label={selectMode ? "Done selecting" : "Select trades"}
                  title={selectMode ? "Done selecting" : "Select trades to export or delete"}
                >
                  <CheckSquare size={15} /> <span className="jx-tl-selectlbl">{selectMode ? "Done" : "Select"}</span>
                </button>
              </div>
            </div>

            {/* row 2: filters — wraps on desktop, swipes sideways on phones */}
            <div className="jx-tl-toolbar__filters" role="group" aria-label="Filter and sort trades">
              <div className="jx-tl-filterbar__dd">{directionDD}</div>
              <div className="jx-tl-filterbar__dd">{outcomeDD}</div>
              <div className="jx-tl-filterbar__dd">{sortDD}</div>
              {selFilters > 0 && (
                <button type="button" className="jx-btn jx-btn--ghost jx-btn--sm jx-tl-clear" onClick={clearFilters}>
                  <X size={13} /> Clear
                </button>
              )}
            </div>

            {/* the header already shows the total, so only speak up while filtering */}
            {selFilters > 0 && (
              <span className="jx-tl-toolbar__meta" aria-live="polite">
                Showing {filtered.length} of {closed.length} trades
              </span>
            )}
          </div>
          </>
        );
      })()}

      {/* ===== Bulk action bar (shown whenever in select mode) ===== */}
      <AnimatePresence>
        {selectMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="jx-selbar"
          >
            {/* select-all toggle */}
            <button
              type="button"
              className="jx-selbar__all"
              onClick={toggleSelectAll}
              aria-pressed={allSelected}
            >
              <span className={`jx-selbar__box${allSelected ? " is-on" : ""}${!allSelected && selected.size > 0 ? " is-part" : ""}`}>
                {allSelected ? <CheckSquare size={16} /> : selected.size > 0 ? <Minus size={13} /> : <Square size={16} />}
              </span>
              {allSelected ? "Deselect all" : `Select all (${filtered.length})`}
            </button>

            <span className="jx-selbar__divider" aria-hidden="true" />

            {selected.size > 0 ? (
              <>
                <Badge variant="brand">{selected.size} selected</Badge>
                <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                  Net {money(selectedTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0), currencySymbol)}
                </span>
              </>
            ) : (
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                Pick trades, or select all
              </span>
            )}

            <span style={{ marginLeft: "auto", display: "flex", gap: "var(--space-2)" }}>
              <Button variant="outline" size="sm" icon={Download} disabled={!selected.size} onClick={() => askExport(selectedTrades)}>
                Export{selected.size ? ` ${selected.size}` : ""}
              </Button>
              <Button variant="danger" size="sm" icon={Trash2} disabled={!selected.size} onClick={() => askDelete(selectedTrades)}>
                Delete{selected.size ? ` ${selected.size}` : ""}
              </Button>
              <Button variant="ghost" size="sm" icon={X} onClick={() => { setSelected(new Set()); setSelectMode(false); }}>
                Done
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
          {booting ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="jx-skel-row" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="jx-card" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
              <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>No trades match these filters</span>
              <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>
                Try a different symbol or widen the filters, your full history is still here.
              </span>
              {selFilters > 0 && (
                <Button variant="outline" size="sm" icon={X} onClick={clearFilters}>Clear filters</Button>
              )}
            </div>
          ) : view === "cards" ? (
            (() => {
              const lockedIdx = historyCutoffMs === -Infinity ? -1 : groups.findIndex(
                ([, l]) => new Date(l[0]?.closeTime || l[0]?.openTime || Date.now()).getTime() < historyCutoffMs,
              );
              return (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {groups.map(([label, list], gi) => {
                if (lockedIdx >= 0 && gi > lockedIdx) return null; // rest fully hidden
                const locked = lockedIdx >= 0 && gi === lockedIdx;
                const net = list.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
                const d0 = new Date(list[0]?.closeTime || Date.now());
                const weekday = d0.toLocaleDateString("en-GB", { weekday: "long" });
                const dateStr = d0.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                const rel = label.startsWith("Today") ? "Today" : label.startsWith("Yesterday") ? "Yesterday" : null;
                return (
                <div key={label} className="jx-tgroup" style={{ position: "relative" }}>
                {locked && (
                  <div
                    onClick={() => setShowUpgrade(true)}
                    style={{ position: "absolute", inset: 0, zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--space-3)", textAlign: "center", padding: "var(--space-5)", cursor: "pointer", background: "color-mix(in srgb, var(--color-bg-canvas) 45%, transparent)", borderRadius: "var(--radius-lg)" }}
                  >
                    <span style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-primary-subtle)", color: "var(--yellow-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Crown size={22} />
                    </span>
                    <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>Older history is locked</span>
                    <span style={{ font: "var(--text-caption)", color: "var(--color-text-secondary)", maxWidth: 300 }}>
                      Free shows the last {historyDays} days. Upgrade to Pro for your full trade history.
                    </span>
                    <span className="jx-btn jx-btn--primary jx-btn--sm"><Crown size={14} /> Upgrade to view</span>
                  </div>
                )}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", ...(locked ? { filter: "blur(7px)", pointerEvents: "none", userSelect: "none" } : {}) }}
                  aria-hidden={locked || undefined}
                >
                  <div className="jx-tday">
                    <span className="jx-tday__date">
                      <b>{rel || weekday}</b>
                      <span className="jx-tday__long">{rel ? `${weekday.slice(0, 3)}, ${dateStr}` : dateStr}</span>
                      <span className="jx-tday__short">{dateStr.replace(/ \d{4}$/, "")}</span>
                    </span>
                    <span className="jx-tday__count">
                      {list.length} {list.length === 1 ? "trade" : "trades"}
                      {(() => {
                        const w = list.filter((x) => Number(x.pnl) > 0).length;
                        const l = list.filter((x) => Number(x.pnl) < 0).length;
                        if (!w && !l) return null;
                        return <> ·{w > 0 && <> <em className="jx-tday__w">{w}W</em></>}{l > 0 && <> <em className="jx-tday__l">{l}L</em></>}</>;
                      })()}
                    </span>
                    <span className={`jx-tday__net jx-tday__net--${net > 0 ? "up" : net < 0 ? "down" : "flat"}`}>
                      {money(net, currencySymbol)}
                    </span>
                  </div>
                  <div className="jx-trow-list">
                    {list.map((t, i) => (
                      <TradeCard
                        key={t._id || i}
                        t={t}
                        sym={currencySymbol}
                        onOpen={handleOpen}
                        selectMode={selectMode}
                        selected={selected.has(t._id)}
                        onToggleSelect={() => toggleSelect(t._id)}
                        onImageClick={() => setViewerTrade(t)}
                        showImages={showCardImages}
                        menu={
                          <RowMenu
                            onEdit={() => openEdit(t)}
                            onExport={() => askExport([t])}
                            onShareCard={() => shareCard(t)}
                            onDelete={() => askDelete([t])}
                          />
                        }
                      />
                    ))}
                  </div>
                </div>
                </div>
                );
              })}
            </div>
              );
            })()
          ) : (
            (() => {
              // only show columns that have data for at least one trade in view
              const entryOf = (t) => t.avgEntryPrice || t.entryPrice || t.entries?.[0]?.price;
              const exitOf = (t) => t.avgExitPrice || t.exitPrice || t.exits?.[0]?.price;
              const heldOf = (t) => {
                const ms = t.openTime && t.closeTime ? new Date(t.closeTime) - new Date(t.openTime) : 0;
                if (!(ms > 0)) return null;
                const m = Math.round(ms / 60000);
                return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ""}`.trim() : `${Math.round(m / 1440)}d`;
              };
              const show = {
                entry: filtered.some((t) => entryOf(t)),
                exit: filtered.some((t) => exitOf(t)),
                size: filtered.some((t) => Number(t.totalQuantity) > 0),
                rr: filtered.some((t) => t.rr),
                strat: filtered.some((t) => t.strategy || t.reason?.[0]),
                held: filtered.some((t) => heldOf(t)),
                img: filtered.some((t) => t.images?.length),
              };
              const net = filtered.reduce((a2, t) => a2 + (Number(t.pnl) || 0), 0);
              const wins = filtered.filter((t) => Number(t.pnl) > 0).length;
              return (
            <div className="jx-card jx-table-wrap jx-tl-table" style={{ padding: 0, overflowX: "auto" }}>
              <table className="jx-table jx-table--log">
                <thead>
                  <tr>
                    {selectMode && (
                      <th style={{ width: 36 }}>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={allSelected ? "Deselect all" : "Select all"}
                          title={allSelected ? "Deselect all" : "Select all"}
                          onClick={toggleSelectAll}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSelectAll(); } }}
                          style={{ display: "inline-flex", cursor: "pointer" }}
                        >
                          {allSelected ? <CheckSquare size={16} /> : selected.size > 0 ? <Minus size={13} /> : <Square size={16} />}
                        </span>
                      </th>
                    )}
                    <th>Symbol</th>
                    <th>Side</th>
                    {show.strat && <th className="jx-col-sm-hide">Strategy</th>}
                    {show.entry && <th className="jx-col-sm-hide jx-num">Entry</th>}
                    {show.exit && <th className="jx-col-sm-hide jx-num">Exit</th>}
                    {show.size && <th className="jx-col-sm-hide jx-num">Size</th>}
                    {show.rr && <th className="jx-col-sm-hide jx-num">R : R</th>}
                    {show.held && <th className="jx-col-sm-hide jx-num">Held</th>}
                    <th className="jx-num">P&amp;L</th>
                    <th className="jx-num">Closed</th>
                    {show.img && <th className="jx-col-sm-hide" style={{ textAlign: "center" }}>Img</th>}
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => {
                    const isLong = t.direction?.toLowerCase() === "long";
                    const pnl = Number(t.pnl) || 0;
                    const entry = entryOf(t);
                    const exit = exitOf(t);
                    const held = heldOf(t);
                    const strat = t.strategy || t.reason?.[0];
                    const d = new Date(t.closeTime);
                    return (
                      <tr
                        key={t._id || i}
                        onClick={() => (selectMode ? toggleSelect(t._id) : handleOpen(t))}
                        data-selected={selected.has(t._id) || undefined}
                        data-tone={pnl > 0 ? "up" : pnl < 0 ? "down" : undefined}
                      >
                        {selectMode && (
                          <td onClick={(e) => { e.stopPropagation(); toggleSelect(t._id); }}>
                            <span className="jx-tl-check" style={{ display: "flex" }}>
                              {selected.has(t._id) ? <CheckSquare size={16} /> : <Square size={16} />}
                            </span>
                          </td>
                        )}
                        <td className="jx-tl-sym">{t.symbol || t.ticker || "—"}</td>
                        <td>
                          <span className="jx-tl-side">
                            {isLong ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
                            {isLong ? "Long" : "Short"}
                          </span>
                        </td>
                        {show.strat && <td className="jx-col-sm-hide jx-tl-muted">{strat || "—"}</td>}
                        {show.entry && <td className="jx-col-sm-hide jx-num">{entry ? `${currencySymbol}${fmt(entry)}` : "—"}</td>}
                        {show.exit && <td className="jx-col-sm-hide jx-num">{exit ? `${currencySymbol}${fmt(exit)}` : "—"}</td>}
                        {show.size && <td className="jx-col-sm-hide jx-num">{qty(t.totalQuantity)}</td>}
                        {show.rr && <td className="jx-col-sm-hide jx-num">{t.rr ? (String(t.rr).includes(":") ? t.rr : `1 : ${fmt(t.rr, 1)}`) : "—"}</td>}
                        {show.held && <td className="jx-col-sm-hide jx-num jx-tl-muted">{held || "—"}</td>}
                        <td className="jx-num jx-tl-pnl">{money(pnl, currencySymbol)}</td>
                        <td className="jx-num jx-tl-date">
                          <span>{d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                          <small>{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                        </td>
                        {show.img && (
                          <td className="jx-col-sm-hide" style={{ textAlign: "center" }} onClick={(e) => { e.stopPropagation(); if (t.images?.length) setViewerTrade(t); }}>
                            {t.images?.length ? (
                              <span className="jx-tl-imgs" title="View screenshots"><ImageIcon size={12} aria-hidden="true" /> {t.images.length}</span>
                            ) : <span className="jx-tl-muted">—</span>}
                          </td>
                        )}
                        <td className="jx-tl-actions" onClick={(e) => e.stopPropagation()}>
                          {!selectMode && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                              <RowMenu
                                onEdit={() => openEdit(t)}
                                onExport={() => askExport([t])}
                                onShareCard={() => shareCard(t)}
                                onDelete={() => askDelete([t])}
                              />
                              <ChevronRight size={16} className="jx-tl-chev" aria-hidden="true" />
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={99}>
                        <div className="jx-tl-foot">
                          <span>{filtered.length} trade{filtered.length === 1 ? "" : "s"} · {Math.round((wins / filtered.length) * 100)}% won</span>
                          <span>Net <b className={net > 0 ? "jx-pos" : net < 0 ? "jx-neg" : undefined}>{money(net, currencySymbol)}</b></span>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
              );
            })()
          )}
        </motion.div>
      </AnimatePresence>
      </>
      )}

      {/* instant loader while the details modal mounts */}
      {opening && (
        <div className="jx-modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <Loader2 size={30} className="jx-spin" style={{ color: "var(--yellow-500)" }} />
            <span style={{ font: "var(--text-small)", color: "var(--color-text-secondary)" }}>Opening trade…</span>
          </div>
        </div>
      )}

      {/* Trade details (gamified) */}
      <TradeDetailsModal
        open={!!openTrade}
        trade={openTrade}
        currencySymbol={currencySymbol}
        onClose={() => setOpenTrade(null)}
        onEdit={(t) => { setOpenTrade(null); openEdit(t); }}
        onDelete={(t) => askDelete([t])}
        onImageClick={(t) => setViewerTrade(t)}
        onTradeUpdated={(t) => { setOpenTrade(t); onTradeUpdated?.(t); }}
      />

      {/* Edit trade, prefilled log modal (native journal currency; falls back
          to jx-base-currency, never the converted display currency) */}
      <LogTradeModal
        open={!!editTrade}
        initialTrade={editTrade}
        currentAccountId={editTrade?.accountId}
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

      <UpgradeSheet
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="Unlock your full history"
        reason={`Free shows the last ${historyDays} days of trades. Upgrade to Pro to see everything.`}
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
