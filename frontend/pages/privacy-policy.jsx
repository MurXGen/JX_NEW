"use client";

import LegalLinks from "@/components/landingPage/LegalLinks";
import Head from "next/head";
import { useEffect } from "react";

export default function PrivacyPolicy() {
  const effectiveDate = "2025-11-01";

  useEffect(() => {
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
          content="JournalX Privacy Policy — how we collect, use, store, and protect your personal data. We do NOT sell user data. We only use what is needed to run the journaling and trade-tracking features."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://journalx.app/privacy-policy" />
      </Head>

      <main className="legalPageContainer">
        {/* HEADER */}
        <header className="legalHeader">
          <h1>Privacy Policy</h1>
          <p>
            This Privacy Policy explains how JournalX collects, uses, and
            safeguards your personal information. Our goal is to keep your data
            safe while helping you improve your trading performance through
            proper logging, tracking, and reviewing of your trades.
          </p>
          <p>
            <strong>Effective date:</strong> {effectiveDate}
          </p>
        </header>

        {/* 1. Summary */}
        <section>
          <h2>1. What we do</h2>
          <p>
            – We collect the information you provide (email, password, trade
            logs, notes). <br />– We do{" "}
            <span className="highlight-not">NOT</span> sell your data. <br />
            – We do not use or integrate any AI features. <br />– You can export
            or delete your data anytime.
          </p>
        </section>

        {/* 2. What we collect */}
        <section>
          <h2>2. What information we collect</h2>
          <p>We only collect what is required to run JournalX effectively:</p>
          <p>
            – <strong>Account information:</strong> email & secure hashed
            password. <br />– <strong>Profile settings:</strong> name, timezone,
            preferences. <br />– <strong>Journal data:</strong> trades, notes,
            tags, screenshots, and performance logs you manually enter. <br />–{" "}
            <strong>Analytics:</strong> basic usage metrics to improve the app
            (non-personal). <br />– <strong>Payments:</strong> subscription
            metadata and receipts (via payment processors). We never store raw
            payment details. <br />– <strong>Support messages:</strong> when you
            contact our support.
          </p>
        </section>

        {/* 3. How we use your data */}
        <section>
          <h2>3. How we use your information</h2>
          <p>We use your information to:</p>
          <p>
            – Provide journaling and trade-tracking functionality. <br />
            – Backup, restore, and sync your entries when needed. <br />
            – Improve features by analyzing anonymized usage trends. <br />
            – Process subscription payments securely. <br />– Assist you with
            support and account recovery.
          </p>
        </section>

        {/* 4. Third-party processing */}
        <section>
          <h2>4. Third-party services & processors</h2>
          <p>
            JournalX does not use AI services. We only rely on essential third
            parties to operate the platform:
          </p>
          <p>
            – <strong>Payment processors:</strong> Razorpay / Stripe handle all
            payments; we store only receipts. <br />– <strong>Hosting:</strong>{" "}
            Vercel/Render host our app. <br />– <strong>Database:</strong>{" "}
            MongoDB Atlas securely stores your journal data. <br />–{" "}
            <strong>Analytics:</strong> Lightweight analytics tools help us
            understand feature usage (no personal data shared).
          </p>
        </section>

        {/* 5. Cookies */}
        <section>
          <h2>5. Cookies & local storage</h2>
          <p>
            – Used to keep you logged in. <br />
            – Used to remember preferences. <br />
            – Minimal tracking for performance and debugging. <br />– No
            advertising cookies.
          </p>
        </section>

        {/* 6. Data retention */}
        <section>
          <h2>6. Data retention & deletion</h2>
          <p>
            – Data is retained while your account is active. <br />
            – After account deletion, your journal data is removed within 30
            days (except where legally required). <br />– Encrypted backups
            exist for disaster recovery and are deleted on a schedule.
          </p>
        </section>

        {/* 7. User rights */}
        <section>
          <h2>7. Your rights</h2>
          <p>
            – Download/export your data anytime. <br />
            – Request deletion of your account and trade logs. <br />– Update
            profile data from settings or by contacting support.
          </p>
        </section>

        {/* 8. Security */}
        <section>
          <h2>8. Security</h2>
          <p>
            – Passwords are securely hashed. <br />
            – All data is encrypted in transit (HTTPS). <br />
            – Databases are protected with strict access controls. <br />–
            Regular security checks and updates are performed.
          </p>
        </section>

        {/* 9. Minors */}
        <section>
          <h2>9. Children</h2>
          <p>
            JournalX is not intended for children under 16. We do not knowingly
            collect data from minors.
          </p>
        </section>

        {/* 10. International transfers */}
        <section>
          <h2>10. International data transfers</h2>
          <p>
            Data may be stored or processed outside your country. We ensure
            appropriate safeguards for international transfers.
          </p>
        </section>

        {/* 11. Third-party links */}
        <section>
          <h2>11. Links to other sites</h2>
          <p>
            JournalX may link to external websites. We are not responsible for
            their privacy practices.
          </p>
        </section>

        {/* 12. Changes */}
        <section>
          <h2>12. Changes to this policy</h2>
          <p>
            We may update this policy. The latest version will always be posted
            here with an updated effective date.
          </p>
        </section>

        {/* 13. Contact */}
        <section>
          <h2>13. Contact</h2>
          <p>For privacy questions or data requests:</p>
          <p>
            – Email:{" "}
            <a href="mailto:officialjournalx@gmail.com">
              officialjournalx@gmail.com
            </a>{" "}
            <br />– Phone: +91 7977960242
          </p>

          <p style={{ marginTop: 8 }}>
            Business details: <br />– <strong>Murthy Poothapandi Thevar</strong>{" "}
            (JournalX) <br />– Udyam: <strong>UDYAM-MH-19-0386866</strong>{" "}
            <br />– PAN: <strong>CFXPT4171B</strong>
          </p>
        </section>

        {/* FOOTER */}
        <footer>
          <p className="legalDisclaimer">
            JournalX does <span className="highlight-not">NOT</span> sell
            personal data.
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
