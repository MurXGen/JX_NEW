"use client";

/* /forgot-password, revamp v2. Email → 6-digit code + new password →
   done. Backend: POST /api/auth/forgot-password + /reset-password. */

import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { AnimatePresence } from "framer-motion";
import axios from "axios";
import { ArrowLeft, Check, KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";

import {
  AuthShell, StepPane, Notice, useNotice, Field, TextInput, PasswordInput, OtpCode, Button,
  authStyles as s,
} from "@/components/authFlow/AuthShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState("email"); // email | reset | done
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { notice, errField, errorFor, flash, clear } = useNotice();

  useEffect(() => {
    if (!cooldown) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const requestCode = async (e) => {
    e?.preventDefault();
    if (!email.trim()) return flash("danger", "Enter your account email", "email");
    setBusy(true);
    try {
      await axios.post(`${API_BASE}/api/auth/forgot-password`, { email: email.trim() }, { withCredentials: true });
      setStep("reset");
      setCooldown(60);
      flash("success", "If that email exists, a code is on its way");
    } catch (err) {
      flash("danger", err.response?.data?.message || "Something went wrong, try again");
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async () => {
    if (otp.length !== 6) return flash("danger", "Enter the 6-digit code", "otp");
    if (password.length < 8) return flash("danger", "Password must be at least 8 characters", "password");
    if (password !== confirm) return flash("danger", "Passwords don't match", "confirm");
    setBusy(true);
    try {
      await axios.post(
        `${API_BASE}/api/auth/reset-password`,
        { email: email.trim(), otp, newPassword: password },
        { withCredentials: true },
      );
      setStep("done");
    } catch (err) {
      flash("danger", err.response?.data?.message || "Could not reset, check the code");
    } finally {
      setBusy(false);
    }
  };

  const mismatch = confirm && confirm !== password;

  return (
    <>
      <Head>
        <title>Reset Password, JournalX Trading Journal | journalx.app</title>
        <meta name="description" content="Reset your JournalX password securely at journalx.app and get back to analysing your trades in seconds." />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://journalx.app/forgot-password" />
      </Head>
      <AuthShell
        icon={step === "email" ? KeyRound : step === "reset" ? Lock : ShieldCheck}
        title={step === "email" ? "Reset your password" : step === "reset" ? "Set a new password" : "Password updated"}
        subtitle={
          step === "email"
            ? "Enter your account email and we'll send you a 6-digit code."
            : step === "reset"
              ? <>Enter the code we sent to <strong>{email}</strong></>
              : "You're all set. Log in with your new password."
        }
        switchLink={{ prompt: "Remembered it?", label: "Log in", href: "/login" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {step === "email" && (
            <StepPane id="email" as="form" onSubmit={requestCode} noValidate>
              <Notice notice={notice} />
              <Field id="fp-email" label="Email" error={errField === "email" && !email.trim() ? errorFor("email") : null}>
                <TextInput
                  id="fp-email"
                  icon={Mail}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  invalid={errField === "email" && !email.trim()}
                  describedBy={errField === "email" && !email.trim() ? "fp-email-error" : undefined}
                />
              </Field>
              <Button type="submit" busy={busy} busyLabel="Sending…" disabled={busy}>
                Send reset code
              </Button>
              <div className={s.center}>
                <Button variant="text" onClick={() => router.push("/login")}>
                  <ArrowLeft size={15} aria-hidden="true" /> Back to login
                </Button>
              </div>
            </StepPane>
          )}

          {step === "reset" && (
            <StepPane id="reset" as="form" onSubmit={(e) => { e.preventDefault(); submitReset(); }} noValidate>
              <Notice notice={notice} />
              <OtpCode value={otp} onChange={setOtp} error={errorFor("otp")} label="6-digit code from your email" />

              <Field
                id="fp-password"
                label="New password"
                hint="At least 8 characters"
                error={errField === "password" && password.length < 8 ? errorFor("password") : null}
              >
                <PasswordInput
                  id="fp-password"
                  icon={Lock}
                  autoComplete="new-password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  show={showPw}
                  onToggle={() => setShowPw(!showPw)}
                  autoFocus={false}
                  invalid={errField === "password" && password.length < 8}
                  describedBy={errField === "password" && password.length < 8 ? "fp-password-error" : "fp-password-hint"}
                />
              </Field>

              <Field id="fp-confirm" label="Confirm password" error={mismatch ? "Passwords don't match" : null}>
                <TextInput
                  id="fp-confirm"
                  icon={Lock}
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repeat it"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  invalid={!!mismatch}
                  describedBy={mismatch ? "fp-confirm-error" : undefined}
                  after={confirm && confirm === password ? (
                    <span className={s.okMark}><Check size={16} aria-hidden="true" /><span className={s.srOnly}>Passwords match</span></span>
                  ) : null}
                />
              </Field>

              <Button type="submit" busy={busy} busyLabel="Resetting…" disabled={busy}>
                Reset password
              </Button>

              <div className={s.navRow}>
                <Button variant="text" onClick={() => { clear(); setStep("email"); setOtp(""); }}>
                  <ArrowLeft size={15} aria-hidden="true" /> Back
                </Button>
                <Button variant="text" onClick={requestCode} disabled={cooldown > 0}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </Button>
              </div>
            </StepPane>
          )}

          {step === "done" && (
            <StepPane id="done">
              <Button onClick={() => router.push("/login")} autoFocus>
                Log in
              </Button>
            </StepPane>
          )}
        </AnimatePresence>
      </AuthShell>
    </>
  );
}
