"use client";

import Image from "next/image";
import React from "react";

const FullPageLoader = () => {
  return (
    <div
      className="fullpageLoader"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(20px)",
        zIndex: 9999,
      }}
    >
      <div className="spinner">
  
      </div>
    </div>
  );
};

export default FullPageLoader;
