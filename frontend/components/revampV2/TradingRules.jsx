"use client";

/* Trading rules.
   - <TradingRules />   Settings editor: add, edit, reorder and remove the
                        user's personal rules; saved to their profile.
   - <RulesChecklist /> The checklist shown when logging or editing a trade.
                        Ticking every rule = followed, some = partial,
                        none = broken. */

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { ArrowDown, ArrowUp, Check, ListChecks, Loader2, Plus, Settings2, Trash2 } from "lucide-react";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { MAX_RULES, MAX_RULE_TEXT, RULE_SUGGESTIONS, STATUS_META, newRuleId, statusFromChecks } from "@/utils/tradeRules";
import r from "./TradingRules.module.css";

const API = process.env.NEXT_PUBLIC_API_URL;

/* read the user's rules from the cached profile; refresh when they change */
export function useTradingRules() {
  const [rules, setRules] = useState(null); // null = loading
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const u = await getFromIndexedDB("user-data");
        if (live) setRules(Array.isArray(u?.tradingRules) ? u.tradingRules : []);
      } catch {
        if (live) setRules([]);
      }
    };
    load();
    window.addEventListener("jx-rules-changed", load);
    return () => { live = false; window.removeEventListener("jx-rules-changed", load); };
  }, []);
  return rules;
}

/* ================= Settings editor ================= */
export default function TradingRules({ onToast }) {
  const saved = useTradingRules();
  const [list, setList] = useState([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const addRef = useRef(null);

  useEffect(() => { if (saved) setList(saved.map((x) => ({ ...x }))); }, [saved]);

  const clean = (arr) => arr.map((x) => ({ id: x.id, text: x.text.replace(/\s+/g, " ").trim() })).filter((x) => x.text);
  const dirty = useMemo(() => JSON.stringify(clean(list)) !== JSON.stringify(clean(saved || [])), [list, saved]);
  const full = list.length >= MAX_RULES;
  const unused = RULE_SUGGESTIONS.filter((s) => !list.some((x) => x.text.trim().toLowerCase() === s.toLowerCase()));

  const add = (text) => {
    const t = String(text || "").replace(/\s+/g, " ").trim().slice(0, MAX_RULE_TEXT);
    if (!t || full) return;
    if (list.some((x) => x.text.trim().toLowerCase() === t.toLowerCase())) { setError("That rule is already on your list."); return; }
    setError("");
    setList((l) => [...l, { id: newRuleId(), text: t }]);
  };
  const edit = (id, text) => setList((l) => l.map((x) => (x.id === id ? { ...x, text: text.slice(0, MAX_RULE_TEXT) } : x)));
  const remove = (id) => setList((l) => l.filter((x) => x.id !== id));
  const move = (i, d) => setList((l) => {
    const j = i + d;
    if (j < 0 || j >= l.length) return l;
    const n = [...l];
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  const save = async () => {
    const rules = clean(list);
    setSaving(true); setError("");
    try {
      const res = await axios.put(`${API}/api/auth/trading-rules`, { rules }, { withCredentials: true });
      const next = res.data?.tradingRules || rules;
      const u = (await getFromIndexedDB("user-data")) || {};
      await saveToIndexedDB("user-data", { ...u, tradingRules: next });
      window.dispatchEvent(new CustomEvent("jx-rules-changed"));
      onToast?.("success", next.length ? `Saved ${next.length} rule${next.length === 1 ? "" : "s"}` : "Rules cleared");
    } catch (e) {
      setError(e?.response?.data?.message || "Couldn't save your rules. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="jx-card jx-sub">
      <div className="jx-card__title jx-sub__dup">Trading rules</div>
      <div className="jx-sub__hero">
        <span className="jx-sub__heroIco" aria-hidden="true"><ListChecks size={20} /></span>
        <div>
          <h3>Your trading rules</h3>
          <p>Tick these on every trade you log. JournalX tracks how often you stick to them and what breaking them costs you.</p>
        </div>
      </div>

      {/* how a trade is scored */}
      <div className={r.legend} aria-label="How each trade is scored">
        <span><i data-tone="pos" aria-hidden="true" /> All ticked: <b>Followed</b></span>
        <span><i data-tone="mid" aria-hidden="true" /> Some ticked: <b>Partial</b></span>
        <span><i data-tone="neg" aria-hidden="true" /> None ticked: <b>Broken</b></span>
      </div>

      {saved === null ? (
        <div className={r.loading}><Loader2 size={16} className={r.spin} aria-hidden="true" /> Loading your rules…</div>
      ) : (
        <>
          <div className={r.listHead}>
            <span>Your rules</span>
            <span className={r.count} aria-live="polite">{list.length} / {MAX_RULES}</span>
          </div>

          {list.length === 0 ? (
            <div className={r.empty}>
              <span className={r.emptyIco} aria-hidden="true"><ListChecks size={20} /></span>
              <b>No rules yet</b>
              <span>Write the rules you trade by, or start from a suggestion below.</span>
            </div>
          ) : (
            <ol className={r.list}>
              {list.map((x, i) => (
                <li key={x.id} className={r.item}>
                  <span className={r.num} aria-hidden="true">{i + 1}</span>
                  <input
                    className={r.text}
                    value={x.text}
                    maxLength={MAX_RULE_TEXT}
                    onChange={(e) => edit(x.id, e.target.value)}
                    aria-label={`Rule ${i + 1}`}
                    placeholder="Describe the rule"
                  />
                  <div className={r.tools}>
                    <button type="button" className={r.tool} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move rule ${i + 1} up`}><ArrowUp size={15} /></button>
                    <button type="button" className={r.tool} onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label={`Move rule ${i + 1} down`}><ArrowDown size={15} /></button>
                    <button type="button" className={`${r.tool} ${r.del}`} onClick={() => remove(x.id)} aria-label={`Delete rule ${i + 1}`}><Trash2 size={15} /></button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <form
            className={r.add}
            onSubmit={(e) => { e.preventDefault(); add(draft); setDraft(""); addRef.current?.focus(); }}
          >
            <input
              ref={addRef}
              className={r.addInput}
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setError(""); }}
              maxLength={MAX_RULE_TEXT}
              placeholder={full ? `You've reached ${MAX_RULES} rules` : "Add a rule, e.g. Only trade A+ setups"}
              aria-label="New rule"
              disabled={full}
            />
            <button type="submit" className={r.addBtn} disabled={full || !draft.trim()}><Plus size={16} aria-hidden="true" /> Add</button>
          </form>

          {unused.length > 0 && !full && (
            <div className={r.suggest}>
              <span>Suggestions</span>
              <div>
                {unused.map((s) => (
                  <button key={s} type="button" className={r.chip} onClick={() => add(s)}><Plus size={13} aria-hidden="true" /> {s}</button>
                ))}
              </div>
            </div>
          )}

          {error && <p className={r.err} role="alert">{error}</p>}

          <div className={r.foot}>
            <span className={r.hint}>{dirty ? "You have unsaved changes" : "Changes apply to new trades. Past trades keep the rules they were logged with."}</span>
            <div className={r.footBtns}>
              {dirty && <button type="button" className={r.ghost} onClick={() => { setList((saved || []).map((x) => ({ ...x }))); setError(""); }} disabled={saving}>Discard</button>}
              <button type="button" className={r.save} onClick={save} disabled={!dirty || saving}>
                {saving ? <><Loader2 size={15} className={r.spin} aria-hidden="true" /> Saving…</> : "Save rules"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ================= checklist on a trade =================
   value:     [{ ruleId, text, checked }] or null (not answered yet)
   rules:     the user's current rules [{ id, text }]
   onChange:  (checks) => void */
export function RulesChecklist({ rules = [], value, onChange, onManage, defaultChecked = false }) {
  // rows: the trade's saved snapshot when editing, else the current rules
  const rows = useMemo(() => {
    if (Array.isArray(value) && value.length) return value;
    return rules.map((x) => ({ ruleId: x.id, text: x.text, checked: defaultChecked }));
  }, [rules, value, defaultChecked]);
  const touched = (Array.isArray(value) && value.length > 0) || defaultChecked;
  const n = rows.filter((x) => x.checked).length;
  const status = touched ? statusFromChecks(rows) : "";
  const meta = STATUS_META[status];

  const toggle = (i) => onChange(rows.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)));
  const all = () => onChange(rows.map((x) => ({ ...x, checked: n !== rows.length })));

  return (
    <div className={r.check} role="group" aria-labelledby="jx-rules-q">
      <div className={r.checkHead}>
        <span className={r.checkTitle}>
          <b id="jx-rules-q">Did you follow your rules?</b>
          <small>Tick each rule you stuck to on this trade</small>
        </span>
        <span className={r.pill} data-tone={meta.tone} aria-live="polite">
          {touched ? <>{meta.label} · {n}/{rows.length}</> : `0/${rows.length}`}
        </span>
      </div>

      <div className={r.bar} aria-hidden="true"><i data-tone={meta.tone} style={{ width: `${rows.length ? (n / rows.length) * 100 : 0}%` }} /></div>

      <ul className={r.rows}>
        {rows.map((x, i) => (
          <li key={x.ruleId || x.text}>
            <label className={r.row} data-on={x.checked || undefined}>
              <input type="checkbox" className={r.cbx} checked={!!x.checked} onChange={() => toggle(i)} />
              <span className={r.box} aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
              <span className={r.rowText}>{x.text}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className={r.checkFoot}>
        <button type="button" className={r.link} onClick={all}>{n === rows.length && touched ? "Clear all" : "Tick all"}</button>
        {!touched && <span className={r.unanswered}>Unticked rules count as not followed.</span>}
        {onManage && <button type="button" className={r.link} onClick={onManage}><Settings2 size={13} aria-hidden="true" /> Edit rules</button>}
      </div>
    </div>
  );
}
