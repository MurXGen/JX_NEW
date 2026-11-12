"use client";

/* App sidebar: journal switcher, Log trade, grouped navigation and a quiet
   footer (support, theme, profile). Collapsible (persisted). Hidden on
   phones, where the bottom bar takes over. Same props as the old Sidebar. */

import { useEffect, useState } from "react";
import {
  ChevronsUpDown, Crown, LifeBuoy, Settings, Moon, PanelLeftClose, PanelLeftOpen, Plus, SlidersHorizontal, Sun, User, Wallet,
} from "lucide-react";
import { useTheme } from "@/components/revampV2/Sidebar";
import { useSupportBadge } from "@/components/revampV2/useSupportBadge";
import { SidebarInstallButton } from "@/components/pwa/InstallPwa";
import { openCustomize } from "@/components/revampV2/CustomizeSections";
import a from "./AppSidebar.module.css";

/* nav ids grouped like the reference: work, research, sharing */
const SHOW_CUSTOMIZE = false;
const GROUPS = [["overview", "trades"], ["markets", "tools", "blogs"], ["share", "importexport"]];

export default function AppSidebar({
  items = [],
  active,
  onChange,
  accountName,
  onAccountSwitch,
  onLogTrade,
  user,
  onProfile,
  onSupport,
  planCard,
  onUpgrade,
  onManagePlan,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { showDot, markViewed } = useSupportBadge(user?.email);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem("jx-sidebar-collapsed") === "1"); } catch {}
  }, []);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("jx-sidebar-collapsed", next ? "1" : "0"); } catch {}
  };

  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const grouped = GROUPS.map((g) => g.map((id) => byId[id]).filter(Boolean));
  const rest = items.filter((i) => !GROUPS.flat().includes(i.id));
  if (rest.length) grouped.push(rest);

  const Item = ({ id, label, icon: Icon }) => (
    <button
      type="button"
      className={a.item}
      aria-current={active === id ? "page" : undefined}
      onClick={() => onChange(id)}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
    >
      {Icon && <Icon size={17} aria-hidden="true" />}
      {!collapsed && <span>{label}</span>}
    </button>
  );

  return (
    <aside className={a.aside} data-collapsed={collapsed || undefined} aria-label="Main navigation">
      <div className={a.brand}>
        {!collapsed && <a href="/" className={a.logo} aria-label="JournalX home">Journal<em>X</em></a>}
        <button type="button" className={a.iconBtn} onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      {onAccountSwitch && (
        <button type="button" className={a.journal} onClick={onAccountSwitch} title="Switch journal" aria-label={`Journal: ${accountName || "Select journal"}. Switch journal`}>
          <span className={a.journalMark} aria-hidden="true"><Wallet size={14} /></span>
          {!collapsed && (
            <>
              <span className={a.journalText}>
                <small>Journal</small>
                <b>{accountName || "Select journal"}</b>
              </span>
              <ChevronsUpDown size={15} className={a.chev} aria-hidden="true" />
            </>
          )}
        </button>
      )}

      {onLogTrade && (
        <button type="button" className={a.log} onClick={onLogTrade} aria-label="Log a trade" title={collapsed ? "Log a trade" : undefined}>
          <Plus size={16} aria-hidden="true" />{!collapsed && "Log a trade"}
        </button>
      )}

      <nav aria-label="Sections" style={{ width: "100%" }}>
        {grouped.map((g, gi) => (
          <div key={gi}>
            {gi > 0 && <div className={a.sep} aria-hidden="true" />}
            <div className={a.group}>{g.map((it) => <Item key={it.id} {...it} />)}</div>
          </div>
        ))}
      </nav>

      <div className={a.foot}>
        {/* page customization (show / hide / reorder sections) lives here, not as a floating button */}
        {/* hidden for now; flip SHOW_CUSTOMIZE to bring it back */}
        {SHOW_CUSTOMIZE && (active === "overview" || active === "trades") && (
          <button type="button" className={a.item} onClick={openCustomize} title={collapsed ? "Customize page" : undefined} aria-label={collapsed ? "Customize page" : undefined}>
            <SlidersHorizontal size={17} aria-hidden="true" />{!collapsed && <span>Customize page</span>}
          </button>
        )}
        <SidebarInstallButton collapsed={collapsed} />
        {planCard && <PlanCard card={planCard} collapsed={collapsed} onUpgrade={onUpgrade} onManage={onManagePlan || onUpgrade} />}
        {onSupport && (
          <button type="button" className={a.item} onClick={() => { markViewed(); onSupport(); }} title={collapsed ? "Support & feedback" : undefined} aria-label={collapsed ? "Support and feedback" : undefined}>
            <LifeBuoy size={17} aria-hidden="true" />{!collapsed && <span>Support &amp; feedback</span>}
            {showDot && <span className={a.dot} aria-label="New reply" />}
          </button>
        )}
        <div className={a.footRow}>
          {user && (
            <button type="button" className={a.profile} onClick={onProfile} title={collapsed ? (user.name || "Profile") : "Settings"} aria-label="Profile and settings">
              <span className={a.avatar} aria-hidden="true">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <User size={15} />}
              </span>
              {!collapsed && (
                <>
                  <span className={a.profileText}>
                    <b>{user.name || "Trader"}</b>
                    <small>{user.email}</small>
                  </span>
                  <Settings size={15} className={a.profileGear} aria-hidden="true" />
                </>
              )}
            </button>
          )}
          <button type="button" className={a.iconBtn} onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
}

/* Glass plan card in the sidebar footer: shows this month's usage on Free
   (or a lapsing Pro plan) with an upgrade action. Collapsed sidebar shows a
   ring with the same state. */
function PlanCard({ card, collapsed, onUpgrade, onManage }) {
  // paid and active: a calm "you're on Pro" card, no upsell
  if (card.kind === "active") {
    const life = card.plan === "lifetime";
    const title = life ? "Lifetime" : "Pro";
    const sub = life ? "Everything unlocked, for good" : card.until ? `Paid through ${card.until}` : "Everything unlocked";
    if (collapsed) {
      return (
        <button type="button" className={a.planRing} data-tone="active" onClick={onManage} title={`${title} plan active · Manage plan`} aria-label={`${title} plan active. Manage plan`} style={{ "--pct": "100%" }}>
          <Crown size={15} aria-hidden="true" />
        </button>
      );
    }
    return (
      <div className={a.plan} data-tone="active">
        <div className={a.planHead}>
          <span className={a.planIco} aria-hidden="true"><Crown size={14} /></span>
          <b>{title}</b>
          <span className={a.planLive}><i aria-hidden="true" /> Active</span>
        </div>
        <small className={a.planSub}>{sub}</small>
        <button type="button" className={a.planGhost} onClick={onManage}>Manage plan</button>
      </div>
    );
  }
  const free = card.kind === "free";
  const pct = free ? Math.min(100, Math.round((card.used / card.limit) * 100)) : 100;
  const full = free && card.used >= card.limit;
  const near = free && !full && pct >= 80;
  const tone = full || card.kind === "expired" ? "alert" : near || card.kind === "expiring" ? "warn" : "calm";
  const title = card.kind === "expired" ? "Pro has ended"
    : card.kind === "expiring" ? `Pro ends in ${card.daysLeft} day${card.daysLeft === 1 ? "" : "s"}`
    : full ? "Monthly limit reached"
    : near ? "Almost at your limit"
    : "Free plan";
  const sub = card.kind === "expired" ? "Back on Free limits"
    : card.kind === "expiring" ? "Renew to keep everything"
    : full ? `New trades unlock ${card.resets}`
    : `${card.limit - card.used} trades left · resets ${card.resets}`;
  const cta = card.kind === "free" ? (full ? "Upgrade to keep logging" : "Upgrade to Pro") : "Renew Pro";

  if (collapsed) {
    return (
      <button type="button" className={a.planRing} data-tone={tone} onClick={onUpgrade} title={`${title} · ${cta}`} aria-label={`${title}. ${cta}`} style={{ "--pct": `${pct}%` }}>
        <Crown size={15} aria-hidden="true" />
      </button>
    );
  }
  return (
    <div className={a.plan} data-tone={tone}>
      <div className={a.planHead}>
        <span className={a.planIco} aria-hidden="true"><Crown size={14} /></span>
        <b>{title}</b>
      </div>
      {free && (
        <div className={a.planMeter}>
          <div
            className={a.planBar}
            role="progressbar"
            aria-label="Trades logged this month"
            aria-valuemin={0}
            aria-valuemax={card.limit}
            aria-valuenow={Math.min(card.used, card.limit)}
          >
            <i style={{ width: `${pct}%` }} />
          </div>
          <span className={a.planCount}><b>{Math.min(card.used, card.limit)}</b> / {card.limit} trades this month</span>
        </div>
      )}
      <small className={a.planSub}>{sub}</small>
      <button type="button" className={a.planCta} onClick={onUpgrade}>{cta}</button>
    </div>
  );
}
