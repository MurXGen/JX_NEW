"use client";

/* Programmatic SEO landing pages (brokers + prop firms).
   Renders data-driven configs through the shared MarketLanding template.
   Static routes always win over this dynamic route, and getStaticPaths only
   emits our known broker/prop-firm slugs (fallback:false), so this never
   shadows existing pages and unknown paths fall through to the 404 page. */

import MarketLanding from "@/components/landingPage/MarketLanding";
import { BROKER_PAGES, BROKER_SLUGS } from "@/data/brokerPages";
import { PROP_FIRM_PAGES, PROP_FIRM_SLUGS } from "@/data/propFirmPages";

const ALL_PAGES = { ...BROKER_PAGES, ...PROP_FIRM_PAGES };

export default function ProgrammaticLanding({ cfg }) {
  return <MarketLanding cfg={cfg} />;
}

export async function getStaticPaths() {
  return {
    paths: [...BROKER_SLUGS, ...PROP_FIRM_SLUGS].map((slug) => ({ params: { slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const cfg = ALL_PAGES[params.slug];
  if (!cfg) return { notFound: true };
  return { props: { cfg } };
}
