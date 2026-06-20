"use client";
import MarketLanding from "@/components/landingPage/MarketLanding";
import { MARKET_PAGES } from "@/data/marketPages";

export default function OptionsTradingJournal() {
  return <MarketLanding cfg={MARKET_PAGES["options-trading-journal"]} />;
}
