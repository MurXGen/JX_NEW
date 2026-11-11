"use client";

/* /login, revamp v2 auth. Email+password with Turnstile, Google OAuth,
   unverified accounts drop into the 6-digit OTP step, forgot-password link. */

import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { AnimatePresence } from "framer-motion";
import axios from "axios";
import Cookies from "js-cookie";
import { ArrowLeft, KeyRound, Lock, LogIn, MailCheck } from "lucide-react";

import { Turnstile } from "@marsidev/react-turnstile";
import {
  AuthShell, StepPane, Notice, useNotice, Field, PasswordInput, EmailInput, OtpCode,
  Button, Divider, GoogleButton, CaptchaSlot, authStyles as s,
} from "@/components/authFlow/AuthShell";
import { saveToIndexedDB } from "@/utils/indexedDB";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

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
  const { notice, errField, errorFor, flash, clear } = useNotice();

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
    if (!email.trim() || !password) return flash("danger", "Enter your email and password", !email.trim() ? "email" : "password");
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
          flash("info", "Verify your email, enter the code we sent you");
        }
      } else {
        flash("danger", data?.message || "Login failed, try again");
      }
    } finally {
      setBusy(false);
    }
  };

  // request a passwordless login code for an existing account
  const requestLoginCode = async () => {
    if (!email.trim()) return flash("danger", "Enter your email first", "email");
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
    if (otp.length !== 6) return flash("danger", "Enter the 6-digit code", "otp");
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
        flash("success", "Email verified, welcome back!");
        setTimeout(() => finishLogin(null), 700);
      }
    } catch (err) {
      flash("danger", err.response?.data?.message || "Invalid code", "otp");
      // login captcha tokens are single-use, refresh after a failed attempt
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
        // consumed the token, refresh so the verify step gets a fresh one
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

  const captchaOpts = { size: "flexible", theme: "dark" };
  const back = (to) => { clear(); to(); };
  const emailErr = errField === "email" && !email.trim();
  const pwErr = errField === "password" && !password;

  return (
    <>
      <Head>
        <title>JournalX Login, Sign In to Your Trading Journal | journalx.app</title>
        <meta name="description" content="Log in to JournalX, the trading journal that gives you trade log analysis in seconds. Access your dashboard, equity curve, R-multiples and discipline analytics at journalx.app." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://journalx.app/login" />
        <meta property="og:title" content="JournalX Login, Sign In to Your Trading Journal" />
        <meta property="og:description" content="Sign in to your JournalX trading journal at journalx.app." />
        <meta property="og:url" content="https://journalx.app/login" />
        <meta name="twitter:title" content="JournalX Login, Sign In to Your Trading Journal" />
      </Head>
      <AuthShell
        icon={step === "login" ? LogIn : step === "codeRequest" ? KeyRound : MailCheck}
        title={step === "login" ? "Log in to JournalX" : step === "codeRequest" ? "Log in with a code" : "Check your email"}
        subtitle={
          step === "login"
            ? "Pick up your journal where you left off."
            : step === "codeRequest"
              ? "We'll email you a one-time login code. No password needed."
              : <>We sent a 6-digit code to <strong>{email}</strong></>
        }
        switchLink={{ prompt: "New to JournalX?", label: "Create account", href: "/register" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {step === "login" ? (
            <StepPane id="login" as="form" onSubmit={submitLogin} noValidate>
              <Notice notice={notice} />
              <GoogleButton href={`${API_BASE}/api/auth/google`} />
              <Divider>or continue with email</Divider>

              <Field id="login-email" label="Email" error={emailErr ? errorFor("email") : null}>
                <EmailInput id="login-email" value={email} onChange={setEmail} invalid={emailErr} describedBy={emailErr ? "login-email-error" : undefined} />
              </Field>

              <Field
                id="login-password"
                label="Password"
                labelAside={<a href="/forgot-password" className={`${s.link} ${s.smallLink}`}>Forgot password?</a>}
                error={pwErr ? errorFor("password") : null}
              >
                <PasswordInput
                  id="login-password"
                  icon={Lock}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  show={showPw}
                  onToggle={() => setShowPw(!showPw)}
                  invalid={pwErr}
                  describedBy={pwErr ? "login-password-error" : undefined}
                />
              </Field>

              <CaptchaSlot>
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken("")}
                  onError={() => setCaptchaToken("")}
                  options={captchaOpts}
                />
              </CaptchaSlot>

              <Button type="submit" busy={busy} busyLabel="Logging in…" disabled={busy || !captchaToken}>
                Log in
              </Button>

              <div className={s.center}>
                <Button variant="text" onClick={() => { clear(); setOtpMode("login"); setOtp(""); setStep("codeRequest"); }}>
                  Email me a login code instead
                </Button>
              </div>

              <p className={s.alt}>
                New to JournalX? <a href="/register" className={s.link}>Create an account</a>
              </p>
            </StepPane>
          ) : step === "codeRequest" ? (
            <StepPane id="codeRequest" as="form" onSubmit={(e) => { e.preventDefault(); requestLoginCode(); }} noValidate>
              <Notice notice={notice} />
              <Field id="code-email" label="Email" error={emailErr ? errorFor("email") : null}>
                <EmailInput id="code-email" value={email} onChange={setEmail} onEnter={requestLoginCode} autoFocus invalid={emailErr} describedBy={emailErr ? "code-email-error" : undefined} />
              </Field>

              <CaptchaSlot>
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setCodeCaptcha(token)}
                  onExpire={() => setCodeCaptcha("")}
                  onError={() => setCodeCaptcha("")}
                  options={captchaOpts}
                />
              </CaptchaSlot>

              <Button type="submit" busy={busy} busyLabel="Sending…" disabled={busy || !email.trim() || !codeCaptcha}>
                Send login code
              </Button>

              <div className={s.center}>
                <Button variant="text" onClick={() => back(() => { setStep("login"); setOtp(""); setCodeCaptcha(""); })}>
                  <ArrowLeft size={15} aria-hidden="true" /> Back to password login
                </Button>
              </div>
            </StepPane>
          ) : (
            <StepPane id="otp" as="form" onSubmit={(e) => { e.preventDefault(); submitOtp(); }} noValidate>
              <Notice notice={notice} />
              <OtpCode value={otp} onChange={setOtp} error={errorFor("otp")} label="6-digit code from your email" />
              {otpMode === "login" && (
                <CaptchaSlot>
                  <Turnstile
                    key={otpCaptchaKey}
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                    onSuccess={(token) => setOtpCaptcha(token)}
                    onExpire={() => setOtpCaptcha("")}
                    onError={() => setOtpCaptcha("")}
                    options={captchaOpts}
                  />
                </CaptchaSlot>
              )}
              <Button type="submit" busy={busy} busyLabel="Verifying…" disabled={busy || otp.length !== 6 || (otpMode === "login" && !otpCaptcha)}>
                Verify &amp; log in
              </Button>
              <div className={s.navRow}>
                <Button variant="text" onClick={() => back(() => { setStep(otpMode === "login" ? "codeRequest" : "login"); setOtp(""); })}>
                  <ArrowLeft size={15} aria-hidden="true" /> Back
                </Button>
                <Button variant="text" onClick={resend} disabled={cooldown > 0}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </Button>
              </div>
            </StepPane>
          )}
        </AnimatePresence>
      </AuthShell>
    </>
  );
}
