import { X, Upload } from "lucide-react";
import DateTimePicker from "../ui/DateTimePicker";

const CloseTime = ({ label, dateValue, onDateChange, onClose }) => {
  return (
    <>
      <DateTimePicker
        label=""
        value={dateValue}
        onChange={onDateChange}
        onClose={onClose}
      />
    </>
  );
};

export default CloseTime;
