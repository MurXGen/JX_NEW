// components/Profile.jsx
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import {
  Share2,
  HelpCircle,
  FileText,
  Shield,
  LogOut,
  Crown,
  User,
  CreditCard,
  CrownIcon,
  ChevronDown,
} from "lucide-react";
import { clearIndexedDB, getFromIndexedDB } from "../utils/indexedDB";
import SubscriptionBox from "@/components/ui/SubscriptionBox";
import BackgroundBlur from "@/components/ui/BackgroundBlur";

const Profile = () => {
  const router = useRouter();
  const [simpleMode, setSimpleMode] = useState(false);

  const handleLogout = async () => {
    try {
      // Clear cookies
      Cookies.remove("isVerified");
      Cookies.remove("accountId");

      // Clear IndexedDB
      await clearIndexedDB();

      // Redirect to login
      router.push("/login");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const handleUpgrade = () => {
    router.push("/subscription");
  };

  return (
    <div className="flexClm gap_24">
      <div className="flexRow flexRow_stretch">
        <div className="flexClm">
          <span className="font_20">Profile</span>
          <span className="font_12">Manage your profile</span>
        </div>
        <div className="boxBg flexClm gap_12">
          <div className="flexRow gap_12 width100">
            <span className="font_12">Simple Mode</span>
            <div
              className="toggle_switch"
              onClick={() => setSimpleMode(!simpleMode)}
              style={{
                width: "44px",
                height: "24px",
                background: simpleMode ? "var(--primary)" : "var(--white-10)",
                borderRadius: "12px",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.3s ease",
              }}
            >
              <div
                className="toggle_slider"
                style={{
                  width: "20px",
                  height: "20px",
                  background: "var(--base-bg)",
                  borderRadius: "50%",
                  position: "absolute",
                  top: "2px",
                  left: simpleMode ? "22px" : "2px",
                  transition: "left 0.3s ease",
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="chart_boxBg flexClm gap_16" style={{ padding: "16px" }}>
        {/* Dummy User Info */}
        <div className="flexClm gap_32">
          <div className="flexRow boxBg flexRow_stretch gap_8">
            <span className="font_12 flexRow gap_4">
              <User size={14} /> Murthy thevar
            </span>
            <span className="font_12">murthy@gmail.com</span>
            {/* <span
              className="direct_tertiary"
              onClick={() => router.push("/change-password")}
              style={{ cursor: "pointer" }}
            >
              Change Password
            </span> */}
          </div>
          <div className="">
            <SubscriptionBox />
          </div>
        </div>
      </div>

      {/* Legal & Actions Section */}
      <div className="flexClm gap_12">
        {/* Share Trades (Under Development) */}
        {/* <button className="button_sec flexRow gap_8 width100" disabled>
          <Share2
            size={16}
            className="shade_50"
            style={{ marginRight: "8px" }}
          />
          Share Trades (Under Development)
        </button> */}

        {/* Help */}
        <button
          className="button_sec flexRow gap_8 width100"
          onClick={() => router.push("/help")}
        >
          <HelpCircle size={16} style={{ marginRight: "8px" }} />
          Help & Support
        </button>

        {/* Terms */}
        <button
          className="button_sec flexRow gap_8 width100"
          onClick={() => router.push("/terms")}
        >
          <FileText size={16} style={{ marginRight: "8px" }} />
          Terms of Service
        </button>

        {/* Privacy */}
        <button
          className="button_sec flexRow gap_8 width100"
          onClick={() => router.push("/privacy")}
        >
          <Shield size={16} style={{ marginRight: "8px" }} />
          Privacy Policy
        </button>

        {/* Logout */}
        <button
          className="button_sec flexRow gap_8 width100 error"
          onClick={handleLogout}
        >
          <LogOut size={16} style={{ marginRight: "8px" }} />
          Logout
        </button>
      </div>
      <BackgroundBlur />
    </div>
  );
};

export default Profile;
