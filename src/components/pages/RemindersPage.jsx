import React, { useEffect, useRef, useState } from "react";
import AppPage from "./AppPage";
import { CheckGlyph, BellGlyph } from "../glyphs";
import { isPushSupported, isPushEnabled, enablePush, disablePush, syncPrefs, sendServerTest } from "../../push/pushClient";

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
    } catch { /* ignore */ }
    const sessions = {};
    DEFAULTS.forEach(d => { sessions[d.id] = { enabled: false, time: d.time }; });
    return { sessions };
  });
  const [permission, setPermission] = useState(() =>
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  // Background push state: "unsupported" | "off" | "busy" | "on", plus a
  // one-line status note for failures (denied permission, server not set up).
  const [pushOn, setPushOn] = useState(() => isPushEnabled());
  const [pushBusy, setPushBusy] = useState(false);
  const [pushNote, setPushNote] = useState("");
  const pushSupported = isPushSupported();

  useEffect(() => {
    try { localStorage.setItem("rihlat-reminders", JSON.stringify(prefs)); } catch { /* ignore */ }
  }, [prefs]);

  // While push is on, keep the backend copy of times/toggles current.
  // Debounced so dragging a time input doesn't spam the API.
  const syncTimer = useRef(null);
  useEffect(() => {
    if (!pushOn) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => { syncPrefs(prefs); }, 800);
    return () => clearTimeout(syncTimer.current);
  }, [prefs, pushOn]);

  const togglePush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    setPushNote("");
    try {
      if (pushOn) {
        const r = await disablePush();
        setPushOn(false);
        if (r.warning) setPushNote("Turned off on this device; server cleanup will finish next sync.");
      } else {
        const r = await enablePush(prefs);
        if (r.ok) {
          setPushOn(true);
          setPermission("granted");
        } else {
          setPushOn(false);
          setPushNote(
            r.reason === "denied" ? "Notifications are blocked — re-enable them in your browser's site settings." :
            r.reason === "dismissed" ? "Permission request was dismissed. Tap again to retry." :
            r.reason === "server-not-configured" ? "Background delivery isn't switched on for this server yet. In-app reminders still work." :
            r.reason === "unsupported" ? "This browser can't do background push. In-app reminders still work." :
            "Couldn't enable background delivery. In-app reminders still work."
          );
        }
      }
    } finally {
      setPushBusy(false);
    }
  };

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch { /* ignore */ }
  };

  const toggleSession = (id) => {
    setPrefs(p => ({ ...p, sessions: { ...p.sessions, [id]: { ...p.sessions[id], enabled: !p.sessions[id].enabled } } }));
  };
  const setTime = (id, time) => {
    setPrefs(p => ({ ...p, sessions: { ...p.sessions, [id]: { ...p.sessions[id], time } } }));
  };

  // Foreground-only test: constructs a Notification from the open page. This
  // does NOT exercise background delivery — that's what the server test does.
  const sendTest = () => {
    if (permission !== "granted") return;
    try { new Notification("Al-Hifz", { body: "In-app notifications are working — bismillah. (This is the foreground fallback, not background delivery.)" }); } catch { /* ignore */ }
  };

  // Real end-to-end test: the BACKEND sends a push through the push service
  // and the service worker displays it — works with the app closed.
  const [serverTestBusy, setServerTestBusy] = useState(false);
  const runServerTest = async () => {
    if (serverTestBusy) return;
    setServerTestBusy(true);
    setPushNote("");
    try {
      const r = await sendServerTest();
      setPushNote(
        r.ok ? "Server push sent — it should arrive within a few seconds, even if you close the app right now." :
        r.reason === "rate-limited" ? "Please wait a minute between server tests." :
        r.reason === "server-not-configured" ? "Background delivery isn't switched on for this server yet (VAPID keys not set)." :
        r.reason === "expired" || r.reason === "not-subscribed" || r.reason === "no-subscription" ? "This device's subscription is gone — toggle Background delivery off and on again." :
        "Server test failed — check your connection and try again."
      );
      if (r.reason === "expired") setPushOn(false);
    } finally {
      setServerTestBusy(false);
    }
  };

  const enabledCount = DEFAULTS.filter(d => prefs.sessions[d.id]?.enabled).length;

  return (
    <AppPage dark={dark} title="Reminders" subtitle={`${enabledCount} of 5 enabled`} onBack={onBack}>
      {/* Permission banner */}
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
        <div style={{ display: "flex", color: permission === "granted" ? (dark ? "#38D67E" : "#148C3C") : (dark ? "#E6B84A" : "#8B6A10") }}>{permission === "granted" ? <CheckGlyph size={18} /> : <BellGlyph size={18} />}</div>
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

      {/* Background delivery card — real web push (works with the app closed)
          once enabled; falls back to in-tab reminders otherwise. */}
      {pushSupported && (
        <div style={{
          marginBottom: 16, padding: "12px 14px", borderRadius: 12,
          background: pushOn ? (dark ? "rgba(56,214,126,0.08)" : "rgba(20,140,60,0.06)") : (dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"),
          border: `1px solid ${pushOn ? (dark ? "rgba(56,214,126,0.30)" : "rgba(20,140,60,0.25)") : (dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)")}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: dark ? "#F3E7C8" : "#2D2A26" }}>
                Background delivery
              </div>
              <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.55)" : "#6B645A", marginTop: 2, lineHeight: 1.4 }}>
                {pushOn ? "Reminders arrive even when the app is closed." : "Get reminders even when the app is closed."}
              </div>
            </div>
            <div className="sbtn" onClick={togglePush} style={{
              width: 40, height: 22, borderRadius: 999, position: "relative", opacity: pushBusy ? 0.5 : 1,
              background: pushOn
                ? (dark ? "linear-gradient(90deg,#38D67E,#6EE7A8)" : "linear-gradient(90deg,#148C3C,#4ADE80)")
                : (dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.15)"),
              cursor: "pointer", transition: "background .2s",
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 2, left: pushOn ? 20 : 2,
                transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
              }}/>
            </div>
          </div>
          {pushOn && (
            <div className="sbtn" onClick={runServerTest} style={{
              marginTop: 10, padding: "8px 12px", borderRadius: 8, textAlign: "center",
              fontSize: 11, fontWeight: 700, opacity: serverTestBusy ? 0.5 : 1,
              background: dark ? "rgba(56,214,126,0.10)" : "rgba(20,140,60,0.08)",
              color: dark ? "#34D399" : "#0E6B30",
              border: `1px solid ${dark ? "rgba(56,214,126,0.30)" : "rgba(20,140,60,0.25)"}`,
            }}>
              {serverTestBusy ? "Sending…" : "Send a real test from the server"}
            </div>
          )}
          {pushNote && (
            <div style={{ fontSize: 10, color: dark ? "rgba(230,184,74,0.80)" : "#8B6A10", marginTop: 8, lineHeight: 1.5 }}>
              {pushNote}
            </div>
          )}
        </div>
      )}

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
        {pushOn
          ? "Background delivery is on — reminders arrive even when the app is closed. Your reminder times and timezone are stored to schedule them; nothing else leaves this device."
          : "Without background delivery, reminders fire only while the app is open. On iPhone/iPad, install the app to your home screen first to enable background delivery."}
      </div>
    </AppPage>
  );
}

