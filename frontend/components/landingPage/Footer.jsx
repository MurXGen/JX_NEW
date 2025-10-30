"use client";
import Link from "next/link";
import Image from "next/image";
import { Mail, Twitter, Linkedin, Globe, ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer_container mrgin_tp_100 pad_32 flexClm gap_24">
      <div className="footer_inner">
        {/* Logo & Tagline */}
        <div className="footer_brand">
          <Link href="/">
            <Image
              src="/assets/journalx_navbar.svg"
              alt="JournalX Logo"
              width={120}
              height={40}
              priority
            />
          </Link>
          <p className="footer_tagline">
            JournalX empowers traders to analyze, improve, and stay profitable —
            one trade at a time.
          </p>
        </div>

        <div className="gridContainer">
          {/* Navigation Links */}
          <div className="footer_links">
            <h4>Quick Links</h4>
            <ul>
              {[
                { href: "/dashboard", text: "Dashboard" },
                { href: "/accounts", text: "Accounts" },
                { href: "/add-trade", text: "Add Trade" },
                { href: "/pricing", text: "Pricing" },
                { href: "/contact-us", text: "Contact Us" },
              ].map((link, i) => (
                <li key={i} className="footer_link_item flexRow gap_4 shade_50">
                  <Link href={link.href} className="footer_link_hover">
                    {link.text}
                    <ArrowUpRight className="arrow_icon" size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="footer_links">
            <h4>Legal</h4>
            <ul>
              {[
                { href: "/privacy-policy", text: "Privacy Policy" },
                { href: "/refund-policy", text: "Refund Policy" },
                { href: "/terms-services", text: "Terms of Service" },
              ].map((link, i) => (
                <li key={i} className="footer_link_item flexRow gap_4 shade_50">
                  <Link href={link.href} className="footer_link_hover">
                    {link.text}
                    <ArrowUpRight className="arrow_icon" size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Social */}
          <div className="footer_contact">
            <h4>Connect</h4>
            <ul className="shade_50">
              <li className="flexRow flex_align_center gap_8">
                <Mail size={16} />{" "}
                <a href="mailto:support@journalx.app">support@journalx.app</a>
              </li>
              <li className="flexRow flex_align_center gap_8">
                <Globe size={16} />{" "}
                <a href="https://journalx.app" target="_blank">
                  journalx.app
                </a>
              </li>
              <li className="flexRow flex_align_center gap_8">
                <Twitter size={16} /> <a href="#">Twitter</a>
              </li>
              <li className="flexRow flex_align_center gap_8">
                <Linkedin size={16} /> <a href="#">LinkedIn</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer_bottom">
        <p>© {new Date().getFullYear()} JournalX. All rights reserved.</p>
      </div>
    </footer>
  );
}
