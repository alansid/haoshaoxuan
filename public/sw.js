// 每週回顧推播：收到通知就顯示，點擊後打開對應頁面
self.addEventListener("push", (event) => {
  let data = { title: "營養師 伊緹", body: "來看看這週的回顧吧！", url: "/log" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/", self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const existing = wins.find((w) => w.url.startsWith(self.location.origin));
      if (existing) return existing.navigate(url).then((w) => w?.focus());
      return clients.openWindow(url);
    }),
  );
});
