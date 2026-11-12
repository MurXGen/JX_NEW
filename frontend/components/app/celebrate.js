"use client";

/* Brand confetti for a successful upgrade. Gold + silver + a touch of green,
   drawn on its own canvas above every modal. Does nothing when the visitor
   prefers reduced motion. canvas-confetti is loaded on demand so it never
   lands in the main bundle. */

const COLORS = ["#fcd535", "#f0b90b", "#ffe680", "#e9eaee", "#c9ccd3", "#2ebd85"];

export async function celebrate({ big = true } = {}) {
  if (typeof window === "undefined") return;
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  } catch {}
  let confetti;
  try {
    confetti = (await import("canvas-confetti")).default;
  } catch {
    return;
  }
  const base = { colors: COLORS, zIndex: 6000, disableForReducedMotion: true, ticks: 220, scalar: 0.95 };

  // two side cannons, then a soft centre shower
  confetti({ ...base, particleCount: big ? 70 : 40, angle: 60, spread: 62, startVelocity: 52, origin: { x: 0, y: 0.75 } });
  confetti({ ...base, particleCount: big ? 70 : 40, angle: 120, spread: 62, startVelocity: 52, origin: { x: 1, y: 0.75 } });
  if (!big) return;
  setTimeout(() => {
    confetti({ ...base, particleCount: 90, spread: 100, startVelocity: 30, gravity: 0.85, origin: { x: 0.5, y: 0.3 } });
  }, 260);
}

/* Hand-off flag so the dashboard can celebrate after the success screen
   reloads it. Expires after 15 minutes so a stale flag never fires. */
const KEY = "jx-just-upgraded";
export function markJustUpgraded(plan) {
  try { localStorage.setItem(KEY, JSON.stringify({ plan: plan || "pro", at: Date.now() })); } catch {}
}
export function takeJustUpgraded() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    const v = JSON.parse(raw);
    return v && Date.now() - Number(v.at) < 15 * 60 * 1000 ? v : null;
  } catch {
    return null;
  }
}
