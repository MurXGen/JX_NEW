import "@/styles/globals.css";
import Head from "next/head";
import { useEffect } from "react";

export default function MyApp({ Component, pageProps }) {
  // Prevent desktop keyboard zoom (Ctrl + / Ctrl - / Ctrl =)
  useEffect(() => {
    const preventZoom = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "+" || e.key === "-" || e.key === "=") {
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", preventZoom);
    return () => window.removeEventListener("keydown", preventZoom);
  }, []);

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
        <meta name="author" content="Murthy Poothapandi Thevar" />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#0d1117" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />

        {/* Favicon */}
        <link
          rel="icon"
          href="https://cdn.journalx.app/trades/close-images/1760761272162-Untitled_design-3.png"
        />

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
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
        <meta
          property="og:image"
          content="https://cdn.journalx.app/trades/open-images/1760762109674-Best_journal_for_traders.png"
        />

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
        <meta
          name="twitter:image"
          content="https://cdn.journalx.app/trades/open-images/1760762109674-Best_journal_for_traders.png"
        />

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
