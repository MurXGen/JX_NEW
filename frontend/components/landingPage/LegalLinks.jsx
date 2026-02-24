"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const LegalLinks = () => {
  return (
    <motion.div
      className="LegalLinks"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div
        className="flexClm gap_4 flex_center black-text"
        style={{ fontSize: "10px" }}
      >
        <span>By continuing, you agree to our</span>
        <div className="flexRow gap_12">
          <Link
            href="/terms-services"
            className="tertiary-btn "
            style={{ fontSize: "10px" }}
          >
            Terms of Service
          </Link>
          <span>|</span>
          <Link
            href="/privacy-policy"
            className="tertiary-btn "
            style={{ fontSize: "10px" }}
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default LegalLinks;
