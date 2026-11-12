"use client";

/* Shared upgrade prompt for every plan-limit trigger (trade cap, history lock,
   import allowance…). Same props as before: { open, onClose, title, reason }.
   Pick a plan and a payment method; Paddle's secure form (or the crypto
   page) follows inside this same window, no second modal, no /pricing trip. Bottom sheet on phones, centred
   popup on desktop. Styles shared with the Overview upgrade modal. */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Crown, Lock, Mail, RotateCcw, ShieldCheck, X , CheckCircle2 } from "lucide-react";
import PaddleLoader from "@/components/payments/PaddleLoader";
import useCheckout from "@/components/payments/useCheckout";
import { MethodPicker, CheckoutStep, SuccessStep, ctaText } from "@/components/app/CheckoutParts";
import { buildPlansConfig, getUserCurrency, detectCurrencyByIP } from "@/utils/plans";
import s from "@/components/app/Upgrade.module.css";

const SUPPORT_EMAIL = "support@journalx.app";

const BENEFITS = [
  "Unlimited trades every month",
  "Full trade history, nothing locked",
  "Up to 3 journals + exchange auto-sync",
  "Advanced analytics & unlimited chart logs",
];

export default function UpgradeSheet({
  open,
  onClose,
  title = "Upgrade to keep going",
  reason = "You've reached your Free plan limit.",
}) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [cur, setCur] = useState("USD");
  const [plan, setPlan] = useState("yearly");

  useEffect(() => setMounted(true), []);

  // Inside the dashboard there is ONE upgrade window. If it's listening, ask it
  // to open with this reason and close ourselves, so every upgrade button
  // (sidebar, banner, history lock, trade cap, import cap) shows the same thing.
  const [handedOff, setHandedOff] = useState(false);
  useEffect(() => {
    if (!open) { setHandedOff(false); return; }
    if (typeof window !== "undefined" && window.__jxUpgradeHost) {
      window.dispatchEvent(new CustomEvent("jx-open-upgrade", { detail: { title, sub: reason } }));
      setHandedOff(true);
      onClose?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    setCur(getUserCurrency());
    let live = true;
    detectCurrencyByIP().then((c) => live && c && setCur(c)).catch(() => {});
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => { live = false; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  const plans = buildPlansConfig(cur);
  const co = useCheckout({ open, plans, planKey: plan });

  if (!mounted || handedOff) return null;

  const num = (k) => Number(String(plans[k].price).replace(/[^\d.]/g, "")) || 0;
  const csym = cur === "INR" ? "₹" : "$";
  const ROWS = [
    { id: "yearly", name: "Yearly", price: plans.yearly.price, per: "/year", note: `${csym}${(num("yearly") / 12).toFixed(2)}/mo · save 28%`, tag: "Most popular" },
    { id: "monthly", name: "Monthly", price: plans.monthly.price, per: "/month", note: "Cancel anytime" },
    { id: "lifetime", name: "Lifetime", price: plans.lifetime.price, per: "once", note: "Pay once, keep Pro forever", tag: "Best value" },
  ];
  const chosen = ROWS.find((r) => r.id === plan);

  const emailUs = () => {
    const subject = encodeURIComponent("JournalX Pro — pricing question");
    const body = encodeURIComponent(
      `Hi JournalX team,\n\nI'd like to know more about upgrading to Pro${reason ? ` (I hit: ${reason})` : ""}.\n\nMy question: `,
    );
    try { window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`; } catch {}
  };

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className={`${s.overlay} ${s.sheetOverlay}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
            onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
          >
            <PaddleLoader />
            <motion.div
              className={`${s.sheet} ${co.view === "checkout" ? s.sheetWide : ""}`}
              role="dialog" aria-modal="true" aria-labelledby="jx-us-title"
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              <div className={s.sheetHead}>
                <span className={`${s.sheetIco} ${co.view === "success" ? s.sheetIcoOk : ""}`} aria-hidden="true">{co.view === "success" ? <CheckCircle2 size={18} /> : <Lock size={18} />}</span>
                <div className={s.sheetTitles}>
                  <h2 id="jx-us-title">{co.view === "success" ? "Payment confirmed" : title}</h2>
                  <p>{co.view === "success" ? "Thank you for upgrading" : reason}</p>
                </div>
                <button type="button" className={s.close} onClick={onClose} aria-label="Close"><X size={17} /></button>
              </div>

              {co.view === "checkout" ? (
                <div className={s.sheetBody}><CheckoutStep co={co} planName={chosen.name} price={chosen.price} per={chosen.per} features={BENEFITS} /></div>
              ) : co.view === "success" ? (
                <div className={s.sheetBody}><SuccessStep co={co} /></div>
              ) : (<>
              <div className={s.sheetBody}>
                <ul className={s.feats}>
                  {BENEFITS.map((b) => <li key={b}><Check size={14} aria-hidden="true" /> {b}</li>)}
                </ul>

                <div className={s.plans} role="radiogroup" aria-label="Choose your plan">
                  {ROWS.map((p) => (
                    <button key={p.id} type="button" role="radio" aria-checked={plan === p.id} className={s.plan} onClick={() => setPlan(p.id)}>
                      <span className={s.radio} aria-hidden="true" />
                      <span className={s.planTxt}>
                        <b>{p.name}{p.tag && <i>{p.tag}</i>}</b>
                        <small>{p.note}</small>
                      </span>
                      <span className={s.planPrice}><b>{p.price}</b><small>{p.per}</small></span>
                    </button>
                  ))}
                </div>

                <MethodPicker co={co} currency={cur} />
              </div>

              <div className={s.sheetFoot}>
                <button type="button" className={s.cta} onClick={co.start} disabled={co.busy}>
                  <Crown size={16} aria-hidden="true" /> {ctaText(co, chosen.name, chosen.price)}
                </button>
                <ul className={s.trust}>
                  <li><ShieldCheck size={14} aria-hidden="true" /> 7-day money-back</li>
                  <li><RotateCcw size={14} aria-hidden="true" /> Cancel anytime</li>
                  <li>
                    <button type="button" className={s.textLink} onClick={emailUs}>
                      <Mail size={14} aria-hidden="true" /> Questions? Email us
                    </button>
                  </li>
                </ul>
              </div>
              </>)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
