"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, ArrowUpDown, Plus, Newspaper, User } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export default function BottomBar() {
  const router = useRouter();
  const pathname = usePathname();

  const [playing, setPlaying] = useState(null);
  const [gifKey, setGifKey] = useState(0);

  const navItems = [
    { href: "/dashboard", label: "Home", icon: Home, gif: "/assets/home.gif" },
    {
      href: "/trade",
      label: "Trades",
      icon: ArrowUpDown,
      gif: "/assets/trades.gif",
    },
    {
      href: "/add-trade",
      label: "Add",
      icon: Plus,
      gif: "/assets/add-trade.gif",
      isFab: true,
    },
    {
      href: "/events",
      label: "Trends",
      icon: Newspaper,
      gif: "/assets/news.gif",
    },
    {
      href: "/profile",
      label: "Profile",
      icon: User,
      gif: "/assets/profile.gif",
    },
  ];

  const handleClick = (e, item) => {
    e.preventDefault(); // stop instant navigation

    if (pathname === item.href) return; // optional: don't replay on same tab

    setPlaying(item.label);
    setGifKey((prev) => prev + 1);

    setTimeout(() => {
      router.push(item.href); // navigate after GIF plays
    }, 100); // adjust to your GIF duration
  };

  return (
    <nav className="mobile-bottom-bar">
      {navItems.map((item) => {
        const { href, label, icon: Icon, gif, isFab } = item;
        const active = pathname === href;
        const isPlaying = playing === label;

        return (
          <a
            key={href}
            href={href}
            onClick={(e) => handleClick(e, item)}
            className={isFab ? "fab-wrapper" : "tab-item"}
            style={{ textDecoration: "none" }}
          >
            <motion.div
              whileTap={{ scale: 0.92 }}
              className={
                isFab ? "fab-btn" : `tab-content ${active ? "active" : ""}`
              }
            >
              {isPlaying ? (
                <img
                  key={gifKey}
                  src={gif}
                  width={isFab ? 28 : 32}
                  height={isFab ? 28 : 32}
                  alt={label}
                />
              ) : (
                <Icon size={isFab ? 26 : 22} />
              )}
            </motion.div>
          </a>
        );
      })}
    </nav>
  );
}
