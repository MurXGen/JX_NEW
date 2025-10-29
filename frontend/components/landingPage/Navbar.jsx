"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header className="navbar_container flexRow flexRow_stretch bg_blur_20">
      {/* Logo Section */}
      <section className="flexRow flex_center">
        <Link href="/">
          <Image
            src="https://cdn.journalx.app/trades/open-images/1761675859363-Journalx_logo.svg"
            alt="JournalX Logo"
            width={120}
            height={40}
            className="navbar_logo"
          />
        </Link>
      </section>

      {/* Desktop Links */}
      <nav className="navbar_links flexRow gap_32 font_weight_500 font_14">
        <Link href="/dashboard" className="navbar_link">
          Dashboard
        </Link>
        <Link href="/pricing" className="navbar_link">
          Pricing
        </Link>
        <Link href="/about" className="navbar_link">
          About Us
        </Link>
        <Link href="/features" className="navbar_link">
          Features
        </Link>
        <button className="button_pri flexRow gap_4 flex_center ">
          Start Free
          <ArrowRight size={14} />
        </button>
      </nav>

      {/* Mobile Menu Icon */}
      <div className="navbar_menu_icon" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            className="navbar_mobile_menu flexClm gap_8 font_16"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            {["Dashboard", "Pricing", "About Us", "Features"].map((item) => (
              <Link
                key={item}
                href={`/${item.toLowerCase().replace(/\s/g, "")}`}
                className="navbar_link"
                onClick={() => setMenuOpen(false)}
              >
                {item}
              </Link>
            ))}
            <button
              className="button_pri flexRow gap_4 flex_center"
              onClick={() => setMenuOpen(false)}
            >
              Start Free
              <ArrowRight size={14} />
            </button>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
