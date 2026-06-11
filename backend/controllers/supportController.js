/* Support tickets — reads the Google Sheet that the support Form writes to,
   filters to the logged-in user's email, and returns the UNRESOLVED ones
   (rows whose "resolution" column is still empty). Once the team fills in a
   resolution, the ticket drops off the user's open-requests list. */
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));
const User = require("../models/User");

const SHEET_ID = "1Ic3eddutmHc_Wjrv-8L9ypr3HEkNA8NZFwFG5rrSdOg";
// gviz CSV export works for sheets shared as "anyone with the link can view"
const SHEET_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

/* minimal CSV parser (handles quotes, escaped quotes, embedded commas/newlines) */
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

const idxOf = (headers, ...keys) =>
  headers.findIndex((h) => keys.some((k) => h.includes(k)));

exports.getSupportTickets = async (req, res) => {
  try {
    const userId = req.cookies.userId;
    if (!userId)
      return res.status(401).json({ success: false, message: "Not authenticated" });

    const user = await User.findById(userId).select("email");
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });
    const email = (user.email || "").trim().toLowerCase();

    let csv = "";
    try {
      const r = await fetch(SHEET_CSV, { redirect: "follow" });
      if (!r.ok) throw new Error(`sheet ${r.status}`);
      csv = await r.text();
    } catch (e) {
      // sheet unreachable / not shared — fail soft so the modal still works
      return res.json({ success: true, tickets: [] });
    }

    const rows = parseCsv(csv);
    if (rows.length < 2) return res.json({ success: true, tickets: [] });

    const headers = rows[0].map((h) => String(h).trim().toLowerCase());
    const iEmail = idxOf(headers, "email");
    // prefer a dedicated "support message" column, else the form's "message"
    let iMsg = headers.findIndex((h) => h.includes("support message"));
    if (iMsg === -1) iMsg = idxOf(headers, "message");
    const iRes = idxOf(headers, "resolution", "resolved", "response", "reply");
    const iCat = idxOf(headers, "category");
    const iTime = idxOf(headers, "timestamp", "date");

    const tickets = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rEmail = iEmail >= 0 ? String(row[iEmail] || "").trim().toLowerCase() : "";
      if (!rEmail || rEmail !== email) continue;
      const resolution = iRes >= 0 ? String(row[iRes] || "").trim() : "";
      if (resolution) continue; // resolved → hidden from the user
      tickets.push({
        category: iCat >= 0 ? String(row[iCat] || "").trim() : "",
        message: iMsg >= 0 ? String(row[iMsg] || "").trim() : "",
        date: iTime >= 0 ? String(row[iTime] || "").trim() : "",
      });
    }
    tickets.reverse(); // newest first (Form appends to the bottom)
    res.json({ success: true, tickets });
  } catch (err) {
    console.error("getSupportTickets error:", err.message);
    res.json({ success: true, tickets: [] });
  }
};
