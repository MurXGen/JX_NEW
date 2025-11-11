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
          JournalX — The Ultimate Trading Journal App for Smart Traders
        </title>
        <meta
          name="description"
          content="JournalX is the ultimate trading journal app for stock, forex, options, and crypto traders. Log your trades, track performance, manage psychology, and improve consistency — all in one intuitive dashboard."
        />
        <meta
          name="keywords"
          content="trading journal, trade tracker, stock trading journal, forex journal, crypto trade log, options trading tracker, trading performance app, JournalX"
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
          content="Analyze, journal, and optimize your trading strategy. JournalX helps traders improve discipline and performance through data-driven insights."
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
          content="JournalX — Journal & Analyze Your Trades Like a Pro"
        />
        <meta
          name="twitter:description"
          content="Master your trading edge with JournalX — track trades, analyze results, and grow your consistency."
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
                "JournalX is a professional trading journal app designed for traders who want to log, analyze, and improve their trading performance across markets.",
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
