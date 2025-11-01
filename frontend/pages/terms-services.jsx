"use client";
import Head from "next/head";
import { useEffect } from "react";

export default function TermsServices() {
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
        <title>Terms of Service | JournalX</title>
        <meta
          name="description"
          content="Official Terms of Service for JournalX. JournalX is a digital journaling and analytics tool for traders. We do NOT offer trading signals, brokerage, or financial advice."
        />
        <link rel="canonical" href="https://journalx.app/terms-services" />
      </Head>

      <main className="legalPageContainer">
        {/* HEADER */}
        <header className="legalHeader">
          <h1>Terms of Service</h1>
          <p>
            Welcome to JournalX. These Terms of Service (“Terms”) explain how
            you can use our website, app, and services. By using JournalX, you
            agree to follow these Terms. If you disagree, please stop using the
            service.
          </p>
        </header>

        {/* SECTION 1 */}
        <section>
          <h2>1. About JournalX</h2>
          <p>
            JournalX is a digital journaling and analytics tool for traders to
            record, track, and understand their own trading behavior.
          </p>
          <p>
            – JournalX does <span className="highlight-not">NOT</span> provide
            trading signals or investment advice. <br />– JournalX does{" "}
            <span className="highlight-not">NOT</span> execute or manage trades.{" "}
            <br />– JournalX does <span className="highlight-not">NOT</span>{" "}
            hold or manage any user money or funds.
          </p>
          <p>
            The purpose of JournalX is to help traders learn from their own
            activity, not to influence or guide trading decisions.
          </p>
        </section>

        {/* SECTION 2 */}
        <section>
          <h2>2. Account Registration</h2>
          <p>
            To use JournalX, you need to create an account using a valid email
            address. You are responsible for:
          </p>
          <p>
            – Keeping your password and login secure. <br />– Any actions taken
            from your account.
          </p>
          <p>
            JournalX may suspend or remove your account if you misuse the
            platform or break these Terms.
          </p>
        </section>

        {/* SECTION 3 */}
        <section>
          <h2>3. Subscriptions and Payments</h2>
          <p>
            JournalX provides both free and paid plans to help users personalize
            their journaling experience. The paid plans are designed only to
            unlock additional journaling features such as:
          </p>
          <p>
            – Adding more daily or monthly journal entries <br />
            – Creating and managing multiple trading accounts <br />
            – Backing up and restoring journal data securely <br />– Accessing
            advanced insights and analytics for self-review
          </p>
          <p>
            These paid features are meant to improve your record-keeping and
            organization. JournalX does{" "}
            <span className="highlight-not">NOT</span> provide any trading
            signals, stock recommendations, or financial services of any kind.
          </p>
          <p>
            Payments for subscriptions are processed securely through trusted
            gateways such as Razorpay (for Indian users) and Stripe (for
            international users).
          </p>
          <p>
            – Subscriptions renew automatically unless canceled before the
            renewal date. <br />– You can manage or cancel your plan anytime
            from your account settings.
          </p>

          <h3>Refund Policy</h3>
          <p>
            Refunds are only applicable for failed or duplicate transactions. We
            do <span className="highlight-not">NOT</span> provide refunds for
            active subscriptions or completed usage. Approved refunds are
            processed within 3–5 business days of confirmation.
          </p>
        </section>

        {/* SECTION 4 */}
        <section>
          <h2>4. Data Privacy</h2>
          <p>
            We value your privacy. JournalX collects only what’s needed for
            functionality:
          </p>
          <p>
            – Email and password (securely encrypted) <br />
            – Trade notes and journal entries (entered by you) <br />– Anonymous
            analytics data for improving the platform
          </p>
          <p>
            We do <span className="highlight-not">NOT</span> sell or share your
            personal data for marketing. See our{" "}
            <a href="/privacy-policy">Privacy Policy</a> for more details.
          </p>
        </section>

        {/* SECTION 5 */}
        <section>
          <h2>5. Intellectual Property</h2>
          <p>
            All designs, code, branding, and content of JournalX are owned by
            the company. You own your journal data. You may{" "}
            <span className="highlight-not">NOT</span> copy, reproduce, or
            distribute any part of JournalX without written permission.
          </p>
        </section>

        {/* SECTION 6 */}
        <section>
          <h2>6. Limitation of Liability</h2>
          <p>
            JournalX is provided for journaling and educational use. We are{" "}
            <span className="highlight-not">NOT</span> responsible for financial
            results, trading losses, or any actions you take based on your
            journal insights. Always make your own independent decisions or
            consult certified professionals.
          </p>
        </section>

        {/* SECTION 7 */}
        <section>
          <h2>7. Termination</h2>
          <p>
            – JournalX may suspend or delete accounts that break these Terms.{" "}
            <br />– You can request to delete your account anytime by contacting
            our support team.
          </p>
        </section>

        {/* SECTION 8 */}
        <section>
          <h2>8. MSME & Business Information</h2>
          <p>JournalX is a registered MSME business in India.</p>
          <p>
            – Legal Name: <strong>Murthy Poothapandi Thevar (JournalX)</strong>{" "}
            <br />– Udyam Registration No: <strong>UDYAM-MH-19-0386866</strong>{" "}
            <br />– PAN: <strong>CFXPT4171B</strong> <br />– Email:{" "}
            <a href="mailto:officialjournalx@gmail.app">
              officialjournalx@gmail.app
            </a>{" "}
            <br />– Phone: <strong>+91 7977960242</strong>
          </p>
        </section>

        {/* SECTION 9 */}
        <section>
          <h2>9. Governing Law</h2>
          <p>
            These Terms are governed by Indian law and fall under the
            jurisdiction of courts in Mumbai, Maharashtra.
          </p>
        </section>

        {/* SECTION 10 */}
        <section>
          <h2>10. Contact</h2>
          <p>
            For questions or support, please reach out at: <br />
            <strong>Email:</strong>{" "}
            <a href="mailto:officialjournalx@gmail.app">
              officialjournalx@gmail.app
            </a>{" "}
            <br />
            <strong>Phone:</strong> +91 7977960242
          </p>
        </section>

        {/* FOOTER */}
        <footer className="termsDisclaimer">
          <p className="legalDisclaimer">
            JournalX is a journaling and analytics tool. We are{" "}
            <span className="highlight-not">NOT</span> a broker, financial
            advisor, or trading signal provider. Use JournalX responsibly for
            personal learning and record-keeping.
          </p>
        </footer>
      </main>
    </>
  );
}
