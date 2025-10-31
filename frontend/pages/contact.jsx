"use client";

import Head from "next/head";
import { useEffect } from "react";

export default function ContactUs() {
  const effectiveDate = "2025-11-01";
  useEffect(() => {
    // Set landing page background
    document.body.style.backgroundColor = "#020202";
    document.body.style.color = "white";

    return () => {
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
    };
  }, []);

  return (
    <>
      <Head>
        <title>Contact Us | JournalX</title>
        <meta
          name="description"
          content="Get in touch with the JournalX team for product support, billing help, partnership inquiries, or feedback. We're here to help you make the most of your journaling experience."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://journalx.app/contact-us" />
      </Head>

      <main className="legalPageContainer">
        {/* HEADER */}
        <header className="legalHeader">
          <h1>Contact Us</h1>
          <p>
            We're here to help! Whether you have questions about your account,
            payments, or general inquiries — the JournalX team is available to
            assist you. Reach out through any of the options below.
          </p>
        </header>

        {/* SECTION 1 */}
        <section>
          <h2>1. General Inquiries</h2>
          <p>
            For general questions about JournalX features, feedback, or
            improvement suggestions, feel free to drop us an email:
          </p>
          <p>
            – <strong>Email:</strong>{" "}
            <a href="mailto:murthyofficial3@gmail.com">
              murthyofficial3@gmail.com
            </a>
          </p>
          <p>
            We aim to respond to all inquiries within{" "}
            <strong>1–2 business days</strong>.
          </p>
        </section>

        {/* SECTION 2 */}
        <section>
          <h2>2. Technical Support</h2>
          <p>
            If you’re facing issues with login, subscriptions, or journal data
            sync, please reach out with the subject line{" "}
            <strong>"Technical Support – JournalX"</strong> and include the
            following details:
          </p>
          <p>
            – Your registered email address <br />
            – Description of the issue <br />– Screenshots or error messages (if
            available)
          </p>
          <p>
            Send your request to:{" "}
            <a href="mailto:murthyofficial3@gmail.com">
              murthyofficial3@gmail.com
            </a>
          </p>
        </section>

        {/* SECTION 3 */}
        <section>
          <h2>3. Billing & Payment Support</h2>
          <p>
            For payment-related questions or refund requests, please check our{" "}
            <a href="/refund-policy">Refund Policy</a> first. If your case meets
            eligibility, contact us via:
          </p>
          <p>
            – <strong>Email:</strong>{" "}
            <a href="mailto:murthyofficial3@gmail.com">
              murthyofficial3@gmail.com
            </a>
            <br />– <strong>Phone:</strong> +91 7977960242
          </p>
          <p>
            Ensure to include your transaction ID or payment receipt for faster
            assistance.
          </p>
        </section>

        {/* SECTION 4 */}
        <section>
          <h2>4. Partnership & Collaboration</h2>
          <p>
            We’re open to collaborations with trading educators, communities, or
            technology partners who share our mission to improve trader
            psychology and journaling discipline.
          </p>
          <p>
            – <strong>Business Email:</strong>{" "}
            <a href="mailto:murthyofficial3@gmail.com">
              murthyofficial3@gmail.com
            </a>
          </p>
        </section>

        {/* SECTION 5 */}
        <section>
          <h2>5. Registered Business Information</h2>
          <p>
            JournalX is operated by a registered MSME entity in India. Below are
            our verified business details:
          </p>
          <p>
            – <strong>Legal Name:</strong> Murthy Poothapandi Thevar (JournalX)
            <br />– <strong>Udyam Registration No:</strong> UDYAM-MH-19-0386866
            <br />– <strong>PAN:</strong> CFXPT4171B
            <br />– <strong>Registered Location:</strong> Mumbai, Maharashtra,
            India
          </p>
        </section>

        {/* SECTION 6 */}
        <section>
          <h2>6. Response Time & Support Hours</h2>
          <p>
            Our support operates Monday to Saturday between{" "}
            <strong>10:00 AM – 7:00 PM IST</strong>. Queries sent during
            holidays or weekends will be addressed on the next working day.
          </p>
        </section>

        {/* SECTION 7 */}
        <section>
          <h2>7. Data Security</h2>
          <p>
            Your messages and contact details are handled with strict
            confidentiality. We do <span className="highlight-not">NOT</span>{" "}
            sell, rent, or share any personal information with third parties.
            For full details, refer to our{" "}
            <a href="/privacy-policy" className="link">
              Privacy Policy
            </a>
            .
          </p>
        </section>

        {/* SECTION 8 */}
        <section>
          <h2>8. Connect With Us</h2>
          <p>Stay updated and explore more about JournalX:</p>
          <p>
            – <a href="https://journalx.app">Website</a>
            <br />– <a href="https://www.linkedin.com">LinkedIn</a> (coming
            soon)
            <br />– <a href="https://x.com">Twitter</a> (coming soon)
          </p>
        </section>

        {/* OPTIONAL MAP EMBED */}
        <section>
          <h2>9. Location (for correspondence)</h2>
          <p>
            While JournalX primarily operates remotely, our MSME registration is
            based in Mumbai, Maharashtra. You can write to us at:
          </p>
          <p>
            <strong>JournalX – Mumbai, India</strong>
          </p>
          <div
            style={{ borderRadius: "12px", overflow: "hidden", marginTop: 12 }}
          >
            <iframe
              title="JournalX Location"
              src="https://www.google.com/maps?q=Mumbai,+Maharashtra,+India&output=embed"
              width="100%"
              height="300"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
            ></iframe>
          </div>
        </section>

        {/* FOOTER */}
        <footer>
          <p className="legalDisclaimer">
            JournalX is a journaling and analytics platform designed for
            traders’ self-analysis and reflection. We do{" "}
            <span className="highlight-not">NOT</span> offer trading signals or
            financial advice. Contact information provided here is strictly for
            customer and business communication.
          </p>
          <p style={{ marginTop: 8, color: "var(--white-70)" }}>
            Last updated: {effectiveDate}
          </p>
        </footer>
      </main>
    </>
  );
}
