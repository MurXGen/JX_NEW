"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ArrowUpDown, Plus, Crown, Settings, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BottomBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: <Home size={20} /> },
    { href: "/trade", label: "Trade", icon: <ArrowUpDown size={20} /> },
    { href: "/add-trade", label: "Add Trade", icon: <Plus size={22} /> },
    { href: "/pricing", label: "Upgrade limits", icon: <Crown size={20} /> },
    {
      href: "/accountSetting",
      label: "Settings",
      icon: <Settings size={20} />,
    },
  ];

  const activeItem = navItems.find((i) => i.href === pathname) || navItems[0];

  return (
    <div className="floating-nav-container">
      {/* Active Box */}

      {/* Dropdown Items */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="dropdown-nav"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.25 }}
          >
            {navItems
              .filter((item) => item.href !== pathname)
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="dropdown-item"
                  onClick={() => setOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="active-box" onClick={() => setOpen((prev) => !prev)}>
        {activeItem.icon}
        <span>{activeItem.label}</span>
      </div>
    </div>
  );
}
