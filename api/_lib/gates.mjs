// Deployment feature gates — SERVER-ONLY.
//
// This repository feeds two Vercel projects (al-hifz and noortech-share).
// Notification functionality must be OFF by default so the shared codebase
// cannot accidentally run push writes/sends or the cron scheduler inside a
// project that was never configured as Al-Hifz. Gates are enabled per Vercel
// project via environment variables that only the Al-Hifz project sets.
//
// Rules (exact-match by design):
//   - The value must be the exact lowercase string "true".
//   - Missing, blank, "TRUE", "1", "yes", padded whitespace → disabled.
//   - Deliberately NOT NEXT_PUBLIC_*: these must never reach a client bundle.

// Hard stop if this module ever ends up in a browser bundle.
if (typeof window !== "undefined") {
  throw new Error("api/_lib/gates.mjs is server-only and must not be imported by client code");
}

export function isGateEnabled(value) {
  return value === "true";
}

export function pushEnabled(env = process.env) {
  return isGateEnabled(env.ALHIFZ_PUSH_ENABLED);
}

export function cronEnabled(env = process.env) {
  return isGateEnabled(env.ALHIFZ_CRON_ENABLED);
}

// Uniform, information-free response body for disabled notification APIs.
// No secrets, project names, paths, or environment details.
export const DISABLED_RESPONSE = Object.freeze({
  ok: false,
  enabled: false,
  error: "notifications are not enabled for this deployment",
});
