import { useEffect, useState, useCallback, useRef } from "react";
import { Check, X } from "lucide-react";

const DEFAULT_RULE = "Took trade on my zone";
const STORAGE_KEY = "trade_rules";

const RulesManager = ({ onRulesStatusChange }) => {
  const [rules, setRules] = useState([]);
  const initialLoadRef = useRef(true);
  const onRulesStatusChangeRef = useRef(onRulesStatusChange);

  // Update ref when onRulesStatusChange changes
  useEffect(() => {
    onRulesStatusChangeRef.current = onRulesStatusChange;
  }, [onRulesStatusChange]);

  // Load rules from localStorage on mount
  useEffect(() => {
    const loadRules = () => {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (stored && stored.length > 0) {
          setRules(stored);
        } else {
          const defaultRule = [
            {
              text: DEFAULT_RULE,
              checked: false,
              saved: true,
              isEditing: false,
            },
          ];
          setRules(defaultRule);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultRule));
        }
      } catch (error) {
        console.error("Error loading rules from localStorage:", error);
        // Fallback to default rule if there's an error
        const defaultRule = [
          {
            text: DEFAULT_RULE,
            checked: false,
            saved: true,
            isEditing: false,
          },
        ];
        setRules(defaultRule);
      }
    };

    loadRules();
  }, []);

  // Save rules to localStorage whenever they change
  useEffect(() => {
    // Skip the first save if it's the initial load
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    if (rules.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    }

    // Check if all rules are checked
    const allChecked = rules.length > 0 && rules.every((rule) => rule.checked);
    onRulesStatusChangeRef.current(allChecked);

    // Debug: Log when rules change
    console.log("Rules updated:", rules);
  }, [rules]);

  const handleAddRule = useCallback(() => {
    setRules((prevRules) => [
      ...prevRules,
      {
        text: "",
        checked: false,
        saved: false,
        isEditing: true,
      },
    ]);
  }, []);

  const handleChange = useCallback((index, value) => {
    setRules((prevRules) => {
      const updated = [...prevRules];
      updated[index].text = value;
      return updated;
    });
  }, []);

  const handleSave = useCallback((index) => {
    setRules((prevRules) => {
      if (!prevRules[index].text.trim()) return prevRules;

      const updated = [...prevRules];
      updated[index].saved = true;
      updated[index].isEditing = false;
      return updated;
    });
  }, []);

  const handleDelete = useCallback((index) => {
    setRules((prevRules) => prevRules.filter((_, i) => i !== index));
  }, []);

  const toggleCheckbox = useCallback((index) => {
    console.log("Toggling checkbox for index:", index); // Debug log

    setRules((prevRules) => {
      const updated = [...prevRules];
      updated[index] = {
        ...updated[index],
        checked: !updated[index].checked,
      };
      console.log("Updated rule:", updated[index]); // Debug log
      return updated;
    });
  }, []);

  const enableEdit = useCallback((index) => {
    setRules((prevRules) => {
      const updated = [...prevRules];
      updated[index] = {
        ...updated[index],
        isEditing: true,
        saved: false,
      };
      return updated;
    });
  }, []);

  // Add a direct click handler for debugging
  const handleCheckboxClick = useCallback(
    (index, e) => {
      console.log(
        "Checkbox clicked for index:",
        index,
        "Current checked:",
        rules[index]?.checked,
      );
      toggleCheckbox(index);
    },
    [rules, toggleCheckbox],
  );

  return (
    <div className="rulesContainer flexClm">
      {rules.map((rule, index) => (
        <div key={index} className="flexClm ruleItem">
          <label className="black-text font_14">Rule {index + 1}</label>

          <div className="flexRow gap_12" style={{ alignItems: "center" }}>
            {/* Checkbox - Fixed */}
            {rule.saved && (
              <input
                type="checkbox"
                checked={rule.checked}
                onChange={() => toggleCheckbox(index)} // Simplified - no e parameter needed
                onClick={(e) => {
                  // Stop propagation but still allow the onChange to fire
                  e.stopPropagation();
                }}
                style={{
                  cursor: "pointer",
                  width: "18px",
                  height: "18px",
                  accentColor: "#007bff", // Better checkbox color
                }}
              />
            )}

            {/* Input */}
            <input
              type="text"
              value={rule.text || ""}
              onClick={() => rule.saved && !rule.isEditing && enableEdit(index)}
              onChange={(e) => handleChange(index, e.target.value)}
              style={{
                flex: 1,
                backgroundColor: rule.isEditing ? "#fff" : "#f5f5f5",
                border: rule.isEditing ? "2px solid #007bff" : "1px solid #ddd",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: rule.saved && !rule.isEditing ? "pointer" : "text",
              }}
              placeholder={rule.isEditing ? "Enter rule..." : "No rule text"}
              readOnly={!rule.isEditing}
            />

            {/* Action Buttons */}
            {rule.isEditing ? (
              <div className="flexRow gap_12">
                <button
                  onClick={() => handleSave(index)}
                  className="iconBtn"
                  disabled={!rule.text?.trim()}
                  style={{
                    padding: "4px 8px",
                    cursor: !rule.text?.trim() ? "not-allowed" : "pointer",
                    opacity: !rule.text?.trim() ? 0.5 : 1,
                  }}
                  title={
                    !rule.text?.trim() ? "Rule cannot be empty" : "Save rule"
                  }
                >
                  <Check size={18} color="green" />
                </button>

                <button
                  onClick={() => handleDelete(index)}
                  className="iconBtn"
                  style={{ padding: "4px 8px", cursor: "pointer" }}
                  title="Delete rule"
                >
                  <X size={18} color="red" />
                </button>
              </div>
            ) : (
              rule.saved && (
                <button
                  onClick={() => enableEdit(index)}
                  className="iconBtn"
                  style={{
                    padding: "4px 8px",
                    cursor: "pointer",
                    backgroundColor: "transparent",
                    border: "none",
                  }}
                  title="Edit rule"
                >
                  <span style={{ fontSize: "14px", color: "#666" }}>✎</span>
                </button>
              )
            )}
          </div>
        </div>
      ))}

      <button
        onClick={handleAddRule}
        className="btn"
        style={{
          marginTop: "12px",
          padding: "8px 16px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        + Add Rule
      </button>
    </div>
  );
};

export default RulesManager;
