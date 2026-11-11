"use client";

/* Landing bottom sections: BlogSection · AboutSection · FaqSection.
   - Blog: featured post + list (no marquee), ItemList JSON-LD.
   - About: long-form SEO copy + internal links to every market landing page.
   - FAQ: native <details>, so every answer ships in the HTML (FAQPage JSON-LD
     lives in pages/index.jsx). */

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Mail, Plus } from "lucide-react";
import { fmtDate } from "@/utils/blogs";
import s from "./Sections.module.css";

const SITE_URL = "https://journalx.app";

const reveal = (i = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
});

const ACCENT = {
  Strategy: "#fcd535", Risk: "#2ebd85", Psychology: "#a78bfa",
  Journaling: "#38bdf8", Markets: "#fb7185", Funded: "#34d399",
};

/* ---------- Blog ---------- */
export function BlogSection({ posts = [] }) {
  if (!posts.length) return null;
  const [featured, ...rest] = posts;
  const list = rest.slice(0, 5);
  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Trading journal guides from the JournalX blog",
    itemListElement: posts.slice(0, 6).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/blogs/${p.slug}`,
      name: p.title,
    })),
  };
  const acc = (p) => ACCENT[p.category] || "#fcd535";
  return (
    <section id="blog" className={s.sec} aria-labelledby="blog-title">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className={s.inner}>
        <div className={s.blogHead}>
          <div>
            <span className={s.kicker}>Trading guides</span>
            <h2 id="blog-title" className={s.h2} style={{ textAlign: "left" }}>Trading lessons to <span>sharpen your edge</span></h2>
            <p className={s.lead} style={{ margin: "12px 0 0", textAlign: "left" }}>
              Strategy, risk management, prop firm and trading psychology guides, written to be applied in your next journal review.
            </p>
          </div>
          <a href="/blogs" className={s.ghost}>Read the blog <ArrowRight size={15} aria-hidden="true" /></a>
        </div>

        <div className={s.blogGrid}>
          <motion.a href={`/blogs/${featured.slug}`} className={s.blogFeat} style={{ "--acc": acc(featured) }} {...reveal(0)}>
            <span className={s.blogArt} aria-hidden="true">
              <svg viewBox="0 0 300 120" preserveAspectRatio="none">
                {[30, 52, 41, 70, 58, 86, 74, 98].map((h, i) => (
                  <g key={i} transform={`translate(${18 + i * 36},0)`}>
                    <line x1="8" x2="8" y1={120 - h - 14} y2={120 - h + 26} stroke={i % 3 === 1 ? "#f6465d" : "#2ebd85"} strokeOpacity="0.5" />
                    <rect x="0" width="16" y={120 - h} height={h * 0.32 + 10} rx="3" fill={i % 3 === 1 ? "#f6465d" : "#2ebd85"} fillOpacity="0.55" />
                  </g>
                ))}
              </svg>
            </span>
            <span className={s.blogTag}>{featured.category} · {featured.minutes} min read</span>
            <h3 className={s.blogFeatTitle}>{featured.title}</h3>
            <p className={s.blogExcerpt}>{featured.excerpt}</p>
            <span className={s.blogMeta}>{fmtDate(featured.date)} <span className={s.blogMore}>Read guide <ArrowRight size={14} aria-hidden="true" /></span></span>
          </motion.a>

          <ul className={s.blogList}>
            {list.map((p, i) => (
              <motion.li key={p.slug} {...reveal(i + 1)}>
                <a href={`/blogs/${p.slug}`} className={s.blogItem} style={{ "--acc": acc(p) }}>
                  <span className={s.blogTag}>{p.category} · {p.minutes} min</span>
                  <h3 className={s.blogItemTitle}>{p.title}</h3>
                  <span className={s.blogMeta}>{fmtDate(p.date)}</span>
                </a>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- About (long-form SEO) ---------- */
const MARKET_PAGES = [
  ["Prop firm trading journal", "/prop-firm-trading-journal"],
  ["Stock trading journal", "/stock-trading-journal"],
  ["Options trading journal", "/options-trading-journal"],
  ["Futures trading journal", "/futures-trading-journal"],
  ["Forex trading journal", "/forex-trading-journal"],
  ["Crypto trading journal", "/crypto-trading-journal"],
];

export function AboutSection() {
  return (
    <section id="about-trading-journal" className={s.sec} aria-labelledby="about-title">
      <div className={s.inner}>
        <div className={s.aboutGrid}>
          <motion.article className={s.aboutCard} {...reveal(0)}>
            <span className={s.kicker}>Built for funded traders</span>
            <h2 id="about-title" className={s.aboutH}>The trading journal built for funded and prop firm traders</h2>
            <p>
              Funded and prop firm traders do not just need profit, they need to stay inside the rules. JournalX is the
              trading journal built to protect a funded account: track trailing and daily drawdown, watch your
              consistency, and get data-driven insight into the overtrading, revenge trading and tilt that end most
              evaluations. Whether you are passing an FTMO, Topstep or Apex challenge or scaling a funded account, your
              discipline becomes a number you can manage.
            </p>
            <p>
              It works for every market you trade. Log forex, futures, stocks, options or crypto in any currency, import
              your history from a spreadsheet or sync a supported exchange, and let the analytics engine build
              equity-growth candles, R-multiple distributions, a colour-coded P&amp;L calendar and per-strategy
              breakdowns in seconds.
            </p>
          </motion.article>

          <motion.article className={s.aboutCard} {...reveal(1)}>
            <span className={s.kicker}>Why it works</span>
            <h2 className={s.aboutH}>Why deeper trading analytics increase profitability</h2>
            <p>
              Profitability is not found in one perfect trade, it is built by removing repeated mistakes. You can only
              remove a leak you can measure, and only measure trades you actually log. When logging takes ten seconds
              instead of five minutes, you log every trade, your data stays complete, and your weekly review tells the
              truth.
            </p>
            <p>
              JournalX scores your discipline at entry and shows how emotion, risk and drawdown affect your results,
              turning advice like &quot;control your trading psychology&quot; into a number you can watch improve. Fix one leak
              at a time and the equity curve responds.
            </p>
          </motion.article>
        </div>

        <motion.nav className={s.marketNav} aria-label="Trading journal by market" {...reveal(2)}>
          <span className={s.marketNavLabel}>Trading journal by market</span>
          <ul>
            {MARKET_PAGES.map(([label, href]) => (
              <li key={href}><a href={href}>{label} <ArrowRight size={13} aria-hidden="true" /></a></li>
            ))}
          </ul>
        </motion.nav>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */
export function FaqSection({ faqs = [], title }) {
  return (
    <section id="faq" className={s.sec} aria-labelledby="faq-title" style={{ scrollMarginTop: 96 }}>
      <div className={s.inner}>
        <div className={s.faqGrid}>
          <div className={s.faqSide}>
            <span className={s.kicker}>FAQ</span>
            <h2 id="faq-title" className={s.h2} style={{ textAlign: "left" }}>{title || <>Trading journal <span>questions</span>, answered</>}</h2>
            <p className={s.lead} style={{ margin: "14px 0 22px", textAlign: "left" }}>
              Everything traders ask before they start journaling with JournalX.
            </p>
            <div className={s.faqHelp}>
              <BookOpen size={18} aria-hidden="true" />
              <div>
                <b>Still have a question?</b>
                <span>Read the guides or get in touch with the team.</span>
                <div className={s.faqLinks}>
                  <a href="/blogs">Guides</a>
                  <a href="/contact"><Mail size={13} aria-hidden="true" /> Contact us</a>
                </div>
              </div>
            </div>
          </div>
          <div className={s.faqList}>
            {faqs.map(([q, a], i) => (
              <details key={q} className={s.faqItem} open={i === 0}>
                <summary>
                  <h3>{q}</h3>
                  <span className={s.faqIcon} aria-hidden="true"><Plus size={16} /></span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
