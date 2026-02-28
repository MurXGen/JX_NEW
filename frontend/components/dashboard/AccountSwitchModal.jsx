"use client";

import { X, PlusCircle } from "lucide-react";
import Cookies from "js-cookie";
import { motion } from "framer-motion";

export default function AccountSwitchModal({
  accounts,
  currentBalances,
  accountSymbols,
  onClose,
}) {
  const handleSwitch = (acc) => {
    Cookies.set("selectedAccount", acc._id, { expires: 365 });
    window.location.reload();
  };

  return (
    <motion.div
      className="modalOverlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="modalContent pad_16 flexClm gap_24"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
      >
        {/* Header */}
        <div
          className="flexRow flexRow_stretch modalHeader"
          style={{ padding: "12px 0" }}
        >
          <span className="font_14 font_weight_600">Switch Journal</span>
          <X
            size={20}
            className=""
            style={{ cursor: "pointer" }}
            onClick={onClose}
          />
        </div>

        {/* Journals list */}
        <div className="flexClm gap_12">
          {accounts.map((acc) => {
            const balance = currentBalances?.[acc.name] ?? 0;
            const symbol = accountSymbols?.[acc.name] ?? acc.currency ?? "¤";

            return (
              <button
                key={acc._id}
                className="secondary-btn primary-btn"
                onClick={() => handleSwitch(acc)}
              >
                <div className="flexRow flexRow_stretch">
                  <span className="font_14 font_weight_600 black-text">
                    {acc.name}
                  </span>

                  <span className="font_14 black-text">
                    <span>{balance.toFixed(2)}</span>{" "}
                    <span className="vector">{symbol}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Add new account */}
        <div
          className="flexRow direct_tertiary gap_12"
          onClick={() => (window.location.href = "/create-account")}
        >
          <PlusCircle size={14} />
          <span className="font_14 font_weight_400">Create New Journal</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
