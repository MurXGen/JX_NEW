"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRightLeft,
  Crown,
  LifeBuoy,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Sun,
  User,
} from "lucide-react";
import Button from "./Button";
import { useSupportBadge } from "./useSupportBadge";

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
 *  onSupport                       — opens the support/feedback modal
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
  onSupport,
  showUpgrade,
  onUpgrade,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { showDot: supportDot, markViewed: markSupportViewed } = useSupportBadge(user?.email);

  useEffect(() => {
    setCollapsed(localStorage.getItem("jx-sidebar-collapsed") === "1");
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("jx-sidebar-collapsed", next ? "1" : "0");
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
          /* Collapsed: "JX" wordmark by default, expand icon on hover */
          <button
            className="jx-sidebar__logobtn"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <span className="jx-sidebar__logomark">
              J<strong style={{ color: "var(--yellow-500)" }}>X</strong>
            </span>
            <PanelLeftOpen size={18} className="jx-sidebar__expandicon" />
          </button>
        ) : (
          <>
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

      {/* Journal switcher (top) */}
      {onAccountSwitch && (
        <button
          className="jx-sidebar__item"
          onClick={onAccountSwitch}
          title="Switch journal"
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-muted)",
            minWidth: 0,
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

        {/* When collapsed, the theme toggle lives here as its own icon item;
            when expanded, it sits beside the profile (below). */}
        {collapsed && (
          <button
            className="jx-sidebar__item"
            onClick={toggleTheme}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        )}

        {onSupport && (
          <button
            className="jx-sidebar__item"
            onClick={() => { markSupportViewed(); onSupport(); }}
            title={collapsed ? "Support & feedback" : undefined}
            style={{ justifyContent: "flex-start", textAlign: "left" }}
          >
            <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
              <LifeBuoy size={20} />
              {supportDot && (
                <span
                  aria-label="New response"
                  style={{
                    position: "absolute", top: -3, right: -3, width: 9, height: 9,
                    borderRadius: "50%", background: "var(--color-danger)",
                    border: "2px solid var(--color-bg-surface)", boxShadow: "0 0 0 1px var(--color-danger)",
                  }}
                />
              )}
            </span>
            {!collapsed && <span style={{ flex: 1, textAlign: "left" }}>Support &amp; feedback</span>}
          </button>
        )}

        {user && (
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "stretch" }}>
            <button
              className="jx-sidebar__item"
              onClick={onProfile}
              title={collapsed ? user.name : undefined}
              style={{ flex: 1, minWidth: 0, justifyContent: "flex-start", textAlign: "left" }}
            >
              <User size={20} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    textAlign: "left",
                    lineHeight: 1.3,
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.name || "User"}
                  </span>
                  <span
                    style={{
                      font: "var(--text-caption)",
                      color: "var(--color-text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "100%",
                    }}
                  >
                    {user.email}
                  </span>
                </span>
              )}
            </button>

            {/* Theme toggle beside the profile (expanded view) */}
            {!collapsed && (
              <button
                className="jx-sidebar__item jx-sidebar__themebtn"
                onClick={toggleTheme}
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                aria-label="Toggle theme"
                style={{ flex: "0 0 auto", width: 46, justifyContent: "center", padding: 0 }}
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}
          </div>
        )}

        {/* If there is no user row, still expose the theme toggle when expanded */}
        {!collapsed && !user && (
          <button
            className="jx-sidebar__item"
            onClick={toggleTheme}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
        )}
      </div>
    </motion.aside>
  );
}
