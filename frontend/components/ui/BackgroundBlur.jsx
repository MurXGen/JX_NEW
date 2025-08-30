import React from "react";

const BackgroundBlur = () => {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        overflow: "hidden",
      }}
    >
      {/* Top-left blurred box */}
      <div
        style={{
          position: "absolute",
          top: "-200px",
          left: "-200px",
          width: "300px",
          height: "300px",
          background: "#A77D0233",
          filter: "blur(100px)",
        }}
      />

      {/* Bottom-right blurred box */}
      <div
        style={{
          position: "absolute",
          bottom: "-200px",
          right: "-200px",
          width: "300px",
          height: "300px",
          background: "#A77D0233",
          filter: "blur(100px)",
        }}
      />
    </div>
  );
};

export default BackgroundBlur;
