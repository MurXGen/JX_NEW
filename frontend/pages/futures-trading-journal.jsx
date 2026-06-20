"use client";
import MarketLanding from "@/components/landingPage/MarketLanding";
import { MARKET_PAGES } from "@/data/marketPages";

export default function FuturesTradingJournal() {
  return <MarketLanding cfg={MARKET_PAGES["futures-trading-journal"]} />;
}
