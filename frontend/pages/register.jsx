"use client";

/* /register, revamp v2 auth. Name/email/password with Turnstile,
   Google OAuth, then 6-digit OTP verification. */

import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { AnimatePresence } from "framer-motion";
import axios from "axios";
import Cookies from "js-cookie";
import { ArrowLeft, Check, Lock, MailCheck, User, UserPlus } from "lucide-react";

import { Turnstile } from "@marsidev/react-turnstile";
import {
  AuthShell, StepPane, Notice, useNotice, Field, TextInput, PasswordInput, EmailInput, OtpCode,
  Button, Divider, GoogleButton, CaptchaSlot, authStyles as s,
} from "@/components/authFlow/AuthShell";
import { trackSignUp, trackEmailVerified } from "@/utils/gtag";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

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
  const { notice, errField, errorFor, flash, clear } = useNotice();

  /* capture a referral tag (?ref=) so it can be attributed later */
  useEffect(() => {
    const ref = router.query?.ref;
    if (ref) {
      try {
        localStorage.setItem("jx-ref", String(ref));
      } catch {}
    }
  }, [router.query?.ref]);

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
    if (!name.trim()) return flash("danger", "What should we call you?", "name");
    if (!email.trim()) return flash("danger", "Enter your email", "email");
    if (!pwOk) return flash("danger", "Password needs 8+ chars with a letter and a number", "password");
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
      trackSignUp("email"); // funnel: account created
      flash("success", "Account created, check your email for the code");
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 409) {
        flash("danger", "Account already exists, log in instead", "email");
      } else {
        flash("danger", data?.message || "Registration failed, try again");
      }
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    if (otp.length !== 6) return flash("danger", "Enter the 6-digit code", "otp");
    setBusy(true);
    try {
      await axios.post(`${API_BASE}/api/auth/verify-otp`, { userId, otp }, { withCredentials: true });
      Cookies.set("isVerified", "yes", { path: "/", sameSite: "Strict", expires: 365000 });
      trackEmailVerified(); // funnel: account activated (email verified)
      // signal the dashboard to show the onboarding guide (registration only)
      try { localStorage.setItem("jx-show-onboarding", "1"); } catch {}
      flash("success", "You're in, welcome to JournalX!");
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (err) {
      flash("danger", err.response?.data?.message || "Invalid code", "otp");
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

  const captchaOpts = { size: "flexible", theme: "dark" };
  const nameErr = errField === "name" && !name.trim();
  const emailErr = errField === "email" && (errorFor("email") !== "Enter your email" || !email.trim());
  const pwErr = errField === "password" && !pwOk;

  return (
    <>
      <Head>
        <title>JournalX Sign Up, Create Your Free Trading Journal | journalx.app</title>
        <meta name="description" content="Create your free JournalX account and get trade log analysis in under 10 seconds. Sign up at journalx.app, no card required, and start increasing your profitability today." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://journalx.app/register" />
        <meta property="og:title" content="JournalX Sign Up, Create Your Free Trading Journal" />
        <meta property="og:description" content="Start your free JournalX trading journal at journalx.app, no card required." />
        <meta property="og:url" content="https://journalx.app/register" />
        <meta name="twitter:title" content="JournalX Sign Up, Create Your Free Trading Journal" />
      </Head>
      <AuthShell
        icon={step === "form" ? UserPlus : MailCheck}
        step={step === "form" ? "Step 1 of 2" : "Step 2 of 2"}
        title={step === "form" ? "Create your journal" : "Verify your email"}
        subtitle={
          step === "form"
            ? "Free to start, no card required. Journal your personal and funded accounts in one place."
            : <>We sent a 6-digit code to <strong>{email}</strong></>
        }
        switchLink={{ prompt: "Already journaling?", label: "Log in", href: "/login" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {step === "form" ? (
            <StepPane id="form" as="form" onSubmit={submitRegister} noValidate>
              <Notice notice={notice} />
              <GoogleButton href={`${API_BASE}/api/auth/google`} label="Sign up with Google" />
              <Divider>or sign up with email</Divider>

              <Field id="reg-name" label="Name" error={nameErr ? errorFor("name") : null}>
                <TextInput
                  id="reg-name"
                  icon={User}
                  autoComplete="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  invalid={nameErr}
                  describedBy={nameErr ? "reg-name-error" : undefined}
                />
              </Field>

              <Field id="reg-email" label="Email" error={emailErr ? errorFor("email") : null}>
                <EmailInput id="reg-email" value={email} onChange={setEmail} invalid={emailErr} describedBy={emailErr ? "reg-email-error" : undefined} />
              </Field>

              <Field id="reg-password" label="Password" error={pwErr ? errorFor("password") : null}>
                <PasswordInput
                  id="reg-password"
                  icon={Lock}
                  autoComplete="new-password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  show={showPw}
                  onToggle={() => setShowPw(!showPw)}
                  invalid={pwErr}
                  describedBy={pwErr ? "reg-password-error reg-password-rules" : "reg-password-rules"}
                />
                <ul id="reg-password-rules" className={s.checks} aria-label="Password requirements">
                  {pwChecks.map(([label, ok]) => (
                    <li key={label} data-ok={ok ? "true" : undefined}>
                      <Check size={13} aria-hidden="true" /> {label}
                      <span className={s.srOnly}>{ok ? "(met)" : "(not met)"}</span>
                    </li>
                  ))}
                </ul>
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

              <Button type="submit" busy={busy} busyLabel="Creating account…" disabled={busy || !captchaToken}>
                Create account
              </Button>

              <p className={s.alt}>
                Already journaling? <a href="/login" className={s.link}>Log in</a>
              </p>
            </StepPane>
          ) : (
            <StepPane id="otp" as="form" onSubmit={(e) => { e.preventDefault(); submitOtp(); }} noValidate>
              <Notice notice={notice} />
              <OtpCode value={otp} onChange={setOtp} error={errorFor("otp")} label="6-digit code from your email" />
              <Button type="submit" busy={busy} busyLabel="Verifying…" disabled={busy || otp.length !== 6}>
                Verify &amp; start journaling
              </Button>
              <div className={s.navRow}>
                <Button variant="text" onClick={() => { clear(); setStep("form"); setOtp(""); }}>
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
