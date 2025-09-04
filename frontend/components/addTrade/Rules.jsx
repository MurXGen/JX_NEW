import { Check, X } from "lucide-react";

const ToggleSwitch = ({ label, value, onToggle }) => {
  return (
    <div className="tradeGrid">
      <label className="label" style={{marginTop:'6px'}}>{label}</label>
      <div
        className={`toggleSwitch ${value ? "on" : "off"}`}
        onClick={onToggle}
        role="switch"
        aria-checked={value}
      >
        <div className="toggleCircle flexRow flex_center">
          {value ? (
            <Check color="green" size={14} />
          ) : (
            <X color="black" size={14} />
          )}
        </div>
        <span className="toggleLabel">{value ? "Yes" : "No"}</span>
      </div>
    </div>
  );
};

export default ToggleSwitch;
