"use client";

/* Shared shell for the free calculator tools (/tools/*).
   Renders SEO head (WebApplication + FAQPage + BreadcrumbList schema), the
   landing chrome, a hero, the calculator (children), an explainer, FAQs, and a
   conversion CTA. Keeps every tool page consistent and link-worthy. */

import Head from "next/head";
import { ArrowRight } from "lucide-react";
import { LandingNav, LandingFooter, btnPrimary } from "@/components/landingPage/LandingChrome";

const SITE_URL = "https://journalx.app";
export const TC = {
  text: "#fff", muted: "#aeb4bc", dim: "#707a8a", canvas: "#0d1117",
  surface: "#161a20", border: "rgba(255,255,255,0.1)", yellow: "#fcd535",
  yellowDeep: "#f0b90b", green: "#2ebd85", red: "#f6465d",
};

export const toolCard = {
  background: "rgba(22,26,32,0.6)",
  border: `1px solid ${TC.border}`,
  borderRadius: 18,
  padding: 22,
};
export const toolInput = {
  background: "rgba(13,17,23,0.7)", border: `1px solid ${TC.border}`, borderRadius: 10,
  padding: "12px 14px", color: TC.text, font: "400 15px Poppins", width: "100%",
  boxSizing: "border-box", outline: "none",
};
export const toolLabel = { font: "400 12px Poppins", color: TC.dim, marginBottom: 6, display: "block" };

export default function ToolPage({ slug, title, description, keywords = [], h1, intro, faqs = [], explainer = [], related = [], children }) {
  const url = `${SITE_URL}/tools/${slug}`;
  const appLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: title,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url,
    description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: "JournalX", url: SITE_URL },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Tools", item: `${SITE_URL}/tools` },
      { "@type": "ListItem", position: 3, name: h1, item: url },
    ],
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords.join(", ")} />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="JournalX" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta name="theme-color" content="#0d1117" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      </Head>

      <div style={{ background: TC.canvas, color: TC.text, fontFamily: "Poppins, sans-serif", minHeight: "100vh" }}>
        <LandingNav />
        <main style={{ maxWidth: 820, margin: "0 auto", padding: "36px 20px 80px" }}>
          <nav style={{ font: "400 13px Poppins", color: TC.dim, marginBottom: 14 }}>
            <a href="/" style={{ color: "inherit", textDecoration: "none" }}>Home</a> ·{" "}
            <a href="/tools" style={{ color: "inherit", textDecoration: "none" }}>Tools</a>
          </nav>

          <h1 style={{ font: "700 clamp(28px,4.5vw,42px)/1.1 Poppins", margin: "0 0 14px", letterSpacing: "-1px" }}>{h1}</h1>
          <p style={{ font: "400 clamp(15px,2vw,18px)/1.6 Poppins", color: TC.muted, margin: "0 0 26px", maxWidth: 640 }}>{intro}</p>

          {/* the calculator */}
          {children}

          {/* explainer */}
          {explainer.length > 0 && (
            <section style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 18 }}>
              {explainer.map((b, i) => (
                <div key={i}>
                  {b.h && <h2 style={{ font: "700 clamp(20px,3vw,26px)/1.2 Poppins", margin: "0 0 8px" }}>{b.h}</h2>}
                  <p style={{ font: "400 15px/1.7 Poppins", color: TC.muted, margin: 0 }}>{b.p}</p>
                </div>
              ))}
            </section>
          )}

          {/* FAQ */}
          {faqs.length > 0 && (
            <section style={{ marginTop: 40 }}>
              <h2 style={{ font: "700 clamp(20px,3vw,26px)/1.2 Poppins", margin: "0 0 14px" }}>Frequently asked questions</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {faqs.map(([q, a]) => (
                  <div key={q} style={{ ...toolCard, padding: 16 }}>
                    <h3 style={{ font: "600 15px Poppins", margin: "0 0 6px" }}>{q}</h3>
                    <p style={{ font: "400 14px/1.6 Poppins", color: TC.muted, margin: 0 }}>{a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* related tools */}
          {related.length > 0 && (
            <section style={{ marginTop: 36 }}>
              <h2 style={{ font: "600 16px Poppins", margin: "0 0 12px", color: TC.muted }}>More free tools</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {related.map((r) => (
                  <a key={r.href} href={r.href} style={{ ...toolCard, padding: "10px 16px", textDecoration: "none", color: TC.text, font: "600 14px Poppins" }}>{r.label}</a>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <section style={{ marginTop: 40, ...toolCard, textAlign: "center", background: "linear-gradient(135deg, rgba(252,213,53,0.14), rgba(46,189,133,0.08))", border: "1px solid rgba(252,213,53,0.3)", padding: 30 }}>
            <h2 style={{ font: "700 clamp(20px,3vw,26px)/1.2 Poppins", margin: "0 0 10px" }}>Stop calculating in your head</h2>
            <p style={{ font: "400 15px/1.6 Poppins", color: TC.muted, margin: "0 auto 18px", maxWidth: 440 }}>
              JournalX logs every trade and computes your risk, R-multiples and drawdown automatically — free to start, no card.
            </p>
            <a href="/register" style={{ textDecoration: "none" }}>
              <button style={{ ...btnPrimary, padding: "13px 26px", fontSize: 15, background: `linear-gradient(90deg, ${TC.yellow}, ${TC.yellowDeep})` }}>
                Start journaling free <ArrowRight size={16} aria-hidden="true" />
              </button>
            </a>
          </section>
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
