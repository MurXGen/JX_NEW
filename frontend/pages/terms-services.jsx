import BackgroundBlur from "@/components/ui/BackgroundBlur";
import Head from "next/head";

export default function TermsServices() {
  return (
    <>
      <Head>
        <title>Terms of Service | JournalX</title>
        <meta
          name="description"
          content="Read JournalX's Terms of Service, Privacy Policy, and Refund Policy. JournalX is a digital journaling and analytics tool for traders to log, track, and analyze their trades. We do not facilitate trading or financial transactions."
        />
        <meta
          name="keywords"
          content="JournalX terms of service, privacy policy, refund policy, trader journal app, trading journal, journaling tool for traders, analytics for traders"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="JournalX" />
        <link rel="canonical" href="https://journalx.app/terms-services" />
      </Head>

      <main className="flexClm gap_32">
        <BackgroundBlur />

        {/* ✅ Terms of Service Section */}
        <section className="flexClm gap_16">
          <h1
            className="font_24 font_weight_700"
            style={{ color: "var(--primary-light)" }}
          >
            Terms of Service
          </h1>
          <p style={{ lineHeight: "32px" }} className="font_14">
            Welcome to JournalX. By accessing or using our website
            (https://journalx.app), you agree to the following Terms of Service.
            If you do not agree, please discontinue use of the platform
            immediately.
          </p>

          <h2 className="font_20">1. Nature of Services</h2>
          <p style={{ lineHeight: "32px" }} className="font_14">
            JournalX is a digital journaling and analytics platform designed for
            traders to log, track, and analyze their own trading performance.
            JournalX does not execute, facilitate, or manage trades, nor does it
            provide investment advice or handle any user funds. All trade data
            is entered voluntarily by users for self-assessment and improvement.
          </p>

          <h2 className="font_20">2. Account Registration</h2>
          <p style={{ lineHeight: "32px" }} className="font_14">
            Users must register an account using a valid email address and
            password. You are responsible for maintaining the confidentiality of
            your login details and all activity under your account. JournalX
            reserves the right to suspend or terminate accounts for misuse or
            violation of these terms.
          </p>

          <h2 className="font_20">3. Subscription and Payments</h2>
          <p style={{ lineHeight: "32px" }} className="font_14">
            JournalX offers Free, Pro, Elite, and Master plans with varying
            features. Subscriptions are billed monthly or annually via Razorpay
            (for Indian users) or USDT (for international users). All
            subscriptions renew automatically unless canceled before the next
            billing cycle.
          </p>
          <p style={{ lineHeight: "32px" }} className="font_14">
            Refunds are not provided for successful payments. Refunds apply only
            for failed or duplicate transactions and are processed within 3–4
            business days (Monday–Friday).
          </p>

          <h2 className="font_20">4. AI and Third-Party Services</h2>
          <p style={{ lineHeight: "32px" }} className="font_14">
            JournalX integrates AI tools such as ChatGPT API for performance
            insights and recommendations. Data shared with third-party AI
            providers may be processed under their respective privacy policies.
            JournalX does not store or resell this data.
          </p>

          <h2 className="font_20">5. Data Privacy</h2>
          <p style={{ lineHeight: "32px" }} className="font_14">
            JournalX collects minimal data, including user email, password, and
            trade logs, solely for platform functionality. We do not sell,
            share, or distribute personal data for marketing or profit. Users
            may request data deletion by contacting support.
          </p>

          <h2 className="font_20">6. Intellectual Property</h2>
          <p style={{ lineHeight: "32px" }} className="font_14">
            All content, branding, design, and code within JournalX are owned by
            JournalX. Users may not copy, modify, or redistribute any part of
            the website without written permission.
          </p>

          <h2 className="font_20">7. Limitation of Liability</h2>
          <p style={{ lineHeight: "32px" }} className="font_14">
            JournalX is not responsible for any financial loss, trading
            decision, or data error resulting from use of the platform. JournalX
            is intended solely for analytical and educational purposes. Users
            acknowledge that all trading activities are done at their own risk.
          </p>

          <h2 className="font_20">8. Termination</h2>
          <p style={{ lineHeight: "32px" }} className="font_14">
            JournalX may suspend or terminate user access at any time for
            violation of these terms or misuse of the platform. Users may delete
            their accounts upon request.
          </p>

          <h2 className="font_20">9. Governing Law</h2>
          <p style={{ lineHeight: "32px" }} className="font_14">
            These Terms are governed by the laws of India, with jurisdiction
            under Mumbai, Maharashtra.
          </p>
        </section>

        {/* ✅ Verification Contact Details Section */}
        <section className="flexClm">
          <h1
            className="font_24 font_weight_700"
            style={{ color: "var(--primary-light)" }}
          >
            Entity details
          </h1>
          <p style={{ lineHeight: "32px" }} className="font_14">
            For any payment verification or support-related concerns, please
            reach out with your details to help us verify your request promptly.
          </p>
          <span className="font_14 flexClm gap_12">
            <span>
              👤 Full Name: <span>Murthy Poothapandi Thevar</span>
            </span>
            <span>
              📧 Email: <span>murthyofficial3@gmail.com</span>
            </span>
            <span>
              📱 Mobile: <span>+91 7977960242</span>
            </span>
          </span>
          <p className="font_14" style={{ lineHeight: "28px" }}>
            You may also click the link below to directly send us an email for
            verification or support:
          </p>
          <a
            href="mailto:murthyofficial3@gmail.com?subject=Verification%20Support%20-%20JournalX"
            className="font_14"
            style={{
              color: "var(--primary-light)",
              textDecoration: "underline",
              fontWeight: "600",
            }}
          >
            📧 Send Mail for Verification Support
          </a>
        </section>

        {/* ✅ Disclaimer Section */}
        <section className="flexClm gap_16">
          <h1
            className="font_24 font_weight_700"
            style={{ color: "var(--primary-light)" }}
          >
            Disclaimer
          </h1>
          <p style={{ lineHeight: "32px" }} className="font_14">
            JournalX is not a financial institution, broker, or investment
            advisor. The platform is intended only for journaling and analytical
            purposes. Any insights provided by the system or AI tools are for
            educational use only and should not be considered financial advice.
            Users should consult certified professionals before making any
            investment decisions.
          </p>
        </section>
      </main>
    </>
  );
}
