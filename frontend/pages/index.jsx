// pages/index.jsx
import { useEffect } from "react";
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

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const isVerified = Cookies.get("isVerified");
    if (isVerified === "yes") {
      router.push("/accounts");
    }
  }, [router]);

  useEffect(() => {
    // Set landing page background
    document.body.style.backgroundColor = "#020202";
    document.body.style.color = "white"; // optional, for contrast

    // Reset when leaving page
    return () => {
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
    };
  }, []);

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>JournalX — Smarter Trading Journal for Serious Traders</title>
        <meta
          name="description"
          content="JournalX is an advanced trading journal that helps you track trades, analyze performance, and improve consistency. Manage multiple accounts, record entries & exits, add screenshots, and review your trading psychology — all in one place."
        />
        <meta
          name="keywords"
          content="trading journal, trade tracker, stock trading journal, forex trading journal, crypto trading journal, options trading log, trading performance tracker, JournalX"
        />
        <meta name="author" content="JournalX Team" />
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#222222" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://journalx.app/" />
        <meta
          property="og:title"
          content="JournalX — Journal & Analyze Your Trades Like a Pro"
        />
        <meta
          property="og:description"
          content="Record trades, visualize results, and grow your trading discipline with JournalX — the easiest and smartest way to journal your trades."
        />
        <meta property="og:image" content="/assets/Journalx_Banner.png" />

        {/* Twitter Meta */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://journalx.app/" />
        <meta
          name="twitter:title"
          content="JournalX — Trade Journal for Smart Traders"
        />
        <meta
          name="twitter:description"
          content="Master your trading edge with JournalX — record, review, and refine your trading strategy."
        />
        <meta name="twitter:image" content="/assets/Journalx_Banner.png" />

        {/* Canonical */}
        <link rel="canonical" href="https://journalx.app/" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "JournalX",
              url: "https://journalx.app",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web",
              description:
                "JournalX helps traders log trades, analyze performance, and enhance discipline with data-driven insights. Manage multiple accounts, add screenshots, and review trade history easily.",
              offers: [
                {
                  "@type": "Offer",
                  price: "0.00",
                  priceCurrency: "USD",
                  availability: "https://schema.org/InStock",
                },
                {
                  "@type": "Offer",
                  price: "0.00",
                  priceCurrency: "INR",
                  availability: "https://schema.org/InStock",
                },
              ],
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
            }),
          }}
        />
      </Head>

      <div className="">
        <Navbar />
        <HeroSection />
        <SponsorsSection />
        <WhyJournalSection />
        <ChooseJournalX />
        <FeatureSection />
        <ReviewsSection />
        <Faqs />
        <BottomCTA />
        <Footer />
        {/* Add your landing sections here later */}
      </div>
    </>
  );
}
