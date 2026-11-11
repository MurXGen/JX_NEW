"use client";

/* FirstRunFlow: the only onboarding a new user sees after signing up.
   1. Set up your journal  (live preview of the journal card)
   2. Log your first trade (symbol + net P&L inline, live trade preview)
   3. Your first analytics (real numbers from the trade they just logged)
   Then it gets out of the way so they use the product. */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ArrowRight, Check, ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import confetti from "canvas-confetti";
import { createAccount, updateAccount } from "@/api/auth";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import { quickLogTrade } from "./quickLogTrade";
import f from "./FirstRun.module.css";

const STEPS = [
  { id: "journal", label: "Set up journal" },
  { id: "trade", label: "Log a trade" },
  { id: "insights", label: "See your analytics" },
];

const TYPES = [
  { id: "personal", label: "Personal account", name: "Personal account", tag: "Personal" },
  { id: "funded", label: "Funded account", name: "Funded account", tag: "Funded" },
  { id: "paper", label: "Paper / demo", name: "Paper trading", tag: "Paper" },
];

const CURRENCIES = ["USD", "INR", "EUR", "GBP", "JPY", "USDT"];
const POPULAR = ["NQ", "ES", "BTCUSDT", "EURUSD", "AAPL", "NIFTY"];

const money = (v, sym, signed = false) => {
  const n = Number(v) || 0;
  const abs = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!signed) return `${n < 0 ? "−" : ""}${sym}${abs}`;
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${sym}${abs}`;
};
const tone = (n) => (n > 0 ? f.up : n < 0 ? f.down : "");

/* ---------------- stepper ---------------- */
function Stepper({ step }) {
  const idx = STEPS.findIndex((s) => s.id === step);
  return (
    <ol className={f.steps} aria-label="Setup progress">
      {STEPS.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "current" : "todo";
        return (
          <li key={s.id} className={f.step} data-state={state} aria-current={state === "current" ? "step" : undefined}>
            <span className={f.dot} aria-hidden="true">{state === "done" ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
            <span className={f.stepLabel}>{s.label}</span>
            <span className={f.srOnly}>{state === "done" ? "(completed)" : state === "current" ? "(current step)" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* shared journal header used by every preview */
function JournalHead({ name, tag, meta }) {
  return (
    <div className={f.jHead}>
      <div style={{ minWidth: 0 }}>
        <div className={f.jName}>{name}</div>
        <div className={f.jMeta}>{meta}</div>
      </div>
      {tag && <span className={f.tag}>{tag}</span>}
    </div>
  );
}

/* ---------------- step 1: journal preview ---------------- */
function JournalPreview({ name, type, currency, balance }) {
  const sym = getCurrencySymbol(currency) || "";
  const t = TYPES.find((x) => x.id === type);
  return (
    <div className={f.stack}>
      <div className={f.ghost} aria-hidden="true" />
      <div className={f.surface}>
        <JournalHead name={name.trim() || "Your journal"} tag={t?.tag} meta={`${currency} · 0 trades`} />
        <div className={f.jBal}>Starting balance</div>
        <div className={f.jBalVal}>{money(balance || 0, sym)}</div>
        <div className={f.flat}>
          <svg viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true">
            <line x1="0" y1="30" x2="300" y2="30" stroke="#3a3a40" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className={f.startDot} />
          <span className={f.flatLabel}>Your equity curve starts here</span>
        </div>
        <div className={f.jStats}>
          <div className={f.jStat}><small>Win rate</small><b>—</b></div>
          <div className={f.jStat}><small>Net P&amp;L</small><b>—</b></div>
          <div className={f.jStat}><small>Trades</small><b>0</b></div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- step 2: live trade preview ---------------- */
const DEMO = { symbol: "NQ", pnl: "420.00" };
/* plays until the user starts typing: types a symbol and P&L, then "logs" it */
function useDemoTicker(active) {
  const reduce = useReducedMotion();
  const [s, setS] = useState({ phase: 3, chars: 99 });
  useEffect(() => {
    if (!active || reduce) { setS({ phase: 3, chars: 99 }); return undefined; }
    let p = 0;
    let c = 0;
    const id = setInterval(() => {
      c += 1;
      if (p === 0 && c > DEMO.symbol.length + 3) { p = 1; c = 0; }
      else if (p === 1 && c > DEMO.pnl.length + 3) { p = 2; c = 0; }
      else if (p === 2 && c > 4) { p = 3; c = 0; }
      else if (p === 3 && c > 12) { p = 0; c = 0; }
      setS({ phase: p, chars: c });
    }, 150);
    return () => clearInterval(id);
  }, [active, reduce]);
  return s;
}

function TradePreview({ journalName, tag, sym, balance, symbol, pnl, side }) {
  const typing = !!(symbol || pnl);
  const demo = useDemoTicker(!typing);
  const reduce = useReducedMotion();

  let showSym;
  let showPnl;
  let saved;
  if (typing) {
    showSym = symbol.toUpperCase();
    showPnl = pnl === "" ? null : (side === "loss" ? -1 : 1) * Math.abs(Number(pnl) || 0);
    saved = false;
  } else {
    showSym = demo.phase === 0 ? DEMO.symbol.slice(0, demo.chars) : DEMO.symbol;
    const p = demo.phase === 0 ? "" : demo.phase === 1 ? DEMO.pnl.slice(0, demo.chars) : DEMO.pnl;
    showPnl = p ? Number(p) || 0 : null;
    saved = demo.phase === 3;
  }
  const after = (Number(balance) || 0) + (showPnl || 0);

  return (
    <div className={f.stack}>
      <div className={f.ghost} aria-hidden="true" />
      <div className={f.surface}>
        <JournalHead name={journalName} tag={tag} meta={typing ? "Preview of your trade" : "How a quick log looks"} />

        <div className={f.ticket}>
          <span className={f.ticketIcon} data-tone={showPnl == null ? undefined : showPnl >= 0 ? "up" : "down"} aria-hidden="true">
            {showPnl != null && showPnl < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
          </span>
          <span className={f.ticketMain}>
            <b>{showSym || <span className={f.placeholder}>Symbol</span>}{!typing && demo.phase === 0 && <span className={f.caret} />}</b>
            <small>{showPnl == null ? "Quick log" : showPnl >= 0 ? "Win · Quick log" : "Loss · Quick log"}</small>
          </span>
          <span className={`${f.ticketPnl} ${showPnl == null ? "" : tone(showPnl)}`}>
            {showPnl == null ? <span className={f.placeholder}>{sym}0.00</span> : money(showPnl, sym, true)}
            {!typing && demo.phase === 1 && <span className={f.caret} />}
          </span>
        </div>

        <div className={f.balRow}>
          <div>
            <small>Balance</small>
            <b>{money(balance || 0, sym)}</b>
          </div>
          <ArrowRight size={15} className={f.balArrow} aria-hidden="true" />
          <div style={{ textAlign: "right" }}>
            <small>After this trade</small>
            <b className={tone(showPnl || 0)}>{money(after, sym)}</b>
          </div>
        </div>

        <div className={f.jStats}>
          <div className={f.jStat}><small>Win rate</small><b>{showPnl == null ? "—" : showPnl > 0 ? "100%" : "0%"}</b></div>
          <div className={f.jStat}><small>Net P&amp;L</small><b className={tone(showPnl || 0)}>{showPnl == null ? "—" : money(showPnl, sym, true)}</b></div>
          <div className={f.jStat}><small>Trades</small><b>{showPnl == null ? 0 : 1}</b></div>
        </div>

        <AnimatePresence>
          {saved && (
            <motion.div
              className={f.toast}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              aria-hidden="true"
            >
              <Check size={14} /> Trade logged · analytics updated
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------------- step 3: analytics from real trades ---------------- */
function Insights({ trades, sym, balance, journalName, tag }) {
  const stats = useMemo(() => {
    const pnls = trades.map((t) => Number(t.pnl) || 0);
    const net = pnls.reduce((a, b) => a + b, 0);
    const wins = pnls.filter((p) => p > 0).length;
    let run = 0;
    const curve = [0, ...pnls.map((p) => (run += p))];
    return { net, count: trades.length, winRate: trades.length ? Math.round((wins / trades.length) * 100) : 0, curve };
  }, [trades]);

  const path = useMemo(() => {
    const pts = stats.curve.length < 2 ? [0, 0] : stats.curve;
    const min = Math.min(...pts, 0);
    const max = Math.max(...pts, 0);
    const span = max - min || 1;
    return pts.map((v, i) => `${i === 0 ? "M" : "L"} ${(i / (pts.length - 1)) * 300} ${64 - ((v - min) / span) * 56 - 4}`).join(" ");
  }, [stats.curve]);

  const stroke = stats.net >= 0 ? "#2ebd85" : "#f6465d";
  const last = trades[trades.length - 1];
  const now = (Number(balance) || 0) + stats.net;

  return (
    <div className={f.stack}>
      <div className={f.ghost} aria-hidden="true" />
      <div className={f.surface}>
        <JournalHead name={journalName} tag={tag} meta={`${stats.count} trade${stats.count === 1 ? "" : "s"} logged`} />
        <div className={f.jBal}>Balance</div>
        <div className={f.jBalVal}>{money(now, sym)} <span className={`${f.delta} ${tone(stats.net)}`}>{money(stats.net, sym, true)}</span></div>
        <div className={f.chart}>
          <svg viewBox="0 0 300 64" preserveAspectRatio="none" role="img" aria-label={`Equity curve, net ${money(stats.net, sym, true)}`}>
            <defs>
              <linearGradient id="fr-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
                <stop offset="100%" stopColor={stroke} stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path
              d={`${path} L 300 64 L 0 64 Z`}
              fill="url(#fr-fill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            />
            <motion.path
              d={path}
              fill="none"
              stroke={stroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          </svg>
        </div>
        <div className={f.jStats}>
          <div className={f.jStat}><small>Win rate</small><b>{stats.winRate}%</b></div>
          <div className={f.jStat}><small>Net P&amp;L</small><b className={tone(stats.net)}>{money(stats.net, sym, true)}</b></div>
          <div className={f.jStat}><small>Trades</small><b>{stats.count}</b></div>
        </div>
        {last && (
          <div className={f.ticket} style={{ marginTop: 10, marginBottom: 0 }}>
            <span className={f.ticketIcon} data-tone={(Number(last.pnl) || 0) >= 0 ? "up" : "down"} aria-hidden="true">
              {(Number(last.pnl) || 0) < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
            </span>
            <span className={f.ticketMain}>
              <b>{last.symbol || "Trade"}</b>
              <small>Latest trade</small>
            </span>
            <span className={`${f.ticketPnl} ${tone(Number(last.pnl) || 0)}`}>{money(last.pnl, sym, true)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* celebratory burst when the first trade lands (skipped for reduced motion) */
function celebrate() {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#fcd535", "#f5f6f8", "#c7ccd4", "#2ebd85"];
  const base = { particleCount: 70, spread: 70, startVelocity: 48, ticks: 220, zIndex: 10100, colors, scalar: 0.9 };
  confetti({ ...base, angle: 60, origin: { x: 0, y: 0.75 } });
  confetti({ ...base, angle: 120, origin: { x: 1, y: 0.75 } });
  setTimeout(() => confetti({ ...base, particleCount: 90, spread: 100, startVelocity: 38, origin: { x: 0.5, y: 0.35 } }), 250);
}

/* ---------------- main ---------------- */
export default function FirstRunFlow({ open, step, account, trades = [], onStepChange, onJournalSaved, onTradeLogged, onFinish, demo = false }) {
  const reduce = useReducedMotion();
  const headingRef = useRef(null);

  // confetti once, right after the first trade is logged (flag survives reloads;
  // resuming step 3 later doesn't re-fire it)
  useEffect(() => {
    if (!open || step !== "insights") return undefined;
    let flagged = false;
    try { flagged = localStorage.getItem("jx-firstrun-celebrate") === "1"; } catch {}
    if (!flagged) return undefined;
    try { localStorage.removeItem("jx-firstrun-celebrate"); } catch {}
    const id = setTimeout(celebrate, 350);
    return () => clearTimeout(id);
  }, [step, open]);

  /* ----- step 1 state ----- */
  const [type, setType] = useState("personal");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [currency, setCurrency] = useState((account?.currency || "USD").toUpperCase());
  const [balance, setBalance] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  /* ----- step 2 state ----- */
  const [symbol, setSymbol] = useState("");
  const [pnl, setPnl] = useState("");
  const [side, setSide] = useState("profit"); // profit | loss
  const [logging, setLogging] = useState(false);
  const [tradeErr, setTradeErr] = useState(null); // { field, msg }

  // prefill from the journal created at signup (unless it's the generic default)
  useEffect(() => {
    if (!account) return;
    setCurrency((account.currency || "USD").toUpperCase());
    if (account.name && account.name !== "Default Journal" && !nameTouched) setName(account.name);
    const amt = account.startingBalance?.amount;
    if (amt) setBalance(String(amt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?._id]);

  useEffect(() => {
    if (!nameTouched && (!account?.name || account.name === "Default Journal")) {
      setName(TYPES.find((t) => t.id === type)?.name || "");
    }
  }, [type, nameTouched, account?.name]);

  // move focus to the step heading whenever the step changes (screen readers + keyboard)
  useEffect(() => {
    if (open) setTimeout(() => headingRef.current?.focus(), 60);
  }, [open, step]);

  const accTrades = useMemo(
    () => (account ? trades.filter((t) => !t.accountId || t.accountId === account._id) : trades),
    [trades, account],
  );
  const sym = getCurrencySymbol(currency) || "";
  const journalName = name.trim() || account?.name || "Your journal";
  const journalTag = TYPES.find((t) => t.id === type)?.tag;
  const startBal = Number(balance) || Number(account?.startingBalance?.amount) || 0;

  const saveJournal = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Give your journal a name");
    if (balance !== "" && (isNaN(Number(balance)) || Number(balance) < 0)) return setError("Enter a valid starting balance");
    setSaving(true);
    setError(null);
    try {
      if (demo) await new Promise((r) => setTimeout(r, 600)); // demo page: no API calls
      else if (account?._id) await updateAccount(account._id, name.trim(), currency.toLowerCase(), Number(balance) || 0);
      else await createAccount(name.trim(), currency.toLowerCase(), Number(balance) || 0, type === "paper" ? "paper" : "spot");
      if (!demo) { try { localStorage.setItem("jx-base-currency", currency.toUpperCase()); } catch {} }
      await onJournalSaved?.({ name: name.trim(), currency, balance: Number(balance) || 0 });
      onStepChange(accTrades.length ? "insights" : "trade");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save your journal, try again");
    } finally {
      setSaving(false);
    }
  };

  const logTrade = async (e) => {
    e.preventDefault();
    if (!symbol.trim()) return setTradeErr({ field: "symbol", msg: "Add a symbol, or tap one below" });
    if (pnl === "" || isNaN(Number(pnl))) return setTradeErr({ field: "pnl", msg: "Add your net P&L for this trade" });
    setTradeErr(null);
    setLogging(true);
    const value = (side === "loss" ? -1 : 1) * Math.abs(Number(pnl));
    try {
      const trade = demo
        ? await new Promise((r) => setTimeout(() => r({ _id: `demo-${Date.now()}`, accountId: account?._id, symbol: symbol.trim().toUpperCase(), direction: "long", pnl: value }), 700))
        : await quickLogTrade({ accountId: account?._id, symbol, pnl: value });
      try { localStorage.setItem("jx-firstrun-celebrate", "1"); } catch {}
      onTradeLogged?.(trade);
      onStepChange("insights");
    } catch (err) {
      setTradeErr({ field: null, msg: err?.message || "Could not save trade, try again" });
    } finally {
      setLogging(false);
    }
  };

  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const pane = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={f.root}
          role="dialog"
          aria-modal="true"
          aria-labelledby="firstrun-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.25 }}
        >
          <header className={f.top}>
            <span className={f.logo}>Journal<em>X</em></span>
            <Stepper step={step} />
            <button type="button" className={f.skip} onClick={onFinish}>
              Skip setup
            </button>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            <motion.main key={step} className={f.body} {...pane} transition={{ duration: reduce ? 0 : 0.25 }}>
              {/* ---------- copy + actions ---------- */}
              <div className={f.copy}>
                {step !== "journal" && (
                  <span className={f.badge}><span><Check size={11} strokeWidth={3} aria-hidden="true" /></span>
                    {step === "trade" ? "Journal ready" : "First trade logged"}
                  </span>
                )}
                <span className={f.kicker}>Step {stepIdx + 1} of 3</span>
                <h1 id="firstrun-title" ref={headingRef} tabIndex={-1} className={f.title} style={{ outline: "none" }}>
                  {step === "journal" && "Set up your trading journal"}
                  {step === "trade" && "Log your first trade"}
                  {step === "insights" && "Your journal is live"}
                </h1>
                <p className={f.lead}>
                  {step === "journal" && "One journal per account you trade, personal or funded. Name it, pick a currency and set where your balance starts."}
                  {step === "trade" && "Just the symbol and your net P&L. Add entries, screenshots and notes to any trade later."}
                  {step === "insights" && "This is your journal working. Every trade you log sharpens these numbers and shows what to keep and what to cut."}
                </p>

                {step === "journal" && (
                  <form className={f.form} onSubmit={saveJournal} noValidate>
                    <div className={f.field}>
                      <span className={f.label} id="fr-type-label">What are you journaling?</span>
                      <div className={f.chips} role="group" aria-labelledby="fr-type-label">
                        {TYPES.map((t) => (
                          <button key={t.id} type="button" className={f.chip} aria-pressed={type === t.id} onClick={() => setType(t.id)}>
                            {type === t.id && <Check size={13} aria-hidden="true" />}{t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={f.field}>
                      <label htmlFor="fr-name" className={f.label}>Journal name</label>
                      <div className={f.control} data-invalid={error && !name.trim() ? "true" : undefined}>
                        <input
                          id="fr-name"
                          value={name}
                          maxLength={40}
                          placeholder="e.g. Personal account"
                          onChange={(e) => { setName(e.target.value); setNameTouched(true); }}
                          aria-invalid={error && !name.trim() ? true : undefined}
                        />
                      </div>
                    </div>

                    <div className={f.row2}>
                      <div className={f.field}>
                        <label htmlFor="fr-currency" className={f.label}>Currency</label>
                        <div className={f.control}>
                          <select id="fr-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                            {CURRENCIES.map((c) => <option key={c} value={c}>{c} ({getCurrencySymbol(c)})</option>)}
                          </select>
                          <span className={f.chev} aria-hidden="true"><ChevronDown size={15} /></span>
                        </div>
                      </div>
                      <div className={f.field}>
                        <label htmlFor="fr-balance" className={f.label}>Starting balance</label>
                        <div className={f.control}>
                          <span className={f.prefix} aria-hidden="true">{getCurrencySymbol(currency)}</span>
                          <input
                            id="fr-balance"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={balance}
                            onChange={(e) => setBalance(e.target.value.replace(/[^\d.]/g, ""))}
                          />
                        </div>
                      </div>
                    </div>

                    {error && <p className={f.error} role="alert"><AlertCircle size={14} aria-hidden="true" />{error}</p>}

                    <div className={f.actions}>
                      <button type="submit" className={`${f.btn} ${f.gold}`} disabled={saving} aria-busy={saving || undefined}>
                        {saving ? <><span className={f.spinner} aria-hidden="true" />Saving…</> : <>Create journal <ArrowRight size={15} aria-hidden="true" /></>}
                      </button>
                    </div>
                    <p className={f.note}>You can rename it or add more journals later.</p>
                  </form>
                )}

                {step === "trade" && (
                  <form className={f.form} onSubmit={logTrade} noValidate>
                    <div className={f.field}>
                      <label htmlFor="fr-symbol" className={f.label}>Symbol</label>
                      <div className={f.control} data-invalid={tradeErr?.field === "symbol" ? "true" : undefined}>
                        <input
                          id="fr-symbol"
                          value={symbol}
                          maxLength={20}
                          autoCapitalize="characters"
                          autoComplete="off"
                          spellCheck={false}
                          placeholder="e.g. NQ, BTCUSDT, AAPL"
                          onChange={(e) => { setSymbol(e.target.value.toUpperCase()); if (tradeErr?.field === "symbol") setTradeErr(null); }}
                          aria-invalid={tradeErr?.field === "symbol" || undefined}
                          aria-describedby={tradeErr?.field === "symbol" ? "fr-trade-err" : undefined}
                        />
                      </div>
                      <div className={f.chips} role="group" aria-label="Popular symbols">
                        {POPULAR.map((p) => (
                          <button key={p} type="button" className={`${f.chip} ${f.chipSm}`} aria-pressed={symbol === p} onClick={() => { setSymbol(p); if (tradeErr?.field === "symbol") setTradeErr(null); }}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={f.field}>
                      <label htmlFor="fr-pnl" className={f.label}>Net P&amp;L</label>
                      <div className={f.pnlRow}>
                        <div className={f.seg} role="group" aria-label="Result">
                          <button type="button" aria-pressed={side === "profit"} data-tone="up" onClick={() => setSide("profit")}>Profit</button>
                          <button type="button" aria-pressed={side === "loss"} data-tone="down" onClick={() => setSide("loss")}>Loss</button>
                        </div>
                        <div className={f.control} style={{ flex: 1 }} data-invalid={tradeErr?.field === "pnl" ? "true" : undefined}>
                          <span className={f.prefix} aria-hidden="true">{side === "loss" ? "−" : "+"}{sym}</span>
                          <input
                            id="fr-pnl"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={pnl}
                            onChange={(e) => { setPnl(e.target.value.replace(/[^\d.]/g, "")); if (tradeErr?.field === "pnl") setTradeErr(null); }}
                            aria-invalid={tradeErr?.field === "pnl" || undefined}
                            aria-describedby={tradeErr?.field === "pnl" ? "fr-trade-err" : undefined}
                          />
                        </div>
                      </div>
                    </div>

                    {tradeErr && <p id="fr-trade-err" className={f.error} role="alert"><AlertCircle size={14} aria-hidden="true" />{tradeErr.msg}</p>}

                    <div className={f.actions}>
                      <button type="submit" className={`${f.btn} ${f.gold}`} disabled={logging} aria-busy={logging || undefined}>
                        {logging ? <><span className={f.spinner} aria-hidden="true" />Logging…</> : <>Log trade <ArrowRight size={15} aria-hidden="true" /></>}
                      </button>
                      <button type="button" className={`${f.btn} ${f.text}`} onClick={() => onStepChange("journal")} disabled={logging}>
                        Back
                      </button>
                    </div>
                  </form>
                )}

                {step === "insights" && (
                  <div className={f.actions} style={{ marginTop: 24 }}>
                    <button type="button" className={`${f.btn} ${f.gold}`} onClick={onFinish}>
                      Go to my dashboard <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>

              {/* ---------- preview stage ---------- */}
              <div className={f.stage}>
                <span className={f.stageLabel} aria-hidden="true">
                  {step === "journal" ? "Live preview" : step === "trade" ? (symbol || pnl ? "Live preview" : "How it works") : "Your analytics"}
                </span>
                {step === "journal" && <JournalPreview name={name} type={type} currency={currency} balance={balance} />}
                {step === "trade" && (
                  <TradePreview journalName={journalName} tag={journalTag} sym={sym} balance={startBal} symbol={symbol} pnl={pnl} side={side} />
                )}
                {step === "insights" && (
                  <Insights trades={accTrades} sym={sym} balance={startBal} journalName={journalName} tag={journalTag} />
                )}
              </div>
            </motion.main>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
