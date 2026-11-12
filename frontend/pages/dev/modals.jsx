/* Dev-only harness to open the Log trade and Import trades modals without
   signing in. Nothing is saved unless you press the final submit buttons.
   Returns 404 in production builds. */
import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import FullPageLoader from "@/components/ui/FullPageLoader";
import { ActivitiesPanel, ImportTradesModal, JournalsModal, LogTradeModal, SupportModal, ToolsPanel, TradesLogPanel } from "@/components/revampV2";
import ExchangeSyncModal from "@/components/revampV2/ExchangeSyncModal";
import { buildSampleTrades } from "@/components/app/sampleTrades";

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true };
  return { props: {} };
}

export default function ModalsDemo() {
  const { query } = useRouter();
  const [which, setWhich] = useState(null);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    if (query.open) setWhich(String(query.open));
  }, [query.open]);

  if (which === "loader") return <FullPageLoader />;
  if (which === "trades") {
    return (
      <div data-theme="dark" style={{ minHeight: "100vh", background: "#000", padding: 24 }}>
        <TradesLogPanel v2 usingDummy trades={buildSampleTrades()} currencySymbol="$" />
      </div>
    );
  }
  if (which === "learn") {
    return (
      <div data-theme="dark" style={{ minHeight: "100vh", background: "#000", padding: 24 }}>
        <ActivitiesPanel />
      </div>
    );
  }
  if (which === "tools") {
    return (
      <div data-theme="dark" style={{ minHeight: "100vh", background: "#000", padding: 24 }}>
        <ToolsPanel currencySymbol="$" />
      </div>
    );
  }
  const btn = { padding: "9px 16px", borderRadius: 9, border: "1px solid rgba(255,255,255,.15)", background: "#0e0e10", color: "#fff", cursor: "pointer", font: "600 14px Poppins" };
  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#f5f6f8", fontFamily: "Poppins, sans-serif", display: "grid", placeItems: "center" }}>
      <Head><title>Modals demo</title><meta name="robots" content="noindex" /></Head>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: 16 }}>
        <button type="button" style={btn} onClick={() => setWhich("log")}>Log trade</button>
        <button type="button" style={btn} onClick={() => setWhich("import")}>Import trades</button>
        <button type="button" style={btn} onClick={() => setWhich("journals")}>Journals</button>
        <button type="button" style={btn} onClick={() => setWhich("tools")}>Tools</button>
        <button type="button" style={btn} onClick={() => setWhich("learn")}>Learn</button>
        <button type="button" style={btn} onClick={() => setWhich("support")}>Support</button>
        <button type="button" style={btn} onClick={() => setWhich("loader")}>Loader</button>
        <button type="button" style={btn} onClick={() => setWhich("trades")}>Trades</button>
        <button type="button" style={btn} onClick={() => setWhich("exchange")}>Exchange</button>
      </div>
      <LogTradeModal
        open={which === "log"}
        onClose={() => setWhich(null)}
        accounts={[{ _id: "demo-journal", name: "Default Journal", currency: "USD" }]}
        currentAccountId="demo-journal"
        currencySymbol="$"
      />
      <ExchangeSyncModal open={which === "exchange"} exchange="binance" isPro status={{ connected: true, keyHint: "a1F9", lastSyncAt: Date.now() - 36e5, markets: ["usdm"], window: 90 }} onClose={() => setWhich(null)} />
      <ImportTradesModal open={which === "import"} onClose={() => setWhich(null)} />
      <SupportModal open={which === "support"} onClose={() => setWhich(null)} user={{ name: "Demo Trader", email: "demo@example.com" }} />
      <JournalsModal
        open={which === "journals"}
        onClose={() => setWhich(null)}
        accounts={[
          { _id: "demo-journal", name: "Default Journal", currency: "USDT", accountType: "spot", startingBalance: { amount: 30 } },
          { _id: "demo-2", name: "FTMO 100k", currency: "USD", accountType: "futures", startingBalance: { amount: 100000 } },
        ]}
        currentAccountId="demo-journal"
      />
    </div>
  );
}
