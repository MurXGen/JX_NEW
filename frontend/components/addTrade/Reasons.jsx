import { useState, useRef, useEffect } from "react";
import { X, Plus, Minus } from "lucide-react";

const predefinedReasons = ["Support", "Resistance", "Breakout", "Breakdown"];

const ReasonSelector = ({ label, name, value = [], onChange }) => {
  const [customReason, setCustomReason] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const inputRef = useRef(null);

  const addReason = (reason) => {
    if (reason && !value.includes(reason)) {
      onChange({ target: { name, value: [...value, reason] } });
    }
  };

  const removeReason = (reason) => {
    onChange({ target: { name, value: value.filter((r) => r !== reason) } });
  };

  const handleAddCustom = () => {
    if (customReason.trim()) {
      addReason(customReason.trim());
      setCustomReason("");
      setShowCustomInput(false);
    }
  };

  // Focus input when opened
  useEffect(() => {
    if (showCustomInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCustomInput]);

  // Combine predefined + custom (avoid duplicates)
  const allReasons = [
    ...predefinedReasons,
    ...value.filter((r) => !predefinedReasons.includes(r)),
  ];

  return (
    <div className="tradeGrid flexClm">
      {/* <label className="label">{label}</label> */}

      <div className="flexClm gap_32">
        {/* Reasons Row */}
        <div
          className="flexRow removeScrollBar gap_8"
          style={{ flexWrap: "wrap" }}
        >
          {allReasons.map((reason) => {
            const isSelected = value.includes(reason);
            return (
              <button
                key={reason}
                type="button"
                className={`button_ter flexRow flex_center gap_8 ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() =>
                  isSelected ? removeReason(reason) : addReason(reason)
                }
              >
                <span>{reason}</span>
                {isSelected && <X size={14} className="removeIcon" />}
              </button>
            );
          })}

          {/* Add / Toggle Input button */}
          <button
            type="button"
            className="button_ter flexRow flex_center gap_8"
            onClick={() => setShowCustomInput((prev) => !prev)}
          >
            {showCustomInput ? <Minus size={16} /> : <Plus size={16} />} Add
          </button>
        </div>

        {/* Custom input (only when Add is clicked) */}
        {showCustomInput && (
          <div className="flexRow gap_8">
            <input
              ref={inputRef}
              type="text"
              className="width100"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Enter custom reason"
            />
            <button
              type="button"
              className="button_pri flexRow flex_center gap_8"
              onClick={handleAddCustom}
            >
              <Plus size={16} /> Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReasonSelector;
