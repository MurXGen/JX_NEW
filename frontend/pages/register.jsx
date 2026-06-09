"use client";

/* /register — revamp v2 auth. Name/email/password with Turnstile,
   Google OAuth, then 6-digit OTP verification. */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import Cookies from "js-cookie";
import { ArrowLeft, Check, Eye, EyeOff, Lock, Mail, User } from "lucide-react";

import { Turnstile } from "@marsidev/react-turnstile";
import { AuthLayout, Button, OtpInput, Toast } from "@/components/revampV2";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      style={{ width: 14, height: 14, borderRadius: "50%", display: "inline-block", border: "2px solid color-mix(in srgb, currentColor 30%, transparent)", borderTopColor: "currentColor" }}
    />
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState("form"); // form | otp
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [captchaToken, setCaptchaToken] = useState("");
  const [toast, setToast] = useState(null);
  const flash = (type, msg, ms = 3500) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), ms);
  };

  useEffect(() => {
    if (Cookies.get("isVerified") === "yes") router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    if (!cooldown) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const pwChecks = [
    ["8+ characters", password.length >= 8],
    ["A number", /\d/.test(password)],
    ["A letter", /[a-zA-Z]/.test(password)],
  ];
  const pwOk = pwChecks.every(([, ok]) => ok);

  const submitRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) return flash("danger", "What should we call you?");
    if (!email.trim()) return flash("danger", "Enter your email");
    if (!pwOk) return flash("danger", "Password needs 8+ chars with a letter and a number");
    if (!captchaToken) return flash("danger", "Please complete the captcha first");
    setBusy(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/register`,
        {
          name: name.trim(),
          email: email.trim(),
          password,
          turnstileToken: captchaToken,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        { withCredentials: true },
      );
      // brand-new account on this browser → wipe any leftover state from a
      // previous account so onboarding shows again and no stale data leaks
      try {
        localStorage.clear();
        sessionStorage.clear();
        // best-effort: drop the cached IndexedDB store ("JX")
        if (window.indexedDB?.deleteDatabase) {
          try { window.indexedDB.deleteDatabase("JX"); } catch {}
        }
      } catch {}
      setUserId(res.data?.userId);
      setStep("otp");
      setCooldown(60);
      flash("success", "Account created — check your email for the code");
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 409) {
        flash("danger", "Account already exists — log in instead");
      } else {
        flash("danger", data?.message || "Registration failed — try again");
      }
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    if (otp.length !== 6) return flash("danger", "Enter the 6-digit code");
    setBusy(true);
    try {
      await axios.post(`${API_BASE}/api/auth/verify-otp`, { userId, otp }, { withCredentials: true });
      Cookies.set("isVerified", "yes", { path: "/", sameSite: "Strict", expires: 365000 });
      flash("success", "You're in — welcome to JournalX!");
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (err) {
      flash("danger", err.response?.data?.message || "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/resend-otp`, { userId }, { withCredentials: true });
      setCooldown(60);
      flash("success", `Code resent${res.data?.remaining != null ? ` · ${res.data.remaining} left` : ""}`);
    } catch (err) {
      flash("danger", err.response?.data?.message || "Could not resend");
    }
  };

  return (
    <AuthLayout
      title={step === "form" ? "Create your account" : "Verify your email"}
      subtitle={step === "form" ? "Free to start — log your first trade in under a minute" : `We sent a 6-digit code to ${email}`}
    >
      <Toast toast={toast} />
      <AnimatePresence mode="wait">
        {step === "form" ? (
          <motion.form
            key="form"
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            onSubmit={submitRegister}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
          >
            <div className="jx-field">
              <label className="jx-field__label">Name</label>
              <div className="jx-input">
                <span className="jx-input__icon"><User size={15} /></span>
                <input autoComplete="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>

            <div className="jx-field">
              <label className="jx-field__label">Email</label>
              <div className="jx-input">
                <span className="jx-input__icon"><Mail size={15} /></span>
                <input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="jx-field">
              <label className="jx-field__label">Password</label>
              <div className="jx-input">
                <span className="jx-input__icon"><Lock size={15} /></span>
                <input type={showPw ? "text" : "password"} autoComplete="new-password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex" }} aria-label="Toggle password">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {password && (
                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                  {pwChecks.map(([label, ok]) => (
                    <span key={label} style={{ display: "flex", alignItems: "center", gap: 4, font: "var(--text-caption)", color: ok ? "var(--color-success)" : "var(--color-text-muted)" }}>
                      <Check size={12} /> {label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              onSuccess={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken("")}
              onError={() => setCaptchaToken("")}
              options={{ size: "flexible" }}
            />

            <Button type="submit" variant="primary" disabled={busy || !captchaToken} style={{ width: "100%", justifyContent: "center", minHeight: 44 }}>
              {busy ? <><Spinner /> Creating account…</> : "Create account"}
            </Button>

            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", color: "var(--color-text-muted)", font: "var(--text-caption)" }}>
              <span style={{ flex: 1, height: 1, background: "var(--color-border)" }} /> or <span style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
            </div>

            <Button type="button" variant="outline" style={{ width: "100%", justifyContent: "center" }} onClick={() => { window.location.href = `${API_BASE}/api/auth/google`; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
              </svg>
              Sign up with Google
            </Button>

            <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)", textAlign: "center" }}>
              Already journaling?{" "}
              <a href="/login" style={{ color: "var(--yellow-600)", fontWeight: 600, textDecoration: "none" }}>Log in</a>
            </span>
          </motion.form>
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.18 }}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
          >
            <OtpInput value={otp} onChange={setOtp} />
            <Button variant="primary" disabled={busy || otp.length !== 6} onClick={submitOtp} style={{ width: "100%", justifyContent: "center", minHeight: 44 }}>
              {busy ? <><Spinner /> Verifying…</> : "Verify & start journaling"}
            </Button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button className="jx-btn jx-btn--ghost jx-btn--sm" onClick={() => { setStep("form"); setOtp(""); }}>
                <ArrowLeft size={14} /> Back
              </button>
              <button className="jx-btn jx-btn--ghost jx-btn--sm" onClick={resend} disabled={cooldown > 0}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
