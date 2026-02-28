"use client";

import { getFromIndexedDB } from "@/utils/indexedDB";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDown,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Crown,
  Rocket,
  Shield,
  Sparkles,
  Star,
  StarHalf,
  Users,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FullPageLoader from "../ui/FullPageLoader";
import { getPlanRules } from "@/utils/planRestrictions"; // ✅ Import from your synced planRules.js

const SubscriptionStatus = () => {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [progressPercent, setProgressPercent] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const [planRules, setPlanRules] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const data = await getFromIndexedDB("user-data");
      setUserData(data);

      if (data?.subscription) {
        const { startAt, expiresAt, planId } = data.subscription;
        const rules = getPlanRules(data);

        setCurrentPlan(data.subscription);
        setPlanRules(rules);

        // Calculate progress and remaining time
        const now = new Date();
        const start = new Date(startAt);
        const expiry = new Date(expiresAt);
        const totalTime = expiry - start;
        const elapsedTime = now - start;

        let progress = (elapsedTime / totalTime) * 100;
        progress = Math.min(100, Math.max(0, progress));
        setProgressPercent(progress);

        const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        setTimeRemaining(diffDays <= 0 ? "Expired" : `${diffDays} days left`);
      } else {
        setPlanRules(getPlanRules({ subscription: { planId: "free" } }));
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanIcon = (plan) => {
    const id = (plan || "").toLowerCase();
    const baseProps = { size: 24 };

    if (id === "pro") {
      return (
        <div className="plan-icon-wrap pro">
          <Crown {...baseProps} />
        </div>
      );
    }

    if (id === "lifetime") {
      return (
        <div className="plan-icon-wrap master">
          <Rocket {...baseProps} />
        </div>
      );
    }

    return (
      <div className="plan-icon-wrap free">
        <StarHalf {...baseProps} />
      </div>
    );
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "active":
        return { color: "success", label: "Active", icon: Check };
      case "expired":
        return { color: "error", label: "Expired", icon: AlertCircle };
      case "canceled":
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
          "Start your journey to smarter trading with premium tools and unlimited logging.",
        cta: "View Plans",
        urgency: "new",
      };
    }

    // 🟩 Define levels based on new plan IDs
    const planLevels = {
      free001: 1,
      pro001: 2,
      master001: 3,
    };

    const currentLevel = planLevels[currentPlan.plan?.toLowerCase()];

    if (currentLevel < 3) {
      return {
        title: "Ready for the Next Level?",
        description: "Upgrade to unlock AI insights, integrations, and more.",
        cta: "Upgrade Now",
        urgency: "upgrade",
      };
    }

    return {
      title: "Master Member",
      description: "You’re enjoying the highest tier with full features!",
      cta: "Manage Subscription",
      urgency: "premium",
    };
  };

  if (isLoading) return <FullPageLoader />;

  const statusConfig = currentPlan
    ? getStatusConfig(currentPlan.status)
    : getStatusConfig("inactive");
  const upgradeMessage = getUpgradeMessage();

  return (
    <div className="subscription-status">
      <AnimatePresence mode="wait">
        {currentPlan ? (
          <motion.div
            key="active-plan"
            className="current-plan-card stats-card radius-12 flexClm gap_24"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {/* --- Top Row (Always Visible) --- */}
            <div className="flexRow flexRow_stretch">
              <div className="flexRow gap_12">
                {getPlanIcon(currentPlan.plan)}

                <div className="flexClm">
                  <span className="font_16 font_weight_600">
                    {(() => {
                      const rawPlan =
                        currentPlan?.plan?.toLowerCase() || "free";

                      // If plan is lifetime OR expiry is null, show "Lifetime"
                      if (rawPlan === "lifetime" || !currentPlan?.expiresAt) {
                        return "Lifetime Plan";
                      }

                      // Otherwise normal mapping
                      const planName =
                        rawPlan === "master"
                          ? "Master"
                          : rawPlan === "pro"
                            ? "Pro"
                            : "Free";

                      return `${planName} Plan`;
                    })()}
                  </span>

                  <span className="font_14 black-text">
                    {currentPlan.type === "recurring"
                      ? "Auto-renewal"
                      : "One-time payment"}
                  </span>
                </div>
              </div>

              <div className="flexRow flex_center gap_8">
                <div className={`status-badge ${statusConfig.color}`}>
                  <statusConfig.icon size={16} color="white" />
                  <span className="font_12">{statusConfig.label}</span>
                </div>

                {/* ▼ Toggle Arrow */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  className="flexRow btn flex_center"
                  onClick={() => setShowDetails((prev) => !prev)}
                >
                  <ChevronDown size={20} />
                </motion.button>
              </div>
            </div>

            {/* Actions */}
            <div className="plan-actions flexRow gap_12">
              {currentPlan.status === "active" ? (
                <>
                  <button
                    className="secondary-btn primary-btn flex_center"
                    onClick={() => router.push("/billings")}
                  >
                    Manage
                  </button>
                  <button
                    className="upgrade_btn width100 flexRow gap_8 flex_center"
                    onClick={() => router.push("/pricing")}
                  >
                    <Crown size={16} />
                    Upgrade Limit
                  </button>
                </>
              ) : (
                <button
                  className="primary-btn width100 flex_center flexRow gap_4"
                  onClick={() => router.push("/pricing")}
                >
                  <Sparkles size={16} />
                  Renew Subscription
                </button>
              )}
            </div>

            {/* --- Collapsible Section --- */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="flexClm gap_24"
                >
                  {currentPlan?.status === "active" &&
                    currentPlan.plan !== "lifetime" &&
                    currentPlan.expiresAt && (
                      <div>
                        <div className="progress-header flexRow flexRow_stretch font_12">
                          <span className="font_14 black-text black-text">
                            Subscription Timeline
                          </span>
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
                              width: `${timeRemaining === "Expired" ? 100 : progressPercent}%`,
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
                          <span className="font_12 black-text">Started</span>
                          <span className="font_14 black-text font_weight_600">
                            {formatDate(currentPlan.startAt)}
                          </span>
                        </div>
                      </div>
                      <div
                        className="flexRow gap_12"
                        style={{ justifyContent: "flex-end" }}
                      >
                        <Clock size={16} className="vector" />
                        <div className="detail-content">
                          <span className="font_12 black-text">
                            {currentPlan.status === "active"
                              ? "Expires"
                              : "Expired"}
                          </span>
                          <span className="font_14 black-text font_weight_600">
                            {currentPlan.expiresAt
                              ? formatDate(currentPlan.expiresAt)
                              : "Lifetime"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Limits Overview */}
                  {planRules && (
                    <div className="gridContainer gap_8 font_12">
                      <div className="stats-card radius-12 flexRow flexRow_stretch">
                        <b className="card-label">Trade Limit:</b>{" "}
                        <span className="font_14 black-text">
                          {planRules.limits.tradeLimitPerMonth === Infinity
                            ? "Unlimited"
                            : `${planRules.limits.tradeLimitPerMonth} / month`}
                        </span>
                      </div>
                      <div className="boxBg flexRow flexRow_stretch">
                        <b className="card-label">Account Limit:</b>{" "}
                        <span className="font_14 black-text">
                          {planRules.limits.accountLimit}
                        </span>
                      </div>
                      <div className="boxBg flexRow flexRow_stretch">
                        <b className="card-label">Image Upload:</b>{" "}
                        <span className="font_14 black-text">
                          {planRules.limits.imageLimitPerMonth === Infinity
                            ? "Unlimited"
                            : `${planRules.limits.imageLimitPerMonth} / month`}{" "}
                          ({planRules.limits.maxImageSizeMB} MB max)
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          // No Plan UI
          <motion.div
            key="no-plan"
            className="no-subscription-card chart_boxBg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <Crown size={32} className="vector" />
              <h3 className="font_18 font_weight_600">
                {upgradeMessage.title}
              </h3>
              <p className="font_12 shade_50">{upgradeMessage.description}</p>
            </div>

            <motion.button
              className="button_pri width100"
              onClick={() => router.push("/pricing")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles size={16} />
              {upgradeMessage.cta}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubscriptionStatus;
