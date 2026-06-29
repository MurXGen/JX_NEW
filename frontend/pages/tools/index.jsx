"use client";

import Head from "next/head";
import { ArrowRight, Calculator, Percent, ShieldAlert, TrendingUp, Target } from "lucide-react";
import { LandingNav, LandingFooter, btnPrimary } from "@/components/landingPage/LandingChrome";

const SITE_URL = "https://journalx.app";
const C = { text: "#fff", muted: "#aeb4bc", dim: "#707a8a", canvas: "#0d1117", border: "rgba(255,255,255,0.1)", yellow: "#fcd535", yellowDeep: "#f0b90b" };

const TOOLS = [
  { href: "/tools/position-size-calculator", icon: Calculator, title: "Position Size Calculator", desc: "Find the exact quantity to trade so no single loss hurts your account — plus reward and R:R." },
  { href: "/tools/r-multiple-calculator", icon: Percent, title: "R-Multiple Calculator", desc: "Measure any trade in R — risk/reward the way professionals track it." },
  { href: "/tools/pnl-calculator", icon: TrendingUp, title: "Profit / Loss Calculator", desc: "Exact profit, loss and % return for any long or short trade, after fees." },
  { href: "/tools/breakeven-win-rate-calculator", icon: Target, title: "Breakeven Win-Rate", desc: "The win rate you need to beat for any reward:risk — and if you have an edge." },
  { href: "/tools/risk-of-ruin-calculator", icon: ShieldAlert, title: "Risk of Ruin Calculator", desc: "See the probability you blow your account, via Monte Carlo simulation." },
];

const TITLE = "Free Trading Calculators — Position Size, R-Multiple & Risk of Ruin | JournalX";
const DESC = "Free trading calculators for retail traders: position size, R-multiple and risk of ruin. No signup — calculate your risk in seconds, then journal it in JournalX.";

export default function ToolsIndex() {
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Free trading calculators",
    itemListElement: TOOLS.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.title, url: `${SITE_URL}${t.href}` })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Tools", item: `${SITE_URL}/tools` },
    ],
  };

  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <meta name="keywords" content="trading calculators, position size calculator, r multiple calculator, risk of ruin calculator, free trading tools, risk management calculator india" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <link rel="canonical" href={`${SITE_URL}/tools`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="JournalX" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={`${SITE_URL}/tools`} />
        <meta property="og:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESC} />
        <meta name="twitter:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta name="theme-color" content="#0d1117" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      </Head>

      <div style={{ background: C.canvas, color: C.text, fontFamily: "Poppins, sans-serif", minHeight: "100vh" }}>
        <LandingNav />
        <main style={{ maxWidth: 980, margin: "0 auto", padding: "44px 20px 80px" }}>
          <h1 style={{ font: "700 clamp(30px,5vw,46px)/1.1 Poppins", margin: "0 0 14px", letterSpacing: "-1.2px", textAlign: "center" }}>Free trading calculators</h1>
          <p style={{ font: "400 clamp(15px,2vw,18px)/1.6 Poppins", color: C.muted, maxWidth: 600, margin: "0 auto 36px", textAlign: "center" }}>
            Quick, no-signup tools to size your risk like a professional. Calculate here, then let JournalX track it automatically on every trade.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
            {TOOLS.map(({ href, icon: Icon, title, desc }) => (
              <a key={href} href={href} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ background: "rgba(22,26,32,0.6)", border: `1px solid ${C.border}`, borderRadius: 18, padding: 24, height: "100%" }}>
                  <span style={{ display: "inline-flex", width: 44, height: 44, borderRadius: 12, background: "rgba(252,213,53,0.14)", color: C.yellow, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h2 style={{ font: "600 18px Poppins", margin: "0 0 8px" }}>{title}</h2>
                  <p style={{ font: "400 14px/1.6 Poppins", color: C.muted, margin: "0 0 12px" }}>{desc}</p>
                  <span style={{ font: "600 13px Poppins", color: C.yellow, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    Open calculator <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </div>
              </a>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 44 }}>
            <a href="/register" style={{ textDecoration: "none" }}>
              <button style={{ ...btnPrimary, padding: "14px 28px", fontSize: 15, background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowDeep})` }}>
                Start journaling free <ArrowRight size={16} aria-hidden="true" />
              </button>
            </a>
          </div>
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
