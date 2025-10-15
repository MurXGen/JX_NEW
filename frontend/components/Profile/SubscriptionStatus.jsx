// components/Profile/SubscriptionStatus.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Zap,
  Star,
  Check,
  Clock,
  AlertCircle,
  Calendar,
  Rocket,
  Sparkles,
  TrendingUp,
  Shield,
  Users,
} from "lucide-react";
import { getFromIndexedDB } from "@/utils/indexedDB";
import FullPageLoader from "../ui/FullPageLoader";

const SubscriptionStatus = () => {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [progressPercent, setProgressPercent] = useState("");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const data = await getFromIndexedDB("user-data");
      setUserData(data);

      if (data?.subscription) {
        const { startAt, expiresAt } = data.subscription;
        setCurrentPlan(data.subscription);

        const now = new Date();
        const start = new Date(startAt);
        const expiry = new Date(expiresAt);

        // Progress percentage
        const totalTime = expiry - start;
        const elapsedTime = now - start;
        let progress = (elapsedTime / totalTime) * 100;
        if (progress < 0) progress = 0;
        if (progress > 100) progress = 100;
        setProgressPercent(progress);

        // Time remaining in days only
        const diffTime = expiry - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const remainingText =
          diffDays <= 0 ? "Expired" : `${diffDays} days left`;
        setTimeRemaining(remainingText);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTimeRemaining = (startDate, expiryDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const expiry = new Date(expiryDate);

    const totalTime = expiry - start; // total subscription duration in ms
    const elapsedTime = now - start; // time elapsed in ms

    // Calculate progress percentage
    let progress = (elapsedTime / totalTime) * 100;
    if (progress < 0) progress = 0;
    if (progress > 100) progress = 100;

    // Calculate remaining time
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let remainingText = "";
    if (diffDays <= 0) {
      remainingText = "Expired";
    } else if (diffDays === 1) {
      remainingText = "1 day left";
    } else if (diffDays <= 7) {
      remainingText = `${diffDays} days left`;
    } else if (diffDays <= 30) {
      remainingText = `${Math.ceil(diffDays / 7)} weeks left`;
    } else {
      remainingText = `${Math.ceil(diffDays / 30)} months left`;
    }

    return { progress, remainingText };
  };

  const getPlanIcon = (planId) => {
    const baseProps = { size: 24 };
    switch (planId) {
      case "pro":
        return <Crown {...baseProps} className="plan-icon pro" />;
      case "elite":
        return <Zap {...baseProps} className="plan-icon elite" />;
      case "master":
        return <Rocket {...baseProps} className="plan-icon master" />;
      default:
        return <Star {...baseProps} className="plan-icon" />;
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "active":
        return { color: "success", label: "Active", icon: Check };
      case "expired":
        return { color: "error", label: "Expired", icon: AlertCircle };
      case "cancelled":
        return { color: "error", label: "Cancelled", icon: AlertCircle };
      case "pending":
        return { color: "vector", label: "Pending", icon: Clock };
      default:
        return { color: "vector", label: "Inactive", icon: Star };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getUpgradeMessage = () => {
    if (!currentPlan) {
      return {
        title: "Unlock Premium Features",
        description:
          "Start your journey to better trading with our premium plans",
        cta: "View Plans",
        urgency: "new",
      };
    }

    const planLevels = { basic: 1, pro: 2, elite: 3, master: 4 };
    const currentLevel = planLevels[currentPlan.planId] || 1;

    if (currentLevel < 4) {
      return {
        title: "Ready for the Next Level?",
        description: "Upgrade to unlock advanced features and higher limits",
        cta: "Upgrade Now",
        urgency: "upgrade",
      };
    }

    return {
      title: "Premium Member",
      description: "You're enjoying our highest tier features",
      cta: "Manage Subscription",
      urgency: "premium",
    };
  };

  if (isLoading) {
    return <FullPageLoader />;
  }

  const statusConfig = currentPlan
    ? getStatusConfig(currentPlan.status)
    : getStatusConfig("inactive");
  const upgradeMessage = getUpgradeMessage();

  return (
    <div className="subscription-status">
      {/* Current Plan Card */}
      <AnimatePresence mode="wait">
        {currentPlan ? (
          <motion.div
            key="active-plan"
            className="current-plan-card chart_boxBg flexClm gap_32"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flexRow flexRow_stretch">
              <div className="flexRow gap_12">
                {getPlanIcon(currentPlan.planId)}
                <div className="flexClm">
                  <span className="font_18 font_weight_600">
                    {currentPlan.planId.charAt(0).toUpperCase() +
                      currentPlan.planId.slice(1)}{" "}
                    Plan
                  </span>
                  <span
                    className="font_12"
                    style={{ color: "var(--white-50)" }}
                  >
                    {currentPlan.type === "recurring"
                      ? "Auto-renewal"
                      : "One-time payment"}
                  </span>
                </div>
              </div>
              <div
                className={`status-badge ${statusConfig.color}`}
                style={{ padding: "12px" }}
              >
                <statusConfig.icon size={16} />
                <span className="font_12">{statusConfig.label}</span>
              </div>
            </div>

            {/* Progress Bar for Time Remaining */}
            {currentPlan?.status === "active" && (
              <div className="">
                <div className="progress-header flexRow flexRow_stretch font_12">
                  <span>Subscription Timeline</span>
                  <span
                    className={
                      timeRemaining === "Expired" ? "error" : "success"
                    }
                  >
                    {timeRemaining}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${
                      timeRemaining === "Expired" ? "error" : "success"
                    }`}
                    style={{
                      width: `${
                        timeRemaining === "Expired" ? 100 : progressPercent
                      }%`,
                      background:
                        timeRemaining === "Expired"
                          ? "var(--error)"
                          : "var(--success)",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            )}

            {currentPlan?.startAt && currentPlan?.expiresAt && (
              <div className="flexRow flexRow_stretch">
                <div className="flexRow gap_12">
                  <Calendar size={16} className="vector" />
                  <div className="detail-content">
                    <span className="font_12">Started</span>
                    <span className="font_14 font_weight_600">
                      {formatDate(currentPlan.startAt)}
                    </span>
                  </div>
                </div>
                <div
                  className="flexRow gap_12"
                  style={{
                    textAlign: "right",
                    justifyContent: "end",
                    flexDirection: "row-reverse",
                  }}
                >
                  <Clock size={16} className="vector" />
                  <div className="detail-content">
                    <span className="font_12">
                      {currentPlan.status === "active" ? "Expires" : "Expired"}
                    </span>
                    <span className="font_14 font_weight_600">
                      {formatDate(currentPlan.expiresAt)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="plan-actions flexRow gap_12">
              {currentPlan.status === "active" ? (
                <>
                  <button
                    className="button_sec flex_center"
                    onClick={() => router.push("/billings")}
                  >
                    Manage
                  </button>
                  <button
                    className="button_pri flexRow flex_center gap_12"
                    onClick={() => router.push("/pricing")}
                  >
                    <TrendingUp size={14} />
                    Upgrade
                  </button>
                </>
              ) : (
                <button
                  className="button_pri flex_center flexRow gap_4"
                  onClick={() => router.push("/pricing")}
                >
                  <Sparkles size={16} />
                  Renew Subscription
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="no-plan"
            className="no-subscription-card chart_boxBg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="upgrade-header text-center">
              <div className="upgrade-icon">
                <Crown size={32} className="vector" />
              </div>
              <h3 className="font_18 font_weight_600">
                {upgradeMessage.title}
              </h3>
              <p className="font_12" style={{ color: "var(--white-50)" }}>
                {upgradeMessage.description}
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="feature-highlights">
              <div className="feature-item">
                <Check size={16} className="success" />
                <span className="font_12">Advanced Analytics</span>
              </div>
              <div className="feature-item">
                <Check size={16} className="success" />
                <span className="font_12">Real-time Data</span>
              </div>
              <div className="feature-item">
                <Check size={16} className="success" />
                <span className="font_12">Priority Support</span>
              </div>
              <div className="feature-item">
                <Check size={16} className="success" />
                <span className="font_12">Custom Indicators</span>
              </div>
            </div>

            {/* CTA Button */}
            <motion.button
              className="upgrade-cta button_pri"
              onClick={() => router.push("/pricing")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles size={16} />
              {upgradeMessage.cta}
            </motion.button>

            {/* Trust Indicators */}
            <div className="trust-indicators">
              <div className="trust-item">
                <Shield size={14} className="vector" />
                <span className="font_10">Secure Payment</span>
              </div>
              <div className="trust-item">
                <Users size={14} className="vector" />
                <span className="font_10">10K+ Traders</span>
              </div>
              <div className="trust-item">
                <Check size={14} className="success" />
                <span className="font_10">Cancel Anytime</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upgrade Suggestion for Lower Tiers */}
      {currentPlan &&
        currentPlan.planId !== "master" &&
        currentPlan.status === "active" && (
          <motion.div
            className="upgrade-suggestion"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="suggestion-content">
              <div className="suggestion-text">
                <span className="font_14 font_weight_600">
                  Ready for more power?
                </span>
                <span className="font_12" style={{ color: "var(--white-50)" }}>
                  Upgrade to unlock premium features and better performance
                </span>
              </div>
              <button
                className="suggestion-cta button_sec"
                onClick={() => router.push("/pricing")}
              >
                Explore Upgrades
              </button>
            </div>
          </motion.div>
        )}
    </div>
  );
};

export default SubscriptionStatus;
