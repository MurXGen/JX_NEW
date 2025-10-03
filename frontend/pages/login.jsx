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
import WelcomeModal from "@/components/ui/WelcomeModal";
import { FcGoogle } from "react-icons/fc";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function Login() {
  const router = useRouter();

  const [showWelcome, setShowWelcome] = useState(false);
  const [username, setUsername] = useState("");

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
        { withCredentials: true } // ✅ important to receive HttpOnly cookie
      );

      // Not verified → redirect to registration/OTP
      if (res.status === 403) {
        setPopup({
          message: res.data.message || "Please verify OTP first.",
          type: "info",
        });
        setUserId(res.data.userId);
        setStep("verify-otp");
        return;
      }

      const { userData, isVerified } = res.data;
      await saveToIndexedDB("user-data", userData);

      if (userData?.name) {
        localStorage.setItem("userName", userData.name);
        setUsername(userData.name);
      }

      if (isVerified === "yes") {
        Cookies.set("isVerified", "yes", {
          path: "/",
          sameSite: "Strict",
          expires: 3650,
        });
      } else {
        Cookies.remove("isVerified");
      }

      setShowWelcome(true);
    } catch (err) {
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

          <button
            type="submit"
            disabled={isLoading}
            className="button_pri flexRow gap_12 flexRow_center flexRow_stretch"
            onClick={(e) => {
              e.preventDefault(); // prevent form submission reload
              handleLogin(); // call your login function
            }}
          >
            {isLoading ? <Loader2 size={20} className="spinner" /> : "Login"}
            {!isLoading && <ArrowRight size={16} />}
          </button>
        </div>

        <div className="flexClm gap_8 flex_center">
          <span
            className="direct_tertiary"
            onClick={() => router.push("/register")}
          >
            New to journaling? Sign-up
          </span>
        </div>

        <div className="flexClm gap_24">
          <div className="flexRow flex_center" style={{ position: "relative" }}>
            <hr width="15%"></hr>
            <span
              className="font_12"
              style={{
                position: "absolute",
                top: "-12px",
                background: "#1d1d1d",
                padding: "12px",
                cursor: "default",
              }}
            >
              or
            </span>
          </div>

          <button
            onClick={() => {
              // Redirect to your backend Google OAuth endpoint
              window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`;
            }}
            className="button_sec flexRow flex_center gap_8 items-center justify-center px-4 py-2 border rounded shadow hover:bg-gray-100 transition"
          >
            <FcGoogle size={20} /> Sign in with Google
          </button>
        </div>

        {popup.message && (
          <ToastMessage message={popup.message} type={popup.type} />
        )}

        <BackgroundBlur />
      </div>
      {showWelcome && (
        <WelcomeModal
          username={username}
          onClose={() => setShowWelcome(false)}
        />
      )}
    </div>
  );
}

export default Login;
