"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import Cookies from "js-cookie";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Pencil,
  Plus,
  Type,
  Wallet,
  X,
} from "lucide-react";
import Button from "./Button";
import { createAccount, updateAccount } from "@/api/auth";
import { canAddAccount, getPlanRules } from "@/utils/planRestrictions";
import { getFromIndexedDB } from "@/utils/indexedDB";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import { compactNumber } from "@/utils/formatNumbers";

/* Figma "Journals Modal" (22811:53855), two views:
   list (switch/manage) ⇄ create journal. Blurred backdrop,
   framer-motion entrance. Switching sets the account cookie and
   reloads; create calls POST /api/account/create. */

const fmt = (v, sym = "$") => `${sym}${compactNumber(Math.abs(v))}`;

const ACCENTS = ["#fcd535", "#2ebd85", "#3b82f6", "#8b5cf6", "#f6465d"];
const TYPES = ["Spot", "Futures", "Paper"];

export default function JournalsModal({
  open,
  onClose,
  accounts = [],
  trades = [],
  currentBalances = {},
  currentAccountId,
  initialView = "list",
  editAccountId = null, // when set, open straight on this journal's edit form
}) {
  const [view, setView] = useState(initialView); // 'list' | 'create'
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [type, setType] = useState("Spot");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null); // null = create, else edit

  const startCreate = () => {
    setEditingId(null); setName(""); setBalance(""); setCurrency("USD"); setType("Spot"); setError(null);
    setView("create");
  };
  const startEdit = (acc) => {
    setEditingId(acc._id);
    setName(acc.name || "");
    setBalance(String(acc.startingBalance?.amount ?? ""));
    setCurrency((acc.currency || "USD").toUpperCase());
    setType((acc.accountType || "Spot").replace(/^\w/, (c) => c.toUpperCase()));
    setError(null);
    setView("create");
  };

  useEffect(() => {
    if (!open) return;
    // deep-link: jump straight to the active journal's edit form (balance)
    const target = editAccountId && accounts.find((a) => a._id === editAccountId);
    if (target) startEdit(target);
    else setView(initialView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialView, editAccountId]);

  const pnlByAccount = useMemo(() => {
    const m = {};
    trades.forEach((t) => {
      if (!t.closeTime) return;
      m[t.accountId] = (m[t.accountId] || 0) + (Number(t.pnl) || 0);
    });
    return m;
  }, [trades]);

  const switchTo = (acc) => {
    Cookies.set("accountId", acc._id, { expires: 365 });
    Cookies.set("selectedAccount", acc._id, { expires: 365 });
    try {
      localStorage.setItem("jx-account-id", acc._id);
      // dashboard + settings follow the active journal's currency
      if (acc.currency) localStorage.setItem("jx-base-currency", acc.currency.toUpperCase());
    } catch {}
    window.location.reload();
  };

  const save = async () => {
    if (!name.trim()) return setError("Give your journal a name");

    /* edit path, update name/currency/balance, then refresh */
    if (editingId) {
      setSaving(true);
      setError(null);
      try {
        await updateAccount(editingId, name.trim(), currency.toLowerCase(), Number(balance) || 0);
        // the journal being edited drives the dashboard currency if it's the active one
        try {
          if (editingId === currentAccountId && currency) {
            localStorage.setItem("jx-base-currency", currency.toUpperCase());
          }
        } catch {}
        onClose?.();
        window.location.reload();
      } catch (e) {
        console.error(e);
        setError("Could not save changes, try again");
        setSaving(false);
      }
      return;
    }

    /* plan limit: account/journal count */
    try {
      const userData = await getFromIndexedDB("user-data");
      const rules = getPlanRules(userData);
      if (!canAddAccount(userData, accounts.length)) {
        const limit = rules.limits.accountLimit;
        setError(
          `Your plan allows ${limit === Infinity ? "unlimited" : limit} journal${limit === 1 ? "" : "s"}. Upgrade to create more.`,
        );
        return;
      }
    } catch {}

    setSaving(true);
    setError(null);
    try {
      await createAccount(
        name.trim(),
        currency.toLowerCase(),
        Number(balance) || 0,
        type.toLowerCase(),
      );
      // the freshly created journal becomes active → dashboard shows its currency
      try {
        if (currency) localStorage.setItem("jx-base-currency", currency.toUpperCase());
      } catch {}
      onClose?.(); // close the modal once the response is in
      window.location.reload(); // then refresh data with the new journal selected
    } catch (e) {
      console.error(e);
      setError("Could not create journal, try again");
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.5)",
            display: "flex", justifyContent: "center",
            alignItems: isMobile ? "flex-end" : "center",
            padding: isMobile ? 0 : "var(--space-3)",
          }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <motion.div
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.94, y: 16 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="jx-ltmodal jx-ltmodal--narrow jx-ltmodal--flat"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: isMobile ? "100%" : "min(520px, 96vw)",
              maxHeight: isMobile ? "92dvh" : "90dvh",
              display: "flex", flexDirection: "column",
              borderTopLeftRadius: isMobile ? "var(--radius-xl)" : undefined,
              borderTopRightRadius: isMobile ? "var(--radius-xl)" : undefined,
              borderBottomLeftRadius: isMobile ? 0 : undefined,
              borderBottomRightRadius: isMobile ? 0 : undefined,
              paddingBottom: isMobile ? "env(safe-area-inset-bottom)" : undefined,
            }}
          >
            {isMobile && (
              <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--color-border-strong)", margin: "10px auto 0", flexShrink: 0 }} />
            )}
            <AnimatePresence mode="wait">
              {view === "list" ? (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
                >
                  {/* header */}
                  <div className="jx-ltmodal__header">
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>Journals</span>
                      <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>
                        Switch, manage, or create a journal
                      </span>
                    </div>
                    <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} aria-label="Close" style={{ padding: 8 }}>
                      <X size={16} />
                    </button>
                  </div>

                  {/* journal rows */}
                  <div style={{ padding: "var(--space-5) var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-3)", overflowY: "auto" }}>
                    {accounts.length === 0 && (
                      <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)", textAlign: "center" }}>
                        No journals yet, create your first one below.
                      </span>
                    )}
                    {accounts.map((acc, i) => {
                      const active = acc._id === currentAccountId;
                      const bal = currentBalances?.[acc.name] ?? acc.startingBalance?.amount ?? 0;
                      const pnl = pnlByAccount[acc._id] || 0;
                      const accColor = ACCENTS[i % ACCENTS.length];
                      const sym = getCurrencySymbol((acc.currency || "USD").toLowerCase());
                      return (
                        <button
                          key={acc._id}
                          className={`jx-jcard ${active ? "jx-jcard--active" : ""}`}
                          onClick={() => !active && switchTo(acc)}
                        >
                          <div className="jx-jcard__top">
                            <span
                              className="jx-jcard__icon"
                              style={{
                                background: `color-mix(in srgb, ${accColor} 18%, transparent)`,
                                color: accColor,
                              }}
                            >
                              <Wallet size={18} />
                            </span>
                            <span className="jx-jcard__title">
                              <span className="jx-jcard__name">{acc.name}</span>
                              <span className="jx-jcard__sub">
                                {(acc.accountType || "spot")} · {(acc.currency || "USD").toUpperCase()}
                              </span>
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label={`Edit ${acc.name}`}
                              title="Edit journal"
                              className="jx-jcard__edit"
                              onClick={(e) => { e.stopPropagation(); startEdit(acc); }}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); startEdit(acc); } }}
                            >
                              <Pencil size={14} />
                            </span>
                            {active ? (
                              <span className="jx-jcard__check"><Check size={13} /></span>
                            ) : (
                              <ChevronRight size={18} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                            )}
                          </div>
                          <div className="jx-jcard__divider" />
                          <div className="jx-jcard__stats">
                            <span className="jx-jcard__stat">
                              <span className="jx-jcard__lbl">Balance</span>
                              <span className="jx-jcard__val">{fmt(bal, sym)}</span>
                            </span>
                            <span className="jx-jcard__stat">
                              <span className="jx-jcard__lbl">P&amp;L · all-time</span>
                              <span
                                className="jx-jcard__val"
                                style={{ color: pnl >= 0 ? "var(--color-success-strong)" : "var(--color-danger-strong)" }}
                              >
                                {pnl >= 0 ? "+" : "−"}{fmt(pnl, sym)}
                              </span>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* footer CTA */}
                  <div style={{ padding: "0 var(--space-6) var(--space-6)" }}>
                    <Button variant="primary" icon={Plus} style={{ width: "100%", justifyContent: "center" }} onClick={startCreate}>
                      Create journal
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="create"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
                >
                  {/* header */}
                  <div className="jx-ltmodal__header" style={{ alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={() => setView("list")} aria-label="Back" style={{ padding: 8, borderRadius: "50%" }}>
                        <ChevronLeft size={16} />
                      </button>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>{editingId ? "Edit journal" : "Create journal"}</span>
                        <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>
                          {editingId ? "Update this journal's details" : "Track a strategy or account separately"}
                        </span>
                      </div>
                    </div>
                    <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} aria-label="Close" style={{ padding: 8 }}>
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{ padding: "var(--space-5) var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)", overflowY: "auto" }}>
                    {error && (
                      <div className="jx-toast jx-toast--danger">
                        <AlertTriangle size={16} style={{ color: "var(--color-danger)" }} />
                        {error}
                      </div>
                    )}

                    <div className="jx-field">
                      <span className="jx-sidebar__section" style={{ padding: 0 }}>Journal name</span>
                      <div className="jx-input">
                        <span className="jx-input__icon"><Type size={15} /></span>
                        <input placeholder="e.g. Swing trades" value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                      <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                        Name it after a strategy, account, or prop firm.
                      </span>
                    </div>

                    <div className="jx-form-row">
                      <div className="jx-field" style={{ flex: 2 }}>
                        <span className="jx-sidebar__section" style={{ padding: 0 }}>Starting balance</span>
                        <div className="jx-input">
                          <span className="jx-input__icon" style={{ font: "var(--text-body-md)", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                            {getCurrencySymbol((currency || "USD").toLowerCase())}
                          </span>
                          <input type="number" step="any" placeholder="10,000" value={balance} onChange={(e) => setBalance(e.target.value)} />
                        </div>
                      </div>
                      <div className="jx-field" style={{ flex: 1, minWidth: 110 }}>
                        <span className="jx-sidebar__section" style={{ padding: 0 }}>Currency</span>
                        <div className="jx-input">
                          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                            {["USD", "USDT", "EUR", "INR"].map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                          <span className="jx-input__icon"><ChevronDown size={14} /></span>
                        </div>
                      </div>
                    </div>

                    {!editingId && (
                      <div className="jx-field">
                        <span className="jx-sidebar__section" style={{ padding: 0 }}>Account type</span>
                        <div className="jx-seg">
                          {TYPES.map((t) => (
                            <button key={t} className={`jx-seg__btn ${type === t ? "jx-seg__btn--active" : ""}`} onClick={() => setType(t)}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* footer */}
                  <div className="jx-ltmodal__footer" style={{ justifyContent: "flex-end" }}>
                    <button className="jx-btn jx-btn--ghost" onClick={() => setView("list")}>
                      Cancel
                    </button>
                    <Button variant="primary" onClick={save} disabled={saving} style={{ minWidth: 150 }}>
                      {saving ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                            style={{
                              width: 14, height: 14, borderRadius: "50%", display: "inline-block",
                              border: "2px solid color-mix(in srgb, currentColor 30%, transparent)",
                              borderTopColor: "currentColor",
                            }}
                          />
                          {editingId ? "Saving…" : "Creating…"}
                        </>
                      ) : (
                        editingId ? "Save changes" : "Create journal"
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
