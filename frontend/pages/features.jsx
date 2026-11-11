"use client";

/* /features, same design system as the landing redesign: floating nav,
   compact page hero, live feature bento, grouped feature sections with a
   sticky jump nav, the "review every trade" panel, reviews and a closing CTA.
   Structured data: SoftwareApplication + BreadcrumbList. */

import Head from "next/head";
import { motion } from "framer-motion";
import {
  BarChart3,
  BrainCircuit,
  CalendarDays,
  CandlestickChart,
  Clock,
  Gauge,
  LineChart,
  MonitorSmartphone,
  NotebookPen,
  PieChart,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react";
import { MarketingPage, PageHero, CtaBand } from "@/components/landingPage/PageChrome";
import BentoGrid from "@/components/landing/BentoGrid";
import HeroFeaturePanel from "@/components/landingPage/HeroFeaturePanel";
import Testimonials from "@/components/landingPage/Testimonials";
import pg from "@/components/landingPage/Page.module.css";

const SITE_URL = "https://journalx.app";
const TITLE = "Trading Journal Features: Analytics, Psychology & Risk | JournalX";
const DESC =
  "Every JournalX trading journal feature: 10-second trade logging, CSV and exchange import, equity curve and R-multiple analytics, drawdown tracking, trading psychology scoring, a P&L calendar and chart trade marking, on desktop and mobile.";

const GROUP_META = {
  "Logging & import": { id: "logging", text: "Log in seconds or import your full history, with all the context that turns numbers into lessons." },
  Analytics: { id: "analytics", text: "Every metric recalculates the moment a trade is logged, so your review always reflects reality." },
  "Risk & psychology": { id: "risk-psychology", text: "Measure the habits and risk decisions behind your results, then fix them one at a time." },
  "Markets & platform": { id: "markets-platform", text: "One trading journal for every market and device, fast and private by default." },
};

const GROUPS = [
  {
    kicker: "Logging & import",
    title: "Capture every trade in seconds",
    items: [
      { icon: Zap, title: "10-second quick log", body: "Log just your net P&L, or go deep with entries, exits, size, risk and notes, your choice, every time." },
      { icon: NotebookPen, title: "Detailed journaling", body: "Strategy, market condition, timeframe, confidence, emotions and mistakes, the context that turns numbers into lessons." },
      { icon: CandlestickChart, title: "Mark trades on a chart", body: "Drop your entry and exit on a live chart; prices fill automatically and the marked chart shows on the trade details." },
      { icon: Upload, title: "CSV & broker import", body: "Bulk-import with our quick or detailed CSV templates, or connect a read-only exchange key to auto-sync your history." },
    ],
  },
  {
    kicker: "Analytics",
    title: "Find your edge in the data",
    items: [
      { icon: TrendingUp, title: "Equity-growth candles", body: "Your account growth as candlesticks, not a flat line, drawdowns become visible and fixable." },
      { icon: BarChart3, title: "R-multiples & expectancy", body: "Win rate, payoff, profit factor, expectancy and R-multiple distributions, computed from your real trades." },
      { icon: PieChart, title: "Per-strategy & per-session", body: "See which setups, sessions and instruments actually make you money, and which quietly bleed it." },
      { icon: CalendarDays, title: "P&L calendar & heatmap", body: "A colour-coded calendar and activity heatmap make consistency impossible to fake." },
    ],
  },
  {
    kicker: "Risk & psychology",
    title: "Protect the account and the mind",
    items: [
      { icon: ShieldCheck, title: "Drawdown & consistency", body: "Track trailing and daily drawdown and consistency, the rules that keep any account alive, personal or funded." },
      { icon: Target, title: "Planned vs realised R:R", body: "Fixed-risk position sizing and planned-vs-actual risk/reward on every trade." },
      { icon: BrainCircuit, title: "Psychology & discipline scoring", body: "Tag emotion and discipline at entry; see exactly what tilt, FOMO and revenge trading cost you." },
      { icon: Clock, title: "Hold-time & timeframe analysis", body: "Disposition-effect, hold-time and timeframe breakdowns reveal the habits behind your results." },
    ],
  },
  {
    kicker: "Markets & platform",
    title: "Everywhere you trade",
    items: [
      { icon: Gauge, title: "All markets, any currency", body: "Forex, futures, stocks, options and crypto, log any instrument in any currency, with adaptive price precision." },
      { icon: LineChart, title: "Live market context", body: "Ticker tape, heatmaps, an economic calendar, news and an 'if you'd held' live price check on closed trades." },
      { icon: MonitorSmartphone, title: "Desktop & mobile", body: "A fully responsive web app plus an installable PWA, journal on your laptop or log from your phone instantly." },
      { icon: Search, title: "Fast, private & yours", body: "Full trade-log analysis in under 10 seconds, your data stays private, and JournalX is a tool, never a broker." },
    ],
  },
];

const FEATURE_LIST = GROUPS.flatMap((g) => g.items.map((i) => i.title));

export default function FeaturesPage() {
  const appLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "JournalX",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web, iOS, Android (PWA)",
    description: DESC,
    url: `${SITE_URL}/features`,
    image: `${SITE_URL}/assets/JournalX_Banner.png`,
    featureList: FEATURE_LIST,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", ratingCount: "1240" },
    publisher: { "@type": "Organization", name: "JournalX", url: SITE_URL },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Features", item: `${SITE_URL}/features` },
    ],
  };

  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <meta name="keywords" content="trading journal features, trade analytics, equity curve, R-multiple, drawdown tracker, trading psychology, P&L calendar, mark trades on chart, mobile trading journal, journalx features" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <link rel="canonical" href={`${SITE_URL}/features`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="JournalX" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={`${SITE_URL}/features`} />
        <meta property="og:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESC} />
        <meta name="twitter:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta name="theme-color" content="#000000" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      </Head>

      <MarketingPage>
        <PageHero
          crumbs={[["Home", "/"], ["Features"]]}
          kicker="Trading journal features"
          title={<>Trading journal features that turn trades into <span>a real edge</span></>}
          lead="From a 10-second log to full risk and psychology analytics, for stocks, options, futures, forex and crypto, on your own account or a funded one. Works on desktop and mobile."
          primary={{ href: "/register", label: "Start free, no card" }}
          secondary={{ href: "/pricing", label: "See pricing" }}
          chips={["Free to start", "Desktop and mobile", "All markets"]}
        />

        <nav className={pg.jump} aria-label="Feature categories">
          <ul>
            {GROUPS.map((g) => (
              <li key={g.kicker}><a href={`#${GROUP_META[g.kicker].id}`}>{g.kicker}</a></li>
            ))}
          </ul>
        </nav>

        <BentoGrid />

        {GROUPS.map((g) => (
          <section key={g.kicker} id={GROUP_META[g.kicker].id} className={pg.group} aria-labelledby={`${GROUP_META[g.kicker].id}-title`}>
            <div className={pg.inner}>
              <div className={pg.groupGrid}>
                <div className={pg.groupSide}>
                  <span className={pg.groupKicker}>{g.kicker}</span>
                  <h2 id={`${GROUP_META[g.kicker].id}-title`} className={pg.groupTitle}>{g.title}</h2>
                  <p className={pg.groupText}>{GROUP_META[g.kicker].text}</p>
                </div>
                <div className={pg.cards}>
                  {g.items.map(({ icon: Icon, title, body }, i) => (
                    <motion.article
                      key={title}
                      className={pg.card}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ delay: (i % 2) * 0.06, duration: 0.45 }}
                    >
                      <span className={pg.cardIcon} aria-hidden="true"><Icon size={19} strokeWidth={1.8} /></span>
                      <h3 className={pg.cardTitle}>{title}</h3>
                      <p className={pg.cardBody}>{body}</p>
                    </motion.article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}

        <HeroFeaturePanel />
        <Testimonials schema={false} />
        <CtaBand
          title="Start journaling smarter today"
          lead="Free to start, no credit card, full trade analysis in under 10 seconds."
          primary={{ href: "/register", label: "Create your free account" }}
          secondary={{ href: "/pricing", label: "See pricing" }}
        />
      </MarketingPage>
    </>
  );
}
