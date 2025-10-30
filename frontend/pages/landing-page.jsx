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

export default function Home() {
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
        <title>JournalX - Trade Smarter, Not Harder</title>
        <meta
          name="description"
          content="Analyze your trades, track performance, and master trading psychology with JournalX — your ultimate trading journal."
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
