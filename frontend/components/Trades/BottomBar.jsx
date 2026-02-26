"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, ArrowUpDown, Plus, Newspaper, User } from "lucide-react";
import { motion } from "framer-motion";

export default function BottomBar() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/trade", label: "Trades", icon: ArrowUpDown },
    { href: "/add-trade", label: "Add", icon: Plus, isFab: true },
    { href: "/events", label: "Trends", icon: Newspaper },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const handleClick = (href) => {
    if (pathname === href) return;
    router.push(href);
  };

  return (
    <nav className="mobile-bottom-bar">
      {navItems.map((item) => {
        const { href, label, icon: Icon, isFab } = item;
        const active = pathname === href;

        return (
          <button
            key={href}
            onClick={() => handleClick(href)}
            className={isFab ? "fab-wrapper" : "tab-item"}
            style={{
              textDecoration: "none",
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            <motion.div
              whileTap={{ scale: 0.92 }}
              className={
                isFab ? "fab-btn" : `tab-content ${active ? "active" : ""}`
              }
            >
              <Icon size={isFab ? 26 : 22} />
            </motion.div>
          </button>
        );
      })}
    </nav>
  );
}
