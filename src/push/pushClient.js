// Client half of the background-push pipeline. Wraps feature detection,
// permission, PushManager subscribe/unsubscribe, and the backend sync so the
// UI (RemindersPage) deals in three verbs: enable, disable, syncPrefs.
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

function urlBase64ToUint8Array(base64String) {
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

    const out = await postSubscribe({ subscription: sub.toJSON(), prefs, tz: currentTzOffsetMinutes() });
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
    await postSubscribe({ subscription: sub.toJSON(), prefs, tz: currentTzOffsetMinutes() });
    return { ok: true };
  } catch (e) {
    console.error("[push] prefs sync failed", e?.message || e);
    return { ok: false, reason: "error" };
  }
}
