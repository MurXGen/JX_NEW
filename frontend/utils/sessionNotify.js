/* sessionNotify.js — client-side trading-session reminders.

   Fires a local Web Notification ("log your trades") at the start of each major
   FX/market session. Everything runs in the browser: no backend, no push
   service. Reminders fire while the app is open (a tab/PWA window); we de-dupe
   per session-per-day so a reload doesn't double-notify. */

import { subscribeToPush, unsubscribeFromPush } from "./webPushClient";

const ENABLED_KEY = "jx-notif-enabled";
const DISMISSED_KEY = "jx-notif-dismissed";
const LAST_KEY = "jx-notif-last"; // `${yyyy-mm-dd}#${utcHour}` of the last reminder shown

/* session boundaries in UTC hours (matches detectSession buckets elsewhere) */
export const SESSION_STARTS = [
  { h: 0, name: "Asia session" },
  { h: 7, name: "London session" },
  { h: 13, name: "New York session" },
  { h: 21, name: "Sydney session" },
];

export const notifSupported = () =>
  typeof window !== "undefined" && "Notification" in window;

export const notifPermission = () =>
  notifSupported() ? Notification.permission : "unsupported";

export const isNotifEnabled = () => {
  if (!notifSupported()) return false;
  try {
    return localStorage.getItem(ENABLED_KEY) === "1" && Notification.permission === "granted";
  } catch {
    return false;
  }
};

export const notifDismissed = () => {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
};
export const dismissNotifPrompt = () => {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {}
};

export const setNotifEnabled = (on) => {
  try {
    localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
  } catch {}
  window.dispatchEvent(new CustomEvent("jx-notif-changed", { detail: !!on }));
};

/* Ask the browser for permission (called from our own UI, after the user opts
   in). Returns the resulting permission string. */
export async function enableNotifications() {
  if (!notifSupported()) return "unsupported";
  let perm = Notification.permission;
  if (perm === "default") {
    try {
      perm = await Notification.requestPermission();
    } catch {
      perm = Notification.permission;
    }
  }
  if (perm === "granted") {
    setNotifEnabled(true);
    // subscribe for background (closed-app) delivery via the service worker;
    // best-effort — local in-app reminders still work if this fails
    subscribeToPush().catch(() => {});
    showNotification("Notifications on 🎉", "We'll nudge you to log your trades at each session start.");
  }
  return perm;
}

export function disableNotifications() {
  setNotifEnabled(false);
  unsubscribeFromPush().catch(() => {});
}

/* low-level notification helper (focuses the app on click) */
export function showNotification(title, body, { tag } = {}) {
  if (!isNotifEnabled()) return;
  try {
    const n = new Notification(title, {
      body,
      tag,
      icon: "/assets/JournalX_Favicon2.png",
      badge: "/assets/JournalX_Favicon2.png",
    });
    n.onclick = () => {
      try {
        window.focus();
      } catch {}
      n.close();
    };
  } catch {}
}

/* the next session-start Date strictly after `from` */
export function nextSessionStart(from = new Date()) {
  let best = null;
  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    for (const s of SESSION_STARTS) {
      const d = new Date(
        Date.UTC(
          from.getUTCFullYear(),
          from.getUTCMonth(),
          from.getUTCDate() + dayOffset,
          s.h,
          0,
          0,
          0,
        ),
      );
      if (d.getTime() > from.getTime() && (!best || d < best.date)) {
        best = { date: d, name: s.name };
      }
    }
  }
  return best;
}

const sessionKey = (d, h) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}#${h}`;

/* Start the in-app scheduler. Returns a cancel() function. Safe to call when
   disabled (it no-ops until re-armed via the jx-notif-changed event). */
export function startSessionScheduler() {
  if (typeof window === "undefined") return () => {};
  let timer = null;
  let cancelled = false;

  const fireIfDue = () => {
    // if we just crossed a boundary we may have an exactly-now session
    const now = new Date();
    for (const s of SESSION_STARTS) {
      const boundary = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), s.h, 0, 0, 0),
      );
      const diff = now.getTime() - boundary.getTime();
      // within the last 2 minutes of a boundary and not yet shown today
      if (diff >= 0 && diff < 2 * 60 * 1000) {
        const key = sessionKey(boundary, s.h);
        let last = "";
        try {
          last = localStorage.getItem(LAST_KEY) || "";
        } catch {}
        if (last !== key) {
          showNotification(
            `📈 ${s.name} is open`,
            "A new session just started — log any trades and review your plan.",
            { tag: key },
          );
          try {
            localStorage.setItem(LAST_KEY, key);
          } catch {}
        }
      }
    }
  };

  const arm = () => {
    if (timer) clearTimeout(timer);
    if (cancelled || !isNotifEnabled()) return;
    fireIfDue();
    const next = nextSessionStart(new Date());
    if (!next) return;
    // wake a few seconds past the boundary so fireIfDue() catches it; cap the
    // wait so long-open tabs re-check periodically (and survive clock drift)
    const ms = Math.min(Math.max(next.date.getTime() - Date.now() + 3000, 1000), 6 * 60 * 60 * 1000);
    timer = setTimeout(arm, ms);
  };

  const onChange = () => arm();
  window.addEventListener("jx-notif-changed", onChange);
  arm();

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    window.removeEventListener("jx-notif-changed", onChange);
  };
}
