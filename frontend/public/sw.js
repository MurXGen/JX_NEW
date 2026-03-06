self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  self.clients.claim();
});

// listen for scheduled checks
setInterval(() => {
  const now = new Date();

  const hour = now.getHours();
  const minute = now.getMinutes();

  // 🌙 11PM trade journal reminder
  if (hour === 23 && minute === 59) {
    self.registration.showNotification("Log Your Trades 📒", {
      body: "Don't forget to journal today's trades.",
      icon: "/assets/jx_trans_favicon.png",
      badge: "/assets/jx_trans_favicon.png",
      data: {
        url: "/add-trade",
      },
    });
  }

  // 🌅 Morning analysis reminder
  if (hour === 9 && minute === 0) {
    self.registration.showNotification("Start Chart Analysis 📊", {
      body: "Review charts and prepare your trading plan.",
      icon: "/assets/jx_trans_favicon.png",
      badge: "/assets/jx_trans_favicon.png",
      data: {
        url: "/events",
      },
    });
  }
}, 60000); // check every minute

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientsArr) => {
      const hadWindowToFocus = clientsArr.some((windowClient) => {
        if (windowClient.url.includes(url)) {
          windowClient.focus();
          return true;
        }
      });

      if (!hadWindowToFocus) {
        clients.openWindow(url);
      }
    }),
  );
});
