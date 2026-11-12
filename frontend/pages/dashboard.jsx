"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Calculator,
  ChevronLeft,
} from "lucide-react";

import {
  Button,
  BottomBar,
  AnimatedPanel,
  LogTradeModal,
  SettingsModal,
  ImportExportPanel,
  BlogsPanel,
  ActivitiesPanel,
  TradesLogPanel,
  JournalsModal,
  SupportModal,
  PlanBanner,
  UpgradePanel,
  MarketsPanel,
  SharePanel,
  SettingsPanel,
  ToolsPanel,
} from "@/components/revampV2";

import FullPageLoader from "@/components/ui/FullPageLoader";
import FirstRunFlow from "@/components/authFlow/FirstRunFlow";
import AppSidebar from "@/components/app/AppSidebar";
import Overview from "@/components/app/Overview";
import { buildSampleTrades } from "@/components/app/sampleTrades";
import { MobileInstallBanner } from "@/components/pwa/InstallPwa";
import ShortcutsHelp from "@/components/revampV2/ShortcutsHelp";

import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import { convertTrade, getConversionFactor } from "@/utils/fx";
import UpgradeModal, { PlanBanner as UpgradeBanner, UpgradedToast, planState } from "@/components/app/UpgradeModal";
import { celebrate, takeJustUpgraded } from "@/components/app/celebrate";
import { getPlanRules } from "@/utils/planRestrictions";
import { connectDrive, warmDriveConnection, isDriveConnected, isDriveConfigured } from "@/utils/driveBackup";
import { fetchUserInfo } from "@/utils/userInfo";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/* Sample journal shown until real data is connected / when journal is empty
   (same seeded data the Overview uses, so every tab tells one story) */
const DUMMY_TRADES = buildSampleTrades();

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "trades", label: "Trades log", icon: History },
  { id: "blogs", label: "Learn & Focus", icon: BookOpen },
  { id: "markets", label: "Markets", icon: Globe },
  { id: "tools", label: "Tools", icon: Calculator },
  { id: "share", label: "Share logs", icon: Share2 },
  { id: "importexport", label: "Import / Export", icon: ArrowUpDown },
];

const SETTINGS_SUBPAGES = {
  tools: "Trading calculators",
  blogs: "Learn & Focus",
  share: "Share logs",
  importexport: "Import & Export",
};

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  // set when the success screen sends the user here after paying
  const [justUpgraded, setJustUpgraded] = useState(null);
  /* keep the active section (and Support) in the URL so deep-links, refreshes
     and the browser/phone Back button work — mirrors the ?settings=<id>
     behaviour inside Settings. */
  const navTab = (id) => {
    setActiveTab(id);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (id && id !== "overview") url.searchParams.set("view", id);
    else url.searchParams.delete("view");
    if (id !== "settings") url.searchParams.delete("settings"); // drop sub-section
    url.searchParams.delete("support");
    window.history.pushState({ jxView: id }, "", url.toString());
  };
  // pages reached from the mobile Settings hub, with their header title
  const fromSettings = useRef(false);
  const backToSettings = () => {
    // return the way we came so the phone's Back stack stays clean
    if (fromSettings.current && typeof window !== "undefined" && window.history.length > 1) {
      fromSettings.current = false;
      window.history.back();
    } else {
      navTab("settings");
    }
  };
  const openSupport = () => {
    setShowSupport(true);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("support", "1");
    window.history.pushState({ jxSupport: 1 }, "", url.toString());
  };
  const closeSupport = () => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("support")) {
      window.history.back();
    } else {
      setShowSupport(false);
    }
  };
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const apply = () => {
      const p = new URLSearchParams(window.location.search);
      setActiveTab(p.get("view") || "overview");
      setShowSupport(!!p.get("support"));
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [journalEditId, setJournalEditId] = useState(null); // deep-link to a journal's edit form
  const [journalsView, setJournalsView] = useState("list"); // 'list' | 'create'
  const [showSupport, setShowSupport] = useState(false);
  // first-run onboarding: "journal" → "trade" → "insights" (null = not shown)
  const [firstRun, setFirstRunState] = useState(null);
  const setFirstRun = (s) => {
    setFirstRunState(s);
    try {
      if (s) localStorage.setItem("jx-firstrun", s);
      else { localStorage.removeItem("jx-firstrun"); localStorage.setItem("jx-onboarded", "1"); }
    } catch {}
  };
  const [loggedIn, setLoggedIn] = useState(true); // assume true to avoid flicker; set on mount

  useEffect(() => {
    setLoggedIn(Cookies.get("isVerified") === "yes");
  }, []);

  // mobile? → Settings renders as an in-page tab (bottom bar visible) instead
  // of a covering modal
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 760px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  const [showLogTrade, setShowLogTrade] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [importSignal, setImportSignal] = useState(0);
  const [, setThemeTick] = useState(0); // re-render the mobile theme icon

  /* ---------- global keyboard shortcuts ----------
     ? → help · L → log trade · G then O/T/M → navigate.
     Ignored while typing in a field; letter keys pause while any dialog is open. */
  useEffect(() => {
    const isTyping = (el) =>
      !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
    let gAt = 0;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      if (e.key === "?") { e.preventDefault(); setShowShortcuts((v) => !v); return; }
      if (typeof document !== "undefined" && document.querySelector(".jx-modal-overlay")) return;
      const k = e.key.toLowerCase();
      const now = Date.now();
      if (k === "g") { gAt = now; return; }
      if (gAt && now - gAt < 900) {
        gAt = 0;
        if (k === "o") { navTab("overview"); return; }
        if (k === "t") { navTab("trades"); return; }
        if (k === "m") { navTab("markets"); return; }
      }
      if (k === "l") { e.preventDefault(); setShowLogTrade(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [userData, setUserData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accountTrades, setAccountTrades] = useState([]);
  const [currentBalances, setCurrentBalances] = useState({});
  const [accountSymbols, setAccountSymbols] = useState({});

  /* ---------- data loading (same flow as old dashboard-web) ---------- */
  const loadedOnceRef = useRef(false);
  useEffect(() => {
    // run the full load only once per mount, navigating between in-app tabs
    // (e.g. opening Settings) must never re-trigger the whole reload.
    if (loadedOnceRef.current) return;
    loadedOnceRef.current = true;
    const loadEverything = async () => {
      setLoading(true);
      try {
        const userRes = await fetchUserInfo();
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

        // background: auto-sync connected exchanges (Binance/Bybit), then refresh
        // trades if anything new came in. Fire-and-forget — never blocks the UI.
        if (userData) {
          (async () => {
            try {
              const st = await axios.get(`${API_BASE}/api/integrations/exchange/status`, { withCredentials: true });
              if (!st.data?.pro) return;
              const ex = st.data.exchanges || {};
              let importedAny = 0;
              for (const id of Object.keys(ex)) {
                if (ex[id]?.connected && ex[id]?.autoSync !== false) {
                  try {
                    const r = await axios.post(`${API_BASE}/api/integrations/exchange/${id}/sync`, {}, { withCredentials: true });
                    importedAny += r.data?.imported || 0;
                  } catch { /* one exchange failing shouldn't stop others */ }
                }
              }
              if (importedAny > 0) {
                const fresh = await fetchAccountsAndTrades();
                setAccountTrades(fresh.trades || []);
              }
            } catch { /* not pro / offline — skip silently */ }
          })();
        }
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
      // Backup click, a user gesture, will connect instead.)
      if (isDriveConfigured()) {
        if (isDriveConnected()) warmDriveConnection();
        else connectDrive().catch(() => {});
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // Onboarding shows ONLY right after a registration (manual OTP verify or
    // Google new-user), never on a normal login. The marker is consumed once.
    if (localStorage.getItem("jx-show-onboarding") === "1") {
      try { localStorage.removeItem("jx-show-onboarding"); } catch {}
      // new-user flow: set up journal → log first trade → first analytics
      setFirstRun("journal");
    } else {
      // resume an unfinished first-run (e.g. after a reload mid-setup)
      let saved = null;
      try { saved = localStorage.getItem("jx-firstrun"); } catch {}
      if (saved === "journal" || saved === "trade" || saved === "insights") setFirstRunState(saved);
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

  /* ---------- currency model ----------
     Trades are stored in the JOURNAL's own currency. The Journals modal and the
     Log/Edit modal always work in that native currency. The dashboard + trades
     log can DISPLAY in a chosen "display currency" (Settings → Base currency,
     stored as jx-display-currency). We never mutate trades for display, panels
     convert at format time using fxRate, so editing can never be corrupted. */
  const journalCurrency = (currentAccount?.currency || "USD").toUpperCase();
  // The sample journal is written in USD. Convert from USD while it's showing,
  // so it reads like a real account in any display currency (not ₹300 wins
  // shown as $3). Real trades always convert from the journal's own currency.
  const sourceCurrency = usingDummy ? "USD" : journalCurrency;
  const [displayCurrency, setDisplayCurrency] = useState(journalCurrency);
  const [fxRate, setFxRate] = useState(1);
  const fxTicket = useRef(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState(null);
  // one upgrade window for the whole dashboard; limit prompts hand off here
  useEffect(() => {
    window.__jxUpgradeHost = true;
    const onOpen = (e) => { setUpgradeReason(e?.detail || null); setShowUpgradeModal(true); };
    window.addEventListener("jx-open-upgrade", onOpen);
    return () => { window.__jxUpgradeHost = false; window.removeEventListener("jx-open-upgrade", onOpen); };
  }, []);
  const openUpgrade = () => { setUpgradeReason(null); setShowUpgradeModal(true); };

  useEffect(() => {
    // mirror the active journal currency so the Log/Edit modal logs natively
    try { localStorage.setItem("jx-base-currency", journalCurrency); } catch {}

    // Each apply gets a ticket; only the latest one may commit. Without this a
    // slow rate fetch (e.g. INR) could land after a fast one (e.g. USDT) and
    // leave the INR rate under the USDT symbol. Symbol and rate change together.
    let alive = true;
    const apply = async (override) => {
      const ticket = ++fxTicket.current;
      const disp = (override || journalCurrency).toUpperCase();
      const rate = await getConversionFactor(sourceCurrency, disp);
      if (!alive || ticket !== fxTicket.current) return;
      setDisplayCurrency(disp);
      setFxRate(rate);
    };
    let saved = null;
    try { saved = localStorage.getItem("jx-display-currency"); } catch {}
    apply(saved);

    const onChange = (e) => {
      let s = e?.detail;
      if (s == null) { try { s = localStorage.getItem("jx-display-currency"); } catch {} }
      apply(s);
    };
    window.addEventListener("jx-currency-changed", onChange);
    return () => { alive = false; window.removeEventListener("jx-currency-changed", onChange); };
  }, [currentAccount?._id, journalCurrency, sourceCurrency]);

  // panels get NATIVE trades + the display fxRate; they convert only for display
  const trades = rawTrades;
  const currencySymbol = getCurrencySymbol(displayCurrency.toLowerCase()); // dashboard display
  const journalSymbol = getCurrencySymbol(journalCurrency.toLowerCase());  // for logging
  // read-only panels that print money with currencySymbol need converted values too
  const displayTrades = useMemo(
    () => (fxRate === 1 ? trades : trades.map((t) => convertTrade(t, fxRate))),
    [trades, fxRate],
  );

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
  // banner: plan inactive, or ending within 2 days (free users once they have real trades)
  const plan = planState(userData?.subscription);
  const showPlanBanner = plan.show && !(plan.kind === "free" && usingDummy);
  // sidebar plan card: this month's trade usage against the plan's cap
  const planCard = (() => {
    if (plan.kind === "lifetime") return { kind: "active", plan: "lifetime" };
    if (plan.kind === "pro") {
      const d = _sub.expiresAt ? new Date(_sub.expiresAt) : null;
      return { kind: "active", plan: "pro", until: d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null };
    }
    if (plan.kind === "expiring" || plan.kind === "expired") return { kind: plan.kind, daysLeft: plan.daysLeft };
    let limit = Infinity;
    try { limit = getPlanRules(userData).limits.tradeLimitPerMonth; } catch {}
    if (!Number.isFinite(limit)) return null;
    const now = new Date();
    const used = selectedTrades.filter((t) => {
      const d = new Date(t.openTime || t.createdAt || t.closeTime);
      return !Number.isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const resets = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return { kind: "free", used, limit, resets };
  })();

  // celebrate once, after the dashboard has rendered
  useEffect(() => {
    if (loading) return;
    const v = takeJustUpgraded();
    if (!v) return;
    setJustUpgraded(v);
    const t = setTimeout(() => celebrate(), 350);
    return () => clearTimeout(t);
  }, [loading]);

  // open a Settings section directly (sidebar "Manage plan", "Set up rules")
  const openSettingsSection = (id) => {
    navTab("settings");
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("settings", id);
      window.history.replaceState(window.history.state, "", url.toString());
    } catch {}
  };
  const openBilling = () => openSettingsSection("billing");

  if (loading) return <FullPageLoader />;

  /* ---------- overview tab content (Figma "Dashboard / Desktop") ---------- */
  const overview = (
    <Overview
      trades={trades}
      currencySymbol={currencySymbol}
      fxRate={fxRate}
      userName={userData?.name}
      usingDummy={usingDummy}
      startingBalance={currentAccount?.startingBalance?.amount || 0}
      onLogTrade={() => setShowLogTrade(true)}
      onOpenRules={() => openSettingsSection("rules")}
      onImport={() => {
        setActiveTab("trades");
        setImportSignal((s) => s + 1); // opens the import modal in Trades log
      }}
      onViewTrades={() => navTab("trades")}
      banner={showPlanBanner ? <UpgradeBanner state={plan} onUpgrade={openUpgrade} /> : null}
    />
  );

  const TAB_CONTENT = {
    overview,
    trades: (
      <TradesLogPanel
        v2
        trades={trades}
        currencySymbol={currencySymbol}
        fxRate={fxRate}
        usingDummy={usingDummy}
        onAddTrade={() => setShowLogTrade(true)}
        onOpenTab={navTab}
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
    markets: <MarketsPanel trades={displayTrades} currencySymbol={currencySymbol} />,
    tools: <ToolsPanel currencySymbol={currencySymbol} />,
    share: (
      <SharePanel
        trades={displayTrades}
        accountName={currentAccount?.name || "My journal"}
        currencySymbol={currencySymbol}
      />
    ),
    importexport: (
      <ImportExportPanel
        trades={trades}
        onImported={(newTrades) => setAccountTrades((prev) => [...prev, ...(newTrades || [])])}
      />
    ),
    // settings opens as a glassmorphic modal (see SettingsModal below)
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
      <AppSidebar
        items={NAV_ITEMS}
        active={activeTab}
        onChange={navTab}
        accountName={currentAccount?.name}
        onAccountSwitch={() => setShowSwitchModal(true)}
        onLogTrade={() => setShowLogTrade(true)}
        user={userData}
        onProfile={() => navTab("settings")}
        onSupport={openSupport}
        planCard={planCard}
        onUpgrade={openUpgrade}
        onManagePlan={openBilling}
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

        {/* Plan status lives subtly in the sidebar ("Upgrade plan"); no big
            banner at the top of every page. */}

        <AnimatedPanel id={activeTab}>
          {activeTab === "settings" && isMobile ? (
            <SettingsPanel
              user={userData}
              onNavigate={(id) => { fromSettings.current = true; navTab(id); }}
              onSupport={openSupport}
              onSwitchJournal={() => setShowSwitchModal(true)}
            />
          ) : isMobile && SETTINGS_SUBPAGES[activeTab] ? (
            /* on phones these pages are opened from Settings, so they get the
               same "‹ Title" header as Settings' own sub-screens */
            <div className="jx-subpage">
              <div className="jx-settings__mhead jx-subpage__head">
                <button type="button" className="jx-settings__mback" onClick={backToSettings} aria-label="Back to settings">
                  <ChevronLeft size={20} />
                </button>
                <span className="jx-settings__mtitle">{SETTINGS_SUBPAGES[activeTab]}</span>
              </div>
              {TAB_CONTENT[activeTab]}
            </div>
          ) : (
            TAB_CONTENT[activeTab] || overview
          )}
        </AnimatedPanel>
      </main>

      {/* Mobile bottom navigation (hidden on desktop) */}
      <BottomBar
        active={activeTab}
        onChange={navTab}
        onLogTrade={() => setShowLogTrade(true)}
        onSupport={openSupport}
        user={userData}
      />

      {/* Global keyboard-shortcuts cheat sheet (press ?) */}
      <ShortcutsHelp open={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Log trade modal (Quick log / Detailed), blurred backdrop */}
      <LogTradeModal
        open={showLogTrade}
        onClose={() => setShowLogTrade(false)}
        currentAccountId={currentAccount?._id}
        currencySymbol={journalSymbol}
        accounts={accounts}
        currentBalances={currentBalances}
        accountSymbols={accountSymbols}
        onNoJournal={() => { setJournalsView("create"); setShowSwitchModal(true); }}
        onSaved={(trade) => trade && setAccountTrades((prev) => [...prev, trade])}
      />

      <JournalsModal
        open={showSwitchModal}
        onClose={() => { setShowSwitchModal(false); setJournalEditId(null); setJournalsView("list"); }}
        accounts={accounts}
        trades={accountTrades}
        currentBalances={currentBalances}
        currentAccountId={currentAccount?._id}
        editAccountId={journalEditId}
        initialView={journalsView}
      />

      {justUpgraded && <UpgradedToast plan={justUpgraded.plan} onClose={() => setJustUpgraded(null)} />}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        trades={displayTrades}
        currencySymbol={currencySymbol}
        displayCurrency={displayCurrency}
        state={plan}
        reason={upgradeReason}
      />
      <SupportModal
        open={showSupport}
        onClose={closeSupport}
        user={userData}
        plan={userData?.subscription?.plan || "free"}
      />


      {/* New-user onboarding: set up journal → log first trade → first analytics */}
      <FirstRunFlow
        open={!!firstRun && !loading}
        step={firstRun || "journal"}
        account={currentAccount}
        trades={accountTrades}
        onStepChange={setFirstRun}
        onTradeLogged={(trade) => trade && setAccountTrades((prev) => [...prev, trade])}
        onJournalSaved={async () => {
          const fresh = await fetchAccountsAndTrades();
          setAccounts(fresh.accounts || []);
          setAccountSymbols(fresh.accountSymbols || {});
          setCurrentBalances(fresh.currentBalances || {});
          setAccountTrades(fresh.trades || []);
        }}
        onFinish={() => setFirstRun(null)}
      />

      {/* Settings, glassmorphic modal */}
      <SettingsModal
        open={activeTab === "settings" && !isMobile}
        user={userData}
        onClose={() => navTab("overview")}
        onNavigate={(id) => navTab(id)}
        onSupport={() => { navTab("overview"); openSupport(); }}
        onSwitchJournal={() => setShowSwitchModal(true)}
      />
    </div>
  );
}
