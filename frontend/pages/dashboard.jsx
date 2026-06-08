"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Cookies from "js-cookie";
import {
  ArrowUpDown,
  BookOpen,
  Globe,
  History,
  LayoutGrid,
  Share2,
} from "lucide-react";

import {
  Sidebar,
  Button,
  AnimatedPanel,
  LogTradeModal,
  SettingsPanel,
  ImportExportPanel,
  BlogsPanel,
  TradesLogPanel,
  JournalsModal,
  OverviewPanel,
  MarketsPanel,
  SharePanel,
} from "@/components/revampV2";

import Pricing from "@/components/dashboard/PricingModal";
import FullPageLoader from "@/components/ui/FullPageLoader";

import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import { getBaseCurrency, getRate, convertTrade } from "@/utils/fx";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/* Dummy trades shown until real data is connected / when journal is empty */
const DUMMY_TRADES = [
  { _id: "d1", symbol: "BTC/USDT", direction: "long", pnl: 1250, totalQuantity: 0.5, openTime: "2026-06-01T07:10:00Z", closeTime: "2026-06-01T10:30:00Z", entryPrice: 61240, exitPrice: 63820, rr: 2.4, source: "auto", images: [1, 2, 3] },
  { _id: "d2", symbol: "ETH/USDT", direction: "short", pnl: -420, totalQuantity: 4, openTime: "2026-06-02T11:40:00Z", closeTime: "2026-06-02T14:00:00Z", entryPrice: 3420, exitPrice: 3530, rr: 1.2, source: "manual", images: [1, 2] },
  { _id: "d3", symbol: "SOL/USDT", direction: "long", pnl: 610, totalQuantity: 30, closeTime: "2026-06-02T18:45:00Z", entryPrice: 182.4, exitPrice: 202.7, rr: 1.5, source: "manual", images: [1] },
  { _id: "d4", symbol: "BTC/USDT", direction: "long", pnl: 980, totalQuantity: 0.3, closeTime: "2026-06-03T09:15:00Z", entryPrice: 60400, exitPrice: 63670, rr: 2.0, source: "auto", images: [] },
  { _id: "d5", symbol: "XAU/USD", direction: "short", pnl: -260, totalQuantity: 2, closeTime: "2026-06-04T11:20:00Z", entryPrice: 2380, exitPrice: 2510, rr: 1.1, source: "manual", images: [1, 2] },
  { _id: "d6", symbol: "ETH/USDT", direction: "long", pnl: 1740, totalQuantity: 6, openTime: "2026-06-05T12:20:00Z", closeTime: "2026-06-05T16:05:00Z", entryPrice: 3310, exitPrice: 3600, rr: 3.0, source: "auto", images: [1] },
  { _id: "d7", symbol: "NIFTY", direction: "long", pnl: 330, totalQuantity: 50, closeTime: "2026-06-05T19:40:00Z", entryPrice: 24180, exitPrice: 24186.6, rr: 2.2, source: "manual", images: [] },
  { _id: "d8", symbol: "BTC/USDT", direction: "short", pnl: -150, totalQuantity: 0.2, closeTime: "2026-06-06T08:55:00Z", entryPrice: 63900, exitPrice: 64650, rr: 1.0, source: "auto", images: [1] },
];

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "trades", label: "Trades log", icon: History },
  { id: "blogs", label: "Learn & News", icon: BookOpen },
  { id: "markets", label: "Markets", icon: Globe },
  { id: "share", label: "Share logs", icon: Share2 },
  { id: "importexport", label: "Import / Export", icon: ArrowUpDown },
];

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showLogTrade, setShowLogTrade] = useState(false);
  const [importSignal, setImportSignal] = useState(0);

  const [userData, setUserData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accountTrades, setAccountTrades] = useState([]);
  const [currentBalances, setCurrentBalances] = useState({});
  const [accountSymbols, setAccountSymbols] = useState({});

  /* ---------- data loading (same flow as old dashboard-web) ---------- */
  useEffect(() => {
    const loadEverything = async () => {
      setLoading(true);
      try {
        const userRes = await axios.get(`${API_BASE}/api/auth/user-info`, {
          withCredentials: true,
        });
        const { userData } = userRes.data;
        setUserData(userData);

        if (userData) {
          await saveToIndexedDB("user-data", userData);
          if (userData?.plans) await saveToIndexedDB("plans", userData.plans);
          if (userData?.name) localStorage.setItem("userName", userData.name);
        }

        const result = await fetchAccountsAndTrades();
        if (result.redirectToLogin) {
          router.push("/login");
          return;
        }

        setAccounts(result.accounts || []);
        setAccountSymbols(result.accountSymbols || {});
        setCurrentBalances(result.currentBalances || {});
        setAccountTrades(result.trades || []);
      } catch (err) {
        console.error("Load error:", err);
        const cachedUser = await getFromIndexedDB("user-data");
        setUserData(cachedUser);
        if (cachedUser) {
          const result = await fetchAccountsAndTrades();
          setAccounts(result.accounts || []);
          setAccountTrades(result.trades || []);
        }
      } finally {
        setLoading(false);
      }
    };

    loadEverything();
  }, [router]);

  /* ---------- verification param ---------- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("isVerified") === "yes") {
      Cookies.set("isVerified", "yes", {
        path: "/",
        sameSite: "Strict",
        expires: 365000,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  /* ---------- derived data ---------- */
  const selectedAccountId = Cookies.get("accountId");
  const currentAccount =
    accounts.find((a) => a._id === selectedAccountId) || accounts[0];

  const selectedTrades = useMemo(() => {
    if (!currentAccount) return [];
    return accountTrades.filter((t) => t.accountId === currentAccount._id);
  }, [accountTrades, currentAccount]);

  const usingDummy = selectedTrades.length === 0;
  const rawTrades = usingDummy ? DUMMY_TRADES : selectedTrades;

  /* ---------- base currency conversion (Settings → Apply) ---------- */
  const [baseCurrency, setBaseCurrencyState] = useState("USD");
  const [fxRate, setFxRate] = useState(1);

  useEffect(() => {
    const applyCurrency = async (cur) => {
      setBaseCurrencyState(cur);
      setFxRate(await getRate(cur));
    };
    applyCurrency(getBaseCurrency());
    const onChange = (e) => applyCurrency(e.detail || getBaseCurrency());
    window.addEventListener("jx-currency-changed", onChange);
    return () => window.removeEventListener("jx-currency-changed", onChange);
  }, []);

  const trades = useMemo(
    () => (fxRate === 1 ? rawTrades : rawTrades.map((t) => convertTrade(t, fxRate))),
    [rawTrades, fxRate],
  );

  const currencySymbol = getCurrencySymbol(baseCurrency.toLowerCase());

  const isProMonthly =
    userData?.subscription?.plan === "pro" &&
    userData?.subscription?.type === "one-time";

  if (loading) return <FullPageLoader />;

  /* ---------- overview tab content (Figma "Dashboard / Desktop") ---------- */
  const overview = (
    <OverviewPanel
      trades={trades}
      currencySymbol={currencySymbol}
      userName={userData?.name}
      usingDummy={usingDummy}
      startingBalance={
        usingDummy
          ? 10000
          : (currentAccount?.startingBalance?.amount || 0) * fxRate
      }
      onLogTrade={() => setShowLogTrade(true)}
      onImport={() => {
        setActiveTab("trades");
        setImportSignal((s) => s + 1); // opens the import modal in Trades log
      }}
    />
  );

  const TAB_CONTENT = {
    overview,
    trades: (
      <TradesLogPanel
        trades={trades}
        currencySymbol={currencySymbol}
        usingDummy={usingDummy}
        onAddTrade={() => setShowLogTrade(true)}
        openImportSignal={importSignal}
        onTradesAdded={(newTrades) =>
          setAccountTrades((prev) => [...prev, ...(newTrades || [])])
        }
        onTradesDeleted={(ids) =>
          setAccountTrades((prev) => prev.filter((t) => !ids.includes(t._id)))
        }
        onTradeUpdated={(trade) =>
          setAccountTrades((prev) =>
            prev.map((t) => (t._id === trade._id ? { ...t, ...trade } : t)),
          )
        }
      />
    ),
    blogs: <BlogsPanel />,
    markets: <MarketsPanel trades={trades} />,
    share: (
      <SharePanel
        trades={trades}
        accountName={currentAccount?.name || "My journal"}
        currencySymbol={currencySymbol}
      />
    ),
    importexport: <ImportExportPanel trades={trades} />,
    settings: <SettingsPanel user={userData} />,
    pricingpage: <Pricing />,
  };

  return (
    <div className="jx-shell">
      <Sidebar
        items={NAV_ITEMS}
        active={activeTab}
        onChange={setActiveTab}
        accountName={currentAccount?.name}
        onAccountSwitch={() => setShowSwitchModal(true)}
        onLogTrade={() => setShowLogTrade(true)}
        user={userData}
        onProfile={() => setActiveTab("settings")}
        showUpgrade={!isProMonthly}
        onUpgrade={() => setActiveTab("pricingpage")}
      />

      <main className="jx-shell__main">
        {/* Mobile nav strip (sidebar hidden < 768px) */}
        <div className="jx-mobile-nav">
          {[...NAV_ITEMS, { id: "settings", label: "Profile" }].map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={activeTab === item.id ? "primary" : "secondary"}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <AnimatedPanel id={activeTab}>
          {TAB_CONTENT[activeTab] || overview}
        </AnimatedPanel>
      </main>

      {/* Log trade modal (Quick log / Detailed) — blurred backdrop */}
      <LogTradeModal
        open={showLogTrade}
        onClose={() => setShowLogTrade(false)}
        onSaved={(trade) => trade && setAccountTrades((prev) => [...prev, trade])}
      />

      <JournalsModal
        open={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
        accounts={accounts}
        trades={accountTrades}
        currentBalances={currentBalances}
        currentAccountId={currentAccount?._id}
      />
    </div>
  );
}
