self.addEventListener("install", () => {
  console.log("Service Worker installed");
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  console.log("Service Worker activated");
  self.clients.claim();
});

// ⏰ Check reminders every minute
setInterval(() => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  console.log("Checking reminder:", hour, minute);

  // 🌙 11PM trade journal reminder
  if (hour === 23 && minute === 0) {
    self.registration.showNotification("Log Your Trades 📒", {
      body: "Don't forget to journal today's trades.",
      icon: "/assets/jx_trans_favicon.png",
      badge: "/assets/jx_trans_favicon.png",
      data: { url: "/add-trade" },
    });
  }

  // 🌅 9AM analysis reminder
  if (hour === 9 && minute === 0) {
    self.registration.showNotification("Start Chart Analysis 📊", {
      body: "Review charts and plan your trades.",
      icon: "/assets/jx_trans_favicon.png",
      badge: "/assets/jx_trans_favicon.png",
      data: { url: "/events" },
    });
  }
}, 60000);

// 👆 Click notification → open page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
