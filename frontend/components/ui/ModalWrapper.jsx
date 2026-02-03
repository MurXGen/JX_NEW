import React from "react";
import { X } from "lucide-react";

const ModalWrapper = ({ onClose, children }) => {
  return (
    <div
      className="cm-backdrop flexCenter"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
      }}
    >
      <div
        className="cm-modal pad_16 removeScrollbar"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "90%",
          maxWidth: 500,
          margin: "16px",
          background: "var(--base-bg)",
          position: "relative", // 🔑 for close button positioning
          borderRadius: "12px",
        }}
      >
        {/* ❌ Close Icon */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: "fixed",
            bottom: "46px",
            left: "50%",
            transform: "translateX(-50%)",
            border: "none",
            background: "var(--primary-50)",
            cursor: "pointer",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--base-text)",
            zIndex: 10000,
            width: "36px",
            height: "36px",
          }}
        >
          <X size={18} />
        </button>

        {children}
      </div>
    </div>
  );
};

export default ModalWrapper;
