"use client";

/* /forgot-password — revamp v2. Email → 6-digit code + new password →
   done. Backend: POST /api/auth/forgot-password + /reset-password. */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { ArrowLeft, Check, CheckCircle2, Eye, EyeOff, Lock, Mail } from "lucide-react";

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
  const [toast, setToast] = useState(null);
  const flash = (type, msg, ms = 3500) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), ms);
  };

  useEffect(() => {
    if (!cooldown) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const requestCode = async (e) => {
    e?.preventDefault();
    if (!email.trim()) return flash("danger", "Enter your account email");
    setBusy(true);
    try {
      await axios.post(`${API_BASE}/api/auth/forgot-password`, { email: email.trim() }, { withCredentials: true });
      setStep("reset");
      setCooldown(60);
      flash("success", "If that email exists, a code is on its way");
    } catch (err) {
      flash("danger", err.response?.data?.message || "Something went wrong — try again");
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async () => {
    if (otp.length !== 6) return flash("danger", "Enter the 6-digit code");
    if (password.length < 8) return flash("danger", "Password must be at least 8 characters");
    if (password !== confirm) return flash("danger", "Passwords don't match");
    setBusy(true);
    try {
      await axios.post(
        `${API_BASE}/api/auth/reset-password`,
        { email: email.trim(), otp, newPassword: password },
        { withCredentials: true },
      );
      setStep("done");
    } catch (err) {
      flash("danger", err.response?.data?.message || "Could not reset — check the code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={step === "email" ? "Reset your password" : step === "reset" ? "Set a new password" : "Password updated"}
      subtitle={
        step === "email"
          ? "We'll email you a 6-digit code"
          : step === "reset"
            ? `Enter the code we sent to ${email}`
            : "You're all set — log in with your new password"
      }
    >
      <Toast toast={toast} />
      <AnimatePresence mode="wait">
        {step === "email" && (
          <motion.form
            key="email"
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            onSubmit={requestCode}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
          >
            <div className="jx-field">
              <label className="jx-field__label">Email</label>
              <div className="jx-input">
                <span className="jx-input__icon"><Mail size={15} /></span>
                <input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <Button type="submit" variant="primary" disabled={busy} style={{ width: "100%", justifyContent: "center", minHeight: 44 }}>
              {busy ? <><Spinner /> Sending…</> : "Send reset code"}
            </Button>
            <button type="button" className="jx-btn jx-btn--ghost jx-btn--sm" onClick={() => router.push("/login")} style={{ alignSelf: "center" }}>
              <ArrowLeft size={14} /> Back to login
            </button>
          </motion.form>
        )}

        {step === "reset" && (
          <motion.div
            key="reset"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.18 }}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
          >
            <div className="jx-field">
              <label className="jx-field__label">Verification code</label>
              <OtpInput value={otp} onChange={setOtp} />
            </div>

            <div className="jx-field">
              <label className="jx-field__label">New password</label>
              <div className="jx-input">
                <span className="jx-input__icon"><Lock size={15} /></span>
                <input type={showPw ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex" }} aria-label="Toggle password">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="jx-field">
              <label className="jx-field__label">Confirm password</label>
              <div className={`jx-input ${confirm && confirm !== password ? "jx-input--error" : ""}`}>
                <span className="jx-input__icon"><Lock size={15} /></span>
                <input type={showPw ? "text" : "password"} autoComplete="new-password" placeholder="Repeat it" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                {confirm && confirm === password && <Check size={15} style={{ color: "var(--color-success)" }} />}
              </div>
            </div>

            <Button variant="primary" disabled={busy} onClick={submitReset} style={{ width: "100%", justifyContent: "center", minHeight: 44 }}>
              {busy ? <><Spinner /> Resetting…</> : "Reset password"}
            </Button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button className="jx-btn jx-btn--ghost jx-btn--sm" onClick={() => { setStep("email"); setOtp(""); }}>
                <ArrowLeft size={14} /> Back
              </button>
              <button className="jx-btn jx-btn--ghost jx-btn--sm" onClick={requestCode} disabled={cooldown > 0}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0" }}
          >
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
              style={{ color: "var(--color-success)", display: "flex" }}
            >
              <CheckCircle2 size={56} />
            </motion.span>
            <Button variant="primary" onClick={() => router.push("/login")} style={{ width: "100%", justifyContent: "center", minHeight: 44 }}>
              Log in
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
