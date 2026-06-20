"use client";

/* MarketLanding, reusable, SEO-rich landing template for per-market keyword
   pages (forex, crypto, stocks, futures, options, prop firm). Driven by a
   config from data/marketPages.js. Every market gets the same "log in 10s or
   import a sheet" angle plus market-specific copy, FAQ and structured data. */

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
  ShieldCheck,
  Target,
  Upload,
  Zap,
} from "lucide-react";
import { LandingNav, LandingFooter, btnPrimary, btnGhost } from "@/components/landingPage/LandingChrome";
import Testimonials from "@/components/landingPage/Testimonials";

const SITE_URL = "https://journalx.app";
const C = {
  text: "#fff", muted: "#aeb4bc", dim: "#707a8a", canvas: "#0d1117",
  surface: "#161a20", border: "rgba(255,255,255,0.1)", yellow: "#fcd535", yellowDeep: "#f0b90b", green: "#2ebd85",
};
const EXTRA_ICONS = { shield: ShieldCheck, clock: Clock, candles: CandlestickChart, calendar: CalendarDays, target: Target };

export default function MarketLanding({ cfg }) {
  const url = `${SITE_URL}/${cfg.slug}`;
  const m = cfg.market;
  const highlights = [
    { icon: Zap, title: `Log a ${m} trade in 10 seconds`, body: "Quick-log just your net P&L, or capture full detail, entries, exits, size, risk, screenshots and emotions." },
    { icon: Upload, title: "Import your trades from a sheet", body: "Bulk-import with our quick or detailed CSV templates, or connect a read-only exchange/broker to auto-sync your history." },
    { icon: BarChart3, title: `Analytics built for ${m}`, body: "Win rate, R-multiples, payoff, drawdown and equity-growth candles, all computed from your real trades." },
    { icon: BrainCircuit, title: "Fix your psychology leaks", body: "Tag emotion and discipline on every trade and see exactly what tilt, FOMO and revenge trading cost you." },
  ];
  if (cfg.extra) {
    const Icon = EXTRA_ICONS[cfg.extra.icon] || Target;
    highlights.push({ icon: Icon, title: cfg.extra.title, body: cfg.extra.body });
  }

  const appLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "JournalX",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web, iOS, Android (PWA)",
    description: cfg.description,
    url,
    image: `${SITE_URL}/assets/JournalX_Banner.png`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", ratingCount: "1240" },
    publisher: { "@type": "Organization", name: "JournalX", url: SITE_URL },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (cfg.faqs || []).map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Features", item: `${SITE_URL}/features` },
      { "@type": "ListItem", position: 3, name: cfg.h1, item: url },
    ],
  };

  return (
    <>
      <Head>
        <title>{cfg.title}</title>
        <meta name="description" content={cfg.description} />
        <meta name="keywords" content={(cfg.keywords || []).join(", ")} />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="JournalX" />
        <meta property="og:title" content={cfg.title} />
        <meta property="og:description" content={cfg.description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={cfg.title} />
        <meta name="twitter:description" content={cfg.description} />
        <meta name="twitter:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta name="theme-color" content="#0d1117" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      </Head>

      <div style={{ background: C.canvas, color: C.text, fontFamily: "Poppins, sans-serif", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
        <LandingNav />

        <main style={{ position: "relative", zIndex: 1 }}>
          {/* hero */}
          <section style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px 22px", textAlign: "center", position: "relative" }}>
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(640px 340px at 50% -10%, rgba(252,213,53,0.16), transparent 70%)", pointerEvents: "none" }} />
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ position: "relative", zIndex: 1 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(252,213,53,0.12)", border: "1px solid rgba(252,213,53,0.3)", color: C.yellow, borderRadius: 999, padding: "6px 14px", font: "600 13px Poppins", marginBottom: 22 }}>
                <Zap size={14} aria-hidden="true" /> {cfg.eyebrow}
              </span>
              <h1 style={{ font: "700 clamp(32px,5vw,52px)/1.08 Poppins", margin: "0 0 18px", letterSpacing: "-1.4px" }}>{cfg.h1}</h1>
              <p style={{ font: "400 clamp(16px,2.2vw,19px)/1.6 Poppins", color: C.muted, maxWidth: 640, margin: "0 auto 28px" }}>{cfg.intro}</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="/register" style={{ textDecoration: "none" }}>
                  <button style={{ ...btnPrimary, padding: "14px 28px", fontSize: 15, background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowDeep})`, boxShadow: "0 8px 28px rgba(252,213,53,0.3)" }}>
                    Start free, no card <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </a>
                <a href="/features" style={{ textDecoration: "none" }}>
                  <button style={{ ...btnGhost, padding: "14px 26px", fontSize: 15 }}>See all features</button>
                </a>
              </div>
              <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", marginTop: 22, font: "400 13px Poppins", color: C.dim }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} aria-hidden="true" /> 10-second quick log</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} aria-hidden="true" /> Import from a sheet</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} aria-hidden="true" /> Desktop + mobile</span>
              </div>
            </motion.div>
          </section>

          {/* highlights */}
          <section style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
              {highlights.map(({ icon: Icon, title, body }, i) => (
                <motion.article
                  key={title}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.06, duration: 0.45 }}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}
                >
                  <span style={{ display: "inline-flex", width: 42, height: 42, borderRadius: 11, background: "rgba(252,213,53,0.12)", border: "1px solid rgba(252,213,53,0.2)", color: C.yellow, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <h2 style={{ font: "600 17px Poppins", margin: "0 0 7px" }}>{title}</h2>
                  <p style={{ font: "400 14px/1.6 Poppins", color: C.muted, margin: 0 }}>{body}</p>
                </motion.article>
              ))}
            </div>
          </section>

          {/* quick log / import band */}
          <section style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 20px" }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "30px 26px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }} className="ml-band">
              <div>
                <span style={{ display: "inline-flex", width: 40, height: 40, borderRadius: 11, background: "rgba(46,189,133,0.12)", color: C.green, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <Zap size={18} aria-hidden="true" />
                </span>
                <h2 style={{ font: "600 19px Poppins", margin: "0 0 8px" }}>Log P&L in seconds</h2>
                <p style={{ font: "400 15px/1.6 Poppins", color: C.muted, margin: 0 }}>Just closed a trade? Drop the net P&L and you&apos;re done, or add full detail when you want deeper analytics.</p>
              </div>
              <div>
                <span style={{ display: "inline-flex", width: 40, height: 40, borderRadius: 11, background: "rgba(252,213,53,0.12)", color: C.yellow, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <Upload size={18} aria-hidden="true" />
                </span>
                <h2 style={{ font: "600 19px Poppins", margin: "0 0 8px" }}>Import from a sheet</h2>
                <p style={{ font: "400 15px/1.6 Poppins", color: C.muted, margin: 0 }}>Bring your history in bulk with our CSV templates (quick or detailed), or auto-sync a connected exchange.</p>
              </div>
            </div>
          </section>

          {/* testimonials (rating schema lives on /features + /pricing to avoid duplicates) */}
          <Testimonials schema={false} />

          {/* FAQ */}
          {cfg.faqs?.length > 0 && (
            <section style={{ maxWidth: 800, margin: "0 auto", padding: "20px 20px 8px" }}>
              <h2 style={{ font: "700 clamp(22px,3.2vw,30px)/1.2 Poppins", margin: "0 0 18px", letterSpacing: "-0.6px", textAlign: "center" }}>Frequently asked questions</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {cfg.faqs.map(([q, a]) => (
                  <div key={q} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
                    <h3 style={{ font: "600 16px Poppins", margin: "0 0 6px" }}>{q}</h3>
                    <p style={{ font: "400 14px/1.6 Poppins", color: C.muted, margin: 0 }}>{a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <section style={{ maxWidth: 720, margin: "0 auto", padding: "30px 20px 72px", textAlign: "center" }}>
            <h2 style={{ font: "700 clamp(24px,3.4vw,32px)/1.2 Poppins", margin: "0 0 14px", letterSpacing: "-0.6px" }}>Start your {m} journal today</h2>
            <p style={{ font: "400 16px/1.6 Poppins", color: C.muted, margin: "0 auto 26px", maxWidth: 520 }}>Free to start, no credit card. Log in seconds or import your sheet, full analysis in under 10 seconds.</p>
            <a href="/register" style={{ textDecoration: "none" }}>
              <button style={{ ...btnPrimary, padding: "15px 30px", fontSize: 16, background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowDeep})`, boxShadow: "0 8px 28px rgba(252,213,53,0.3)" }}>
                Create your free account <ArrowRight size={17} aria-hidden="true" />
              </button>
            </a>
          </section>
        </main>

        <LandingFooter />
      </div>

      <style jsx>{`
        @media (max-width: 720px) {
          :global(.ml-band) { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
