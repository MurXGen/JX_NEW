"use client";

/* Isolated preview of the new hero section — open at /hero-preview.
   Does not touch the live landing page. Delete this file (and the component)
   if we don't ship it. noindex so it never competes with the real homepage. */

import Head from "next/head";
import HeroSection from "@/components/landing/HeroSection";

export default function HeroPreview() {
  return (
    <>
      <Head>
        <title>Hero preview — JournalX</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ background: "#000", minHeight: "100vh" }}>
        <HeroSection />
      </div>
    </>
  );
}
