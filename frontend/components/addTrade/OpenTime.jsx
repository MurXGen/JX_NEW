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
    <>
      <DateTimePicker label="" value={dateValue} onChange={onDateChange} />
    </>
  );
};

export default DateTimeImageSection;
