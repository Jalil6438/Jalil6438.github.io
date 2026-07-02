// Upstash Redis REST helpers for push subscriptions — same REST-pipeline
// pattern api/stats.js already uses (the project's existing datastore).
// Subscription records: alhifz:push:sub:<id> (JSON) + index set alhifz:push:subs.
import { createHash } from "node:crypto";

const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const storeConfigured = () => Boolean(REST_URL && REST_TOKEN);

export async function pipeline(commands) {
  const r = await fetch(`${REST_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`upstash ${r.status}`);
  return r.json(); // [{ result }, ...]
}

// Stable, secret-free subscription id: hash of the push endpoint URL.
export function subIdFromEndpoint(endpoint) {
  return createHash("sha256").update(String(endpoint)).digest("base64url").slice(0, 24);
}

export const subKey = (id) => `alhifz:push:sub:${id}`;
export const SUBS_INDEX = "alhifz:push:subs";

export async function getSubscriptionRecord(id) {
  const out = await pipeline([["GET", subKey(id)]]);
  const raw = out?.[0]?.result;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function putSubscriptionRecord(id, record) {
  await pipeline([
    ["SET", subKey(id), JSON.stringify(record)],
    ["SADD", SUBS_INDEX, id],
  ]);
}

export async function deleteSubscriptionRecord(id) {
  await pipeline([
    ["DEL", subKey(id)],
    ["SREM", SUBS_INDEX, id],
  ]);
}

export async function listSubscriptionIds() {
  const out = await pipeline([["SMEMBERS", SUBS_INDEX]]);
  return out?.[0]?.result || [];
}

// SET NX EX — returns true when WE claimed the key (safe to send),
// false when a previous run already sent this reminder.
export async function claimDedupe(key, ttlSeconds = 2 * 24 * 3600) {
  const out = await pipeline([["SET", key, "1", "NX", "EX", String(ttlSeconds)]]);
  return out?.[0]?.result === "OK";
}
