"use client";

import { useState } from "react";
import ToolPage, { toolCard, toolInput, toolLabel, TC, WorkedExample, Glossary } from "@/components/tools/ToolPage";

const RELATED = [
  { href: "/tools/r-multiple-calculator", label: "R-Multiple Calculator" },
  { href: "/tools/position-size-calculator", label: "Position Size Calculator" },
  { href: "/tools/pnl-calculator", label: "Profit / Loss Calculator" },
  { href: "/tools/risk-of-ruin-calculator", label: "Risk of Ruin Calculator" },
];

export default function BreakevenWinRateCalculator() {
  const [rr, setRr] = useState("2");        // reward : risk (R)
  const [winRate, setWinRate] = useState("45"); // your actual win rate (optional)

  const num = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };
  const R = Math.max(0, num(rr));
  const wr = Math.min(100, Math.max(0, num(winRate)));

  // Break even when p·R − (1−p) = 0  →  p = 1 / (1 + R)
  const beWinRate = R > 0 ? (1 / (1 + R)) * 100 : 100;
  const p = wr / 100;
  const expectancyR = p * R - (1 - p);
  const profitable = wr > beWinRate;
  const fmt = (n) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const eColor = expectancyR >= 0 ? TC.green : TC.red;

  const worked = R > 0
    ? [
        `Breakeven win rate = 1 ÷ (1 + reward:risk) = 1 ÷ (1 + ${fmt(R)}) = ${fmt(beWinRate / 100)}`,
        `= ${fmt(beWinRate)}% — above this win rate, this reward:risk makes money`,
        `Your expectancy = (win% × R) − loss% = (${fmt(wr)}% × ${fmt(R)}) − ${fmt(100 - wr)}% = ${expectancyR >= 0 ? "+" : ""}${fmt(expectancyR)}R per trade`,
      ]
    : [];

  const Result = ({ label, value, accent, sub }) => (
    <div style={{ ...toolCard, padding: 16, flex: 1, minWidth: 150 }}>
      <div style={{ font: "400 12px Poppins", color: TC.dim, marginBottom: 4 }}>{label}</div>
      <div style={{ font: "700 22px Poppins", color: accent || TC.text, letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ font: "400 11.5px Poppins", color: TC.dim, marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <ToolPage
      slug="breakeven-win-rate-calculator"
      h1="Breakeven Win-Rate Calculator"
      title="Breakeven Win-Rate Calculator (Free) — Win Rate vs Risk:Reward | JournalX"
      description="Free breakeven win-rate calculator. Enter your reward:risk to see the win rate you need just to break even — and whether your actual win rate gives you a real edge."
      keywords={["breakeven win rate calculator", "win rate calculator trading", "risk reward win rate", "minimum win rate calculator", "trading expectancy calculator", "win rate vs risk reward"]}
      intro="A higher reward:risk needs a lower win rate to make money — and vice-versa. Enter your reward:risk to see the win rate you must beat just to break even, then add your real win rate to see if you actually have an edge."
      explainer={[
        { h: "Win rate and reward:risk are a pair", p: "Neither number means anything alone. A 35% win rate is excellent at 3R reward:risk, but a losing strategy at 1R. This tool ties them together so you stop chasing 'high win rate' for its own sake." },
        { h: "The breakeven line", p: "With reward:risk R, you break even at a win rate of 1 ÷ (1 + R). At 1R you need 50%; at 2R only 33.3%; at 3R just 25%. Beat that line and you're profitable; fall short and you bleed, however good it feels." },
        { h: "Turn it into expectancy", p: "Above the line, your edge is positive expectancy — average R per trade. JournalX measures your real win rate and average R from logged trades, so you can see whether your live edge matches the plan." },
      ]}
      faqs={[
        ["What win rate do I need to be profitable?", "It depends on your reward:risk. Breakeven win rate = 1 ÷ (1 + reward:risk). At 2R you only need to win about 33.3% of trades to break even; anything above is profit."],
        ["Is a high win rate good?", "Not on its own. A 70% win rate with tiny winners and big losers loses money. Always read win rate together with reward:risk and expectancy."],
        ["What is expectancy?", "Your average result per trade in R: (win% × reward) − loss%. Positive expectancy means the strategy makes money over many trades; negative means it doesn't, regardless of size."],
      ]}
      related={RELATED}
    >
      <div style={{ ...toolCard }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <div>
            <label style={toolLabel} htmlFor="bw-rr">Reward : risk (R)</label>
            <input id="bw-rr" style={toolInput} inputMode="decimal" value={rr} onChange={(e) => setRr(e.target.value)} />
          </div>
          <div>
            <label style={toolLabel} htmlFor="bw-wr">Your win rate (%) — optional</label>
            <input id="bw-wr" style={toolInput} inputMode="decimal" value={winRate} onChange={(e) => setWinRate(e.target.value)} />
          </div>
        </div>

        {R <= 0 ? (
          <p style={{ font: "400 12.5px Poppins", color: TC.red, margin: "16px 0 0" }}>Enter a reward:risk above 0 (e.g. 2 means a typical winner is twice your risk).</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
              <Result label="Breakeven win rate" value={`${fmt(beWinRate)}%`} accent={TC.yellow} sub={`at ${fmt(R)}R reward:risk`} />
              <Result label="Your expectancy" value={`${expectancyR >= 0 ? "+" : ""}${fmt(expectancyR)}R`} accent={eColor} sub="per trade" />
              <Result label="Edge" value={profitable ? "Positive ✓" : "Negative ✗"} accent={profitable ? TC.green : TC.red} />
            </div>

            <p style={{ font: "400 13px/1.6 Poppins", color: TC.muted, margin: "14px 0 0" }}>
              At {fmt(R)}R you need to win <strong style={{ color: TC.yellow }}>{fmt(beWinRate)}%</strong> of trades just to break even.
              {" "}Your {fmt(wr)}% win rate is <strong style={{ color: profitable ? TC.green : TC.red }}>{profitable ? "above" : "below"}</strong> that —
              {" "}{profitable ? "you have a real edge." : "this combination loses money over time."}
            </p>

            <WorkedExample lines={worked} />
          </>
        )}
      </div>

      <Glossary
        items={[
          ["Reward : risk (R)", "How big your typical winner is versus your risk. 2R means you aim to make twice what you risk on each trade."],
          ["Breakeven win rate", "The minimum win rate that makes a given reward:risk neither win nor lose money: 1 ÷ (1 + reward:risk)."],
          ["Expectancy", "Average profit per trade in R = (win% × reward) − loss%. Positive = the strategy makes money over time."],
          ["Edge", "Whether your real win rate clears the breakeven line for your reward:risk. Positive edge = profitable; negative = a leak."],
        ]}
      />
    </ToolPage>
  );
}
