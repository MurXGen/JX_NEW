"use client";

/* Contact page — matches the marketing/legal dark theme so text is
   always readable (the public site uses a fixed dark palette). */

import Head from "next/head";
import { LandingNav, LandingFooter } from "@/components/landingPage/LandingChrome";

const SITE_URL = "https://journalx.app";
const EMAIL = "officialjournalx@gmail.com";

const card = {
  background: "#161a20",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: "22px 24px",
};
const h2 = { font: "600 20px Poppins", margin: "0 0 10px", color: "#fff" };
const para = { font: "400 15px/1.7 Poppins", color: "#aeb4bc", margin: "0 0 8px" };
const link = { color: "#fcd535", textDecoration: "none" };
const strong = { color: "#e7eaee", fontWeight: 600 };

export default function ContactUs() {
  const effectiveDate = "2025-11-01";

  return (
    <>
      <Head>
        <title>Contact Us | JournalX</title>
        <meta
          name="description"
          content="Get in touch with the JournalX team for product support, billing help, partnership inquiries, or feedback. We're here to help you make the most of your journaling experience."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${SITE_URL}/contact`} />
        <meta property="og:title" content="Contact Us | JournalX" />
        <meta
          property="og:description"
          content="Reach the JournalX team for support, billing, partnerships or feedback."
        />
        <meta property="og:url" content={`${SITE_URL}/contact`} />
        <meta property="og:type" content="website" />
      </Head>

      <div
        style={{
          background: "#0d1117",
          color: "#fff",
          fontFamily: "Poppins, sans-serif",
          minHeight: "100vh",
        }}
      >
        <LandingNav />

        <main style={{ maxWidth: 880, margin: "0 auto", padding: "56px 20px 96px" }}>
          <span
            style={{
              font: "600 13px Poppins",
              color: "#fcd535",
              letterSpacing: 0.6,
              textTransform: "uppercase",
            }}
          >
            Support
          </span>
          <h1
            style={{
              font: "700 clamp(28px,5vw,42px)/1.1 Poppins",
              margin: "8px 0 10px",
              letterSpacing: "-1px",
              color: "#fff",
            }}
          >
            Contact Us
          </h1>
          <p style={{ ...para, font: "400 16px/1.7 Poppins", maxWidth: 680 }}>
            We&apos;re here to help! Whether you have questions about your
            account, payments, or general inquiries — the JournalX team is
            available to assist you. Reach out through any of the options below.
          </p>

          <div
            style={{
              marginTop: 28,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 18,
            }}
          >
            <section style={card}>
              <h2 style={h2}>General inquiries</h2>
              <p style={para}>
                Questions about features, feedback, or improvement suggestions —
                drop us an email and we&apos;ll reply within 1–2 business days.
              </p>
              <p style={para}>
                <span style={strong}>Email:</span>{" "}
                <a href={`mailto:${EMAIL}`} style={link}>
                  {EMAIL}
                </a>
              </p>
            </section>

            <section style={card}>
              <h2 style={h2}>Technical support</h2>
              <p style={para}>
                Issues with login, subscriptions, or data sync? Email us with
                the subject &quot;Technical Support – JournalX&quot; and include
                your registered email, a description of the issue, and any
                screenshots.
              </p>
              <p style={para}>
                <a href={`mailto:${EMAIL}`} style={link}>
                  {EMAIL}
                </a>
              </p>
            </section>

            <section style={card}>
              <h2 style={h2}>Billing &amp; payments</h2>
              <p style={para}>
                For payment questions or refunds, please review our{" "}
                <a href="/refund-policy" style={link}>
                  Refund Policy
                </a>{" "}
                first, then contact us with your transaction ID.
              </p>
              <p style={para}>
                <span style={strong}>Email:</span>{" "}
                <a href={`mailto:${EMAIL}`} style={link}>
                  {EMAIL}
                </a>
              </p>
              <p style={para}>
                <span style={strong}>Phone:</span> +91 7977960242
              </p>
            </section>

            <section style={card}>
              <h2 style={h2}>Partnerships</h2>
              <p style={para}>
                We&apos;re open to collaborations with trading educators,
                communities, and technology partners who share our mission to
                improve trader psychology and journaling discipline.
              </p>
              <p style={para}>
                <span style={strong}>Business email:</span>{" "}
                <a href={`mailto:${EMAIL}`} style={link}>
                  {EMAIL}
                </a>
              </p>
            </section>
          </div>

          <section style={{ ...card, marginTop: 18 }}>
            <h2 style={h2}>Registered business information</h2>
            <p style={para}>
              JournalX is operated by a registered MSME entity in India.
            </p>
            <p style={para}>
              <span style={strong}>Udyam Registration No:</span>{" "}
              UDYAM-MH-19-0386866
              <br />
              <span style={strong}>Registered location:</span> Mumbai,
              Maharashtra, India
            </p>
          </section>

          <section style={{ ...card, marginTop: 18 }}>
            <h2 style={h2}>Support hours</h2>
            <p style={para}>
              Monday to Saturday, <span style={strong}>10:00 AM – 7:00 PM IST</span>
              . Queries sent during holidays or weekends are addressed on the
              next working day. Your messages are handled confidentially — we do
              not sell, rent, or share your personal information. See our{" "}
              <a href="/privacy-policy" style={link}>
                Privacy Policy
              </a>
              .
            </p>
          </section>

          <section style={{ ...card, marginTop: 18 }}>
            <h2 style={h2}>Location</h2>
            <p style={para}>
              JournalX operates remotely; our MSME registration is based in
              Mumbai, Maharashtra. Write to us at{" "}
              <span style={strong}>JournalX – Mumbai, India</span>.
            </p>
            <div style={{ borderRadius: 12, overflow: "hidden", marginTop: 12 }}>
              <iframe
                title="JournalX Location"
                src="https://www.google.com/maps?q=Mumbai,+Maharashtra,+India&output=embed"
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
              />
            </div>
          </section>

          <p style={{ ...para, marginTop: 24, color: "#707a8a", font: "400 13px Poppins" }}>
            JournalX is a journaling and analytics platform for traders&apos;
            self-analysis and reflection. We do not offer trading signals or
            financial advice. · Last updated: {effectiveDate}
          </p>
        </main>

        <LandingFooter />
      </div>
    </>
  );
}
