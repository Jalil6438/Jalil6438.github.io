// Consolidated recovery route (api/progress/recovery/[action].js): strict action
// dispatch + gate-first disabling. Proves the single dynamic function preserves
// both public paths and refuses unknown actions. No Upstash — gate is off, so the
// core short-circuits to the disabled response before any datastore access.
import { test } from "node:test";
import assert from "node:assert/strict";

const RID = "a".repeat(32);
const TOKEN = `AH1.${RID}.${"d".repeat(64)}`;
const mkRes = () => ({ _c: 0, _b: null, setHeader() {}, status(c) { this._c = c; return this; }, json(b) { this._b = b; return this; } });

test("consolidated recovery route dispatches known actions and gate-disables them", async () => {
  const { default: route } = await import("../api/progress/recovery/[action].js");

  // /setup → recognized, dispatched, and (gate off) returns the disabled 503.
  let r = mkRes();
  await route({ method: "POST", query: { action: "setup" }, headers: { "content-type": "application/json" }, body: { deviceSecret: "c".repeat(64), recoveryToken: TOKEN } }, r);
  assert.equal(r._c, 503);
  assert.equal(r._b.enabled, false);

  // /preview → recognized, dispatched, disabled 503.
  r = mkRes();
  await route({ method: "POST", query: { action: "preview" }, headers: { "content-type": "application/json" }, body: { recoveryToken: TOKEN } }, r);
  assert.equal(r._c, 503);
  assert.equal(r._b.enabled, false);
});

test("consolidated recovery route rejects unknown / missing actions with a generic 404", async () => {
  const { default: route } = await import("../api/progress/recovery/[action].js");
  for (const action of ["delete", "rotate", "list", "", undefined]) {
    const r = mkRes();
    await route({ method: "POST", query: action === undefined ? {} : { action }, headers: { "content-type": "application/json" }, body: {} }, r);
    assert.equal(r._c, 404, `action ${JSON.stringify(action)} must not dispatch`);
    assert.equal(r._b.ok, false);
  }
});
