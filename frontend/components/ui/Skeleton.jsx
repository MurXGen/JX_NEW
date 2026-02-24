"use client";

import { motion } from "framer-motion";

const Skeleton = ({ message = "Loading..." }) => {
  return (
    <motion.div
      className="chart_boxBg flexClm flex_center"
      style={{
        padding: "24px",
        marginBottom: "24px",
        minHeight: "140px",
        textAlign: "center",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Small GIF Loader */}
      <img
        src="/assets/trade-skeleton.gif"
        alt="Loading"
        width={60}
        height={60}
        style={{ objectFit: "contain" }}
      />

      {message && (
        <span className="font_14 shade_60" style={{ marginTop: "12px" }}>
          {message}
        </span>
      )}
    </motion.div>
  );
};

export default Skeleton;
