// components/Profile.jsx
import SubscriptionStatus from "@/components/Profile/SubscriptionStatus";
import FullPageLoader from "@/components/ui/FullPageLoader";
import { motion } from "framer-motion";
import Cookies from "js-cookie";
import {
  Book,
  LogOutIcon,
  Moon,
  Repeat,
  Share2,
  ShareIcon,
  Sun,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearIndexedDB, getFromIndexedDB } from "@/utils/indexedDB";
import BottomBar from "@/components/Trades/BottomBar";
import Image from "next/image";

const Profile = () => {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDark(savedTheme === "dark");
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setIsDark(prefersDark);
      document.documentElement.setAttribute(
        "data-theme",
        prefersDark ? "dark" : "light",
      );
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setIsDark(!isDark);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

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
      className="pad_16"
      style={{
        background: "var(--mobile-bg)",
        height: "100vh",
      }}
    >
      {/* Header with Theme Toggle */}
      <motion.div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "32px",
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div>
            <span
              style={{
                fontSize: "24px",
                fontWeight: "600",
                color: "var(--text-primary)",
              }}
            >
              Profile
            </span>
          </div>
        </div>

        {/* Theme Toggle Switch */}
        <button
          onClick={toggleTheme}
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "30px",
            padding: "4px",
            width: "64px",
            height: "32px",
            position: "relative",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            boxShadow: "0 2px 8px var(--black-10)",
            border: "1px solid var(--black-50)",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "var(--primary)",
              left: isDark ? "calc(100% - 28px)" : "4px",
              transition: "left 0.3s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
            }}
          >
            {isDark ? <Moon size={14} /> : <Sun size={14} />}
          </div>
          <span style={{ marginLeft: "8px", opacity: 0 }}>.</span>
        </button>
      </motion.div>

      {/* User Info & Subscription */}
      <motion.div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "32px",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* User Info Card */}
        <div className="stats-card radius-12">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <Image
              src="/assets/profile.gif"
              alt="Profile"
              width={60}
              height={60}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid var(--primary)",
              }}
              priority
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "var(--text-primary)",
                }}
              >
                {userData?.name || "Trading Hero"}
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                }}
              >
                {userData?.email || "...@gmail.com"}
              </span>
            </div>
          </div>
        </div>

        {/* Subscription Status */}
        <SubscriptionStatus />

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <button
            style={{
              padding: "14px 20px",
              background: "var(--black-10)",
              border: "1px solid var(--border-color)",
              borderRadius: "14px",
              color: "var(--text-primary)",
              fontSize: "var(--px-16)",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
              transition: "all 0.2s",
              width: "100%",
            }}
            onClick={() => router.push("/accounts")}
          >
            <Repeat size={18} color="var(--primary)" />
            Switch journal
          </button>

          {/* <button
            style={{
              padding: "14px 20px",
              background: "var(--black-10)",
              border: "1px solid var(--border-color)",
              borderRadius: "14px",
              color: "var(--text-primary)",
              fontSize: "var(--px-16)",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
              transition: "all 0.2s",
              width: "100%",
            }}
            onClick={() => router.push("/share-trades")}
          >
            <Share2 size={18} color="var(--primary)" />
            Share trade logs
          </button>

          <button
            style={{
              padding: "14px 20px",
              background: "var(--black-10)",
              border: "1px solid var(--border-color)",
              borderRadius: "14px",
              color: "var(--text-primary)",
              fontSize: "var(--px-16)",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
              transition: "all 0.2s",
              width: "100%",
            }}
            onClick={() => router.push("/export")}
          >
            <ShareIcon size={18} color="var(--primary)" />
            Export trade logs
          </button> */}

          <button
            style={{
              padding: "14px 20px",
              background: "var(--black-10)",
              border: "1px solid var(--border-color)",
              borderRadius: "14px",
              color: "var(--text-primary)",
              fontSize: "var(--px-16)",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
              transition: "all 0.2s",
              width: "100%",
            }}
            onClick={() => router.push("/billings")}
          >
            <Book size={18} color="var(--primary)" />
            Billing
          </button>

          <button
            style={{
              padding: "14px 20px",
              background: "var(--error-10)",
              border: "1px solid var(--border-color)",
              borderRadius: "14px",
              color: "var(--text-primary)",
              fontSize: "var(--px-16)",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
              transition: "all 0.2s",
              width: "100%",
            }}
            onClick={handleLogout}
          >
            <LogOutIcon size={18} color="var(--error)" />
            Logout
          </button>
        </div>
      </motion.div>

      <BottomBar />
    </div>
  );
};

export default Profile;
