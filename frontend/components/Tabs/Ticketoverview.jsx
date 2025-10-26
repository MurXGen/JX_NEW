"use client";

import React from "react";
import TickerAnalysis from "./TicketAnalysis";
import TickerStats from "./TickerStats";
import SectionHeader from "../ui/SectionHeader";

const TickerOverview = ({ trades }) => {
  return (
    <div className="flexClm gap_24">
      <div className="flexClm gap_24">
        <SectionHeader
          title="Ticker Analysis"
          description="Ticker Analysis of your logged trades"
          level={2} // uses <h2>
          // showButton={accounts.length > 0}
          // buttonLabel="Create journal"
          // onButtonClick={handleCreateAccount}
          // loading={loading}
        />
        <TickerStats trades={trades} />
      </div>

      <hr width="100" color="grey" />

      <div className="flexClm gap_24">
        <SectionHeader
          title="Chart Analysis"
          description="Visual Analysis of your logged trades"
          level={2} // uses <h2>
          // showButton={accounts.length > 0}
          // buttonLabel="Create journal"
          // onButtonClick={handleCreateAccount}
          // loading={loading}
        />
        <TickerAnalysis trades={trades} />
      </div>
    </div>
  );
};

export default TickerOverview;
