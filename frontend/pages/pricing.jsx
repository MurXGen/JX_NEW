"use client";

/* /pricing, same design system as the landing redesign: floating nav,
   interactive pricing (billing toggle, plan finder, comparison), trader
   reviews, pricing FAQ and a closing CTA. Checkout runs through the shared
   usePlanCheckout flow inside PricingInteractive. */

import Head from "next/head";
import { PLANS_CONFIG, PLANS_FEATURES } from "@/utils/plans";
import { MarketingPage, CtaBand } from "@/components/landingPage/PageChrome";
import PricingInteractive from "@/components/landingPage/PricingInteractive";
import Testimonials from "@/components/landingPage/Testimonials";
import { FaqSection } from "@/components/landingPage/LandingBottom";

const SITE_URL = "https://journalx.app";
const TITLE = "Trading Journal Pricing: Free, Pro & Lifetime Plans | JournalX";
const DESC =
  "JournalX trading journal pricing. Start free, then unlock unlimited trades, advanced analytics and full history with Pro monthly, yearly or lifetime. 7-day free trial on paid plans.";

const list = (arr) => arr.map((f) => f.text).join(", ");

const PRICING_FAQS = [
  ["Is there a free plan?", `Yes. The free plan is free forever with no card required and includes ${list(PLANS_FEATURES.free)}.`],
  ["What do I get with Pro?", `Pro includes ${list(PLANS_FEATURES.pro)}. You can pay monthly or yearly; yearly costs less per month.`],
  ["How does the 7-day free trial work?", "Every paid plan starts with a 7-day free trial, so you can try Pro analytics on your own trades before you pay."],
  ["Can I cancel anytime?", "Yes. Monthly and yearly plans can be cancelled at any time and you keep access until the end of the period you paid for."],
  ["What is included in Lifetime?", `Lifetime is a one-time payment and includes ${list(PLANS_FEATURES.lifetime)}.`],
  ["Which payment methods do you accept?", "Cards and PayPal through our secure checkout, plus crypto. UPI is available for payments in India."],
  ["Why are prices shown in my currency?", "JournalX shows prices in INR for visitors in India and in USD everywhere else, based on your location."],
  ["Do you offer refunds?", "Refunds follow the JournalX refund policy, which you can read on the refund policy page linked in the footer."],
];

export default function Pricing() {
  const offersLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "JournalX Pro trading journal",
    description: "JournalX trading journal with advanced analytics, unlimited trades, risk and psychology tracking.",
    brand: { "@type": "Brand", name: "JournalX" },
    offers: ["monthly", "yearly", "lifetime"].map((k) => ({
      "@type": "Offer",
      name: PLANS_CONFIG[k].title,
      price: PLANS_CONFIG[k].amount,
      priceCurrency: PLANS_CONFIG[k].currency,
      url: `${SITE_URL}/pricing`,
      availability: "https://schema.org/InStock",
    })),
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PRICING_FAQS.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Pricing", item: `${SITE_URL}/pricing` },
    ],
  };

  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <meta name="keywords" content="trading journal pricing, journalx pricing, trading journal price, free trading journal, trading journal subscription, lifetime trading journal" />
        <link rel="canonical" href={`${SITE_URL}/pricing`} />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="JournalX" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={`${SITE_URL}/pricing`} />
        <meta property="og:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESC} />
        <meta name="twitter:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta name="theme-color" content="#000000" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offersLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      </Head>

      <MarketingPage>
        <PricingInteractive asPage />
        <Testimonials schema={false} />
        <FaqSection faqs={PRICING_FAQS} title={<>Pricing <span>questions</span>, answered</>} />
        <CtaBand
          title="Start your trading journal free"
          lead="No card required. Upgrade to Pro whenever you are ready, with a 7-day free trial."
          primary={{ href: "/register", label: "Start journaling free" }}
          secondary={{ href: "/features", label: "See all features" }}
        />
      </MarketingPage>
    </>
  );
}
