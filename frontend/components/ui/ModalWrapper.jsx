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
            position: "absolute",
            top: "12px",
            right: "12px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: "6px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-70)",
            zIndex: "10000",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--hover-bg)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <X size={18} />
        </button>

        {children}
      </div>
    </div>
  );
};

export default ModalWrapper;
