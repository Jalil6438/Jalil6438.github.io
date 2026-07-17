import { createHash, timingSafeEqual } from "node:crypto";
import { json } from "./_push-lib.js";

const EXPECTED_BRANCH = "work/al-hifz-progress-recovery-preview";
const PREFIX = "alhifz:recovery:v1:preview:record:";
const SYNTHETIC_VERSION = "preview-smoke";
const SYNTHETIC_BACKUP_ID = "bkup_synthetic_source";
const SYNTHETIC_WRITER_ID = "wrtr_synthetic_source";
const MAX_BODY_BYTES = 1024;
const MAX_SCAN_PAGES = 100;
const MAX_KEYS = 1000;
const DELETE_IF_UNCHANGED_LUA = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end
if raw ~= ARGV[1] then return -1 end
return redis.call('DEL', KEYS[1])`;

function digest(value) {
  return createHash("sha256").update(value).digest();
}

export function authorized(header, expected) {
  const supplied = typeof header === "string" && header.startsWith("Bearer ")
    ? header.slice(7)
    : "";
  return timingSafeEqual(digest(supplied), digest(expected || ""));
}

function bodyBytes(body) {
  try { return Buffer.byteLength(typeof body === "string" ? body : JSON.stringify(body), "utf8"); }
  catch { return Number.POSITIVE_INFINITY; }
}

function parseBody(body) {
  if (typeof body === "string") {
    try { return JSON.parse(body); } catch { return null; }
  }
  return body && typeof body === "object" && !Array.isArray(body) ? body : null;
}

export function isSyntheticRemediationRequest(body) {
  return parseBody(body)?.action === "remediate-synthetic";
}

function redisConfig() {
  let url;
  try { url = new URL(process.env.BACKUP_REDIS_REST_URL); } catch { return null; }
  const token = process.env.BACKUP_REDIS_REST_TOKEN;
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash
    || typeof token !== "string" || token.length === 0) return null;
  return { url, token };
}

function classify(raw) {
  let state;
  try { state = JSON.parse(raw); } catch { throw new Error("invalid-record"); }
  if (!state || typeof state !== "object" || Array.isArray(state)
    || !Array.isArray(state.snapshots) || !Array.isArray(state.restoreOperations)) {
    throw new Error("invalid-record");
  }
  const marked = state.snapshots.filter((snapshot) => {
    const envelope = snapshot?.envelope;
    return envelope?.appVersion === SYNTHETIC_VERSION
      || String(envelope?.backupId || "").startsWith("bkup_synthetic_")
      || String(envelope?.writerId || "").startsWith("wrtr_synthetic_");
  });
  if (marked.length === 0) return false;
  const exact = state.snapshots.length === 1
    && marked.length === 1
    && marked[0]?.envelope?.appVersion === SYNTHETIC_VERSION
    && marked[0]?.envelope?.backupId === SYNTHETIC_BACKUP_ID
    && marked[0]?.envelope?.writerId === SYNTHETIC_WRITER_ID
    && state.restoreOperations.length === 0;
  if (!exact) throw new Error("unexpected-synthetic-record");
  return true;
}

export async function remediateSynthetic({ fetchImpl = globalThis.fetch } = {}) {
  const config = redisConfig();
  if (!config || typeof fetchImpl !== "function") throw new Error("configuration-unavailable");
  async function redis(command) {
    const response = await fetchImpl(config.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
    if (!response?.ok) throw new Error("storage-unavailable");
    const payload = await response.json();
    if (!payload || payload.error || !Object.hasOwn(payload, "result")) throw new Error("storage-invalid");
    return payload.result;
  }

  let cursor = "0";
  let pages = 0;
  const keys = new Set();
  do {
    if (++pages > MAX_SCAN_PAGES) throw new Error("scan-bounded");
    const result = await redis(["SCAN", cursor, "MATCH", `${PREFIX}*`, "COUNT", 100]);
    if (!Array.isArray(result) || result.length !== 2 || !Array.isArray(result[1])) throw new Error("storage-invalid");
    cursor = String(result[0]);
    for (const key of result[1]) {
      if (typeof key !== "string" || !new RegExp(`^${PREFIX}[a-f0-9]{64}$`).test(key)) throw new Error("key-invalid");
      keys.add(key);
      if (keys.size > MAX_KEYS) throw new Error("scan-bounded");
    }
  } while (cursor !== "0");

  const matches = [];
  for (const key of keys) {
    const raw = await redis(["GET", key]);
    if (typeof raw !== "string") throw new Error("storage-invalid");
    if (classify(raw)) matches.push({ key, raw });
  }
  if (matches.length > 1) throw new Error("multiple-synthetic-records");
  if (matches.length === 0) return { scanned: 0, deleted: 0 };

  const deleted = await redis(["EVAL", DELETE_IF_UNCHANGED_LUA, 1, matches[0].key, matches[0].raw]);
  if (deleted === -1) throw new Error("record-changed");
  if (deleted !== 1) throw new Error("delete-failed");
  return { scanned: 1, deleted: 1 };
}

export async function handleSyntheticRemediation(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "method not allowed" });
  if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== EXPECTED_BRANCH) {
    return json(res, 404, { ok: false, error: "not found" });
  }
  if (bodyBytes(req.body) > MAX_BODY_BYTES) return json(res, 413, { ok: false, error: "payload too large" });
  const secret = process.env.RECOVERY_REMEDIATION_SECRET;
  if (typeof secret !== "string" || secret.length < 32 || !redisConfig()) {
    return json(res, 503, { ok: false, error: "remediation unavailable" });
  }
  if (!authorized(req.headers?.authorization, secret)) return json(res, 401, { ok: false, error: "unauthorized" });
  const body = parseBody(req.body);
  if (!body || body.action !== "remediate-synthetic" || Object.keys(body).length !== 1) {
    return json(res, 400, { ok: false, error: "bad request" });
  }
  try {
    return json(res, 200, await remediateSynthetic());
  } catch {
    return json(res, 503, { ok: false, error: "remediation unavailable" });
  }
}
