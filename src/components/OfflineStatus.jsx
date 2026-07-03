import React from "react";
import { onAppNotice, NOTICE } from "../appEvents.js";

// ── RESTRAINED OFFLINE / STORAGE STATUS (offline reliability) ──
//
// One small, non-blocking surface for offline feedback. Never a full-screen
// warning, never toast spam:
//   • a slim pill appears while the device is offline and disappears on
//     reconnect ("Offline — progress is saved on this device");
//   • a single dismissable banner shows the most recent storage/audio notice
//     (quota full, a salvaged corrupt key, or audio-needs-connection). Only ONE
//     notice is shown at a time (a newer one replaces it), transient audio
//     notices auto-dismiss, and everything clears on reconnect.
// Announcements use aria-live="polite" and are concise.

const MESSAGES = {
  [NOTICE.QUOTA]: "Storage is full — recent progress may not be saving. Free up space.",
  [NOTICE.UNAVAILABLE]: "This device is blocking local storage — progress may not save.",
  [NOTICE.CORRUPT]: "A saved file was unreadable and set aside safely; your progress is intact.",
  [NOTICE.AUDIO_OFFLINE]: "Audio needs a connection — reconnect to listen.",
};

// audio-offline is transient (auto-dismiss); storage notices persist until the
// user dismisses them or the app reconnects.
const AUTO_DISMISS = { [NOTICE.AUDIO_OFFLINE]: 5000 };

function readOnline() {
  try {
    return typeof navigator === "undefined" ? true : navigator.onLine !== false;
  } catch {
    return true;
  }
}

export default function OfflineStatus() {
  const [online, setOnline] = React.useState(readOnline);
  const [notice, setNotice] = React.useState(null); // { type }
  const timerRef = React.useRef(null);

  // Track connectivity.
  React.useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    try {
      window.addEventListener("online", up);
      window.addEventListener("offline", down);
    } catch {
      /* no window (SSR/tests) */
    }
    return () => {
      try {
        window.removeEventListener("online", up);
        window.removeEventListener("offline", down);
      } catch {
        /* no-op */
      }
    };
  }, []);

  // Subscribe to the app-notice bus (storage + audio events).
  React.useEffect(() => {
    const off = onAppNotice((n) => {
      if (!n || !MESSAGES[n.type]) return;
      setNotice({ type: n.type });
      if (timerRef.current) clearTimeout(timerRef.current);
      const ttl = AUTO_DISMISS[n.type];
      if (ttl) timerRef.current = setTimeout(() => setNotice(null), ttl);
    });
    return () => {
      off();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Clear a transient notice once we are back online.
  React.useEffect(() => {
    if (online && notice && notice.type === NOTICE.AUDIO_OFFLINE) setNotice(null);
  }, [online, notice]);

  const showPill = !online;
  const showBanner = Boolean(notice);
  if (!showPill && !showBanner) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 68px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      {showBanner && (
        <div
          style={{
            pointerEvents: "auto",
            maxWidth: 340,
            margin: "0 12px",
            padding: "10px 14px",
            borderRadius: 12,
            fontSize: 12.5,
            lineHeight: 1.5,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            background: "rgba(20,16,6,0.96)",
            color: "#F3E7C8",
            border: "1px solid rgba(217,177,95,0.35)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
          }}
        >
          <span style={{ flex: 1 }}>{MESSAGES[notice.type]}</span>
          <button
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            style={{
              background: "transparent",
              border: "none",
              color: "#E0BD78",
              fontSize: 16,
              lineHeight: 1,
              cursor: "pointer",
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
      )}
      {showPill && (
        <div
          style={{
            pointerEvents: "none",
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            background: "rgba(20,16,6,0.92)",
            color: "#E7C98A",
            border: "1px solid rgba(217,177,95,0.30)",
          }}
        >
          Offline — progress is saved on this device
        </div>
      )}
    </div>
  );
}
