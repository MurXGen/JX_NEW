"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Cookies from "js-cookie";
import {
  LayoutGrid,
  ArrowLeftRight,
  CandlestickChart,
  LineChart,
  Calendar,
  ArrowUpDown,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Wallet,
  Sun,
  Moon,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard-web", icon: LayoutGrid },
  { label: "Trades log", href: "/trade", icon: ArrowLeftRight },
  { label: "Add trade", href: "/add-trade", icon: CandlestickChart },
  { label: "Analytics", href: "/view-trades", icon: LineChart },
  { label: "Accounts", href: "/accounts", icon: Wallet },
  { label: "Events", href: "/events", icon: Calendar },
  { label: "Import / Export", href: "/export", icon: ArrowUpDown },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function useTheme() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    setTheme(localStorage.getItem("theme") || "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
    document.body.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return { theme, toggleTheme };
}

export function ThemeToggle({ collapsed }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      className="jx-sidebar__item"
      onClick={toggleTheme}
      title="Toggle theme"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}

export default function AppShell({ children }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("jx-sidebar-collapsed") === "1");
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("jx-sidebar-collapsed", next ? "1" : "0");
  };

  const handleLogout = () => {
    Cookies.remove("userId");
    Cookies.remove("accountId");
    Cookies.remove("isVerified");
    window.location.href = "/login";
  };

  return (
    <div className="jx-shell">
      <aside
        className={`jx-sidebar ${collapsed ? "jx-sidebar--collapsed" : ""}`}
      >
        <div className="jx-sidebar__brand">
          <div className="jx-sidebar__logo" />
          {!collapsed && <span className="jx-sidebar__brand-name">JournalX</span>}
          <button
            className="jx-btn jx-btn--ghost jx-btn--sm"
            onClick={toggleCollapsed}
            aria-label="Toggle sidebar"
            style={{ padding: 6 }}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        </div>

        {!collapsed && <span className="jx-sidebar__section">Menu</span>}

        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active =
            router.pathname === href ||
            (href !== "/" && router.pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              className={`jx-sidebar__item ${
                active ? "jx-sidebar__item--active" : ""
              }`}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}

        <div className="jx-sidebar__footer">
          <ThemeToggle collapsed={collapsed} />
          <button className="jx-sidebar__item" onClick={handleLogout}>
            <LogOut size={20} />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      <main className="jx-shell__main">{children}</main>
    </div>
  );
}
