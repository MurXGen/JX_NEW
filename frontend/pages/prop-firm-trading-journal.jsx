"use client";
import MarketLanding from "@/components/landingPage/MarketLanding";
import { MARKET_PAGES } from "@/data/marketPages";

export default function PropFirmTradingJournal() {
  return <MarketLanding cfg={MARKET_PAGES["prop-firm-trading-journal"]} />;
}
