"use client";

import { useState } from "react";
import ToolPage, { toolCard, toolInput, toolLabel, TC, WorkedExample, Glossary } from "@/components/tools/ToolPage";

const RELATED = [
  { href: "/tools/position-size-calculator", label: "Position Size Calculator" },
  { href: "/tools/r-multiple-calculator", label: "R-Multiple Calculator" },
  { href: "/tools/breakeven-win-rate-calculator", label: "Breakeven Win-Rate" },
  { href: "/tools/risk-of-ruin-calculator", label: "Risk of Ruin Calculator" },
];

export default function PnlCalculator() {
  const [dir, setDir] = useState("long");
  const [entry, setEntry] = useState("100");
  const [exit, setExit] = useState("106");
  const [qty, setQty] = useState("100");
  const [fees, setFees] = useState(""); // optional total fees ₹

  const num = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };
  const en = num(entry), ex = num(exit), q = num(qty), fee = num(fees);
  const sign = dir === "long" ? 1 : -1;
  const gross = (ex - en) * sign * q;
  const net = gross - fee;
  const cost = en * q;
  const pct = cost > 0 ? (net / cost) * 100 : 0;
  const fmt = (n) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const valid = q > 0 && en > 0;
  const color = net >= 0 ? TC.green : TC.red;

  const worked = valid
    ? [
        `Gross P&L = (exit − entry) ${dir === "short" ? "× −1 (short) " : ""}× quantity = (${fmt(ex)} − ${fmt(en)}) × ${fmt(q)} = ₹${fmt(gross)}`,
        ...(fee ? [`Net P&L = gross − fees = ₹${fmt(gross)} − ₹${fmt(fee)} = ₹${fmt(net)}`] : []),
        `Return = net P&L ÷ position cost = ₹${fmt(net)} ÷ ₹${fmt(cost)} = ${pct >= 0 ? "+" : ""}${fmt(pct)}%`,
      ]
    : [];

  const Result = ({ label, value, accent }) => (
    <div style={{ ...toolCard, padding: 16, flex: 1, minWidth: 150 }}>
      <div style={{ font: "400 12px Poppins", color: TC.dim, marginBottom: 4 }}>{label}</div>
      <div style={{ font: "700 22px Poppins", color: accent || TC.text, letterSpacing: "-0.5px" }}>{value}</div>
    </div>
  );

  const dirBtn = (val, label) => (
    <button
      onClick={() => setDir(val)}
      style={{
        flex: 1, padding: "11px", borderRadius: 10, cursor: "pointer", font: "600 14px Poppins",
        border: `1px solid ${dir === val ? TC.yellow : TC.border}`,
        background: dir === val ? "rgba(252,213,53,0.14)" : "rgba(255,255,255,0.04)",
        color: dir === val ? TC.yellow : TC.muted,
      }}
    >{label}</button>
  );

  return (
    <ToolPage
      slug="pnl-calculator"
      h1="Profit / Loss (P&L) Calculator"
      title="Profit & Loss Calculator (Free) — Trade P&L and % Return | JournalX"
      description="Free trade P&L calculator. Enter entry, exit, quantity and fees to get your exact profit or loss and percentage return — for long or short trades, in ₹."
      keywords={["profit loss calculator", "pnl calculator", "trade profit calculator", "stock profit calculator india", "percentage return calculator", "short selling profit calculator"]}
      intro="Enter your entry, exit, quantity and (optionally) fees to get the exact profit or loss on a trade and your percentage return — for both long and short positions."
      explainer={[
        { h: "How trade P&L is calculated", p: "For a long, profit = (exit − entry) × quantity. For a short you flip the sign, since you profit when price falls. Subtract brokerage and charges to get your net P&L, then divide by the position cost for your percentage return." },
        { h: "Gross vs net", p: "Gross P&L ignores costs; net P&L subtracts brokerage, STT, exchange and other fees. On small or frequent trades, fees can quietly turn a 'winner' into a loss — always look at net." },
        { h: "P&L is only half the story", p: "Two traders can have the same P&L with completely different risk. That's why JournalX pairs every P&L with its R-multiple, so you see not just what you made, but how much risk it took to make it." },
      ]}
      faqs={[
        ["How do I calculate profit on a trade?", "Profit = (exit − entry) × quantity for a long; reverse the sign for a short. Example: buy 100 at ₹100, sell at ₹106 → (106 − 100) × 100 = ₹600 gross."],
        ["How do I calculate percentage return?", "Percentage return = net P&L ÷ position cost × 100, where position cost = entry × quantity. ₹600 on a ₹10,000 position is a 6% return."],
        ["Does it work for short selling?", "Yes — pick 'Short' and a fall in price shows as profit. Profit = (entry − exit) × quantity."],
      ]}
      related={RELATED}
    >
      <div style={{ ...toolCard }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {dirBtn("long", "Long")}
          {dirBtn("short", "Short")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <div>
            <label style={toolLabel} htmlFor="pl-entry">Entry price (₹)</label>
            <input id="pl-entry" style={toolInput} inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} />
          </div>
          <div>
            <label style={toolLabel} htmlFor="pl-exit">Exit price (₹)</label>
            <input id="pl-exit" style={toolInput} inputMode="decimal" value={exit} onChange={(e) => setExit(e.target.value)} />
          </div>
          <div>
            <label style={toolLabel} htmlFor="pl-qty">Quantity (units)</label>
            <input id="pl-qty" style={toolInput} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <label style={toolLabel} htmlFor="pl-fees">Fees / charges (₹) — optional</label>
            <input id="pl-fees" style={toolInput} inputMode="decimal" placeholder="brokerage + taxes" value={fees} onChange={(e) => setFees(e.target.value)} />
          </div>
        </div>

        {!valid ? (
          <p style={{ font: "400 12.5px Poppins", color: TC.red, margin: "16px 0 0" }}>Enter an entry price and a quantity above 0.</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
              <Result label="Gross P&L" value={`₹${fmt(gross)}`} accent={gross >= 0 ? TC.green : TC.red} />
              {fee > 0 && <Result label="Fees" value={`₹${fmt(fee)}`} accent={TC.red} />}
              <Result label="Net P&L" value={`₹${fmt(net)}`} accent={color} />
              <Result label="Return" value={`${pct >= 0 ? "+" : ""}${fmt(pct)}%`} accent={color} />
            </div>

            <p style={{ font: "400 13px/1.6 Poppins", color: TC.muted, margin: "14px 0 0" }}>
              You {net >= 0 ? "made" : "lost"} <strong style={{ color }}>₹{fmt(Math.abs(net))}</strong> on this trade — a {pct >= 0 ? "+" : ""}{fmt(pct)}% return on ₹{fmt(cost)} deployed.
            </p>

            <WorkedExample lines={worked} />
          </>
        )}
      </div>

      <Glossary
        items={[
          ["Gross P&L", "Your raw profit or loss before any costs — just (exit − entry) × quantity (sign flipped for shorts)."],
          ["Net P&L", "What actually lands in your account: gross P&L minus brokerage, STT, exchange and other charges."],
          ["Return %", "Net P&L as a percentage of the money you put in (entry × quantity) — lets you compare trades of different sizes fairly."],
        ]}
      />
    </ToolPage>
  );
}
