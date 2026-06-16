"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Cookies from "js-cookie";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  Pencil,
  Plus,
  Search,
  Wallet,
  X,
} from "lucide-react";
import Button from "./Button";
import { createAccount, updateAccount } from "@/api/auth";
import { canAddAccount, getPlanRules } from "@/utils/planRestrictions";
import { getFromIndexedDB } from "@/utils/indexedDB";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import { compactNumber } from "@/utils/formatNumbers";

/* Figma "Journals Modal" (22811:53855) — two views:
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
}) {
  const [view, setView] = useState(initialView); // 'list' | 'create'

  useEffect(() => {
    if (open) setView(initialView);
  }, [open, initialView]);
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

    /* edit path — update name/currency/balance, then refresh */
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
        setError("Could not save changes — try again");
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
      setError("Could not create journal — try again");
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay jx-modal-overlay--blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="jx-ltmodal jx-ltmodal--narrow"
            style={{ width: "min(520px, 96vw)" }}
          >
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
                        No journals yet — create your first one below.
                      </span>
                    )}
                    {accounts.map((acc, i) => {
                      const active = acc._id === currentAccountId;
                      const bal = currentBalances?.[acc.name] ?? acc.startingBalance?.amount ?? 0;
                      const pnl = pnlByAccount[acc._id] || 0;
                      const accColor = ACCENTS[i % ACCENTS.length];
                      const sym = getCurrencySymbol((acc.currency || "USD").toLowerCase());
                      return (
                        <div key={acc._id} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <button
                          className={`jx-journalrow ${active ? "jx-journalrow--active" : ""}`}
                          onClick={() => !active && switchTo(acc)}
                          style={{ flex: 1, minWidth: 0 }}
                        >
                          <span
                            style={{
                              width: 38, height: 38, borderRadius: "var(--radius-md)",
                              background: active ? "var(--color-primary)" : "var(--color-bg-muted)",
                              color: active ? "var(--color-primary-foreground)" : "var(--color-text-muted)",
                              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            }}
                          >
                            <Wallet size={17} />
                          </span>
                          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                            <span style={{ font: "var(--text-body-md)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                              {acc.name}
                            </span>
                            <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", textTransform: "capitalize" }}>
                              {(acc.accountType || "spot")} · {(acc.currency || "USD").toUpperCase()}
                            </span>
                          </span>
                          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                            <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{fmt(bal, sym)}</span>
                            <span style={{ font: "var(--text-caption)", color: pnl >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                              {pnl >= 0 ? "+" : "−"}{fmt(pnl, sym)} all-time
                            </span>
                          </span>
                          <span
                            style={{
                              width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              background: active ? "var(--color-primary)" : "transparent",
                              border: active ? "none" : "1.5px solid var(--color-border-strong)",
                              color: "var(--color-primary-foreground)",
                            }}
                          >
                            {active && <Check size={13} />}
                          </span>
                        </button>
                        <button
                          className="jx-btn jx-btn--secondary jx-btn--sm"
                          onClick={() => startEdit(acc)}
                          aria-label={`Edit ${acc.name}`}
                          title="Edit journal"
                          style={{ padding: 9, flexShrink: 0 }}
                        >
                          <Pencil size={15} />
                        </button>
                        </div>
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
                      <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>{editingId ? "Edit journal" : "Create journal"}</span>
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
                        <span className="jx-input__icon"><Search size={15} /></span>
                        <input placeholder="e.g. Swing trades" value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                    </div>

                    <div className="jx-form-row">
                      <div className="jx-field" style={{ flex: 2 }}>
                        <span className="jx-sidebar__section" style={{ padding: 0 }}>Starting balance</span>
                        <div className="jx-input">
                          <span className="jx-input__icon"><Search size={15} /></span>
                          <input type="number" step="any" placeholder="$10k" value={balance} onChange={(e) => setBalance(e.target.value)} />
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
    </AnimatePresence>
  );
}
