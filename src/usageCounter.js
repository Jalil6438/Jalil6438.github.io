// Fire-and-forget usage counter -> /api/stats (Upstash-backed).
// Completely safe: if the endpoint isn't configured/reachable, it silently no-ops
// and never affects the app. No personal data — just an anonymous device id so
// "reciting this month" counts people, not page refreshes.

function deviceId() {
  try {
    let id = localStorage.getItem("alhifz_did");
    if (!id) {
      id = crypto?.randomUUID ? crypto.randomUUID() : `d_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("alhifz_did", id);
    }
    return id;
  } catch {
    return "";
  }
}

const post = (event) =>
  fetch("/api/stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, id: deviceId() }),
    keepalive: true,
  }).catch(() => {});

export function trackUsage() {
  try {
    post("open"); // every app open -> opens, country, monthly-active

    // Count this device once ever, so "reciters" reflects people.
    if (!localStorage.getItem("alhifz_counted")) {
      localStorage.setItem("alhifz_counted", "1");
      post("user");
    }

    // Real "installed it" signal (PWA).
    window.addEventListener("appinstalled", () => post("install"), { once: true });
  } catch {
    /* analytics must never break the app */
  }
}
