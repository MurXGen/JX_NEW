"use client";

/* Upgrade modal + plan banner.
   - PlanBanner: shown on Overview when the plan is inactive or ends within 2 days.
   - UpgradeModal: personal value (from the trader's own trades), plan picker,
     payment method and Paddle's secure form, all inside this one window.
   Centred on desktop, full screen on phones. Estimates are clearly labelled. */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Clock, Crown, Lock, RotateCcw, ShieldCheck, Sparkles, TrendingUp, X } from "lucide-react";
import PaddleLoader from "@/components/payments/PaddleLoader";
import useCheckout from "@/components/payments/useCheckout";
import { MethodPicker, CheckoutStep, SuccessStep, ctaText } from "./CheckoutParts";
import { buildPlansConfig, getUserCurrency, detectCurrencyByIP } from "@/utils/plans";
import s from "./Upgrade.module.css";

const fmt = (v, d = 0) => Number(v).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 });

/* what the trader sees about their own plan */
export function planState(sub) {
  const plan = (sub?.plan || "free").toLowerCase();
  const active = sub?.status === "active";
  const lifetime = plan.includes("lifetime") && active;
  const daysLeft = sub?.expiresAt ? Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 864e5) : null;
  const hadPaid = plan.includes("pro") || plan.includes("lifetime");
  if (lifetime) return { kind: "lifetime", show: false };
  if (active && hadPaid && daysLeft != null && daysLeft > 2) return { kind: "pro", show: false, daysLeft };
  if (active && hadPaid && daysLeft != null && daysLeft > 0)
    return { kind: "expiring", show: true, daysLeft, title: `Your Pro plan ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`, sub: "Renew now to keep unlimited trades, full history and analytics." };
  if (hadPaid) return { kind: "expired", show: true, title: "Your Pro plan has ended", sub: "You're back on Free limits. Renew to unlock everything again." };
  return { kind: "free", show: true, title: "You're on the Free plan", sub: "Unlimited trades, full history and advanced analytics are one step away." };
}

export function PlanBanner({ state, onUpgrade }) {
  const [hidden, setHidden] = useState(false);
  const key = `jx-plan-banner-${state?.kind}`;
  useEffect(() => {
    try {
      const t = Number(localStorage.getItem(key) || 0);
      setHidden(Date.now() - t < 864e5);
    } catch {}
  }, [key]);
  if (!state?.show || hidden) return null;
  const urgent = state.kind !== "free";
  return (
    <div className={`${s.banner} ${urgent ? s.bannerUrgent : ""}`} role="status">
      <span className={s.bannerIco} aria-hidden="true">{urgent ? <Clock size={17} /> : <Crown size={17} />}</span>
      <div className={s.bannerTxt}>
        <b>{state.title}</b>
        <span>{state.sub}</span>
      </div>
      <button type="button" className={s.bannerCta} onClick={onUpgrade}>
        {state.kind === "free" ? "See Pro" : "Renew now"} <ArrowRight size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={s.bannerX}
        aria-label="Hide for a day"
        onClick={() => { try { localStorage.setItem(key, String(Date.now())); } catch {} setHidden(true); }}
      >
        <X size={15} />
      </button>
    </div>
  );
}

const PRO_FEATURES = [
  "Unlimited trades and chart logs",
  "Full trade history, nothing locked",
  "Advanced analytics: risk, edge, behaviour",
  "Up to 3 journals + exchange auto-sync",
];
const CUTS = [10, 20, 30];

export default function UpgradeModal({ open, onClose, trades = [], currencySymbol = "$", displayCurrency = "USD", state, reason = null }) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [plan, setPlan] = useState("yearly");
  const [cut, setCut] = useState(20);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return undefined;
    setCurrency(getUserCurrency());
    let live = true;
    detectCurrencyByIP().then((c) => live && c && setCurrency(c)).catch(() => {});
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { live = false; window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  const plans = buildPlansConfig(currency);
  const co = useCheckout({ open, plans, planKey: plan });
  const sym = currencySymbol;

  /* the trader's own numbers (display currency) */
  const v = useMemo(() => {
    const closed = trades.filter((t) => Number.isFinite(Number(t.pnl)) && (t.closeTime || t.openTime));
    const t = (x) => new Date(x.closeTime || x.openTime).getTime();
    const since = Date.now() - 30 * 864e5;
    let recent = closed.filter((x) => t(x) >= since);
    let win = 30;
    if (recent.length < 5) { recent = closed; win = null; } // too little recent data → whole history
    const losses = recent.filter((x) => Number(x.pnl) < 0);
    const lossSum = losses.reduce((a, x) => a + Math.abs(Number(x.pnl)), 0);
    const net = recent.reduce((a, x) => a + Number(x.pnl), 0);
    const broken = recent.filter((x) => x.rulesFollowed === false && Number(x.pnl) < 0);
    const brokenSum = broken.reduce((a, x) => a + Math.abs(Number(x.pnl)), 0);
    // months covered, so the estimate is per month even on full history
    let months = 1;
    if (!win && recent.length > 1) {
      const span = Math.max(...recent.map(t)) - Math.min(...recent.map(t));
      months = Math.max(1, span / (30 * 864e5));
    }
    return {
      count: recent.length, window: win, net, losses: losses.length,
      lossPerMonth: lossSum / months, avgLoss: losses.length ? lossSum / losses.length : 0,
      brokenSum, brokenN: broken.length,
    };
  }, [trades]);

  const saved = (v.lossPerMonth * cut) / 100;
  // only compare with the price when both are in (roughly) the same currency
  const sameCur = (currency === "INR" && displayCurrency === "INR") || (currency === "USD" && ["USD", "USDT"].includes(displayCurrency));
  const priceNum = (k) => {
    const raw = String(plans[k].price).replace(/[^\d.]/g, "");
    return Number(raw) || 0;
  };
  const monthlyCostLocal = plan === "yearly" ? priceNum("yearly") / 12 : plan === "monthly" ? priceNum("monthly") : priceNum("lifetime") / 24;
  const roi = sameCur && monthlyCostLocal > 0 && saved > 0 ? saved / monthlyCostLocal : null;
  const hasData = v.count >= 3 && v.losses > 0;

  const PLAN_ROWS = [
    { id: "yearly", name: "Yearly", price: plans.yearly.price, per: "/year", note: `${currency === "INR" ? "₹" : "$"}${fmt(priceNum("yearly") / 12, 2)}/mo · save 28%`, tag: "Most popular" },
    { id: "monthly", name: "Monthly", price: plans.monthly.price, per: "/month", note: "Cancel anytime" },
    { id: "lifetime", name: "Lifetime", price: plans.lifetime.price, per: "once", note: "Pay once, keep Pro forever", tag: "Best value" },
  ];

  const chosen = PLAN_ROWS.find((p) => p.id === plan);
  const ctaLabel = ctaText(co, chosen.name, chosen.price);

  if (!mounted) return null;
  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className={s.overlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
            onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
          >
            <PaddleLoader />
            <motion.div
              className={s.modal}
              role="dialog" aria-modal="true" aria-labelledby="jx-up-title"
              initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
            >
              <header className={s.head}>
                <span className={s.eyebrow}>
                  {reason ? <Lock size={13} aria-hidden="true" /> : state?.kind === "expiring" || state?.kind === "expired" ? <Clock size={13} aria-hidden="true" /> : <Sparkles size={13} aria-hidden="true" />}
                  {reason?.title || state?.title || "Upgrade to Pro"}
                </span>
                <button type="button" className={s.close} onClick={onClose} aria-label="Close"><X size={18} /></button>
              </header>

              {co.view === "checkout" ? (
                <div className={s.body1}><CheckoutStep co={co} planName={chosen.name} price={chosen.price} per={chosen.per} features={PRO_FEATURES} /></div>
              ) : co.view === "success" ? (
                <div className={s.body1}><SuccessStep /></div>
              ) : (<>
              <div className={s.body}>
                {/* phones: short and to the point */}
                <div className={s.mini}>
                  <h2>{reason?.title || (state?.kind === "expiring" || state?.kind === "expired" ? "Keep Pro going" : "Upgrade to Pro")}</h2>
                  {reason?.sub && <p className={s.reasonSub}>{reason.sub}</p>}
                  {hasData ? (
                    <>
                      <p className={s.miniLine}><TrendingUp size={15} aria-hidden="true" /> <span>Cutting losses by 20% ≈ <b>+{sym}{fmt((v.lossPerMonth * 20) / 100, (v.lossPerMonth * 20) / 100 < 100 ? 2 : 0)}/mo</b></span></p>
                      <small>Estimate from your own trades. Not a promise of returns.</small>
                    </>
                  ) : (
                    <p className={s.miniLine}><Check size={15} aria-hidden="true" /> <span>Unlimited trades, full history and advanced analytics</span></p>
                  )}
                </div>
                <div className={s.colValue}>
                  <h2 id="jx-up-title" className={s.title}>Turn your journal into <em>more profit</em></h2>
                  <p className={s.lead}>Pro finds the patterns that cost you money, so you stop repeating them.</p>
                  {reason?.sub && <p className={s.reason}><Lock size={14} aria-hidden="true" /> {reason.sub}</p>}

                  {hasData ? (
                    <section className={s.value} aria-labelledby="jx-up-val">
                      <h3 id="jx-up-val">What journaling could be worth to you</h3>
                      <div className={s.facts}>
                        <div><span>Net P&amp;L {v.window ? "· 30 days" : "· all trades"}</span><b className={v.net >= 0 ? s.pos : s.neg}>{v.net >= 0 ? "+" : "−"}{sym}{fmt(Math.abs(v.net), Math.abs(v.net) < 100 ? 2 : 0)}</b></div>
                        <div><span>Lost on losing trades / mo</span><b className={s.neg}>−{sym}{fmt(v.lossPerMonth, v.lossPerMonth < 100 ? 2 : 0)}</b></div>
                      </div>

                      <div className={s.cut}>
                        <span id="jx-up-cut">If reviewing helps you cut losses by</span>
                        <div className={s.cutSeg} role="radiogroup" aria-labelledby="jx-up-cut">
                          {CUTS.map((c) => (
                            <button key={c} type="button" role="radio" aria-checked={cut === c} onClick={() => setCut(c)}>{c}%</button>
                          ))}
                        </div>
                      </div>

                      <div className={s.result}>
                        <TrendingUp size={18} aria-hidden="true" />
                        <div>
                          <b>≈ +{sym}{fmt(saved, saved < 100 ? 2 : 0)} <small>more each month</small></b>
                          <span>
                            {roi && roi >= 1
                              ? `That's about ${fmt(roi, roi < 10 ? 1 : 0)}× what Pro costs you.`
                              : `≈ +${sym}${fmt(saved * 12, 0)} over a year.`}
                          </span>
                        </div>
                      </div>
                      {v.brokenN > 0 && (
                        <p className={s.leak}>
                          <b>Your biggest leak:</b> {sym}{fmt(v.brokenSum, v.brokenSum < 100 ? 2 : 0)} lost on {v.brokenN} trade{v.brokenN === 1 ? "" : "s"} where you broke your rules.
                        </p>
                      )}
                      <p className={s.fine}>Estimate from your own {v.window ? "last 30 days" : "trade history"}. Not a promise of returns.</p>
                    </section>
                  ) : (
                    <section className={s.value}>
                      <h3>Why traders journal with Pro</h3>
                      <p className={s.leadSm}>Log a few trades and this shows how much your losing patterns cost you each month, and what cutting them is worth.</p>
                    </section>
                  )}

                  <ul className={s.feats}>
                    {PRO_FEATURES.map((f) => <li key={f}><Check size={14} aria-hidden="true" /> {f}</li>)}
                  </ul>
                </div>

                <div className={s.colPlan}>
                  <h3 className={s.planHead} id="jx-up-plan">Choose your plan</h3>
                  <div className={s.plans} role="radiogroup" aria-labelledby="jx-up-plan">
                    {PLAN_ROWS.map((p) => (
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

                  <MethodPicker co={co} currency={currency} />

                  <button type="button" className={`${s.cta} ${s.ctaDesk}`} onClick={co.start} disabled={co.busy}>
                    <Crown size={16} aria-hidden="true" /> {ctaLabel}
                  </button>

                  <ul className={`${s.trust} ${s.trustRow}`}>
                    <li><ShieldCheck size={14} aria-hidden="true" /> 7-day money-back guarantee</li>
                    <li><RotateCcw size={14} aria-hidden="true" /> Cancel anytime{plan === "lifetime" ? " · no renewals" : ""}</li>
                    <li><Lock size={14} aria-hidden="true" /> Secure checkout · card or crypto</li>
                  </ul>
                </div>
              </div>
              {/* phones: the main action stays reachable while reading */}
              <div className={s.mFoot}>
                <button type="button" className={s.cta} onClick={co.start} disabled={co.busy}>
                  <Crown size={16} aria-hidden="true" /> {ctaLabel}
                </button>
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
