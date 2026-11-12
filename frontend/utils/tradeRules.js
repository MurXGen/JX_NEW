/* Trading rules helpers shared by Settings, Log/Edit trade and analytics.

   A trade's rule status:
     "yes"     every rule ticked        → followed
     "partial" some ticked              → partly followed
     "no"      none ticked              → rules broken
     ""        not tracked
   Older trades only have rulesFollowed (true/false); they map to yes/no. */

export const MAX_RULES = 15;
export const MAX_RULE_TEXT = 140;

export const RULE_SUGGESTIONS = [
  "Waited for my setup to confirm",
  "Risked 1% or less of my account",
  "Set my stop-loss before entering",
  "Took profit at my planned target",
  "No revenge trade after a loss",
  "Traded only during my session",
];

export const STATUS_META = {
  yes: { label: "Followed", long: "All rules followed", tone: "pos" },
  partial: { label: "Partial", long: "Some rules followed", tone: "mid" },
  no: { label: "Broken", long: "No rules followed", tone: "neg" },
  "": { label: "Not tracked", long: "Not tracked", tone: "none" },
};

export function statusFromChecks(checks) {
  if (!Array.isArray(checks) || !checks.length) return "";
  const n = checks.filter((c) => c.checked).length;
  return n === checks.length ? "yes" : n === 0 ? "no" : "partial";
}

export function ruleStatusOf(t) {
  if (!t) return "";
  if (t.rulesStatus === "yes" || t.rulesStatus === "partial" || t.rulesStatus === "no") return t.rulesStatus;
  if (Array.isArray(t.ruleChecks) && t.ruleChecks.length) return statusFromChecks(t.ruleChecks);
  if (t.rulesFollowed === true || t.rulesFollowed === "true") return "yes";
  if (t.rulesFollowed === false || t.rulesFollowed === "false") return "no";
  return "";
}

export const newRuleId = () => `r_${Math.random().toString(36).slice(2, 10)}`;

/* Per-rule stats across trades that carry a checklist: how often each rule
   was broken and what those trades averaged vs. when it was kept. */
export function ruleBreakdown(trades) {
  const by = new Map();
  for (const t of trades) {
    if (!Array.isArray(t.ruleChecks)) continue;
    const pnl = Number(t.pnl) || 0;
    for (const c of t.ruleChecks) {
      const key = c.ruleId || c.text;
      if (!key) continue;
      if (!by.has(key)) by.set(key, { key, text: c.text, kept: 0, broken: 0, keptPnl: 0, brokenPnl: 0 });
      const e = by.get(key);
      e.text = c.text || e.text;
      if (c.checked) { e.kept++; e.keptPnl += pnl; } else { e.broken++; e.brokenPnl += pnl; }
    }
  }
  return [...by.values()]
    .map((e) => ({
      ...e,
      total: e.kept + e.broken,
      breakRate: e.kept + e.broken ? e.broken / (e.kept + e.broken) : 0,
      avgKept: e.kept ? e.keptPnl / e.kept : null,
      avgBroken: e.broken ? e.brokenPnl / e.broken : null,
    }))
    .sort((a, b) => b.broken - a.broken || b.breakRate - a.breakRate);
}
