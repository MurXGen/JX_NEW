"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRightLeft,
  Crown,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Sun,
  User,
} from "lucide-react";
import Cookies from "js-cookie";
import Button from "./Button";

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

/**
 * revampV2 Sidebar — Figma "Components / Sidebar".
 * Tab-driven: pass items [{id,label,icon}], active id, onChange(id).
 *
 * props:
 *  items, active, onChange         — nav
 *  accountName, onAccountSwitch    — journal switcher row
 *  onLogTrade                      — primary CTA
 *  user ({name,email}), onProfile
 *  showUpgrade, onUpgrade
 */
export default function Sidebar({
  items = [],
  active,
  onChange,
  accountName,
  onAccountSwitch,
  onLogTrade,
  user,
  onProfile,
  showUpgrade,
  onUpgrade,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();

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
    <motion.aside
      animate={{ width: collapsed ? 76 : 248 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`jx-sidebar ${collapsed ? "jx-sidebar--collapsed" : ""}`}
      style={{ width: undefined }}
    >
      {/* Brand */}
      <div className="jx-sidebar__brand">
        {collapsed ? (
          /* Collapsed: logo by default, expand icon on hover */
          <button
            className="jx-sidebar__logobtn"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <span className="jx-sidebar__logo" />
            <PanelLeftOpen size={18} className="jx-sidebar__expandicon" />
          </button>
        ) : (
          <>
            <div className="jx-sidebar__logo" />
            <span className="jx-sidebar__brand-name">
              Journal<strong style={{ color: "var(--yellow-500)" }}>X</strong>
            </span>
            <button
              className="jx-btn jx-btn--ghost jx-btn--sm"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              style={{ padding: 6 }}
            >
              <PanelLeftClose size={18} />
            </button>
          </>
        )}
      </div>

      {/* Journal switcher */}
      {onAccountSwitch && (
        <button
          className="jx-sidebar__item"
          onClick={onAccountSwitch}
          title="Switch journal"
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-muted)",
          }}
        >
          <ArrowRightLeft size={18} />
          {!collapsed && (
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                lineHeight: 1.3,
                minWidth: 0,
                flex: 1,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  font: "var(--text-caption)",
                  color: "var(--color-text-muted)",
                }}
              >
                Journal
              </span>
              <span
                style={{
                  fontWeight: 600,
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={accountName || "Select journal"}
              >
                {accountName || "Select journal"}
              </span>
            </span>
          )}
        </button>
      )}

      {/* Log trade CTA */}
      {onLogTrade && (
        <Button
          variant="primary"
          icon={PlusCircle}
          onClick={onLogTrade}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {!collapsed && "Log a trade"}
        </Button>
      )}

      {!collapsed && <span className="jx-sidebar__section">Menu</span>}

      {/* Nav items */}
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`jx-sidebar__item ${
            active === id ? "jx-sidebar__item--active" : ""
          }`}
          title={collapsed ? label : undefined}
        >
          {Icon && <Icon size={20} />}
          {!collapsed && <span>{label}</span>}
        </button>
      ))}

      {/* Footer */}
      <div className="jx-sidebar__footer">
        {showUpgrade && (
          <button
            className="jx-sidebar__item"
            onClick={onUpgrade}
            style={{ color: "var(--yellow-500)" }}
          >
            <Crown size={20} />
            {!collapsed && <span style={{ fontWeight: 600 }}>Upgrade plan</span>}
          </button>
        )}

        <button className="jx-sidebar__item" onClick={toggleTheme}>
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          {!collapsed && (
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          )}
        </button>

        {user && (
          <button
            className="jx-sidebar__item"
            onClick={onProfile}
            title={collapsed ? user.name : undefined}
          >
            <User size={20} />
            {!collapsed && (
              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  lineHeight: 1.3,
                  minWidth: 0,
                }}
              >
                <span style={{ fontWeight: 600 }}>{user.name || "User"}</span>
                <span
                  style={{
                    font: "var(--text-caption)",
                    color: "var(--color-text-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 150,
                  }}
                >
                  {user.email}
                </span>
              </span>
            )}
          </button>
        )}

        <button className="jx-sidebar__item" onClick={handleLogout}>
          <LogOut size={20} />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </motion.aside>
  );
}
