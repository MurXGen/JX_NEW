/* webPushClient — registers the service worker and manages the browser's Web
   Push subscription, syncing it with the backend so reminders are delivered
   even when JournalX is closed. */

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const swSupported = () =>
  typeof navigator !== "undefined" && "serviceWorker" in navigator;
const pushSupported = () =>
  swSupported() && typeof window !== "undefined" && "PushManager" in window;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/* register the SW once (safe to call repeatedly) */
export async function registerServiceWorker() {
  if (!swSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (e) {
    console.error("[push] SW register failed:", e?.message || e);
    return null;
  }
}

/* subscribe this device to push and store it on the backend. Returns true on
   success. Assumes Notification permission is already granted. */
export async function subscribeToPush() {
  if (!pushSupported()) return false;
  try {
    await registerServiceWorker();
    const reg = await navigator.serviceWorker.ready;

    const res = await fetch(`${API_BASE}/api/push/public-key`, { credentials: "include" });
    if (!res.ok) return false;
    const { publicKey } = await res.json();
    if (!publicKey) return false;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const r = await fetch(`${API_BASE}/api/push/subscribe`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub }),
    });
    return r.ok;
  } catch (e) {
    console.error("[push] subscribe failed:", e?.message || e);
    return false;
  }
}

/* ask the backend to send a real push to this user's devices — used right
   after opting in to confirm delivery actually works */
export async function sendTestPush() {
  try {
    const r = await fetch(`${API_BASE}/api/push/test`, {
      method: "POST",
      credentials: "include",
    });
    return r.ok;
  } catch {
    return false;
  }
}

/* remove this device's subscription (backend + browser) */
export async function unsubscribeFromPush() {
  if (!swSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    try {
      await fetch(`${API_BASE}/api/push/unsubscribe`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    } catch {}
    try {
      await sub.unsubscribe();
    } catch {}
  } catch (e) {
    /* ignore */
  }
}
