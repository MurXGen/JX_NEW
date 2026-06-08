"use client";

/* Settings card — per-account XP. Account dropdown switches which
   journal's XP, level and progress are shown. XP accrues server-side
   on every logged trade (quality-weighted). */

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Flame, Trophy, Zap } from "lucide-react";
import Badge from "./Badge";
import Dropdown from "./Dropdown";
import CountUp from "./CountUp";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/* level curve — each level needs more XP than the last */
const LEVELS = [
  { name: "Novice", min: 0 },
  { name: "Apprentice", min: 250 },
  { name: "Consistent", min: 750 },
  { name: "Sharp", min: 1800 },
  { name: "Pro", min: 4000 },
  { name: "Elite", min: 8000 },
  { name: "Master", min: 15000 },
];
const levelFor = (xp) => {
  let i = 0;
  for (let j = 0; j < LEVELS.length; j++) if (xp >= LEVELS[j].min) i = j;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1] || null;
  const pct = next ? Math.min(100, ((xp - cur.min) / (next.min - cur.min)) * 100) : 100;
  return { index: i, cur, next, pct };
};

export default function XpCard() {
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/account/xp`, { withCredentials: true });
        const accs = res.data?.accounts || [];
        setAccounts(accs);
        setSelected(accs[0]?._id || "");
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const acc = useMemo(() => accounts.find((a) => a._id === selected), [accounts, selected]);
  const lvl = useMemo(() => levelFor(acc?.xp || 0), [acc]);

  return (
    <div className="jx-card">
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 4 }}>
        <span className="jx-card__title">Experience (XP)</span>
        <Badge variant="brand"><Zap size={11} /> Gamified</Badge>
      </div>
      <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-3)" }}>
        Earn XP every time you log a trade — more for complete, disciplined logs. Tracked per journal.
      </div>

      {loading ? (
        <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>Loading XP…</span>
      ) : accounts.length === 0 ? (
        <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>No journals yet.</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={{ width: 240, maxWidth: "100%" }}>
            <Dropdown
              value={selected}
              onChange={setSelected}
              label="Journal"
              options={accounts.map((a) => ({ value: a._id, label: a.name }))}
            />
          </div>

          {/* XP + level */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: "var(--space-3)" }}>
            <div className="jx-card jx-card--flat" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ font: "var(--text-label)", letterSpacing: ".6px", textTransform: "uppercase", color: "var(--color-text-muted)" }}>Total XP</span>
              <span style={{ font: "var(--text-stat)", letterSpacing: "-1px", color: "var(--yellow-500)" }}>
                <CountUp value={acc?.xp || 0} />
              </span>
            </div>
            <div className="jx-card jx-card--flat" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ font: "var(--text-label)", letterSpacing: ".6px", textTransform: "uppercase", color: "var(--color-text-muted)" }}>Level</span>
              <span style={{ font: "var(--text-h3)", display: "flex", alignItems: "center", gap: 6 }}>
                <Trophy size={18} style={{ color: "var(--yellow-500)" }} /> {lvl.cur.name}
              </span>
            </div>
            <div className="jx-card jx-card--flat" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ font: "var(--text-label)", letterSpacing: ".6px", textTransform: "uppercase", color: "var(--color-text-muted)" }}>Logged trades</span>
              <span style={{ font: "var(--text-h3)" }}><CountUp value={acc?.xpTrades || 0} /></span>
            </div>
          </div>

          {/* progress to next level */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", font: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: 6 }}>
              <span>{lvl.cur.name}</span>
              <span>{lvl.next ? `${acc?.xp || 0} / ${lvl.next.min} XP → ${lvl.next.name}` : "Max level reached 🎉"}</span>
            </div>
            <div className="jx-progress" style={{ height: 8 }}>
              <div style={{ width: `${lvl.pct}%`, background: "var(--color-primary)", borderRadius: 999, transition: "width 0.9s cubic-bezier(0.16,1,0.3,1)" }} />
            </div>
          </div>

          <div className="jx-banner jx-banner--warn" style={{ alignItems: "flex-start" }}>
            <Flame size={15} style={{ color: "var(--yellow-500)", flexShrink: 0, marginTop: 2 }} />
            <span style={{ font: "var(--text-caption)" }}>
              Tip: complete logs earn the most — set your risk (SL/TP), tag a strategy and emotion, add notes and a screenshot for up to <strong>+65 XP</strong> per trade.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
