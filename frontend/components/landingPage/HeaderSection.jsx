import React from "react";

const HeaderSection = ({
  title,
  subtitle,
  align = "center",
  glowLight = true,
}) => {
  return (
    <header
      className={`header-section mrgin_tp_100 ${
        align === "center" ? "center" : ""
      }`}
      aria-label={title}
    >
      {glowLight && <div className="glow-light" aria-hidden="true"></div>}

      <div className="content">
        <h2 className="font_24 marg_0">{title}</h2>

        {subtitle && (
          <p className="font_14 marg_0" style={{ opacity: "0.5" }}>
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
};

export default HeaderSection;
