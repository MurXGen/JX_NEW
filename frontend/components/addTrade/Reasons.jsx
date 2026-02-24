import { useState, useRef, useEffect } from "react";
import { X, Plus, Minus } from "lucide-react";

const predefinedReasons = ["Support", "Resistance", "Breakout", "Breakdown"];
const STORAGE_KEY = "trade_reasons";

const ReasonSelector = ({ label, name, value = [], onChange }) => {
  const [customReason, setCustomReason] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [storedReasons, setStoredReasons] = useState([]);
  const inputRef = useRef(null);

  /* ----------------------------------
     Load reasons from localStorage
  ---------------------------------- */
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    setStoredReasons(saved);
  }, []);

  /* ----------------------------------
     Persist reasons to localStorage
  ---------------------------------- */
  const saveToStorage = (reasons) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reasons));
    setStoredReasons(reasons);
  };

  const addReason = (reason) => {
    if (!reason) return;

    // Add to selected
    if (!value.includes(reason)) {
      onChange({ target: { name, value: [...value, reason] } });
    }

    // Add to storage if new
    if (
      !predefinedReasons.includes(reason) &&
      !storedReasons.includes(reason)
    ) {
      saveToStorage([...storedReasons, reason]);
    }
  };

  const removeReason = (reason) => {
    onChange({
      target: { name, value: value.filter((r) => r !== reason) },
    });
  };

  const handleAddCustom = () => {
    const trimmed = customReason.trim();
    if (!trimmed) return;

    addReason(trimmed);
    setCustomReason("");
    setShowCustomInput(false);
  };

  /* ----------------------------------
     Focus input when opened
  ---------------------------------- */
  useEffect(() => {
    if (showCustomInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCustomInput]);

  /* ----------------------------------
     Merge predefined + stored
  ---------------------------------- */
  const allReasons = [
    ...predefinedReasons,
    ...storedReasons.filter((r) => !predefinedReasons.includes(r)),
  ];

  return (
    <div className="tradeGrid flexClm reasonContainer">
      <div className="flexClm gap_12">
        {/* Reasons */}
        <div
          className="flexRow removeScrollBar gap_8"
          style={{
            flexWrap: "wrap",
            borderBottom: "1px solid var(--black-10)",
            paddingBottom: "12px",
          }}
        >
          {allReasons.map((reason) => {
            const isSelected = value.includes(reason);
            return (
              <button
                key={reason}
                type="button"
                className={`secondary-btn primary-btn flexRow flex_center gap_8 ${
                  isSelected ? "active" : ""
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
        </div>

        {/* Add button */}
        <button
          type="button"
          className="btn flexRow gap_4"
          onClick={() => setShowCustomInput((p) => !p)}
        >
          {showCustomInput ? <Minus size={16} /> : <Plus size={16} />} Add
        </button>

        {/* Custom Input */}
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
              className="primary-btn flexRow flex_center gap_8"
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
