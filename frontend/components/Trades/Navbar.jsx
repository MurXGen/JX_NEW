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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";
import { getFromIndexedDB } from "@/utils/indexedDB";
import Cookies from "js-cookie";

const Navbar = () => {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [userName, setUserName] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [hideAccountBox, setHideAccountBox] = useState(false);
  const [isFreePlan, setIsFreePlan] = useState(false);

  // ✅ Initialize theme + user data
  useEffect(() => {
    const init = async () => {
      const name = localStorage.getItem("userName");
      if (name) setUserName(name);

      // Load theme from localStorage
      const savedTheme = localStorage.getItem("theme") || "dark";
      document.body.setAttribute("data-theme", savedTheme);
      setDarkMode(savedTheme === "dark");

      // Hide account box if on /accounts page
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;
      if (
        (hostname === "journalx.app" || hostname === "localhost") &&
        pathname === "/accounts"
      ) {
        setHideAccountBox(true);
      }

      // Fetch account/trade data
      const { redirectToLogin, accounts: fetchedAccounts } =
        await fetchAccountsAndTrades();
      if (redirectToLogin) {
        router.push("/login");
        return;
      }
      setAccounts(fetchedAccounts);

      // Selected account
      const accountId = Cookies.get("accountId");
      const account = fetchedAccounts.find((acc) => acc._id === accountId);
      setSelectedAccount(account || fetchedAccounts[0]);

      // Check subscription plan
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

  // ✅ Toggle Dark Mode
  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      const theme = newMode ? "dark" : "light";
      document.body.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
      return newMode;
    });
  };

  const handleClick = () => router.push("/profile");
  const handleUpgradeClick = () => router.push("/pricing");

  return (
    <div className="navbarTrades flexRow flexRow_stretch">
      {/* Profile + Greeting */}
      <div
        className="flexRow gap_8 navbar_profile"
        onClick={handleClick}
        style={{ userSelect: "none", cursor: "pointer" }}
      >
        <Menu size={20} className="button_sec" />
        <div className="flexClm">
          <span className="font_12" style={{ color: "#ffffff80" }}>
            Hey hi,
          </span>
          <span
            className="font_16 flexRow gap_4 flex_center"
            style={{ fontWeight: 500 }}
          >
            {userName || "User"} <ChevronDown size={20} className="ml-2" />
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flexRow flex_center gap_12">
        {/* Account Switcher */}
        {selectedAccount && !hideAccountBox && (
          <div
            className="button_sec flexRow gap_8"
            onClick={() => router.push(`/accounts`)}
          >
            <span
              style={{
                maxWidth: "10ch",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                display: "inline-block",
                verticalAlign: "middle",
              }}
            >
              {selectedAccount.name}
            </span>
            <Repeat size={16} />
          </div>
        )}

        {/* Theme Toggle */}
        {/* <button
          onClick={toggleDarkMode}
          className="button_sec flex_center"
          style={{
            cursor: "pointer",
            borderRadius: "50%",
            transition: "all 0.3s ease",
          }}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? (
            <Sun size={18} className="text-yellow-400" />
          ) : (
            <Moon size={18} className="text-blue-400" />
          )}
        </button> */}

        {/* Upgrade for Free Plan */}
        {isFreePlan && (
          <div
            onClick={handleUpgradeClick}
            className="button_pri flexRow flex_center gap_8"
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Crown size={16} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
