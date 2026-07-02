// VAPID-authenticated push sending. The only module that touches web-push and
// the VAPID env. Never logs payload contents, endpoints, or key material.
import webpush from "web-push";
import { buildPayload, shouldRemoveSubscription } from "./push-core.mjs";

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT; // e.g. mailto:owner@example.com

export const vapidConfigured = () => Boolean(PUBLIC_KEY && PRIVATE_KEY && SUBJECT);
export const vapidPublicKey = () => PUBLIC_KEY || null;

let initialized = false;
function init() {
  if (!initialized && vapidConfigured()) {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    initialized = true;
  }
  return initialized;
}

/**
 * Send one session notification to one stored subscription.
 * Returns { ok, remove, statusCode } — `remove` means the provider reported
 * the subscription expired/invalid (404/410) and it should be cleaned up.
 * Never throws: one bad subscription must not stop the scheduler loop.
 */
export async function sendSessionPush(subscription, session) {
  if (!init()) return { ok: false, remove: false, statusCode: 0, error: "vapid-not-configured" };
  try {
    const res = await webpush.sendNotification(
      subscription,
      JSON.stringify(buildPayload(session)),
      { TTL: 60 * 60 } // reminders are pointless after an hour
    );
    return { ok: true, remove: false, statusCode: res.statusCode };
  } catch (err) {
    const statusCode = err?.statusCode || 0;
    // Log status only — no endpoint, no payload, no keys.
    console.error(`[push] send failed status=${statusCode}`);
    return { ok: false, remove: shouldRemoveSubscription(statusCode), statusCode };
  }
}
