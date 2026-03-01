import MarketNews from "@/components/Tabs/MarketNews";
import BottomBar from "@/components/Trades/BottomBar";

export default function EventsPage() {
  return (
    <div className="flexClm gap_24">
      <MarketNews />
      <BottomBar />
    </div>
  );
}
