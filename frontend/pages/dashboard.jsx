"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Cookies from "js-cookie";
import {
  ArrowRightLeft,
  ArrowUpDown,
  BookOpen,
  Moon,
  Sun,
  Globe,
  History,
  LayoutGrid,
  Share2,
} from "lucide-react";

import {
  Sidebar,
  Button,
  BottomBar,
  AnimatedPanel,
  LogTradeModal,
  SettingsPanel,
  ImportExportPanel,
  BlogsPanel,
  ActivitiesPanel,
  TradesLogPanel,
  JournalsModal,
  SupportModal,
  PlanBanner,
  OnboardingModal,
  UpgradePanel,
  OverviewPanel,
  MarketsPanel,
  SharePanel,
} from "@/components/revampV2";

import FullPageLoader from "@/components/ui/FullPageLoader";
import { MobileInstallBanner } from "@/components/pwa/InstallPwa";

import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import { getBaseCurrency, getRate, convertTrade } from "@/utils/fx";
import { connectDrive, warmDriveConnection, isDriveConnected, isDriveConfigured } from "@/utils/driveBackup";

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
  { id: "blogs", label: "Learn & Focus", icon: BookOpen },
  { id: "markets", label: "Markets", icon: Globe },
  { id: "share", label: "Share logs", icon: Share2 },
  { id: "importexport", label: "Import / Export", icon: ArrowUpDown },
];

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loggedIn, setLoggedIn] = useState(true); // assume true to avoid flicker; set on mount

  useEffect(() => {
    setLoggedIn(Cookies.get("isVerified") === "yes");
  }, []);
  const [showLogTrade, setShowLogTrade] = useState(false);
  const [importSignal, setImportSignal] = useState(0);
  const [, setThemeTick] = useState(0); // re-render the mobile theme icon

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
        // a successful user-info means we're authenticated → enable normal
        // (non-guest) interaction so in-app modals/buttons aren't intercepted.
        if (userData) setLoggedIn(true);

        if (userData) {
          await saveToIndexedDB("user-data", userData);
          if (userData?.plans) await saveToIndexedDB("plans", userData.plans);
          if (userData?.name) localStorage.setItem("userName", userData.name);
          // silently warm the Drive token so background auto-backups work
          // without any popup for already-connected users.
          if (isDriveConfigured()) warmDriveConnection();
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
        const status = err?.response?.status;
        // 401 (no session) / 404 (stale userId cookie → user not in DB) just
        // means "not logged in" → run the dashboard in guest/demo mode.
        if (status === 401 || status === 404) {
          try { Cookies.remove("isVerified"); } catch {}
          setLoggedIn(false);
        } else {
          console.warn("Dashboard load failed, using cache:", err?.message);
        }
        try {
          const cachedUser = await getFromIndexedDB("user-data");
          if (cachedUser) {
            setUserData(cachedUser);
            const result = await fetchAccountsAndTrades();
            setAccounts(result.accounts || []);
            setAccountTrades(result.trades || []);
          }
        } catch (e) {
          console.warn("Cache fallback failed:", e?.message);
        }
      } finally {
        setLoading(false);
      }
    };

    loadEverything();
  }, [router]);

  /* ---------- verification param + onboarding trigger ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("isVerified") === "yes") {
      Cookies.set("isVerified", "yes", {
        path: "/",
        sameSite: "Strict",
        expires: 365000,
      });
      // mark as logged in immediately so the guest click-guard doesn't
      // intercept onboarding (Next/Finish) right after signup.
      setLoggedIn(true);
      // brand-new Google signup → mark for onboarding
      if (params.get("newUser") === "1") {
        try { localStorage.setItem("jx-show-onboarding", "1"); } catch {}
      }
      // Fresh login/register: connect Google Drive now (alongside auth) so
      // backups never prompt later. If already connected, just refresh the
      // token silently. (If the browser blocks this popup, the first manual
      // Backup click — a user gesture — will connect instead.)
      if (isDriveConfigured()) {
        if (isDriveConnected()) warmDriveConnection();
        else connectDrive().catch(() => {});
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // Onboarding shows ONLY right after a registration (manual OTP verify or
    // Google new-user), never on a normal login. The marker is consumed once.
    if (localStorage.getItem("jx-show-onboarding") === "1") {
      setShowOnboarding(true);
      try { localStorage.removeItem("jx-show-onboarding"); } catch {}
    }
  }, []);

  /* ---------- derived data ---------- */
  const selectedAccountId =
    Cookies.get("accountId") ||
    (typeof window !== "undefined" && localStorage.getItem("jx-account-id"));
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
      const c = (cur || "USD").toUpperCase();
      setBaseCurrencyState(c);
      setFxRate(await getRate(c));
    };
    // The active journal's currency drives the dashboard; persist it so the
    // Settings → Trading preferences "Base currency" reflects the same value.
    const journalCur = currentAccount?.currency;
    if (journalCur) {
      try { localStorage.setItem("jx-base-currency", journalCur.toUpperCase()); } catch {}
      applyCurrency(journalCur);
    } else {
      applyCurrency(getBaseCurrency());
    }
    const onChange = (e) => applyCurrency(e.detail || getBaseCurrency());
    window.addEventListener("jx-currency-changed", onChange);
    return () => window.removeEventListener("jx-currency-changed", onChange);
  }, [currentAccount?._id, currentAccount?.currency]);

  const trades = useMemo(
    () => (fxRate === 1 ? rawTrades : rawTrades.map((t) => convertTrade(t, fxRate))),
    [rawTrades, fxRate],
  );

  const currencySymbol = getCurrencySymbol(baseCurrency.toLowerCase());

  const isProMonthly =
    userData?.subscription?.plan === "pro" &&
    userData?.subscription?.type === "one-time";

  // Only nudge to upgrade when a dated plan is within 5 days of ending
  // (covers trial/subscription about to lapse, and already-expired). Lifetime
  // and a healthy plan with plenty of time left show no CTA.
  const _sub = userData?.subscription || {};
  const _isLifetime = (_sub.plan || "").toLowerCase().includes("lifetime");
  const _daysLeft = _sub.expiresAt
    ? Math.ceil((new Date(_sub.expiresAt).getTime() - Date.now()) / 864e5)
    : null;
  const needsUpgrade = !_isLifetime && _daysLeft != null && _daysLeft <= 5;

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
        onOpenTab={setActiveTab}
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
    blogs: <ActivitiesPanel />,
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
    pricingpage: <UpgradePanel currentPlan={userData?.subscription?.plan} />,
  };

  return (
    <div
      className="jx-shell"
      onClickCapture={(e) => {
        // Guests can VIEW the demo dashboard, but any interaction routes them
        // to login. Logged-in users get the normal flow.
        if (loggedIn) return;
        const el = e.target.closest(
          "button, a, input, select, textarea, [role='button']",
        );
        if (!el) return;
        e.preventDefault();
        e.stopPropagation();
        router.push("/login?redirect=/dashboard");
      }}
    >
      <Sidebar
        items={NAV_ITEMS}
        active={activeTab}
        onChange={setActiveTab}
        accountName={currentAccount?.name}
        onAccountSwitch={() => setShowSwitchModal(true)}
        onLogTrade={() => setShowLogTrade(true)}
        user={userData}
        onProfile={() => setActiveTab("settings")}
        onSupport={() => setShowSupport(true)}
        showUpgrade={needsUpgrade}
        onUpgrade={() => setActiveTab("pricingpage")}
      />

      <main className="jx-shell__main">
        {/* Mobile-only install prompt (desktop uses the sidebar item) */}
        <div className="jx-pwa-banner-wrap">
          <MobileInstallBanner />
        </div>

        {/* Mobile-only top bar: journal switcher + theme toggle (sidebar hidden < 768px) */}
        <div className="jx-mobile-journalrow" style={{ display: "none", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
          <button
            type="button"
            className="jx-mobile-journalbar"
            style={{ flex: 1, minWidth: 0, marginBottom: 0 }}
            onClick={() => setShowSwitchModal(true)}
          >
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>Journal</span>
              <span style={{ font: "var(--text-body-md)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "55vw" }}>
                {currentAccount?.name || "Select journal"}
              </span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--yellow-600)", font: "var(--text-small)", fontWeight: 600 }}>
              <ArrowRightLeft size={16} /> Switch
            </span>
          </button>
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => {
              const next = (localStorage.getItem("theme") || "dark") === "dark" ? "light" : "dark";
              localStorage.setItem("theme", next);
              document.documentElement.setAttribute("data-theme", next);
              document.body.setAttribute("data-theme", next);
              document.documentElement.classList.toggle("dark", next === "dark");
              setThemeTick((t) => t + 1);
            }}
            style={{
              flexShrink: 0, width: 52, display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--color-bg-surface)", border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)", cursor: "pointer", color: "var(--color-text-primary)",
            }}
          >
            {(typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light") ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>

        <PlanBanner
          subscription={userData?.subscription}
          onUpgrade={() => setActiveTab("pricingpage")}
        />

        <AnimatedPanel id={activeTab}>
          {TAB_CONTENT[activeTab] || overview}
        </AnimatedPanel>
      </main>

      {/* Mobile bottom navigation (hidden on desktop) */}
      <BottomBar
        active={activeTab}
        onChange={setActiveTab}
        onLogTrade={() => setShowLogTrade(true)}
        onSupport={() => setShowSupport(true)}
        user={userData}
      />

      {/* Log trade modal (Quick log / Detailed) — blurred backdrop */}
      <LogTradeModal
        open={showLogTrade}
        onClose={() => setShowLogTrade(false)}
        currentAccountId={currentAccount?._id}
        onNoJournal={() => setShowSwitchModal(true)}
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

      <SupportModal
        open={showSupport}
        onClose={() => setShowSupport(false)}
        user={userData}
        plan={userData?.subscription?.plan || "free"}
      />

      <OnboardingModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onTrialActivated={async (sub) => {
          if (!sub) return;
          setUserData((u) => ({ ...u, subscription: { ...(u?.subscription || {}), ...sub } }));
          // persist to IndexedDB so Settings + reload-fallback read the trial
          try {
            const ud = (await getFromIndexedDB("user-data")) || {};
            ud.subscription = { ...(ud.subscription || {}), ...sub };
            await saveToIndexedDB("user-data", ud);
            window.dispatchEvent(new CustomEvent("jx-sub-changed"));
          } catch (e) {
            console.error("trial cache update failed:", e);
          }
        }}
      />
    </div>
  );
}
