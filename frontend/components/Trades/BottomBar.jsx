"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ArrowUpDown, Plus, Bot, User } from "lucide-react";
import { motion } from "framer-motion";

export default function BottomBar() {
  const pathname = usePathname();
  const isActive = (path) => pathname === path;

  const navItems = [
    { href: "/", icon: <Home size={22} /> },
    { href: "/trade", icon: <ArrowUpDown size={22} /> },
    { href: "/add-trade", icon: <Plus size={24} />, special: true },
    { href: "/tradeassistant", icon: <Bot size={22} /> },
    { href: "/profile", icon: <User size={22} /> },
  ];

  return (
    <nav
      className="bottom-bar"
      style={{ width: "85%", backdropFilter: "blur(30px)" }}
    >
      {navItems.map((item) => (
        <Link href={item.href} key={item.href} className="nav-item">
          <motion.div
            className={`icon-wrapper ${item.special ? "add-btn" : ""} ${
              isActive(item.href) ? "active" : ""
            }`}
            whileTap={{ scale: 0.85 }} // tap animation
          >
            {item.icon}

            {/* Active bubble highlight */}
            {isActive(item.href) && (
              <motion.div
                layoutId="active-nav"
                className="active-indicator"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </motion.div>
        </Link>
      ))}
    </nav>
  );
}
