"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpDown,
  BookOpen,
  Globe,
  History,
  LayoutGrid,
  LifeBuoy,
  MoreHorizontal,
  Plus,
  Settings,
  Share2,
} from "lucide-react";
import { useSupportBadge } from "./useSupportBadge";

/**
 * BottomBar — mobile-only bottom navigation (hidden on desktop).
 * Four slots + center Log-trade FAB; "More" opens a slide-up sheet
 * with the remaining tabs.
 */

const MAIN = [
  { id: "overview", label: "Home", icon: LayoutGrid },
  { id: "trades", label: "Trades", icon: History },
  { id: "markets", label: "Markets", icon: Globe },
];

const MORE = [
  { id: "blogs", label: "Trader Gym", icon: BookOpen },
  { id: "share", label: "Share logs", icon: Share2 },
  { id: "importexport", label: "Import / Export", icon: ArrowUpDown },
  { id: "settings", label: "Profile & settings", icon: Settings },
];

export default function BottomBar({ active, onChange, onLogTrade, onSupport, user }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE.some((m) => m.id === active);
  const { showDot: supportDot, markViewed: markSupportViewed } = useSupportBadge(user?.email);

  const go = (id) => {
    setMoreOpen(false);
    onChange(id);
  };

  const openSupport = () => {
    setMoreOpen(false);
    markSupportViewed();
    onSupport?.();
  };

  const RedDot = ({ offset = 2 }) => (
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
    <>
      {/* slide-up "More" sheet */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="jx-bottombar__scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              className="jx-bottombar__sheet"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              {MORE.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`jx-dd__option ${active === id ? "jx-dd__option--selected" : ""}`}
                  onClick={() => go(id)}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
              {onSupport && (
                <button
                  type="button"
                  className="jx-dd__option"
                  onClick={openSupport}
                  style={{ position: "relative" }}
                >
                  <LifeBuoy size={16} /> Support &amp; feedback
                  {supportDot && (
                    <span style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "var(--color-danger)" }} />
                  )}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="jx-bottombar">
        {item(MAIN[0], active === "overview")}
        {item(MAIN[1], active === "trades")}

        {/* center FAB */}
        <button
          type="button"
          className="jx-bottombar__fab"
          onClick={() => {
            setMoreOpen(false);
            onLogTrade?.();
          }}
          aria-label="Log a trade"
        >
          <Plus size={22} />
        </button>

        {item(MAIN[2], active === "markets")}

        <button
          type="button"
          className={`jx-bottombar__item ${moreActive || moreOpen ? "jx-bottombar__item--active" : ""}`}
          onClick={() => setMoreOpen((o) => !o)}
          style={{ position: "relative" }}
        >
          <span style={{ position: "relative", display: "inline-flex" }}>
            <MoreHorizontal size={20} />
            {supportDot && !moreOpen && <RedDot offset={-3} />}
          </span>
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
