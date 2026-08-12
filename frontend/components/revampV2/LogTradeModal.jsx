"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  Image as ImageIcon,
  Lightbulb,
  LineChart,
  Mic,
  MoreVertical,
  Pencil,
  Plus,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
  Zap,
} from "lucide-react";

import Dropdown from "./Dropdown";
import DateTimePicker from "./DateTimePicker";
import ChartAnnotator from "./ChartAnnotator";
import QuickFillChips from "./QuickFillChips";
import TradersTodayBadge from "./TradersTodayBadge";
import VoiceNoteRecorder from "./VoiceNoteRecorder";
import Toast from "./Toast";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import { hasLiveCandles } from "@/utils/livePrice";
import { canAddTrade, canChartLog, getPlanRules } from "@/utils/planRestrictions";
import { logTradeToSheet, tradeToSheetPayload } from "@/utils/tradeSheetLog";
import { scheduleAutoBackup } from "@/utils/driveBackup";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

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

/* Timing input: either full date/time pickers, or a simple "just duration"
   (mins/hours) on an optional date. mode = "quick" | "detailed". */
function TimingInput({ form, set, mode }) {
  const dur = form.useDuration;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", gap: 6, alignSelf: "flex-start" }}>
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
                padding: "9px 14px",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                border: `1px solid ${on ? "var(--color-primary)" : "var(--color-border-strong)"}`,
                background: on ? "var(--color-primary)" : "var(--color-bg-surface)",
                color: on ? "var(--color-primary-foreground)" : "var(--color-text-secondary)",
                font: "var(--text-body-md)",
                fontWeight: on ? 700 : 600,
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
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
            <div style={{ display: "flex", gap: 8 }}>
              <div className="jx-input" style={{ flex: 1 }}>
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
              <div className="jx-seg jx-seg--inline">
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
          </Field>
        </div>
      ) : mode === "quick" ? (
        <DateTimePicker
          value={form.exitTime}
          onChange={(v) => set("exitTime", v)}
        />
      ) : (
        <div className="jx-form-grid">
          <Field label="Entry date & time">
            <DateTimePicker
              value={form.entryTime}
              onChange={(v) => set("entryTime", v)}
            />
          </Field>
          <Field label="Exit date & time">
            <DateTimePicker
              value={form.exitTime}
              onChange={(v) => set("exitTime", v)}
            />
          </Field>
        </div>
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

const CHATGPT_JSON_PROMPT = `You are a trade-log parser for a trading journal. I will give you my trade in ONE of two ways: (A) I attach a screenshot of the trade from my broker/exchange, or (B) I type it out in plain words. Read whichever I give you and reply with ONLY one JSON object — no explanation, no markdown, no code fences — matching exactly these keys:

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

HOW I MIGHT GIVE IT TO YOU — EXAMPLES:

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
   LogTradeModal — wired to POST /api/trades/addd.
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
}) {
  const isEdit = !!initialTrade?._id;
  // Currency the user is logging in — prefer the prop from the dashboard,
  // else fall back to the active journal's base currency from localStorage.
  const sym = useMemo(() => {
    if (currencySymbol) return currencySymbol;
    try {
      return getCurrencySymbol((localStorage.getItem("jx-base-currency") || "USD").toLowerCase());
    } catch {
      return "$";
    }
  }, [currencySymbol]);
  // ISO code of the journal currency (e.g. INR) — used to label the cash
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
  const fileRef = useRef(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
      setJsonErr("That doesn't look like valid JSON — copy the whole { … } block.");
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
    flash("success", `Prefilled ${filled} field${filled > 1 ? "s" : ""} from JSON — review and save.`);
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
     — that's crypto pairs on Binance. Stocks/futures/forex only have a
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
      setForm(tradeToForm(initialTrade));
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

  /* ---------- images ---------- */
  const totalBytes = form.screenshots.reduce(
    (s, i) => s + (i.file?.size || 0),
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
            ? "Free plan allows 1 screenshot per trade — upgrade for up to 4"
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
      currentAccountId ||
      Cookies.get("accountId") ||
      (typeof window !== "undefined" && localStorage.getItem("jx-account-id"));
    if (!accountId) {
      // genuinely no journal — send them to pick/create one
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

    /* plan limit: trades per month */
    try {
      const userData = await getFromIndexedDB("user-data");
      const status = mode === "quick" ? "running" : "closed";
      const allowed = await canAddTrade(userData, status);
      if (!allowed) {
        const limit = getPlanRules(userData).limits.tradeLimitPerMonth;
        flash(
          "danger",
          `You've hit your plan's limit of ${limit} trades this month. Upgrade for unlimited logging.`,
        );
        return;
      }
    } catch {}

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
    // those candle times as the trade's open/close — unless they explicitly
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
    form.screenshots.forEach(
      (img) => img.file && fd.append("images", img.file),
    );
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
            `Chart not attached — you've used all ${lim} chart logs this month. Upgrade to Pro for unlimited.`,
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
      flash(
        "danger",
        err.response?.data?.message || "Could not save trade — try again",
      );
    } finally {
      setSaving(false);
    }
  };

  const isQuick = mode === "quick";

  /* ---------- shared blocks ---------- */
  const symbolBlock = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      {/* plain symbol input (matches the quick modal) — type it, or tap a
          recent one from the single scrollable row below */}
      <div className="jx-input">
        <input
          placeholder="Symbol (e.g. BTC)"
          value={form.symbol}
          onChange={(e) => set("symbol", e.target.value.toUpperCase())}
        />
      </div>
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
    </div>
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
              style={{
                width: 64,
                height: 64,
                objectFit: "cover",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)",
              }}
            />
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
                    // full-width dropzone when empty — dashed, transparent
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay jx-modal-overlay--blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) =>
            e.target === e.currentTarget && !saving && onClose?.()
          }
        >
          <Toast toast={toast} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="jx-ltmodal"
            style={{ width: "min(960px, 96vw)" }}
          >
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
                      ? "Fast — just the result (P&L)."
                      : "Full trade — entry, exit & size."}
                  </span>
                </div>
                <button
                  className="jx-btn jx-btn--secondary jx-btn--sm"
                  onClick={onClose}
                  aria-label="Close"
                  style={{ padding: 8, flexShrink: 0 }}
                  disabled={saving}
                >
                  <X size={16} />
                </button>
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
            </div>

            {/* ===== Body — same frame, content cross-fades ===== */}
            <div className="jx-ltmodal__body" style={{ minHeight: 480 }}>
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
                    {/* Import from JSON — paste a JSON object (optionally
                        generated by ChatGPT from a screenshot) to prefill */}
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
                            Opens ChatGPT with the instructions ready. Either attach your trade screenshot, or just type it — e.g.{" "}
                            <code style={{ font: "var(--text-caption)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "var(--color-text-secondary)" }}>
                              BTCUSDT 10am IST, 2h, long, 0.5 size, entry 61000 exit 62250
                            </code>
                            . Copy the JSON it returns, paste it above, then review before saving.
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="jx-ltgroup">
                      <Sect icon={CandlestickChart} title="Asset & direction" />
                      {symbolBlock}
                      {directionBlock}
                    </div>

                    {/* ===== Log on chart (both modes) ===== */}
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
                          ? `A live markable chart isn't available for ${form.symbol} — it's only for crypto pairs (e.g. BTCUSDT). Enter your prices manually below.`
                          : "Mark entry & exit on a live chart — prices fill in for you."}
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

                    {isQuick ? (
                      <>
                        {/* ===== QUICK — symbol + direction (above) + P&L only ===== */}
                        <div className="jx-ltgroup">
                          <Sect icon={Zap} title="Result" hint="Just the outcome" />
                          <Field label={`Net P&L in ${sym} (use − for a loss)`}>
                            <div className="jx-input">
                              <span className="jx-input__icon" style={{ fontWeight: 700 }}>{sym}</span>
                              <input
                                type="number"
                                step="any"
                                placeholder="e.g. 1290 or -340"
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
                                — detected from your P&L
                              </span>
                            </div>
                          )}
                        </div>

                        {/* voice note — available directly in Only P&L too */}
                        <div className="jx-ltgroup">
                          <Sect icon={Mic} title="Voice note" hint="Talk it out · auto-transcribed to notes" />
                          <VoiceNoteRecorder
                            dashed
                            onChange={setVoice}
                            existingUrl={initialTrade?.voiceNote?.url || ""}
                          />
                        </div>

                        {/* Accordion: optional extra details slide out */}
                        <button
                          type="button"
                          className="jx-ltmore"
                          onClick={() => setShowMore((v) => !v)}
                          aria-expanded={showMore}
                        >
                          <span>{showMore ? "Hide extra details" : "Add more details (date, screenshot, note)"}</span>
                          <ChevronDown
                            size={18}
                            style={{ transition: "transform .2s ease", transform: showMore ? "rotate(180deg)" : "none" }}
                          />
                        </button>

                        <AnimatePresence initial={false}>
                          {showMore && (
                            <motion.div
                              key="quick-more"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: "easeOut" }}
                              style={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
                            >
                              <div className="jx-ltgroup">
                                <Sect icon={Clock} title="When" hint="Date / time — optional" />
                                <TimingInput form={form} set={set} mode="quick" />
                              </div>

                              <div className="jx-ltgroup">
                                <Sect icon={ImageIcon} title="Screenshot & note" />
                                <Field label="Screenshots · optional">
                                  {screenshotsBlock}
                                </Field>
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
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      <>
                        {/* ===== DETAILED ===== */}
                        <div className="jx-ltgroup">
                          <Sect
                            icon={ArrowRightLeft}
                            title="Entry, exit & size"
                            hint="P&L auto-calculates"
                          />
                          <div className="jx-form-grid">
                            {/* When "Log on chart" is on, entry & exit are set
                                on the chart above — hide these to avoid a
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
                                {/* size input — takes the remaining ~80% */}
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
                                {/* unit toggle — both options visible; the unselected
                                    one keeps a visible surface bg (not transparent) */}
                                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                  {[
                                    { v: "asset", l: form.symbol ? form.symbol.split("/")[0] : "Asset" },
                                    { v: "usd", l: curCode || "USD" },
                                  ].map((o) => {
                                    const on = form.sizeUnit === o.v;
                                    return (
                                      <button
                                        key={o.v}
                                        type="button"
                                        onClick={() => set("sizeUnit", o.v)}
                                        style={{
                                          height: 44,
                                          padding: "0 16px",
                                          borderRadius: "var(--radius-md)",
                                          cursor: "pointer",
                                          border: `1px solid ${on ? "var(--color-primary)" : "var(--color-border-strong)"}`,
                                          background: on ? "var(--color-primary)" : "var(--color-bg-surface)",
                                          color: on ? "var(--color-primary-foreground)" : "var(--color-text-secondary)",
                                          font: "var(--text-body-md)",
                                          fontWeight: on ? 700 : 600,
                                          whiteSpace: "nowrap",
                                          transition: "all 0.15s ease",
                                        }}
                                      >
                                        {o.l}
                                      </button>
                                    );
                                  })}
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
                        <div className="jx-ltgroup jx-ltgroup--divided">
                          <Sect
                            icon={LineChart}
                            title="Your edge — context"
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
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: "var(--space-2)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <span
                                style={{
                                  font: "var(--text-body-md)",
                                  fontWeight: 600,
                                }}
                              >
                                Did you follow your plan?
                              </span>
                              <span
                                style={{
                                  font: "var(--text-caption)",
                                  color: "var(--color-text-muted)",
                                }}
                              >
                                Discipline is the #1 predictor of long-term edge
                              </span>
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
                                  color: form.followedPlan
                                    ? "var(--color-success-strong)"
                                    : "var(--color-text-muted)",
                                }}
                              >
                                {form.followedPlan ? "Yes" : "No"}
                              </span>
                              <button
                                type="button"
                                className={`jx-switch ${form.followedPlan ? "jx-switch--on" : ""}`}
                                onClick={() =>
                                  set("followedPlan", !form.followedPlan)
                                }
                                aria-pressed={form.followedPlan}
                              />
                            </div>
                          </div>
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
                        <div className="jx-ltgroup">
                          <Sect icon={ImageIcon} title="Screenshots" />
                          {screenshotsBlock}
                        </div>
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
                          {/* voice note — transcript auto-appends to notes */}
                          <div style={{ marginTop: "var(--space-3)" }}>
                            <VoiceNoteRecorder
                              dashed
                              onChange={setVoice}
                              existingUrl={initialTrade?.voiceNote?.url || ""}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* ===== Right rail (both modes — keeps size identical) ===== */}
              <div className="jx-ltmodal__rail">
                <span
                  style={{
                    font: "var(--text-label)",
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Live preview
                </span>
                <div
                  className="jx-card jx-card--flat"
                  style={{
                    padding: "var(--space-4)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-2)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                    }}
                  >
                    <span style={{ font: "var(--text-title)" }}>
                      {form.symbol || "—"}
                    </span>
                    <span
                      className={`jx-badge ${form.direction === "long" ? "jx-badge--success" : "jx-badge--danger"}`}
                    >
                      {form.direction === "long" ? "Long" : "Short"}
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        color: "var(--color-text-muted)",
                        display: "flex",
                      }}
                    >
                      <MoreVertical size={15} />
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, auto)",
                      gap: "var(--space-2)",
                      font: "var(--text-caption)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <span>Entry</span>
                    <span>Exit</span>
                    <span>Size</span>
                    <span>R : R</span>
                    <span
                      style={{
                        color: "var(--color-text-primary)",
                        fontWeight: 500,
                      }}
                    >
                      {form.entry ? `${sym}${fmt(form.entry)}` : "—"}
                    </span>
                    <span
                      style={{
                        color: "var(--color-text-primary)",
                        fontWeight: 500,
                      }}
                    >
                      {form.exit ? `${sym}${fmt(form.exit)}` : "—"}
                    </span>
                    <span
                      style={{
                        color: "var(--color-text-primary)",
                        fontWeight: 500,
                      }}
                    >
                      {form.size
                        ? form.sizeUnit === "usd"
                          ? `${sym}${fmt(form.size)}`
                          : fmt(form.size)
                        : "—"}
                    </span>
                    <span
                      style={{
                        color: "var(--color-text-primary)",
                        fontWeight: 500,
                      }}
                    >
                      {calc.plannedRR ? `1 : ${fmt(calc.plannedRR, 1)}` : "—"}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        font: "var(--text-title)",
                        color:
                          (isQuick ? quickPnl : calc.pnl) == null
                            ? "var(--color-text-muted)"
                            : (isQuick ? quickPnl : calc.pnl) >= 0
                              ? "var(--color-success-strong)"
                              : "var(--color-danger-strong)",
                      }}
                    >
                      {(isQuick ? quickPnl : calc.pnl) == null
                        ? "P&L —"
                        : fmtMoney(isQuick ? quickPnl : calc.pnl, sym)}
                    </span>
                    {form.screenshots.length > 0 && (
                      <span className="jx-badge jx-badge--neutral">
                        <ImageIcon size={11} /> {form.screenshots.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* social proof — why traders trust JournalX. On mobile this
                    full card is hidden; a compact strip is pinned in the footer
                    instead (so it's visible without scrolling the rail). */}
                <TradersTodayBadge className="jx-rail-badge" />

                <div
                  className="jx-banner jx-banner--warn"
                  style={{ alignItems: "flex-start" }}
                >
                  <Lightbulb
                    size={15}
                    style={{
                      color: "var(--yellow-500)",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                  <span style={{ font: "var(--text-caption)" }}>
                    Traders who log their emotions cut tilt-driven losses by
                    ~30%.
                  </span>
                </div>
              </div>
            </div>

            {/* ===== Footer ===== */}
            <div
              className="jx-ltmodal__footer"
              style={{ flexDirection: "column", alignItems: "stretch" }}
            >
              {/* mobile-only: pin the trust strip right above the action buttons */}
              <TradersTodayBadge variant="strip" className="jx-foot-badge" />
              <span
                style={{
                  font: "var(--text-small)",
                  color: "var(--color-text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Zap size={14} style={{ color: "var(--yellow-500)" }} />
                {isQuick ? <>Quick log</> : <>Detailed log</>}
              </span>
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
