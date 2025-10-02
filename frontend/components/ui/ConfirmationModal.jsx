"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const modalVariants = {
  hidden: { opacity: 0, y: -30, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="cm-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="chart_boxBg flexClm gap_24"
            style={{ padding: "24px", margin: "12px" }}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="cm-header">
              <span className="font_20">{title || "Confirm Action"}</span>
            </div>

            <div className="">
              <span className="font_14">
                {message || "Are you sure you want to proceed?"}
              </span>
            </div>

            <div className="flexRow gap_12">
              <button className="button_sec width100" onClick={onCancel}>
                Cancel
              </button>
              <button
                className="button_pri"
                style={{ background: "var(--error)" }}
                onClick={onConfirm}
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
