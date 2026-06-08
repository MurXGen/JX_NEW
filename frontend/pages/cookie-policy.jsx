"use client";

import LegalLayout from "@/components/legal/LegalLayout";

export default function CookiePolicy() {
  return (
    <LegalLayout
      title="Cookie Policy"
      path="/cookie-policy"
      updated="June 8, 2026"
      description="How JournalX uses cookies and local storage to keep you signed in, remember your preferences, and understand product usage."
      intro="This Cookie Policy explains how JournalX uses cookies, local storage, and similar technologies when you use our website and applications, and the choices available to you."
      sections={[
        {
          h: "1. What Are Cookies",
          body: [
            "Cookies are small text files stored on your device by your browser. Similar technologies include local storage and IndexedDB, which we use to store preferences and cache your data for offline access. We refer to all of these collectively as “cookies” in this policy.",
          ],
        },
        {
          h: "2. How We Use Them",
          body: [
            "We use cookies and local storage for the following purposes:",
            [
              "Essential — to keep you signed in, remember the journal and currency you have selected, and secure the Service. The Service cannot function without these.",
              "Preferences — to remember choices such as your theme (light/dark), collapsed sections, and monthly target.",
              "Local data cache — to store your trades and settings on your device for fast loading and offline resilience.",
              "Analytics — to understand, in aggregate, how the Service is used so we can improve it.",
            ],
          ],
        },
        {
          h: "3. Third-Party Cookies",
          body: [
            "Some features rely on third-party providers — for example, payment processing, bot-protection (CAPTCHA), and embedded market widgets — which may set their own cookies. These are governed by the respective providers' policies.",
          ],
        },
        {
          h: "4. Managing Cookies",
          body: [
            "Most browsers let you refuse or delete cookies through their settings. Please note that disabling essential cookies and local storage will prevent core features — including staying signed in and caching your trades — from working correctly.",
          ],
        },
        {
          h: "5. Changes to This Policy",
          body: [
            "We may update this Cookie Policy as our use of these technologies evolves. The “Last updated” date above reflects the most recent revision.",
          ],
        },
      ]}
    />
  );
}
