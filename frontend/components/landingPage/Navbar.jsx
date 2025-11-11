"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const router = useRouter();

  return (
    <header className="navbar_container flexRow flexRow_stretch bg_blur_20">
      {/* Logo */}
      <section className="flexRow flex_center">
        <Link href="/">
          <Image
            src="/assets/journalx_navbar.svg"
            alt="JournalX Logo"
            width={120}
            height={40}
            className="navbar_logo"
            priority
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
        <Link href="/contact" className="navbar_link">
          Contact Us
        </Link>
        <Link
          href="#"
          className="navbar_link"
          onClick={(e) => {
            e.preventDefault();
            const section = document.querySelector(".feature-section");
            if (section) {
              section.scrollIntoView({ behavior: "smooth" });
            }
          }}
        >
          Features
        </Link>

        <button
          className="button_pri flexRow gap_4 flex_center"
          onClick={() => router.push("/register")}
        >
          Start Free <ArrowRight size={14} />
        </button>
      </nav>

      {/* Mobile Menu Icon */}
      <div className="navbar_menu_icon" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </div>

      {/* Fullscreen Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="navbar_fullscreen_menu flexClm flex_center"
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <button
              className="menu_close_btn"
              onClick={() => setMenuOpen(false)}
            >
              <X size={30} />
            </button>

            <div className="mobile_menu_links flexClm gap_24 font_18 font_weight_500">
              {["Dashboard", "Pricing", "About Us", "Features"].map((item) => (
                <Link
                  key={item}
                  href={`/${item.toLowerCase().replace(/\s/g, "")}`}
                  className="navbar_link mobile_nav_link"
                  onClick={() => setMenuOpen(false)}
                >
                  {item}
                </Link>
              ))}
              <button
                className="button_pri flexRow gap_4 flex_center"
                onClick={() => router.push("/register")}
              >
                Start Free <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
