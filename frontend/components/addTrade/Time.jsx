"use client";

import React from "react";
import OpenTime from "./OpenTime";
import CloseTime from "./CloseTime";

// Child Component 1
const Time = () => {
  return (
    <div className="flexRow gap_12">
      <div className="flexClm gap_12">
        <span className="font_14">Open Time</span>
        <OpenTime />
      </div>
      <div>
        <span className="font_14">Close Time</span>
        <CloseTime />
      </div>
    </div>
  );
};

export default Time;
