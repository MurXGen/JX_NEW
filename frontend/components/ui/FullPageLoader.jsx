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
        background: "var(--background, #fff)",
        zIndex: 9999,
      }}
    >
      <div className="loaderContent">
        <Image
          src="/assets/stock-market.gif"
          alt="Loading..."
          width={120}
          height={120}
          priority
        />
      </div>
    </div>
  );
};

export default FullPageLoader;
