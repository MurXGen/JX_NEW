// components/Profile.jsx
import SubscriptionStatus from "@/components/Profile/SubscriptionStatus";
import BackgroundBlur from "@/components/ui/BackgroundBlur";
import FullPageLoader from "@/components/ui/FullPageLoader";
import { motion } from "framer-motion";
import Cookies from "js-cookie";
import {
  ArrowLeft,
  ChevronLeft,
  FileText,
  LogOut,
  LogOutIcon,
  Pencil,
  Phone,
  Repeat,
  Share2,
  ShareIcon,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearIndexedDB, getFromIndexedDB } from "../utils/indexedDB";
import BottomBar from "@/components/Trades/BottomBar";
import Image from "next/image";

const ProfileWeb = () => {
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
    } catch (error) {}
  };

  const handleBackClick = () => {
    router.push("/accounts");
  };

  if (loading) return <FullPageLoader />;

  return (
    <div
      className="flexClm gap_32"
      style={{
        maxWidth: "1200px",
        minWidth: "300px",
        margin: "24px auto",
        padding: "0 12px 100px 12px",
      }}
    >
      {/* Header */}
      <motion.div
        className="profile-header flexRow flexRow_stretch"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flexRow flexRow_stretch">
          <div className="flexRow gap_12">
            <div className="flexClm">
              <span className="font_24 font_weight_600">Profile</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* User Info & Subscription */}
      <motion.div
        className="profile-content flexClm gap_32"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* User Info Card */}
        <div className="stats-card radius-12">
          <div className="user-header flexRow gap_8">
            <Image
              src="/assets/profile.gif"
              alt="Profile"
              width={50}
              height={50}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
              }}
              priority
            />

            <div className="user-details flexClm">
              <span className="font_16 font_weight_600">
                {userData?.name || "Trading Hero"}
              </span>
              <span className="font_14">
                {userData?.email || "...@gmail.com"}
              </span>
            </div>
          </div>
        </div>
        {/* Subscription Status */}
        <SubscriptionStatus />

        {/* Action Buttons */}
        <div className="flexClm gap_12">
          <button
            className="secondary-btn primary-btn flexRow gap_8"
            onClick={() => router.push("/accounts")}
          >
            <Repeat size={16} /> Switch journal
          </button>
          <button
            className="secondary-btn primary-btn flexRow gap_8 flexRow_center width100"
            onClick={() => router.push("/share-trades")}
          >
            <Share2 size={16} />
            Share trade logs
          </button>
          <button
            className="secondary-btn primary-btn flexRow gap_8 flexRow_center width100"
            onClick={() => router.push("/export")}
          >
            <ShareIcon size={16} />
            Export trade logs
          </button>

          <button
            className="secondary-btn primary-btn flexRow gap_8 "
            onClick={handleLogout}
          >
            <LogOutIcon size={16} />
            Logout
          </button>
        </div>

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
        {/* <div className="flexClm gap_12 width100">
          <button
            className="button_sec flexRow gap_8 flexRow_center width100"
            onClick={() => router.push("/terms-services")}
          >
            <FileText size={16} />
            Terms of Service
          </button>
          <button
            className="button_sec flexRow gap_8 flexRow_center width100"
            onClick={() => router.push("/privacy-policy")}
          >
            <Shield size={16} />
            Privacy Policy
          </button>{" "}
          <button
            className="button_sec flexRow gap_8 flexRow_center width100"
            onClick={() => router.push("/refund-policy")}
          >
            <Phone size={16} />
            Refund policy
          </button>
          <button
            className="button_sec flexRow gap_8 flexRow_center width100"
            onClick={() => router.push("/contact")}
          >
            <Phone size={16} />
            Contact for support
          </button>
          <button
            className="button_sec flexRow gap_8 flexRow_center width100"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div> */}
      </motion.div>

      <BottomBar />
    </div>
  );
};

export default ProfileWeb;
