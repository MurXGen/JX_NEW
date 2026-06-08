"use client";

/* Shared nav + footer for the v2 marketing pages (landing, pricing).
   Uses the jx design tokens; theme-independent dark marketing skin. */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";

const NAV = [
  { label: "Features", href: "/#features" },
  { label: "Why JournalX", href: "/#why" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(13,17,23,0.72)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 20 }}>
        <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <span style={{ font: "700 20px/1 Poppins, sans-serif", color: "#fff", letterSpacing: "-0.5px" }}>
            Journal<span style={{ color: "#fcd535" }}>X</span>
          </span>
        </a>

        <nav className="lp-navlinks" style={{ display: "flex", gap: 24, marginLeft: 18 }}>
          {NAV.map((n) => (
            <a key={n.label} href={n.href} style={{ textDecoration: "none", color: "#aeb4bc", font: "500 14px Poppins, sans-serif" }}>
              {n.label}
            </a>
          ))}
        </nav>

        <div className="lp-navcta" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/login" style={{ textDecoration: "none", color: "#fff", font: "500 14px Poppins, sans-serif" }}>Log in</a>
          <a href="/register" style={{ textDecoration: "none" }}>
            <button style={btnPrimary}>Start free <ArrowRight size={15} /></button>
          </a>
        </div>

        <button className="lp-burger" onClick={() => setOpen((o) => !o)} aria-label="Menu" style={{ display: "none", marginLeft: "auto", background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.08)" }}
            className="lp-mobilemenu"
          >
            <div style={{ display: "flex", flexDirection: "column", padding: "12px 20px", gap: 4 }}>
              {NAV.map((n) => (
                <a key={n.label} href={n.href} onClick={() => setOpen(false)} style={{ textDecoration: "none", color: "#aeb4bc", font: "500 15px Poppins", padding: "10px 0" }}>{n.label}</a>
              ))}
              <a href="/login" style={{ textDecoration: "none", color: "#fff", font: "500 15px Poppins", padding: "10px 0" }}>Log in</a>
              <a href="/register" style={{ textDecoration: "none", marginTop: 6 }}>
                <button style={{ ...btnPrimary, width: "100%", justifyContent: "center" }}>Start free</button>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @media (max-width: 820px) {
          :global(.lp-navlinks), :global(.lp-navcta) { display: none !important; }
          :global(.lp-burger) { display: flex !important; }
        }
      `}</style>
    </header>
  );
}

export function LandingFooter() {
  const cols = [
    { h: "Product", links: [["Features", "/#features"], ["Pricing", "/pricing"], ["Blog", "/blog"], ["Log in", "/login"]] },
    { h: "Company", links: [["Contact", "/contact"], ["Start free", "/register"]] },
    { h: "Legal", links: [["Privacy Policy", "/privacy-policy"], ["Terms of Service", "/terms-services"], ["Refund Policy", "/refund-policy"], ["Risk Disclaimer", "/risk-disclaimer"], ["Cookie Policy", "/cookie-policy"]] },
  ];
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "#0b0e13" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "48px 20px 28px", display: "grid", gridTemplateColumns: "1.4fr repeat(3, 1fr)", gap: 32 }} className="lp-footer-grid">
        <div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <span style={{ font: "700 19px Poppins", color: "#fff", letterSpacing: "-0.5px" }}>Journal<span style={{ color: "#fcd535" }}>X</span></span>
          </div>
          <p style={{ font: "400 14px/1.6 Poppins", color: "#707a8a", maxWidth: 280 }}>
            The trading journal that turns your trade history into a measurable edge.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <div style={{ font: "600 13px Poppins", color: "#fff", marginBottom: 12, letterSpacing: 0.4 }}>{c.h}</div>
            {c.links.map(([l, h]) => (
              <a key={l} href={h} style={{ display: "block", textDecoration: "none", color: "#707a8a", font: "400 14px Poppins", padding: "6px 0" }}>{l}</a>
            ))}
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "16px 20px 32px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span style={{ font: "400 13px Poppins", color: "#5b6573" }}>© {new Date().getFullYear()} JournalX. All rights reserved.</span>
        <span style={{ font: "400 13px Poppins", color: "#5b6573" }}>Built for traders, by traders.</span>
      </div>
      <style jsx>{`
        @media (max-width: 820px) {
          :global(.lp-footer-grid) { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 520px) {
          :global(.lp-footer-grid) { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}

export const btnPrimary = {
  display: "inline-flex", alignItems: "center", gap: 8,
  background: "#fcd535", color: "#1e2329", border: "none",
  borderRadius: 12, padding: "11px 20px", cursor: "pointer",
  font: "600 14px Poppins, sans-serif", whiteSpace: "nowrap",
};
export const btnGhost = {
  display: "inline-flex", alignItems: "center", gap: 8,
  background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 12, padding: "11px 20px", cursor: "pointer",
  font: "600 14px Poppins, sans-serif", whiteSpace: "nowrap",
};
