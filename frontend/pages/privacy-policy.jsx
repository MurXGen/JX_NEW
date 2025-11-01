"use client";

import LegalLinks from "@/components/landingPage/LegalLinks";
import Head from "next/head";
import { useEffect } from "react";

export default function PrivacyPolicy() {
  const effectiveDate = "2025-11-01"; // update as needed

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
        <title>Privacy Policy | JournalX</title>
        <meta
          name="description"
          content="JournalX Privacy Policy — how we collect, use, store, and protect your data. We do NOT sell user data. We use AI tools for analytics and provide clear controls for data export and deletion."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://journalx.app/privacy-policy" />
      </Head>

      <main className="legalPageContainer">
        {/* PAGE HEADER */}
        <header className="legalHeader">
          <h1>Privacy Policy</h1>
          <p>
            This Privacy Policy explains how JournalX collects, uses, and
            safeguards your personal information. We aim to keep this clear and
            simple while providing the details required by law and by our
            partners.
          </p>
          <p>
            <strong>Effective date:</strong> {effectiveDate}
          </p>
        </header>

        {/* 1. Summary (plain language) */}
        <section>
          <h2>1. What we do</h2>
          <p>
            – We collect the information you give us (email, password, trade
            logs, screenshots) to run the service. <br />– We do{" "}
            <span className="highlight-not">NOT</span> sell your personal data.{" "}
            <br />
            – We may use third-party AI services (for example, OpenAI's ChatGPT)
            to provide analytics — see details below. <br />– You can request to
            download or delete your data anytime.
          </p>
        </section>

        {/* 2. What we collect */}
        <section>
          <h2>2. What information we collect</h2>
          <p>
            We collect only what is necessary to operate JournalX and to improve
            the product:
          </p>
          <p>
            – <strong>Account information:</strong> email address, hashed
            password (we never store plain passwords). <br />–{" "}
            <strong>Profile settings:</strong> display name, timezone,
            preferences. <br />– <strong>Journal data:</strong> trades you
            enter, notes, screenshots, attachments, timestamps, tags. <br />–{" "}
            <strong>Usage & analytics:</strong> anonymized usage metrics, crash
            logs, feature usage (for product improvement). <br />–{" "}
            <strong>Payment data:</strong> we store payment receipts and
            subscription metadata. Payments themselves are handled by payment
            gateways (we do NOT store raw card data). <br />–{" "}
            <strong>Support communications:</strong> messages you send to
            support (email content).
          </p>
        </section>

        {/* 3. How we use your data */}
        <section>
          <h2>3. How we use your information</h2>
          <p>We use the information to:</p>
          <p>
            – Provide and maintain your account and journaling features. <br />
            – Store, backup, and restore your journal entries when you request
            it. <br />– Improve JournalX by analyzing anonymous usage and fixing
            bugs. <br />
            – Provide optional AI-driven analysis or summaries you choose to run
            on your journal data (see AI section). <br />
            – Process payments and invoices via trusted gateways. <br />–
            Respond to support requests and account recovery.
          </p>
        </section>

        {/* 4. AI and third-party processing */}
        <section>
          <h2>4. AI, third-party services & external processors</h2>
          <p>
            JournalX may use third-party services to provide certain features.
            This includes:
          </p>
          <p>
            – <strong>AI services (example: OpenAI / ChatGPT):</strong> if you
            use features that analyze or summarize your journal entries, the
            specific journal content you submit for analysis will be sent to the
            AI provider for processing. We do{" "}
            <span className="highlight-not">NOT</span> use that submitted
            content for training or resale — only to produce the analysis you
            requested. Processing is subject to the AI provider's terms and
            privacy policy. <br />– <strong>Payment processors:</strong>{" "}
            Razorpay, Stripe, or other gateways handle payments; we store
            receipts and subscription metadata only. We never store raw card or
            UPI credentials. <br />– <strong>Hosting & database:</strong>{" "}
            JournalX uses secure hosting and database services (e.g.,
            Vercel/Render for app hosting, MongoDB Atlas for data storage).
            These providers are processors and store data according to their
            policies.
          </p>
          <p>
            When we send data to third-parties we limit what is shared and
            require processors to protect the data under contract.
          </p>
        </section>

        {/* 5. Cookies & tracking */}
        <section>
          <h2>5. Cookies, local storage & analytics</h2>
          <p>
            – We use cookies and local storage to keep you logged in, remember
            preferences, and improve UX. <br />
            – We may use analytics tools (e.g., Google Analytics, Vercel
            analytics) to measure site performance and usage. These are
            configured to collect minimal, pseudonymized data. <br />– You can
            opt out of certain analytics tracking via browser settings or
            opt-out links if provided in the app.
          </p>
        </section>

        {/* 6. Data retention and backups */}
        <section>
          <h2>6. Data retention, backup & deletion</h2>
          <p>
            – We retain your active account data while your account is active.{" "}
            <br />
            – When you delete your account, we will delete your personal data
            and journal entries within 30 days, unless we must retain some data
            to comply with legal obligations. <br />– We maintain encrypted
            backups for disaster recovery. Backups are retained for limited
            periods and are protected.
          </p>
        </section>

        {/* 7. User rights & controls */}
        <section>
          <h2>7. Your rights & how to use them</h2>
          <p>You have the right to:</p>
          <p>
            – Request a copy of your personal data (export): email us and we
            will provide a machine-readable export of your journal data. <br />
            – Request deletion of your account and data: we will delete your
            account as described above. <br />
            – Correct inaccurate personal information: update your profile from
            account settings or ask support. <br />– Object to certain
            processing (where legal) and ask for restriction — contact us and we
            will review your request.
          </p>
          <p>
            To exercise any rights, contact:{" "}
            <a href="mailto:murthyofficial3@gmail.com">
              murthyofficial3@gmail.com
            </a>
            .
          </p>
        </section>

        {/* 8. Security measures */}
        <section>
          <h2>8. Security</h2>
          <p>We take security seriously:</p>
          <p>
            – Passwords are hashed and stored securely. <br />
            – Data is sent over HTTPS (TLS) in transit. <br />
            – Databases and backups are protected with industry-standard
            controls and access restrictions. <br />– We periodically review
            security and patch vulnerabilities.
          </p>
          <p>
            While we maintain strict safeguards, no system is 100% secure. If a
            breach occurs, we will notify affected users and regulators as
            required by law.
          </p>
        </section>

        {/* 9. Minors */}
        <section>
          <h2>9. Children</h2>
          <p>
            JournalX is not intended for children under 16. We do{" "}
            <span className="highlight-not">NOT</span> knowingly collect
            personal data from children under 16. If you believe a child under
            16 has created an account, contact us to remove the data.
          </p>
        </section>

        {/* 10. International transfers */}
        <section>
          <h2>10. International data transfers</h2>
          <p>
            Your data may be stored or processed in countries outside your home
            country. We take steps to ensure appropriate protections (contracts
            and standard contractual clauses) when data is transferred
            internationally.
          </p>
        </section>

        {/* 11. Third-party links */}
        <section>
          <h2>11. Links to other sites</h2>
          <p>
            Our service may contain links to third-party sites. We are not
            responsible for the privacy practices of other sites. Review their
            privacy policies before sharing personal data.
          </p>
        </section>

        {/* 12. Changes to this policy */}
        <section>
          <h2>12. Changes to this policy</h2>
          <p>
            We may update this policy to reflect changes in our practices or
            legal requirements. We will post the updated policy with a new
            effective date. Continued use after changes means you accept the
            revised policy.
          </p>
        </section>

        {/* 13. Contact & business details */}
        <section>
          <h2>13. Contact & business details</h2>
          <p>
            If you have questions or requests about your personal data, contact:
          </p>
          <p>
            – Email:{" "}
            <a href="mailto:murthyofficial3@gmail.com">
              murthyofficial3@gmail.com
            </a>{" "}
            <br />– Phone: +91 7977960242
          </p>

          <p style={{ marginTop: 8 }}>
            Business details (for verification): <br />– Legal name:{" "}
            <strong>Murthy Poothapandi Thevar (JournalX)</strong> <br />– Udyam
            registration: <strong>UDYAM-MH-19-0386866</strong> <br />– PAN:{" "}
            <strong>CFXPT4171B</strong>
          </p>
        </section>

        {/* FOOTER */}
        <footer>
          <p className="legalDisclaimer">
            JournalX does <span className="highlight-not">NOT</span> sell
            personal data. We limit collection to what we need to operate the
            service and provide optional AI analysis only when you request it.
          </p>

          <p style={{ marginTop: 8, color: "var(--white-70)" }}>
            Last updated: {effectiveDate}
          </p>
        </footer>
        <LegalLinks />
      </main>
    </>
  );
}
