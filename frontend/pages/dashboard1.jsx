"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Menu,
  Home as HomeIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
} from "lucide-react";

import Navbar from "@/components/Auth/Navbar";
import PNLChart from "@/components/Charts/PnlChart";

export default function Dashboard1(stats) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <div className="flexRow flexRow_stretch">
        <div
          className="flexRow gap_12 width100"
          style={{ padding: "24px 16px", background: "var(--white-4)" }}
        >
          {/* MENU TOGGLE (INSIDE SIDEBAR) */}
          <button
            onClick={() => setOpen(!open)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              width: "100%",
              display: "flex",
              maxWidth: "fit-content",
            }}
          >
            <Menu color="white" size={22} />
          </button>
          <div className="flexRow gap_12">
            <span>Journal</span>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* SIDEBAR */}
        <motion.div
          animate={{ width: open ? 250 : 60 }}
          transition={{ duration: 0.3 }}
          style={{
            background: "var(--white-4)",
            color: "white",
            height: "100%",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          <div
            style={{
              padding: "20px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* MENU ITEMS */}
            <div className="flexClm gap_24">
              {/* Home */}
              <div className="flexRow gap_12 ">
                <HomeIcon size={20} />
                {open && <span className="font_16">Home</span>}
              </div>

              {/* Trades */}
              <div className="flexRow gap_12 ">
                <TrendingUpIcon size={20} />
                {open && <span className="font_16">Trades</span>}
              </div>

              {/* Reports */}
              <div className="flexRow gap_12 ">
                <BarChartIcon size={20} />
                {open && <span className="font_16">Reports</span>}
              </div>

              {/* Settings */}
              <div className="flexRow gap_12 ">
                <SettingsIcon size={20} />
                {open && <span className="font_16">Settings</span>}
              </div>
            </div>
          </div>
        </motion.div>

        {/* RIGHT CONTENT */}
        <div
          style={{
            flex: 1,
            padding: "24px",
            overflowY: "auto",
            height: "100vh",
            background: "var(--base-bg)",
          }}
        >
          {" "}
          <PNLChart dailyData={stats.dailyData} />
        </div>
      </div>
    </div>
  );
}
