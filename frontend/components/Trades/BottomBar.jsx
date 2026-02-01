"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ArrowUpDown, Plus, Bot, Settings, Crown } from "lucide-react";
import { motion } from "framer-motion";

export default function BottomBar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/trade", label: "Trades", icon: ArrowUpDown },
    { href: "/add-trade", label: "Add", icon: Plus, isFab: true },
    { href: "/pricing", label: "Upgrade", icon: Crown },
    { href: "/accountSetting", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="mobile-bottom-bar">
      {navItems.map(({ href, label, icon: Icon, isFab }) => {
        const active = pathname === href;

        if (isFab) {
          return (
            <Link key={href} href={href} className="fab-wrapper">
              <motion.div whileTap={{ scale: 0.9 }} className="fab-btn">
                <Plus size={26} />
              </motion.div>
            </Link>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            className="tab-item"
            style={{ textDecoration: "none" }}
          >
            <motion.div
              whileTap={{ scale: 0.92 }}
              className={`tab-content ${active ? "active" : ""}`}
            >
              <Icon size={22} />
              {/* <span className="font_8 shade_50">{label}</span> */}
            </motion.div>
          </Link>
        );
      })}
    </nav>
  );
}
