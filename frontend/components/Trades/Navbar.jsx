"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon, User, Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchAccountsAndTrades } from "@/utils/fetchAccountAndTrades";
import Cookies from "js-cookie";

const Navbar = () => {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [userName, setUserName] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [hideAccountBox, setHideAccountBox] = useState(false);

  useEffect(() => {
    const init = async () => {
      const name = localStorage.getItem("userName");
      if (name) setUserName(name);

      const theme = document.body.getAttribute("data-theme");
      if (theme === "dark") setDarkMode(true);

      // Hide account box if on /accounts page on specific hosts
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;
      if (
        (hostname === "journalx.app" || hostname === "localhost") &&
        pathname === "/accounts"
      ) {
        setHideAccountBox(true);
      }

      const { redirectToLogin, accounts: fetchedAccounts } =
        await fetchAccountsAndTrades();
      if (redirectToLogin) {
        router.push("/login");
        return;
      }

      setAccounts(fetchedAccounts);

      // Get selected account from cookie
      const accountId = Cookies.get("accountId");
      const account = fetchedAccounts.find((acc) => acc._id === accountId);
      setSelectedAccount(account || fetchedAccounts[0]); // fallback to first account
    };

    init();
  }, [router]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      document.body.setAttribute("data-theme", newMode ? "light" : "dark");
      return newMode;
    });
  };

  return (
    <div className="navbarTrades flexRow flexRow_stretch">
      <div className="flexRow gap_8">
        <User size={20} className="button_sec" />
        <div className="flexClm">
          <span className="font_12" style={{ color: "#ffffff80" }}>
            Hey hi,
          </span>
          <span className="font_16" style={{ fontWeight: "500" }}>
            {userName || "User"}
          </span>
        </div>
      </div>

      <div className="flexRow flex_center gap_12">
        {/* Selected Account Box (conditionally hidden) */}
        {selectedAccount && !hideAccountBox && (
          <div
            className="button_sec flexRow gap_8"
            style={{ padding: "12px" }}
            onClick={() => router.push(`/accounts`)}
          >
            <span>{selectedAccount.name}</span>
            <Repeat size={16} />
          </div>
        )}

        <div className="view-toggle flexRow gap_8">
          <button
            onClick={toggleDarkMode}
            className="toggle-btn flexRow flex_center"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
