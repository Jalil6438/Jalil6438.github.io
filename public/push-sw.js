/* Al-Hifz push handler — pulled into the generated Workbox service worker via
   workbox.importScripts (see vite.config.js). Runs even when every tab is
   closed; this is what makes reminders genuinely background.

   Payload shape (from api/cron/send-reminders.js):
     { title, body, tag, session } */

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* non-JSON push */ }
  const title = data.title || "Al-Hifz";
  const options = {
    body: data.body || "Time for your next hifz session.",
    // tag dedupes at the OS level: a re-delivered reminder replaces itself
    // instead of stacking.
    tag: data.tag || "rihlat-reminder",
    icon: "/android-chrome-192x192.png",
    badge: "/android-chrome-192x192.png",
    data: { session: data.session || null },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Focus an existing app window if one is open; otherwise open one.
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) return w.focus();
      }
      return self.clients.openWindow("/");
    })
  );
});
