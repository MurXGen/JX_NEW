"use client";

import React, { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  User,
  Repeat,
  ChevronDown,
  Menu,
  Crown,
  User2Icon,
  Plus,
  BookTextIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";
import { getFromIndexedDB } from "@/utils/indexedDB";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const router = useRouter();

  const [darkMode, setDarkMode] = useState(false);
  const [userName, setUserName] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [hideAccountBox, setHideAccountBox] = useState(false);
  const [isFreePlan, setIsFreePlan] = useState(false);

  const [showDropdown, setShowDropdown] = useState(false);

  // ======== FETCH USER + ACCOUNT DATA (Unified) =========
  useEffect(() => {
    const init = async () => {
      const name = localStorage.getItem("userName");
      if (name) setUserName(name);

      // Theme
      const savedTheme = localStorage.getItem("theme") || "dark";
      document.body.setAttribute("data-theme", savedTheme);
      setDarkMode(savedTheme === "dark");

      // Hide account box on /accounts
      const pathname = window.location.pathname;
      if (pathname === "/accounts") {
        setHideAccountBox(true);
      }

      // Load result via utility
      const result = await fetchAccountsAndTrades();
      if (result.redirectToLogin) {
        router.push("/login");
        return;
      }

      setAccounts(result.accounts);

      // Retrieve selected account via cookies
      const accountId = Cookies.get("accountId");
      const account = result.accounts.find((acc) => acc._id === accountId);

      setSelectedAccount(account || result.accounts[0]);

      // Subscription check
      const userData = await getFromIndexedDB("userData");
      if (userData && userData.subscription) {
        const planId = userData.subscription.planId;
        if (planId === "free" || !planId) setIsFreePlan(true);
      } else {
        setIsFreePlan(true);
      }
    };

    init();
  }, [router]);

  // ======= CHANGE ACCOUNT (save cookie) ========
  const handleAccountClick = (accountId) => {
    try {
      Cookies.set("accountId", accountId, {
        path: "/",
        sameSite: "Strict",
        expires: 3560,
      });

      const acc = accounts.find((a) => a._id === accountId);
      setSelectedAccount(acc);
      setShowDropdown(false);

      router.push("/dashboard");
    } catch (err) {
      console.error("Error setting account cookie:", err);
    }
  };

  // ======= Create Account =======
  const handleCreateAccount = () => {
    router.push("/create-account");
  };

  const handleUpgradeClick = () => router.push("/pricing");

  return (
    <>
      <div className="flexRow flexRow_stretch gap_12">
        <div
          className="boxBg"
          onClick={() => router.push("/profile")}
          style={{ cursor: "pointer" }}
        >
          <User2Icon size={16} />
        </div>

        {/* LEFT SECTION (ACCOUNT DROPDOWN TRIGGER) */}
        <div
          className="boxBg width100 flexRow gap_12 flex_center"
          onClick={() => setShowDropdown((prev) => !prev)}
          style={{ cursor: "pointer" }}
        >
          {selectedAccount && !hideAccountBox && (
            <span className="font_16">{selectedAccount.name}</span>
          )}
          <ChevronDown size={16} />
        </div>

        {/* Free plan Crown */}
        {isFreePlan && (
          <div
            className="boxBg"
            onClick={handleUpgradeClick}
            style={{ cursor: "pointer" }}
          >
            <Crown size={16} className="vector" />
          </div>
        )}
      </div>

      {/* ======= DROPDOWN ACCOUNT LIST ======= */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            className="dropdown-nav account-dropdown"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {accounts.map((acc) => (
              <div
                key={acc._id}
                className="dropdown-item"
                onClick={() => handleAccountClick(acc._id)}
              >
                <BookTextIcon size={16} />
                <span>{acc.name}</span>
              </div>
            ))}

            <div className="dropdown-item create" onClick={handleCreateAccount}>
              <Plus size={16} />
              <span>Create new account</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
