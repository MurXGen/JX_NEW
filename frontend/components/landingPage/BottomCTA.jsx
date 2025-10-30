"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export default function BottomCTA() {
  const [showCTA, setShowCTA] = useState(true);
  return (
    <AnimatePresence>
      {showCTA && (
        <motion.div
          className="landingBody flexClm flex_center"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div
            className="flexRow_mobile gap_24 flexRow_stretch width100"
            style={{
              minWidth: "300px",
              maxWidth: "720px",
              margin: "100px 0px auto",
            }}
          >
            <div className="flexRow gap_12 ">
              <Sparkles size={22} className="vector" />
              <span className="flexClm gap_4">
                <strong>Level up your trading game!</strong>
                <span className="font_12">
                  Start journaling smarter with <span>JournalX.app</span> —
                  built by traders, for traders.
                </span>
              </span>
            </div>

            <a
              href="https://journalx.app/register"
              className="cta_btn flexRow button_pri"
              style={{ maxWidth: "fit-content", textDecoration: "none" }}
              aria-label="Start journaling on JournalX"
            >
              Start Using JournalX <ArrowRight size={18} />
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
