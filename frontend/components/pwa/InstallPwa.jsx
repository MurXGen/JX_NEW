"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, Plus, X, Smartphone } from "lucide-react";
import { useInstallPrompt } from "./useInstallPrompt";

/* ---------- iOS "Add to Home Screen" instructions sheet ---------- */
function IosSheet({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay jx-modal-overlay--blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
          style={{ alignItems: "flex-end" }}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
            className="jx-ltmodal"
            style={{ width: "min(440px, 96vw)", margin: "0 auto var(--space-4)" }}
          >
            <div className="jx-ltmodal__header" style={{ alignItems: "center" }}>
              <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>Install JournalX</span>
              <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} aria-label="Close" style={{ padding: 8 }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: "var(--space-5) var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <p style={{ font: "var(--text-body)", color: "var(--color-text-muted)", margin: 0 }}>
                Add JournalX to your home screen to use it like a native app.
              </p>
              <Step n="1" icon={<Share size={18} />} text="Tap the Share button in Safari's toolbar." />
              <Step n="2" icon={<Plus size={18} />} text={'Choose "Add to Home Screen".'} />
              <Step n="3" icon={<Smartphone size={18} />} text={'Tap "Add" — JournalX appears on your home screen.'} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Step({ n, icon, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
      <span
        style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--color-bg-muted)", color: "var(--color-text-primary)",
        }}
      >
        {icon}
      </span>
      <span style={{ font: "var(--text-body)", color: "var(--color-text-primary)" }}>
        <strong style={{ color: "var(--yellow-500)" }}>{n}.</strong> {text}
      </span>
    </div>
  );
}

/* ---------- Desktop: sidebar install item ---------- */
export function SidebarInstallButton({ collapsed }) {
  const { showInstallUI, canInstall, isIOS, promptInstall } = useInstallPrompt();
  const [iosOpen, setIosOpen] = useState(false);
  if (!showInstallUI) return null;

  const onClick = () => {
    if (canInstall) promptInstall();
    else if (isIOS) setIosOpen(true);
  };

  return (
    <>
      <button
        className="jx-sidebar__item"
        onClick={onClick}
        title={collapsed ? "Install app" : undefined}
        style={{
          color: "var(--yellow-500)",
          border: "1px dashed color-mix(in srgb, var(--yellow-500) 50%, transparent)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <Download size={20} />
        {!collapsed && <span style={{ fontWeight: 600 }}>Install app</span>}
      </button>
      <IosSheet open={iosOpen} onClose={() => setIosOpen(false)} />
    </>
  );
}

/* ---------- Mobile: slim top banner ---------- */
export function MobileInstallBanner() {
  const { showInstallUI, canInstall, isIOS, promptInstall, dismiss } = useInstallPrompt();
  const [iosOpen, setIosOpen] = useState(false);
  if (!showInstallUI) return null;

  const onInstall = () => {
    if (canInstall) promptInstall();
    else if (isIOS) setIosOpen(true);
  };

  return (
    <>
      <motion.div
        className="jx-pwa-banner"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          display: "flex", alignItems: "center", gap: "var(--space-3)",
          padding: "10px 12px", marginBottom: "var(--space-2)",
          borderRadius: "var(--radius-md)",
          background: "linear-gradient(100deg, var(--yellow-400), var(--yellow-300))",
          color: "#1d1d1d", boxShadow: "0 6px 20px rgba(240,185,11,0.28)",
        }}
      >
        <span
          style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(29,29,29,0.12)",
          }}
        >
          <Download size={18} />
        </span>
        <span style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
          <span style={{ display: "block", fontWeight: 700, fontSize: 13 }}>Install JournalX</span>
          <span style={{ display: "block", fontSize: 11.5, opacity: 0.8 }}>Add to your home screen — fast, full-screen.</span>
        </span>
        <button
          onClick={onInstall}
          style={{
            flexShrink: 0, fontWeight: 700, fontSize: 13, cursor: "pointer",
            padding: "7px 14px", borderRadius: 999, border: "none",
            background: "#1d1d1d", color: "var(--yellow-300)",
          }}
        >
          Install
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{ flexShrink: 0, background: "transparent", border: "none", color: "#1d1d1d", cursor: "pointer", padding: 4, opacity: 0.7 }}
        >
          <X size={16} />
        </button>
      </motion.div>
      <IosSheet open={iosOpen} onClose={() => setIosOpen(false)} />
    </>
  );
}
