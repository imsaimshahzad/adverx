self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "AdverX";
  const options = {
    body: payload.body || "You have a new admin notification.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: payload.data || { url: "/admin/deposits" },
    tag: "adverx-admin-deposit",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification?.data?.url || "/admin/deposits";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          client.navigate(new URL(target, self.location.origin).href);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(new URL(target, self.location.origin).href);
      return undefined;
    }),
  );
});
