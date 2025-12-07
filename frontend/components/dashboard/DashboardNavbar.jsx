"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  User,
  PlusCircle,
  ArrowRightLeft,
  Plus,
} from "lucide-react";
import Cookies from "js-cookie";
import AccountSwitchModal from "./AccountSwitchModal";
import { fetchAccountsAndTrades } from "../../utils/fetchAccountAndTrades";

export default function DashboardNavbar({ currentAccount }) {
  const [showModal, setShowModal] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [currentBalances, setCurrentBalances] = useState({});
  const [accountSymbols, setAccountSymbols] = useState({});

  useEffect(() => {
    const loadData = async () => {
      const result = await fetchAccountsAndTrades();

      if (!result.redirectToLogin) {
        setAccounts(result.accounts);
        setCurrentBalances(result.currentBalances);
        setAccountSymbols(result.accountSymbols);
      }
    };

    loadData();
  }, []);

  return (
    <>
      {/* NAVBAR */}
      <div className="flexRow flexRow_stretch">
        {/* LEFT – Account Switcher */}
        <div
          className="flexRow gap_4 boxBg"
          style={{ cursor: "pointer", padding: "6px 12px" }}
          onClick={() => setShowModal(true)}
        >
          <span className="font_14 font_weight_600">
            {currentAccount?.name || "Select Account"}
          </span>
          <ArrowRightLeft size={18} className="vector" />
        </div>

        <div className="flexRow gap_12">
          {/* CENTER – Log trade */}
          <button
            className="button_pri flexRow gap_4"
            style={{ padding: "6px 12px" }}
            onClick={() => (window.location.href = "/add-trade")}
          >
            <Plus size={20} />
            <span className="font_12 font_weight_500">Log trade</span>
          </button>

          {/* RIGHT – Profile */}
          <div
            className="flexRow gap_12 boxBg"
            style={{ cursor: "pointer", padding: "6px 12px" }}
          >
            <User size={20} />
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <AccountSwitchModal
          accounts={accounts}
          currentBalances={currentBalances}
          accountSymbols={accountSymbols}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
