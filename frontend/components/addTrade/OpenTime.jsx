import { X, Upload } from "lucide-react";
import DateTimePicker from "../ui/DateTimePicker";

const DateTimeImageSection = ({
  label,
  dateValue,
  onDateChange,
  imagePreview,
  onImageChange,
  onRemove,
}) => {
  return (
    <div className="tradeGrid">
      {/* <span className="label">{label}</span> */}
      <div className="flexClm gap_12">
        <DateTimePicker label="" value={dateValue} onChange={onDateChange} />
        <div className="imagePicker">
          {imagePreview ? (
            <div className="preview">
              <img src={imagePreview} alt={`${label} Preview`} />
              <button
                type="button"
                className="removeBtn flexRow flex_center button_ter"
                onClick={onRemove}
                aria-label="Remove image"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <label className="uploadBox flexRow flex_center">
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={onImageChange}
              />
              <div className="placeholder flexRow flex_center gap_24">
                <div className="iconCircle">
                  <Upload size={20} />
                </div>
                <div className="gap_8 flexClm flex_center">
                  <span className="title font_14">Upload {label} Chart</span>
                  <span className="subtitle font_12">PNG, JPG up to 5MB</span>
                </div>
              </div>
            </label>
          )}
        </div>
      </div>
    </div>
  );
};

export default DateTimeImageSection;
