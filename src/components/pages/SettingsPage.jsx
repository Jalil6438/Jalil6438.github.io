import React, { useState } from "react";
import AppPage from "./AppPage";

export default function SettingsPage({ dark, T, onBack }) {
  const [showNameModal, setShowNameModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editName, setEditName] = useState("");
  const username = (typeof localStorage !== "undefined" && localStorage.getItem("rihlat-username")) || "Abdul Jalil";

  return (
    <>
      <AppPage dark={dark} title="Settings" subtitle={`Signed in as ${username} · Joined 2026`} onBack={onBack}>
        {/* Name Change */}
        <div className="sbtn" onClick={() => { setEditName(localStorage.getItem("rihlat-username") || ""); setShowNameModal(true); }} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 16px",
          background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
          border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.10)"}`,
          borderRadius: 12, marginBottom: 8,
        }}>
          <div style={{ fontSize: 18 }}>👤</div>
          <div style={{ flex: 1, fontSize: 13, color: dark ? "#F3E7C8" : "#2D2A26", fontWeight: 600 }}>Name Change</div>
          <div style={{ fontSize: 14, color: dark ? "rgba(243,231,200,0.40)" : "#8B7355" }}>›</div>
        </div>

        {/* Reset Progress */}
        <div className="sbtn" onClick={() => setShowResetConfirm(true)} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 16px",
          background: "rgba(229,83,75,0.08)",
          border: "1px solid rgba(229,83,75,0.30)",
          borderRadius: 12, marginTop: 12,
        }}>
          <div style={{ fontSize: 18 }}>🗑️</div>
          <div style={{ flex: 1, fontSize: 13, color: "#E5534B", fontWeight: 700 }}>Reset All Progress</div>
        </div>

        <div style={{ textAlign: "center", marginTop: 22, fontSize: 10, color: dark ? "rgba(243,231,200,0.35)" : "#8B7355" }}>
          Rihlat Al-Hifz · Version 1.0 · 2026
        </div>
      </AppPage>

      {/* Name Change inner modal */}
      {showNameModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.40)", zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowNameModal(false)}>
          <div style={{ background: dark ? "linear-gradient(180deg,#0E1628 0%,#080E1A 100%)" : "#EADFC8", borderRadius: 20, maxWidth: 360, width: "100%", border: "1px solid rgba(217,177,95,0.30)", boxShadow: "0 20px 60px rgba(0,0,0,0.60)", padding: "22px 20px" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, color: dark ? "#F3E7C8" : "#3D2E0A", marginBottom: 12, textAlign: "center" }}>Change Your Name</div>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name" autoFocus style={{ width: "100%", padding: "12px 14px", background: dark ? "rgba(0,0,0,0.3)" : "#fff", border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}`, borderRadius: 10, color: T?.text || (dark ? "#F3E7C8" : "#2D2A26"), fontSize: 14, outline: "none", marginBottom: 14, boxSizing: "border-box" }}/>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="sbtn" onClick={() => setShowNameModal(false)} style={{ flex: 1, padding: "11px", borderRadius: 10, textAlign: "center", fontSize: 13, fontWeight: 600, color: T?.text || (dark ? "#F3E7C8" : "#2D2A26"), background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}` }}>Cancel</div>
              <div className="sbtn" onClick={() => { if (editName.trim()) { localStorage.setItem("rihlat-username", editName.trim()); setShowNameModal(false); } }} style={{ flex: 1, padding: "11px", borderRadius: 10, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#0A0E1A", background: "#D4AF37" }}>Save</div>
            </div>
          </div>
        </div>
      )}

      {/* Reset confirmation inner modal */}
      {showResetConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.40)", zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowResetConfirm(false)}>
          <div style={{ background: dark ? "linear-gradient(180deg,#0E1628 0%,#080E1A 100%)" : "#EADFC8", borderRadius: 20, maxWidth: 360, width: "100%", border: "1px solid rgba(229,83,75,0.30)", boxShadow: "0 20px 60px rgba(0,0,0,0.60), 0 0 30px rgba(229,83,75,0.15)", padding: "22px 20px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: dark ? "#F3E7C8" : "#3D2E0A", marginBottom: 8 }}>Reset All Progress?</div>
            <div style={{ fontSize: 12, color: dark ? "rgba(243,231,200,0.60)" : "#6B645A", lineHeight: 1.6, marginBottom: 18 }}>
              This will erase all your memorized juz, streaks, bookmarks, and settings. This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="sbtn" onClick={() => setShowResetConfirm(false)} style={{ flex: 1, padding: "11px", borderRadius: 10, textAlign: "center", fontSize: 13, fontWeight: 600, color: T?.text || (dark ? "#F3E7C8" : "#2D2A26"), background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}` }}>Cancel</div>
              <div className="sbtn" onClick={() => { localStorage.clear(); sessionStorage.clear(); setTimeout(() => location.reload(), 50); }} style={{ flex: 1, padding: "11px", borderRadius: 10, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff", background: "#E5534B", border: "1px solid #E5534B" }}>Reset</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
