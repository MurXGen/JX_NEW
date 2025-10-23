"use client";

import React from "react";
import TickerAnalysis from "./TicketAnalysis";
import TickerStats from "./TickerStats";

const TickerOverview = ({ trades }) => {
  return (
    <div className="flexClm gap_24">
      <TickerStats trades={trades} />
      <TickerAnalysis trades={trades} />
    </div>
  );
};

export default TickerOverview;
