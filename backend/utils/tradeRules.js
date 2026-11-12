/* Trading rules: a user's personal checklist (Settings → Trading rules) and
   the per-trade record of which rules were followed.

   Status of a trade against the rules:
     "yes"     every rule ticked
     "partial" some ticked
     "no"      none ticked
     ""        not tracked (no rules answered)
   rulesFollowed (Boolean, legacy + CSV yes/no) stays true only for "yes". */

const MAX_RULES = 15;
const MAX_TEXT = 140;

function cleanRules(input) {
  if (!Array.isArray(input)) return null;
  const seen = new Set();
  const out = [];
  for (const r of input) {
    const text = String(r?.text ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
    if (!text) continue;
    let id = String(r?.id ?? "").trim().slice(0, 40);
    if (!/^[A-Za-z0-9_-]{4,40}$/.test(id) || seen.has(id)) id = `r_${Math.random().toString(36).slice(2, 10)}`;
    seen.add(id);
    out.push({ id, text });
    if (out.length >= MAX_RULES) break;
  }
  return out;
}

function statusFromChecks(checks) {
  if (!Array.isArray(checks) || !checks.length) return "";
  const n = checks.filter((c) => c.checked).length;
  return n === checks.length ? "yes" : n === 0 ? "no" : "partial";
}

/* Normalise rule fields from a create/update request body (multipart, so
   values arrive as strings). Returns the fields to set on the trade. */
function ruleFieldsFromBody(body) {
  let checks = body.ruleChecks;
  if (typeof checks === "string") {
    try { checks = JSON.parse(checks); } catch { checks = null; }
  }
  if (Array.isArray(checks) && checks.length) {
    const ruleChecks = checks.slice(0, MAX_RULES).map((c) => ({
      ruleId: String(c?.ruleId ?? "").slice(0, 40),
      text: String(c?.text ?? "").slice(0, MAX_TEXT),
      checked: c?.checked === true || c?.checked === "true",
    })).filter((c) => c.text);
    const rulesStatus = statusFromChecks(ruleChecks);
    return { ruleChecks, rulesStatus, rulesFollowed: rulesStatus === "yes" };
  }
  // no checklist: plain Yes / No (or not answered)
  const raw = String(body.rulesStatus ?? body.rulesFollowed ?? "").toLowerCase();
  const rulesStatus = ["yes", "true"].includes(raw) ? "yes" : raw === "partial" ? "partial" : ["no", "false"].includes(raw) ? "no" : "";
  return { ruleChecks: [], rulesStatus, rulesFollowed: rulesStatus === "yes" };
}

/* CSV "followedPlan" column: yes / partial / no (also true/1/y, false/0/n). */
function statusFromCsv(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (["yes", "true", "1", "y", "all"].includes(s)) return "yes";
  if (["partial", "partly", "some", "p"].includes(s)) return "partial";
  if (["no", "false", "0", "n", "none"].includes(s)) return "no";
  return "";
}

module.exports = { cleanRules, statusFromChecks, ruleFieldsFromBody, statusFromCsv, MAX_RULES, MAX_TEXT };
