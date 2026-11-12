"use client";

/* Payment pieces rendered INSIDE an upgrade window (no second modal):
   MethodPicker (UPI/cards, PayPal, crypto + promo), CheckoutStep (Paddle's
   secure form + order summary) and SuccessStep. Driven by useCheckout(). */

import { useState } from "react";
import { ArrowLeft, Bitcoin, Check, CheckCircle2, CreditCard, ShieldCheck, Tag, X } from "lucide-react";
import { paymentMethods } from "@/components/payments/useCheckout";
import s from "./Upgrade.module.css";

const ICONS = {
  card: <CreditCard size={17} aria-hidden="true" />,
  paypal: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.5 21l1.2-7.2h2.9c3.6 0 6.1-1.8 6.7-5.2.5-2.9-1.2-4.6-4.6-4.6H8.3a.8.8 0 0 0-.8.7L5 20.4a.5.5 0 0 0 .5.6h2z" fill="currentColor" opacity="0.55" />
      <path d="M9.7 19l1.1-6.8h2.7c3.4 0 5.8-1.7 6.4-4.9.1-.4.1-.8.1-1.1 1 .6 1.5 1.7 1.1 3.6-.6 3.4-3 5.2-6.6 5.2h-2.6L10.6 19H9.7z" fill="currentColor" />
    </svg>
  ),
  crypto: <Bitcoin size={17} aria-hidden="true" />,
};

export function MethodPicker({ co, currency }) {
  return (
    <div className={s.payBlock}>
      <span className={s.payLbl} id="jx-pay-lbl">Pay with</span>
      <div className={s.methods} role="radiogroup" aria-labelledby="jx-pay-lbl">
        {paymentMethods(currency).map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={co.method === m.id} className={s.method} data-m={m.id} onClick={() => co.setMethod(m.id)}>
            <span className={s.methodIco}>{ICONS[m.id]}</span>
            <span className={s.methodTxt}><b>{m.title}</b><small>{m.desc}</small></span>
            <span className={s.radio} aria-hidden="true" />
          </button>
        ))}
      </div>
      {co.method !== "crypto" && <PromoField co={co} />}
      {co.error && <p className={s.payErr} role="alert">{co.error}</p>}
    </div>
  );
}

/* promo: a real field with Apply, then a removable chip. Paddle validates the
   code when the secure form opens, so we don't claim a discount here. */
function PromoField({ co }) {
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  if (co.promo) {
    return (
      <div className={s.promoChip} role="status">
        <Tag size={13} aria-hidden="true" />
        <b>{co.promo}</b>
        <span>applied, discount shows at payment</span>
        <button type="button" onClick={() => { co.setPromo(""); setDraft(""); co.setPromoOpen(true); }} aria-label={`Remove promo code ${co.promo}`}><X size={13} /></button>
      </div>
    );
  }
  if (!co.promoOpen) {
    return (
      <button type="button" className={s.textLink} onClick={() => co.setPromoOpen(true)}>
        <Tag size={13} aria-hidden="true" /> Have a promo code?
      </button>
    );
  }
  const apply = () => {
    const v = draft.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,32}$/.test(v)) { setErr("Codes are 3–32 letters or numbers"); return; }
    setErr("");
    co.setPromo(v);
  };
  return (
    <div className={s.promoWrap}>
      <div className={`${s.promoRow} ${err ? s.promoBad : ""}`}>
        <Tag size={14} aria-hidden="true" />
        <input
          value={draft}
          onChange={(e) => { setDraft(e.target.value.toUpperCase()); setErr(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}
          placeholder="Enter promo code"
          aria-label="Promo code"
          aria-invalid={!!err || undefined}
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
        />
        <button type="button" onClick={apply} disabled={!draft.trim()}>Apply</button>
      </div>
      {err ? <small className={s.payErr}>{err}</small> : (
        <button type="button" className={s.textLink} onClick={() => { co.setPromoOpen(false); setDraft(""); }}>Cancel</button>
      )}
    </div>
  );
}

export function ctaText(co, planName, price) {
  if (co.busy) return "Opening checkout…";
  return co.method === "crypto" ? `Continue with crypto · ${price}` : `Continue to payment · ${price}`;
}

export function CheckoutStep({ co, planName, price, per, features = [] }) {
  return (
    <div className={s.checkout}>
      <div className={s.checkoutMain}>
        <button type="button" className={s.backBtn} onClick={co.back}><ArrowLeft size={15} aria-hidden="true" /> Change plan or method</button>
        {/* Paddle mounts its secure card / UPI / PayPal form in here */}
        <div className={s.frameCard}><div className="jx-paddle-frame" style={{ minHeight: 460 }} /></div>
      </div>
      <aside className={s.summary}>
        <span className={s.summaryLbl}>Your plan</span>
        <b className={s.summaryPlan}>Pro {planName}</b>
        <div className={s.summaryPrice}><b>{price}</b><small>{per}</small></div>
        <span className={s.fine}>Taxes, if any, are added at checkout.</span>
        <ul className={s.summaryList}>
          {features.slice(0, 4).map((f) => <li key={f}><Check size={13} aria-hidden="true" /> {f}</li>)}
          <li><ShieldCheck size={13} aria-hidden="true" /> 7-day money-back guarantee</li>
        </ul>
      </aside>
    </div>
  );
}

export function SuccessStep() {
  return (
    <div className={s.success} role="status">
      <span className={s.successIco}><CheckCircle2 size={36} aria-hidden="true" /></span>
      <h2>Payment successful</h2>
      <p>Activating your Pro access now. You&apos;ll be back in your dashboard in a moment.</p>
    </div>
  );
}
