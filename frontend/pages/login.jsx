"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { containerVariants, childVariants } from "@/animations/motionVariants";
import { saveToIndexedDB } from "@/utils/indexedDB";
import Cookies from "js-cookie";
import Navbar from "@/components/Auth/Navbar";
import ToastMessage from "@/components/ui/ToastMessage";
import BackgroundBlur from "@/components/ui/BackgroundBlur";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];

  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [popup, setPopup] = useState({ message: "", type: "" }); // ✅ message + type
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const isVerified = Cookies.get("isVerified");
    if (isVerified === "yes") {
      router.push("/accounts");
    }
  }, [router]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      const { userData, isVerified, message } = res.data;

      // ✅ Save to IndexedDB
      await saveToIndexedDB("user-data", userData);

      // ✅ Save user name in localStorage for quick access
      if (userData?.name) {
        localStorage.setItem("userName", userData.name);
      }

      // ✅ Manage cookie
      if (isVerified === "yes") {
        Cookies.set("isVerified", "yes", {
          path: "/",
          sameSite: "Strict",
          expires: 3650,
        });
      } else {
        Cookies.remove("isVerified");
      }

      // ✅ Success popup
      setPopup({ message: message || "Login successful!", type: "success" });

      setTimeout(() => {
        setPopup({ message: "", type: "" });
        router.push("/accounts");
      }, 1200);
    } catch (err) {
      console.error("❌ Login failed:", err);

      setPopup({
        message: err.response?.data?.message || "Login failed",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // stops accidental form submission/page reload
      handleLogin();
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setEmail(value);

    if (value && !value.includes("@")) {
      // Show suggestions only before @ is typed
      setSuggestions(domains.map((d) => `${value}@${d}`));
    } else {
      setSuggestions([]);
    }
  };

  const handleSelect = (suggestion) => {
    setEmail(suggestion);
    setSuggestions([]);
  };

  return (
    <div className="login flexClm gap_32">
      <Navbar />
      <div className="flexClm gap_32">
        <div className="s_tit_des flexClm">
          <span className="tit font_20">Welcome Back !</span>
          <span className="des font_14 shade_50">
            Continue logging and getting insights
          </span>
        </div>
        <div className="flexClm gap_24">
          <div className="suggestionInput flexClm">
            <input
              value={email}
              onChange={handleChange}
              placeholder="Email Address"
              type="email"
              onKeyDown={handleKeyDown}
            />
            {suggestions.length > 0 && (
              <div className="suggestionBox flexClm gap_12">
                {suggestions.map((s, i) => (
                  <span
                    key={i}
                    className="suggestion"
                    onClick={() => handleSelect(s)}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="passwordWrap flexClm">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="eyeButton button_ter flexRow"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flexClm gap_8 flex_center">
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="button_pri flexRow gap_12 flexRow_center flexRow_stretch"
          >
            {isLoading ? <Loader2 size={20} className="spinner" /> : "Login"}
            {!isLoading && <ArrowRight size={16} />}
          </button>
          <span
            className="direct_tertiary"
            onClick={() => router.push("/register")}
          >
            New to journaling? Sign-up
          </span>
        </div>

        {popup.message && (
          <ToastMessage message={popup.message} type={popup.type} />
        )}

        <BackgroundBlur />
      </div>
    </div>
  );
}

export default Login;
