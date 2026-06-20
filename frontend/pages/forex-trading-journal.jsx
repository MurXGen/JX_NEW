"use client";
import MarketLanding from "@/components/landingPage/MarketLanding";
import { MARKET_PAGES } from "@/data/marketPages";

export default function ForexTradingJournal() {
  return <MarketLanding cfg={MARKET_PAGES["forex-trading-journal"]} />;
}
