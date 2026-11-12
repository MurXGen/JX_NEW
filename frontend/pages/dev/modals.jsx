/* Dev-only harness to open the Log trade and Import trades modals without
   signing in. Nothing is saved unless you press the final submit buttons.
   Returns 404 in production builds. */
import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import FullPageLoader from "@/components/ui/FullPageLoader";
import { MarketsPanel, SharePanel, ImportExportPanel, ActivitiesPanel, ImportTradesModal, JournalsModal, LogTradeModal, SupportModal, ToolsPanel, TradesLogPanel } from "@/components/revampV2";
import ExchangeSyncModal from "@/components/revampV2/ExchangeSyncModal";
import SettingsPanel from "@/components/revampV2/SettingsPanel";
import UpgradeSheet from "@/components/revampV2/UpgradeSheet";
import DowngradePlan from "@/components/revampV2/DowngradePlan";
import Overview from "@/components/app/Overview";
import AppSidebar from "@/components/app/AppSidebar";
import UpgradeModal, { PlanBanner, planState } from "@/components/app/UpgradeModal";
import { buildSampleTrades } from "@/components/app/sampleTrades";

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true };
  return { props: {} };
}

export default function ModalsDemo() {
  const { query } = useRouter();
  // ?theme=light previews every view in light mode
  const theme = query.theme === "light" ? "light" : "dark";
  const pageBg = theme === "light" ? "#f4f5f7" : "#000";
  const [which, setWhich] = useState(null);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (query.open) setWhich(String(query.open));
  }, [query.open, theme]);

  if (which === "downgrade") {
    const exp = new Date(Date.now() + 23 * 864e5).toISOString();
    return (
      <div style={{ maxWidth: 640, margin: "40px auto", padding: 16, display: "flex", flexDirection: "column", gap: 24 }}>
        <DowngradePlan sub={{ plan: "pro", status: "active", type: "recurring", source: "paddle", expiresAt: exp }} />
        <DowngradePlan sub={{ plan: "pro", status: "active", type: "recurring", source: "paddle", expiresAt: exp, cancelAt: exp }} />
        <DowngradePlan sub={{ plan: "pro", status: "active", type: "one-time", source: "crypto", expiresAt: exp }} />
      </div>
    );
  }
  if (which === "loader") return <FullPageLoader />;
  if (which === "trades") {
    return (
      <div data-theme={theme} style={{ minHeight: "100vh", background: pageBg, padding: 24 }}>
        <TradesLogPanel v2 usingDummy trades={buildSampleTrades()} currencySymbol="$" />
      </div>
    );
  }
  if (which === "fx") {
    // same sample trades + an INR-like rate in both views; totals must agree
    const t = buildSampleTrades();
    return (
      <div data-theme={theme} style={{ minHeight: "100vh", background: pageBg, padding: 16 }}>
        <Overview trades={t} usingDummy fxRate={90} currencySymbol="₹" />
        {/* small starting balance → the "capital doubled" state of the Goals card */}
        <div id="fx-doubled"><Overview trades={t} fxRate={1} currencySymbol="$" startingBalance={300} /></div>
        <TradesLogPanel v2 usingDummy trades={t} fxRate={90} currencySymbol="₹" />
      </div>
    );
  }
  if (which === "upgrade") {
    // plan ending in 2 days + the trader's sample trades
    const st = planState({ plan: "pro", status: "active", expiresAt: new Date(Date.now() + 1.5 * 864e5).toISOString() });
    return (
      <div data-theme={theme} style={{ minHeight: "100vh", background: pageBg, padding: 16 }}>
        <PlanBanner state={st} onUpgrade={() => setWhich("upgrade-open")} />
      </div>
    );
  }
  if (which === "upgrade-open") {
    const st = planState({ plan: "pro", status: "active", expiresAt: new Date(Date.now() + 1.5 * 864e5).toISOString() });
    return <UpgradeModal open onClose={() => setWhich("upgrade")} trades={buildSampleTrades()} currencySymbol="$" displayCurrency="USD" state={planState({ plan: "free" })} reason={{ title: "Unlock your full history", sub: "Free shows the last 30 days of trades. Upgrade to Pro to see everything." }} />;
  }
  if (which === "share" || which === "importexport") {
    const t = buildSampleTrades();
    return (
      <div data-theme={theme} style={{ minHeight: "100vh", background: pageBg, padding: 16 }}>
        {which === "share" ? <SharePanel trades={t} accountName="Demo journal" currencySymbol="$" /> : <ImportExportPanel trades={t} />}
      </div>
    );
  }
  if (which === "sidebar") {
    const cards = [
      { kind: "free", used: 6, limit: 20, resets: "1 Dec" },
      { kind: "free", used: 17, limit: 20, resets: "1 Dec" },
      { kind: "free", used: 20, limit: 20, resets: "1 Dec" },
      { kind: "expiring", daysLeft: 2 },
    ];
    return (
      <div data-theme={theme} style={{ display: "flex", gap: 12, minHeight: "100vh", background: pageBg, overflowX: "auto" }}>
        {cards.map((c, i) => (
          <AppSidebar key={i} items={[]} active="overview" onChange={() => {}} accountName="Default Journal" onLogTrade={() => {}} user={{ name: "Demo Trader", email: "demo@example.com" }} onProfile={() => {}} onSupport={() => {}} planCard={c} onUpgrade={() => alert("open upgrade")} />
        ))}
      </div>
    );
  }
  if (which === "markets") {
    return (
      <div data-theme={theme} style={{ minHeight: "100vh", background: pageBg, padding: 16 }}>
        <MarketsPanel trades={buildSampleTrades()} currencySymbol="$" />
      </div>
    );
  }
  if (which === "settings") {
    return (
      <div data-theme={theme} style={{ minHeight: "100vh", background: pageBg, padding: 16 }}>
        <SettingsPanel user={{ name: "Demo Trader", email: "demo@example.com" }} onNavigate={() => {}} onSupport={() => {}} onSwitchJournal={() => {}} />
      </div>
    );
  }
  if (which === "learn") {
    return (
      <div data-theme={theme} style={{ minHeight: "100vh", background: pageBg, padding: 24 }}>
        <ActivitiesPanel />
      </div>
    );
  }
  if (which === "tools") {
    return (
      <div data-theme={theme} style={{ minHeight: "100vh", background: pageBg, padding: 24 }}>
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
        <button type="button" style={btn} onClick={() => setWhich("settings")}>Settings</button>
        <button type="button" style={btn} onClick={() => setWhich("fx")}>FX check</button>
        <button type="button" style={btn} onClick={() => setWhich("upgrade")}>Upgrade</button>
        <button type="button" style={btn} onClick={() => setWhich("markets")}>Markets</button>
        <button type="button" style={btn} onClick={() => setWhich("share")}>Share</button>
        <button type="button" style={btn} onClick={() => setWhich("importexport")}>Import/Export</button>
        <button type="button" style={btn} onClick={() => setWhich("sheet")}>Upgrade sheet</button>
        <button type="button" style={btn} onClick={() => setWhich("sidebar")}>Sidebar</button>
        <button type="button" style={btn} onClick={() => setWhich("downgrade")}>Downgrade</button>
      </div>
      <LogTradeModal
        open={which === "log"}
        onClose={() => setWhich(null)}
        accounts={[{ _id: "demo-journal", name: "Default Journal", currency: "USD" }]}
        currentAccountId="demo-journal"
        currencySymbol="$"
      />
      <ExchangeSyncModal open={which === "exchange"} exchange="binance" isPro status={{ connected: true, keyHint: "a1F9", lastSyncAt: Date.now() - 36e5, markets: ["usdm"], window: 90 }} onClose={() => setWhich(null)} />
      <UpgradeSheet open={which === "sheet"} onClose={() => setWhich(null)} title="Unlock your full history" reason="Free shows the last 30 days of trades. Upgrade to Pro to see everything." />
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
