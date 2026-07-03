import React from "react";
import AppPage from "./AppPage";

export default function ExportPage({ dark, onBack, onExport, onImport, onExportSnapshot, recoveryAvailable = false, restoreAvailable = false, onOpenRecovery, onOpenRecoveryPreview, onOpenRestore }) {
  return (
    <AppPage dark={dark} title="Backup & Restore" subtitle="Save or restore your progress" onBack={onBack}>
      <div style={{ fontSize: 13, color: dark ? "rgba(243,231,200,0.75)" : "#3D2E0A", lineHeight: 1.7, marginBottom: 20 }}>
        Saves your completed ayahs, streaks, daily score history, settings, and reflections as a JSON file. Keep it somewhere safe — you can restore it later.
      </div>
      <div className="sbtn" onClick={() => { onExport && onExport(); }}
        style={{
          width: "100%", padding: "13px 16px", borderRadius: 14, textAlign: "center",
          fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
          background: "linear-gradient(180deg,#E0BD78 0%,#CEAA60 100%)",
          color: "#0A1020",
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(212,175,55,0.20)",
        }}
      >
        Download Backup (.json)
      </div>

      <div style={{ height: 1, margin: "22px 0 18px", background: dark ? "rgba(217,177,95,0.15)" : "rgba(0,0,0,0.08)" }} />

      <div style={{ fontSize: 13, color: dark ? "rgba(243,231,200,0.75)" : "#3D2E0A", lineHeight: 1.7, marginBottom: 14 }}>
        Restore from a backup file. This <strong>replaces</strong> the progress on this device and reloads the app — you'll be asked to confirm first.
      </div>
      <label className="sbtn"
        style={{
          width: "100%", padding: "13px 16px", borderRadius: 14, textAlign: "center",
          fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
          background: "transparent",
          color: dark ? "#E0BD78" : "#8A6A10",
          border: `1px solid ${dark ? "rgba(217,177,95,0.40)" : "rgba(140,100,20,0.35)"}`,
          cursor: "pointer", display: "block", boxSizing: "border-box",
        }}
      >
        Restore Backup (.json)
        <input type="file" accept="application/json,.json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; onImport && onImport(f); }}
        />
      </label>

      {onExportSnapshot && (
        <>
          <div style={{ height: 1, margin: "22px 0 18px", background: dark ? "rgba(217,177,95,0.15)" : "rgba(0,0,0,0.08)" }} />
          <div style={{ fontSize: 13, color: dark ? "rgba(243,231,200,0.75)" : "#3D2E0A", lineHeight: 1.7, marginBottom: 14 }}>
            <strong>Progress Snapshot (v1).</strong> A complete, verified snapshot of just your
            memorization progress — completed ayahs, juz progress, streak, Asr rotation, and the
            Isha lock — in a versioned format. Keep this file safe. Restore support will be added
            in a later update.
          </div>
          <div className="sbtn" onClick={() => { onExportSnapshot && onExportSnapshot(); }}
            style={{
              width: "100%", padding: "13px 16px", borderRadius: 14, textAlign: "center",
              fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
              background: "transparent",
              color: dark ? "#E0BD78" : "#8A6A10",
              border: `1px solid ${dark ? "rgba(217,177,95,0.40)" : "rgba(140,100,20,0.35)"}`,
              cursor: "pointer", display: "block", boxSizing: "border-box",
            }}
          >
            Download Progress Snapshot (.json)
          </div>
        </>
      )}

      {/* Phase-2 Progress Protection — only surfaced when the recovery gate is
          enabled on this deployment (hidden by default, so it never appears in
          Production navigation while recovery is off). */}
      {recoveryAvailable && (
        <>
          <div style={{ height: 1, margin: "22px 0 18px", background: dark ? "rgba(217,177,95,0.15)" : "rgba(0,0,0,0.08)" }} />
          <div style={{ fontSize: 13, color: dark ? "rgba(243,231,200,0.75)" : "#3D2E0A", lineHeight: 1.7, marginBottom: 14 }}>
            <strong>Progress Protection.</strong> Create a private recovery code so you can check your server backup from
            another device if this one is lost. It verifies your backup — it does not restore progress yet.
          </div>
          <div className="sbtn" onClick={() => { onOpenRecovery && onOpenRecovery(); }}
            style={{
              width: "100%", padding: "13px 16px", borderRadius: 14, textAlign: "center",
              fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
              background: "transparent", color: dark ? "#E0BD78" : "#8A6A10",
              border: `1px solid ${dark ? "rgba(217,177,95,0.40)" : "rgba(140,100,20,0.35)"}`,
              cursor: "pointer", display: "block", boxSizing: "border-box", marginBottom: 12,
            }}
          >
            Create Recovery Code
          </div>
          <div className="sbtn" onClick={() => { onOpenRecoveryPreview && onOpenRecoveryPreview(); }}
            style={{
              width: "100%", padding: "13px 16px", borderRadius: 14, textAlign: "center",
              fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
              background: "transparent", color: dark ? "#E0BD78" : "#8A6A10",
              border: `1px solid ${dark ? "rgba(217,177,95,0.40)" : "rgba(140,100,20,0.35)"}`,
              cursor: "pointer", display: "block", boxSizing: "border-box",
            }}
          >
            Recovery Preview (read-only)
          </div>

          {/* Phase-3 Controlled Restore — only surfaced when the restore gate is
              ALSO enabled (restoreAvailable already requires recovery + restore +
              a configured store). Hidden by default, so it never appears in
              Production navigation while restore is off. */}
          {restoreAvailable && (
            <>
              <div style={{ fontSize: 13, color: dark ? "rgba(243,231,200,0.75)" : "#3D2E0A", lineHeight: 1.7, margin: "14px 0" }}>
                <strong>Restore a backup.</strong> Replace the progress on this device with a server backup, using your
                recovery code. This <strong>replaces</strong> local progress — it is not synchronization, and you'll be
                asked to confirm first.
              </div>
              <div className="sbtn" onClick={() => { onOpenRestore && onOpenRestore(); }}
                style={{
                  width: "100%", padding: "13px 16px", borderRadius: 14, textAlign: "center",
                  fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
                  background: "transparent", color: dark ? "#E0BD78" : "#8A6A10",
                  border: `1px solid ${dark ? "rgba(217,177,95,0.40)" : "rgba(140,100,20,0.35)"}`,
                  cursor: "pointer", display: "block", boxSizing: "border-box",
                }}
              >
                Restore Backup
              </div>
            </>
          )}
        </>
      )}
    </AppPage>
  );
}
