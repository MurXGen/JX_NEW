/* Tiny haptics wrapper (Telegram-style tactile feedback). expo-haptics is
   lazy-loaded so the app still runs without it (no-op fallback). */
let H = null;
try { H = require("expo-haptics"); } catch {}

export function tapHaptic() {
  try { H?.impactAsync?.(H.ImpactFeedbackStyle?.Light); } catch {}
}
export function selectHaptic() {
  try { H?.selectionAsync?.(); } catch {}
}
export function successHaptic() {
  try { H?.notificationAsync?.(H.NotificationFeedbackType?.Success); } catch {}
}
export function errorHaptic() {
  try { H?.notificationAsync?.(H.NotificationFeedbackType?.Error); } catch {}
}
