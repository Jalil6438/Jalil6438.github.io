// Recovery token: format, entropy, parsing, and never-in-snapshot guarantees.
// Tests 7–13. Pure — no network, no real datastore.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateRecoveryToken, generateRecoverySecret, parseRecoveryToken, formatRecoveryToken,
  RECOVERY_TOKEN_VERSION, RECOVERY_SECRET_BYTES, isValidRecoverySecret,
} from "../src/backup/recoveryToken.js";
import { buildSnapshot } from "../src/backup/snapshotCore.js";
import { buildLocalExport } from "../src/backup/localExport.js";

const RID = "a1b2c3d4e5f60718293a4b5c6d7e8f90"; // 32 hex

test("7. secure token generation uses the expected 256-bit entropy", () => {
  let requested = 0;
  const rb = (n) => { requested = n; const a = new Uint8Array(n); for (let i = 0; i < n; i++) a[i] = (i * 7 + 1) & 0xff; return a; };
  const t = generateRecoveryToken({ reciterId: RID, randomBytes: rb });
  assert.equal(requested, RECOVERY_SECRET_BYTES, "asks the RNG for 32 bytes");
  assert.equal(RECOVERY_SECRET_BYTES, 32, "32 bytes = 256 bits");
  assert.match(t.secret, /^[0-9a-f]{64}$/, "secret is 64 lowercase hex chars");
  assert.equal(t.version, RECOVERY_TOKEN_VERSION);
  assert.equal(t.reciterId, RID);
  assert.equal(t.token, `AH1.${RID}.${t.secret}`);
  // Two real-RNG secrets must differ (uses the Web Crypto global under Node).
  const a = generateRecoverySecret();
  const b = generateRecoverySecret();
  assert.notEqual(a, b, "fresh secrets are unique");
  assert.equal(isValidRecoverySecret(a), true);
});

test("8. parser accepts a valid supported version and round-trips", () => {
  const t = generateRecoveryToken({ reciterId: RID });
  const p = parseRecoveryToken(t.token);
  assert.equal(p.ok, true);
  assert.equal(p.version, "AH1");
  assert.equal(p.reciterId, RID);
  assert.equal(p.secret, t.secret);
  // formatRecoveryToken is the inverse of parse for valid parts.
  assert.equal(formatRecoveryToken({ reciterId: RID, secret: t.secret }), t.token);
});

test("9. an unsupported (but well-formed) version fails safely", () => {
  const secret = "d".repeat(64);
  const p = parseRecoveryToken(`AH2.${RID}.${secret}`);
  assert.equal(p.ok, false);
  assert.equal(p.error, "unsupported-version");
  assert.throws(() => formatRecoveryToken({ version: "AH2", reciterId: RID, secret }));
});

test("10. malformed tokens fail (wrong parts, bad reciterId, non-hex, junk)", () => {
  for (const bad of [
    "", "not-a-token", "AH1", "AH1.onlytwo", "AH1..", "AH1.xyz.abc",
    `AH1.${"g".repeat(32)}.${"d".repeat(64)}`, // non-hex reciterId
    `AH1.${RID}.${"d".repeat(63)}`,            // secret too short
    `AH1.${RID}.${"d".repeat(64)}.extra`,      // too many parts
    null, undefined, 123, {},
  ]) {
    const p = parseRecoveryToken(bad);
    assert.equal(p.ok, false, `should reject ${JSON.stringify(bad)}`);
  }
});

test("11. an empty / missing secret fails", () => {
  assert.equal(parseRecoveryToken(`AH1.${RID}.`).ok, false);
  assert.equal(parseRecoveryToken(`AH1.${RID}`).ok, false);
  assert.equal(isValidRecoverySecret(""), false);
  assert.throws(() => formatRecoveryToken({ reciterId: RID, secret: "" }));
});

test("12. the recovery secret never appears in a serialized progress snapshot", () => {
  const { secret } = generateRecoveryToken({ reciterId: RID });
  const snap = buildSnapshot({
    state: { "jalil-quran-v9": "[1,2,3]", "jalil-asr-cycle": "4", "rihlat-hifz-lock": '{"v":1}' },
    reciterId: RID, deviceId: "b".repeat(32), revision: 1, createdAt: 1000,
    localDate: "2026-07-02", timezone: "UTC", appVersion: "1.0.0", snapshotId: "snap000000000001",
  });
  assert.equal(JSON.stringify(snap).includes(secret), false, "secret must never ride along in a snapshot");
});

test("13. the recovery secret never appears in the standard progress export", () => {
  const { secret } = generateRecoveryToken({ reciterId: RID });
  const store = { "jalil-quran-v9": "[1,2,3]", "rihlat-onboarded": "true" };
  const exp = buildLocalExport({ readItem: (k) => store[k] ?? null, now: 1000, timezone: "UTC", appVersion: "1.0.0" });
  assert.equal(JSON.stringify(exp).includes(secret), false, "secret must never be in a manual export");
});
