import React from "react";
import AppPage from "./AppPage";

export default function ExportPage({ dark, onBack, onExport }) {
  return (
    <AppPage dark={dark} title="Export Data" subtitle="Download a backup of your progress" onBack={onBack}>
      <div style={{ fontSize: 13, color: dark ? "rgba(243,231,200,0.75)" : "#3D2E0A", lineHeight: 1.7, marginBottom: 20 }}>
        Saves your completed ayahs, streaks, daily score history, settings, and reflections as a JSON file. Keep it somewhere safe — you can re-import it later.
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
    </AppPage>
  );
}
