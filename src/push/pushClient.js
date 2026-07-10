// Client half of the background-push pipeline. Wraps feature detection,
// permission, PushManager subscribe/unsubscribe, and the backend sync so the
// UI (RemindersPage) deals in a few verbs: enable, disable, syncPrefs,
// sendServerTest, autoResync.
//
// Graceful degradation is a hard requirement (store-readiness rule 7): every
// failure path returns { ok:false, reason } — the in-tab reminder fallback in
// useReminders keeps working whenever push is off or unavailable.

const ENABLED_FLAG = "rihlat-push-enabled";

export function isPushSupported() {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && typeof Notification !== "undefined";
}

export function isPushEnabled() {
  try { return localStorage.getItem(ENABLED_FLAG) === "1"; } catch { return false; }
}

function setEnabledFlag(on) {
  try { on ? localStorage.setItem(ENABLED_FLAG, "1") : localStorage.removeItem(ENABLED_FLAG); } catch { /* ignore */ }
}

// VAPID applicationServerKey: base64url string -> Uint8Array.
// Exported for tests (tests/push-reminders.test.mjs).
export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function currentTzOffsetMinutes() {
  // Positive east of UTC (inverse of getTimezoneOffset's sign convention).
  return -new Date().getTimezoneOffset();
}

// Anonymous install id (created by usageCounter.js); the only identity the
// app has — no accounts.
function installId() {
  try { return localStorage.getItem("alhifz_did") || undefined; } catch { return undefined; }
}

function currentPrefs() {
  try { return JSON.parse(localStorage.getItem("rihlat-reminders") || "null") || undefined; } catch { return undefined; }
}

async function postSubscribe(body) {
  const r = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`subscribe ${r.status}`);
  return r.json();
}

// Enable background push: permission -> SW ready -> VAPID key -> subscribe ->
// store on the backend. `prefs` is the rihlat-reminders object.
export async function enablePush(prefs) {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: permission === "denied" ? "denied" : "dismissed" };

    const keyRes = await fetch("/api/push/key");
    const { configured, publicKey } = await keyRes.json();
    if (!configured || !publicKey) return { ok: false, reason: "server-not-configured" };

    const reg = await navigator.serviceWorker.ready;
    // Reuse an existing subscription when present (idempotent enable).
    const sub = (await reg.pushManager.getSubscription())
      || (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const out = await postSubscribe({
      subscription: sub.toJSON(),
      prefs,
      tz: currentTzOffsetMinutes(),
      did: installId(),
    });
    if (!out.ok) return { ok: false, reason: out.configured === false ? "server-not-configured" : "server-error" };
    setEnabledFlag(true);
    return { ok: true };
  } catch (e) {
    console.error("[push] enable failed", e?.message || e);
    return { ok: false, reason: "error" };
  }
}

// Disable: local unsubscribe AND server-side delete (the full unsubscribe/
// delete path — required before any production release of push).
export async function disablePush() {
  setEnabledFlag(false);
  if (!isPushSupported()) return { ok: true };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      try { await sub.unsubscribe(); } catch { /* server delete below still runs */ }
      try { await postSubscribe({ action: "unsubscribe", endpoint }); } catch (e) {
        console.error("[push] server unsubscribe failed", e?.message || e);
        return { ok: true, warning: "server-cleanup-pending" };
      }
    }
    return { ok: true };
  } catch (e) {
    console.error("[push] disable failed", e?.message || e);
    return { ok: true, warning: "local-cleanup-pending" };
  }
}

// Keep the backend copy of prefs/timezone current while push is enabled.
export async function syncPrefs(prefs) {
  if (!isPushEnabled() || !isPushSupported()) return { ok: false, reason: "not-enabled" };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) { setEnabledFlag(false); return { ok: false, reason: "no-subscription" }; }
    await postSubscribe({ subscription: sub.toJSON(), prefs, tz: currentTzOffsetMinutes(), did: installId() });
    return { ok: true };
  } catch (e) {
    console.error("[push] prefs sync failed", e?.message || e);
    return { ok: false, reason: "error" };
  }
}

// Ask the BACKEND to send a real push to this device — proves the whole
// pipeline (VAPID -> push service -> SW -> OS) rather than the in-page
// Notification constructor. Requires an active subscription.
export async function sendServerTest() {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return { ok: false, reason: "no-subscription" };
    const r = await fetch("/api/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    if (r.status === 429) return { ok: false, reason: "rate-limited" };
    const out = await r.json();
    if (out.ok) return { ok: true };
    if (out.configured === false) return { ok: false, reason: "server-not-configured" };
    if (out.reason === "expired") { setEnabledFlag(false); return { ok: false, reason: "expired" }; }
    if (out.reason === "not-subscribed") return { ok: false, reason: "not-subscribed" };
    return { ok: false, reason: "send-failed" };
  } catch (e) {
    console.error("[push] server test failed", e?.message || e);
    return { ok: false, reason: "error" };
  }
}

// Subscription refresh on app open: browsers occasionally rotate or drop push
// subscriptions (also covered event-side by the SW pushsubscriptionchange
// handler). If the user has push enabled, re-assert the subscription and
// re-sync prefs/tz so the stored record never goes stale. Fire-and-forget.
export async function autoResync() {
  if (!isPushEnabled() || !isPushSupported()) return { ok: false, reason: "not-enabled" };
  try {
    if (Notification.permission !== "granted") { setEnabledFlag(false); return { ok: false, reason: "permission-revoked" }; }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      // Subscription vanished (browser cleared it) — recreate it.
      const keyRes = await fetch("/api/push/key");
      const { publicKey } = await keyRes.json();
      if (!publicKey) return { ok: false, reason: "server-not-configured" };
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    await postSubscribe({ subscription: sub.toJSON(), prefs: currentPrefs(), tz: currentTzOffsetMinutes(), did: installId() });
    return { ok: true };
  } catch (e) {
    console.error("[push] resync failed", e?.message || e);
    return { ok: false, reason: "error" };
  }
}
