"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import axios from "axios";
import Cookies from "js-cookie";
import {
  AlertTriangle,
  ArrowRightLeft,
  Braces,
  CandlestickChart,
  Check,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  Flame,
  Eye,
  GripVertical,
  Image as ImageIcon,
  LineChart,
  Mic,
  Pencil,
  Plus,
  SlidersHorizontal,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
  X,
  Zap,
} from "lucide-react";

import Dropdown from "./Dropdown";
import DateTimePicker from "./DateTimePicker";
import ChartAnnotator from "./ChartAnnotator";
import QuickFillChips from "./QuickFillChips";
import TradersTodayBadge from "./TradersTodayBadge";
import VoiceNoteRecorder from "./VoiceNoteRecorder";
import TradeSaveLoader from "./TradeSaveLoader";
import UpgradeSheet from "./UpgradeSheet";
import Toast from "./Toast";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import { hasLiveCandles } from "@/utils/livePrice";
import { canAddTrade, canChartLog, getPlanRules } from "@/utils/planRestrictions";
import useBeforeUnload from "@/utils/useBeforeUnload";
import { logTradeToSheet, tradeToSheetPayload } from "@/utils/tradeSheetLog";
import { scheduleAutoBackup } from "@/utils/driveBackup";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/* ---------------- customizable section order ----------------
   Users can reorder the log-trade sections (free, no gate). The order is
   kept per-mode and persisted as ONE JSON string in the profile
   (`logSectionOrder`) plus mirrored into IndexedDB, so no repeat API calls
   are needed to render the modal. */
const DEFAULT_SECTION_ORDER = {
  quick: ["asset", "result", "timing", "note", "voice", "screenshots"],
  detailed: [
    "asset",
    "chart",
    "entryexit",
    "risk",
    "timing",
    "edge",
    "psychology",
    "screenshots",
    "notes",
  ],
};

/* human labels + icons for the Customize sheet's reorder list */
const SECTION_META = {
  asset: { label: "Asset & direction", icon: CandlestickChart },
  chart: { label: "Log on chart", icon: LineChart },
  result: { label: "Result (P&L)", icon: Zap },
  entryexit: { label: "Entry, exit & size", icon: ArrowRightLeft },
  risk: { label: "Risk management", icon: AlertTriangle },
  timing: { label: "Timing", icon: Clock },
  edge: { label: "Your edge & context", icon: LineChart },
  psychology: { label: "Psychology & discipline", icon: Flame },
  screenshots: { label: "Screenshots", icon: ImageIcon },
  notes: { label: "Notes", icon: Pencil },
  note: { label: "Note", icon: Pencil },
  voice: { label: "Voice note", icon: Mic },
};

/* keep a saved order valid against the current defaults: drop unknown ids,
   keep the user's sequence, then append any new sections at the end. */
function mergeSectionOrder(saved, defaults) {
  if (!Array.isArray(saved) || !saved.length) return [...defaults];
  const allowed = new Set(defaults);
  const out = saved.filter((id) => allowed.has(id));
  defaults.forEach((id) => {
    if (!out.includes(id)) out.push(id);
  });
  return out;
}

/* ---------------- primitives ---------------- */

function Seg({ items, value, onChange, inline }) {
  return (
    <div className={`jx-seg ${inline ? "jx-seg--inline" : ""}`}>
      {items.map((it) => {
        const Icon = it.icon;
        const active = value === it.value;
        return (
          <button
            key={it.value}
            type="button"
            title={it.title || it.label}
            aria-label={it.title || it.label}
            className={`jx-seg__btn ${active ? "jx-seg__btn--active" : ""}`}
            onClick={() => onChange(it.value)}
          >
            {Icon && (
              <Icon
                size={16}
                className={it.glow ? "jx-seg__glow" : undefined}
                style={it.glow ? { color: "var(--yellow-500)" } : undefined}
              />
            )}
            {it.label && <span>{it.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

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

function Field({ label, children }) {
  return (
    <div className="jx-field">
      <label
        className="jx-field__label"
        style={{ font: "var(--text-small)", fontWeight: 500 }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

/* pretty duration from milliseconds → "45m" / "2h 15m" / "3d 4h" */
function fmtDur(ms) {
  if (ms == null || !isFinite(ms) || ms <= 0) return "—";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const hr = h % 24;
  return hr ? `${d}d ${hr}h` : `${d}d`;
}

/* Timing input: either full date/time pickers, or a simple "just duration"
   (mins/hours) on an optional date. mode = "quick" | "detailed". */
function TimingInput({ form, set, mode }) {
  const dur = form.useDuration;

  // this trade's From→To span (live preview)
  const spanMs =
    form.entryTime && form.exitTime
      ? new Date(form.exitTime).getTime() - new Date(form.entryTime).getTime()
      : null;

  // the trader's historical avg hold time, split by win / loss
  const [hold, setHold] = useState(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const u = await getFromIndexedDB("user-data");
        const trades = u?.trades || [];
        let wSum = 0, wN = 0, lSum = 0, lN = 0;
        trades.forEach((t) => {
          if (!t.openTime || !t.closeTime) return;
          const ms = new Date(t.closeTime).getTime() - new Date(t.openTime).getTime();
          if (!(ms > 0)) return;
          if ((Number(t.pnl) || 0) >= 0) { wSum += ms; wN += 1; }
          else { lSum += ms; lN += 1; }
        });
        if (active) setHold({ win: wN ? wSum / wN : null, winN: wN, loss: lN ? lSum / lN : null, lossN: lN });
      } catch {
        /* ignore — preview just won't show */
      }
    })();
    return () => { active = false; };
  }, []);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", width: "100%", borderBottom: "1px solid var(--color-border)" }}>
        {[
          { v: false, l: "Date & time" },
          { v: true, l: "Just duration" },
        ].map((o) => {
          const on = dur === o.v;
          return (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => set("useDuration", o.v)}
              style={{
                flex: 1,
                padding: "11px 0",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${on ? "var(--color-primary)" : "transparent"}`,
                marginBottom: -1,
                cursor: "pointer",
                color: on ? "var(--color-text-primary)" : "var(--color-text-muted)",
                font: "var(--text-body-md)",
                fontWeight: on ? 700 : 600,
                whiteSpace: "nowrap",
                transition: "color 0.15s ease, border-color 0.15s ease",
              }}
            >
              {o.l}
            </button>
          );
        })}
      </div>

      {dur ? (
        <div className="jx-form-grid">
          <Field label="Date · optional (defaults to today)">
            <div className="jx-input">
              <input
                type="date"
                value={form.tradeDate}
                onChange={(e) => set("tradeDate", e.target.value)}
              />
            </div>
          </Field>
          <Field label="Trade duration">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div className="jx-input" style={{ flex: 1, minWidth: 120 }}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={
                    form.durationUnit === "hour" ? "e.g. 2.5" : "e.g. 45"
                  }
                  value={form.durationVal}
                  onChange={(e) => set("durationVal", e.target.value)}
                />
              </div>
              <div className="jx-seg jx-seg--inline" style={{ flexShrink: 0 }}>
                {[
                  ["min", "Mins"],
                  ["hour", "Hours"],
                ].map(([u, lbl]) => (
                  <button
                    key={u}
                    type="button"
                    className={`jx-seg__btn ${form.durationUnit === u ? "jx-seg__btn--active" : ""}`}
                    onClick={() => set("durationUnit", u)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            {/* quick-fill duration presets + custom */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "var(--space-2)" }}>
              {[
                ["5", "min", "5m"],
                ["15", "min", "15m"],
                ["30", "min", "30m"],
                ["1", "hour", "1h"],
                ["2", "hour", "2h"],
                ["4", "hour", "4h"],
                ["24", "hour", "1d"],
              ].map(([v, u, lbl]) => {
                const on = String(form.durationVal) === v && form.durationUnit === u;
                return (
                  <button
                    key={lbl}
                    type="button"
                    className={`jx-chip ${on ? "jx-chip--selected" : ""}`}
                    style={{ padding: "6px 12px", font: "var(--text-caption)" }}
                    onClick={() => { set("durationVal", v); set("durationUnit", u); }}
                  >
                    {lbl}
                  </button>
                );
              })}
              {/* custom: clear the preset so the user types their own value above */}
              <button
                type="button"
                className="jx-chip"
                style={{ padding: "6px 12px", font: "var(--text-caption)" }}
                onClick={() => set("durationVal", "")}
              >
                + Custom
              </button>
            </div>
          </Field>
        </div>
      ) : (
        <>
          <div className="jx-form-grid">
            <Field label="From · opened">
              <DateTimePicker
                value={form.entryTime}
                onChange={(v) => set("entryTime", v)}
              />
            </Field>
            <Field label="To · closed">
              <DateTimePicker
                value={form.exitTime}
                onChange={(v) => set("exitTime", v)}
              />
            </Field>
          </div>

          {/* live duration preview once both ends are set */}
          {spanMs != null && (
            spanMs > 0 ? (
              <div
                className="jx-banner jx-banner--success"
                style={{ background: "var(--color-bg-elevated)" }}
              >
                <Clock size={15} style={{ color: "var(--yellow-500)" }} />
                <span>
                  This trade lasted <strong>{fmtDur(spanMs)}</strong>.
                </span>
              </div>
            ) : (
              <div className="jx-banner jx-banner--warn">
                <AlertTriangle size={15} style={{ color: "var(--yellow-500)" }} />
                <span>Close time is before open time — check your From / To.</span>
              </div>
            )
          )}

          {/* the trader's historical average hold time, by outcome */}
          {hold && (hold.win != null || hold.loss != null) && (
            <div
              style={{
                display: "flex",
                gap: "var(--space-2)",
                flexWrap: "wrap",
                font: "var(--text-caption)",
                color: "var(--color-text-muted)",
              }}
            >
              <span style={{ alignSelf: "center" }}>Your avg hold:</span>
              {hold.win != null && (
                <span className="jx-badge jx-badge--success">
                  Wins {fmtDur(hold.win)}
                </span>
              )}
              {hold.loss != null && (
                <span className="jx-badge jx-badge--danger">
                  Losses {fmtDur(hold.loss)}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Chip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      className={`jx-chip ${selected ? "jx-chip--selected" : ""}`}
      onClick={onClick}
    >
      {selected && <Check size={14} />}
      {children}
    </button>
  );
}

/* chips + inline "+ Custom" adder */
function ChipsWithCustom({
  options,
  value,
  onSelect,
  onAddCustom,
  placeholder = "Add custom…",
}) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const commit = () => {
    const v = text.trim();
    if (v) onAddCustom(v);
    setText("");
    setAdding(false);
  };
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-2)",
        alignItems: "center",
      }}
    >
      {options.map((o) => (
        <Chip
          key={o}
          selected={value === o}
          onClick={() => onSelect(value === o ? null : o)}
        >
          {o}
        </Chip>
      ))}
      {adding ? (
        <span className="jx-input" style={{ height: 34, width: 160 }}>
          <input
            autoFocus
            placeholder={placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), commit())
            }
            onBlur={commit}
          />
        </span>
      ) : (
        <button
          type="button"
          className="jx-chip"
          style={{ borderStyle: "dashed" }}
          onClick={() => setAdding(true)}
        >
          <Plus size={13} /> Custom
        </button>
      )}
    </div>
  );
}

function Stars({ value, onChange }) {
  const label =
    value <= 0 ? "" : value <= 2 ? "Low" : value === 3 ? "Medium" : "High";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          font: "var(--text-small)",
          color: "var(--color-text-secondary)",
          marginRight: 4,
        }}
      >
        Confidence
      </span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 2,
            display: "flex",
          }}
          aria-label={`${n} star`}
        >
          <Star
            size={20}
            fill={n <= value ? "var(--color-primary)" : "none"}
            color={
              n <= value ? "var(--yellow-500)" : "var(--color-border-strong)"
            }
          />
        </button>
      ))}
      {label && (
        <span style={{ font: "var(--text-small)", fontWeight: 600 }}>
          {label}
        </span>
      )}
    </div>
  );
}

function QualityRing({ pct }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width="128"
      height="128"
      viewBox="0 0 128 128"
      style={{ alignSelf: "center" }}
    >
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        stroke="var(--color-bg-muted)"
        strokeWidth="12"
      />
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        transform="rotate(-90 64 64)"
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      <text
        x="64"
        y="60"
        textAnchor="middle"
        style={{ font: "600 24px Poppins", fill: "var(--color-text-primary)" }}
      >
        {pct}%
      </text>
      <text
        x="64"
        y="80"
        textAnchor="middle"
        style={{ font: "400 11px Poppins", fill: "var(--color-text-muted)" }}
      >
        complete
      </text>
    </svg>
  );
}

function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        display: "inline-block",
        border: "2px solid color-mix(in srgb, currentColor 30%, transparent)",
        borderTopColor: "currentColor",
      }}
    />
  );
}

/* ---------------- constants & helpers ---------------- */

const DEFAULT_STRATEGIES = [
  "Breakout",
  "Pullback",
  "Reversal",
  "Range",
  "Trend-follow",
  "News",
];
const DEFAULT_EMOTIONS = ["Calm", "Confident", "FOMO", "Revenge", "Hesitant"];

/* User's tradable symbols are managed in localStorage so they can add/remove
   their own list. Seeded with a few common markets on first use. */
const SYMBOLS_KEY = "jx-symbols";
const DEFAULT_SYMBOLS = [
  "BTC/USDT",
  "ETH/USDT",
  "SOL/USDT",
  "XAU/USD",
  "EUR/USD",
  "NIFTY",
  "AAPL",
  "TSLA",
];
const readStoredSymbols = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(SYMBOLS_KEY) || "null");
    if (Array.isArray(raw) && raw.length) return raw;
  } catch {}
  return null;
};
const writeStoredSymbols = (list) => {
  try {
    localStorage.setItem(SYMBOLS_KEY, JSON.stringify(list));
  } catch {}
};
const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D"];
const MISTAKES = [
  "None",
  "Moved stop",
  "Oversized",
  "No stop",
  "Chased entry",
  "Exited early",
];
const MAX_IMAGES = 4;
const MAX_BYTES = 10 * 1024 * 1024;

const EMPTY = {
  symbol: "",
  direction: "long",
  entry: "",
  exit: "",
  size: "",
  sizeUnit: "asset",
  leverage: "",
  feeValue: "",
  feeUnit: "percent",
  stopLoss: "",
  takeProfit: "",
  entryTime: "",
  exitTime: "",
  // Simple timing: log just a duration (mins/hours) on a chosen date instead
  // of full entry/exit timestamps. Date is optional → defaults to today.
  useDuration: false,
  durationVal: "",
  durationUnit: "min", // "min" | "hour"
  tradeDate: "",
  strategy: null,
  market: null,
  timeframe: null,
  tfCustom: "",
  confidence: 0,
  emotion: null,
  followedPlan: false,
  mistakes: [],
  screenshots: [],
  notes: "",
  logMethod: "pnl",
  netPnl: "",
};

const fmt = (v, d = 2) =>
  Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
const fmtMoney = (v, sym = "$") => {
  const a = Math.abs(v);
  const s = a >= 1000 ? `${sym}${fmt(a / 1000, 2)}k` : `${sym}${fmt(a)}`;
  return `${v < 0 ? "−" : "+"}${s}`;
};
const detectSession = (dt) => {
  if (!dt) return null;
  const h = new Date(dt).getUTCHours();
  if (h < 7) return "Asia session";
  if (h < 13) return "London session";
  if (h < 21) return "New York session";
  return "Sydney session";
};
/* Stable snapshot of the form for "unsaved changes" detection. Screenshots
   hold File objects (not JSON-serialisable) so we compare their count only. */
const serializeForm = (f) =>
  JSON.stringify({ ...f, screenshots: (f?.screenshots || []).length });

const p2 = (n) => String(n).padStart(2, "0");
const nowLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
};

/* Sample JSON we ask users to fill (also shown as a copyable example) and the
   ChatGPT deep-link that pre-loads the instructions so they can paste a
   screenshot / type their trade and get back JSON only. */
const TRADE_JSON_SAMPLE = `{
  "symbol": "BTCUSDT",
  "direction": "long",
  "size": 0.5,
  "entry": 61000,
  "exit": 62250,
  "fees": 3.2,
  "pnl": 621.8,
  "openTime": "2026-08-12T09:30",
  "closeTime": "2026-08-12T11:05",
  "notes": "broke out of range, trailed the stop"
}`;

const CHATGPT_JSON_PROMPT = `You are a trade-log parser for a trading journal. I will give you my trade in ONE of two ways: (A) I attach a screenshot of the trade from my broker/exchange, or (B) I type it out in plain words. Read whichever I give you and reply with ONLY one JSON object, no explanation, no markdown, no code fences, matching exactly these keys:

{
  "symbol": "ticker, e.g. BTCUSDT",
  "direction": "long or short",
  "size": number (position size in units of the asset),
  "entry": number (average entry price),
  "exit": number (average exit price),
  "fees": number (total fees/commission in account currency, 0 if unknown),
  "pnl": number (net profit or loss in account currency, optional),
  "openTime": "YYYY-MM-DDTHH:mm 24-hour, optional",
  "closeTime": "YYYY-MM-DDTHH:mm 24-hour, optional",
  "notes": "short free text, optional"
}

Rules: output valid JSON only. Use null for anything you can't find. "direction" must be exactly "long" or "short". Numbers must be plain (no currency symbols, no commas). Times must be 24-hour local time in YYYY-MM-DDTHH:mm; if I give a start time plus a duration (e.g. "10am, 2h"), set openTime to the start and closeTime to start + duration. Do not add extra keys or any text before/after the JSON.

HOW I MIGHT GIVE IT TO YOU, EXAMPLES:

Example A (I attach a screenshot): I paste an image of my position/order history. Read the ticker, side, size, entry & exit prices, fees and P&L straight off the image.

Example B (I type it): "BTCUSDT 10am IST, 2h, long, 0.5 size, entry 61000 exit 62250"
Your reply for Example B:
{
  "symbol": "BTCUSDT",
  "direction": "long",
  "size": 0.5,
  "entry": 61000,
  "exit": 62250,
  "fees": 0,
  "pnl": 625,
  "openTime": "2026-08-12T10:00",
  "closeTime": "2026-08-12T12:00",
  "notes": null
}

Now here is my trade (screenshot or text below):`;

const CHATGPT_JSON_URL = `https://chatgpt.com/?q=${encodeURIComponent(CHATGPT_JSON_PROMPT)}`;

/* ================================================================
   LogTradeModal, wired to POST /api/trades/addd.
   Quick & Detailed share one modal frame (same width/height) and
   one trades collection; tradeStatus differs.
   ================================================================ */
/* map an existing trade → form state (edit mode) */
const toLocal = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
};

const tradeToForm = (t) => {
  const tf = t.timeframe || "";
  const isStd = TIMEFRAMES.includes(tf);
  return {
    ...EMPTY,
    symbol: t.symbol || "",
    direction: t.direction || "long",
    entry: t.avgEntryPrice || t.entries?.[0]?.price || "",
    exit: t.avgExitPrice || t.exits?.[0]?.price || "",
    // Reload the size in the SAME unit it was entered: cash trades store the
    // cash value in quantityUSD; asset trades store units in totalQuantity.
    // (Loading totalQuantity for a cash trade showed the huge asset quantity.)
    size:
      (t.sizeUnit === "usd"
        ? t.quantityUSD ?? t.totalQuantity
        : t.totalQuantity) ?? "",
    sizeUnit: t.sizeUnit || "asset",
    leverage: t.leverage && t.leverage !== 1 ? t.leverage : "",
    feeValue: t.openFeeValue || "",
    feeUnit: t.feeType === "currency" ? "currency" : "percent",
    stopLoss: t.avgSLPrice || t.sls?.[0]?.price || "",
    takeProfit: t.avgTPPrice || t.tps?.[0]?.price || "",
    entryTime: toLocal(t.openTime),
    exitTime: toLocal(t.closeTime),
    strategy: t.strategy || t.reason?.[0] || null,
    market: t.marketCondition || null,
    timeframe: tf ? (isStd ? tf : "custom") : null,
    tfCustom: !isStd && tf ? tf.replace(/\D/g, "") : "",
    confidence: Number(t.confidence) || 0,
    emotion: t.emotion || null,
    followedPlan: !!t.rulesFollowed,
    mistakes: t.mistakes || [],
    // load already-saved screenshots so edits (add/remove) start from the real
    // set; these have a url + sizeKB but no `file` (nothing to re-upload).
    screenshots: (t.images || [])
      .filter((i) => i?.url)
      .map((i) => ({ name: i.name || "screenshot", url: i.url, sizeKB: i.sizeKB || 0, existing: true })),
    notes: t.learnings || "",
    netPnl: t.pnl ?? "",
  };
};

export default function LogTradeModal({
  open,
  onClose,
  onSaved,
  onSubmit,
  initialTrade = null,
  currentAccountId = null,
  currencySymbol,
  onNoJournal,
  accounts = [],
  currentBalances = {},
  accountSymbols = {},
}) {
  const isEdit = !!initialTrade?._id;
  // Currency the user is logging in, prefer the prop from the dashboard,
  // else fall back to the active journal's base currency from localStorage.
  const sym = useMemo(() => {
    if (currencySymbol) return currencySymbol;
    try {
      return getCurrencySymbol((localStorage.getItem("jx-base-currency") || "USD").toLowerCase());
    } catch {
      return "$";
    }
  }, [currencySymbol]);
  // ISO code of the journal currency (e.g. INR), used to label the cash
  // position-size unit so it matches the journal, not a hardcoded "USD".
  const curCode = useMemo(() => {
    try {
      return (localStorage.getItem("jx-base-currency") || "USD").toUpperCase();
    } catch {
      return "USD";
    }
  }, []);
  const [mode, setMode] = useState("quick");
  const [showMore, setShowMore] = useState(false); // quick-log "add more details" accordion
  // ---- customizable section order (free, drag to reorder) ----
  const [customize, setCustomize] = useState(false); // reorder mode on/off
  const [sectionOrder, setSectionOrder] = useState(DEFAULT_SECTION_ORDER);
  const orderSaveTimer = useRef(null);
  const [useChart, setUseChart] = useState(false); // "Log on chart" toggle
  const [chartMeta, setChartMeta] = useState(null); // {symbol,timeframe,entryPrice,exitPrice,entryTime,exitTime}
  const [voice, setVoice] = useState(null); // { blob, transcript, durationSec }
  const [jsonOpen, setJsonOpen] = useState(false); // "Import from JSON" panel
  const [jsonText, setJsonText] = useState(""); // pasted JSON
  const [jsonErr, setJsonErr] = useState(""); // parse error message
  const [form, setForm] = useState(EMPTY);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [symbols, setSymbols] = useState([]);
  const [customStrategies, setCustomStrategies] = useState([]);
  const [customEmotions, setCustomEmotions] = useState([]);
  const [maxImages, setMaxImages] = useState(MAX_IMAGES); // plan-gated per-trade cap
  // portal target guard (SSR-safe): only render into <body> on the client so
  // the fixed overlay escapes any transformed ancestor and truly anchors to
  // the viewport (otherwise the bottom sheet / CTA can fall below the fold).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ---- which journal this trade logs into (switchable in-modal) ---- */
  const [activeAccountId, setActiveAccountId] = useState(currentAccountId);
  const [showAcctSwitch, setShowAcctSwitch] = useState(false);
  const [previewImg, setPreviewImg] = useState(null); // screenshot lightbox url
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  // keep the in-modal selection in sync with the dashboard's active journal
  // whenever the modal (re)opens or the dashboard switches underneath it.
  useEffect(() => {
    if (open) setActiveAccountId(currentAccountId);
  }, [open, currentAccountId]);

  /* ---- load the saved section order when the modal opens (from the local
     IndexedDB cache, so there's no extra API call). Falls back to defaults. */
  useEffect(() => {
    if (!open) return;
    setCustomize(false); // never open straight into reorder mode
    let active = true;
    (async () => {
      try {
        const u = await getFromIndexedDB("user-data");
        const raw = u?.logSectionOrder;
        if (!raw || !active) return;
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!parsed || typeof parsed !== "object") return;
        setSectionOrder({
          quick: mergeSectionOrder(parsed.quick, DEFAULT_SECTION_ORDER.quick),
          detailed: mergeSectionOrder(parsed.detailed, DEFAULT_SECTION_ORDER.detailed),
        });
      } catch {
        /* corrupt/absent → keep defaults */
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  /* persist a new order: write to IndexedDB immediately (so the next open is
     instant) and best-effort sync to the profile string, debounced. */
  const persistSectionOrder = (next) => {
    const str = JSON.stringify(next);
    (async () => {
      try {
        const u = (await getFromIndexedDB("user-data")) || {};
        await saveToIndexedDB("user-data", { ...u, logSectionOrder: str });
      } catch {
        /* ignore cache write failures */
      }
    })();
    clearTimeout(orderSaveTimer.current);
    orderSaveTimer.current = setTimeout(() => {
      axios
        .put(
          `${API_BASE}/api/auth/update-profile`,
          { logSectionOrder: str },
          { withCredentials: true },
        )
        .catch(() => {
          /* best-effort — the local cache is the source of truth for render */
        });
    }, 700);
  };

  // latest order, persisted once the drag settles (avoids spamming the
  // rate-limited /update-profile endpoint on every crossing → 429s)
  const pendingOrderRef = useRef(null);
  const handleReorder = (nextIds) => {
    // a short haptic tick each time a section crosses another (mobile)
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(12);
    setSectionOrder((prev) => {
      const next = { ...prev, [mode]: nextIds };
      pendingOrderRef.current = next;
      return next;
    });
  };
  const flushOrder = () => {
    if (pendingOrderRef.current) {
      persistSectionOrder(pendingOrderRef.current);
      pendingOrderRef.current = null;
    }
  };

  /* ---- auto-scroll the scroll container while dragging a section near an
     edge, so you can drop a section above/below the current fold. In customize
     mode the Reorder group itself scrolls (groupScrollRef) so framer keeps the
     dragged section glued to the pointer; otherwise the modal body scrolls. ---- */
  const bodyScrollRef = useRef(null);
  const groupScrollRef = useRef(null);
  const dragPointerY = useRef(0);
  const autoScrollRAF = useRef(null);
  const runAutoScroll = () => {
    const el = groupScrollRef.current || bodyScrollRef.current;
    if (!el) {
      autoScrollRAF.current = null;
      return;
    }
    const rect = el.getBoundingClientRect();
    const EDGE = 90; // px zone near each edge that triggers scrolling
    const MAX = 9; // px per frame at full intensity (gentler, so it keeps pace with the drag)
    const y = dragPointerY.current;
    let dy = 0;
    if (y < rect.top + EDGE) {
      const t = Math.min(1, (rect.top + EDGE - y) / EDGE);
      dy = -Math.ceil(MAX * t * t); // ease-in so it ramps up smoothly, not a jump
    } else if (y > rect.bottom - EDGE) {
      const t = Math.min(1, (y - (rect.bottom - EDGE)) / EDGE);
      dy = Math.ceil(MAX * t * t);
    }
    if (dy) el.scrollTop += dy;
    autoScrollRAF.current = requestAnimationFrame(runAutoScroll);
  };
  const startAutoScroll = () => {
    if (autoScrollRAF.current == null) {
      autoScrollRAF.current = requestAnimationFrame(runAutoScroll);
    }
  };
  const stopAutoScroll = () => {
    if (autoScrollRAF.current != null) {
      cancelAnimationFrame(autoScrollRAF.current);
      autoScrollRAF.current = null;
    }
  };
  useEffect(() => () => stopAutoScroll(), []);
  const activeAccount = useMemo(
    () =>
      accounts.find((a) => a._id === activeAccountId) ||
      accounts.find((a) => a._id === currentAccountId) ||
      accounts[0] ||
      null,
    [accounts, activeAccountId, currentAccountId],
  );
  const acctSym = (acc) =>
    acc ? (accountSymbols[acc.name] ?? acc.currency ?? sym) : sym;
  const acctBalance = (acc) => (acc ? (currentBalances[acc.name] ?? 0) : 0);
  const chooseAccount = (acc) => {
    if (!acc) return;
    setActiveAccountId(acc._id);
    Cookies.set("accountId", acc._id, { expires: 365 });
    try {
      localStorage.setItem("jx-account-id", acc._id);
    } catch {}
    setShowAcctSwitch(false);
  };

  const fileRef = useRef(null);
  const baselineRef = useRef(null); // form snapshot at open → "unsaved changes"
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Warn (native "Leave site?") on tab-close/refresh when there are unsaved edits
  const isDirty =
    open && baselineRef.current != null && serializeForm(form) !== baselineRef.current;
  useBeforeUnload(isDirty && !saving);

  /* symbol list management (persisted to localStorage) */
  const addSymbol = (raw) => {
    const sym = (raw || "").trim().toUpperCase();
    if (!sym) return;
    setSymbols((prev) => {
      if (prev.includes(sym)) return prev;
      const next = [sym, ...prev];
      writeStoredSymbols(next);
      return next;
    });
  };
  const removeSymbol = (sym) => {
    setSymbols((prev) => {
      const next = prev.filter((s) => s !== sym);
      writeStoredSymbols(next);
      return next;
    });
    if (form.symbol === sym) set("symbol", "");
  };
  const pickSymbol = (v) => {
    addSymbol(v); // typing a new one persists it
    set("symbol", (v || "").toUpperCase());
  };
  const flash = (type, msg, ms = 3000) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), ms);
  };

  /* -------- Import from JSON (paste) -------------------------------------
     No AI on our side: the user pastes a JSON object (from a screenshot they
     ran through ChatGPT, or typed) and we map it onto the detailed-log form. */
  const prefillFromJson = () => {
    const raw = (jsonText || "").trim();
    if (!raw) { setJsonErr("Paste the JSON first."); return; }
    let d;
    try {
      // tolerate ``` / ```json code fences and surrounding prose
      let s = raw.replace(/```(?:json)?/gi, "").trim();
      const a = s.indexOf("{"), b = s.lastIndexOf("}");
      if (a !== -1 && b !== -1 && b > a) s = s.slice(a, b + 1);
      d = JSON.parse(s);
    } catch {
      setJsonErr("That doesn't look like valid JSON, copy the whole { … } block.");
      return;
    }
    if (!d || typeof d !== "object" || Array.isArray(d)) {
      setJsonErr('Expected a JSON object like { "symbol": … }.');
      return;
    }
    const has = (v) => v !== undefined && v !== null && v !== "";
    let filled = 0;
    setForm((f) => {
      const n = { ...f };
      if (has(d.symbol)) { n.symbol = String(d.symbol).toUpperCase(); filled++; }
      if (d.direction === "long" || d.direction === "short") { n.direction = d.direction; filled++; }
      if (has(d.size) && !isNaN(Number(d.size))) { n.size = String(d.size); n.sizeUnit = "asset"; filled++; }
      if (has(d.entry) && !isNaN(Number(d.entry))) { n.entry = String(d.entry); filled++; }
      if (has(d.exit) && !isNaN(Number(d.exit))) { n.exit = String(d.exit); filled++; }
      if (has(d.fees) && !isNaN(Number(d.fees))) { n.feeValue = String(Math.abs(Number(d.fees))); n.feeUnit = "currency"; filled++; }
      if (has(d.pnl) && !isNaN(Number(d.pnl))) { n.netPnl = String(d.pnl); filled++; }
      if (has(d.openTime)) { n.entryTime = String(d.openTime).slice(0, 16); n.useDuration = false; filled++; }
      if (has(d.closeTime)) { n.exitTime = String(d.closeTime).slice(0, 16); n.useDuration = false; filled++; }
      if (has(d.notes)) { n.notes = String(d.notes); filled++; }
      return n;
    });
    if (!filled) { setJsonErr("Couldn't find any trade fields in that JSON."); return; }
    setJsonErr("");
    setJsonText("");
    setJsonOpen(false);
    flash("success", `Prefilled ${filled} field${filled > 1 ? "s" : ""} from JSON, review and save.`);
  };

  /* chart annotation → mirror entry/exit into the form so prices + P&L and
     the saved tvChart stay in sync */
  const onChartChange = (meta) => {
    setChartMeta(meta);
    setForm((f) => ({
      ...f,
      // searching a symbol on the chart keeps the asset field in sync
      symbol: meta.symbol ? meta.symbol.toUpperCase() : f.symbol,
      entry: meta.entryPrice !== "" && meta.entryPrice != null ? String(meta.entryPrice) : f.entry,
      exit: meta.exitPrice !== "" && meta.exitPrice != null ? String(meta.exitPrice) : f.exit,
      size: meta.size !== "" && meta.size != null ? String(meta.size) : f.size,
      sizeUnit: meta.sizeUnit || f.sizeUnit,
      // auto-fill the quick-log P&L from the chart marks so it isn't re-typed
      netPnl: meta.pnl != null ? String(Math.round(meta.pnl * 100) / 100) : f.netPnl,
    }));
  };

  /* "Log on chart" only works when we can load a real, clickable candle feed
, that's crypto pairs on Binance. Stocks/futures/forex only have a
     read-only TradingView embed you can't mark on, so the toggle is disabled
     for them. */
  const chartMarkable = hasLiveCandles(form.symbol);
  const chartToggleDisabled = !!form.symbol && !chartMarkable;

  /* if the user switches to a symbol with no live chart, quietly turn the
     toggle off so they don't sit on an unusable read-only embed */
  useEffect(() => {
    if (chartToggleDisabled && useChart) setUseChart(false);
  }, [chartToggleDisabled, useChart]);

  /* load symbols from IndexedDB trades + custom chip lists */
  useEffect(() => {
    if (!open) return;
    if (initialTrade?._id) {
      const base = tradeToForm(initialTrade);
      setForm(base);
      baselineRef.current = serializeForm(base);
      setMode(initialTrade.tradeStatus === "quick" ? "quick" : "detailed");
      // reopen the chart when this trade was logged on a chart, or simply has
      // an entry & exit we can mark
      setUseChart(
        !!initialTrade.tvChart ||
          (Number(initialTrade.avgEntryPrice) > 0 &&
            Number(initialTrade.avgExitPrice) > 0),
      );
    } else {
      setForm(EMPTY);
      baselineRef.current = serializeForm(EMPTY);
      setMode("quick");
      setUseChart(false);
    }
    setChartMeta(null);
    setVoice(null);
    setShowMore(false);
    setToast(null);
    (async () => {
      try {
        const userData = await getFromIndexedDB("user-data");
        const trades = userData?.trades || [];
        const seen = new Map();
        [...trades]
          .sort(
            (a, b) =>
              new Date(b.openTime || b.closeTime) -
              new Date(a.openTime || a.closeTime),
          )
          .forEach((t) => {
            const s = (t.symbol || "").toUpperCase();
            if (s && !seen.has(s)) seen.set(s, true);
          });
        // merge: stored list (or defaults) + any symbols seen in real trades
        const stored = readStoredSymbols() || DEFAULT_SYMBOLS;
        const merged = [
          ...new Set([...stored, ...seen.keys()].map((s) => s.toUpperCase())),
        ];
        writeStoredSymbols(merged);
        setSymbols(merged);
        setCustomStrategies(
          (await getFromIndexedDB("jx-custom-strategies")) || [],
        );
        setCustomEmotions((await getFromIndexedDB("jx-custom-emotions")) || []);
        const perTrade = getPlanRules(userData).limits.imagesPerTrade;
        setMaxImages(
          perTrade === Infinity ? MAX_IMAGES : perTrade || MAX_IMAGES,
        );
      } catch (e) {
        console.error("IndexedDB read failed:", e);
      }
    })();
  }, [open]);

  const addCustomStrategy = async (v) => {
    const next = [...new Set([...customStrategies, v])];
    setCustomStrategies(next);
    set("strategy", v);
    try {
      await saveToIndexedDB("jx-custom-strategies", next);
    } catch {}
  };
  const addCustomEmotion = async (v) => {
    const next = [...new Set([...customEmotions, v])];
    setCustomEmotions(next);
    set("emotion", v);
    try {
      await saveToIndexedDB("jx-custom-emotions", next);
    } catch {}
  };

  /* ---------- calculations (mirrors backend semantics) ---------- */
  const num = (v) => (v === "" || v == null ? null : Number(v));
  const calc = useMemo(() => {
    const entry = num(form.entry);
    const exit = num(form.exit);
    const size = num(form.size);
    const lev = num(form.leverage) || 1;
    const dir = form.direction === "long" ? 1 : -1;

    /* asset quantity regardless of input unit */
    const assetQty =
      form.sizeUnit === "asset"
        ? size
        : size && entry
          ? (size * lev) / entry
          : null;
    const notional = assetQty && entry ? assetQty * entry : null; // position value
    const quantityUSD =
      form.sizeUnit === "usd" ? size : notional ? notional / lev : null; // margin

    const feeVal = num(form.feeValue) || 0;
    const feeAmount =
      form.feeUnit === "percent"
        ? notional
          ? (notional * feeVal) / 100
          : 0
        : feeVal;

    const grossPnl =
      entry && exit && assetQty ? (exit - entry) * assetQty * dir : null;
    const pnl = grossPnl != null ? grossPnl - feeAmount : null;
    const retPct = pnl != null && notional ? (pnl / notional) * 100 : null;

    const sl = num(form.stopLoss);
    const tp = num(form.takeProfit);
    const plannedRR =
      entry && sl && tp && Math.abs(entry - sl) > 0
        ? Math.abs(tp - entry) / Math.abs(entry - sl)
        : null;
    const expectedLoss =
      entry && sl && assetQty ? Math.abs(entry - sl) * assetQty : 0;
    const expectedProfit =
      entry && tp && assetQty ? Math.abs(tp - entry) * assetQty : 0;
    const realizedR =
      pnl != null && expectedLoss > 0 ? pnl / expectedLoss : null;

    return {
      assetQty,
      notional,
      quantityUSD,
      feeAmount,
      pnl,
      retPct,
      plannedRR,
      expectedLoss,
      expectedProfit,
      realizedR,
    };
  }, [form]);

  const timeframeValue =
    form.timeframe === "custom"
      ? form.tfCustom
        ? `${form.tfCustom}m`
        : ""
      : form.timeframe || "";

  /* ---------- quality + XP ---------- */
  const checks = useMemo(
    () => [
      {
        label: "Risk set (SL/TP)",
        xp: 20,
        ok: form.stopLoss !== "" && form.takeProfit !== "",
      },
      { label: "Strategy tagged", xp: 10, ok: !!form.strategy },
      { label: "Emotion logged", xp: 10, ok: !!form.emotion },
      { label: "Notes added", xp: 10, ok: form.notes.trim().length > 0 },
      { label: "Screenshot", xp: 15, ok: form.screenshots.length > 0 },
    ],
    [form],
  );

  const quality = useMemo(() => {
    if (mode === "quick") {
      if (form.logMethod === "pnl") return form.netPnl !== "" ? 30 : 10;
      return form.entry && form.exit && form.size ? 45 : 15;
    }
    let q = 0;
    if (form.symbol) q += 10;
    if (form.entry && form.exit && form.size) q += 25;
    q += checks.reduce((s, c) => s + (c.ok ? c.xp : 0), 0);
    return Math.min(100, q);
  }, [mode, form, checks]);

  const qualityLabel =
    quality >= 70 ? "Strong log" : quality >= 40 ? "Good log" : "Basic log";
  const missing = checks.find((c) => !c.ok);
  const session = detectSession(form.entryTime);

  /* quick mode auto outcome */
  const quickPnl = form.logMethod === "pnl" ? num(form.netPnl) : calc.pnl;
  const quickOutcome = quickPnl == null ? null : quickPnl >= 0 ? "Win" : "Loss";

  /* net-P&L sign toggle (profit / loss) shown inside the input.
     Flips the sign of the entered amount — type/tap a number, tap to mark a loss. */
  const pnlNeg = (() => {
    const n = num(form.netPnl);
    return n != null && n < 0;
  })();
  const flipPnlSign = () => {
    const n = Number(String(form.netPnl ?? "").trim());
    if (!Number.isFinite(n) || n === 0) return;
    set("netPnl", String(-n));
  };

  /* ---------- images ---------- */
  const totalBytes = form.screenshots.reduce(
    (s, i) => s + (i.file?.size || (i.sizeKB ? i.sizeKB * 1024 : 0)),
    0,
  );
  const addImages = (files) => {
    const incoming = Array.from(files || []).filter((f) =>
      f.type.startsWith("image/"),
    );
    let bytes = totalBytes;
    const next = [...form.screenshots];
    for (const f of incoming) {
      if (next.length >= maxImages) {
        flash(
          "danger",
          maxImages === 1
            ? "Free plan allows 1 screenshot per trade, upgrade for up to 4"
            : `Max ${maxImages} screenshots per trade`,
        );
        break;
      }
      if (bytes + f.size > MAX_BYTES) {
        flash("danger", "Screenshots exceed the 10MB limit");
        break;
      }
      bytes += f.size;
      next.push({ name: f.name, url: URL.createObjectURL(f), file: f });
    }
    set("screenshots", next);
  };

  /* ---------- submit ---------- */
  const save = async (addAnother) => {
    /* validation */
    if (!form.symbol.trim()) return flash("danger", "Pick a symbol first");
    if (mode === "quick" && form.logMethod === "pnl") {
      if (form.netPnl === "") return flash("danger", "Enter your net P&L");
    } else if (!(num(form.entry) && num(form.size))) {
      return flash("danger", "Entry price and position size are required");
    }
    // Prefer the journal the dashboard is currently showing, then the cookie,
    // then the durable localStorage copy.
    const accountId =
      activeAccountId ||
      currentAccountId ||
      Cookies.get("accountId") ||
      (typeof window !== "undefined" && localStorage.getItem("jx-account-id"));
    if (!accountId) {
      // genuinely no journal, send them to pick/create one
      flash("danger", "Select a journal to log into first");
      onClose?.();
      onNoJournal?.();
      return;
    }
    // keep cookie + localStorage in sync for the API call and future logs
    Cookies.set("accountId", accountId, { expires: 365 });
    try {
      localStorage.setItem("jx-account-id", accountId);
    } catch {}

    /* plan limit: trades per month — only on NEW trades, edits are always allowed */
    if (!isEdit) {
      try {
        const userData = await getFromIndexedDB("user-data");
        const allowed = await canAddTrade(userData);
        if (!allowed) {
          const limit = getPlanRules(userData).limits.tradeLimitPerMonth;
          setUpgradeReason(`You've logged all ${limit} trades on your Free plan this month.`);
          setShowUpgrade(true);
          return;
        }
      } catch {}
    }

    const isQuickPnl = mode === "quick"; // quick log is always net-P&L based
    const pnl = isQuickPnl ? Number(form.netPnl) : (calc.pnl ?? 0);
    const hasExit = !!num(form.exit);

    let openTime, closeTime, durationHrs;
    if (form.useDuration) {
      // Simple mode: a duration on a chosen date (defaults to today). We anchor
      // the close at noon on that date and back-date the open by the duration,
      // so the trade lands on the right day and the duration is preserved.
      const dateStr = form.tradeDate || new Date().toISOString().slice(0, 10); // yyyy-mm-dd
      const close = new Date(`${dateStr}T12:00:00`);
      durationHrs =
        form.durationUnit === "hour"
          ? Math.max(0, num(form.durationVal) || 0)
          : Math.max(0, (num(form.durationVal) || 0) / 60);
      const open = new Date(close.getTime() - durationHrs * 36e5);
      openTime = open.toISOString();
      closeTime = close.toISOString();
    } else {
      openTime = form.entryTime
        ? new Date(form.entryTime).toISOString()
        : new Date().toISOString();
      closeTime = form.exitTime
        ? new Date(form.exitTime).toISOString()
        : isQuickPnl || hasExit
          ? new Date().toISOString()
          : "";
      durationHrs =
        openTime && closeTime
          ? Math.max(0, (new Date(closeTime) - new Date(openTime)) / 36e5)
          : 0;
    }

    // If the user MARKED entry & exit on the chart (real click times), use
    // those candle times as the trade's open/close, unless they explicitly
    // chose "just duration" mode.
    if (useChart && !form.useDuration && chartMeta?.entryTime && chartMeta?.exitTime) {
      openTime = chartMeta.entryTime;
      closeTime = chartMeta.exitTime;
      durationHrs = Math.max(0, (new Date(closeTime) - new Date(openTime)) / 36e5);
    }

    const fd = new FormData();
    fd.append("accountId", accountId);
    fd.append("symbol", form.symbol.trim().toUpperCase());
    fd.append("direction", form.direction);
    fd.append(
      "tradeStatus",
      mode === "quick" ? "quick" : hasExit || closeTime ? "closed" : "running",
    );
    fd.append("quantityUSD", calc.quantityUSD ?? 0);
    fd.append("leverage", num(form.leverage) || 1);
    fd.append("totalQuantity", calc.assetQty ?? 0);
    fd.append("sizeUnit", form.sizeUnit);
    fd.append(
      "entries",
      JSON.stringify(
        num(form.entry)
          ? [
              {
                price: num(form.entry),
                allocation: 100,
                quantity: calc.assetQty || 0,
              },
            ]
          : [],
      ),
    );
    fd.append(
      "exits",
      JSON.stringify(
        hasExit
          ? [
              {
                mode: "price",
                price: num(form.exit),
                allocation: 100,
                quantity: calc.assetQty || 0,
              },
            ]
          : [],
      ),
    );
    fd.append(
      "sls",
      JSON.stringify(
        num(form.stopLoss)
          ? [{ mode: "price", price: num(form.stopLoss), allocation: 100 }]
          : [],
      ),
    );
    fd.append(
      "tps",
      JSON.stringify(
        num(form.takeProfit)
          ? [{ mode: "price", price: num(form.takeProfit), allocation: 100 }]
          : [],
      ),
    );
    fd.append("avgEntryPrice", num(form.entry) || 0);
    fd.append("avgExitPrice", num(form.exit) || 0);
    fd.append("avgSLPrice", num(form.stopLoss) || 0);
    fd.append("avgTPPrice", num(form.takeProfit) || 0);
    fd.append("expectedProfit", calc.expectedProfit || 0);
    fd.append("expectedLoss", calc.expectedLoss || 0);
    fd.append("rr", calc.plannedRR ? `1:${fmt(calc.plannedRR, 1)}` : "");
    fd.append("feeType", form.feeUnit);
    fd.append("openFeeValue", num(form.feeValue) || 0);
    fd.append("feeAmount", calc.feeAmount || 0);
    fd.append("pnl", pnl || 0);
    fd.append("pnlAfterFee", pnl || 0);
    fd.append("openTime", openTime);
    if (closeTime) fd.append("closeTime", closeTime);
    fd.append("duration", durationHrs);
    fd.append("reason", JSON.stringify(form.strategy ? [form.strategy] : []));
    const voiceT = (voice?.transcript || "").trim();
    fd.append(
      "learnings",
      voiceT ? `${form.notes ? form.notes + "\n\n" : ""}🎙 Voice note: ${voiceT}` : form.notes,
    );
    fd.append("rulesFollowed", form.followedPlan);
    fd.append("strategy", form.strategy || "");
    fd.append("marketCondition", form.market || "");
    fd.append("timeframe", timeframeValue);
    fd.append("confidence", form.confidence);
    fd.append("emotion", form.emotion || "");
    fd.append("mistakes", JSON.stringify(form.mistakes));
    // new files to upload
    form.screenshots.forEach(
      (img) => img.file && fd.append("images", img.file),
    );
    // on edit, tell the server which already-saved screenshots to keep (the ones
    // without a fresh `file`); anything omitted was removed by the user.
    if (isEdit) {
      fd.append(
        "keepImages",
        JSON.stringify(
          form.screenshots.filter((img) => !img.file && img.url).map((img) => img.url),
        ),
      );
    }
    if (voice?.blob) {
      fd.append("voiceNote", voice.blob, "voice-note.webm");
      fd.append("voiceNoteTranscript", voiceT);
      fd.append("voiceNoteDuration", String(voice.durationSec || 0));
    }

    /* chart annotation → tvChart metadata so the details page can redraw the
       marked chart with entry/exit + timeframes. Gated by the plan's monthly
       chart-log allowance (existing chart trades being edited are exempt). */
    let attachChart = useChart && !!chartMeta?.entryPrice && !!chartMeta?.exitPrice;
    if (attachChart && !isEdit) {
      try {
        const ud = await getFromIndexedDB("user-data");
        if (!canChartLog(ud)) {
          attachChart = false;
          const lim = getPlanRules(ud).limits.chartLogLimitPerMonth;
          flash(
            "danger",
            `Chart not attached, you've used all ${lim} chart logs this month. Upgrade to Pro for unlimited.`,
            4000,
          );
        }
      } catch {}
    }
    if (attachChart) {
      const tvTfMap = { "1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1d": "D" };
      fd.append(
        "tvChart",
        JSON.stringify({
          symbol: (chartMeta.symbol || form.symbol).toUpperCase(),
          exchange: "BINANCE",
          timeframe: tvTfMap[chartMeta.timeframe] || "60",
          entryTime: chartMeta.entryTime || openTime,
          exitTime: chartMeta.exitTime || closeTime || openTime,
          entryPrice: Number(chartMeta.entryPrice),
          exitPrice: Number(chartMeta.exitPrice),
          stopPrice: num(form.stopLoss) || 0,
          takeProfit: num(form.takeProfit) || 0,
        }),
      );
    }

    setSaving(true);
    try {
      const res = isEdit
        ? await axios.put(
            `${API_BASE}/api/trades/update/${initialTrade._id}`,
            fd,
            { withCredentials: true },
          )
        : await axios.post(`${API_BASE}/api/trades/addd`, fd, {
            withCredentials: true,
          });
      const trade = res.data?.trade;

      // mirror new trades to the tracking sheet (fire-and-forget, client-only)
      if (!isEdit && trade) {
        logTradeToSheet(tradeToSheetPayload(trade, "manual"));
      }

      /* sync IndexedDB cache so the journal updates offline too. */
      try {
        const userData = (await getFromIndexedDB("user-data")) || {};
        userData.trades = isEdit
          ? (userData.trades || []).map((t) =>
              t._id === trade._id ? { ...t, ...trade } : t,
            )
          : [...(userData.trades || []), trade];
        await saveToIndexedDB("user-data", userData);
      } catch (e) {
        console.error("IndexedDB sync failed:", e);
      }

      // background Drive backup (debounced, silent, no loader)
      scheduleAutoBackup();

      onSaved?.(trade, { updated: isEdit });
      onSubmit?.(trade);
      flash("success", isEdit ? "Trade updated" : "Trade logged");
      if (addAnother && !isEdit) setForm(EMPTY);
      else setTimeout(() => onClose?.(), 900);
    } catch (err) {
      console.error("Save trade failed:", err);
      // backend safety-cap hit → show the upgrade sheet, not a red toast
      if (err.response?.status === 403 && err.response?.data?.code === "LIMIT") {
        setUpgradeReason(err.response.data.message || "You've hit your Free plan trade limit.");
        setShowUpgrade(true);
      } else {
        flash("danger", err.response?.data?.message || "Could not save trade, try again");
      }
    } finally {
      setSaving(false);
    }
  };

  const isQuick = mode === "quick";

  /* ---------- shared blocks ---------- */
  // just the symbol text input (so Long/Short can sit beside it)
  const symbolInputBlock = (
    <div className="jx-input">
      <input
        placeholder="Symbol (e.g. BTC)"
        value={form.symbol}
        onChange={(e) => set("symbol", e.target.value.toUpperCase())}
      />
    </div>
  );

  // the scrollable "Recent" symbols row (rendered under the asset row)
  const symbolRecentBlock = (
    <>
      {symbols.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            overflowX: "auto",
            flexWrap: "nowrap",
            paddingBottom: 2,
          }}
        >
          <span
            style={{
              font: "var(--text-caption)",
              color: "var(--color-text-muted)",
              flexShrink: 0,
            }}
          >
            Recent
          </span>
          {symbols.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              className={`jx-chip ${form.symbol === s ? "jx-chip--selected" : ""}`}
              style={{ padding: "4px 10px", flexShrink: 0 }}
              onClick={() => set("symbol", s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </>
  );

  const directionBlock = (
    <div className="jx-dirbig">
      {[
        [
          "long",
          "Long",
          "Buy / go long",
          TrendingUp,
          "long-active",
          "var(--color-success-strong)",
        ],
        [
          "short",
          "Short",
          "Sell / go short",
          TrendingDown,
          "short-active",
          "var(--color-danger-strong)",
        ],
      ].map(([dir, title, sub, Icon, activeCls, color]) => (
        <button
          key={dir}
          type="button"
          title={title}
          aria-label={title}
          aria-pressed={form.direction === dir}
          className={`jx-dirbig__btn ${form.direction === dir ? `jx-dirbig__btn--${activeCls}` : ""}`}
          onClick={() => set("direction", dir)}
        >
          <span className="jx-dirbig__icon">
            <Icon size={16} />
          </span>
          <span style={{ display: "flex", flexDirection: "column" }}>
            <span
              className="jx-dirbig__title"
              style={{ color: form.direction === dir ? color : undefined }}
            >
              {title}
            </span>
            <span className="jx-dirbig__sub">{sub}</span>
          </span>
        </button>
      ))}
    </div>
  );

  const screenshotsBlock = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addImages(e.target.files);
            e.target.value = "";
          }}
        />
        {form.screenshots.map((img, i) => (
          <div key={i} style={{ position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.name}
              onClick={() => setPreviewImg(img.url)}
              style={{
                width: 64,
                height: 64,
                objectFit: "cover",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)",
                cursor: "zoom-in",
              }}
            />
            {/* preview affordance */}
            <span
              onClick={() => setPreviewImg(img.url)}
              style={{
                position: "absolute", bottom: 3, right: 3, width: 18, height: 18, borderRadius: 6,
                background: "rgba(0,0,0,0.6)", color: "#fff", display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "zoom-in", backdropFilter: "blur(2px)",
              }}
            >
              <Eye size={11} />
            </span>
            <button
              type="button"
              aria-label="Remove"
              onClick={() =>
                set(
                  "screenshots",
                  form.screenshots.filter((_, idx) => idx !== i),
                )
              }
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                background: "var(--color-danger)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={11} />
            </button>
          </div>
        ))}
        {form.screenshots.length < maxImages && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={
              form.screenshots.length === 0
                ? {
                    // full-width dropzone when empty, dashed, transparent
                    // fill so it's never a white block in either theme
                    width: "100%",
                    minHeight: 92,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    border: "1.5px dashed var(--color-border-strong)",
                    borderRadius: "var(--radius-md)",
                    background: "transparent",
                    color: "var(--color-text-secondary)",
                    font: "var(--text-body-md)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }
                : {
                    // compact add tile alongside existing thumbnails
                    width: 64,
                    height: 64,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    border: "1.5px dashed var(--color-border-strong)",
                    borderRadius: "var(--radius-md)",
                    background: "transparent",
                    color: "var(--color-text-secondary)",
                    font: "var(--text-caption)",
                    cursor: "pointer",
                  }
            }
          >
            <Upload size={form.screenshots.length === 0 ? 18 : 14} />
            {form.screenshots.length === 0 ? "Add screenshots" : "Add"}
            {form.screenshots.length === 0 && (
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", fontWeight: 400 }}>
                PNG / JPG · up to 10MB
              </span>
            )}
          </button>
        )}
      </div>
      <span
        style={{
          font: "var(--text-caption)",
          color: "var(--color-text-muted)",
        }}
      >
        {form.screenshots.length}/{maxImages} ·{" "}
        {fmt(totalBytes / 1024 / 1024, 1)}MB of 10MB
      </span>
    </div>
  );

  if (!mounted) return null;

  // ordered section ids for the current mode, used by the Customize sheet
  const custOrder = mergeSectionOrder(sectionOrder[mode], DEFAULT_SECTION_ORDER[mode]);

  return createPortal(
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay jx-modal-overlay--blur jx-modal-overlay--sheet"
          style={{ alignItems: "flex-end", justifyContent: "center", padding: 0 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) =>
            e.target === e.currentTarget && !saving && onClose?.()
          }
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
            {/* playful save overlay — interactive instead of a bare spinner */}
            <AnimatePresence>
              {saving && <TradeSaveLoader label={isEdit ? "Updating your trade" : "Logging your trade"} />}
            </AnimatePresence>
            {/* grab handle */}
            <div className="jx-lt-grab" aria-hidden="true" style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px" }}>
              <span style={{ width: 40, height: 4, borderRadius: 999, background: "var(--color-border-strong)" }} />
            </div>
            {/* ===== Header (fixed across modes) ===== */}
            <div
              className="jx-ltmodal__header"
              style={{
                flexDirection: "column",
                alignItems: "stretch",
                gap: "var(--space-4)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "var(--space-2)",
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <span style={{ font: "var(--text-h2)" }}>
                    {isEdit ? "Edit trade" : "Log a trade"}
                  </span>
                  <span
                    style={{
                      font: "var(--text-small)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {isQuick
                      ? "Fast, just the result (P&L)."
                      : "Full trade, entry, exit & size."}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                  {activeAccount && (
                    <button
                      className="jx-journal-pill"
                      onClick={() => setShowAcctSwitch(true)}
                      aria-label={`Logging to ${activeAccount.name}. Switch journal`}
                      title="Switch journal"
                      disabled={saving}
                    >
                      <ArrowRightLeft size={14} />
                      <span className="jx-journal-pill__name">
                        {activeAccount.name}
                      </span>
                      <ChevronDown size={13} style={{ opacity: 0.7, flexShrink: 0 }} />
                    </button>
                  )}
                  <button
                    className="jx-btn jx-btn--secondary jx-btn--sm"
                    onClick={onClose}
                    aria-label="Close"
                    style={{ padding: 8 }}
                    disabled={saving}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* full-width mode tabs */}
              <Seg
                items={[
                  {
                    value: "quick",
                    icon: Zap,
                    glow: true,
                    title: "Only P&L",
                    label: "Only P&L",
                  },
                  { value: "detailed", label: "Entry & Exit" },
                ]}
                value={mode}
                onChange={setMode}
              />

              {/* customize (opens a sheet to reorder sections) — free, no gate */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-2)",
                }}
              >
                <span
                  style={{
                    font: "var(--text-caption)",
                    color: "var(--color-text-muted)",
                    minWidth: 0,
                  }}
                >
                  Arrange the form to match how you log
                </span>
                <button
                  type="button"
                  className="jx-ltcustomize"
                  onClick={() => setCustomize(true)}
                  disabled={saving}
                >
                  <SlidersHorizontal size={14} /> Customize
                </button>
              </div>
            </div>

            {/* ===== Body, same frame, content cross-fades =====
                motion.div + layoutScroll so framer compensates the drag for
                this container's scroll (otherwise a reordered section "sticks"
                and drifts away from the pointer while auto-scrolling). */}
            <div className="jx-ltmodal__body" ref={bodyScrollRef}>
              <div className="jx-ltmodal__form">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, x: isQuick ? -14 : 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isQuick ? 14 : -14 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-6)",
                    }}
                  >
                    {(() => {
                    const N = {};
                    N.asset = (
                    <div className="jx-ltgroup">
                      <Sect icon={CandlestickChart} title="Asset & direction" />
                      <div className="jx-asset-row">
                        <div className="jx-asset-row__sym">
                          {symbolInputBlock}
                        </div>
                        {directionBlock}
                      </div>
                      {symbolRecentBlock}
                    </div>
                    );

                    {/* ===== Log on chart (detailed only) ===== */}
                    if (!isQuick) N.chart = (
                    <div className="jx-ltgroup">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "var(--space-2)",
                        }}
                      >
                        <div className="jx-sect__left">
                          <span className="jx-sect__icon">
                            <LineChart size={15} />
                          </span>
                          <span className="jx-sect__title">Log on chart</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-2)",
                          }}
                        >
                          <span
                            style={{
                              font: "var(--text-small)",
                              fontWeight: 600,
                              color: chartToggleDisabled
                                ? "var(--color-text-muted)"
                                : useChart
                                ? "var(--color-success-strong)"
                                : "var(--color-text-muted)",
                            }}
                          >
                            {chartToggleDisabled ? "Unavailable" : useChart ? "On" : "Off"}
                          </span>
                          <button
                            type="button"
                            className={`jx-switch ${useChart ? "jx-switch--on" : ""}`}
                            onClick={() => { if (!chartToggleDisabled) setUseChart((v) => !v); }}
                            disabled={chartToggleDisabled}
                            aria-pressed={useChart}
                            aria-disabled={chartToggleDisabled}
                            aria-label="Log on chart"
                            style={chartToggleDisabled ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
                          />
                        </div>
                      </div>
                      <span
                        style={{
                          font: "var(--text-caption)",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {chartToggleDisabled
                          ? `A live markable chart isn't available for ${form.symbol}, it's only for crypto pairs (e.g. BTCUSDT). Enter your prices manually below.`
                          : "Mark entry & exit on a live chart, prices fill in for you."}
                      </span>

                      <AnimatePresence initial={false}>
                        {useChart && (
                          <motion.div
                            key="chart-annotator"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.24, ease: "easeOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            {form.symbol ? (
                              <div style={{ paddingTop: "var(--space-3)" }}>
                                <ChartAnnotator
                                  symbol={form.symbol}
                                  direction={form.direction}
                                  initialEntry={form.entry}
                                  initialExit={form.exit}
                                  initialSize={form.size}
                                  initialSizeUnit={form.sizeUnit}
                                  sym={sym}
                                  quoteCode={curCode}
                                  onChange={onChartChange}
                                />
                              </div>
                            ) : (
                              <div
                                className="jx-banner jx-banner--warn"
                                style={{ marginTop: "var(--space-3)" }}
                              >
                                <AlertTriangle
                                  size={15}
                                  style={{ color: "var(--yellow-500)" }}
                                />
                                <span>Select a symbol above to load its chart.</span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    );

                    if (isQuick) {
                        /* ===== QUICK, symbol + direction (above) + P&L only ===== */
                        N.result = (
                        <div className="jx-ltgroup">
                          <Sect icon={Zap} title="Result" hint="Just the outcome" />
                          <Field label={`Net P&L in ${sym}`}>
                            <div className="jx-input">
                              <button
                                type="button"
                                onClick={flipPnlSign}
                                aria-label={pnlNeg ? "Loss — tap to mark as profit" : "Profit — tap to mark as loss"}
                                title="Toggle profit / loss"
                                className="jx-pnl-sign"
                                data-neg={pnlNeg ? "1" : "0"}
                              >
                                {pnlNeg ? "−" : "+"}
                              </button>
                              <span className="jx-input__icon" style={{ fontWeight: 700 }}>{sym}</span>
                              <input
                                type="number"
                                step="any"
                                placeholder="e.g. 1290"
                                value={form.netPnl}
                                onChange={(e) => set("netPnl", e.target.value)}
                              />
                              {quickOutcome && (
                                <span className={`jx-badge ${quickPnl >= 0 ? "jx-badge--success" : "jx-badge--danger"}`}>
                                  {quickOutcome}
                                </span>
                              )}
                            </div>
                            <div style={{ marginTop: "var(--space-2)" }}>
                              <QuickFillChips
                                value={form.netPnl}
                                onPick={(v) => set("netPnl", v)}
                                defaults={["100", "250", "500", "1000"]}
                                storageKey="jx-pnl-chips"
                                prefix={sym}
                                allowNegative
                              />
                            </div>
                          </Field>

                          {quickOutcome && (
                            <div
                              className={`jx-banner ${quickPnl >= 0 ? "jx-banner--success" : ""}`}
                              style={quickPnl < 0 ? { background: "var(--color-danger-subtle)" } : undefined}
                            >
                              {quickPnl >= 0 ? (
                                <TrendingUp size={16} style={{ color: "var(--color-success)" }} />
                              ) : (
                                <TrendingDown size={16} style={{ color: "var(--color-danger)" }} />
                              )}
                              <span>
                                <strong style={{ color: quickPnl >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}>
                                  {quickOutcome} · {fmtMoney(quickPnl, sym)}
                                </strong>{" "}
, detected from your P&L
                              </span>
                            </div>
                          )}
                        </div>
                        );

                        /* ===== Timing — date & time or just duration (defaults to today) ===== */
                        N.timing = (
                        <div className="jx-ltgroup">
                          <Sect icon={Clock} title="Timing" hint="Defaults to today" />
                          <TimingInput form={form} set={set} mode="quick" />
                        </div>
                        );

                        /* note, voice & screenshots — each its own movable section */
                        N.note = (
                        <div className="jx-ltgroup">
                          <Sect icon={Pencil} title="Note" hint="Optional" />
                          <Field label="Quick note (optional)">
                            <div className="jx-input">
                              <span className="jx-input__icon"><Pencil size={15} /></span>
                              <input
                                placeholder="e.g. Breakout retest, clean setup"
                                value={form.notes}
                                onChange={(e) => set("notes", e.target.value)}
                              />
                            </div>
                          </Field>
                        </div>
                        );

                        N.voice = (
                        <div className="jx-ltgroup">
                          <Sect icon={Mic} title="Voice note" hint="Talk it out · auto-transcribed" />
                          <VoiceNoteRecorder dashed onChange={setVoice} existingUrl={initialTrade?.voiceNote?.url || ""} />
                        </div>
                        );

                        N.screenshots = (
                        <div className="jx-ltgroup">
                          <Sect icon={ImageIcon} title="Screenshots" hint="Attach chart snaps · optional" />
                          {screenshotsBlock}
                        </div>
                        );
                    } else {
                        /* ===== DETAILED ===== */
                        N.entryexit = (
                        <div className="jx-ltgroup">
                          <Sect
                            icon={ArrowRightLeft}
                            title="Entry, exit & size"
                            hint="P&L auto-calculates"
                          />
                          <div className="jx-form-grid">
                            {/* When "Log on chart" is on, entry & exit are set
                                on the chart above, hide these to avoid a
                                duplicate pair. Show them for the normal flow. */}
                            {!useChart && (
                              <>
                                <Field label="Entry price">
                                  <div className="jx-input">
                                    <input
                                      type="number"
                                      step="any"
                                      placeholder={`${sym}61,240`}
                                      value={form.entry}
                                      onChange={(e) => set("entry", e.target.value)}
                                    />
                                  </div>
                                </Field>
                                <Field label="Exit price">
                                  <div className="jx-input">
                                    <input
                                      type="number"
                                      step="any"
                                      placeholder={`${sym}63,820`}
                                      value={form.exit}
                                      onChange={(e) => set("exit", e.target.value)}
                                    />
                                  </div>
                                </Field>
                              </>
                            )}
                            <Field label="Position size">
                              <div style={{ display: "flex", gap: "var(--space-2)", width: "100%", alignItems: "stretch" }}>
                                {/* size input, takes the remaining ~80% */}
                                <div className="jx-input" style={{ flex: 1, minWidth: 0 }}>
                                  <input
                                    type="number"
                                    step="any"
                                    placeholder={
                                      form.sizeUnit === "usd" ? `${sym}5,000` : "0.5"
                                    }
                                    value={form.size}
                                    onChange={(e) => set("size", e.target.value)}
                                  />
                                </div>
                                {/* unit toggle — segmented tab UI (matches Mins/Hours) */}
                                <div className="jx-seg jx-seg--inline" style={{ flexShrink: 0 }}>
                                  {[
                                    { v: "asset", l: form.symbol ? form.symbol.split("/")[0] : "Asset" },
                                    { v: "usd", l: curCode || "USD" },
                                  ].map((o) => (
                                    <button
                                      key={o.v}
                                      type="button"
                                      className={`jx-seg__btn ${form.sizeUnit === o.v ? "jx-seg__btn--active" : ""}`}
                                      onClick={() => set("sizeUnit", o.v)}
                                      style={{ whiteSpace: "nowrap" }}
                                    >
                                      {o.l}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div style={{ marginTop: "var(--space-2)" }}>
                                <QuickFillChips
                                  value={form.size}
                                  onPick={(v) => set("size", v)}
                                  defaults={
                                    form.sizeUnit === "usd"
                                      ? ["100", "500", "1000", "5000"]
                                      : ["0.25", "0.5", "1", "2", "5"]
                                  }
                                  storageKey={form.sizeUnit === "usd" ? `jx-size-cash-chips-${curCode}` : "jx-size-asset-chips"}
                                  prefix={form.sizeUnit === "usd" ? sym : ""}
                                />
                              </div>
                            </Field>
                            <Field label="Leverage">
                              <div className="jx-input">
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="1"
                                  value={form.leverage}
                                  onChange={(e) =>
                                    set("leverage", e.target.value)
                                  }
                                />
                                <span className="jx-input__addon">×</span>
                              </div>
                              <span
                                style={{
                                  font: "var(--text-caption)",
                                  color: "var(--color-text-muted)",
                                  marginTop: 4,
                                  display: "block",
                                }}
                              >
                                1 = spot (no leverage).
                              </span>
                            </Field>
                            <Field label="Fees">
                              <div
                                style={{
                                  display: "flex",
                                  gap: "var(--space-2)",
                                }}
                              >
                                <div className="jx-input" style={{ flex: 1 }}>
                                  <input
                                    type="number"
                                    step="any"
                                    placeholder={
                                      form.feeUnit === "percent"
                                        ? "0.1"
                                        : `${sym}12.40`
                                    }
                                    value={form.feeValue}
                                    onChange={(e) =>
                                      set("feeValue", e.target.value)
                                    }
                                  />
                                </div>
                                <div style={{ width: 90 }}>
                                  <Dropdown
                                    value={form.feeUnit}
                                    onChange={(v) => set("feeUnit", v)}
                                    options={[
                                      { value: "percent", label: "%" },
                                      { value: "currency", label: sym },
                                    ]}
                                  />
                                </div>
                              </div>
                            </Field>
                            {calc.notional != null && (
                              <Field label="Position value">
                                <div className="jx-input jx-input--disabled">
                                  <span
                                    style={{
                                      font: "var(--text-body)",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {sym}{fmt(calc.notional)}{" "}
                                    {form.feeUnit === "percent" &&
                                      calc.feeAmount > 0 && (
                                        <span
                                          style={{
                                            color: "var(--color-text-muted)",
                                            fontWeight: 400,
                                          }}
                                        >
                                          {" "}
                                          · fee {sym}{fmt(calc.feeAmount)}
                                        </span>
                                      )}
                                  </span>
                                </div>
                              </Field>
                            )}
                          </div>

                          {calc.pnl != null && (
                            <div
                              className={`jx-banner ${calc.pnl >= 0 ? "jx-banner--success" : ""}`}
                              style={
                                calc.pnl < 0
                                  ? { background: "var(--color-danger-subtle)" }
                                  : undefined
                              }
                            >
                              <Check
                                size={16}
                                style={{
                                  color:
                                    calc.pnl >= 0
                                      ? "var(--color-success)"
                                      : "var(--color-danger)",
                                }}
                              />
                              <span>
                                Net P&L{" "}
                                <strong
                                  style={{
                                    color:
                                      calc.pnl >= 0
                                        ? "var(--color-success-strong)"
                                        : "var(--color-danger-strong)",
                                  }}
                                >
                                  {fmtMoney(calc.pnl, sym)}
                                </strong>
                                {calc.retPct != null && (
                                  <>
                                    {" "}
                                    · {calc.retPct >= 0 ? "+" : ""}
                                    {fmt(calc.retPct, 1)}% return
                                  </>
                                )}
                                {calc.realizedR != null && (
                                  <>
                                    {" "}
                                    ·{" "}
                                    <strong
                                      style={{
                                        color:
                                          calc.realizedR >= 0
                                            ? "var(--color-success-strong)"
                                            : "var(--color-danger-strong)",
                                      }}
                                    >
                                      {fmt(calc.realizedR, 1)}R
                                    </strong>
                                  </>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                        );
                        N.risk = (
                        <div className="jx-ltgroup">
                          <Sect
                            icon={AlertTriangle}
                            title="Risk management"
                            hint="Powers your R-multiples"
                          />
                          <div className="jx-form-grid">
                            <Field label="Stop loss">
                              <div className="jx-input">
                                <span className="jx-input__icon">
                                  <AlertTriangle size={15} />
                                </span>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder={`${sym}60,100`}
                                  value={form.stopLoss}
                                  onChange={(e) =>
                                    set("stopLoss", e.target.value)
                                  }
                                />
                              </div>
                            </Field>
                            <Field label="Take profit">
                              <div className="jx-input">
                                <span className="jx-input__icon">
                                  <Target size={15} />
                                </span>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder={`${sym}66,540`}
                                  value={form.takeProfit}
                                  onChange={(e) =>
                                    set("takeProfit", e.target.value)
                                  }
                                />
                              </div>
                            </Field>
                          </div>

                          {calc.plannedRR != null && (
                            <div className="jx-banner jx-banner--warn">
                              <Target
                                size={16}
                                style={{ color: "var(--yellow-500)" }}
                              />
                              <span>
                                Planned R:R{" "}
                                <strong>1 : {fmt(calc.plannedRR, 1)}</strong>
                                {calc.expectedLoss > 0 && (
                                  <>
                                    {" "}
                                    · risking {sym}{fmt(calc.expectedLoss, 0)} to
                                    make {sym}{fmt(calc.expectedProfit, 0)}
                                  </>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                        );
                        N.timing = (
                        <div className="jx-ltgroup">
                          <Sect
                            icon={Clock}
                            title="Timing"
                            hint="Auto session tag"
                          />
                          <TimingInput form={form} set={set} mode="detailed" />
                          <div
                            style={{
                              display: "flex",
                              gap: "var(--space-2)",
                              flexWrap: "wrap",
                            }}
                          >
                            {session && (
                              <span
                                className="jx-chip"
                                style={{ cursor: "default" }}
                              >
                                <Clock size={13} /> Auto-detected: {session}
                              </span>
                            )}
                            <button
                              type="button"
                              className="jx-chip jx-chip--selected"
                              onClick={() => {
                                const now = nowLocal();
                                setForm((f) => ({
                                  ...f,
                                  entryTime: f.entryTime || now,
                                  exitTime: now,
                                }));
                              }}
                            >
                              <Zap size={13} /> Set to now
                            </button>
                          </div>
                        </div>
                        );
                        N.edge = (
                        <div className="jx-ltgroup jx-ltgroup--divided">
                          <Sect
                            icon={LineChart}
                            title="Your edge, context"
                            hint="Sharpens analytics"
                          />
                          <Field label="Strategy / setup">
                            <ChipsWithCustom
                              options={[
                                ...DEFAULT_STRATEGIES,
                                ...customStrategies,
                              ]}
                              value={form.strategy}
                              onSelect={(v) => set("strategy", v)}
                              onAddCustom={addCustomStrategy}
                              placeholder="e.g. ORB 15m"
                            />
                          </Field>
                          <Field label="Market condition">
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "var(--space-2)",
                              }}
                            >
                              {["Trending", "Ranging", "Volatile"].map((m) => (
                                <Chip
                                  key={m}
                                  selected={form.market === m}
                                  onClick={() =>
                                    set("market", form.market === m ? null : m)
                                  }
                                >
                                  {m}
                                </Chip>
                              ))}
                            </div>
                          </Field>
                          <Field label="Timeframe">
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "var(--space-2)",
                                alignItems: "center",
                              }}
                            >
                              {TIMEFRAMES.map((tf) => (
                                <Chip
                                  key={tf}
                                  selected={form.timeframe === tf}
                                  onClick={() =>
                                    set(
                                      "timeframe",
                                      form.timeframe === tf ? null : tf,
                                    )
                                  }
                                >
                                  {tf}
                                </Chip>
                              ))}
                              <Chip
                                selected={form.timeframe === "custom"}
                                onClick={() =>
                                  set(
                                    "timeframe",
                                    form.timeframe === "custom"
                                      ? null
                                      : "custom",
                                  )
                                }
                              >
                                Custom
                              </Chip>
                              {form.timeframe === "custom" && (
                                <span
                                  className="jx-input"
                                  style={{ height: 34, width: 110 }}
                                >
                                  <input
                                    type="number"
                                    placeholder="mins"
                                    value={form.tfCustom}
                                    onChange={(e) =>
                                      set("tfCustom", e.target.value)
                                    }
                                  />
                                  <span className="jx-input__addon">m</span>
                                </span>
                              )}
                            </div>
                          </Field>
                        </div>
                        );
                        N.psychology = (
                        <div className="jx-ltgroup jx-ltgroup--divided">
                          <Sect
                            icon={Flame}
                            title="Psychology & discipline"
                            hint="Find behavioral leaks"
                          />
                          <Stars
                            value={form.confidence}
                            onChange={(v) => set("confidence", v)}
                          />
                          <Field label="Emotion at entry">
                            <ChipsWithCustom
                              options={[...DEFAULT_EMOTIONS, ...customEmotions]}
                              value={form.emotion}
                              onSelect={(v) => set("emotion", v)}
                              onAddCustom={addCustomEmotion}
                              placeholder="e.g. Anxious"
                            />
                          </Field>
                          {/* "Followed your plan?" now lives in the fixed footer
                              so it's always visible without scrolling. */}
                          <Field label="Mistakes (be honest)">
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "var(--space-2)",
                              }}
                            >
                              {MISTAKES.map((m) => {
                                const sel = form.mistakes.includes(m);
                                return (
                                  <Chip
                                    key={m}
                                    selected={sel}
                                    onClick={() => {
                                      if (m === "None")
                                        return set(
                                          "mistakes",
                                          sel ? [] : ["None"],
                                        );
                                      const base = form.mistakes.filter(
                                        (x) => x !== "None",
                                      );
                                      set(
                                        "mistakes",
                                        sel
                                          ? base.filter((x) => x !== m)
                                          : [...base, m],
                                      );
                                    }}
                                  >
                                    {m}
                                  </Chip>
                                );
                              })}
                            </div>
                          </Field>
                        </div>
                        );
                        N.screenshots = (
                        <div className="jx-ltgroup">
                          <Sect icon={ImageIcon} title="Screenshots" />
                          {screenshotsBlock}
                        </div>
                        );
                        N.notes = (
                        <div className="jx-ltgroup">
                          <Sect
                            icon={Pencil}
                            title="Notes"
                            hint="Your thesis & lessons"
                          />
                          <textarea
                            className="jx-textarea"
                            placeholder="What was your thesis? What did you see on the chart, and what would you repeat or avoid next time?"
                            value={form.notes}
                            onChange={(e) => set("notes", e.target.value)}
                          />
                          {/* voice note, transcript auto-appends to notes */}
                          <div style={{ marginTop: "var(--space-3)" }}>
                            <VoiceNoteRecorder
                              dashed
                              onChange={setVoice}
                              existingUrl={initialTrade?.voiceNote?.url || ""}
                            />
                          </div>
                        </div>
                        );
                    }

                    // resolve the render order for this mode, tolerating a
                    // stale saved order (missing/extra ids handled gracefully)
                    const base =
                      Array.isArray(sectionOrder[mode]) && sectionOrder[mode].length
                        ? sectionOrder[mode]
                        : DEFAULT_SECTION_ORDER[mode];
                    const order = base.filter((id) => N[id]);
                    Object.keys(N).forEach((id) => {
                      if (!order.includes(id)) order.push(id);
                    });

                    // sections render in the saved order; reordering itself
                    // happens in the dedicated Customize sheet (below)
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                        {order.map((id) => (
                          <div key={id}>{N[id]}</div>
                        ))}
                      </div>
                    );
                    })()}

                    {/* ===== Import from JSON, detailed (Entry & Exit) only,
                        under an "or" divider. ===== */}
                    {!isQuick && (
                    <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "var(--space-2) 0" }}>
                      <span style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
                      <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>or import from a trade JSON</span>
                      <span style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
                    </div>
                    <div className="jx-ltgroup">
                      <Sect
                        icon={Braces}
                        title="Import from JSON"
                        hint="Paste a trade as JSON and we'll fill the fields for you"
                      />
                      {!jsonOpen ? (
                        <button
                          type="button"
                          onClick={() => { setJsonErr(""); setJsonOpen(true); }}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            width: "100%", padding: "14px", borderRadius: "var(--radius-md)",
                            border: "1.5px dashed var(--color-border-strong)", background: "transparent",
                            color: "var(--color-text-secondary)", font: "var(--text-body-md)", fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <Braces size={16} /> Paste trade JSON
                        </button>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                          <textarea
                            className="jx-textarea"
                            value={jsonText}
                            onChange={(e) => { setJsonText(e.target.value); if (jsonErr) setJsonErr(""); }}
                            placeholder={`Paste JSON here, e.g.\n${TRADE_JSON_SAMPLE}`}
                            spellCheck={false}
                            rows={9}
                            style={{
                              width: "100%", resize: "vertical",
                              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                              fontSize: "12.5px", lineHeight: 1.55,
                              ...(jsonErr ? { borderColor: "var(--color-danger)" } : {}),
                            }}
                          />
                          {jsonErr && (
                            <span style={{ font: "var(--text-caption)", color: "var(--color-danger)" }}>{jsonErr}</span>
                          )}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
                            <button
                              type="button"
                              onClick={prefillFromJson}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                padding: "10px 16px", borderRadius: "var(--radius-md)", border: "none",
                                background: "var(--color-primary)", color: "var(--color-on-primary, #111)",
                                font: "var(--text-body-md)", fontWeight: 700, cursor: "pointer",
                              }}
                            >
                              <Check size={15} /> Prefill fields
                            </button>
                            <button
                              type="button"
                              onClick={() => { setJsonOpen(false); setJsonText(""); setJsonErr(""); }}
                              style={{
                                padding: "10px 14px", borderRadius: "var(--radius-md)",
                                border: "1px solid var(--color-border)", background: "transparent",
                                color: "var(--color-text-secondary)", font: "var(--text-body-md)", fontWeight: 600, cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                try { navigator.clipboard.writeText(TRADE_JSON_SAMPLE); flash("success", "Sample JSON copied"); }
                                catch { /* ignore */ }
                              }}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto",
                                padding: "10px 12px", borderRadius: "var(--radius-md)",
                                border: "1px solid var(--color-border)", background: "transparent",
                                color: "var(--color-text-muted)", font: "var(--text-caption)", fontWeight: 600, cursor: "pointer",
                              }}
                            >
                              <Copy size={13} /> Copy sample
                            </button>
                          </div>
                          <a
                            href={CHATGPT_JSON_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start",
                              font: "var(--text-caption)", fontWeight: 600, color: "var(--yellow-600)",
                              textDecoration: "underline", textUnderlineOffset: 3, outline: "none",
                              background: "transparent", border: "none", padding: 0,
                            }}
                          >
                            <ExternalLink size={13} /> Don&apos;t have JSON? Generate it with ChatGPT from your screenshot
                          </a>
                          <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                            Opens ChatGPT with the instructions ready. Either attach your trade screenshot, or just type it, e.g.{" "}
                            <code style={{ font: "var(--text-caption)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "var(--color-text-secondary)" }}>
                              BTCUSDT 10am IST, 2h, long, 0.5 size, entry 61000 exit 62250
                            </code>
                            . Copy the JSON it returns, paste it above, then review before saving.
                          </span>
                        </div>
                      )}
                    </div>
                    </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

            </div>

            {/* ===== Footer ===== */}
            <div
              className="jx-ltmodal__footer"
              style={{ flexDirection: "column", alignItems: "stretch" }}
            >
              {/* discipline toggle, always visible in the fixed action bar */}
              <button
                type="button"
                onClick={() => set("followedPlan", !form.followedPlan)}
                aria-pressed={form.followedPlan}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)",
                  width: "100%", padding: "10px 14px", marginBottom: "var(--space-2)",
                  borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "left",
                  background: "var(--color-bg-muted)", border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              >
                <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                  <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>Followed your plan?</span>
                  <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>Discipline is the #1 predictor of edge</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ font: "var(--text-caption)", fontWeight: 700, color: form.followedPlan ? "var(--color-success-strong)" : "var(--color-text-muted)" }}>
                    {form.followedPlan ? "Yes" : "No"}
                  </span>
                  <span className={`jx-switch ${form.followedPlan ? "jx-switch--on" : ""}`} />
                </span>
              </button>
              {/* live trader-count strip pinned right above the action buttons */}
              <TradersTodayBadge variant="strip" className="jx-foot-badge" />
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-3)",
                  width: "100%",
                }}
              >
                {!isEdit && (
                  <button
                    className="jx-btn jx-btn--ghost"
                    onClick={() => save(true)}
                    disabled={saving}
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    Save &amp; add another
                  </button>
                )}
                <button
                  className="jx-btn jx-btn--primary"
                  onClick={() => save(false)}
                  disabled={saving}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  {saving ? (
                    <>
                      <Spinner /> Saving…
                    </>
                  ) : (
                    <>
                      <Check size={16} />{" "}
                      {isEdit ? "Update trade" : "Log trade"}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ===== In-modal account switch sheet ===== */}
            <AnimatePresence>
              {showAcctSwitch && (
                <motion.div
                  className="jx-acct-switch"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onMouseDown={(e) =>
                    e.target === e.currentTarget && setShowAcctSwitch(false)
                  }
                >
                  <motion.div
                    className="jx-acct-switch__panel"
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 24, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 32 }}
                  >
                    <div className="jx-acct-switch__head">
                      <span style={{ font: "var(--text-h3)" }}>
                        Switch journal
                      </span>
                      <button
                        className="jx-btn jx-btn--secondary jx-btn--sm"
                        onClick={() => setShowAcctSwitch(false)}
                        aria-label="Close"
                        style={{ padding: 8 }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <span
                      style={{
                        font: "var(--text-small)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      Pick which journal this trade logs into.
                    </span>
                    <div className="jx-acct-switch__list">
                      {accounts.map((acc) => {
                        const on = acc._id === activeAccountId;
                        return (
                          <button
                            key={acc._id}
                            type="button"
                            className={`jx-acct-row ${on ? "jx-acct-row--on" : ""}`}
                            onClick={() => chooseAccount(acc)}
                          >
                            <span className="jx-acct-row__icon">
                              <Wallet size={16} />
                            </span>
                            <span className="jx-acct-row__main">
                              <span className="jx-acct-row__name">
                                {acc.name}
                              </span>
                              <span className="jx-acct-row__cur">
                                {(acc.currency || "").toUpperCase()}
                              </span>
                            </span>
                            <span className="jx-acct-row__bal">
                              {acctSym(acc)}
                              {acctBalance(acc).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                            {on && (
                              <Check
                                size={16}
                                style={{
                                  color: "var(--color-primary)",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="jx-acct-switch__add"
                      onClick={() => {
                        setShowAcctSwitch(false);
                        onNoJournal
                          ? onNoJournal()
                          : (window.location.href = "/create-account");
                      }}
                    >
                      <Plus size={15} /> Create new journal
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Customize sections — dedicated bottom sheet with a short draggable list
        (avoids the scroll-during-drag problems of in-form reordering) */}
    <AnimatePresence>
      {customize && (
        <motion.div
          className="jx-modal-overlay jx-modal-overlay--blur jx-modal-overlay--sheet"
          style={{ zIndex: 5200, alignItems: "flex-end", justifyContent: "center", padding: 0 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && setCustomize(false)}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="jx-ltmodal jx-ltmodal--sheet"
            style={{ position: "relative", height: "auto", maxHeight: "82vh", borderRadius: "22px 22px 0 0" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div aria-hidden="true" style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px", flexShrink: 0 }}>
              <span style={{ width: 40, height: 4, borderRadius: 999, background: "var(--color-border-strong)" }} />
            </div>
            <div className="jx-ltmodal__header" style={{ alignItems: "center", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>Customize sections</span>
                <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                  Drag to reorder your {isQuick ? "quick" : "detailed"} log
                </span>
              </div>
              <button
                type="button"
                className="jx-btn jx-btn--ghost jx-btn--sm"
                onClick={() => {
                  const next = { ...sectionOrder, [mode]: [...DEFAULT_SECTION_ORDER[mode]] };
                  setSectionOrder(next);
                  persistSectionOrder(next);
                }}
              >
                Reset
              </button>
              <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={() => setCustomize(false)} aria-label="Close" style={{ padding: 8 }}>
                <X size={16} />
              </button>
            </div>
            <div className="jx-ltmodal__body" style={{ padding: "var(--space-2) var(--space-4) var(--space-4)" }}>
              <Reorder.Group
                axis="y"
                values={custOrder}
                onReorder={handleReorder}
                as="div"
                style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", listStyleType: "none", margin: 0, padding: 0 }}
              >
                {custOrder.map((id) => {
                  const meta = SECTION_META[id] || { label: id, icon: SlidersHorizontal };
                  const Icon = meta.icon;
                  return (
                    <Reorder.Item
                      key={id}
                      value={id}
                      as="div"
                      onDragStart={() => { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8); }}
                      onDragEnd={flushOrder}
                      whileDrag={{ scale: 1.02, boxShadow: "var(--shadow-lg)", zIndex: 3 }}
                      style={{
                        display: "flex", alignItems: "center", gap: "var(--space-3)",
                        padding: "11px 12px", borderRadius: "var(--radius-md)",
                        background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)",
                        listStyleType: "none", cursor: "grab", touchAction: "none",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "var(--radius-sm)", background: "var(--color-primary-subtle)", color: "var(--yellow-500)", flexShrink: 0 }}>
                        <Icon size={15} />
                      </span>
                      <span style={{ flex: 1, font: "var(--text-body-md)", fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.label}</span>
                      <GripVertical size={18} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </div>
            <div className="jx-ltmodal__footer">
              <button className="jx-btn jx-btn--primary" onClick={() => setCustomize(false)} style={{ flex: 1, justifyContent: "center" }}>
                <Check size={16} /> Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* plan-limit upgrade prompt (shared component) */}
    <UpgradeSheet
      open={showUpgrade}
      onClose={() => setShowUpgrade(false)}
      title="You're on a roll 📈"
      reason={upgradeReason}
    />

    {/* screenshot preview lightbox */}
    <AnimatePresence>
      {previewImg && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setPreviewImg(null)}
          style={{ position: "fixed", inset: 0, zIndex: 4200, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-4)" }}
        >
          <button
            type="button"
            aria-label="Close preview"
            onClick={() => setPreviewImg(null)}
            className="jx-btn jx-btn--secondary jx-btn--sm"
            style={{ position: "absolute", top: "calc(env(safe-area-inset-top) + 12px)", right: 12, padding: 8 }}
          >
            <X size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
            src={previewImg}
            alt="Screenshot preview"
            initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "100%", maxHeight: "88dvh", objectFit: "contain", borderRadius: "var(--radius-md)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
    </>,
    document.body,
  );
}
