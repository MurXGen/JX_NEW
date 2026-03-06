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
            <Zap fill="#FFD700" size={14} color="#FFD700" />
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mobile-tabs trade-status-tabs">
      {statuses.map((status) => (
        <button
          key={status.value}
          type="button"
          className={`tab-item flexRow flex_center gap_8 ${
            form.tradeStatus === status.value ? "active" : ""
          }`}
          onClick={() =>
            handleChange({
              target: { name: "tradeStatus", value: status.value },
            })
          }
        >
          {getIcon(status.value)}
          <span className="font_14 font_weight_600">{status.label}</span>
        </button>
      ))}
    </div>
  );
};

export default TradeStatusGrid;
