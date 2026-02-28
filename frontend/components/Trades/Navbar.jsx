"use client";

import React, { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Crown,
  Plus,
  BookTextIcon,
  ListFilterIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";
import { getFromIndexedDB } from "@/utils/indexedDB";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const router = useRouter();

  // Initialize theme synchronously
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") || "dark";
      // Apply to both html and body immediately
      document.documentElement.setAttribute("data-theme", savedTheme);
      document.body.setAttribute("data-theme", savedTheme);
      return savedTheme === "dark";
    }
    return false;
  });

  const [userName, setUserName] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [hideAccountBox, setHideAccountBox] = useState(false);
  const [isFreePlan, setIsFreePlan] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Theme toggle function
  const toggleTheme = () => {
    const newTheme = !darkMode ? "dark" : "light";
    setDarkMode(!darkMode);

    // Update both html and body
    document.documentElement.setAttribute("data-theme", newTheme);
    document.body.setAttribute("data-theme", newTheme);

    // Update class for any legacy CSS
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }

    localStorage.setItem("theme", newTheme);
  };

  // ======== FETCH USER + ACCOUNT DATA =========
  useEffect(() => {
    const init = async () => {
      const name = localStorage.getItem("userName");
      if (name) setUserName(name);

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

  // ======= CHANGE ACCOUNT ========
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
      window.location.reload();
      router.push("/dashboard");
    } catch (err) {
      console.error("Error setting account cookie:", err);
    }
  };

  const handleCreateAccount = () => {
    router.push("/create-account");
  };

  const handleUpgradeClick = () => router.push("/pricing");

  return (
    <>
      <div
        className="flexRow flexRow_stretch gap_4"
        style={{
          marginTop: "8px",
          position: "relative",
          zIndex: 100,
        }}
      >
        <div className="flexRow gap_12">
          <div
            className="boxBg"
            onClick={() => router.push("/accounts")}
            style={{ cursor: "pointer", padding: "12px 16px" }}
          >
            <ListFilterIcon size={16} />
          </div>
          <div className="flexClm">
            <span className="font_20">Dashboard</span>
          </div>
        </div>

        {/* Right section with theme toggle */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          {/* Theme Toggle */}
          <div
            className="boxBg"
            onClick={toggleTheme}
            style={{
              cursor: "pointer",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            <span className="font_14">{darkMode ? "Light" : "Dark"}</span>
          </div>

          {/* Free plan Crown */}
          {isFreePlan && (
            <div
              className="boxBg"
              onClick={handleUpgradeClick}
              style={{ cursor: "pointer", padding: "12px 16px" }}
            >
              <Crown size={16} className="vector" />
            </div>
          )}
        </div>
      </div>

      {/* Account Dropdown */}
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
