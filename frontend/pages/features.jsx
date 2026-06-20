"use client";

/* /features, dedicated, SEO-rich features page. Grouped feature grid with
   icons + short descriptions, an explicit "works on desktop + mobile" section,
   and full structured data (SoftwareApplication + BreadcrumbList + WebPage). */

import Head from "next/head";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  CandlestickChart,
  Check,
  Clock,
  Download,
  Gauge,
  LineChart,
  MonitorSmartphone,
  NotebookPen,
  PieChart,
  Search,
  ShieldCheck,
  Smartphone,
  Target,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react";
import { LandingNav, LandingFooter, btnPrimary, btnGhost } from "@/components/landingPage/LandingChrome";
import Testimonials from "@/components/landingPage/Testimonials";

const SITE_URL = "https://journalx.app";
const TITLE = "Features, JournalX trading journal & analytics";
const DESC =
  "Explore every JournalX feature: 10-second trade logging, auto-import, equity-curve and R-multiple analytics, drawdown & consistency tracking for funded/prop accounts, trading-psychology scoring, a P&L calendar, mark-on-chart logging and a fast mobile app. Works on desktop and mobile across forex, futures, stocks, options and crypto.";

const C = {
  text: "#fff", muted: "#aeb4bc", dim: "#707a8a", canvas: "#0d1117",
  surface: "#161a20", border: "rgba(255,255,255,0.1)", yellow: "#fcd535", yellowDeep: "#f0b90b", green: "#2ebd85",
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
      { icon: ShieldCheck, title: "Drawdown & consistency", body: "Track trailing and daily drawdown and consistency, the rules that keep funded and prop-firm accounts alive." },
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
        <meta name="keywords" content="trading journal features, trade analytics, equity curve, R-multiple, drawdown tracker, prop firm journal, trading psychology, P&L calendar, mark trades on chart, mobile trading journal, journalx features" />
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
        <meta name="theme-color" content="#0d1117" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      </Head>

      <div style={{ background: C.canvas, color: C.text, fontFamily: "Poppins, sans-serif", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
        <LandingNav />

        <main style={{ position: "relative", zIndex: 1 }}>
          {/* hero */}
          <section style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px 24px", textAlign: "center", position: "relative" }}>
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(680px 360px at 50% -10%, rgba(252,213,53,0.16), transparent 70%)", pointerEvents: "none" }} />
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ position: "relative", zIndex: 1 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(252,213,53,0.12)", border: "1px solid rgba(252,213,53,0.3)", color: C.yellow, borderRadius: 999, padding: "6px 14px", font: "600 13px Poppins", marginBottom: 22 }}>
                <Zap size={14} aria-hidden="true" /> Everything in one trading journal
              </span>
              <h1 style={{ font: "700 clamp(32px,5vw,54px)/1.08 Poppins", margin: "0 0 18px", letterSpacing: "-1.5px" }}>
                Features that turn trades into a{" "}
                <span style={{ background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowDeep})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>real edge</span>
              </h1>
              <p style={{ font: "400 clamp(16px,2.2vw,19px)/1.6 Poppins", color: C.muted, maxWidth: 640, margin: "0 auto 28px" }}>
                From a 10-second log to full risk and psychology analytics, built for funded and prop firm traders across forex, futures, stocks, options and crypto. Works on desktop and mobile.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="/register" style={{ textDecoration: "none" }}>
                  <button style={{ ...btnPrimary, padding: "14px 28px", fontSize: 15, background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowDeep})`, boxShadow: "0 8px 28px rgba(252,213,53,0.3)" }}>
                    Start free, no card <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </a>
                <a href="/pricing" style={{ textDecoration: "none" }}>
                  <button style={{ ...btnGhost, padding: "14px 26px", fontSize: 15 }}>See pricing</button>
                </a>
              </div>
              <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", marginTop: 22, font: "400 13px Poppins", color: C.dim }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} aria-hidden="true" /> Free to start</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><MonitorSmartphone size={14} style={{ color: C.green }} aria-hidden="true" /> Desktop + mobile</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} aria-hidden="true" /> All markets</span>
              </div>
            </motion.div>
          </section>

          {/* feature groups */}
          {GROUPS.map((g) => (
            <section key={g.kicker} style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
              <div style={{ marginBottom: 18 }}>
                <span style={{ font: "600 13px Poppins", letterSpacing: "1px", textTransform: "uppercase", color: C.yellow }}>{g.kicker}</span>
                <h2 style={{ font: "700 clamp(22px,3.2vw,30px)/1.2 Poppins", margin: "6px 0 0", letterSpacing: "-0.6px" }}>{g.title}</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                {g.items.map(({ icon: Icon, title, body }, i) => (
                  <motion.article
                    key={title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: (i % 4) * 0.06, duration: 0.45 }}
                    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}
                  >
                    <span style={{ display: "inline-flex", width: 42, height: 42, borderRadius: 11, background: "rgba(252,213,53,0.12)", border: "1px solid rgba(252,213,53,0.2)", color: C.yellow, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <h3 style={{ font: "600 17px Poppins", margin: "0 0 7px" }}>{title}</h3>
                    <p style={{ font: "400 14px/1.6 Poppins", color: C.muted, margin: 0 }}>{body}</p>
                  </motion.article>
                ))}
              </div>
            </section>
          ))}

          {/* desktop + mobile highlight */}
          <section style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 20px 8px" }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "32px 28px", display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", justifyContent: "center", textAlign: "center" }}>
              <span style={{ display: "inline-flex", width: 56, height: 56, borderRadius: 16, background: "rgba(46,189,133,0.12)", color: C.green, alignItems: "center", justifyContent: "center" }}>
                <Smartphone size={26} aria-hidden="true" />
              </span>
              <div style={{ maxWidth: 560 }}>
                <h2 style={{ font: "700 clamp(22px,3.2vw,28px)/1.2 Poppins", margin: "0 0 8px", letterSpacing: "-0.5px" }}>Works on desktop &amp; mobile</h2>
                <p style={{ font: "400 16px/1.6 Poppins", color: C.muted, margin: 0 }}>
                  A fully responsive web app and an installable PWA. Review analytics on a big screen, then quick-log a trade from your phone the moment you close a position, your journal stays in sync.
                </p>
              </div>
            </div>
          </section>

          <Testimonials schema={false} />

          {/* CTA */}
          <section style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 72px", textAlign: "center" }}>
            <h2 style={{ font: "700 clamp(24px,3.4vw,32px)/1.2 Poppins", margin: "0 0 14px", letterSpacing: "-0.6px" }}>Start journaling smarter today</h2>
            <p style={{ font: "400 16px/1.6 Poppins", color: C.muted, margin: "0 auto 26px", maxWidth: 520 }}>Free to start, no credit card, full trade analysis in under 10 seconds.</p>
            <a href="/register" style={{ textDecoration: "none" }}>
              <button style={{ ...btnPrimary, padding: "15px 30px", fontSize: 16, background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowDeep})`, boxShadow: "0 8px 28px rgba(252,213,53,0.3)" }}>
                Create your free account <ArrowRight size={17} aria-hidden="true" />
              </button>
            </a>
          </section>
        </main>

        <LandingFooter />
      </div>
    </>
  );
}
