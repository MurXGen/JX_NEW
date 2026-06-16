"use client";

import LegalLayout from "@/components/legal/LegalLayout";

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      path="/privacy-policy"
      updated="June 8, 2026"
      description="JournalX Privacy Policy — how we collect, use, store, and protect your data. We never sell your personal data; you retain full control over export and deletion."
      intro="JournalX (“JournalX”, “we”, “us”, or “our”) is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, the legal bases on which we rely, and the rights available to you. By accessing or using JournalX, you agree to the practices described in this policy. JournalX is a journaling and analytics software tool only; it is not a financial institution and does not provide financial services. The trading data you store is information you create or import for your own record-keeping."
      sections={[
        {
          h: "1. Information We Collect",
          body: [
            "We collect the following categories of information in order to provide and improve our services:",
            [
              "Account information — your name, email address, and authentication credentials (passwords are stored only as salted hashes; we never store them in plain text).",
              "Trading data — the trades, journals, notes, screenshots, tags, and analytics you create or import into the platform.",
              "Connected-exchange data — where you choose to connect an exchange, read-only API credentials and the trade history retrieved using them. Read-only keys are stored locally on your device wherever technically possible.",
              "Technical data — IP address, device and browser type, and usage analytics collected to operate and secure the service.",
              "Payment data — processed by our third-party payment processors. We do not store full card numbers on our servers.",
            ],
          ],
        },
        {
          h: "2. How We Use Your Information",
          body: [
            "We use your information to: operate, maintain, and secure the platform; provide trade logging, analytics, and reporting features; process subscriptions and payments; communicate service updates and respond to support requests; detect, prevent, and address fraud or abuse; and comply with legal obligations.",
            "We may use aggregated, de-identified data that cannot reasonably be used to identify you for product research and improvement.",
          ],
        },
        {
          h: "3. AI and Automated Processing",
          body: [
            "Certain analytics and insight features may use automated or AI-assisted processing of your trading data to generate statistics, summaries, and suggestions. This processing is performed to deliver the features you request. We do not use your private trading data to train third-party foundation models, and we do not sell it.",
          ],
        },
        {
          h: "4. How We Share Information",
          body: [
            "We do not sell your personal data. We share information only with: service providers who process data on our behalf under contractual confidentiality obligations (for example, hosting, email delivery, payments, and storage); exchanges or data providers you explicitly connect; and authorities where required by law, regulation, or valid legal process.",
          ],
        },
        {
          h: "5. Data Storage and Security",
          body: [
            "Your data is stored on secured infrastructure using industry-standard safeguards including encryption in transit. Uploaded images are stored with our object-storage provider and served over a content delivery network. While we take reasonable measures to protect your information, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
          ],
        },
        {
          h: "6. Your Rights and Choices",
          body: [
            "Depending on your jurisdiction, you may have the right to access, correct, export, restrict, or delete your personal data, and to object to certain processing. JournalX provides in-product controls to export your data and to delete your account. To exercise any right not available in-product, contact officialjournalx@gmail.com and we will respond within the timeframe required by applicable law.",
          ],
        },
        {
          h: "7. Data Retention",
          body: [
            "We retain your information for as long as your account is active or as needed to provide the service. After account deletion, we remove or anonymise your personal data within a reasonable period, except where retention is required for legal, accounting, or security purposes.",
          ],
        },
        {
          h: "8. International Transfers",
          body: [
            "Your information may be processed in countries other than your own. Where we transfer personal data internationally, we rely on appropriate safeguards consistent with applicable data-protection law.",
          ],
        },
        {
          h: "9. Children's Privacy",
          body: [
            "JournalX is not directed to individuals under the age of 18, and we do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us so we can delete it.",
          ],
        },
        {
          h: "10. Changes to This Policy",
          body: [
            "We may update this Privacy Policy from time to time. Material changes will be notified through the service or by email, and the “Last updated” date above will be revised. Continued use of JournalX after changes take effect constitutes acceptance of the updated policy.",
          ],
        },
      ]}
    />
  );
}
