"use client";

/* /login — revamp v2 auth. Email+password with Turnstile, Google OAuth,
   unverified accounts drop into the 6-digit OTP step, forgot-password link. */

import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import Cookies from "js-cookie";
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from "lucide-react";

import { Turnstile } from "@marsidev/react-turnstile";
import { AuthLayout, Button, OtpInput, Toast } from "@/components/revampV2";
import { saveToIndexedDB } from "@/utils/indexedDB";

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

function GoogleButton() {
  return (
    <Button
      type="button"
      variant="outline"
      style={{ width: "100%", justifyContent: "center" }}
      onClick={() => { window.location.href = `${API_BASE}/api/auth/google`; }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
      </svg>
      Continue with Google
    </Button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState("login"); // login | codeRequest | otp
  const [otpMode, setOtpMode] = useState("verify"); // verify (unverified acct) | login (passwordless)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpUserId, setOtpUserId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [captchaToken, setCaptchaToken] = useState("");
  const [codeCaptcha, setCodeCaptcha] = useState(""); // captcha for "send login code"
  const [otpCaptcha, setOtpCaptcha] = useState(""); // captcha for verifying the login code
  const [otpCaptchaKey, setOtpCaptchaKey] = useState(0); // bump to refresh the otp captcha
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

  const finishLogin = async (userData) => {
    Cookies.set("isVerified", "yes", { path: "/", sameSite: "Strict", expires: 365000 });
    if (userData) {
      try { await saveToIndexedDB("user-data", userData); } catch {}
      if (userData?.name) localStorage.setItem("userName", userData.name);
    }
    router.push("/dashboard");
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return flash("danger", "Enter your email and password");
    if (!captchaToken) return flash("danger", "Please complete the captcha first");
    setBusy(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/login`,
        { email: email.trim(), password, turnstileToken: captchaToken },
        { withCredentials: true },
      );
      await finishLogin(res.data?.userData);
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 403 && data?.userId) {
        /* not verified yet → OTP step */
        setOtpUserId(data.userId);
        setOtpMode("verify");
        setStep("otp");
        try {
          await axios.post(`${API_BASE}/api/auth/resend-otp`, { userId: data.userId }, { withCredentials: true });
          setCooldown(60);
          flash("info", "We emailed you a fresh verification code");
        } catch {
          flash("info", "Verify your email — enter the code we sent you");
        }
      } else {
        flash("danger", data?.message || "Login failed — try again");
      }
    } finally {
      setBusy(false);
    }
  };

  // request a passwordless login code for an existing account
  const requestLoginCode = async () => {
    if (!email.trim()) return flash("danger", "Enter your email first");
    if (!codeCaptcha) return flash("danger", "Please complete the captcha first");
    setBusy(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/login-otp/request`,
        { email: email.trim(), turnstileToken: codeCaptcha },
        { withCredentials: true },
      );
      setOtpUserId(res.data?.userId);
      setOtpMode("login");
      setOtp("");
      setOtpCaptcha("");
      setStep("otp");
      setCooldown(60);
      flash("success", "We emailed you a login code");
    } catch (err) {
      flash("danger", err.response?.data?.message || "Could not send code");
      setCodeCaptcha(""); // force a fresh captcha on retry
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    if (otp.length !== 6) return flash("danger", "Enter the 6-digit code");
    setBusy(true);
    try {
      if (otpMode === "login") {
        if (!otpCaptcha) { setBusy(false); return flash("danger", "Please complete the captcha first"); }
        const res = await axios.post(
          `${API_BASE}/api/auth/login-otp/verify`,
          { userId: otpUserId, otp, turnstileToken: otpCaptcha },
          { withCredentials: true },
        );
        flash("success", "Welcome back!");
        setTimeout(() => finishLogin(res.data?.userData), 700);
      } else {
        await axios.post(`${API_BASE}/api/auth/verify-otp`, { userId: otpUserId, otp }, { withCredentials: true });
        flash("success", "Email verified — welcome back!");
        setTimeout(() => finishLogin(null), 700);
      }
    } catch (err) {
      flash("danger", err.response?.data?.message || "Invalid code");
      // login captcha tokens are single-use — refresh after a failed attempt
      if (otpMode === "login") { setOtpCaptcha(""); setOtpCaptchaKey((k) => k + 1); }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      if (otpMode === "login") {
        if (!otpCaptcha) return flash("danger", "Please complete the captcha first");
        const res = await axios.post(`${API_BASE}/api/auth/login-otp/request`, { email: email.trim(), turnstileToken: otpCaptcha }, { withCredentials: true });
        if (res.data?.userId) setOtpUserId(res.data.userId);
        setCooldown(60);
        // consumed the token — refresh so the verify step gets a fresh one
        setOtpCaptcha("");
        setOtpCaptchaKey((k) => k + 1);
        flash("success", "Login code resent");
      } else {
        const res = await axios.post(`${API_BASE}/api/auth/resend-otp`, { userId: otpUserId }, { withCredentials: true });
        setCooldown(60);
        flash("success", `Code resent${res.data?.remaining != null ? ` · ${res.data.remaining} left` : ""}`);
      }
    } catch (err) {
      flash("danger", err.response?.data?.message || "Could not resend");
    }
  };

  return (
    <>
      <Head>
        <title>JournalX Login — Sign In to Your Trading Journal | journalx.app</title>
        <meta name="description" content="Log in to JournalX, the trading journal that gives you trade log analysis in seconds. Access your dashboard, equity curve, R-multiples and discipline analytics at journalx.app." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://journalx.app/login" />
        <meta property="og:title" content="JournalX Login — Sign In to Your Trading Journal" />
        <meta property="og:description" content="Sign in to your JournalX trading journal at journalx.app." />
        <meta property="og:url" content="https://journalx.app/login" />
        <meta name="twitter:title" content="JournalX Login — Sign In to Your Trading Journal" />
      </Head>
      <AuthLayout
        title={step === "login" ? "Welcome back" : step === "codeRequest" ? "Log in with a code" : "Check your email"}
        subtitle={
          step === "login"
            ? "Log in to your trading journal"
            : step === "codeRequest"
              ? "We'll email you a one-time login code — no password needed"
              : `We sent a 6-digit code to ${email}`
        }
      >
      <Toast toast={toast} />
      <AnimatePresence mode="wait">
        {step === "login" ? (
          <motion.form
            key="login"
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            onSubmit={submitLogin}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
          >
            <div className="jx-field">
              <label className="jx-field__label">Email</label>
              <div className="jx-input">
                <span className="jx-input__icon"><Mail size={15} /></span>
                <input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="jx-field">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label className="jx-field__label">Password</label>
                <a href="/forgot-password" style={{ font: "var(--text-small)", color: "var(--yellow-600)", textDecoration: "none", fontWeight: 600 }}>
                  Forgot password?
                </a>
              </div>
              <div className="jx-input">
                <span className="jx-input__icon"><Lock size={15} /></span>
                <input type={showPw ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex" }} aria-label="Toggle password">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              onSuccess={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken("")}
              onError={() => setCaptchaToken("")}
              options={{ size: "flexible" }}
            />

            <Button type="submit" variant="primary" disabled={busy || !captchaToken} style={{ width: "100%", justifyContent: "center", minHeight: 44 }}>
              {busy ? <><Spinner /> Logging in…</> : "Log in"}
            </Button>

            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", color: "var(--color-text-muted)", font: "var(--text-caption)" }}>
              <span style={{ flex: 1, height: 1, background: "var(--color-border)" }} /> or <span style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
            </div>

            <GoogleButton />

            <Button
              type="button"
              variant="ghost"
              onClick={() => { setOtpMode("login"); setOtp(""); setStep("codeRequest"); }}
              style={{ width: "100%", justifyContent: "center" }}
            >
              Log in with an email code
            </Button>

            <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)", textAlign: "center" }}>
              New to JournalX?{" "}
              <a href="/register" style={{ color: "var(--yellow-600)", fontWeight: 600, textDecoration: "none" }}>Create an account</a>
            </span>
          </motion.form>
        ) : step === "codeRequest" ? (
          <motion.div
            key="codeRequest"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.18 }}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
          >
            <div className="jx-field">
              <label className="jx-field__label">Email</label>
              <div className="jx-input">
                <span className="jx-input__icon"><Mail size={15} /></span>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && requestLoginCode()}
                />
              </div>
            </div>

            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              onSuccess={(token) => setCodeCaptcha(token)}
              onExpire={() => setCodeCaptcha("")}
              onError={() => setCodeCaptcha("")}
              options={{ size: "flexible" }}
            />

            <Button variant="primary" disabled={busy || !email.trim() || !codeCaptcha} onClick={requestLoginCode} style={{ width: "100%", justifyContent: "center", minHeight: 44 }}>
              {busy ? <><Spinner /> Sending…</> : "Send login code"}
            </Button>

            <button className="jx-btn jx-btn--ghost jx-btn--sm" onClick={() => { setStep("login"); setOtp(""); setCodeCaptcha(""); }} style={{ alignSelf: "center" }}>
              <ArrowLeft size={14} /> Back to password login
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.18 }}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
          >
            <OtpInput value={otp} onChange={setOtp} />
            {otpMode === "login" && (
              <Turnstile
                key={otpCaptchaKey}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                onSuccess={(token) => setOtpCaptcha(token)}
                onExpire={() => setOtpCaptcha("")}
                onError={() => setOtpCaptcha("")}
                options={{ size: "flexible" }}
              />
            )}
            <Button variant="primary" disabled={busy || otp.length !== 6 || (otpMode === "login" && !otpCaptcha)} onClick={submitOtp} style={{ width: "100%", justifyContent: "center", minHeight: 44 }}>
              {busy ? <><Spinner /> Verifying…</> : "Verify & log in"}
            </Button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button className="jx-btn jx-btn--ghost jx-btn--sm" onClick={() => { setStep(otpMode === "login" ? "codeRequest" : "login"); setOtp(""); }}>
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
    </>
  );
}
