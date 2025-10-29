import React from "react";

const HeaderSection = ({ title, subtitle, align = "center" }) => {
  return (
    <div
      className={`header-section mrgin_tp_100 ${
        align === "center" ? "center" : ""
      }`}
    >
      <div className="glow-light"></div>
      <div className="content">
        <h2 className="font_32 marg_0">{title}</h2>
        {subtitle && <p className="font_16 marg_0 shade_50">{subtitle}</p>}
      </div>
    </div>
  );
};

export default HeaderSection;
