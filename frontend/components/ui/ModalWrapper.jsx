import React from "react";

const ModalWrapper = ({ onClose, children }) => {
  return (
    <div
      className="modalOverlay flexCenter"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        className="modalContent bg_white pad_16 rounded_16 shadow_md"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "90%", maxWidth: 500 }}
      >
        {children}
      </div>
    </div>
  );
};

export default ModalWrapper;
