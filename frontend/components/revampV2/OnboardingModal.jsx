"use client";

/* New-user onboarding, a short interactive walkthrough:
   Create account → Log trade → Best analytics. Prev/Next navigation;
   finishing fires confetti, activates the 7-day Pro trial, and closes
   (the user stays on the dashboard). */

import { useState } from "react";
import axios from "axios";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  PlusCircle,
  Sparkles,
  Wallet,
} from "lucide-react";
import OnboardingFrame, { onbStyles as o } from "@/components/authFlow/OnboardingFrame";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const STEPS = [
  {
    icon: Wallet,
    title: "Your journal is ready",
    body: "We've set up your first journal. Log your personal and funded accounts here, organised, private and yours.",
  },
  {
    icon: PlusCircle,
    title: "Log a trade in seconds",
    body: "Quick Log for P&L only, or Detailed for entries, risk, screenshots and emotions. Connect an exchange to auto-import.",
  },
  {
    icon: BarChart3,
    title: "Watch your edge grow",
    body: "Every trade becomes analytics: win rate, R-multiples, streaks and more. Finish to start your 7-day Pro trial.",
  },
];

export default function OnboardingModal({ open, onClose, onTrialActivated }) {
  const [i, setI] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [done, setDone] = useState(false);

  const last = i === STEPS.length - 1;

  const fireConfetti = () => {
    const end = Date.now() + 1500;
    const tick = () => {
      confetti({ particleCount: 6, spread: 70, startVelocity: 35, origin: { x: Math.random(), y: 0 }, zIndex: 9999 });
      if (Date.now() < end) requestAnimationFrame(tick);
    };
    tick();
  };

  // activate the 7-day Pro trial (shared by Finish + Skip)
  const activate = async () => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/activate-trial`, {}, { withCredentials: true });
      onTrialActivated?.(res.data?.subscription);
    } catch (e) {
      console.error("Trial activation failed:", e?.message);
    }
    try { localStorage.setItem("jx-onboarded", "1"); } catch {}
  };

  const finish = async () => {
    setFinishing(true);
    await activate();
    setFinishing(false);
    setDone(true);
    fireConfetti();
  };

  // Skip still grants the trial, just without the celebration screen
  const skip = async () => {
    setFinishing(true);
    await activate();
    setFinishing(false);
    onClose?.();
  };

  const close = () => {
    try { localStorage.setItem("jx-onboarded", "1"); } catch {}
    onClose?.();
  };

  const step = STEPS[i];

  return (
    <OnboardingFrame
      open={open}
      icon={done ? Sparkles : step.icon}
      kicker={done ? "Trial active" : `${i + 1} of ${STEPS.length}`}
      title={done ? "You're all set" : step.title}
      lead={done
        ? <>Your <strong style={{ color: "#f5f6f8", fontWeight: 600 }}>7-day Pro trial</strong> is active: unlimited trades, full analytics and exports.</>
        : step.body}
      busy={finishing}
      onEscape={done ? close : undefined}
    >
      {done ? (
        <div className={o.actions} style={{ justifyContent: "center" }}>
          <button type="button" className={`${o.btn} ${o.gold}`} onClick={close} data-autofocus="">
            Start journaling <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <div className={o.progress} style={{ marginTop: 20, marginBottom: 0 }} aria-hidden="true">
            {STEPS.map((_, idx) => <span key={idx} data-on={idx <= i ? "true" : undefined} />)}
          </div>
          <div className={o.actions}>
            <button type="button" className={`${o.btn} ${o.ghost}`} onClick={() => (i === 0 ? skip() : setI(i - 1))} disabled={finishing}>
              {i === 0 ? "Skip" : (<><ArrowLeft size={15} aria-hidden="true" /> Back</>)}
            </button>
            <button type="button" className={`${o.btn} ${o.gold}`} onClick={() => (last ? finish() : setI(i + 1))} disabled={finishing} data-autofocus="">
              {finishing ? "Activating…" : last ? "Start my trial" : "Next"} {!finishing && <ArrowRight size={15} aria-hidden="true" />}
            </button>
          </div>
        </>
      )}
    </OnboardingFrame>
  );
}
