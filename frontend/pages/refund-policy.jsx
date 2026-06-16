"use client";

import LegalLayout from "@/components/legal/LegalLayout";

export default function RefundPolicy() {
  return (
    <LegalLayout
      title="Refund & Cancellation Policy"
      path="/refund-policy"
      updated="June 8, 2026"
      description="JournalX Refund & Cancellation Policy — how subscriptions, renewals, lifetime purchases, and refund requests are handled."
      intro="This Refund & Cancellation Policy explains how billing, cancellations, and refunds work for JournalX subscriptions and one-time purchases. By purchasing a plan, you agree to the terms set out below in addition to our Terms of Service. JournalX is a software subscription for journaling and analysing your own trades — it is a software tool, not a financial product or financial service, and your purchase is for access to that software only."
      sections={[
        {
          h: "1. Free Plan",
          body: [
            "JournalX offers a free plan that lets you evaluate the core product before purchasing. We encourage you to use the free plan to confirm the Service meets your needs prior to upgrading.",
          ],
        },
        {
          h: "2. Subscriptions and Renewals",
          body: [
            "Monthly and yearly subscriptions are billed in advance and renew automatically at the end of each billing period until cancelled. You may cancel at any time from your account settings. Upon cancellation, you retain access to paid features until the end of the period you have already paid for; the subscription will not renew thereafter.",
          ],
        },
        {
          h: "3. Refund Eligibility",
          body: [
            "Because JournalX is a digital service delivered immediately, fees are generally non-refundable once a billing period has begun. We may, at our discretion, grant a refund in the following circumstances:",
            [
              "you were charged due to a verifiable billing error;",
              "you were charged for a renewal and request a refund within 7 days of that renewal, provided the paid features were not substantially used during the period; or",
              "the Service was materially unavailable for a prolonged period due to our fault.",
            ],
          ],
        },
        {
          h: "4. Lifetime Purchases",
          body: [
            "Lifetime plans are one-time purchases granting access for the lifetime of the product. Lifetime purchases may be refunded within 7 days of purchase if the advanced features have not been substantially used. After this window, lifetime purchases are non-refundable.",
          ],
        },
        {
          h: "5. How to Request a Refund",
          body: [
            "To request a refund, email officialjournalx@gmail.com from the address associated with your account, including your order details and the reason for the request. We aim to respond within 5 business days. Approved refunds are issued to the original payment method and may take additional time to appear depending on your provider.",
          ],
        },
        {
          h: "6. Cryptocurrency Payments",
          body: [
            "Payments made using cryptocurrency are, by their nature, final and may be non-refundable. Where a refund is approved for a crypto payment, it may be issued in the equivalent fiat value or store credit at our discretion, and network fees are non-recoverable.",
          ],
        },
        {
          h: "7. Chargebacks",
          body: [
            "If you initiate a chargeback or payment dispute without first contacting us, we reserve the right to suspend your account pending resolution. We encourage you to reach out to support first — most issues are resolved quickly and amicably.",
          ],
        },
        {
          h: "8. Changes to This Policy",
          body: [
            "We may update this policy from time to time. The version in effect at the time of your purchase governs that purchase. Material changes will be communicated through the Service or by email.",
          ],
        },
      ]}
    />
  );
}
