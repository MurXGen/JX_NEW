import Head from "next/head";

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy | JournalX</title>
        <meta
          name="description"
          content="JournalX Privacy Policy: Learn how we collect, store, and protect your data, including trade logs and AI interactions."
        />
        <meta
          name="keywords"
          content="JournalX privacy policy, data protection, trade logs, AI analytics, journaling tool privacy"
        />
        <meta name="robots" content="index, follow" />
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
            JournalX respects your privacy and is committed to protecting your
            personal data. We collect only the information necessary to provide
            our services efficiently.
          </p>

          <ul
            className="font_14"
            style={{ lineHeight: "32px", marginLeft: "16px" }}
          >
            <li>Email and password for authentication</li>
            <li>Trade logs manually entered by the user</li>
            <li>
              Optional data for AI analytics (processed by third-party API
              providers)
            </li>
          </ul>

          <p className="font_14" style={{ lineHeight: "32px" }}>
            We do not sell, share, or distribute personal information for
            marketing or profit. Users may request deletion of their data by
            contacting{" "}
            <span style={{ color: "var(--primary-light)" }}>
              officialjournalx@gmail.com
            </span>
            .
          </p>
        </section>
      </main>
    </>
  );
}
