"use client";

import { useState } from "react";
import ToolPage, { toolCard, toolInput, toolLabel, TC } from "@/components/tools/ToolPage";

const RELATED = [
  { href: "/tools/position-size-calculator", label: "Position Size Calculator" },
  { href: "/tools/risk-of-ruin-calculator", label: "Risk of Ruin Calculator" },
];

export default function RMultipleCalculator() {
  const [dir, setDir] = useState("long");
  const [entry, setEntry] = useState("100");
  const [stop, setStop] = useState("98");
  const [exit, setExit] = useState("106");

  const num = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };
  const en = num(entry), st = num(stop), ex = num(exit);
  const sign = dir === "long" ? 1 : -1;
  const riskPerUnit = Math.abs(en - st);
  const pnlPerUnit = (ex - en) * sign;
  const rMultiple = riskPerUnit > 0 ? pnlPerUnit / riskPerUnit : 0;
  const fmt = (n) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const rColor = rMultiple >= 0 ? TC.green : TC.red;

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
      slug="r-multiple-calculator"
      h1="R-Multiple Calculator"
      title="R-Multiple Calculator (Free) — Risk/Reward in R | JournalX"
      description="Free R-multiple calculator. Enter your entry, stop and exit to get the R-multiple of any trade — the single best way to measure performance independent of position size."
      keywords={["r multiple calculator", "r-multiple calculator", "risk reward calculator", "what is r multiple", "rr ratio calculator", "trading expectancy"]}
      intro="Enter your entry, stop and exit and get the trade's R-multiple — how many multiples of your risk you made or lost. Thinking in R instead of rupees is how professionals compare trades fairly across any size or instrument."
      explainer={[
        { h: "What is an R-multiple?", p: "1R is the amount you risked on a trade — the distance from entry to stop. If you risk ₹2 per share and make ₹6, that's a +3R trade. Losing your full stop is −1R. R turns every trade onto the same scale, so a ₹500 trade and a ₹5,000 trade are directly comparable." },
        { h: "Why pros track R, not rupees", p: "Rupee P&L is distorted by position size; R is pure performance. A trader averaging +0.4R per trade with a 45% win rate is profitable and scalable — something the raw P&L number alone can hide." },
        { h: "R + expectancy", p: "String your R-multiples together and you get expectancy: your average R per trade. Positive expectancy means more size compounds you; negative means it just speeds up the damage. JournalX computes your R distribution and expectancy automatically from your logged trades." },
      ]}
      faqs={[
        ["How is R-multiple calculated?", "R-multiple = profit or loss ÷ initial risk. Initial risk is the distance from entry to stop. Example: entry ₹100, stop ₹98 (risk ₹2), exit ₹106 (profit ₹6) = +3R."],
        ["What is a good R-multiple?", "There's no single 'good' number — it depends on your win rate. With a 40% win rate you need winners averaging well above 1.5R to be profitable; with 60% you can profit on smaller R. Track both together."],
        ["What does a negative R mean?", "A negative R means a losing trade. −1R is a full stop-loss hit; −0.5R means you exited for half your planned risk. Losses bigger than −1R mean you're not respecting your stop."],
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
            <label style={toolLabel} htmlFor="rm-entry">Entry price (₹)</label>
            <input id="rm-entry" style={toolInput} inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} />
          </div>
          <div>
            <label style={toolLabel} htmlFor="rm-stop">Stop-loss price (₹)</label>
            <input id="rm-stop" style={toolInput} inputMode="decimal" value={stop} onChange={(e) => setStop(e.target.value)} />
          </div>
          <div>
            <label style={toolLabel} htmlFor="rm-exit">Exit price (₹)</label>
            <input id="rm-exit" style={toolInput} inputMode="decimal" value={exit} onChange={(e) => setExit(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
          <Result label="Risk per unit (1R)" value={`₹${fmt(riskPerUnit)}`} />
          <Result label="P&L per unit" value={`₹${fmt(pnlPerUnit)}`} accent={pnlPerUnit >= 0 ? TC.green : TC.red} />
          <Result label="R-multiple" value={`${rMultiple >= 0 ? "+" : ""}${fmt(rMultiple)}R`} accent={rColor} />
        </div>
        {riskPerUnit === 0 && (
          <p style={{ font: "400 12px Poppins", color: TC.red, margin: "12px 0 0" }}>Entry and stop can't be equal — there's no risk to measure against.</p>
        )}
      </div>
    </ToolPage>
  );
}
