"use client";
import MarketLanding from "@/components/landingPage/MarketLanding";
import { MARKET_PAGES } from "@/data/marketPages";

export default function CryptoTradingJournal() {
  return <MarketLanding cfg={MARKET_PAGES["crypto-trading-journal"]} />;
}
