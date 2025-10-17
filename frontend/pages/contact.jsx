import Head from "next/head";

export default function Contact() {
  return (
    <>
      <Head>
        <title>Contact Us | JournalX</title>
        <meta
          name="description"
          content="Contact JournalX for support, feedback, billing, or privacy inquiries. JournalX is a digital journaling tool for traders to log and analyze trades."
        />
        <meta
          name="keywords"
          content="JournalX contact, support, feedback, trader journal support, trading journal help, contact journaling tool"
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
            Have questions or need assistance? Our support team is here to help
            you with account issues, payments, AI features, or feedback.
          </p>

          <h2 className="font_20">Support Email</h2>
          <p className="font_14" style={{ lineHeight: "32px" }}>
            officialjournalx@gmail.com
          </p>

          <h2 className="font_20">Phone</h2>
          <p className="font_14" style={{ lineHeight: "32px" }}>
            +91 7977960242
          </p>

          <h2 className="font_20">Support Hours</h2>
          <p className="font_14" style={{ lineHeight: "32px" }}>
            Monday – Friday, 9:00 AM to 6:00 PM IST
          </p>

          <h2 className="font_20">Feedback</h2>
          <p className="font_14" style={{ lineHeight: "32px" }}>
            We welcome feedback to improve JournalX. Email your suggestions to{" "}
            <span style={{ color: "var(--primary-light)" }}>
              officialjournalx@gmail.com
            </span>{" "}
            with the subject "Feedback – JournalX".
          </p>
        </section>
      </main>
    </>
  );
}
