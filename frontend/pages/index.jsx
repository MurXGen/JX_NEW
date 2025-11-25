import { useEffect, useState } from "react";
import Navbar from "@/components/landingPage/Navbar";
import Head from "next/head";
import HeroSection from "@/components/landingPage/Hero";
import SponsorsSection from "@/components/landingPage/Sponsors";
import WhyJournalSection from "@/components/landingPage/WhyJournal";
import ChooseJournalX from "@/components/landingPage/ChooseJournalx";
import Faqs from "@/components/landingPage/Faqs";
import ReviewsSection from "@/components/landingPage/Reviews";
import BottomCTA from "@/components/landingPage/BottomCTA";
import Footer from "@/components/landingPage/Footer";
import FeatureSection from "@/components/landingPage/Features";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import FullPageLoader from "@/components/ui/FullPageLoader";
import ProfitJourneySection from "@/components/landingPage/ProfitJourneySection";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isVerified = Cookies.get("isVerified");
    if (isVerified === "yes") router.push("/accounts");
    else setLoading(false);
  }, [router]);

  useEffect(() => {
    document.body.style.backgroundColor = "#020202";
    document.body.style.color = "white";
    return () => {
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
    };
  }, []);

  if (loading) return <FullPageLoader />;

  return (
    <>
      <Head>
        {/* === Primary SEO Tags === */}
        <title>
          JournalX — The Ultimate Trading Journal for Stocks, Options, Forex &
          Crypto
        </title>
        <meta
          name="description"
          content="The all-in-one trading journal for Stocks, Options, Forex, Futures & Crypto. JournalX empowers traders to log and review trades, uncover performance insights, and sharpen their edge with advanced analytics and AI-driven tracking."
        />
        <meta
          name="keywords"
          content="trading journal, stock trading journal, options trading tracker, forex trade log, crypto trading journal, futures trading log, trading performance tracker, trade analytics, journalx app, ai trading journal"
        />
        <meta name="author" content="JournalX" />
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#020202" />

        {/* === Open Graph / Facebook === */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="JournalX" />
        <meta property="og:url" content="https://journalx.app/" />
        <meta
          property="og:title"
          content="JournalX — Smarter Trading Journal for Serious Traders"
        />
        <meta
          property="og:description"
          content="Track, analyze, and optimize your trades with JournalX. Designed for Stocks, Options, Forex, Futures & Crypto traders who want to grow consistently with data-driven insights."
        />
        <meta
          property="og:image"
          content="https://journalx.app/assets/Journalx_Banner.png"
        />
        <meta
          property="og:image:alt"
          content="JournalX Trading Journal Dashboard Preview"
        />

        {/* === Twitter === */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@journalxapp" />
        <meta name="twitter:creator" content="@journalxapp" />
        <meta name="twitter:url" content="https://journalx.app/" />
        <meta
          name="twitter:title"
          content="JournalX — The Smart Trading Journal for Stocks, Options & Crypto"
        />
        <meta
          name="twitter:description"
          content="JournalX helps traders log and analyze trades across markets with AI-powered insights to improve performance and consistency."
        />
        <meta
          name="twitter:image"
          content="https://journalx.app/assets/Journalx_Banner.png"
        />

        {/* === Canonical Link === */}
        <link rel="canonical" href="https://journalx.app/" />

        {/* === Favicon & App Icons === */}
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="manifest" href="/site.webmanifest" />

        {/* === Schema: SaaS / Software Application === */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "JournalX",
              url: "https://journalx.app",
              image: "https://journalx.app/assets/Journalx_Banner.png",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web, iOS, Android",
              description:
                "JournalX is an AI-powered trading journal app that helps traders log, analyze, and improve their performance across Stocks, Options, Forex, Futures & Crypto.",
              offers: {
                "@type": "Offer",
                price: "0.00",
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "320",
              },
              brand: {
                "@type": "Brand",
                name: "JournalX",
                logo: "https://journalx.app/assets/journalx_navbar.svg",
              },
              publisher: {
                "@type": "Organization",
                name: "JournalX",
                url: "https://journalx.app",
              },
            }),
          }}
        />
      </Head>

      <div>
        <Navbar />
        <HeroSection />
        <ProfitJourneySection />
        <SponsorsSection />
        <WhyJournalSection />
        <ChooseJournalX />
        <FeatureSection />
        <ReviewsSection />
        <Faqs />
        <BottomCTA />
        <Footer />
      </div>
    </>
  );
}
