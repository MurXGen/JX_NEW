import { useState } from "react";
import { User, CreditCard, Crown, ChevronDown } from "lucide-react";

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

const SubscriptionBox = ({ userPlan = "pro", expiresAt }) => {
  const plan = plansFeatures[userPlan.toLowerCase()] || plansFeatures.free;
  const [showFeatures, setShowFeatures] = useState(false);

  return (
    <div className="flexClm gap_12">
      {/* Header */}
      <div className="flexRow gap_8 items_center">
        <CreditCard size={16} />
        <span className="font_12">Subscription Details</span>
      </div>

      {/* Plan Card */}
      <div className="flexRow flexRow_stretch gap_8 boxBg p-12">
        <div className="flexClm gap_4">
          <div className="flexRow gap_4 items_center">
            <div className="boxBg flexRow flex_center p-4">
              <Crown size={20} className="glowing_icon" />
            </div>
            <span className="font_20">{plan.name}</span>
          </div>
        </div>
        <div className="flexClm flex_end">
          <span className="font_16 success">Active</span>
          <span className="font_12 shade_50">
            Expires :{" "}
            {expiresAt ? new Date(expiresAt).toLocaleDateString() : "N/A"}
          </span>
        </div>
      </div>

      {/* Toggle to Show Features */}
      <span
        className="font_12 flexRow flex_center gap_12 direct_tertiary"
        style={{ cursor: "pointer" }}
        onClick={() => setShowFeatures(!showFeatures)}
      >
        {showFeatures ? "Hide features" : "Show all features"}
        <ChevronDown
          size={12}
          style={{
            transform: showFeatures ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s ease",
          }}
        />
      </span>

      {/* Features Box */}
      <div
        className="flexClm boxBg p-12 gap_8"
        style={{
          maxHeight: showFeatures ? "1000px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.3s ease",
        }}
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
            <span className="font_12">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionBox;
