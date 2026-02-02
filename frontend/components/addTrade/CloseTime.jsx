import { X, Upload } from "lucide-react";

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
      </div>
    </div>
  );
};

export default DateTimeImageSection;
