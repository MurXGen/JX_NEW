import { PlayCircle, CheckCircle, Zap } from "lucide-react"; // icons
import { motion } from "framer-motion";

const TradeStatusGrid = ({ form, handleChange, statuses }) => {
  const getIcon = (status) => {
    switch (status) {
      case "running":
        return <PlayCircle size={18} />;
      case "closed":
        return <CheckCircle size={18} />;
      case "quick":
        return (
          <motion.div className="vector">
            <Zap size={14} color="#FFD700" />
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="tradeGrid">
      <div className="flexRow flexRow_stretch gap_12">
        {statuses.map((status) => (
          <button
            key={status.value}
            type="button"
            className={`button_sec width100 flexRow gap_8 flex_center ${
              form.tradeStatus === status.value ? "selected" : ""
            }`}
            onClick={() =>
              handleChange({
                target: { name: "tradeStatus", value: status.value },
              })
            }
          >
            {getIcon(status.value)}
            <span>{status.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TradeStatusGrid;
