"use client";

import { useMemo, useState } from "react";
import ToolPage, { toolCard, toolInput, toolLabel, TC, WorkedExample, Glossary } from "@/components/tools/ToolPage";

const RELATED = [
  { href: "/tools/position-size-calculator", label: "Position Size Calculator" },
  { href: "/tools/r-multiple-calculator", label: "R-Multiple Calculator" },
  { href: "/tools/breakeven-win-rate-calculator", label: "Breakeven Win-Rate" },
  { href: "/tools/pnl-calculator", label: "Profit / Loss Calculator" },
];

// Small seedable PRNG so the same inputs ALWAYS produce the same result
// (the old version used Math.random, so the number jiggled on every keystroke
// and looked unreliable). Deterministic = trustworthy.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Monte Carlo estimate of risk of ruin: simulate many sequences of trades using
   fixed-fractional risk on current equity; count how often equity falls below
   the ruin threshold within the trade horizon. */
function simulateRoR({ winRate, payoff, riskPct, ruinDrawdown, trades }, runs = 5000) {
  const p = winRate / 100;
  const risk = riskPct / 100;
  const ruinLevel = 1 - ruinDrawdown / 100;
  // seed derived from the inputs → deterministic output for a given scenario
  const seed = Math.round((winRate * 7 + payoff * 13 + riskPct * 31 + ruinDrawdown * 17 + trades) * 1000);
  const rand = mulberry32(seed);
  let ruined = 0;
  for (let r = 0; r < runs; r++) {
    let eq = 1;
    for (let t = 0; t < trades; t++) {
      const stake = eq * risk;
      eq += rand() < p ? stake * payoff : -stake;
      if (eq <= ruinLevel) { ruined++; break; }
    }
  }
  return (ruined / runs) * 100;
}

export default function RiskOfRuinCalculator() {
  const [winRate, setWinRate] = useState("45");
  const [payoff, setPayoff] = useState("2");
  const [riskPct, setRiskPct] = useState("2");
  const [ruinDrawdown, setRuinDrawdown] = useState("50");
  const [trades, setTrades] = useState("200");

  const num = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };
  const inputs = {
    winRate: Math.min(100, Math.max(0, num(winRate))),
    payoff: Math.max(0, num(payoff)),
    riskPct: Math.min(100, Math.max(0.01, num(riskPct))),
    ruinDrawdown: Math.min(99, Math.max(1, num(ruinDrawdown))),
    trades: Math.min(2000, Math.max(1, Math.round(num(trades)))),
  };

  const ror = useMemo(() => simulateRoR(inputs), [inputs.winRate, inputs.payoff, inputs.riskPct, inputs.ruinDrawdown, inputs.trades]);
  const p = inputs.winRate / 100;
  const expectancyR = p * inputs.payoff - (1 - p);
  const rorColor = ror < 5 ? TC.green : ror < 25 ? TC.yellow : TC.red;
  const verdict = ror < 5 ? "Low risk — survivable" : ror < 25 ? "Caution — consider smaller size" : "Dangerous — reduce risk per trade";
  const fmt = (n) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  const worked = [
    `Expectancy = (win% × reward) − loss% = (${fmt(inputs.winRate)}% × ${fmt(inputs.payoff)}R) − ${fmt(100 - inputs.winRate)}%`,
    `Expectancy = ${fmt(p * inputs.payoff)} − ${fmt(1 - p)} = ${expectancyR >= 0 ? "+" : ""}${fmt(expectancyR)}R per trade`,
    `Risk of ruin ≈ ${ror.toFixed(1)}% — share of 5,000 simulated ${inputs.trades}-trade runs that fell ${inputs.ruinDrawdown}% from the start while risking ${fmt(inputs.riskPct)}% each trade`,
  ];

  return (
    <ToolPage
      slug="risk-of-ruin-calculator"
      h1="Risk of Ruin Calculator"
      title="Risk of Ruin Calculator (Free) — Will You Blow Up? | JournalX"
      description="Free risk-of-ruin calculator. Enter your win rate, reward:risk and risk per trade to see the probability of blowing your account — a Monte Carlo simulation, run in your browser."
      keywords={["risk of ruin calculator", "risk of ruin", "probability of ruin trading", "blow up account probability", "monte carlo trading", "trading risk calculator"]}
      intro="Enter your win rate, reward-to-risk and how much you risk per trade. This runs a Monte Carlo simulation (thousands of trade sequences) to estimate the probability your account hits the ruin level before your edge plays out."
      explainer={[
        { h: "What is risk of ruin?", p: "Risk of ruin is the probability that a string of losses drains your account past a point you define as 'ruined' (here, a chosen drawdown). Even a profitable edge can blow up if you risk too much per trade — variance gets there before your edge does." },
        { h: "How this calculator works", p: "It simulates thousands of sequences of trades using fixed-fractional risk on your current equity. Each trade wins (gaining reward × risk) or loses (−risk) based on your win rate, and a sequence counts as 'ruined' if equity falls below your drawdown threshold. The percentage shown is how often that happened. The simulation is deterministic — the same inputs always give the same answer." },
        { h: "The lesson", p: "Notice how dropping risk per trade from 5% to 1% collapses your risk of ruin even with the same edge. That's why position sizing — not entries — is what keeps traders in the game. JournalX tracks your real win rate and R so these inputs come from your actual data, not guesses." },
      ]}
      faqs={[
        ["What is a safe risk of ruin?", "Under 5% is generally considered survivable for the horizon you set; above ~25% you're very likely to hit your ruin level before your edge compounds. Lower is always better."],
        ["How do I reduce my risk of ruin?", "The fastest lever is risking less per trade (e.g., 1% instead of 3–5%). Improving win rate or reward:risk helps too, but position size has the biggest, most reliable effect."],
        ["Where do I get my win rate and reward:risk?", "From your trading journal. JournalX computes your real win rate, average R-multiple and expectancy from your logged trades, so you can plug in accurate numbers instead of guessing."],
      ]}
      related={RELATED}
    >
      <div style={{ ...toolCard }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <div>
            <label style={toolLabel} htmlFor="rr-win">Win rate (%)</label>
            <input id="rr-win" style={toolInput} inputMode="decimal" value={winRate} onChange={(e) => setWinRate(e.target.value)} />
          </div>
          <div>
            <label style={toolLabel} htmlFor="rr-payoff">Reward : risk (R)</label>
            <input id="rr-payoff" style={toolInput} inputMode="decimal" value={payoff} onChange={(e) => setPayoff(e.target.value)} />
          </div>
          <div>
            <label style={toolLabel} htmlFor="rr-risk">Risk per trade (%)</label>
            <input id="rr-risk" style={toolInput} inputMode="decimal" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
          </div>
          <div>
            <label style={toolLabel} htmlFor="rr-dd">Ruin = drawdown of (%)</label>
            <input id="rr-dd" style={toolInput} inputMode="decimal" value={ruinDrawdown} onChange={(e) => setRuinDrawdown(e.target.value)} />
          </div>
          <div>
            <label style={toolLabel} htmlFor="rr-trades">Over how many trades</label>
            <input id="rr-trades" style={toolInput} inputMode="decimal" value={trades} onChange={(e) => setTrades(e.target.value)} />
          </div>
        </div>

        <div style={{ ...toolCard, marginTop: 18, textAlign: "center", background: "rgba(13,17,23,0.6)" }}>
          <div style={{ font: "400 12px Poppins", color: TC.dim, marginBottom: 6 }}>Estimated risk of ruin</div>
          <div style={{ font: "800 44px Poppins", color: rorColor, letterSpacing: "-1.5px" }}>{ror.toFixed(1)}%</div>
          <div style={{ font: "600 14px Poppins", color: rorColor, marginTop: 4 }}>{verdict}</div>
          <div style={{ font: "400 12px Poppins", color: TC.dim, marginTop: 8 }}>
            Per-trade expectancy: {expectancyR >= 0 ? "+" : ""}{expectancyR.toFixed(2)}R · {inputs.trades} trades · Monte Carlo (5,000 runs)
          </div>
          {expectancyR < 0 && (
            <div style={{ font: "400 12px Poppins", color: TC.red, marginTop: 8 }}>
              Your edge is negative — no position size makes this safe long-term. Fix the strategy first.
            </div>
          )}
        </div>

        <WorkedExample lines={worked} />
      </div>

      <Glossary
        items={[
          ["Win rate", "The share of your trades that are winners. 45% means roughly 45 of every 100 trades make money."],
          ["Reward : risk (R)", "How big your average winner is versus your risk. 2R means a typical win is twice what you risk on the trade."],
          ["Expectancy", "Average profit per trade in R = (win% × reward) − loss%. Positive means the strategy makes money over time; negative means it loses, no matter how you size it."],
          ["Risk of ruin", "The chance a losing streak drains your account to your 'ruin' line (the drawdown you set) before your edge pays off. Lower is safer."],
          ["Monte Carlo", "Instead of one guess, we replay thousands of randomised trade sequences with your numbers and count how many blew up — a far more honest picture than a single average."],
        ]}
      />
    </ToolPage>
  );
}
