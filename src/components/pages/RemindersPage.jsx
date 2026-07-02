import React, { useEffect, useState } from "react";
import AppPage from "./AppPage";
import {
  isPushSupported, fetchPushConfig, getExistingSubscription,
  subscribeToPush, syncSubscriptionToServer, unsubscribeFromPush,
  requestServerTestPush,
} from "../../push";

export default function RemindersPage({ dark, onBack }) {
  const DEFAULTS = [
    { id: "fajr",    label: "Fajr",    note: "Memorize today's page",     time: "06:00" },
    { id: "dhuhr",   label: "Dhuhr",   note: "Review last 5 days",        time: "13:00" },
    { id: "asr",     label: "Asr",     note: "Revise older juz",          time: "16:30" },
    { id: "maghrib", label: "Maghrib", note: "Listen to today's page",    time: "18:30" },
    { id: "isha",    label: "Isha",    note: "Final review before sleep", time: "21:00" },
  ];

  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("rihlat-reminders") || "null");
      if (saved && saved.sessions) return saved;
    } catch { /* corrupted prefs — fall through to defaults */ }
    const sessions = {};
    DEFAULTS.forEach(d => { sessions[d.id] = { enabled: false, time: d.time }; });
    return { sessions };
  });
  const [permission, setPermission] = useState(() =>
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    try { localStorage.setItem("rihlat-reminders", JSON.stringify(prefs)); } catch { /* storage unavailable */ }
  }, [prefs]);

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch { /* prompt blocked */ }
  };

  const toggleSession = (id) => {
    setPrefs(p => ({ ...p, sessions: { ...p.sessions, [id]: { ...p.sessions[id], enabled: !p.sessions[id].enabled } } }));
  };
  const setTime = (id, time) => {
    setPrefs(p => ({ ...p, sessions: { ...p.sessions, [id]: { ...p.sessions[id], time } } }));
  };

  const sendTest = () => {
    if (permission !== "granted") return;
    // Foreground fallback test: exercises the in-tab timer mechanism only.
    // The REAL background test (server-delivered push) lives in the
    // Background notifications section below.
    try { new Notification("Rihlat al-Hifz", { body: "Foreground reminders will look like this while the app is open — bismillah." }); } catch { /* blocked */ }
  };

  // ── BACKGROUND PUSH (real web push — works with the app closed) ──
  // pushState: "loading" | "unsupported" | "denied" | "unconfigured" |
  //            "ready" (can enable) | "subscribed" | "error"
  const [pushState, setPushState] = useState("loading");
  const [pushConfig, setPushConfig] = useState(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isPushSupported()) { if (alive) setPushState("unsupported"); return; }
      try {
        const cfg = await fetchPushConfig();
        if (!alive) return;
        setPushConfig(cfg);
        if (!cfg.configured || !cfg.publicKey) { setPushState("unconfigured"); return; }
        if (typeof Notification !== "undefined" && Notification.permission === "denied") { setPushState("denied"); return; }
        const sub = await getExistingSubscription();
        if (!alive) return;
        setPushState(sub ? "subscribed" : "ready");
      } catch {
        if (alive) setPushState("unconfigured");
      }
    })();
    return () => { alive = false; };
  }, []);

  const enableBackgroundPush = async () => {
    if (pushBusy || !pushConfig?.publicKey) return;
    setPushBusy(true); setPushMsg("");
    try {
      // Permission must come from this explicit user action.
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") { setPushState(perm === "denied" ? "denied" : "ready"); return; }
      const sub = await subscribeToPush(pushConfig.publicKey);
      await syncSubscriptionToServer(sub, { enabled: true });
      setPushState("subscribed");
      setPushMsg("Background notifications enabled — send a test below.");
    } catch (err) {
      setPushState("error");
      setPushMsg(err?.message || "Could not enable background notifications.");
    } finally { setPushBusy(false); }
  };

  const disableBackgroundPush = async () => {
    if (pushBusy) return;
    setPushBusy(true); setPushMsg("");
    try { await unsubscribeFromPush(); setPushState("ready"); setPushMsg("Background notifications disabled."); }
    catch { setPushMsg("Could not fully disable — try again."); }
    finally { setPushBusy(false); }
  };

  const sendServerTest = async () => {
    if (pushBusy) return;
    setPushBusy(true); setPushMsg("");
    try {
      await requestServerTestPush();
      setPushMsg("Sent from the server — it should arrive via your device's push service, even with the app closed.");
    } catch (err) {
      setPushMsg(`Test failed: ${err?.message || "unknown error"}`);
    } finally { setPushBusy(false); }
  };

  // Keep the server's copy of reminder times/toggles in step while subscribed.
  useEffect(() => {
    if (pushState !== "subscribed") return;
    getExistingSubscription().then((sub) => {
      if (sub) return syncSubscriptionToServer(sub);
    }).catch(() => {});
  }, [prefs, pushState]);

  const enabledCount = DEFAULTS.filter(d => prefs.sessions[d.id]?.enabled).length;

  const pushCard = (() => {
    const box = (title, body, action) => ({ title, body, action });
    switch (pushState) {
      case "loading": return box("Background notifications", "Checking availability…", null);
      case "unsupported": return box("Background notifications not supported", "This browser doesn't support Web Push. On iOS, install the app to your home screen first (iOS 16.4+).", null);
      case "denied": return box("Notifications blocked", "Re-enable notifications for this site/app in your browser or Android settings, then return here.", null);
      case "unconfigured": return box("Background notifications not configured", `The server is missing ${pushConfig?.missing?.join(" + ") || "push configuration"} — reminders currently work only while the app is open (foreground fallback above). See PUSH_NOTIFICATIONS_SETUP.md.`, null);
      case "ready": return box("Enable background notifications", "Get session reminders even when the app is closed. Delivered by your device's push service.", { label: "Enable", onClick: enableBackgroundPush });
      case "subscribed": return box("Background notifications on", "Reminders are delivered by the server at your configured times — the app can be closed. Android battery savers may delay delivery.", { label: "Send test", onClick: sendServerTest, secondary: { label: "Disable", onClick: disableBackgroundPush } });
      case "error": default: return box("Background notifications", pushMsg || "Something went wrong.", { label: "Retry", onClick: enableBackgroundPush });
    }
  })();

  return (
    <AppPage dark={dark} title="Reminders" subtitle={`${enabledCount} of 5 enabled`} onBack={onBack}>
      {/* ── Background push (real, server-delivered) ── */}
      <div style={{
        marginBottom: 12, padding: "14px", borderRadius: 12,
        background: pushState === "subscribed" ? (dark ? "rgba(56,214,126,0.08)" : "rgba(20,140,60,0.06)") : (dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"),
        border: `1px solid ${pushState === "subscribed" ? (dark ? "rgba(56,214,126,0.30)" : "rgba(20,140,60,0.25)") : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)")}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 18 }}>{pushState === "subscribed" ? "📲" : "🛰️"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: dark ? "#F3E7C8" : "#2D2A26" }}>{pushCard.title}</div>
            <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.55)" : "#6B645A", marginTop: 2, lineHeight: 1.5 }}>{pushCard.body}</div>
          </div>
        </div>
        {(pushCard.action || pushMsg) && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
            {pushCard.action && (
              <div className="sbtn" onClick={pushCard.action.onClick} style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, opacity: pushBusy ? 0.5 : 1,
                background: dark ? "rgba(212,175,55,0.18)" : "rgba(180,140,40,0.15)",
                color: dark ? "#F0C040" : "#6B4F00",
                border: `1px solid ${dark ? "rgba(212,175,55,0.40)" : "rgba(139,106,16,0.30)"}`,
              }}>{pushBusy ? "Working…" : pushCard.action.label}</div>
            )}
            {pushCard.action?.secondary && (
              <div className="sbtn" onClick={pushCard.action.secondary.onClick} style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, opacity: pushBusy ? 0.5 : 1,
                color: dark ? "rgba(243,231,200,0.60)" : "#6B645A",
                border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
              }}>{pushCard.action.secondary.label}</div>
            )}
            {pushMsg && <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.55)" : "#6B645A", flexBasis: "100%", lineHeight: 1.5 }}>{pushMsg}</div>}
          </div>
        )}
      </div>

      {/* Foreground (in-tab) permission banner — fallback only */}
      <div style={{
        marginBottom: 16, padding: "12px 14px", borderRadius: 12,
        background: permission === "granted"
          ? (dark ? "rgba(56,214,126,0.08)" : "rgba(20,140,60,0.06)")
          : (dark ? "rgba(212,175,55,0.06)" : "rgba(180,140,40,0.05)"),
        border: `1px solid ${permission === "granted"
          ? (dark ? "rgba(56,214,126,0.30)" : "rgba(20,140,60,0.25)")
          : (dark ? "rgba(212,175,55,0.20)" : "rgba(139,106,16,0.18)")}`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ fontSize: 18 }}>{permission === "granted" ? "✓" : "🔔"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: dark ? "#F3E7C8" : "#2D2A26" }}>
            {permission === "granted" ? "Notifications enabled" : permission === "denied" ? "Notifications blocked" : permission === "unsupported" ? "Notifications not supported" : "Allow notifications"}
          </div>
          <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.55)" : "#6B645A", marginTop: 2, lineHeight: 1.4 }}>
            {permission === "granted" ? "Reminders will fire while the app is open." :
             permission === "denied" ? "Re-enable in your browser site settings." :
             permission === "unsupported" ? "This browser doesn't expose notifications." :
             "Browser will ask for permission."}
          </div>
        </div>
        {permission !== "granted" && permission !== "denied" && permission !== "unsupported" && (
          <div className="sbtn" onClick={requestPermission} style={{
            padding: "7px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: dark ? "rgba(212,175,55,0.18)" : "rgba(180,140,40,0.15)",
            color: dark ? "#F0C040" : "#6B4F00",
            border: `1px solid ${dark ? "rgba(212,175,55,0.40)" : "rgba(139,106,16,0.30)"}`,
          }}>Allow</div>
        )}
        {permission === "granted" && (
          <div className="sbtn" onClick={sendTest} style={{
            padding: "7px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: dark ? "rgba(56,214,126,0.10)" : "rgba(20,140,60,0.08)",
            color: dark ? "#34D399" : "#0E6B30",
            border: `1px solid ${dark ? "rgba(56,214,126,0.30)" : "rgba(20,140,60,0.25)"}`,
          }}>Test</div>
        )}
      </div>

      {/* Per-session rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {DEFAULTS.map(d => {
          const s = prefs.sessions[d.id] || { enabled: false, time: d.time };
          return (
            <div key={d.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 14px", borderRadius: 12,
              background: s.enabled
                ? (dark ? "rgba(212,175,55,0.05)" : "rgba(180,140,40,0.05)")
                : (dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"),
              border: `1px solid ${s.enabled
                ? (dark ? "rgba(212,175,55,0.20)" : "rgba(139,106,16,0.18)")
                : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)")}`,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: dark ? "#F3E7C8" : "#2D2A26" }}>{d.label}</div>
                <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.50)" : "#6B645A", marginTop: 1 }}>{d.note}</div>
              </div>
              <input
                type="time"
                value={s.time}
                onChange={e => setTime(d.id, e.target.value)}
                disabled={!s.enabled}
                style={{
                  padding: "6px 8px", borderRadius: 8,
                  background: dark ? "rgba(0,0,0,0.30)" : "rgba(255,255,255,0.60)",
                  color: s.enabled ? (dark ? "#F0C040" : "#6B4F00") : (dark ? "rgba(243,231,200,0.30)" : "#9A8A6A"),
                  border: `1px solid ${dark ? "rgba(212,175,55,0.20)" : "rgba(139,106,16,0.20)"}`,
                  fontSize: 12, fontWeight: 600,
                  fontFamily: "inherit", colorScheme: dark ? "dark" : "light",
                }}
              />
              <div className="sbtn" onClick={() => toggleSession(d.id)} style={{
                width: 40, height: 22, borderRadius: 999, position: "relative",
                background: s.enabled
                  ? (dark ? "linear-gradient(90deg,#D4AF37,#F6E27A)" : "linear-gradient(90deg,#B45309,#E0BD78)")
                  : (dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.15)"),
                cursor: "pointer", transition: "background .2s",
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: "#fff",
                  position: "absolute", top: 2, left: s.enabled ? 20 : 2,
                  transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                }}/>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.40)" : "#8B7355", textAlign: "center", marginTop: 18, lineHeight: 1.6, fontStyle: "italic" }}>
        The times above drive both delivery paths. With background notifications ON, the server delivers reminders even when the app is closed. Without them, the foreground fallback fires only while the app is open — it is not background delivery.
      </div>
    </AppPage>
  );
}
