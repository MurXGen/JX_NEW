"use client";

/* GetStartedModal, shown to new users right after the acquisition question.
   Nudges the one action that makes the product stick: log a first trade or
   import existing trades. They can also skip. */

import { ArrowRight, Rocket, Upload, Zap } from "lucide-react";
import OnboardingFrame, { onbStyles as o } from "@/components/authFlow/OnboardingFrame";

export default function GetStartedModal({ open, onLog, onImport, onSkip }) {
  const cards = [
    { key: "log", icon: Zap, title: "Log your first trade", body: "Drop your net P&L in 10 seconds, or capture full detail. The fastest way to see your analytics.", onClick: onLog, primary: true },
    { key: "import", icon: Upload, title: "Import your trades", body: "Bring in your history from a CSV (quick or detailed template) and get instant analytics.", onClick: onImport },
  ];

  return (
    <OnboardingFrame
      open={open}
      icon={Rocket}
      kicker="Getting started"
      title="You're in. Let's add your first trades"
      lead="Journaling only works when your trades are in it. Pick one, it takes under a minute."
      onClose={onSkip}
      onEscape={onSkip}
    >
      <div className={o.body}>
        <div className={o.options}>
          {cards.map((c) => (
            <button key={c.key} type="button" onClick={c.onClick} className={o.option} data-autofocus={c.primary ? "" : undefined}>
              <span className={o.optionIcon} aria-hidden="true"><c.icon size={19} /></span>
              <span className={o.optionText}>
                <b>{c.title}{c.primary && <span className={o.optionTag}>Fastest</span>}</b>
                <span>{c.body}</span>
              </span>
              <ArrowRight size={16} className={o.optionArrow} aria-hidden="true" />
            </button>
          ))}
        </div>
        <button type="button" className={`${o.btn} ${o.text} ${o.full}`} onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </OnboardingFrame>
  );
}
