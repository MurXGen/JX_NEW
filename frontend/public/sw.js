self.addEventListener("install", () => {
  console.log("Service Worker installed");
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  console.log("Service Worker activated");
  self.clients.claim();
});

// store last notification timestamps
let lastNotified = {};

// ⏰ Check reminders every minute
setInterval(() => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  console.log("Checking reminder:", hour + ":" + minute);

  const todayKey = now.toDateString();

  // 🌅 9 AM – Chart analysis
  if (hour === 9 && minute === 0 && lastNotified["9am"] !== todayKey) {
    lastNotified["9am"] = todayKey;

    self.registration.showNotification("Start Chart Analysis 📊", {
      body: "Review charts, identify setups and prepare your trading plan.",
      icon: "/assets/jx_trans_favicon.png",
      badge: "/assets/jx_trans_favicon.png",
      requireInteraction: true,
      data: { url: "/events" },
    });
  }

  // 📊 10 AM – Analyse journal trades
  if (hour === 10 && minute === 0 && lastNotified["10am"] !== todayKey) {
    lastNotified["10am"] = todayKey;

    self.registration.showNotification("Review Your Trades 📈", {
      body: "Analyse trades logged in JournalX and improve your decisions.",
      icon: "/assets/jx_trans_favicon.png",
      badge: "/assets/jx_trans_favicon.png",
      requireInteraction: true,
      data: { url: "/accounts" },
    });
  }

  // 🌙 Night – Log trades
  if (hour === 23 && minute === 0 && lastNotified["11pm"] !== todayKey) {
    lastNotified["11pm"] = todayKey;

    self.registration.showNotification("Log Today's Trades 📒", {
      body: "Journal your trades before the day ends.",
      icon: "/assets/jx_trans_favicon.png",
      badge: "/assets/jx_trans_favicon.png",
      requireInteraction: true,
      data: { url: "/add-trade" },
    });
  }
}, 60000);

// 🔔 When user clicks notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
