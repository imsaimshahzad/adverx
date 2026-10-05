self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "AdverX";
  const data = payload.data || { url: "/admin/deposits" };

  const options = {
    body: payload.body || "You have a new admin notification.",
    icon: "/favicon.png",
    badge: "/favicon.png",
    data,
    timestamp: Date.now(),
    requireInteraction: true,
    silent: false,
    renotify: true,
    tag: data.ticketId
      ? `adverx-support-${data.ticketId}`
      : data.depositId
        ? `adverx-deposit-${data.depositId}`
        : data.withdrawalId
          ? `adverx-withdrawal-${data.withdrawalId}`
          : `adverx-${Date.now()}`,
    actions: [
      {
        action: "open",
        title: "Open AdverX",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = event.notification?.data?.url || "/admin/deposits";
  const destination = new URL(target, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          client.navigate(destination);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(destination);
      }

      return undefined;
    }),
  );
});