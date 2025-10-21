import Head from "next/head";

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy | JournalX</title>
        <meta
          name="description"
          content="Read JournalX's Privacy Policy to understand how we collect, use, and protect your personal data. JournalX.app values transparency, user trust, and secure data handling."
        />
        <meta
          name="keywords"
          content="JournalX privacy policy, data protection, user privacy, data collection, cookies, secure trading journal, JournalX app policy"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="JournalX" />
        <link rel="canonical" href="https://journalx.app/privacy-policy" />
      </Head>

      <main className="flexClm gap_32">
        <section className="flexClm gap_16">
          <h1
            className="font_24 font_weight_700"
            style={{ color: "var(--primary-light)" }}
          >
            Privacy Policy
          </h1>

          <p className="font_14" style={{ lineHeight: "32px" }}>
            Welcome to <strong>JournalX.app</strong> (“we”, “our”, “us”). We
            value your privacy and are committed to protecting your personal
            data. This Privacy Policy explains how we collect, use, store, and
            protect information when you visit or use our website,{" "}
            <a
              href="https://journalx.app"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--primary-light)",
                textDecoration: "underline",
              }}
            >
              https://journalx.app
            </a>{" "}
            (the “Website”), and related services.
          </p>

          <hr className="divider" />

          {/* 1. Information We Collect */}
          <h2 className="font_20">1. Information We Collect</h2>

          <h3 className="font_16 font_weight_600">
            a) Information You Provide
          </h3>
          <ul
            className="font_14"
            style={{ lineHeight: "28px", marginLeft: "16px" }}
          >
            <li>
              Name, email address, and contact information when you sign up or
              contact us.
            </li>
            <li>Login credentials or account details (if applicable).</li>
            <li>
              Information submitted through forms, chat, or support requests.
            </li>
            <li>
              Payment or billing information when subscribing to paid plans
              (handled by secure third-party payment processors).
            </li>
          </ul>

          <h3 className="font_16 font_weight_600">
            b) Automatically Collected Information
          </h3>
          <ul
            className="font_14"
            style={{ lineHeight: "28px", marginLeft: "16px" }}
          >
            <li>IP address, browser type, and operating system.</li>
            <li>Date, time, and pages visited.</li>
            <li>
              Cookies, analytics, and tracking data for performance and security
              purposes.
            </li>
          </ul>

          <h3 className="font_16 font_weight_600">
            c) Cookies and Tracking Technologies
          </h3>
          <p className="font_14" style={{ lineHeight: "28px" }}>
            We use cookies and similar technologies to:
          </p>
          <ul
            className="font_14"
            style={{ lineHeight: "28px", marginLeft: "16px" }}
          >
            <li>Enhance user experience and functionality.</li>
            <li>Analyze traffic and usage trends.</li>
            <li>Remember preferences for future visits.</li>
          </ul>
          <p className="font_14" style={{ lineHeight: "28px" }}>
            You can disable cookies through your browser settings, but some
            features may not function properly.
          </p>

          <hr className="divider" />

          {/* 2. How We Use Your Information */}
          <h2 className="font_20">2. How We Use Your Information</h2>
          <ul
            className="font_14"
            style={{ lineHeight: "28px", marginLeft: "16px" }}
          >
            <li>Provide and maintain our Website and services.</li>
            <li>Process payments and manage user accounts.</li>
            <li>Improve site functionality and user experience.</li>
            <li>
              Communicate important updates, offers, or responses to your
              queries.
            </li>
            <li>
              Ensure compliance with legal obligations and enforce our terms.
            </li>
          </ul>

          <hr className="divider" />

          {/* 3. How We Share Information */}
          <h2 className="font_20">3. How We Share Information</h2>
          <p className="font_14" style={{ lineHeight: "28px" }}>
            We do not sell or trade your personal information. However, we may
            share information with:
          </p>
          <ul
            className="font_14"
            style={{ lineHeight: "28px", marginLeft: "16px" }}
          >
            <li>
              <strong>Service Providers:</strong> Trusted partners who perform
              hosting, analytics, or payment processing on our behalf.
            </li>
            <li>
              <strong>Legal Authorities:</strong> When required by law or to
              protect rights, safety, and security.
            </li>
            <li>
              <strong>Business Transfers:</strong> In case of a merger,
              acquisition, or asset sale.
            </li>
          </ul>
          <p className="font_14" style={{ lineHeight: "28px" }}>
            All third-party providers are bound by confidentiality and data
            protection agreements.
          </p>

          <hr className="divider" />

          {/* 4. Data Storage and Security */}
          <h2 className="font_20">4. Data Storage and Security</h2>
          <ul
            className="font_14"
            style={{ lineHeight: "28px", marginLeft: "16px" }}
          >
            <li>Your personal data is stored securely on encrypted servers.</li>
            <li>
              We use SSL (Secure Socket Layer) technology for secure
              transmission of data.
            </li>
            <li>
              While we implement strong security measures, no online system is
              100% secure. Users are advised to maintain secure passwords and
              device protection.
            </li>
          </ul>

          <hr className="divider" />

          {/* 5. Your Rights and Choices */}
          <h2 className="font_20">5. Your Rights and Choices</h2>
          <ul
            className="font_14"
            style={{ lineHeight: "28px", marginLeft: "16px" }}
          >
            <li>Access and review your personal data.</li>
            <li>Request correction or deletion of inaccurate data.</li>
            <li>
              Withdraw consent for data collection (subject to legal limits).
            </li>
            <li>Opt-out of marketing communications.</li>
          </ul>
          <p className="font_14" style={{ lineHeight: "28px" }}>
            To exercise these rights, contact us at{" "}
            <a
              href="mailto:murthyofficial3@gmail.com"
              style={{
                color: "var(--primary-light)",
                textDecoration: "underline",
              }}
            >
              murthyofficial3@gmail.com
            </a>
            .
          </p>

          <hr className="divider" />

          {/* 6. Third-Party Links */}
          <h2 className="font_20">6. Third-Party Links</h2>
          <p className="font_14" style={{ lineHeight: "28px" }}>
            Our Website may include links to external websites. We are not
            responsible for their content, privacy policies, or practices. We
            encourage you to review their policies before providing any personal
            data.
          </p>

          <hr className="divider" />

          {/* 7. International Data Transfers */}
          <h2 className="font_20">7. International Data Transfers</h2>
          <p className="font_14" style={{ lineHeight: "28px" }}>
            If you access our site from outside our hosting region, your data
            may be transferred across borders. By using our Website, you consent
            to such transfers.
          </p>

          <hr className="divider" />

          {/* 8. Children’s Privacy */}
          <h2 className="font_20">8. Children’s Privacy</h2>
          <p className="font_14" style={{ lineHeight: "28px" }}>
            JournalX.app is not intended for children under 13 years of age. We
            do not knowingly collect personal information from minors.
          </p>

          <hr className="divider" />

          {/* 9. Policy Updates */}
          <h2 className="font_20">9. Policy Updates</h2>
          <p className="font_14" style={{ lineHeight: "28px" }}>
            We may update this Privacy Policy periodically. The “Last Updated”
            date will reflect the latest revision. Continued use of our Website
            means you accept these changes.
          </p>

          <hr className="divider" />

          {/* 10. Contact Us */}
          <h2 className="font_20">10. Contact Us</h2>
          <p className="font_14" style={{ lineHeight: "28px" }}>
            If you have any questions about this Privacy Policy, please contact
            us:
          </p>
          <ul
            className="font_14"
            style={{ lineHeight: "28px", marginLeft: "16px" }}
          >
            <li>
              <strong>JournalX</strong>
            </li>
            <li>
              Website:{" "}
              <a
                href="https://journalx.app"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--primary-light)" }}
              >
                https://journalx.app
              </a>
            </li>
            <li>
              Email: <strong>murthyofficial3@gmail.com</strong>
            </li>
            <li>
              Phone: <strong>+91 79779 60242</strong>
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
