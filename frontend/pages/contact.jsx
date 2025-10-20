import Head from "next/head";

export default function Contact() {
  return (
    <>
      <Head>
        <title>Contact Us | JournalX</title>
        <meta
          name="description"
          content="Need help with JournalX? Contact our support team for payment verification, feedback, or account assistance."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://journalx.app/contact" />

        {/* ✅ Open Graph / WhatsApp / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://journalx.app/contact" />
        <meta property="og:title" content="Contact JournalX Support" />
        <meta
          property="og:description"
          content="Reach out to JournalX support for payment verification, plan activation issues, or general queries."
        />
        <meta
          property="og:image"
          content="https://cdn.journalx.app/trades/open-images/1760979199580-JournalX_Banner.png"
        />
        <meta property="og:site_name" content="JournalX" />

        {/* ✅ Twitter (X) Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://journalx.app/contact" />
        <meta
          name="twitter:title"
          content="Contact JournalX – Get Support or Verify Payment"
        />
        <meta
          name="twitter:description"
          content="Contact JournalX for account or payment verification support. We're here to help traders worldwide."
        />
        <meta
          name="twitter:image"
          content="https://cdn.journalx.app/trades/open-images/1760979199580-JournalX_Banner.png"
        />
      </Head>

      <main className="flexClm gap_32">
        <section className="flexClm gap_16">
          <h1
            className="font_24 font_weight_700"
            style={{ color: "var(--primary-light)" }}
          >
            Contact JournalX
          </h1>
          <p className="font_14" style={{ lineHeight: "32px" }}>
            Need help or have questions? Our support team is here to assist you
            with account access, payment issues, or general inquiries about
            JournalX.
          </p>

          {/* ✅ Payment Verification Section */}
          <div className="flexClm gap_8">
            <h2 className="font_20">⚠️ Payment Verification Issues</h2>
            <p className="font_14" style={{ lineHeight: "28px" }}>
              If your payment was <strong>debited</strong> but your plan was not
              activated successfully, don’t worry — our team will help verify
              it. Please send us the following details for quick verification:
            </p>
            <ul
              className="font_14"
              style={{ marginLeft: "20px", lineHeight: "28px" }}
            >
              <li>✅ Your registered email on JournalX</li>
              <li>✅ Payment date and approximate time</li>
              <li>
                ✅ Transaction ID or payment reference number (if available)
              </li>
              <li>
                ✅ Screenshot or proof of payment from your bank, UPI, or
                Razorpay
              </li>
            </ul>
            <p className="font_14" style={{ lineHeight: "28px" }}>
              Once you have these details ready, click the link below to send us
              an email.
            </p>
            <a
              href="mailto:officialjournalx@gmail.com?subject=Verification%20Support%20-%20Payment%20Issue"
              className="font_14"
              style={{
                color: "var(--primary-light)",
                textDecoration: "underline",
                fontWeight: "600",
              }}
            >
              📧 Send Mail for Verification Support
            </a>
          </div>

          {/* ✅ Regular Support Info */}
          <div className="flexClm gap_8">
            <h2 className="font_20">Support Email</h2>
            <p className="font_14" style={{ lineHeight: "28px" }}>
              officialjournalx@gmail.com
            </p>

            <h2 className="font_20">Phone</h2>
            <p className="font_14" style={{ lineHeight: "28px" }}>
              +91 7977960242
            </p>

            <h2 className="font_20">Support Hours</h2>
            <p className="font_14" style={{ lineHeight: "28px" }}>
              Monday – Friday, 9:00 AM to 6:00 PM IST
            </p>

            <h2 className="font_20">Feedback</h2>
            <p className="font_14" style={{ lineHeight: "28px" }}>
              We welcome feedback to improve JournalX. Email your suggestions to{" "}
              <a
                href="mailto:officialjournalx@gmail.com?subject=Feedback%20-%20JournalX"
                style={{
                  color: "var(--primary-light)",
                  textDecoration: "underline",
                }}
              >
                officialjournalx@gmail.com
              </a>{" "}
              with the subject <strong>“Feedback – JournalX”</strong>.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
