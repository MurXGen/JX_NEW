import "@/styles/globals.css";

import Head from "next/head";
import { useEffect } from "react";
import { useState } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* Primary Meta */}
        <title>JournalX | Smart Trading Journal & AI Performance Tracker</title>
        <meta
          name="description"
          content="JournalX is a digital trading journal that helps traders log, analyze, and improve their trades with AI insights. Track your performance, spot patterns, and grow consistently."
        />
        <meta
          name="keywords"
          content="trading journal, trade analytics, AI trading journal, performance tracker, stock trading log, crypto trading journal, forex journal, trade analysis, trading performance app, journalx, trading tracker, best trading journal app, trading notebook, trader diary"
        />
        <meta name="google-adsense-account" content="ca-pub-9495953709882107" />

        <meta name="author" content="Murthy Poothapandi Thevar" />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#0d1117" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />

        {/* Favicon */}
        <link rel="icon" href="/assets/JournalX_Favicon.png" />

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bree+Serif&family=Poppins:wght@300;400;500;600;700&family=Ubuntu:wght@300;400;500;700&family=Comfortaa:wght@400;500;700&display=swap"
          rel="stylesheet"
        />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1d1d1d" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://journalx.app" />
        <meta
          property="og:title"
          content="JournalX – AI Powered Trading Journal"
        />
        <meta
          property="og:description"
          content="Analyze your trades like a pro. JournalX helps you discover patterns, track performance, and grow smarter with AI insights."
        />
        <meta property="og:image" content="/assets/JournalX_Banner.png" />

        {/* Twitter Meta */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://journalx.app" />
        <meta
          name="twitter:title"
          content="JournalX | Smart Trading Journal & AI Tracker"
        />
        <meta
          name="twitter:description"
          content="Track, analyze, and improve your trades using AI-powered insights. JournalX – your intelligent trading companion."
        />
        <meta name="twitter:image" content="/assets/JournalX_Banner.png" />

        {/* Theme initialization */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
              const savedTheme = localStorage.getItem('theme') || 'dark';
              document.documentElement.classList.add(savedTheme);
            })();`,
          }}
        />
      </Head>

      <Component {...pageProps} />
    </>
  );
}
