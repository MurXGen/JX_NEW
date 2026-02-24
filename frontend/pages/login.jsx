"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
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
import LegalLinks from "@/components/landingPage/LegalLinks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function Login() {
  const router = useRouter();
  const [turnstileToken, setTurnstileToken] = useState(null);
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
        { withCredentials: true },
      );

      const { userData, isVerified } = res.data;

      // ✅ Save user data
      await saveToIndexedDB("user-data", userData);
      if (userData?.plans) {
        await saveToIndexedDB("plans", userData.plans);
      }

      // ✅ Handle verified users
      if (isVerified === "yes") {
        Cookies.set("isVerified", "yes", {
          path: "/",
          sameSite: "Strict",
          expires: 3650,
        });
        localStorage.setItem("guide", "yes");

        // ✅ Show success toast only
        setPopup({
          message: "Login successful! Redirecting to your accounts...",
          type: "success",
          id: Date.now(),
        });

        // ✅ Redirect after short delay
        setTimeout(() => {
          router.push("/accounts");
        }, 1200);
      } else {
        // ⚠️ Not verified – Redirect to OTP page
        Cookies.remove("isVerified");
        setPopup({
          message: "Redirecting... Please verify OTP first.",
          type: "success",
          id: Date.now(),
        });

        localStorage.setItem("otpUserId", userData?._id);
        setTimeout(() => {
          router.push({
            pathname: "/register",
            query: { step: "verify-otp", userId: userData?._id },
          });
        }, 1200);
      }
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;

      // ✅ OTP verification needed
      if (
        status === 403 &&
        message?.toLowerCase().includes("verify your account")
      ) {
        const { userId } = err.response.data;
        setPopup({
          message: "Redirecting... Please verify OTP first.",
          type: "success",
          id: Date.now(),
        });
        localStorage.setItem("otpUserId", userId);
        setTimeout(() => {
          router.push({
            pathname: "/register",
            query: { step: "verify-otp", userId },
          });
        }, 1200);
        return;
      }

      // ❌ Invalid credentials or other error
      setPopup({
        message: message || "Invalid email or password",
        type: "error",
        id: Date.now(),
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
    <>
      {/* ✅ SEO + Meta Setup */}
      <Head>
        <title>Login | JournalX</title>
        <meta
          name="description"
          content="Login to JournalX to access your trading journal, performance analytics, trade history, and personalized trading insights. Stay ahead with data-driven decisions and behavioral tracking."
        />
        <meta
          name="keywords"
          content="trading journal login, forex trading journal, crypto trading journal, stock trading log, trading analytics, trading performance tracker, JournalX app, login trading tracker, trading logbook, online trading journal"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="JournalX" />

        {/* ✅ Open Graph Meta (Facebook, WhatsApp, LinkedIn) */}
        <meta
          property="og:title"
          content="JournalX | Login to Your Trading Journal"
        />
        <meta
          property="og:description"
          content="Access your AI-powered trading journal, track your trades, and improve your performance with JournalX."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://journalx.app/login" />
        <meta property="og:image" content="/assets/Journalx_Banner.png" />

        {/* ✅ Twitter Meta */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="JournalX | Login" />
        <meta
          name="twitter:description"
          content="Login to JournalX to access your trades, analytics, and performance insights."
        />
        <meta name="twitter:image" content="/assets/Journalx_Banner.png" />

        <link rel="canonical" href="https://journalx.app/login" />
        <meta name="theme-color" content="#000000" />
      </Head>
      <div
        className="login flexClm gap_32"
        style={{
          maxWidth: "800px",
          minWidth: "300px",
          margin: "32px auto",
          padding: "0 12px 100px 12px",
        }}
      >
        {/* <Navbar /> */}
        <div className="flexClm gap_32">
          <div className="s_tit_des flexClm">
            <span className="font_24 font_weight_600">Login to continue</span>
            <span className="font_14 desc">
              Login to your account to access your trades data
            </span>
          </div>
          <div className="flexClm gap_24">
            <div className="flexClm">
              <input
                value={email}
                onChange={handleChange}
                placeholder="Email Address"
                type="email"
                onKeyDown={handleKeyDown}
              />
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
                className="eyeButton"
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  marginTop: "4px",
                }}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              onSuccess={(token) => setTurnstileToken(token)}
            />
            <div className="flexClm gap_12">
              <button
                type="submit"
                disabled={isLoading || !turnstileToken} // ✅ disabled until CAPTCHA success
                className="primary-btn flexRow gap_12 flexRow_center flexRow_stretch"
                onClick={(e) => {
                  e.preventDefault(); // prevent form reload
                  handleLogin(); // call login function
                }}
              >
                {isLoading ? <div className="spinner"></div> : "Login"}
                {!isLoading && <ArrowRight size={20} />}
              </button>
            </div>

            <div>
              <button
                className="tertiary-btn"
                onClick={() => router.push("/register")}
              >
                Don't have an account? Register here
              </button>
            </div>
          </div>

          <div className="flexClm gap_24">
            <div
              className="flexRow gap_12 flex_center"
              style={{ color: "var(--black-50)", opacity: "0.5" }}
            >
              <hr width="100%"></hr>
              <span className="font_12" style={{ color: "var(--black-50)" }}>
                or
              </span>
              <hr width="100%"></hr>
            </div>

            <button
              onClick={() => {
                // Redirect to your backend Google OAuth endpoint
                window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`;
              }}
              className="primary-btn secondary-btn flexRow gap_8 items-center justify-center"
            >
              <FcGoogle size={20} /> Continue with Google
            </button>
          </div>

          {popup.message && (
            <ToastMessage message={popup.message} type={popup.type} />
          )}

          <BackgroundBlur />
        </div>
      </div>
      <LegalLinks />
    </>
  );
}

export default Login;
