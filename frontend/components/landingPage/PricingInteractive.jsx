"use client";

/* Interactive pricing for the landing page.
   - Monthly / Yearly toggle drives the Pro card (savings computed from real
     prices per currency, never hard-coded).
   - "Find your plan" helper: trades-per-month slider + accounts stepper
     highlight the recommended plan and show cost per trade.
   - Expandable plan comparison built only from PLANS_FEATURES facts.
   Checkout uses the shared usePlanCheckout flow (Paddle / crypto modal). */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, Crown, Infinity as InfinityIcon, Minus, Plus, ShieldCheck, Sparkles, Zap } from "lucide-react";
import PaddleLoader from "@/components/payments/PaddleLoader";
import PaymentModal from "@/components/payments/PaymentModal";
import { usePlanCheckout } from "@/components/payments/usePlanCheckout";
import { PLANS_FEATURES } from "@/utils/plans";
import sec from "./Sections.module.css";
import s from "./Pricing.module.css";

/* "$29.99" / "₹1,499" -> { sym, n } */
const parse = (label = "") => {
  const m = String(label).match(/^([^\d]*)([\d,.]+)/);
  return { sym: m ? m[1] : "", n: m ? parseFloat(m[2].replace(/,/g, "")) : 0 };
};
const fmt = (sym, n) => {
  const dec = n < 10 && n % 1 !== 0 ? 2 : 0;
  return `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
};

const FREE_TRADES = 20;
const PRO_ACCOUNTS = 3;

/* Comparison rows: [label, free, pro, lifetime]. true = included. */
const ROWS = [
  ["Trades per month", "20", "Unlimited", "Unlimited"],
  ["Journals / accounts", "1", "3", "All Pro features"],
  ["Chart logging", "5 / month", "Unlimited", "Unlimited"],
  ["Analytics", "Basic charts", "Advanced analytics", "Advanced analytics"],
  ["Trade history", "30 days", "Full history", "Full history"],
  ["Screenshots per trade", "4 · 10MB", "Included", "Included"],
  ["Priority support", false, false, true],
  ["Early beta access", false, false, true],
  ["Lifetime updates", false, false, true],
];

export default function PricingInteractive({ asPage = false }) {
  const H = asPage ? "h1" : "h2";
  const reduced = useReducedMotion();
  const { plans, currency, isModalOpen, selectedPlan, handlePlanClick, closeModal } =
    usePlanCheckout({ loginRedirect: "/pricing" });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [billing, setBilling] = useState("yearly");
  const [trades, setTrades] = useState(60);
  const [accounts, setAccounts] = useState(1);
  const [compare, setCompare] = useState(false);

  const m = parse(plans.monthly.price);
  const y = parse(plans.yearly.price);
  const l = parse(plans.lifetime.price);
  const save = m.n ? Math.round((1 - y.n / (m.n * 12)) * 100) : 0;
  const proPerMonth = billing === "yearly" ? y.n / 12 : m.n;

  const recommended = trades <= FREE_TRADES && accounts === 1 ? "free" : "pro";
  const perTrade = trades > 0 ? proPerMonth / trades : 0;

  const proKey = billing === "yearly" ? "yearly" : "monthly";
  const cards = useMemo(() => ([
    {
      key: "free", name: "Free", tagline: "For getting the journaling habit started",
      price: plans.free.price, period: "forever", note: "No card required",
      features: PLANS_FEATURES.free, cta: "Start free", href: "/register",
    },
    {
      key: "pro", name: "Pro", tagline: "For active and funded traders",
      price: billing === "yearly" ? plans.yearly.price : plans.monthly.price,
      period: billing === "yearly" ? "/ year" : "/ month",
      sub: billing === "yearly" ? `${fmt(y.sym, y.n / 12)} / month, billed yearly` : "Billed monthly, cancel anytime",
      note: "7-day free trial", popular: true,
      features: PLANS_FEATURES.pro, cta: billing === "yearly" ? "Start yearly trial" : "Start monthly trial", plan: proKey,
    },
    {
      key: "lifetime", name: "Lifetime", tagline: "Pay once, journal forever",
      price: plans.lifetime.price, period: "once",
      sub: y.n ? `Same as ~${(l.n / y.n).toFixed(1)} years of Pro Yearly` : "",
      note: "One-time payment",
      features: PLANS_FEATURES.lifetime, cta: "Get lifetime", plan: "lifetime",
    },
  ]), [plans, billing, y.n, y.sym, l.n, proKey]);

  return (
    <section id="pricing" className={sec.sec} aria-labelledby="pricing-title" style={{ scrollMarginTop: 80, ...(asPage ? { paddingTop: 140 } : null) }}>
      <div className={sec.inner}>
        <div className={sec.head}>
          <span className={sec.kicker}>Pricing</span>
          <H id="pricing-title" className={sec.h2} style={asPage ? { fontSize: "clamp(34px, 5vw, 60px)" } : undefined}>Trading journal pricing that <span>pays for itself</span></H>
          <p className={sec.lead}>
            Start with the free trading journal and upgrade when you are ready. Pro unlocks unlimited trades, advanced
            analytics and full history, with a 7-day free trial.
          </p>
        </div>

        {/* billing toggle */}
        <div className={s.toggleWrap}>
          <div className={s.toggle} role="radiogroup" aria-label="Billing period">
            {[["monthly", "Monthly"], ["yearly", "Yearly"]].map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={billing === k}
                className={`${s.toggleBtn} ${billing === k ? s.toggleOn : ""}`}
                onClick={() => setBilling(k)}
              >
                {billing === k && <motion.span layoutId="billPill" className={s.togglePill} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className={s.toggleLabel}>{label}</span>
                {k === "yearly" && save > 0 && <span className={s.saveTag}>Save {save}%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className={s.layout}>
          {/* plan finder */}
          <aside className={s.finder} aria-labelledby="finder-title">
            <h3 id="finder-title" className={s.finderTitle}><Sparkles size={16} aria-hidden="true" /> Find your plan</h3>

            <label className={s.field} htmlFor="pf-trades">
              <span className={s.fieldTop}><span>Trades per month</span><b>{trades >= 200 ? "200+" : trades}</b></span>
              <input
                id="pf-trades"
                type="range"
                min="0"
                max="200"
                step="5"
                value={trades}
                onChange={(e) => setTrades(Number(e.target.value))}
                className={s.range}
                style={{ "--p": `${(trades / 200) * 100}%` }}
              />
              <span className={s.ticks}><span>0</span><span>Free limit · 20</span><span>200+</span></span>
            </label>

            <div className={s.field}>
              <span className={s.fieldTop}><span>Trading accounts</span><b>{accounts}</b></span>
              <div className={s.stepper}>
                <button type="button" aria-label="Fewer accounts" onClick={() => setAccounts((a) => Math.max(1, a - 1))} disabled={accounts <= 1}><Minus size={15} /></button>
                <span aria-live="polite">{accounts} account{accounts > 1 ? "s" : ""}</span>
                <button type="button" aria-label="More accounts" onClick={() => setAccounts((a) => Math.min(5, a + 1))} disabled={accounts >= 5}><Plus size={15} /></button>
              </div>
            </div>

            <div className={s.result} aria-live="polite">
              <span className={s.resultLabel}>Recommended</span>
              <b className={s.resultPlan}>{recommended === "free" ? "Free" : billing === "yearly" ? "Pro Yearly" : "Pro Monthly"}</b>
              <p className={s.resultText}>
                {recommended === "free"
                  ? `${trades} trades a month fits inside the free plan's ${FREE_TRADES}-trade limit.`
                  : `About ${fmt(y.sym || m.sym, perTrade)} per logged trade at ${trades} trades a month.`}
              </p>
              {accounts > PRO_ACCOUNTS && (
                <p className={s.resultWarn}>Pro includes {PRO_ACCOUNTS} accounts. <a href="/contact">Contact us</a> for more.</p>
              )}
            </div>
          </aside>

          <div className={s.divider} aria-hidden="true"><span>or pick a plan</span></div>

          {/* plan cards */}
          <div className={s.cards}>
            {cards.map((c, i) => {
              const isRec = (recommended === "free" && c.key === "free") || (recommended === "pro" && c.key === "pro");
              return (
                <motion.article
                  key={c.key}
                  className={`${s.card} ${c.popular ? s.cardPop : ""} ${isRec ? s.cardRec : ""}`}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                  aria-labelledby={`plan-${c.key}`}
                >
                  <div className={s.badges}>
                    {c.popular && <span className={s.badgePop}><Crown size={12} aria-hidden="true" /> Most popular</span>}
                    <AnimatePresence>
                      {isRec && (
                        <motion.span
                          className={s.badgeRec}
                          initial={reduced ? false : { opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          <Check size={12} aria-hidden="true" /> Best fit for you
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <h3 id={`plan-${c.key}`} className={s.name}>{c.name}{c.key === "lifetime" && <InfinityIcon size={16} aria-hidden="true" />}</h3>
                  <p className={s.tagline}>{c.tagline}</p>
                  <div className={s.priceRow}>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={c.price}
                        className={s.price}
                        initial={reduced ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                      >
                        {c.price}
                      </motion.span>
                    </AnimatePresence>
                    <span className={s.period}>{c.period}</span>
                  </div>
                  <p className={s.sub}>{c.sub || " "}</p>

                  {c.href ? (
                    <a href={c.href} className={`${s.cta} ${c.popular ? s.ctaGold : ""}`}>{c.cta} <ArrowRight size={15} aria-hidden="true" /></a>
                  ) : (
                    <button type="button" onClick={() => handlePlanClick(c.plan)} className={`${s.cta} ${c.popular ? s.ctaGold : ""}`} aria-label={`${c.cta}, ${c.name} plan`}>
                      <Zap size={15} aria-hidden="true" /> {c.cta}
                    </button>
                  )}
                  <span className={s.note}>{c.note}</span>

                  <ul className={s.features}>
                    {c.features.map((f) => (
                      <li key={f.text}><Check size={15} aria-hidden="true" />{f.text}</li>
                    ))}
                  </ul>
                </motion.article>
              );
            })}
          </div>
        </div>

        {/* comparison */}
        <div className={s.compareWrap}>
          <button type="button" className={s.compareBtn} aria-expanded={compare} aria-controls="plan-compare" onClick={() => setCompare((v) => !v)}>
            {compare ? "Hide" : "Compare"} all plan features <ChevronDown size={16} aria-hidden="true" style={{ transform: compare ? "rotate(180deg)" : "none", transition: "transform .25s" }} />
          </button>
          <div id="plan-compare" className={`${s.compareBody} ${compare ? s.compareOpen : ""}`}>
            <div className={s.compareInner}>
            <table className={s.table}>
              <caption className={sec.srOnly}>JournalX trading journal plan comparison</caption>
              <thead>
                <tr><th scope="col">Feature</th><th scope="col">Free</th><th scope="col" className={s.colPro}>Pro</th><th scope="col">Lifetime</th></tr>
              </thead>
              <tbody>
                {ROWS.map(([label, ...vals]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {vals.map((v, k) => (
                      <td key={k} className={k === 1 ? s.colPro : undefined}>
                        {v === true ? <Check size={16} className={s.yes} aria-label="Included" /> : v === false ? <span className={s.no} aria-label="Not included">—</span> : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        <div className={s.trust}>
          <span><ShieldCheck size={15} aria-hidden="true" /> 256-bit encrypted checkout</span>
          <span><Check size={15} aria-hidden="true" /> Cancel anytime</span>
          <span><Check size={15} aria-hidden="true" /> Cards, PayPal &amp; crypto</span>
          <span><Check size={15} aria-hidden="true" /> Prices in {currency}</span>
        </div>
      </div>

      <PaddleLoader />
      {mounted && isModalOpen && selectedPlan &&
        createPortal(
          <PaymentModal isOpen={isModalOpen} onClose={closeModal} plans={plans} currency={currency} initialPlan={selectedPlan} loginRedirect="/pricing" />,
          document.body,
        )}
    </section>
  );
}
