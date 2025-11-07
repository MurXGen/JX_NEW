import React, { useState } from "react";
import { Crown, X } from "lucide-react";

const UpgradeButton = ({ label = "Upgrade", title = "Upgrade to Pro" }) => {
  const [showIframe, setShowIframe] = useState(false);

  return (
    <>
      <button className="upgrade_btn" onClick={() => setShowIframe(true)}>
        {label}
      </button>

      {showIframe && (
        <div className="modalOverlay" onClick={() => setShowIframe(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader flexRow flexRow_stretch">
              <h2 className="font_16 font_weight_600 flexRow gap_12">
                <Crown className="vector" />
                {title}
              </h2>
              {/* <X
                size={18}
                className="shade_60 cursor_pointer"
                onClick={() => setShowIframe(false)}
              /> */}
            </div>

            <iframe
              src="/pricing"
              title="Upgrade Pricing Page"
              className=""
              style={{ height: "100vh", width: "100%", border: "none" }}
            ></iframe>
          </div>
        </div>
      )}
    </>
  );
};

export default UpgradeButton;
