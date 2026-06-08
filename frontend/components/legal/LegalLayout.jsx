"use client";

/* Shared layout for all legal pages — marketing chrome, readable
   prose, table of contents, consistent v2 styling + per-page SEO. */

import Head from "next/head";
import { LandingNav, LandingFooter } from "@/components/landingPage/LandingChrome";

const SITE_URL = "https://journalx.app";

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function LegalLayout({ title, path, description, updated, intro, sections = [] }) {
  return (
    <>
      <Head>
        <title>{title} | JournalX</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${SITE_URL}${path}`} />
        <meta property="og:title" content={`${title} | JournalX`} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${SITE_URL}${path}`} />
        <meta property="og:type" content="website" />
      </Head>

      <div style={{ background: "#0d1117", color: "#fff", fontFamily: "Poppins, sans-serif", minHeight: "100vh" }}>
        <LandingNav />

        <main style={{ maxWidth: 880, margin: "0 auto", padding: "56px 20px 96px" }}>
          <span style={{ font: "600 13px Poppins", color: "#fcd535", letterSpacing: 0.6, textTransform: "uppercase" }}>Legal</span>
          <h1 style={{ font: "700 clamp(28px,5vw,42px)/1.1 Poppins", margin: "8px 0 10px", letterSpacing: "-1px" }}>{title}</h1>
          <p style={{ font: "400 14px Poppins", color: "#707a8a", margin: "0 0 8px" }}>Last updated: {updated}</p>
          {intro && <p style={{ font: "400 16px/1.7 Poppins", color: "#aeb4bc", maxWidth: 680 }}>{intro}</p>}

          {/* table of contents */}
          <nav style={{ margin: "28px 0", padding: "18px 20px", background: "#161a20", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
            <div style={{ font: "600 12px Poppins", color: "#707a8a", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 }}>On this page</div>
            <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              {sections.map((s) => (
                <li key={s.h}>
                  <a href={`#${slug(s.h)}`} style={{ color: "#aeb4bc", textDecoration: "none", font: "400 14px Poppins" }}>{s.h}</a>
                </li>
              ))}
            </ol>
          </nav>

          {/* sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6, 28px)" }}>
            {sections.map((s) => (
              <section key={s.h} id={slug(s.h)} style={{ scrollMarginTop: 80 }}>
                <h2 style={{ font: "600 22px Poppins", margin: "0 0 12px", color: "#fff" }}>{s.h}</h2>
                {s.body.map((para, i) =>
                  Array.isArray(para) ? (
                    <ul key={i} style={{ margin: "0 0 14px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                      {para.map((li, j) => (
                        <li key={j} style={{ font: "400 15px/1.7 Poppins", color: "#aeb4bc" }}>{li}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i} style={{ font: "400 15px/1.7 Poppins", color: "#aeb4bc", margin: "0 0 14px" }}>{para}</p>
                  ),
                )}
              </section>
            ))}
          </div>

          <div style={{ marginTop: 40, padding: "18px 20px", background: "#161a20", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, font: "400 14px/1.7 Poppins", color: "#707a8a" }}>
            Questions about this policy? Contact us at{" "}
            <a href="mailto:support@journalx.app" style={{ color: "#fcd535", textDecoration: "none" }}>support@journalx.app</a>.
          </div>
        </main>

        <LandingFooter />
      </div>
    </>
  );
}
