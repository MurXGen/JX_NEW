"use client";

/* JournalX landing — v2 redesign. Self-contained marketing page on a
   dark skin; full SEO (meta, OG, Twitter, Organization + SoftwareApp
   JSON-LD); mobile responsive top to bottom. */

import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  Check,
  Flame,
  LineChart,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import FullPageLoader from "@/components/ui/FullPageLoader";
import { LandingNav, LandingFooter, btnPrimary, btnGhost } from "@/components/landingPage/LandingChrome";

const SITE_URL = "https://journalx.app";
const DESC =
  "JournalX is the all-in-one trading journal for stocks, options, forex, futures & crypto. Log trades in seconds, track risk and psychology, and turn your history into a measurable edge.";

const C = { text: "#fff", muted: "#aeb4bc", dim: "#707a8a", surface: "#161a20", border: "rgba(255,255,255,0.08)", yellow: "#fcd535", green: "#2ebd85", red: "#f6465d" };

const FEATURES = [
  { icon: Zap, title: "Log trades in seconds", body: "Quick log for P&L-only, or full detail with entries, risk, screenshots and emotions. Connect an exchange and trades import automatically." },
  { icon: BarChart3, title: "Analytics that find your edge", body: "Equity growth candles, P&L calendars, R-multiples, win rate trends, and per-strategy breakdowns — all computed from your real trades." },
  { icon: BrainCircuit, title: "Master your psychology", body: "Tag emotion and discipline on every trade. See exactly how much tilt and FOMO cost you, and where your real edge comes from." },
  { icon: ShieldCheck, title: "Risk, measured", body: "Fixed-risk position sizing, planned vs realised R:R, and profit factor — the metrics that actually keep accounts alive." },
  { icon: CalendarDays, title: "See every day at a glance", body: "A colour-coded P&L calendar and activity heatmap make your consistency (or lack of it) impossible to ignore." },
  { icon: LineChart, title: "Live market context", body: "Ticker tape, heatmaps, economic calendar and news — plus an 'if you'd held' live price check on closed trades." },
];

const WHY = [
  ["Log a trade in 10 seconds", "Spreadsheets take minutes per trade — so you quit"],
  ["Discipline scored at entry", "Generic journals only record numbers after the fact"],
  ["Emotion & mistake analytics", "Broker statements have none of this"],
  ["Equity growth candlesticks", "Most tools show a flat P&L line"],
  ["Auto-import from exchanges", "Manual CSV wrangling everywhere else"],
  ["Free to start, no card", "Many competitors gate everything behind a paywall"],
];

const STEPS = [
  { n: "01", title: "Log or import", body: "Quick log, detailed log, CSV import, or auto-sync from your exchange." },
  { n: "02", title: "Review the analytics", body: "Your dashboard turns trades into equity growth, R-multiples and behavioural insights." },
  { n: "03", title: "Fix one leak at a time", body: "Spot your most expensive habit, fix it, and watch your equity curve respond." },
];

const TESTIMONIALS = [
  { q: "I finally see where my losses actually come from. Cut my revenge trades to almost zero in a month.", n: "Arjun M.", r: "Futures trader" },
  { q: "The equity growth candles are addictive — it genuinely makes me want to log every trade.", n: "Sofia L.", r: "Crypto swing trader" },
  { q: "Quick log means I never skip a trade anymore. The discipline score changed how I trade.", n: "Daniel K.", r: "Options trader" },
];

const FAQS = [
  ["Is JournalX free?", "Yes — you can start free with no card required. Paid plans unlock advanced analytics and higher limits."],
  ["Which markets does it support?", "Stocks, options, forex, futures and crypto — log any instrument, in any currency."],
  ["Can I import my existing trades?", "Yes. Import a CSV with our template, or connect a supported exchange to auto-sync your trade history."],
  ["Do you store my exchange keys safely?", "We only ever use read-only API keys, stored locally on your device, purely to fetch your trades."],
  ["Can I journal on mobile?", "Absolutely — JournalX is fully responsive with a dedicated mobile experience and quick log."],
];

function Section({ children, style }) {
  return <section style={{ maxWidth: 1160, margin: "0 auto", padding: "72px 20px", ...style }}>{children}</section>;
}

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [faq, setFaq] = useState(0);

  useEffect(() => {
    if (Cookies.get("isVerified") === "yes") router.push("/dashboard");
    else setLoading(false);
  }, [router]);

  if (loading) return <FullPageLoader />;

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "JournalX",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web, iOS, Android",
    description: DESC,
    url: SITE_URL,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", ratingCount: "1240" },
    publisher: { "@type": "Organization", name: "JournalX", url: SITE_URL },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <>
      <Head>
        <title>JournalX — The Trading Journal That Builds Your Edge | Stocks, Forex & Crypto</title>
        <meta name="description" content={DESC} />
        <meta name="keywords" content="trading journal, trade journal app, stock trading journal, forex trade log, crypto trading journal, options tracker, futures journal, trade analytics, trading psychology, risk management, R-multiple, position sizing, journalx" />
        <meta name="author" content="JournalX" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="JournalX — The Trading Journal That Builds Your Edge" />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="JournalX — The Trading Journal That Builds Your Edge" />
        <meta name="twitter:description" content={DESC} />
        <meta name="twitter:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta name="theme-color" content="#0d1117" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      </Head>

      <div style={{ background: "#0d1117", color: C.text, fontFamily: "Poppins, sans-serif", minHeight: "100vh" }}>
        <LandingNav />

        {/* ===== Hero ===== */}
        <Section style={{ paddingTop: 72, paddingBottom: 48, textAlign: "center", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(700px 380px at 50% -10%, rgba(252,213,53,0.16), transparent 70%)", pointerEvents: "none" }} />
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ position: "relative" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(252,213,53,0.12)", border: "1px solid rgba(252,213,53,0.3)", color: C.yellow, borderRadius: 999, padding: "6px 14px", font: "600 13px Poppins", marginBottom: 22 }}>
              <Sparkles size={14} /> A fresh trading lesson every day on our blog
            </span>
            <h1 style={{ font: "700 clamp(34px, 6vw, 60px)/1.08 Poppins", margin: "0 auto 18px", maxWidth: 860, letterSpacing: "-1.5px" }}>
              The trading journal that turns your history into a <span style={{ color: C.yellow }}>measurable edge</span>.
            </h1>
            <p style={{ font: "400 clamp(16px,2.2vw,19px)/1.6 Poppins", color: C.muted, maxWidth: 620, margin: "0 auto 30px" }}>
              Log trades in seconds. Track risk, psychology and discipline. Watch your equity grow — for stocks, options, forex, futures and crypto.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/register" style={{ textDecoration: "none" }}><button style={{ ...btnPrimary, padding: "14px 26px", fontSize: 15 }}>Start journaling free <ArrowRight size={16} /></button></a>
              <a href="/blog" style={{ textDecoration: "none" }}><button style={{ ...btnGhost, padding: "14px 26px", fontSize: 15 }}>Read the blog</button></a>
            </div>
            <div style={{ display: "flex", gap: 22, justifyContent: "center", flexWrap: "wrap", marginTop: 26, font: "400 13px Poppins", color: C.dim }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} /> Free to start</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} /> No card required</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} /> All markets</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
            style={{ position: "relative", marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, maxWidth: 720, marginInline: "auto" }}>
            {[["250k+", "Trades logged"], ["4.8★", "Avg. rating"], ["40+", "Markets"], ["10s", "To log a trade"]].map(([v, l]) => (
              <div key={l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 16px" }}>
                <div style={{ font: "700 26px Poppins", color: C.yellow, letterSpacing: "-1px" }}>{v}</div>
                <div style={{ font: "400 13px Poppins", color: C.muted }}>{l}</div>
              </div>
            ))}
          </motion.div>
        </Section>

        {/* ===== Features ===== */}
        <Section style={{ paddingTop: 32 }}>
          <div id="features" style={{ scrollMarginTop: 80 }} />
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <h2 style={{ font: "700 clamp(26px,4vw,40px)/1.1 Poppins", margin: "0 0 12px", letterSpacing: "-1px" }}>Everything you need to trade like a pro</h2>
            <p style={{ font: "400 17px/1.6 Poppins", color: C.muted, maxWidth: 560, margin: "0 auto" }}>One journal that scales from a 10-second log to full risk and psychology analytics.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.08 }}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 26 }}>
                <span style={{ display: "inline-flex", width: 44, height: 44, borderRadius: 12, background: "rgba(252,213,53,0.12)", color: C.yellow, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Icon size={20} />
                </span>
                <div style={{ font: "600 18px Poppins", marginBottom: 8 }}>{title}</div>
                <p style={{ font: "400 14px/1.6 Poppins", color: C.muted, margin: 0 }}>{body}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ===== Why JournalX ===== */}
        <div style={{ background: "#0b0e13", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <Section>
            <div id="why" style={{ scrollMarginTop: 80 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }} className="lp-why-grid">
              <div>
                <h2 style={{ font: "700 clamp(26px,4vw,38px)/1.12 Poppins", margin: "0 0 16px", letterSpacing: "-1px" }}>Why traders switch to <span style={{ color: C.yellow }}>JournalX</span></h2>
                <p style={{ font: "400 16px/1.7 Poppins", color: C.muted, marginBottom: 24 }}>
                  Spreadsheets are slow and blind. Broker statements are raw. JournalX is the only journal built to turn discipline and risk into metrics you can actually improve.
                </p>
                <a href="/register" style={{ textDecoration: "none" }}><button style={{ ...btnPrimary, padding: "13px 24px" }}>Try it free <ArrowRight size={15} /></button></a>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {WHY.map(([feat, vs]) => (
                  <div key={feat} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ marginTop: 2, color: C.green, flexShrink: 0 }}><Check size={18} /></span>
                    <span>
                      <div style={{ font: "600 15px Poppins" }}>{feat}</div>
                      <div style={{ font: "400 13px Poppins", color: C.dim }}>{vs}</div>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </div>

        {/* ===== How it works ===== */}
        <Section>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <h2 style={{ font: "700 clamp(26px,4vw,38px)/1.1 Poppins", margin: "0 0 12px", letterSpacing: "-1px" }}>From first log to lasting edge</h2>
            <p style={{ font: "400 17px/1.6 Poppins", color: C.muted, maxWidth: 520, margin: "0 auto" }}>Three steps, repeated, compound into consistency.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 28 }}>
                <div style={{ font: "700 30px Poppins", color: "rgba(252,213,53,0.4)", marginBottom: 10 }}>{s.n}</div>
                <div style={{ font: "600 18px Poppins", marginBottom: 8 }}>{s.title}</div>
                <p style={{ font: "400 14px/1.6 Poppins", color: C.muted, margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ===== Testimonials ===== */}
        <div style={{ background: "#0b0e13", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <Section>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ font: "700 clamp(26px,4vw,38px)/1.1 Poppins", margin: "0 0 12px", letterSpacing: "-1px" }}>Traders are building real edges</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
              {TESTIMONIALS.map((t) => (
                <div key={t.n} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 26 }}>
                  <div style={{ display: "flex", gap: 3, marginBottom: 14 }}>
                    {[...Array(5)].map((_, i) => <Star key={i} size={16} fill={C.yellow} color={C.yellow} />)}
                  </div>
                  <p style={{ font: "400 15px/1.6 Poppins", color: "#d6dae0", margin: "0 0 18px" }}>“{t.q}”</p>
                  <div style={{ font: "600 14px Poppins" }}>{t.n}</div>
                  <div style={{ font: "400 13px Poppins", color: C.dim }}>{t.r}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* ===== FAQ ===== */}
        <Section style={{ maxWidth: 760 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h2 style={{ font: "700 clamp(26px,4vw,38px)/1.1 Poppins", margin: 0, letterSpacing: "-1px" }}>Frequently asked questions</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQS.map(([q, a], i) => (
              <div key={q} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
                <button onClick={() => setFaq(faq === i ? -1 : i)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "none", border: "none", color: C.text, cursor: "pointer", padding: "18px 20px", font: "600 16px Poppins", textAlign: "left" }}>
                  {q}
                  <span style={{ color: C.yellow, transform: faq === i ? "rotate(45deg)" : "none", transition: "transform .2s", flexShrink: 0, fontSize: 20 }}>+</span>
                </button>
                {faq === i && <div style={{ padding: "0 20px 18px", font: "400 14px/1.6 Poppins", color: C.muted }}>{a}</div>}
              </div>
            ))}
          </div>
        </Section>

        {/* ===== Final CTA ===== */}
        <Section style={{ paddingBottom: 80 }}>
          <div style={{ background: "linear-gradient(135deg, rgba(252,213,53,0.16), rgba(46,189,133,0.1))", border: "1px solid rgba(252,213,53,0.3)", borderRadius: 24, padding: "56px 28px", textAlign: "center" }}>
            <Flame size={34} style={{ color: C.yellow }} />
            <h2 style={{ font: "700 clamp(26px,4vw,40px)/1.1 Poppins", margin: "14px 0 12px", letterSpacing: "-1px" }}>Your next trade deserves a journal</h2>
            <p style={{ font: "400 17px/1.6 Poppins", color: C.muted, maxWidth: 480, margin: "0 auto 26px" }}>Start free, log your first trade in under a minute, and see where your edge really is.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/register" style={{ textDecoration: "none" }}><button style={{ ...btnPrimary, padding: "14px 28px", fontSize: 15 }}>Start journaling free <ArrowRight size={16} /></button></a>
              <a href="/pricing" style={{ textDecoration: "none" }}><button style={{ ...btnGhost, padding: "14px 28px", fontSize: 15 }}>See pricing</button></a>
            </div>
          </div>
        </Section>

        <LandingFooter />
      </div>

      <style jsx>{`
        @media (max-width: 820px) {
          :global(.lp-why-grid) { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
      `}</style>
    </>
  );
}
