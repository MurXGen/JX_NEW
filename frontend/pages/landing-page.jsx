// pages/index.jsx
import { useEffect } from "react";
import Navbar from "@/components/landingPage/Navbar";
import Head from "next/head";
import "../styles/landing.css";
import HeroSection from "@/components/landingPage/Hero";
import SponsorsSection from "@/components/landingPage/Sponsors";

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

      <div className="landing-body">
        <Navbar />
        <HeroSection />
        <SponsorsSection />
        {/* Add your landing sections here later */}
      </div>
    </>
  );
}
