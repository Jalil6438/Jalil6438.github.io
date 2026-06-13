import React from "react";
import AppPage from "./AppPage";

export default function ExportPage({ dark, onBack, onExport, onImport }) {
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
    </AppPage>
  );
}
