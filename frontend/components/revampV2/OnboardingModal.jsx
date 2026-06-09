"use client";

/* New-user onboarding — a short interactive walkthrough:
   Create account → Log trade → Best analytics. Prev/Next navigation;
   finishing fires confetti, activates the 7-day Pro trial, and closes
   (the user stays on the dashboard). */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import Button from "./Button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const STEPS = [
  {
    icon: Wallet,
    accent: "#22d3ee",
    title: "Your journal is ready",
    body: "We've set up your first trading journal. Everything you log lives here — organised, private, and yours.",
    art: ["#22d3ee"],
  },
  {
    icon: PlusCircle,
    accent: "#34d399",
    title: "Log a trade in seconds",
    body: "Quick Log for P&L only, or Detailed for entries, risk, screenshots and emotions. Connect an exchange to auto-import.",
    art: ["#34d399", "#f6465d"],
  },
  {
    icon: BarChart3,
    accent: "#fcd535",
    title: "Watch your edge grow",
    body: "Your dashboard turns every trade into analytics — win rate, R-multiples, streaks and more — so you sharpen your edge each session.",
    art: ["#34d399", "#fcd535", "#22d3ee"],
  },
];

/* tiny animated candle illustration */
function CandleArt({ colors }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 70, justifyContent: "center" }}>
      {colors.map((c, i) => (
        <motion.div
          key={i}
          initial={{ height: 8, opacity: 0 }}
          animate={{ height: 24 + ((i * 18) % 44), opacity: 1 }}
          transition={{ delay: 0.1 + i * 0.12, type: "spring", stiffness: 200 }}
          style={{ width: 12, borderRadius: 3, background: c }}
        />
      ))}
    </div>
  );
}

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
    <AnimatePresence>
      {open && (
        <motion.div className="jx-modal-overlay jx-modal-overlay--blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="jx-ltmodal jx-ltmodal--narrow"
            style={{ width: "min(460px, 96vw)", padding: "var(--space-6)" }}
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
          >
            {done ? (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
                <span style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--color-primary-subtle)", color: "var(--yellow-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkles size={34} />
                </span>
                <span style={{ font: "var(--text-h2)", fontWeight: 700 }}>You&apos;re all set 🎉</span>
                <span style={{ font: "var(--text-body)", color: "var(--color-text-secondary)", maxWidth: 360 }}>
                  Your <strong>7-day Pro trial</strong> is now active — unlimited trades, full analytics and exports. Enjoy!
                </span>
                <Button variant="primary" icon={ArrowRight} onClick={close} style={{ marginTop: "var(--space-2)" }}>
                  Start journaling
                </Button>
              </div>
            ) : (
              <>
                {/* progress dots */}
                <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: "var(--space-5)" }}>
                  {STEPS.map((_, idx) => (
                    <span key={idx} style={{ width: idx === i ? 22 : 8, height: 8, borderRadius: 999, background: idx === i ? "var(--color-primary)" : "var(--color-border-strong)", transition: "all .25s ease" }} />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.22 }}
                    style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}
                  >
                    <span style={{ width: 64, height: 64, borderRadius: "var(--radius-lg)", background: `${step.accent}1f`, color: step.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <step.icon size={30} />
                    </span>
                    <CandleArt colors={step.art} />
                    <span style={{ font: "var(--text-h3)", fontWeight: 700 }}>{step.title}</span>
                    <span style={{ font: "var(--text-body)", color: "var(--color-text-secondary)", maxWidth: 360 }}>{step.body}</span>
                  </motion.div>
                </AnimatePresence>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "var(--space-6)" }}>
                  <button className="jx-btn jx-btn--ghost jx-btn--sm" onClick={() => (i === 0 ? skip() : setI(i - 1))} disabled={finishing}>
                    {i === 0 ? "Skip" : (<><ArrowLeft size={15} /> Previous</>)}
                  </button>
                  <Button variant="primary" onClick={() => (last ? finish() : setI(i + 1))} disabled={finishing}>
                    {finishing ? "Activating…" : last ? "Finish" : "Next"} {!finishing && <ArrowRight size={15} />}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
