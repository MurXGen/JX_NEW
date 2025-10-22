"use client";

import React, { useState, useEffect } from "react";
import TickerAnalysis from "./TicketAnalysis";

const TickerOverview = ({ trades }) => {
  return (
    <div>
      <TickerAnalysis trades={trades} />
    </div>
  );
};

export default TickerOverview;
