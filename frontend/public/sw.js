/* JournalX service worker — Web Push.
   Receives pushes from the backend and shows notifications even when the app
   is closed; focuses/opens the app on click. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "JournalX", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "JournalX";
  const options = {
    body: data.body || "",
    icon: "/assets/JournalX_Favicon2.png",
    badge: "/assets/JournalX_Favicon2.png",
    tag: data.tag || "journalx",
    renotify: true,
    data: { url: data.url || "/dashboard" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      for (const c of all) {
        if ("focus" in c) {
          try { await c.navigate(url); } catch (e) {}
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })(),
  );
});
