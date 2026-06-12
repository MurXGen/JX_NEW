/* Support badge — shows a red dot when the team has left a NEW response for
   the user (read from the published support sheet). The dot hides after the
   user has opened the modal twice for that set of responses, and reappears
   whenever a new/changed response shows up. State persists in localStorage. */
import { useCallback, useEffect, useState } from "react";

const SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTbYjCOa_wP4sOeuqHLEWvU_caNxc1CwPBt2ssjEKcHwCKvZwqycSw5vSImh-mYnHlu6c7oaxS6RwP5/pub?output=csv";
export const SUPPORT_LS_KEY = "jx-support-badge";
export const SUPPORT_VIEWS_TO_DISMISS = 2;
const LS_KEY = SUPPORT_LS_KEY;
const VIEWS_TO_DISMISS = SUPPORT_VIEWS_TO_DISMISS;

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  const s = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); field = ""; rows.push(row); row = []; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}
const idxOf = (h, ...keys) => h.findIndex((x) => keys.some((k) => x.includes(k)));

/* the team's responses for this user (only rows that actually have a reply) */
function responsesFor(csv, email) {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => String(h).trim().toLowerCase());
  const iEmail = idxOf(headers, "email");
  const iResp = idxOf(headers, "response", "resolution", "reply");
  const me = String(email || "").trim().toLowerCase();
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const rEmail = iEmail >= 0 ? String(r[iEmail] || "").trim().toLowerCase() : "";
    if (!me || rEmail !== me) continue;
    const resp = iResp >= 0 ? String(r[iResp] || "").trim() : "";
    if (resp) out.push(resp);
  }
  return out;
}
/* order-independent signature of the responses (so the modal and the badge
   compute the same value regardless of row order) */
export function responsesSignature(list) {
  const s = list.slice().sort().join("|");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `${list.length}:${h}`;
}
const sigOf = responsesSignature;
const readLS = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; } };
const writeLS = (v) => { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch {} };

export function useSupportBadge(email) {
  const [showDot, setShowDot] = useState(false);
  const [sig, setSig] = useState(null);
  const [hasMsgs, setHasMsgs] = useState(false);

  const evaluate = useCallback(async () => {
    if (!email) return;
    try {
      const r = await fetch(`${SHEET_CSV}&t=${Date.now()}`);
      const csv = await r.text();
      const responses = responsesFor(csv, email);
      const s = sigOf(responses);
      setSig(s);
      setHasMsgs(responses.length > 0);
      const st = readLS();
      const views = st.sig === s ? st.views || 0 : 0;
      setShowDot(responses.length > 0 && views < VIEWS_TO_DISMISS);
    } catch {
      /* sheet unreachable — leave the dot off */
    }
  }, [email]);

  useEffect(() => { evaluate(); }, [evaluate]);

  // call when the user opens the support modal (counts as one "view")
  const markViewed = useCallback(() => {
    if (!sig) return;
    const st = readLS();
    const views = st.sig === sig ? Math.min((st.views || 0) + 1, 99) : 1;
    writeLS({ sig, views });
    setShowDot(hasMsgs && views < VIEWS_TO_DISMISS);
  }, [sig, hasMsgs]);

  return { showDot, markViewed, refresh: evaluate };
}
