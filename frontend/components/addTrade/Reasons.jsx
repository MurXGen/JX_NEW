import { useState } from "react";
import { X, Plus } from "lucide-react";

const predefinedReasons = ["Support", "Resistance", "Breakout", "Breakdown"];

const ReasonSelector = ({ label, name, value = [], onChange }) => {
  const [customReason, setCustomReason] = useState("");

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
    }
  };

  return (
    <div className="tradeGrid">
      <label className="label">{label}</label>

      {/* Predefined Options */}
      <div className="flexRow flexWrap gap_8 mb_8">
        {predefinedReasons.map((reason) => (
          <button
            key={reason}
            type="button"
            className={`reasonChip ${value.includes(reason) ? "selected" : ""}`}
            onClick={() => addReason(reason)}
          >
            {reason}
          </button>
        ))}
      </div>

      {/* Selected Reasons (Chips with cross) */}
      <div className="flexRow flexWrap gap_8 mb_8">
        {value.map((reason) => (
          <div key={reason} className="reasonTag">
            {reason}
            <X
              size={14}
              className="removeIcon"
              onClick={() => removeReason(reason)}
            />
          </div>
        ))}
      </div>

      {/* Custom Reason Input */}
      <div className="flexRow gap_4">
        <input
          type="text"
          className="input_small"
          value={customReason}
          onChange={(e) => setCustomReason(e.target.value)}
          placeholder="Enter custom reason"
        />
        <button
          type="button"
          className="button_small flexRow gap_4"
          onClick={handleAddCustom}
        >
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  );
};

export default ReasonSelector;
