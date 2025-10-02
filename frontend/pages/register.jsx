"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";
import { containerVariants, childVariants } from "@/animations/motionVariants";
import { register } from "@/api/auth";
import Navbar from "@/components/Auth/Navbar";
import ToastMessage from "@/components/ui/ToastMessage";
import BackgroundBlur from "@/components/ui/BackgroundBlur";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function Register() {
  const [step, setStep] = useState("enter-email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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

  const handleRegister = async () => {
    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setPopup({ message: "All fields are required", type: "error" });
      return;
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setPopup({ message: "Enter a valid email address", type: "error" });
      return;
    }

    // Password validation (8–15 chars, letters, number, special char)
    if (!/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).{8,15}$/.test(password)) {
      setPopup({
        message:
          "Password must be 8–15 chars, include letters, numbers & a special character",
        type: "error",
      });
      return;
    }

    if (password !== confirmPassword) {
      setPopup({ message: "Passwords do not match", type: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await register({ name, email, password });

      setPopup({ message: "Registered successfully!", type: "success" });

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err) {
      console.error("Error during registration:", err);
      setPopup({
        message: err.response?.data?.message || "Registration failed",
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
          <div className="flexClm gap_32">
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
              <span
                className="direct_tertiary"
                onClick={() => router.push("/login")}
              >
                Already have an account? Sign-in
              </span>
            </div>
          </div>
        )}

        {step === "set-password" && (
          <div className="flexClm gap_32">
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
      </div>

      <div className="flexClm">
        <button
          onClick={() => {
            window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`;
          }}
          className="button_sec flexRow gap_8"
        >
          Sign up with Google
        </button>
      </div>

      <ToastMessage type={popup.type} message={popup.message} />
      <BackgroundBlur />
    </div>
  );
}

export default Register;
