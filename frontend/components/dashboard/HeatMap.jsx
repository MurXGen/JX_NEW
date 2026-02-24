import MarketNews from "@/components/Tabs/MarketNews";
import BottomBar from "@/components/Trades/BottomBar";

export default function EventsWebPage() {
  return (
    <div className="flexClm gap_24 pad_16">
      <MarketNews />
      <BottomBar />
    </div>
  );
}
