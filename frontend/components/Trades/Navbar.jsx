"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon, User } from "lucide-react";

const Navbar = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const name = localStorage.getItem("userName");
    if (name) setUserName(name);

    const theme = document.body.getAttribute("data-theme");
    if (theme === "dark") setDarkMode(true);
  }, []);

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

      <button onClick={toggleDarkMode} className="button_ter flexRow ">
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </div>
  );
};

export default Navbar;
