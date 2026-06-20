"use client";

/* /refer — referral landing page. The link shared from Settings → "Refer a
   friend" points here (with a ?ref=<id> tag). It pitches JournalX and sends
   the visitor to sign up free (no card). SEO-optimised. */

import Head from "next/head";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Check,
  Gift,
  LineChart,
  NotebookPen,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { LandingNav, LandingFooter, btnPrimary, btnGhost } from "@/components/landingPage/LandingChrome";
import Testimonials from "@/components/landingPage/Testimonials";

const SITE_URL = "https://journalx.app";
const TITLE = "Refer a friend to JournalX — start free, no card";
const DESC =
  "A friend invited you to JournalX, the trading journal that finds your edge in under 10 seconds. Start free — no credit card required. Track win rate, R-multiples, risk, drawdown and psychology across forex, futures, stocks, options and crypto.";

const C = {
  text: "#fff",
  muted: "#aeb4bc",
  dim: "#707a8a",
  canvas: "#0d1117",
  surface: "#161a20",
  border: "rgba(255,255,255,0.1)",
  yellow: "#fcd535",
  yellowDeep: "#f0b90b",
  green: "#2ebd85",
};

const STEPS = [
  { icon: NotebookPen, title: "Create your free account", body: "Sign up in seconds — no credit card, no commitment. Your first journal is ready instantly." },
  { icon: BarChart3, title: "Log your trades", body: "Add trades manually, import from your broker, or mark them on a chart. Quick or detailed — your call." },
  { icon: LineChart, title: "Find your edge", body: "Win rate, R-multiples, drawdown, payoff and psychology — computed automatically so you know what to fix." },
];

export default function ReferPage() {
  const router = useRouter();
  const ref = router.query?.ref;
  const registerHref = ref ? `/register?ref=${encodeURIComponent(String(ref))}` : "/register";

  const pageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: TITLE,
    description: DESC,
    url: `${SITE_URL}/refer`,
    isPartOf: { "@type": "WebSite", name: "JournalX", url: SITE_URL },
  };

  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <meta
          name="keywords"
          content="JournalX referral, trading journal invite, refer a friend trading journal, free trading journal, trading journal no credit card, trade analytics, trading psychology app, journalx"
        />
        <meta name="author" content="JournalX" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <link rel="canonical" href={`${SITE_URL}/refer`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="JournalX" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={`${SITE_URL}/refer`} />
        <meta property="og:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESC} />
        <meta name="twitter:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta name="theme-color" content="#0d1117" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageLd) }} />
      </Head>

      <div style={{ background: C.canvas, color: C.text, fontFamily: "Poppins, sans-serif", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
        <LandingNav />

        <main style={{ position: "relative", zIndex: 1 }}>
          {/* ===== Hero ===== */}
          <section style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 20px 36px", textAlign: "center", position: "relative" }}>
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(680px 380px at 50% -10%, rgba(252,213,53,0.16), transparent 70%)", pointerEvents: "none" }} />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ position: "relative", zIndex: 1 }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(252,213,53,0.12)", border: "1px solid rgba(252,213,53,0.3)", color: C.yellow, borderRadius: 999, padding: "6px 14px", font: "600 13px Poppins", marginBottom: 22 }}>
                <Gift size={14} aria-hidden="true" /> You&apos;ve been invited
              </span>
              <h1 style={{ font: "700 clamp(34px, 5.2vw, 56px)/1.08 Poppins", margin: "0 0 18px", letterSpacing: "-1.5px", maxWidth: 820, marginInline: "auto" }}>
                A friend invited you to{" "}
                <span style={{ background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowDeep})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                  JournalX
                </span>
              </h1>
              <p style={{ font: "400 clamp(16px,2.2vw,19px)/1.6 Poppins", color: C.muted, maxWidth: 620, margin: "0 auto 30px" }}>
                The trading journal that turns every trade into the analytics that
                actually grow an account — win rate, R-multiples, risk, drawdown and
                psychology. Start free, no credit card required.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a href={registerHref} style={{ textDecoration: "none" }}>
                  <button style={{ ...btnPrimary, padding: "14px 28px", fontSize: 15, background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowDeep})`, boxShadow: "0 8px 28px rgba(252,213,53,0.3)" }}>
                    Start free — no card <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </a>
                <a href="/login" style={{ textDecoration: "none" }}>
                  <button style={{ ...btnGhost, padding: "14px 26px", fontSize: 15 }}>I already have an account</button>
                </a>
              </div>
              <div style={{ display: "flex", gap: 22, justifyContent: "center", flexWrap: "wrap", marginTop: 24, font: "400 13px Poppins", color: C.dim }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} aria-hidden="true" /> Free to start</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} aria-hidden="true" /> No card required</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check size={14} style={{ color: C.green }} aria-hidden="true" /> All markets</span>
              </div>
            </motion.div>
          </section>

          {/* ===== How it works ===== */}
          <section style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 8px" }}>
            <div className="refer-steps" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24 }}
                >
                  <span style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(252,213,53,0.12)", color: C.yellow, marginBottom: 14 }}>
                    <s.icon size={22} aria-hidden="true" />
                  </span>
                  <div style={{ font: "600 13px Poppins", color: C.dim, marginBottom: 4 }}>Step {i + 1}</div>
                  <h3 style={{ font: "600 19px/1.3 Poppins", margin: "0 0 8px" }}>{s.title}</h3>
                  <p style={{ font: "400 15px/1.6 Poppins", color: C.muted, margin: 0 }}>{s.body}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ===== Testimonials ===== */}
          <Testimonials schema />

          {/* ===== Reassurance + CTA ===== */}
          <section style={{ maxWidth: 760, margin: "0 auto", padding: "44px 20px 72px", textAlign: "center" }}>
            <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap", marginBottom: 26, color: C.muted, font: "400 14px Poppins" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><ShieldCheck size={16} style={{ color: C.green }} aria-hidden="true" /> Your data stays private</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Sparkles size={16} style={{ color: C.yellow }} aria-hidden="true" /> Full analysis in seconds</span>
            </div>
            <h2 style={{ font: "700 clamp(24px,3.4vw,32px)/1.2 Poppins", margin: "0 0 14px", letterSpacing: "-0.6px" }}>
              Ready to find your edge?
            </h2>
            <p style={{ font: "400 16px/1.6 Poppins", color: C.muted, margin: "0 auto 26px", maxWidth: 520 }}>
              Join thousands of traders journaling smarter. It only takes a minute,
              and it&apos;s free to start.
            </p>
            <a href={registerHref} style={{ textDecoration: "none" }}>
              <button style={{ ...btnPrimary, padding: "15px 30px", fontSize: 16, background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowDeep})`, boxShadow: "0 8px 28px rgba(252,213,53,0.3)" }}>
                Create your free account <ArrowRight size={17} aria-hidden="true" />
              </button>
            </a>
            <p style={{ font: "400 12px/1.6 Poppins", color: C.dim, margin: "22px auto 0", maxWidth: 560 }}>
              JournalX is a journaling and analytics tool only and does not provide
              financial advice or services. The referral programme is offered at
              JournalX&apos;s discretion and may be changed or ended at any time.
            </p>
          </section>
        </main>

        <LandingFooter />
      </div>

      <style jsx>{`
        @media (max-width: 820px) {
          :global(.refer-steps) { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
