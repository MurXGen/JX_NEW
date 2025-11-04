import React from "react";

const ModalWrapper = ({ onClose, children }) => {
  return (
    <div className="cm-backdrop flexCenter" onClick={onClose}>
      <div
        className="cm-modal pad_16"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "90%",
          maxWidth: 500,
          margin: "16px",
          background: "var(--white-4)",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ModalWrapper;
