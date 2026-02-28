import "@/styles/globals.css";
import * as gtag from "@/utils/gtag";
import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const handleClick = (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      // Only add loader if not already loading
      if (!btn.classList.contains("loading")) {
        btn.classList.add("loading");
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    const handleRouteChange = (url) => gtag.pageview(url);
    router.events.on("routeChangeComplete", handleRouteChange);
    handleRouteChange(window.location.pathname);
    return () => router.events.off("routeChangeComplete", handleRouteChange);
  }, [router.events]);

  return (
    <>
      <Head>
        {/* Primary Meta */}
        <title>
          JournalX | The Ultimate Trading Journal for Stocks, Options, Forex &
          Crypto
        </title>
        <meta
          name="description"
          content="The all-in-one digital trading journal for Stocks, Options, Forex, Futures & Crypto. JournalX helps traders log, analyze, and optimize every trade with smart analytics to sharpen their edge and improve consistency."
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
          content="JournalX – Smarter Trading Journal for Stocks, Options, Forex & Crypto"
        />
        <meta
          property="og:description"
          content="Track, review, and refine your trades across markets. JournalX helps you discover performance insights, identify patterns, and improve your trading discipline."
        />
        <meta property="og:image" content="/assets/JournalX_Banner.png" />

        {/* Twitter Meta */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://journalx.app" />
        <meta
          name="twitter:title"
          content="JournalX | Smart Trading Journal for Stocks, Options & Crypto"
        />
        <meta
          name="twitter:description"
          content="JournalX empowers traders to log and analyze trades across multiple markets with AI-powered insights to boost performance and consistency."
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

        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
        try {
          const savedTheme = localStorage.getItem('theme') || 'dark';
          // Set on both html and body to ensure coverage
          document.documentElement.setAttribute('data-theme', savedTheme);
          document.body.setAttribute('data-theme', savedTheme);
          
          // Also add a class for any legacy CSS
          if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } catch (e) {
          console.error('Theme initialization failed:', e);
        }
      })();`,
          }}
        />

        {/* GA4 */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            />
            <script
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

      <Component {...pageProps} />
    </>
  );
}
