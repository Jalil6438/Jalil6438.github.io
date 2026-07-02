// Client-side Web Push helpers for Al-Hifz.
// Subscribe flow: user action → Notification permission → SW ready →
// PushManager.subscribe(VAPID public key) → POST /api/push/subscribe.
// The server's VAPID PUBLIC key is fetched from /api/push/config (public by
// design); no private material ever reaches the client.

export function isPushSupported() {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && typeof Notification !== "undefined";
}

// The browser requires the VAPID public key as a Uint8Array applicationServerKey.
export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export async function fetchPushConfig() {
  const res = await fetch("/api/push/config");
  if (!res.ok) throw new Error("config unavailable");
  return res.json(); // { configured, publicKey, missing }
}

async function swRegistration() {
  // vite-plugin-pwa registers the SW; `ready` resolves once it is active.
  return navigator.serviceWorker.ready;
}

export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  try {
    const reg = await swRegistration();
    return await reg.pushManager.getSubscription();
  } catch { return null; }
}

// Subscribe (or return the existing subscription). If the endpoint/keys have
// rotated, the stale subscription is dropped and replaced — the server upsert
// keyed on the endpoint keeps its record in step.
export async function subscribeToPush(publicKey) {
  const reg = await swRegistration();
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    const currentKey = existing.options?.applicationServerKey;
    if (currentKey) {
      const want = urlBase64ToUint8Array(publicKey);
      const have = new Uint8Array(currentKey);
      const same = have.length === want.length && have.every((b, i) => b === want[i]);
      if (same) return existing;
      await existing.unsubscribe(); // key rotated — refresh the subscription
    } else {
      return existing;
    }
  }
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
}

function deviceId() {
  try {
    let id = localStorage.getItem("alhifz_did");
    if (!id) {
      id = crypto?.randomUUID ? crypto.randomUUID() : `d_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("alhifz_did", id);
    }
    return id;
  } catch { return ""; }
}

function readReminderPrefs() {
  try {
    const prefs = JSON.parse(localStorage.getItem("rihlat-reminders") || "null");
    return prefs?.sessions || null;
  } catch { return null; }
}

export function localTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}

// Upload (or update) the subscription record with reminder prefs + timezone.
export async function syncSubscriptionToServer(subscription, extra = {}) {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: subscription.toJSON ? subscription.toJSON() : subscription,
      deviceId: deviceId(),
      timeZone: localTimeZone(),
      sessions: readReminderPrefs(),
      ...extra,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `subscribe failed (${res.status})`);
  }
  return res.json();
}

export async function unsubscribeFromPush() {
  const sub = await getExistingSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  try { await sub.unsubscribe(); } catch { /* best effort */ }
  try {
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
  } catch { /* record is also self-cleaning via 410s */ }
}

// Ask the SERVER to push a test notification — real end-to-end delivery
// through the push provider and the service worker (works app-closed).
export async function requestServerTestPush() {
  const sub = await getExistingSubscription();
  if (!sub) throw new Error("no active subscription");
  const res = await fetch("/api/push/send-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `send failed (${res.status})`);
  return body;
}

// Fire-and-forget daily-status sync so the scheduler can skip completed
// sessions and respect the Isha→Fajr lock. Safe when unsubscribed/offline.
export function syncDailyStatus(status) {
  getExistingSubscription().then((sub) => {
    if (!sub) return;
    return fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: sub.toJSON ? sub.toJSON() : sub,
        deviceId: deviceId(),
        timeZone: localTimeZone(),
        dailyStatus: status,
      }),
      keepalive: true,
    });
  }).catch(() => {});
}
