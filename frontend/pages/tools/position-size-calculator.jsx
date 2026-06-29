"use client";

import { useState } from "react";
import ToolPage, { toolCard, toolInput, toolLabel, TC, WorkedExample, Glossary } from "@/components/tools/ToolPage";

const RELATED = [
  { href: "/tools/r-multiple-calculator", label: "R-Multiple Calculator" },
  { href: "/tools/pnl-calculator", label: "Profit / Loss Calculator" },
  { href: "/tools/breakeven-win-rate-calculator", label: "Breakeven Win-Rate" },
  { href: "/tools/risk-of-ruin-calculator", label: "Risk of Ruin Calculator" },
];

export default function PositionSizeCalculator() {
  const [account, setAccount] = useState("100000");
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("100");
  const [stop, setStop] = useState("98");
  const [target, setTarget] = useState(""); // optional

  const num = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };
  const acc = num(account), rp = num(riskPct), en = num(entry), st = num(stop), tg = num(target);

  const riskAmt = (acc * rp) / 100;             // rupees you're willing to lose
  const perUnit = Math.abs(en - st);            // 1R in price terms
  const qtyExact = perUnit > 0 ? riskAmt / perUnit : 0;
  const qty = Math.floor(qtyExact);             // whole units (stocks/F&O)
  const posValue = qty * en;
  const actualLoss = qty * perUnit;             // loss if stop hits (after rounding down)
  const lossPct = acc > 0 ? (actualLoss / acc) * 100 : 0;

  const hasTarget = target !== "" && tg > 0 && perUnit > 0;
  const rewardPerUnit = hasTarget ? Math.abs(tg - en) : 0;
  const potentialProfit = qty * rewardPerUnit;
  const rr = hasTarget && perUnit > 0 ? rewardPerUnit / perUnit : 0;

  const fmt = (n) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const valid = acc > 0 && rp > 0 && perUnit > 0;

  const Result = ({ label, value, accent, sub }) => (
    <div style={{ ...toolCard, padding: 16, flex: 1, minWidth: 150 }}>
      <div style={{ font: "400 12px Poppins", color: TC.dim, marginBottom: 4 }}>{label}</div>
      <div style={{ font: "700 22px Poppins", color: accent || TC.text, letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ font: "400 11.5px Poppins", color: TC.dim, marginTop: 3 }}>{sub}</div>}
    </div>
  );

  const worked = valid
    ? [
        `Risk amount = account × risk% = ₹${fmt(acc)} × ${rp}% = ₹${fmt(riskAmt)}`,
        `Risk per unit = |entry − stop| = |${fmt(en)} − ${fmt(st)}| = ₹${fmt(perUnit)}`,
        `Position size = risk amount ÷ risk per unit = ₹${fmt(riskAmt)} ÷ ₹${fmt(perUnit)} = ${fmt(qtyExact)} → ${fmt(qty)} units`,
      ]
    : [];

  return (
    <ToolPage
      slug="position-size-calculator"
      h1="Position Size Calculator"
      title="Position Size Calculator (Free) — Risk Per Trade | JournalX"
      description="Free position size calculator. Enter your account, risk %, entry, stop (and optional target) to get the exact quantity to trade so no single loss hurts your account, plus your reward and R:R. Built for Indian traders (₹)."
      keywords={["position size calculator", "position sizing calculator india", "risk per trade calculator", "lot size calculator", "how to calculate position size", "1 percent risk rule", "risk reward calculator"]}
      intro="Enter your account size, the percentage you're willing to risk, and your entry and stop (add a target to also see your reward and risk:reward). You'll get the exact position size that keeps your loss fixed if the stop is hit — the single most important habit for surviving as a trader."
      explainer={[
        { h: "How position sizing works", p: "Position size = (Account × Risk %) ÷ (Entry − Stop). You decide the rupees you're willing to lose, then size the trade so that a stop-out costs exactly that — no more. The position flexes with your stop distance, so a wider stop means a smaller size." },
        { h: "Why the 1% rule matters", p: "Risking ~1% per trade means even a brutal 10-loss streak only draws your account down about 10%, which is fully recoverable. Oversizing is the number one reason accounts blow up — this calculator removes the guesswork." },
        { h: "From calculator to habit", p: "A calculator fixes one trade; a journal fixes the pattern. JournalX records your planned risk on every trade and shows when you quietly drifted from your own rules — which is where most damage happens." },
      ]}
      faqs={[
        ["How do I calculate position size?", "Position size = (Account × Risk %) ÷ (Entry − Stop distance). For example, a ₹1,00,000 account risking 1% (₹1,000) with a ₹2 stop distance gives 500 units."],
        ["What risk percentage should I use?", "Most professionals risk 0.5–2% of their account per trade. 1% is a common, survivable default — it keeps any single loss small enough that a losing streak doesn't end your account."],
        ["Why is the position size rounded down?", "You can only buy whole shares/lots, so we round down — that keeps your actual risk at or just below your target, never above it. The exact (unrounded) figure is shown in the worked example."],
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
          <div>
            <label style={toolLabel} htmlFor="ps-target">Target price (₹) — optional</label>
            <input id="ps-target" style={toolInput} inputMode="decimal" placeholder="e.g. 106" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
        </div>

        {perUnit === 0 ? (
          <p style={{ font: "400 12.5px Poppins", color: TC.red, margin: "16px 0 0" }}>Entry and stop can&apos;t be equal — there&apos;s no risk distance to size against.</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
              <Result label="Risk amount" value={`₹${fmt(riskAmt)}`} accent={TC.red} sub={`${rp}% of account`} />
              <Result label="Risk per unit (1R)" value={`₹${fmt(perUnit)}`} />
              <Result label="Position size" value={`${fmt(qty)} units`} accent={TC.yellow} sub={`exact ${fmt(qtyExact)}`} />
              <Result label="Position value" value={`₹${fmt(posValue)}`} accent={TC.green} />
              {hasTarget && <Result label="Potential profit" value={`₹${fmt(potentialProfit)}`} accent={TC.green} sub={`${fmt(rr)}R reward:risk`} />}
            </div>

            <p style={{ font: "400 13px/1.6 Poppins", color: TC.muted, margin: "14px 0 0" }}>
              Buy <strong style={{ color: TC.text }}>{fmt(qty)} units</strong>. If your ₹{fmt(st)} stop is hit you lose
              <strong style={{ color: TC.red }}> ≈₹{fmt(actualLoss)}</strong> ({lossPct.toFixed(2)}% of your account).
              {hasTarget && <> If your ₹{fmt(tg)} target is hit you make <strong style={{ color: TC.green }}>≈₹{fmt(potentialProfit)}</strong> — a {fmt(rr)}R trade.</>}
            </p>

            <WorkedExample lines={worked} />
          </>
        )}
      </div>

      <Glossary
        items={[
          ["Risk per trade (%)", "The slice of your whole account you'll lose if this one trade hits its stop. 1% of a ₹1,00,000 account = ₹1,000 at risk."],
          ["1R / risk per unit", "Your risk on one share/lot — the gap between your entry and your stop. Everything is measured in multiples of this 'R'."],
          ["Risk:reward (R:R)", "How many times your risk you stand to make if the target hits. A ₹2 risk and ₹6 reward = 3R, i.e. 1:3 risk:reward."],
        ]}
      />
    </ToolPage>
  );
}
