"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";
import { containerVariants, childVariants } from "@/animations/motionVariants";
import { FcGoogle } from "react-icons/fc";
import { register } from "@/api/auth";
import Navbar from "@/components/Auth/Navbar";
import ToastMessage from "@/components/ui/ToastMessage";
import BackgroundBlur from "@/components/ui/BackgroundBlur";
import { Turnstile } from "@marsidev/react-turnstile";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function Register() {
  const [turnstileToken, setTurnstileToken] = useState("");
  const [step, setStep] = useState("enter-email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState(""); // store the registered user's ID

  const [suggestions, setSuggestions] = useState([]);
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [popup, setPopup] = useState({ message: "", type: "" });

  const [timer, setTimer] = useState(0);

  const [resendLimitReached, setResendLimitReached] = useState(false);

  // countdown effect
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (step === "verify-otp") {
      setTimer(60); // start 60s countdown immediately
    }
  }, [step]);

  const handleRegister = async () => {
    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setPopup(null);
      setTimeout(() => {
        setPopup({
          message: "All fields are required",
          type: "error",
          id: Date.now(),
        });
      }, 0);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setPopup(null);
      setTimeout(() => {
        setPopup({
          message: "Enter a valid email address",
          type: "error",
          id: Date.now(),
        });
      }, 0);
      return;
    }

    if (!/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).{8,15}$/.test(password)) {
      setPopup(null);
      setTimeout(() => {
        setPopup({
          message:
            "Password must be 8–15 chars, include letters, numbers & a special character",
          type: "error",
          id: Date.now(),
        });
      }, 0);
      return;
    }

    if (password !== confirmPassword) {
      setPopup(null);
      setTimeout(() => {
        setPopup({
          message: "Passwords do not match",
          type: "error",
          id: Date.now(),
        });
      }, 0);
      return;
    }

    setIsLoading(true);
    try {
      const res = await register({ name, email, password, turnstileToken });

      if (res.data.isVerified === false) {
        setPopup(null);
        setTimeout(() => {
          setPopup({
            message: "User exists. Please verify OTP.",
            type: "info",
            id: Date.now(),
          });
        }, 0);
        setUserId(res.data.userId);
        setStep("verify-otp");
        return;
      }

      setPopup(null);
      setTimeout(() => {
        setPopup({
          message: "Check your email for OTP",
          type: "success",
          id: Date.now(),
        });
      }, 0);

      setUserId(res.data.userId);
      setStep("verify-otp");
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Error during registration:", err);

      // Handle user already exists and verified → redirect to login
      if (
        err.response?.status === 409 ||
        err.response?.data?.message === "User already exists. Please login."
      ) {
        setPopup(null);
        setTimeout(() => {
          setPopup({
            message: "User already exists. Redirecting to login...",
            type: "info",
            id: Date.now(),
          });
        }, 0);
        router.push("/login");
        return;
      }

      setPopup(null);
      setTimeout(() => {
        setPopup({
          message: err.response?.data?.message || "Registration failed",
          type: "error",
          id: Date.now(),
        });
      }, 0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/api/auth/verify-otp`, {
        userId,
        otp,
      });

      setPopup({
        message: "Email verified! You can now log in.",
        type: "success",
      });

      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setPopup({
        message: err.response?.data?.message || "OTP verification failed",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/resend-otp`, {
        userId,
      });

      // Check if remaining attempts are 0
      if (res.data.remaining === 0) {
        setResendLimitReached(true);
      }

      setPopup({
        message: `${res.data.message}${
          res.data.remaining !== undefined
            ? ` (${res.data.remaining} attempts left)`
            : ""
        }`,
        type: "success",
      });

      setTimer(60); // start/reset countdown
    } catch (err) {
      // If backend returns limit reached error
      if (
        err.response?.status === 429 &&
        err.response?.data?.message === "Resend limit reached"
      ) {
        setResendLimitReached(true);
      }

      setPopup({
        message: err.response?.data?.message || "Failed to resend OTP",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // stops accidental form submission/page reload
      handleRegister();
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
    <div className="register flexClm gap_32">
      <Navbar />
      <div className="s_tit_des flexClm">
        <span className="tit font_20">Register and start journaling !</span>
        <span className="des font_14 shade_50">
          Your discipline starts here
        </span>
      </div>

      <div className="container">
        {step === "enter-email" && (
          <div className="flexClm gap_24">
            <div key="email-step" className="flexClm gap_24">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                type="text"
              />

              <div className="suggestionInput flexClm">
                <input
                  value={email}
                  onChange={handleChange}
                  placeholder="Email Address"
                  type="email"
                />
                {/* Email Validation */}
                {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                  <span className="font_12 error">
                    Enter a valid email (must include @ and .com)
                  </span>
                )}

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
            </div>

            <div className="flexClm gap_8 flex_center">
              <button
                className="button_pri flexRow flexRow_stretch"
                onClick={() => setStep("set-password")}
                disabled={!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
              >
                Next <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === "set-password" && (
          <div className="flexClm gap_24">
            <div key="password-step" className="flexClm gap_24">
              {/* Password */}
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
                {password &&
                  !/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).{8,15}$/.test(
                    password
                  ) && (
                    <span className="font_12 error">
                      Password: 8–15 chars, letters, numbers & 1 special
                      character
                    </span>
                  )}
              </div>

              {/* Confirm Password */}
              <div className="passwordWrap flexClm">
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  type={showConfirmPassword ? "text" : "password"}
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="button"
                  className="eyeButton button_ter flexRow"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
                {confirmPassword && password !== confirmPassword && (
                  <span className="font_12 error">Passwords do not match</span>
                )}
              </div>
            </div>

            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              onSuccess={(token) => setTurnstileToken(token)}
            />

            <div className="flexClm gap_8">
              <div className="flexRow flexRow_stretch gap_12">
                <button
                  className="button_sec flexRow"
                  onClick={() => setStep("enter-email")}
                  disabled={isLoading}
                >
                  <ArrowLeft size={20} />
                </button>

                <button
                  className="button_pri flexRow flexRow_stretch"
                  onClick={handleRegister}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 size={18} className="spinner" />
                  ) : (
                    <>
                      Register <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "verify-otp" && (
          <div className="flexClm gap_24">
            <div className="flexClm gap_24">
              <span className="font_16">
                Enter the 6-digit OTP sent to your email
              </span>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                type="text"
                maxLength={6}
              />
            </div>

            <div className="flexRow gap_8">
              <button
                className="button_sec flexRow width100 flex_center flexRow_stretch"
                onClick={handleResendOtp}
                disabled={isLoading || timer > 0 || resendLimitReached}
              >
                {resendLimitReached
                  ? "Resend limit reached"
                  : timer > 0
                  ? `Resend OTP in ${timer}s`
                  : "Resend OTP"}
              </button>

              <button
                className="button_pri flexRow width100 flex_center flexRow_stretch"
                onClick={handleVerifyOtp}
                disabled={otp.length !== 6 || isLoading}
              >
                {isLoading ? (
                  <Loader2 size={18} className="spinner" />
                ) : (
                  "Verify OTP"
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flexRow flex_center">
        <span className="direct_tertiary" onClick={() => router.push("/login")}>
          Already have an account? Sign-in
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
            window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`;
          }}
          className="button_sec flexRow flex_center gap_8"
        >
          <FcGoogle size={20} /> Sign up with Google
        </button>
      </div>

      <ToastMessage type={popup.type} message={popup.message} />
      <BackgroundBlur />
    </div>
  );
}

export default Register;
