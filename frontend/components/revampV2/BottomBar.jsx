"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpDown,
  BookOpen,
  Globe,
  History,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Settings,
  Share2,
} from "lucide-react";

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
  { id: "blogs", label: "Learn & News", icon: BookOpen },
  { id: "share", label: "Share logs", icon: Share2 },
  { id: "importexport", label: "Import / Export", icon: ArrowUpDown },
  { id: "settings", label: "Profile & settings", icon: Settings },
];

export default function BottomBar({ active, onChange, onLogTrade }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE.some((m) => m.id === active);

  const go = (id) => {
    setMoreOpen(false);
    onChange(id);
  };

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
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
