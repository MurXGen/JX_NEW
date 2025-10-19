"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, X } from "lucide-react";

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
          className="cm-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="chart_boxBg flexClm gap_24"
            style={{ padding: "24px", margin: "12px", maxWidth: "400px" }}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="cm-header flexRow flex_between">
              <span className="font_20 font_weight_600">
                Plan Limit Reached
              </span>
            </div>

            <div>
              <span className="font_14">
                You’ve reached the limit for your current plan. Upgrade to enjoy
                higher limits or keep your current limits.
              </span>
            </div>

            <div className="flexRow gap_12">
              <button className="button_sec width100" onClick={onKeep}>
                Keep my limits
              </button>
              <button
                className="upgrade_btn width100 flexRow gap_8 flex_center"
                onClick={onUpgrade}
              >
                <Crown size={16} className="vector" />
                Upgrade Limit
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PlanLimitModal;
