"use client";

/* /accounts — Journals page, revamp v2.
   Lists every journal with live stats; click to switch (sets the
   account cookie and returns to the dashboard). Create opens the
   v2 Journals modal directly in create view. */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import Cookies from "js-cookie";
import { ArrowLeft, Check, Plus, Wallet } from "lucide-react";

import { Badge, Button, CountUp, JournalsModal } from "@/components/revampV2";
import FullPageLoader from "@/components/ui/FullPageLoader";
import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";
import { getCurrencySymbol } from "@/utils/currencySymbol";

const fmt = (v, d = 2) => Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
const money = (v, sym = "$") => {
  const a = Math.abs(v);
  const s = a >= 1000 ? `${sym}${fmt(a / 1000, 2)}k` : `${sym}${fmt(a)}`;
  return `${v < 0 ? "−" : "+"}${s}`;
};

export default function AccountsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [trades, setTrades] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await fetchAccountsAndTrades();
      if (result.redirectToLogin) {
        router.push("/login");
        return;
      }
      setAccounts(result.accounts || []);
      setTrades(result.trades || []);
      setLoading(false);
    })();
  }, [router]);

  const currentId = Cookies.get("accountId");

  const stats = useMemo(() => {
    const m = new Map();
    accounts.forEach((acc) => {
      const list = trades.filter((t) => t.accountId === acc._id && t.closeTime);
      const pnl = list.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
      const wins = list.filter((t) => t.pnl > 0).length;
      m.set(acc._id, {
        pnl,
        n: list.length,
        winRate: list.length ? (wins / list.length) * 100 : null,
        balance: (acc.startingBalance?.amount || 0) + pnl,
      });
    });
    return m;
  }, [accounts, trades]);

  const switchTo = (acc) => {
    Cookies.set("accountId", acc._id, { expires: 365 });
    Cookies.set("selectedAccount", acc._id, { expires: 365 });
    try { localStorage.setItem("jx-account-id", acc._id); } catch {}
    router.push("/dashboard");
  };

  if (loading) return <FullPageLoader label="Loading your journals…" />;

  return (
    <div className="jx-shell" style={{ justifyContent: "center" }}>
      <main className="jx-shell__main" style={{ maxWidth: 920, width: "100%" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => router.push("/dashboard")}>
            Dashboard
          </Button>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ font: "var(--text-h2)" }}>Journals</span>
            <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>
              Switch, manage, or create a journal · {accounts.length} total
            </span>
          </div>
          <span style={{ marginLeft: "auto" }}>
            <Button variant="primary" icon={Plus} onClick={() => setShowCreate(true)}>
              Create journal
            </Button>
          </span>
        </div>

        {/* journal cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
          {accounts.map((acc, i) => {
            const s = stats.get(acc._id) || { pnl: 0, n: 0, winRate: null, balance: 0 };
            const active = acc._id === currentId;
            const sym = getCurrencySymbol(acc.currency || "usd");
            return (
              <motion.button
                key={acc._id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25, ease: "easeOut" }}
                onClick={() => switchTo(acc)}
                className="jx-card"
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                  outline: active ? "2px solid var(--color-primary)" : "none",
                  background: active ? "var(--color-primary-subtle)" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <span
                    style={{
                      width: 40, height: 40, borderRadius: "var(--radius-md)",
                      background: active ? "var(--color-primary)" : "var(--color-bg-muted)",
                      color: active ? "var(--color-primary-foreground)" : "var(--color-text-muted)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <Wallet size={18} />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <span style={{ font: "var(--text-title)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {acc.name}
                    </span>
                    <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", textTransform: "capitalize" }}>
                      {acc.accountType || "spot"} · {(acc.currency || "USD").toUpperCase()}
                    </span>
                  </span>
                  {active && (
                    <span
                      style={{
                        width: 22, height: 22, borderRadius: "50%", background: "var(--color-primary)",
                        color: "var(--color-primary-foreground)", display: "flex", alignItems: "center",
                        justifyContent: "center", flexShrink: 0,
                      }}
                    >
                      <Check size={13} />
                    </span>
                  )}
                </div>

                <div>
                  <span style={{ font: "var(--text-label)", letterSpacing: ".6px", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                    Balance
                  </span>
                  <div style={{ font: "var(--text-stat)", letterSpacing: "-1px" }}>
                    <CountUp value={s.balance} format={(v) => `${sym}${fmt(v)}`} />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <Badge variant={s.pnl >= 0 ? "success" : "danger"}>{money(s.pnl, sym)} all-time</Badge>
                  <Badge variant="neutral">{s.n} trades</Badge>
                  {s.winRate != null && <Badge variant="neutral">{fmt(s.winRate, 0)}% win</Badge>}
                  {active && <Badge variant="brand">Active</Badge>}
                </div>
              </motion.button>
            );
          })}

          {/* create card */}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: accounts.length * 0.05, duration: 0.25 }}
            onClick={() => setShowCreate(true)}
            className="jx-dropzone"
            style={{ minHeight: 170, borderRadius: "var(--radius-lg)" }}
          >
            <span className="jx-sect__icon" style={{ borderRadius: "50%", width: 36, height: 36 }}>
              <Plus size={16} />
            </span>
            <strong style={{ color: "var(--color-text-primary)" }}>Create a new journal</strong>
            <span style={{ font: "var(--text-caption)" }}>Separate strategies, accounts, or paper trading</span>
          </motion.button>
        </div>

        <JournalsModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          accounts={accounts}
          trades={trades}
          currentAccountId={currentId}
          initialView="create"
        />
      </main>
    </div>
  );
}
