import { Html, Head, Main, NextScript } from "next/document";

const SITE_URL = "https://journalx.app";

/* Sitewide structured data — helps Google understand the brand + product
   and unlocks rich results (sitelinks search box, knowledge panel). */
const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "JournalX",
  url: SITE_URL,
  logo: `${SITE_URL}/assets/JournalX_Favicon.png`,
  description:
    "AI-powered trading journal and analytics for stocks, options, forex, futures and crypto.",
  sameAs: [],
};

const WEBSITE_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "JournalX",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/blog?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const SOFTWARE_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "JournalX",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web, iOS, Android",
  url: SITE_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "The all-in-one trading journal for stocks, options, forex, futures and crypto. Log, analyze and optimize every trade with smart analytics.",
};

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Connection hints — fonts + image CDN */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://cdn.journalx.app" />
        <link rel="preconnect" href="https://cdn.journalx.app" crossOrigin="anonymous" />

        {/* Icons */}
        <link rel="icon" href="/assets/JournalX_Favicon.png" />
        <link rel="apple-touch-icon" href="/assets/JournalX_Favicon2.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Theme init — runs before hydration to avoid a flash of the wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
              try {
                var t = localStorage.getItem('theme') || 'dark';
                document.documentElement.setAttribute('data-theme', t);
                document.documentElement.classList.toggle('dark', t === 'dark');
              } catch (e) {}
            })();`,
          }}
        />

        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_LD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_LD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_LD) }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
