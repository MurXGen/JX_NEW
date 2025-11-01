"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const LegalLinks = () => {
  return (
    <motion.div
      className="flexClm flex_center gap_8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <p className="flexClm gap_4 font_14 flex_center">
        By continuing, you agree to our
        <div className="flexRow gap_12">
          <Link href="/terms-services" className="vector">
            Terms of Service
          </Link>
          {"|"}

          <Link href="/privacy-policy" className="vector">
            Privacy Policy
          </Link>
        </div>
      </p>
    </motion.div>
  );
};

export default LegalLinks;
