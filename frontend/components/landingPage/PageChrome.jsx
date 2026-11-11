"use client";

/* Shared chrome for marketing sub-pages (features, pricing, ...), matching the
   landing redesign: dark JournalX theme, floating nav, compact page hero with
   breadcrumbs, and a closing CTA band. */

import { motion } from "framer-motion";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { LightHeroHeader } from "./LightHero";
import { LandingFooter } from "./LandingChrome";
import s from "./Page.module.css";

export function MarketingPage({ children }) {
  return (
    <div className={s.page}>
      <LightHeroHeader />
      <main className={s.main}>{children}</main>
      <LandingFooter />
    </div>
  );
}

export function PageHero({ kicker, title, lead, crumbs = [], primary, secondary, chips = [] }) {
  return (
    <section className={s.hero} aria-labelledby="page-title">
      <div className={s.heroGlow} aria-hidden="true" />
      <div className={s.heroGrid} aria-hidden="true" />
      <div className={s.inner}>
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className={s.crumbs}>
            <ol>
              {crumbs.map(([label, href], i) => (
                <li key={label}>
                  {href ? <a href={href}>{label}</a> : <span aria-current="page">{label}</span>}
                  {i < crumbs.length - 1 && <ChevronRight size={13} aria-hidden="true" />}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {kicker && <span className={s.kicker}>{kicker}</span>}
          <h1 id="page-title" className={s.title}>{title}</h1>
          {lead && <p className={s.lead}>{lead}</p>}
          {(primary || secondary) && (
            <div className={s.actions}>
              {primary && <a href={primary.href} className={s.btnGold}>{primary.label} <ArrowRight size={16} aria-hidden="true" /></a>}
              {secondary && <a href={secondary.href} className={s.btnGhost}>{secondary.label}</a>}
            </div>
          )}
          {chips.length > 0 && (
            <ul className={s.chips}>
              {chips.map((c) => <li key={c}><Check size={14} aria-hidden="true" />{c}</li>)}
            </ul>
          )}
        </motion.div>
      </div>
    </section>
  );
}

export function CtaBand({ title, lead, primary, secondary }) {
  return (
    <section className={s.ctaSec} aria-labelledby="cta-title">
      <div className={s.inner}>
        <motion.div
          className={s.cta}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <h2 id="cta-title" className={s.ctaTitle}>{title}</h2>
          {lead && <p className={s.ctaLead}>{lead}</p>}
          <div className={s.actions}>
            {primary && <a href={primary.href} className={s.btnGold}>{primary.label} <ArrowRight size={16} aria-hidden="true" /></a>}
            {secondary && <a href={secondary.href} className={s.btnGhost}>{secondary.label}</a>}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
