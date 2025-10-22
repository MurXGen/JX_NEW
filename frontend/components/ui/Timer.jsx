"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Dropdown from "./Dropdown";
import { ChevronDown, ChevronUp } from "lucide-react";

// Helper: ordinal for date
const getOrdinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

// Options for timezone dropdown
const TIMEZONE_OPTIONS = [
  { label: "Default", value: "local" },
  { label: "New York", value: "America/New_York" },
  { label: "London", value: "Europe/London" },
];

const Timer = () => {
  const [date, setDate] = useState(new Date());
  const [hourFormat, setHourFormat] = useState(
    localStorage.getItem("hourFormat") || "24"
  );
  const [timezone, setTimezone] = useState(
    localStorage.getItem("timezone") || "local"
  );
  const [showDropdowns, setShowDropdowns] = useState(false);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Persist settings
  useEffect(() => localStorage.setItem("hourFormat", hourFormat), [hourFormat]);
  useEffect(() => localStorage.setItem("timezone", timezone), [timezone]);

  const formatDate = (d) => {
    const options = {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: timezone === "local" ? undefined : timezone,
    };
    const localeDate = new Intl.DateTimeFormat("en-US", options).format(d);
    const dayNum = d.toLocaleString("en-US", {
      day: "numeric",
      timeZone: timezone === "local" ? undefined : timezone,
    });
    return localeDate.replace(dayNum, `${dayNum}${getOrdinal(Number(dayNum))}`);
  };

  const getTimeParts = (d) => {
    const options = {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: hourFormat === "12",
      timeZone: timezone === "local" ? undefined : timezone,
    };
    const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(d);
    const timeObj = {};
    parts.forEach((p) => {
      if (p.type === "hour") timeObj.hour = p.value;
      if (p.type === "minute") timeObj.minute = p.value;
      if (p.type === "second") timeObj.second = p.value;
      if (p.type === "dayPeriod") timeObj.period = p.value;
    });
    return timeObj;
  };

  const { hour, minute, second, period } = getTimeParts(date);
  const dateString = formatDate(date);

  const digitVariants = {
    initial: { y: 10, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -10, opacity: 0 },
  };

  return (
    <div
      className="chart_boxBg "
      style={{ padding: "16px", alignItems: "flex-start" }}
    >
      <div className="flexRow flexRow_stretch gap_12">
        <div className="flexClm gap_4">
          {/* Date */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <span className="font_14 font_weight_600 shade_50">
              {dateString}
            </span>
          </motion.div>

          {/* Time */}
          <div className="flexRow gap_4 font_16">
            <AnimatePresence mode="wait">
              <motion.span
                key={hour}
                variants={digitVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.25 }}
              >
                {hour}
              </motion.span>
            </AnimatePresence>
            :
            <AnimatePresence mode="wait">
              <motion.span
                key={minute}
                variants={digitVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.25 }}
              >
                {minute}
              </motion.span>
            </AnimatePresence>
            :
            <AnimatePresence mode="wait">
              <motion.span
                key={second}
                variants={digitVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.25 }}
              >
                {second}
              </motion.span>
            </AnimatePresence>
            {hourFormat === "12" && <span className="ml-1">{period}</span>}
          </div>
        </div>

        {/* Add Trade Button + 3-dot menu */}
        <div className="flexRow gap_8">
          <button
            className="button_pri"
            style={{ width: "fit-content" }}
            onClick={() => (window.location.href = "/add-trade")}
          >
            Log Trade
          </button>

          <button
            className="button_sec"
            style={{ width: "fit-content" }}
            onClick={() => setShowDropdowns((prev) => !prev)}
          >
            {showDropdowns && <ChevronUp size={14} />}

            {!showDropdowns && <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {showDropdowns && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flexRow gap_12 width100"
            style={{ marginTop: 12 }}
          >
            <Dropdown
              options={TIMEZONE_OPTIONS}
              value={timezone}
              onChange={setTimezone}
            />
            <Dropdown
              options={[
                { label: "12 Hour", value: "12" },
                { label: "24 Hour", value: "24" },
              ]}
              value={hourFormat}
              onChange={setHourFormat}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Timer;
