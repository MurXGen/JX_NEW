// components/Profile.jsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  Share2,
  HelpCircle,
  FileText,
  Shield,
  LogOut,
  User,
  Settings,
  Bell,
  CreditCard,
  ArrowLeft,
} from "lucide-react";
import { clearIndexedDB, getFromIndexedDB } from "../utils/indexedDB";
import SubscriptionStatus from "@/components/Profile/SubscriptionStatus";
import BackgroundBlur from "@/components/ui/BackgroundBlur";
import { motion } from "framer-motion";
import FullPageLoader from "@/components/ui/FullPageLoader";

const Profile = () => {
  const router = useRouter();
  const [simpleMode, setSimpleMode] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const data = await getFromIndexedDB("user-data");
    setUserData(data);
  };

  const handleLogout = async () => {
    try {
      Cookies.remove("isVerified");
      Cookies.remove("accountId");
      await clearIndexedDB();
      router.push("/login");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const handleBackClick = () => {
    router.push("/accounts");
  };

  if (loading) return <FullPageLoader />;

  return (
    <div className="flexClm gap_32">
      {/* Header */}
      <motion.div
        className="profile-header flexRow flexRow_stretch"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flexRow gap_12">
          <button className="button_sec flexRow" onClick={handleBackClick}>
            <ArrowLeft size={20} />
          </button>
          <div className="flexClm">
            <span className="font_20">Profile</span>
            <span className="font_12">
              Manage your account and subscription
            </span>
          </div>
        </div>

        {/* Simple Mode Toggle */}
        {/* <div className="simple-mode-toggle boxBg">
          <div className="flexRow gap_12 width100">
            <span className="font_12">Simple Mode</span>
            <div
              className="toggle_switch"
              onClick={() => setSimpleMode(!simpleMode)}
            >
              <div
                className="toggle_slider"
                style={{ left: simpleMode ? "22px" : "2px" }}
              ></div>
            </div>
          </div>
        </div> */}
      </motion.div>

      {/* User Info & Subscription */}
      <motion.div
        className="profile-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* User Info Card */}
        <div className="user-info-card chart_boxBg">
          <div className="user-header flexRow gap_12">
            <div className="user-avatar">
              <User size={24} />
            </div>
            <div className="user-details flexClm">
              <span className="font_16 font_weight_600">
                {userData?.name || "User"}
              </span>
              <span className="font_12" style={{ color: "var(--white-50)" }}>
                {userData?.email || "user@example.com"}
              </span>
            </div>
          </div>
        </div>

        {/* Subscription Status */}
        <SubscriptionStatus />

        {/* Quick Actions */}
        {/* <div className="quick-actions-section">
          <span className="section-title font_14 font_weight_600">
            Quick Actions
          </span>
          <div className="action-grid">
            <button
              className="action-card"
              onClick={() => router.push("/settings")}
            >
              <Settings size={20} />
              <span className="font_12">Settings</span>
            </button>
            <button
              className="action-card"
              onClick={() => router.push("/notifications")}
            >
              <Bell size={20} />
              <span className="font_12">Notifications</span>
            </button>
            <button
              className="action-card"
              onClick={() => router.push("/billing")}
            >
              <CreditCard size={20} />
              <span className="font_12">Billing</span>
            </button>
            <button
              className="action-card"
              onClick={() => router.push("/help")}
            >
              <HelpCircle size={20} />
              <span className="font_12">Help</span>
            </button>
          </div>
        </div> */}

        {/* Legal & Support Section */}
        <div className="legal-section">
          <button
            className="button_sec flexRow gap_4 flexRow_center"
            onClick={() => router.push("/terms")}
          >
            <FileText size={16} />
            Terms of Service
          </button>
          <button
            className="button_sec flexRow gap_4 flexRow_center"
            onClick={() => router.push("/privacy")}
          >
            <Shield size={16} />
            Privacy Policy
          </button>
          <button
            className="button_sec flexRow gap_4 flexRow_center"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </motion.div>

      <BackgroundBlur />
    </div>
  );
};

export default Profile;
