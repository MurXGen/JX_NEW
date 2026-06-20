"use client";
import MarketLanding from "@/components/landingPage/MarketLanding";
import { MARKET_PAGES } from "@/data/marketPages";

export default function StockTradingJournal() {
  return <MarketLanding cfg={MARKET_PAGES["stock-trading-journal"]} />;
}
