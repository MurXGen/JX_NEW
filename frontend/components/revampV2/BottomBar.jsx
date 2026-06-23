"use client";

import {
  Globe,
  History,
  LayoutGrid,
  Plus,
  Settings,
} from "lucide-react";
import { useSupportBadge } from "./useSupportBadge";

/**
 * BottomBar — mobile-only bottom navigation (hidden on desktop).
 * Four slots + center Log-trade FAB. The last slot is a Settings gear that
 * opens the mobile Settings hub (profile, plan, and the secondary sections
 * like Learn, Share, Import/Export and Support live inside it).
 */

const MAIN = [
  { id: "overview", label: "Home", icon: LayoutGrid },
  { id: "trades", label: "Trades", icon: History },
  { id: "markets", label: "Markets", icon: Globe },
];

/* Tabs reachable from the Settings hub — keep the gear lit when on any of them. */
const SETTINGS_GROUP = ["settings", "blogs", "share", "importexport"];

export default function BottomBar({ active, onChange, onLogTrade, user }) {
  const { showDot: supportDot } = useSupportBadge(user?.email);
  const settingsActive = SETTINGS_GROUP.includes(active);

  const go = (id) => onChange(id);

  const RedDot = ({ offset = -3 }) => (
    <span
      aria-label="New response"
      style={{
        position: "absolute", top: offset, right: offset, width: 8, height: 8,
        borderRadius: "50%", background: "var(--color-danger)",
        border: "2px solid var(--color-bg-surface)",
      }}
    />
  );

  const item = ({ id, label, icon: Icon }, isActive) => (
    <button
      key={id}
      type="button"
      className={`jx-bottombar__item ${isActive ? "jx-bottombar__item--active" : ""}`}
      onClick={() => go(id)}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <nav className="jx-bottombar">
      {item(MAIN[0], active === "overview")}
      {item(MAIN[1], active === "trades")}

      {/* center FAB */}
      <button
        type="button"
        className="jx-bottombar__fab"
        onClick={() => onLogTrade?.()}
        aria-label="Log a trade"
      >
        <Plus size={22} />
      </button>

      {item(MAIN[2], active === "markets")}

      {/* Settings hub */}
      <button
        type="button"
        className={`jx-bottombar__item ${settingsActive ? "jx-bottombar__item--active" : ""}`}
        onClick={() => go("settings")}
        style={{ position: "relative" }}
        aria-label="Settings"
      >
        <span style={{ position: "relative", display: "inline-flex" }}>
          <Settings size={20} />
          {supportDot && <RedDot />}
        </span>
        <span>Settings</span>
      </button>
    </nav>
  );
}
