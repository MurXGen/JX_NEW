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
import { Turnstile } from "@marsidev/react-turnstile";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function Login() {
  const router = useRouter();
  const [turnstileToken, setTurnstileToken] = useState(null);

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
    if (!turnstileToken) {
      setPopup(null);
      setTimeout(() => {
        setPopup({
          message: "Please complete the CAPTCHA before logging in.",
          type: "error",
          id: Date.now(),
        });
      }, 0);
      return;
    }

    setIsLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/login`,
        { email, password, turnstileToken },
        { withCredentials: true }
      );

      const { userData, isVerified } = res.data;

      // Save user data
      await saveToIndexedDB("user-data", userData);
      if (userData?.plans) {
        await saveToIndexedDB("plans", userData.plans);
      }

      // ✅ Handle isVerified cookie
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
      // 🔥 Handle 403 verification redirect here
      if (err.response?.status === 403) {
        const { message, userId } = err.response.data;

        setPopup(null);
        setTimeout(() => {
          setPopup({
            message: message || "Please verify OTP first.",
            type: "info",
            id: Date.now(),
          });
        }, 0);

        localStorage.setItem("otpUserId", userId);

        // Redirect to register page with step=verify-otp
        setTimeout(() => {
          router.push({
            pathname: "/register",
            query: { step: "verify-otp", userId },
          });
        }, 1200);

        return;
      }

      // Other errors
      setPopup(null);
      setTimeout(() => {
        setPopup({
          message: err.response?.data?.message || "Login failed",
          type: "error",
          id: Date.now(),
        });
      }, 0);
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

          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            onSuccess={(token) => setTurnstileToken(token)}
          />

          <button
            type="submit"
            disabled={isLoading || !turnstileToken} // ✅ disabled until CAPTCHA success
            className="button_pri flexRow gap_12 flexRow_center flexRow_stretch"
            onClick={(e) => {
              e.preventDefault(); // prevent form reload
              handleLogin(); // call login function
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
