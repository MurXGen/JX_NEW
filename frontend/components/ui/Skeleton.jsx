"use client";

import { motion } from "framer-motion";

const Skeleton = ({ message = "Loading..." }) => {
  return (
    <motion.div
      className="skeletonTradeCard"
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

      <style jsx>{`
        .skeletonTradeCard {
          padding: var(--px-16);
          background: var(--base-box-bg);
          border-radius: var(--px-12);
          margin-bottom: var(--px-8);
          border: 1px solid var(--white-10);
        }

        .skeletonContent {
          margin-bottom: ${message ? "var(--px-12)" : "0"};
        }

        .skeletonPositionIcon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(
            90deg,
            var(--white-10) 0%,
            var(--white-20) 50%,
            var(--white-10) 100%
          );
          background-size: 200% 100%;
          animation: skeletonPulse 1.5s ease-in-out infinite;
        }

        .skeletonTicker {
          width: 80px;
          height: 20px;
          background: linear-gradient(
            90deg,
            var(--white-10) 0%,
            var(--white-20) 50%,
            var(--white-10) 100%
          );
          background-size: 200% 100%;
          border-radius: var(--px-4);
          animation: skeletonPulse 1.5s ease-in-out infinite;
        }

        .skeletonTime {
          width: 60px;
          height: 16px;
          background: linear-gradient(
            90deg,
            var(--white-10) 0%,
            var(--white-20) 50%,
            var(--white-10) 100%
          );
          background-size: 200% 100%;
          border-radius: var(--px-4);
          animation: skeletonPulse 1.5s ease-in-out infinite;
        }

        .skeletonPnl {
          width: 50px;
          height: 20px;
          background: linear-gradient(
            90deg,
            var(--white-10) 0%,
            var(--white-20) 50%,
            var(--white-10) 100%
          );
          background-size: 200% 100%;
          border-radius: var(--px-4);
          animation: skeletonPulse 1.5s ease-in-out infinite;
        }

        .skeletonMessage {
          font-size: var(--px-12);
          color: var(--white-50);
          text-align: center;
        }

        @keyframes skeletonPulse {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default Skeleton;
