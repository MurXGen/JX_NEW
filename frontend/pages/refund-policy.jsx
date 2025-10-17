import Head from "next/head";

export default function RefundPolicy() {
  return (
    <>
      <Head>
        <title>Refund Policy | JournalX</title>
        <meta
          name="description"
          content="JournalX Refund Policy: Learn how JournalX handles subscription refunds, failed payments, and duplicate transactions."
        />
        <meta
          name="keywords"
          content="JournalX refund policy, subscription refunds, failed payments, trading journal refund"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://journalx.app/refund-policy" />
      </Head>

      <main className="flexClm gap_32">
        <section className="flexClm gap_16">
          <h1
            className="font_24 font_weight_700"
            style={{ color: "var(--primary-light)" }}
          >
            Refund Policy
          </h1>

          <p className="font_14" style={{ lineHeight: "32px" }}>
            JournalX follows a strict no-refund policy for successfully
            processed payments. Refunds are issued only in the case of failed or
            duplicate transactions, verified by our support team.
          </p>

          <p className="font_14" style={{ lineHeight: "32px" }}>
            Refunds are processed within 3–4 business days (Monday–Friday) after
            verification. For assistance, contact{" "}
            <span style={{ color: "var(--primary-light)" }}>
              officialjournalx@gmail.com
            </span>{" "}
            or call{" "}
            <span style={{ color: "var(--primary-light)" }}>
              +91 7977960242
            </span>
            .
          </p>
        </section>
      </main>
    </>
  );
}
