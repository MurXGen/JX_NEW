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
  showUpgrade,
  onUpgrade,
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
        {showUpgrade && (
          <button type="button" className={`${a.item} ${a.upgrade}`} onClick={onUpgrade} title={collapsed ? "Upgrade plan" : undefined} aria-label={collapsed ? "Upgrade plan" : undefined}>
            <Crown size={17} aria-hidden="true" />{!collapsed && <span>Upgrade plan</span>}
          </button>
        )}
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
