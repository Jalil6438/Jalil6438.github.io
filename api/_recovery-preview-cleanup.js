import { createHash, timingSafeEqual } from "node:crypto";
import { json } from "./_push-lib.js";
import { recoveryEnvironment } from "./_recovery-model.js";

const EXPECTED_BRANCH = "work/al-hifz-progress-recovery-preview";
const PREVIEW_PREFIX = "alhifz:recovery:v1:preview:record:";
const MAX_BODY_BYTES = 1024;
const MAX_SCAN_PAGES = 40;
const MAX_KEYS = 500;
const MAX_EXECUTION_MS = 7000;
const DELETE_IF_UNCHANGED_LUA = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end
if raw ~= ARGV[1] then return -1 end
return redis.call('DEL', KEYS[1])`;

function digest(value) {
  return createHash("sha256").update(String(value)).digest();
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

export function isPreviewCleanupRequest(body) {
  return parseBody(body)?.action === "preview-synthetic-cleanup";
}

function redisConfig() {
  let url;
  try { url = new URL(process.env.BACKUP_REDIS_REST_URL); } catch { return null; }
  const token = process.env.BACKUP_REDIS_REST_TOKEN;
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash
    || typeof token !== "string" || token.trim().length === 0) return null;
  return { url: url.toString().replace(/\/$/, ""), token };
}

function validateRecoveryRecord(raw) {
  let state;
  try { state = JSON.parse(raw); } catch { throw new Error("record-invalid"); }
  if (!state || typeof state !== "object" || Array.isArray(state)
    || !Array.isArray(state.snapshots) || !Array.isArray(state.restoreOperations)
    || !Number.isInteger(state.revision) || state.revision < 0) {
    throw new Error("record-invalid");
  }
}

export async function remediatePreview({
  fetchImpl = globalThis.fetch,
  now = Date.now,
  limits = {},
} = {}) {
  const config = redisConfig();
  if (!config || typeof fetchImpl !== "function") throw new Error("configuration-unavailable");
  const startedAt = now();
  const maxPages = limits.maxPages ?? MAX_SCAN_PAGES;
  const maxKeys = limits.maxKeys ?? MAX_KEYS;
  const maxMs = limits.maxMs ?? MAX_EXECUTION_MS;
  const checkDeadline = () => {
    if (now() - startedAt > maxMs) throw new Error("execution-bounded");
  };
  async function redis(command) {
    checkDeadline();
    const response = await fetchImpl(`${config.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([command]),
    });
    checkDeadline();
    if (!response?.ok || typeof response.json !== "function") throw new Error("storage-unavailable");
    const payload = await response.json();
    checkDeadline();
    if (!Array.isArray(payload) || payload.length !== 1 || !payload[0]
      || payload[0].error || !Object.hasOwn(payload[0], "result")) throw new Error("storage-invalid");
    return payload[0].result;
  }

  let cursor = "0";
  let pages = 0;
  const keys = new Set();
  do {
    if (++pages > maxPages) throw new Error("scan-bounded");
    const result = await redis(["SCAN", cursor, "MATCH", `${PREVIEW_PREFIX}*`, "COUNT", 100]);
    if (!Array.isArray(result) || result.length !== 2 || !Array.isArray(result[1])) {
      throw new Error("storage-invalid");
    }
    cursor = String(result[0]);
    for (const key of result[1]) {
      if (typeof key !== "string" || !new RegExp(`^${PREVIEW_PREFIX}[a-f0-9]{64}$`).test(key)) {
        throw new Error("storage-invalid");
      }
      keys.add(key);
      if (keys.size > maxKeys) throw new Error("scan-bounded");
      if (keys.size > 1) throw new Error("multiple-records");
    }
  } while (cursor !== "0");

  if (keys.size === 0) return { scanned: 0, deleted: 0 };
  const [key] = keys;
  const raw = await redis(["GET", key]);
  if (raw === null) return { scanned: 0, deleted: 0 };
  if (typeof raw !== "string") throw new Error("storage-invalid");
  validateRecoveryRecord(raw);

  const deleted = await redis(["EVAL", DELETE_IF_UNCHANGED_LUA, 1, key, raw]);
  if (deleted === -1) throw new Error("record-changed");
  if (deleted !== 1) throw new Error("delete-failed");
  return { scanned: 1, deleted: 1 };
}

export async function handlePreviewCleanup(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method not allowed" });
  let namespace;
  try { namespace = recoveryEnvironment(); } catch { namespace = null; }
  if (process.env.VERCEL_ENV !== "preview" || namespace !== "preview"
    || process.env.VERCEL_GIT_COMMIT_REF !== EXPECTED_BRANCH) {
    return json(res, 404, { error: "not found" });
  }
  if (bodyBytes(req.body) > MAX_BODY_BYTES) return json(res, 413, { error: "payload too large" });
  const secret = process.env.RECOVERY_REMEDIATION_SECRET;
  if (typeof secret !== "string" || secret.length < 32 || !redisConfig()) {
    return json(res, 503, { error: "cleanup unavailable" });
  }
  if (!authorized(req.headers?.authorization, secret)) return json(res, 401, { error: "unauthorized" });
  const body = parseBody(req.body);
  if (!body || body.action !== "preview-synthetic-cleanup" || Object.keys(body).length !== 1) {
    return json(res, 400, { error: "bad request" });
  }
  try {
    return json(res, 200, await remediatePreview());
  } catch {
    return json(res, 503, { error: "cleanup unavailable" });
  }
}
