import React from "react";
import AppPage from "./AppPage";
import {
  createRecoveryCode,
  rotateRecoveryCode,
  recoveryCodeFilename,
  recoveryCodeFileBody,
  RECOVERY_WARNING,
  RECOVERY_NO_RESTORE_NOTICE,
} from "../../backup/recoveryClient";

// ── PROGRESS PROTECTION — Create / Rotate Recovery Code (Phase 2) ──
// Read-only-safe: generates a recovery code locally with secure randomness and
// registers ONLY its verifier through the authenticated setup endpoint. The
// code is shown once, in memory, after success — never persisted or logged.
export default function RecoveryPage({ dark, onBack, available = false }) {
  const [status, setStatus] = React.useState("idle"); // idle | working | done | error
  const [token, setToken] = React.useState(null);
  const [rotated, setRotated] = React.useState(false);
  const [err, setErr] = React.useState(null);

  const text = dark ? "rgba(243,231,200,0.82)" : "#3D2E0A";
  const rule = dark ? "rgba(217,177,95,0.15)" : "rgba(0,0,0,0.08)";

  async function onCreate() {
    setStatus("working"); setErr(null);
    const r = await createRecoveryCode({ available });
    if (r.ok) { setToken(r.token); setRotated(false); setStatus("done"); }
    else { setErr(r.error); setStatus("error"); }
  }

  async function onRotate() {
    if (!window.confirm("Replace your recovery code?\n\nYour OLD code will stop working immediately. You must save the new one.")) return;
    setStatus("working"); setErr(null);
    const r = await rotateRecoveryCode({ available });
    if (r.ok) { setToken(r.token); setRotated(true); setStatus("done"); }
    else { setErr(r.error); setStatus("error"); }
  }

  function onCopy() {
    try { navigator.clipboard && navigator.clipboard.writeText(token); } catch { /* clipboard blocked — user can still read/select it */ }
  }

  function onDownload() {
    try {
      const blob = new Blob([recoveryCodeFileBody(token)], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = recoveryCodeFilename();
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { /* download unavailable — copy remains an option */ }
  }

  const primaryBtn = {
    width: "100%", padding: "13px 16px", borderRadius: 14, textAlign: "center",
    fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
    background: "linear-gradient(180deg,#E0BD78 0%,#CEAA60 100%)", color: "#0A1020",
    cursor: "pointer", boxShadow: "0 6px 18px rgba(212,175,55,0.20)",
  };
  const ghostBtn = {
    width: "100%", padding: "13px 16px", borderRadius: 14, textAlign: "center",
    fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
    background: "transparent", color: dark ? "#E0BD78" : "#8A6A10",
    border: `1px solid ${dark ? "rgba(217,177,95,0.40)" : "rgba(140,100,20,0.35)"}`,
    cursor: "pointer", display: "block", boxSizing: "border-box",
  };

  return (
    <AppPage dark={dark} title="Progress Protection" subtitle="Create a private recovery code" onBack={onBack}>
      {!available && (
        <div style={{ fontSize: 13, color: text, lineHeight: 1.7 }}>
          Recovery is not enabled on this version yet. Your progress is still saved locally on this device.
        </div>
      )}

      {available && (
        <>
          <div style={{ fontSize: 13, color: text, lineHeight: 1.7, marginBottom: 16 }}>
            A recovery code lets you check your server backup from another device if this one is ever lost. Create it
            <strong> now, while you still have this device</strong> — it cannot be created after the device is gone.
          </div>

          {status !== "done" && (
            <>
              <div className="sbtn" onClick={status === "working" ? undefined : onCreate} style={{ ...primaryBtn, opacity: status === "working" ? 0.6 : 1 }}>
                {status === "working" ? "Working…" : "Create Recovery Code"}
              </div>
              {status === "error" && (
                <div style={{ marginTop: 14, fontSize: 13, color: dark ? "#F0B8B8" : "#8A2020", lineHeight: 1.6 }}>
                  {err === "already-configured"
                    ? "A recovery code already exists for this device. Use “Replace recovery code” below to make a new one."
                    : "Could not create a recovery code right now. Your local progress is unaffected — please try again later."}
                </div>
              )}
              {err === "already-configured" && (
                <div className="sbtn" onClick={onRotate} style={{ ...ghostBtn, marginTop: 16 }}>Replace recovery code</div>
              )}
            </>
          )}

          {status === "done" && token && (
            <>
              <div style={{ fontSize: 13, color: text, lineHeight: 1.7, marginBottom: 10 }}>
                {rotated ? "Your new recovery code (the old one no longer works):" : "Your recovery code:"}
              </div>
              <div style={{
                fontFamily: "monospace", fontSize: 13, wordBreak: "break-all", padding: "12px 14px",
                borderRadius: 12, border: `1px solid ${rule}`, background: dark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.04)",
                color: dark ? "#F3E7C8" : "#2A2008", marginBottom: 16,
              }}>{token}</div>

              <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                <div className="sbtn" onClick={onCopy} style={{ ...ghostBtn, flex: 1 }}>Copy</div>
                <div className="sbtn" onClick={onDownload} style={{ ...ghostBtn, flex: 1 }}>Download (.txt)</div>
              </div>

              <div style={{ fontSize: 12.5, color: dark ? "#E7C98A" : "#8A6A10", lineHeight: 1.6, fontWeight: 600 }}>
                ⚠ {RECOVERY_WARNING}
              </div>
              <div style={{ height: 1, margin: "16px 0", background: rule }} />
              <div style={{ fontSize: 12.5, color: text, lineHeight: 1.6 }}>{RECOVERY_NO_RESTORE_NOTICE}</div>
            </>
          )}
        </>
      )}
    </AppPage>
  );
}
