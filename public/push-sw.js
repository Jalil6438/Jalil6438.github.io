/* Al-Hifz push handler — pulled into the generated Workbox service worker via
   workbox.importScripts (see vite.config.js). Runs even when every tab is
   closed; this is what makes reminders genuinely background.

   Payload shape (from api/_push-lib.js buildReminderPayload):
     { title, body, tag, session, url } */

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
    data: { session: data.session || null, url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";
  // Focus an existing app window when possible; otherwise open the session
  // route the notification points at (/?session=<id> lands on My Hifz).
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          // Best effort: navigate the focused window to the session route so
          // the tap lands on the right place even in an already-open app.
          if ("navigate" in w && url !== "/") {
            return w.focus().then(() => w.navigate(url).catch(() => {}));
          }
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

/* Push services rotate endpoints/keys (or the browser re-provisions them).
   Without this handler the stored subscription goes stale and reminders
   silently stop. Re-subscribe with the same VAPID key and tell the backend
   to migrate the old record's prefs to the new endpoint. */
self.addEventListener("pushsubscriptionchange", (event) => {
  const oldEndpoint = event.oldSubscription ? event.oldSubscription.endpoint : null;
  const appServerKey = event.oldSubscription?.options?.applicationServerKey || null;
  event.waitUntil(
    (async () => {
      try {
        let key = appServerKey;
        if (!key) {
          const r = await fetch("/api/push/key");
          const { publicKey } = await r.json();
          if (!publicKey) return;
          // Convert base64url -> Uint8Array (no atob dependency games; this
          // mirrors src/push/pushClient.js).
          const pad = "=".repeat((4 - (publicKey.length % 4)) % 4);
          const b64 = (publicKey + pad).replace(/-/g, "+").replace(/_/g, "/");
          const raw = self.atob(b64);
          key = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);
        }
        const sub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            oldEndpoint
              ? { action: "replace", oldEndpoint, subscription: sub.toJSON() }
              : { subscription: sub.toJSON() }
          ),
        });
      } catch (e) {
        // Nothing actionable from SW context; the client-side autoResync will
        // repair the subscription next time the app opens.
        console.error("[push-sw] resubscribe failed", e?.message || e);
      }
    })()
  );
});
