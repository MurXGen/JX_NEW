"use client";

import LegalLayout from "@/components/legal/LegalLayout";

export default function TermsOfService() {
  return (
    <LegalLayout
      title="Terms of Service"
      path="/terms-services"
      updated="June 8, 2026"
      description="The Terms of Service governing your use of JournalX, including acceptable use, subscriptions, disclaimers, and limitation of liability."
      intro="These Terms of Service (“Terms”) form a binding agreement between you and JournalX governing your access to and use of the JournalX website, applications, and services (collectively, the “Service”). By creating an account or using the Service, you agree to these Terms. If you do not agree, you must not use the Service."
      sections={[
        {
          h: "1. Eligibility",
          body: [
            "You must be at least 18 years old and capable of forming a binding contract to use the Service. By using JournalX you represent and warrant that you meet these requirements and that the information you provide is accurate and complete.",
          ],
        },
        {
          h: "2. Your Account",
          body: [
            "You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorised use. We are not liable for any loss arising from your failure to safeguard your credentials.",
          ],
        },
        {
          h: "3. Acceptable Use",
          body: [
            "You agree not to:",
            [
              "use the Service for any unlawful purpose or in violation of any applicable law or regulation;",
              "attempt to gain unauthorised access to the Service, other accounts, or our systems;",
              "interfere with or disrupt the integrity or performance of the Service;",
              "reverse engineer, scrape, or resell any part of the Service except as expressly permitted; or",
              "upload content that is unlawful, infringing, or malicious.",
            ],
          ],
        },
        {
          h: "4. Subscriptions, Billing, and Renewals",
          body: [
            "Paid plans are billed in advance on a recurring basis (monthly or yearly) or as a one-time lifetime purchase, as selected at checkout. Subscriptions renew automatically until cancelled. You may cancel at any time from your account settings; cancellation takes effect at the end of the current billing period. Prices may change with prior notice, and applicable taxes may be added.",
          ],
        },
        {
          h: "5. Connected Exchanges and Third-Party Services",
          body: [
            "Where you connect a third-party exchange or service, you authorise JournalX to access read-only data using the credentials you provide. We are not responsible for the availability, accuracy, or actions of third-party services, and your use of them is subject to their own terms.",
          ],
        },
        {
          h: "6. Not Financial Advice",
          body: [
            "JournalX is a trade-journaling and analytics tool. Nothing in the Service constitutes financial, investment, tax, or legal advice, a recommendation, or a solicitation to buy or sell any instrument. All analytics, statistics, projections, and “if you had held” estimates are informational only and may be inaccurate. You are solely responsible for your trading decisions. See our Risk Disclaimer for more.",
          ],
        },
        {
          h: "7. Intellectual Property",
          body: [
            "The Service, including its software, design, and content (excluding your data), is owned by JournalX and protected by intellectual-property laws. You retain ownership of the trading data and content you submit, and you grant us a limited licence to host, process, and display it solely to provide the Service to you.",
          ],
        },
        {
          h: "8. Disclaimers",
          body: [
            "The Service is provided “as is” and “as available” without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or that data will be accurate or complete.",
          ],
        },
        {
          h: "9. Limitation of Liability",
          body: [
            "To the maximum extent permitted by law, JournalX and its officers, employees, and suppliers will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, trading losses, data, or goodwill, arising out of or related to your use of the Service. Our total liability for any claim will not exceed the amount you paid us in the twelve months preceding the claim.",
          ],
        },
        {
          h: "10. Termination",
          body: [
            "We may suspend or terminate your access to the Service at any time for violation of these Terms or to protect the Service or other users. You may stop using the Service and delete your account at any time. Provisions that by their nature should survive termination will survive.",
          ],
        },
        {
          h: "11. Governing Law",
          body: [
            "These Terms are governed by the laws of the jurisdiction in which JournalX is established, without regard to conflict-of-law principles. Any disputes will be subject to the exclusive jurisdiction of the competent courts of that jurisdiction.",
          ],
        },
        {
          h: "12. Changes to These Terms",
          body: [
            "We may modify these Terms from time to time. We will notify you of material changes through the Service or by email. Continued use after changes take effect constitutes acceptance of the revised Terms.",
          ],
        },
      ]}
    />
  );
}
