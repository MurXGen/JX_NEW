import "@/styles/globals.css";
import * as gtag from "@/utils/gtag";
import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url) => gtag.pageview(url);
    router.events.on("routeChangeComplete", handleRouteChange);
    handleRouteChange(window.location.pathname);

    return () => router.events.off("routeChangeComplete", handleRouteChange);
  }, [router.events]);

  return (
    <>
      <Head>
        {/* --- BASIC SEO --- */}
        <title>
          JournalX | Ultimate Trading Journal for Stocks, Options, Forex &
          Crypto
        </title>
        <meta
          name="description"
          content="Smart trading journal for Stocks, Options, Forex, Crypto & Futures. Log trades, analyze performance, and improve strategy with more insights into your protitable and losing trades."
        />
        <meta
          name="keywords"
          content="trading journal, trade analytics, ai trading journal, crypto journal, forex journal, trade tracker"
        />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#0d1117" />

        {/* Faster rendering on mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* --- ICONS --- */}
        <link rel="icon" href="/assets/JournalX_Favicon.png" />

        {/* --- FONTS (Optimized using preconnect + display=swap) --- */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Ubuntu:wght@300;400;500;700&display=swap"
        />

        {/* Remove unused fonts: Comfortaa, Bree Serif (they slow page load) */}

        {/* --- SOCIAL META --- */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://journalx.app" />
        <meta property="og:title" content="JournalX – Smart Trading Journal" />
        <meta
          property="og:description"
          content="Log trades, find patterns, and improve trading performance using JournalX."
        />
        <meta property="og:image" content="/assets/JournalX_Banner.png" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="JournalX – Smart Trading Journal" />
        <meta
          name="twitter:description"
          content="Analyze and optimize your trades with JournalX."
        />
        <meta name="twitter:image" content="/assets/JournalX_Banner.png" />

        {/* --- MANIFEST --- */}
        <link rel="manifest" href="/manifest.json" />

        {/* --- THEME INITIALIZATION (non-blocking) --- */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  const theme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.classList.add(theme);
                } catch(e) {}
              })();
            `,
          }}
        />

        {/* --- GA4 (Loaded AFTER page becomes interactive) --- */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              async
            ></script>

            <script
              id="gtag-init"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', { send_page_view: false });
                `,
              }}
            />
          </>
        )}
      </Head>

      {/* --- RENDER PAGE --- */}
      <Component {...pageProps} />
    </>
  );
}
