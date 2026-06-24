"use client";

import { useState } from "react";
import ToolPage, { toolCard, toolInput, toolLabel, TC } from "@/components/tools/ToolPage";

const RELATED = [
  { href: "/tools/r-multiple-calculator", label: "R-Multiple Calculator" },
  { href: "/tools/risk-of-ruin-calculator", label: "Risk of Ruin Calculator" },
];

export default function PositionSizeCalculator() {
  const [account, setAccount] = useState("100000");
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("100");
  const [stop, setStop] = useState("98");

  const num = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };
  const acc = num(account), rp = num(riskPct), en = num(entry), st = num(stop);
  const riskAmt = (acc * rp) / 100;
  const perUnit = Math.abs(en - st);
  const qty = perUnit > 0 ? Math.floor(riskAmt / perUnit) : 0;
  const posValue = qty * en;
  const fmt = (n) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  const Result = ({ label, value, accent }) => (
    <div style={{ ...toolCard, padding: 16, flex: 1, minWidth: 150 }}>
      <div style={{ font: "400 12px Poppins", color: TC.dim, marginBottom: 4 }}>{label}</div>
      <div style={{ font: "700 22px Poppins", color: accent || TC.text, letterSpacing: "-0.5px" }}>{value}</div>
    </div>
  );

  return (
    <ToolPage
      slug="position-size-calculator"
      h1="Position Size Calculator"
      title="Position Size Calculator (Free) — Risk Per Trade | JournalX"
      description="Free position size calculator. Enter your account, risk %, entry and stop to get the exact quantity to trade so no single loss hurts your account. Built for Indian traders (₹)."
      keywords={["position size calculator", "position sizing calculator india", "risk per trade calculator", "lot size calculator", "how to calculate position size", "1 percent risk rule"]}
      intro="Enter your account size, the percentage you're willing to risk, and your entry and stop. You'll get the exact position size that keeps your loss fixed if the stop is hit — the single most important habit for surviving as a trader."
      explainer={[
        { h: "How position sizing works", p: "Position size = (Account × Risk %) ÷ (Entry − Stop). You decide the rupees you're willing to lose, then size the trade so that a stop-out costs exactly that — no more. The position flexes with your stop distance, so a wider stop means a smaller size." },
        { h: "Why the 1% rule matters", p: "Risking ~1% per trade means even a brutal 10-loss streak only draws your account down about 10%, which is fully recoverable. Oversizing is the number one reason accounts blow up — this calculator removes the guesswork." },
        { h: "From calculator to habit", p: "A calculator fixes one trade; a journal fixes the pattern. JournalX records your planned risk on every trade and shows when you quietly drifted from your own rules — which is where most damage happens." },
      ]}
      faqs={[
        ["How do I calculate position size?", "Position size = (Account × Risk %) ÷ (Entry − Stop distance). For example, a ₹1,00,000 account risking 1% (₹1,000) with a ₹2 stop distance gives 500 units."],
        ["What risk percentage should I use?", "Most professionals risk 0.5–2% of their account per trade. 1% is a common, survivable default — it keeps any single loss small enough that a losing streak doesn't end your account."],
        ["Does this work for Indian F&O and stocks?", "Yes. Enter prices in ₹ and it works for equity, futures and options — just use the per-unit (or per-lot) price and your stop."],
      ]}
      related={RELATED}
    >
      <div style={{ ...toolCard }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <div>
            <label style={toolLabel} htmlFor="ps-acc">Account size (₹)</label>
            <input id="ps-acc" style={toolInput} inputMode="decimal" value={account} onChange={(e) => setAccount(e.target.value)} />
          </div>
          <div>
            <label style={toolLabel} htmlFor="ps-risk">Risk per trade (%)</label>
            <input id="ps-risk" style={toolInput} inputMode="decimal" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
          </div>
          <div>
            <label style={toolLabel} htmlFor="ps-entry">Entry price (₹)</label>
            <input id="ps-entry" style={toolInput} inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} />
          </div>
          <div>
            <label style={toolLabel} htmlFor="ps-stop">Stop-loss price (₹)</label>
            <input id="ps-stop" style={toolInput} inputMode="decimal" value={stop} onChange={(e) => setStop(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
          <Result label="Risk amount" value={`₹${fmt(riskAmt)}`} accent={TC.red} />
          <Result label="Risk per unit" value={`₹${fmt(perUnit)}`} />
          <Result label="Position size" value={`${fmt(qty)} units`} accent={TC.yellow} />
          <Result label="Position value" value={`₹${fmt(posValue)}`} accent={TC.green} />
        </div>
        <p style={{ font: "400 12px Poppins", color: TC.dim, margin: "14px 0 0" }}>
          If your stop is hit, you lose ₹{fmt(qty * perUnit)} — about {acc > 0 ? ((qty * perUnit / acc) * 100).toFixed(2) : 0}% of your account.
        </p>
      </div>
    </ToolPage>
  );
}
