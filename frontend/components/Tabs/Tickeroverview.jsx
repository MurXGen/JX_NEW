"use client";

import React from "react";
import TickerAnalysis from "./TickerAnalysis";
import TickerStats from "./TickerStats";
import SectionHeader from "../ui/SectionHeader";

const TickerOverview = ({ trades }) => {
  return (
    <div className="flexClm gap_24">
      <div className="flexClm gap_24">
        <TickerStats trades={trades} />
        <div className="flexClm gap_24">
          <TickerAnalysis trades={trades} />
        </div>
      </div>
    </div>
  );
};

export default TickerOverview;
