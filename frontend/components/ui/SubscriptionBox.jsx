import { useState } from "react";
import {
  CreditCard,
  Crown,
  Award,
  Star,
  Trophy,
  DollarSign,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const planIcons = {
  free: {
    icon: DollarSign,
    gradient:
      "radial-gradient(circle at center, var(--primary-10), var(--primary-30))",
  },
  pro: {
    icon: Star,
    gradient:
      "radial-gradient(circle at center, var(--primary-30), var(--primary-60))",
  },
  elite: {
    icon: Award,
    gradient:
      "radial-gradient(circle at center, var(--primary-50), var(--primary-80))",
  },
  master: {
    icon: Trophy,
    gradient:
      "radial-gradient(circle at center, var(--primary-70), var(--primary-100))",
  },
};

const SubscriptionBox = ({
  userPlan = "Elite",
  expiresAt = "21st Aug,2025",
  status = "Active",
}) => {
  const [showFeatures, setShowFeatures] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(userPlan.toLowerCase());

  const planKey = userPlan.toLowerCase();
  const IconComponent = planIcons[planKey]?.icon || Crown;
  const iconBg = planIcons[planKey]?.gradient || "var(--primary)";

  const plansFeatures = {
    free: {
      name: "Free",
      features: {
        // ✅ Features first
        "Multiple entry/exit SP": "✅",
        "Quick trade log": "✅",
        "Advanced Charts": "✅",

        // ❌ Features after
        "Financial News Feed": "❌",
        "Early Beta Access": "❌",
        "Priority Support": "❌",
        "Telegram bot trade log": "❌",
        "AI chat bot": "❌",
        "Export/import trades": "❌",
        "Share trades": "❌",
        "Live price entries": "❌",

        // Other text-based features
        "Trades Logging": "Up to 10 trades/month (ads after 10)",
        "Multiple Accounts": "1 account",
        "Image Uploads":
          "Max 5 MB per screenshot, 10 MB per trade; up to 5 trades/month",
        "Trade History": "Last 30 days",
        "Multi device": "Only one device login",
        "Monthly Price": "Free",
        "Yearly Price": "Free",
      },
    },
    pro: {
      name: "Pro",
      features: {
        "Multiple entry/exit SP": "✅",
        "Quick trade log": "✅",
        "Advanced Charts": "✅",
        "Export/import trades": "✅",

        "Financial News Feed": "❌",
        "Early Beta Access": "❌",
        "Priority Support": "❌ Standard support",
        "Telegram bot trade log": "❌",
        "AI chat bot": "Upto 5 prompts",
        "Share trades": "❌",
        "Live price entries": "❌",

        "Trades Logging": "Unlimited",
        "Multiple Accounts": "Up to 2 accounts",
        "Image Uploads": "Up to 60 images/month",
        "Trade History": "Last 90 days",
        "Multi device": "Multiple devices",
        "Monthly Price": "₹179 / 5 USDT",
        "Yearly Price": "₹1,931 (10% off) / 54 USDT",
      },
    },
    elite: {
      name: "Elite",
      features: {
        "Multiple entry/exit SP": "✅",
        "Quick trade log": "✅",
        "Advanced Charts": "✅",
        "Telegram bot trade log": "✅",
        "AI chat bot": "✅",
        "Export/import trades": "✅",
        "Live price entries": "✅",

        "Share trades": "❌",

        "Trades Logging": "Unlimited",
        "Multiple Accounts": "Up to 3 accounts",
        "Image Uploads": "Unlimited trade images",
        "Trade History": "All trades",
        "Financial News Feed": "✅",
        "Early Beta Access": "✅",
        "Priority Support": "Standard support",
        "Multi device": "Multiple devices",
        "Monthly Price": "₹499 / 8 USDT",
        "Yearly Price": "₹5,390 (10% off) / 86 USDT",
      },
    },
    master: {
      name: "Master",
      features: {
        "Multiple entry/exit SP": "✅",
        "Quick trade log": "✅",
        "Advanced Charts": "✅",
        "Telegram bot trade log": "✅",
        "AI chat bot": "✅",
        "Export/import trades": "✅",
        "Share trades": "✅",
        "Live price entries": "✅",

        "Trades Logging": "Unlimited",
        "Multiple Accounts": "Up to 5 accounts",
        "Image Uploads": "Unlimited trade images",
        "Trade History": "All trades",
        "Financial News Feed": "✅ (with priority access)",
        "Early Beta Access": "✅ + premium features first",
        "Priority Support": "✅ Dedicated support",
        "Multi device": "Multiple devices",
        "Monthly Price": "₹999 / 15 USDT",
        "Yearly Price": "₹10,191 (15% off) / 153 USDT",
      },
    },
  };

  const plan = plansFeatures[userPlan.toLowerCase()] || plansFeatures.free;

  return (
    <div className="flexClm gap_12">
      {/* Header */}
      <div className="flexRow gap_8">
        <CreditCard size={16} />
        <span className="font_12">Subscription Details</span>
      </div>

      {/* Plan Card */}
      <div className="chart_boxBg flexClm gap_24" style={{ padding: "16px" }}>
        <div className="flexRow flexRow_stretch gap_8">
          <div className="flexClm gap_4">
            <div className="flexRow gap_12 ">
              {/* Icon with radial gradient background */}
              <div
                className="boxBg flexRow flex_center p-4"
                style={{
                  background: iconBg,
                }}
              >
                <IconComponent size={20} className="glowing_icon" />
              </div>
              <span className="font_20">{plan.name}</span>
            </div>
          </div>

          <div className="flexClm" style={{ textAlign: "right" }}>
            <span className="font_16 success">Active</span>
            <span className="font_12 shade_50">Expires : {expiresAt}</span>
          </div>
        </div>
        {/* Show/Hide Features */}
        <span
          className="font_12 flexRow gap_12 direct_tertiary mt-8"
          onClick={() => setShowFeatures(!showFeatures)}
          style={{ cursor: "pointer" }}
        >
          {showFeatures ? "Hide features" : "Show all features"}{" "}
          <ChevronDown size={12} />
        </span>

        {/* Features Box with Framer Motion */}
        <AnimatePresence>
          {showFeatures && (
            <motion.div
              className="flexClm gap_8"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {Object.entries(plan.features).map(([feature, value]) => (
                <div
                  key={feature}
                  className="flexRow_stretch flexRow justify_between"
                  style={{
                    borderBottom: "1px solid var(--white-4)",
                    padding: "12px 0",
                  }}
                >
                  <span className="font_12">{feature}</span>
                  <span className="font_12 flexRow items_center gap-2">
                    {value === "✅" && <Check size={16} className="success" />}
                    {value === "❌" && <X size={16} className="error" />}
                    {value !== "✅" && value !== "❌" && value}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upgrade Button */}
      {(userPlan.toLowerCase() === "free" ||
        status.toLowerCase() !== "active") && (
        <button className="button_pri width100 mt-8">
          Upgrade for Best Experience
        </button>
      )}
    </div>
  );
};

export default SubscriptionBox;
