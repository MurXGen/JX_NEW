"use client";

/* SettingsModal — opens the tabbed Settings panel as a glassmorphic dialog
   (reuses the Log-trade modal's glass shell), like Claude's settings. */

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import SettingsPanel from "./SettingsPanel";

export default function SettingsModal({ open, user, onClose }) {
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
        >
          <motion.div
            className="jx-ltmodal jx-settings-modal"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <button
              className="jx-btn jx-btn--secondary jx-btn--sm"
              onClick={onClose}
              aria-label="Close settings"
              style={{ position: "absolute", top: 14, right: 14, padding: 8, zIndex: 2 }}
            >
              <X size={16} />
            </button>
            <div className="jx-settings-modal__body">
              <SettingsPanel user={user} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
