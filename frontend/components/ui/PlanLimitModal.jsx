"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown } from "lucide-react";

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

const PlanLimitModal = ({ isOpen, onUpgrade, onKeep }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="cm-backdrop flex_center"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="chart_boxBg flexClm gap_20 flex_center"
            style={{
              padding: "28px",
              margin: "12px",
              maxWidth: "420px",
              width: "100%",
              textAlign: "center",
            }}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* GIF */}
            <img
              src="/assets/upgrade.gif"
              alt="Upgrade Required"
              width={140}
              height={140}
              style={{ objectFit: "contain" }}
            />

            {/* Heading */}
            <span className="font_20 font_weight_600">Plan Limit Reached</span>

            {/* Description */}
            <span className="font_14 shade_70">
              You’ve reached the limit for your current plan.
            </span>

            <span className="font_14 shade_60">
              Upgrade to unlock higher limits and continue growing your trading
              performance.
            </span>

            {/* Buttons */}
            <div
              className="flexRow gap_12 width100"
              style={{ marginTop: "8px" }}
            >
              <button
                className="secondary-btn primary-btn width100"
                onClick={onKeep}
              >
                Keep My Limits
              </button>

              <button
                className="upgrade_btn width100 flexRow gap_8 flex_center"
                onClick={onUpgrade}
              >
                <Crown size={16} color="white" />
                Upgrade Plan
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PlanLimitModal;
