import Head from "next/head";

export default function Contact() {
  return (
    <>
      <Head>
        <title>Contact Us | JournalX</title>
        <meta
          name="description"
          content="Contact JournalX for support, failed payment verification, feedback, or billing inquiries. We're here to help traders using our journaling and analytics platform."
        />
        <meta
          name="keywords"
          content="JournalX contact, support, trading journal help, payment verification, billing issues, feedback, trader journaling app"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://journalx.app/contact" />
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
