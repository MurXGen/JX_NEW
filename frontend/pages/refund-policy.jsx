"use client";

import LegalLinks from "@/components/landingPage/LegalLinks";
import Head from "next/head";
import { useEffect } from "react";

export default function RefundPolicy() {
  const effectiveDate = "2025-11-01"; // update when changed
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
        <title>Refund Policy | JournalX</title>
        <meta
          name="description"
          content="JournalX Refund Policy — learn about our subscription refund terms, failed payment handling, and cancellation process. We do not sell any trading signals; our pricing is for journaling features only."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://journalx.app/refund-policy" />
      </Head>

      <main className="legalPageContainer">
        {/* HEADER */}
        <header className="legalHeader">
          <h1>Refund Policy</h1>
          <p>
            This Refund Policy explains when and how JournalX issues refunds for
            payments made for subscriptions or other services. Our goal is to be
            transparent and fair while ensuring sustainable operations.
          </p>
          <p>
            <strong>Effective Date:</strong> {effectiveDate}
          </p>
        </header>

        {/* SECTION 1 */}
        <section>
          <h2>1. Nature of Our Product</h2>
          <p>
            JournalX provides a digital journaling platform for traders to
            record, analyze, and reflect on their trades. Our pricing plans are
            designed solely to enable extended journaling functionality —
            including the ability to:
          </p>
          <ul>
            <li>
              Enter more journal entries and upload related notes or images.
            </li>
            <li>Create and manage multiple trading accounts.</li>
            <li>
              Store data securely and enable cloud backup or restore features.
            </li>
          </ul>
          <p>
            We <span className="highlight-not">DO NOT</span> sell trading
            signals, financial advice, or investment tips. All plans focus
            strictly on journaling and self-analysis tools.
          </p>
        </section>

        {/* SECTION 2 */}
        <section>
          <h2>2. Free Plan</h2>
          <p>
            Users can use JournalX under the free plan with limited features
            before deciding to upgrade. This allows users to evaluate the
            service before making any payment.
          </p>
        </section>

        {/* SECTION 3 */}
        <section>
          <h2>3. Paid Subscriptions</h2>
          <p>
            JournalX offers monthly and yearly subscription plans that unlock
            premium features such as additional journal entries, account
            management, and data backup.
          </p>
          <p>
            Subscriptions renew automatically unless canceled before the renewal
            date. Users can cancel anytime from their account settings to stop
            future renewals.
          </p>
        </section>

        {/* SECTION 4 */}
        <section>
          <h2>4. Refund Eligibility</h2>
          <p>Refunds are issued only under the following conditions:</p>
          <ul>
            <li>Duplicate payments made for the same subscription period.</li>
            <li>
              Failed payments that were charged but not successfully activated.
            </li>
            <li>
              Any technical error from JournalX’s side that prevented access to
              premium features after a valid payment.
            </li>
          </ul>
          <p>
            We <span className="highlight-not">DO NOT</span> issue refunds for:
          </p>
          <ul>
            <li>Completed subscription periods or active usage.</li>
            <li>
              Unsubscribed users who used the product for part of the plan
              period.
            </li>
            <li>Personal dissatisfaction or preference-based cancellations.</li>
          </ul>
        </section>

        {/* SECTION 5 */}
        <section>
          <h2>5. Refund Process</h2>
          <p>
            To request a refund, email our support team at{" "}
            <a href="mailto:officialjournalx@gmail.app">
              officialjournalx@gmail.app
            </a>{" "}
            with the subject line <strong>“Refund Request — JournalX”</strong>.
            Please include:
          </p>
          <ul>
            <li>Your registered email address.</li>
            <li>Transaction ID or payment receipt.</li>
            <li>Brief description of the issue or reason for refund.</li>
          </ul>
          <p>
            Once verified, approved refunds will be processed within{" "}
            <strong>3–5 business days</strong> to the original payment method.
          </p>
        </section>

        {/* SECTION 6 */}
        <section>
          <h2>6. Payment Gateways</h2>
          <p>
            JournalX uses secure third-party payment gateways such as{" "}
            <strong>Razorpay</strong> (for INR payments) and{" "}
            <strong>Stripe</strong> (for international payments). These gateways
            handle all payment data securely, and we do{" "}
            <span className="highlight-not">NOT</span> store card or UPI
            information on our servers.
          </p>
        </section>

        {/* SECTION 7 */}
        <section>
          <h2>7. Account Cancellation</h2>
          <p>
            Canceling a subscription stops future renewals but does not trigger
            an automatic refund for the current billing cycle. Users retain
            premium access until the end of their paid period.
          </p>
          <p>
            If you delete your account, all stored journal entries and
            associated data are permanently removed in accordance with our{" "}
            <a href="/privacy-policy" className="link">
              Privacy Policy
            </a>
            .
          </p>
        </section>

        {/* SECTION 8 */}
        <section>
          <h2>8. Exceptional Circumstances</h2>
          <p>
            In rare cases, such as billing system errors or duplicate
            transactions, JournalX may issue refunds outside standard policy at
            its sole discretion. Each case is reviewed individually.
          </p>
        </section>

        {/* SECTION 9 */}
        <section>
          <h2>9. Contact Us</h2>
          <p>
            For any billing or refund-related concerns, please contact our
            support team:
          </p>
          <p>
            – Email:{" "}
            <a href="mailto:officialjournalx@gmail.app">
              officialjournalx@gmail.app
            </a>
            <br />– Phone: +91 7977960242
          </p>
          <p>
            Business details: <br />– Legal Name:{" "}
            <strong>Murthy Poothapandi Thevar (JournalX)</strong>
            <br />– Udyam Registration: <strong>
              UDYAM-MH-19-0386866
            </strong>{" "}
            <br />– PAN: <strong>CFXPT4171B</strong>
          </p>
        </section>

        {/* FOOTER */}
        <footer>
          <p className="legalDisclaimer">
            JournalX subscriptions are for journaling and data management only.
            We do <span className="highlight-not">NOT</span> offer financial
            advisory or signal services. Refunds apply only to duplicate or
            failed payments.
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
