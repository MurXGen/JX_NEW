"use client";

/* Support & feedback modal.
   ───────────────────────────────────────────────────────────────────
   Submissions are sent to a Google Form, which writes rows to the
   linked Google Sheet. Google Forms don't allow reading the response
   cross-origin, so we POST with mode:"no-cors" (fire-and-forget), the
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
import { Bug, CheckCircle2, Clock, HelpCircle, Lightbulb, LifeBuoy, Loader2, MessageSquare, MoreHorizontal, Send, X } from "lucide-react";
import Kbd, { MOD } from "./Kbd";
import Button from "./Button";
import { responsesSignature, SUPPORT_LS_KEY, SUPPORT_VIEWS_TO_DISMISS } from "./useSupportBadge";

const CATEGORIES = ["Support", "Feedback", "Bug report", "Feature request", "Other"];
/* each category gets an icon and a prompt that tells people what's useful to include */
const CAT_INFO = {
  Support: { icon: HelpCircle, hint: "What are you trying to do, and where are you stuck?" },
  Feedback: { icon: MessageSquare, hint: "What do you like, and what would make JournalX better for you?" },
  "Bug report": { icon: Bug, hint: "What happened, what you expected, and the steps to make it happen again." },
  "Feature request": { icon: Lightbulb, hint: "What would you like to do, and how would it help your trading?" },
  Other: { icon: MoreHorizontal, hint: "Tell us what's on your mind." },
};

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

/* read the user's tickets, show their message and our reply (if any).
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
  const [tab, setTab] = useState("new"); // new | history

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
    setTab("new");
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
        // Not yet configured, fall back to opening the user's mail client
        // so feedback isn't silently lost.
        const subject = encodeURIComponent(`[${category}] JournalX feedback`);
        const body = encodeURIComponent(
          `${message.trim()}\n\n, \nFrom: ${user?.name || ""} <${user?.email || ""}>\nPlan: ${plan}`,
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

  // ⌘/Ctrl + Enter sends from anywhere in the form
  const onKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && tab === "new" && message.trim() && status !== "sending") submit(e);
  };
  const visibleTickets = hideAnswered ? tickets.filter((t) => !t.response) : tickets;
  const answeredCount = visibleTickets.filter((t) => t.response).length;
  const info = CAT_INFO[category] || CAT_INFO.Other;

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
            className="jx-ltmodal jx-ltmodal--narrow jx-ltmodal--popup jx-sup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sup-title"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onKey}
          >
            <div className="jx-sup__head">
              <span className="jx-sup__ico" aria-hidden="true"><LifeBuoy size={18} /></span>
              <div className="jx-sup__titles">
                <h2 id="sup-title">Support &amp; feedback</h2>
                <p>A real person reads every message.</p>
              </div>
              <button className="jx-sup__close" onClick={close} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            {status !== "done" && (
              <div className="jx-sup__tabs" role="tablist" aria-label="Support">
                <button type="button" role="tab" aria-selected={tab === "new"} onClick={() => setTab("new")}>
                  <Send size={14} aria-hidden="true" /> New message
                </button>
                <button type="button" role="tab" aria-selected={tab === "history"} onClick={() => setTab("history")}>
                  <Clock size={14} aria-hidden="true" /> My requests
                  {visibleTickets.length > 0 && <span className="jx-sup__count">{visibleTickets.length}</span>}
                  {answeredCount > 0 && <span className="jx-sup__dot" aria-label={`${answeredCount} answered`} />}
                </button>
              </div>
            )}

            {status === "done" ? (
              <div className="jx-sup__done">
                <span className="jx-sup__doneIco" aria-hidden="true"><CheckCircle2 size={26} /></span>
                <b>Message sent</b>
                <p>
                  Thanks! Your {category.toLowerCase()} is with the team. If it needs a reply we&apos;ll answer here under
                  {" "}<strong>My requests</strong>{user?.email ? <> and at {user.email}</> : null}.
                </p>
                <div className="jx-sup__doneBtns">
                  <button type="button" className="jx-btn jx-btn--secondary" onClick={() => { setMessage(""); setStatus("idle"); setTab("history"); }}>View my requests</button>
                  <Button variant="primary" onClick={close}>Done</Button>
                </div>
              </div>
            ) : tab === "history" ? (
              <div className="jx-sup__body">
                {loadingTickets && visibleTickets.length === 0 ? (
                  <div className="jx-sup__empty"><Loader2 size={16} className="jx-spin" aria-hidden="true" /> Loading your requests…</div>
                ) : visibleTickets.length === 0 ? (
                  <div className="jx-sup__empty">
                    <b>No requests yet</b>
                    <span>Anything you send appears here, with our reply once we&apos;ve answered.</span>
                    <button type="button" className="jx-btn jx-btn--secondary jx-btn--sm" onClick={() => setTab("new")}>Write a message</button>
                  </div>
                ) : (
                  <ul className="jx-sup__list">
                    {visibleTickets.map((tk, i) => {
                      const answered = !!tk.response;
                      return (
                        <li key={i} className="jx-sup__ticket" data-answered={answered || undefined}>
                          <div className="jx-sup__tickHead">
                            {tk.category ? <span className="jx-sup__cat">{tk.category}</span> : null}
                            <span className="jx-sup__status">{answered ? "Answered" : "Pending review"}</span>
                          </div>
                          <p className="jx-sup__msg">{tk.message}</p>
                          {answered && (
                            <div className="jx-sup__reply">
                              <span>JournalX team</span>
                              <p>{tk.response}</p>
                            </div>
                          )}
                          {tk.date ? <time className="jx-sup__date">{tk.date}</time> : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : (
              <form onSubmit={submit} className="jx-sup__form">
                <div className="jx-sup__body">
                  <div className="jx-sup__field">
                    <span className="jx-sup__label" id="sup-cat">What&apos;s this about?</span>
                    <div className="jx-sup__cats" role="radiogroup" aria-labelledby="sup-cat">
                      {CATEGORIES.map((c) => {
                        const Icon = CAT_INFO[c]?.icon || MoreHorizontal;
                        return (
                          <button type="button" key={c} role="radio" aria-checked={category === c} onClick={() => setCategory(c)}>
                            <Icon size={14} aria-hidden="true" /> {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="jx-sup__field">
                    <label className="jx-sup__label" htmlFor="sup-msg">Message<em className="jx-req" aria-hidden="true">*</em></label>
                    <textarea
                      id="sup-msg"
                      className="jx-sup__text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={info.hint}
                      rows={5}
                      maxLength={2000}
                      autoFocus
                    />
                    <div className="jx-sup__meta">
                      <span>{info.hint}</span>
                      <span>{message.length}/2000</span>
                    </div>
                  </div>

                  {status === "error" && (
                    <div className="jx-sup__error" role="alert">
                      Something went wrong. Please try again or email officialjournalx@gmail.com.
                    </div>
                  )}
                </div>

                <div className="jx-sup__foot">
                  <span className="jx-sup__from">
                    {user?.email ? <>Sending as <b>{user.name || user.email}</b>{user.name ? <> · {user.email}</> : null}</> : "We'll reply by email"}
                  </span>
                  <span className="jx-sup__keys"><Kbd combo={[MOD, "↵"]} /> to send</span>
                  <Button type="submit" variant="primary" icon={status === "sending" ? undefined : Send} disabled={!message.trim() || status === "sending"}>
                    {status === "sending" ? <><Loader2 size={15} className="jx-spin" aria-hidden="true" /> Sending…</> : "Send"}
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
