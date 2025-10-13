"use client";

import { motion } from "framer-motion";

const Skeleton = ({ message = "Loading..." }) => {
  return (
    <motion.div
      className="chart_boxBg"
      style={{ padding: "16px", marginBottom: "24px" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="skeletonContent flexRow flexRow_stretch">
        <div className="flexRow gap_12">
          {/* Skeleton Position Icon */}
          <div className="skeletonPositionIcon" />

          <div className="flexClm gap_8">
            {/* Skeleton Ticker Name */}
            <div className="skeletonTicker" />

            {/* Skeleton Time */}
            <div className="skeletonTime" />
          </div>
        </div>

        {/* Skeleton PnL */}
        <div className="skeletonPnl" />
      </div>

      {message && <div className="skeletonMessage">{message}</div>}
    </motion.div>
  );
};

export default Skeleton;
