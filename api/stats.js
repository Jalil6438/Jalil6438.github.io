/**
 * GET  /api/stats          -> { reciters, countries, activeThisMonth, installs, opens, configured }
 * POST /api/stats {event, id}
 *      event "open"    -> total opens, this-device-this-month (active), and the visitor's country
 *      event "user"    -> a new reciter (counted once per device, client-side)
 *      event "install" -> a PWA install
 *
 * Backed by Upstash Redis (REST API — no SDK needed).
 * Returns zeros and never errors if the datastore isn't configured yet.
 */

const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function monthKey() {
  const d = new Date();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `alhifz:active:${d.getUTCFullYear()}-${m}`;
}

async function pipeline(commands) {
  const r = await fetch(`${REST_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`upstash ${r.status}`);
  return r.json(); // [{ result }, ...]
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (!REST_URL || !REST_TOKEN) {
    return res
      .status(200)
      .json({ reciters: 0, countries: 0, activeThisMonth: 0, installs: 0, opens: 0, configured: false });
  }

  try {
    if (req.method === "POST") {
      const event = String(req.body?.event || "");
      const id = String(req.body?.id || "");
      const cmds = [];

      if (event === "open") {
        cmds.push(["INCR", "alhifz:opens"]);
        // Country (no PII — just the 2-letter code Vercel attaches at the edge).
        const country = req.headers["x-vercel-ip-country"];
        if (country && country !== "XX") cmds.push(["SADD", "alhifz:countries", country]);
        // Monthly-active: this device, this calendar month.
        if (id) cmds.push(["SADD", monthKey(), id]);
      } else if (event === "user") {
        cmds.push(["INCR", "alhifz:users"]);
      } else if (event === "install") {
        cmds.push(["INCR", "alhifz:installs"]);
      } else {
        return res.status(400).json({ error: "unknown event" });
      }

      await pipeline(cmds);
      return res.status(200).json({ ok: true });
    }

    const out = await pipeline([
      ["GET", "alhifz:users"],
      ["SCARD", "alhifz:countries"],
      ["SCARD", monthKey()],
      ["GET", "alhifz:installs"],
      ["GET", "alhifz:opens"],
    ]);
    const n = (i) => Number(out?.[i]?.result ?? 0) || 0;
    return res.status(200).json({
      reciters: n(0),
      countries: n(1),
      activeThisMonth: n(2),
      installs: n(3),
      opens: n(4),
      configured: true,
    });
  } catch (err) {
    console.error("[stats]", err.message);
    return res
      .status(200)
      .json({ reciters: 0, countries: 0, activeThisMonth: 0, installs: 0, opens: 0, configured: true, error: true });
  }
}
