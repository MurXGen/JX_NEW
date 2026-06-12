"use client";

/* Support & feedback modal.
   ───────────────────────────────────────────────────────────────────
   Submissions are sent to a Google Form, which writes rows to the
   linked Google Sheet. Google Forms don't allow reading the response
   cross-origin, so we POST with mode:"no-cors" (fire-and-forget) — the
   request still lands in the sheet.

   ▶ TO WIRE THIS UP, fill in the config below:
     1. Create your Google Form with these questions (any types are fine):
          • Category        (short answer / multiple choice)
          • Message         (paragraph)
          • Email           (short answer)
          • Name            (short answer)
          • Plan            (short answer)
     2. Open the form → ⋮ → "Get pre-filled link", fill dummy values,
        copy the link. Each field shows as entry.XXXXXXX=value.
     3. Paste the form's POST URL and each entry ID below.

   The POST URL looks like:
     https://docs.google.com/forms/d/e/<LONG_ID>/formResponse
   ─────────────────────────────────────────────────────────────────── */
const GOOGLE_FORM = {
  actionUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSeosaJAbSxvkpXbhiiw-Dm9QOYS0BfYN5hygLiH2IMq1cApKw/formResponse",
  // Mapped in the order the entries appear in the pre-fill URL, matching the
  // suggested question order: Category, Message, Email, Name, Plan.
  entries: {
    category: "entry.328676108",
    message: "entry.1405331720",
    email: "entry.1963206462",
    name: "entry.191488008",
    plan: "entry.1950424137",
  },
};

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, LifeBuoy, Loader2, Send, X } from "lucide-react";
import Button from "./Button";
import { responsesSignature, SUPPORT_LS_KEY, SUPPORT_VIEWS_TO_DISMISS } from "./useSupportBadge";

const CATEGORIES = ["Support", "Feedback", "Bug report", "Feature request", "Other"];

// the support sheet, published to the web as CSV (read directly in the browser)
const SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTbYjCOa_wP4sOeuqHLEWvU_caNxc1CwPBt2ssjEKcHwCKvZwqycSw5vSImh-mYnHlu6c7oaxS6RwP5/pub?output=csv";

/* tiny CSV parser (quotes, escaped quotes, embedded commas/newlines) */
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
const idxOf = (headers, ...keys) => headers.findIndex((h) => keys.some((k) => h.includes(k)));

/* read the user's tickets — show their message and our reply (if any).
   The "Responses" column holds the team's reply; empty = still pending. */
function ticketsForUser(csv, email) {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => String(h).trim().toLowerCase());
  const iEmail = idxOf(headers, "email");
  let iMsg = headers.findIndex((h) => h.includes("support message"));
  if (iMsg === -1) iMsg = idxOf(headers, "message");
  const iResp = idxOf(headers, "response", "resolution", "reply");
  const iCat = idxOf(headers, "category");
  const iTime = idxOf(headers, "timestamp", "date");
  const me = String(email || "").trim().toLowerCase();
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rEmail = iEmail >= 0 ? String(row[iEmail] || "").trim().toLowerCase() : "";
    if (!me || rEmail !== me) continue;
    out.push({
      category: iCat >= 0 ? String(row[iCat] || "").trim() : "",
      message: iMsg >= 0 ? String(row[iMsg] || "").trim() : "",
      response: iResp >= 0 ? String(row[iResp] || "").trim() : "",
      date: iTime >= 0 ? String(row[iTime] || "").trim() : "",
    });
  }
  return out.reverse(); // newest first
}

export default function SupportModal({ open, onClose, user, plan = "free" }) {
  const [category, setCategory] = useState("Support");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  // once a user has viewed the modal enough times, hide answered tickets too
  const [hideAnswered, setHideAnswered] = useState(false);

  const configured = Boolean(GOOGLE_FORM.actionUrl && GOOGLE_FORM.entries.message);

  // load the user's open (unresolved) tickets from the support sheet
  const loadTickets = useCallback(async () => {
    if (!user?.email) { setTickets([]); return; }
    setLoadingTickets(true);
    try {
      // cache-bust so freshly-answered tickets drop off promptly
      const r = await fetch(`${SHEET_CSV}&t=${Date.now()}`);
      const csv = await r.text();
      const data = ticketsForUser(csv, user.email);
      setTickets(data);
      // if the user has already viewed these responses enough times, hide them
      const sig = responsesSignature(data.filter((t) => t.response).map((t) => t.response));
      let seenEnough = false;
      try {
        const st = JSON.parse(localStorage.getItem(SUPPORT_LS_KEY) || "{}");
        seenEnough = st.sig === sig && (st.views || 0) > SUPPORT_VIEWS_TO_DISMISS;
      } catch {}
      setHideAnswered(seenEnough);
    } catch {
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (open) loadTickets();
  }, [open, loadTickets]);

  const reset = () => {
    setCategory("Support");
    setMessage("");
    setStatus("idle");
  };

  const close = () => {
    if (status === "sending") return;
    onClose();
    // let the exit animation play before clearing
    setTimeout(reset, 250);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");

    try {
      if (configured) {
        const fd = new FormData();
        const { entries } = GOOGLE_FORM;
        if (entries.category) fd.append(entries.category, category);
        if (entries.message) fd.append(entries.message, message.trim());
        if (entries.email) fd.append(entries.email, user?.email || "");
        if (entries.name) fd.append(entries.name, user?.name || "");
        if (entries.plan) fd.append(entries.plan, plan);

        await fetch(GOOGLE_FORM.actionUrl, {
          method: "POST",
          mode: "no-cors",
          body: fd,
        });
      } else {
        // Not yet configured — fall back to opening the user's mail client
        // so feedback isn't silently lost.
        const subject = encodeURIComponent(`[${category}] JournalX feedback`);
        const body = encodeURIComponent(
          `${message.trim()}\n\n—\nFrom: ${user?.name || ""} <${user?.email || ""}>\nPlan: ${plan}`,
        );
        window.open(`mailto:officialjournalx@gmail.com?subject=${subject}&body=${body}`, "_blank");
      }
      setStatus("done");
      // the Form → Sheet write takes a moment to land; refresh the list shortly
      setTimeout(loadTickets, 4000);
    } catch {
      setStatus("error");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay jx-modal-overlay--blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="jx-ltmodal jx-ltmodal--narrow"
            style={{ width: "min(480px, 96vw)" }}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="jx-ltmodal__header">
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span
                  style={{
                    width: 36, height: 36, borderRadius: "var(--radius-md)",
                    background: "var(--color-primary-subtle)", color: "var(--yellow-500)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  <LifeBuoy size={18} />
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>Support &amp; feedback</span>
                  <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>
                    We read every message.
                  </span>
                </div>
              </div>
              <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={close} aria-label="Close" style={{ padding: 8 }}>
                <X size={16} />
              </button>
            </div>

            {status === "done" ? (
              <div style={{ padding: "var(--space-8) var(--space-6)", textAlign: "center", display: "flex", flexDirection: "column", gap: "var(--space-3)", alignItems: "center", flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
                <span style={{ font: "var(--text-h2)" }}>🎉</span>
                <span style={{ font: "var(--text-title)", fontWeight: 600 }}>Thanks for reaching out!</span>
                <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)", maxWidth: 320 }}>
                  Your {category.toLowerCase()} has been received. We&apos;ll get back to you at {user?.email || "your email"} if a reply is needed.
                </span>
                <Button variant="primary" onClick={close} style={{ marginTop: "var(--space-2)" }}>Done</Button>
              </div>
            ) : (
              <form onSubmit={submit} style={{ padding: "var(--space-5) var(--space-6) var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)", flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
                {/* the user's requests + our team's responses, from the support sheet */}
                {(() => {
                  const visibleTickets = hideAnswered ? tickets.filter((t) => !t.response) : tickets;
                  return (loadingTickets || visibleTickets.length > 0) ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "var(--color-bg-muted)", border: "1px solid var(--color-border)" }}>
                    <span style={{ font: "var(--text-small)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={13} /> Your requests &amp; responses
                      {loadingTickets && <Loader2 size={12} className="jx-spin" style={{ marginLeft: 4 }} />}
                    </span>
                    {visibleTickets.map((tk, i) => {
                      const answered = !!tk.response;
                      return (
                        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px", borderRadius: "var(--radius-sm)", background: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {tk.category ? <span className="jx-badge jx-badge--neutral">{tk.category}</span> : null}
                            <span style={{ marginLeft: "auto", font: "var(--text-caption)", fontWeight: 600, color: answered ? "var(--color-success-strong)" : "var(--yellow-500)" }}>
                              {answered ? "Answered" : "Pending review"}
                            </span>
                          </div>
                          <span style={{ font: "var(--text-small)", color: "var(--color-text-secondary)" }}>{tk.message}</span>
                          {answered && (
                            <div style={{ borderLeft: "3px solid var(--color-primary)", paddingLeft: 10, background: "var(--color-primary-subtle)", borderRadius: "0 var(--radius-sm) var(--radius-sm) 0", padding: "8px 10px" }}>
                              <span style={{ display: "block", font: "var(--text-caption)", fontWeight: 600, color: "var(--yellow-500)", marginBottom: 2 }}>JournalX team</span>
                              <span style={{ font: "var(--text-small)", color: "var(--color-text-primary)" }}>{tk.response}</span>
                            </div>
                          )}
                          {tk.date ? <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{tk.date}</span> : null}
                        </div>
                      );
                    })}
                  </div>
                  ) : null;
                })()}

                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  <label style={{ font: "var(--text-body-md)", fontWeight: 600 }}>What&apos;s this about?</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                    {CATEGORIES.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setCategory(c)}
                        className="jx-btn jx-btn--sm"
                        style={{
                          background: category === c ? "var(--color-primary)" : "var(--color-bg-muted)",
                          color: category === c ? "var(--color-primary-foreground)" : "var(--color-text-secondary)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  <label style={{ font: "var(--text-body-md)", fontWeight: 600 }}>Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what's on your mind…"
                    rows={5}
                    autoFocus
                    style={{
                      width: "100%", resize: "vertical", minHeight: 110,
                      background: "var(--color-bg-surface)", color: "var(--color-text-primary)",
                      border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)",
                      padding: "12px 14px", font: "var(--text-body)", outline: "none",
                    }}
                  />
                </div>

                {user?.email && (
                  <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                    Sending as {user.name ? `${user.name} · ` : ""}{user.email}
                  </span>
                )}

                {status === "error" && (
                  <div className="jx-toast jx-toast--danger" style={{ font: "var(--text-small)" }}>
                    Something went wrong. Please try again or email officialjournalx@gmail.com.
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  icon={Send}
                  disabled={!message.trim() || status === "sending"}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {status === "sending" ? "Sending…" : "Send message"}
                </Button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
