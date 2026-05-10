import React from "react";

// AppSideDrawer — side menu shared by all tabs. Mirrors the QuranTab
// drawer's look (left slide-in, dim scrim) but holds global app entries
// instead of tab-local settings: profile, achievements, plan, app
// settings, help.
//
// Wiring up real targets is left to the parent — this component just
// renders a ready row list and surfaces an `onPick(id)` callback when
// the user selects an entry.
export default function AppSideDrawer({ open, onClose, dark, username, initials, streak = 0, completedCount = 0, onPick }) {
  if (!open) return null;

  const Row = ({ icon, label, sublabel, id }) => (
    <div
      className="sbtn"
      onClick={() => { onPick && onPick(id); }}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 12px", borderRadius: 12, marginBottom: 4,
        cursor: "pointer", color: dark ? "rgba(243,231,200,0.88)" : "#2D2A26",
        fontSize: 14, fontWeight: 500,
      }}
    >
      <span style={{ fontSize: 18, width: 26, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div>{label}</div>
        {sublabel && <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.40)" : "#8B7355", marginTop: 1 }}>{sublabel}</div>}
      </div>
    </div>
  );

  const SectionLabel = ({ children }) => (
    <div style={{
      fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase",
      fontWeight: 700,
      color: dark ? "rgba(217,177,95,0.50)" : "rgba(140,100,20,0.60)",
      padding: "10px 12px 4px",
    }}>{children}</div>
  );

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)", zIndex: 400, animation: "fi .18s ease",
        }}
      />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed", top: 0, bottom: 0, left: 0,
          width: "min(300px,82vw)", zIndex: 401,
          background: dark ? "linear-gradient(180deg,#0E1628 0%,#080E1A 100%)" : "#EADFC8",
          borderRight: dark ? "1px solid rgba(217,177,95,0.18)" : "1px solid rgba(139,106,16,0.18)",
          boxShadow: "6px 0 28px rgba(0,0,0,0.45)",
          display: "flex", flexDirection: "column",
          animation: "sideMenuIn .22s ease-out",
          paddingTop: "env(safe-area-inset-top,28px)",
        }}
      >
        {/* Profile header */}
        <div style={{ padding: "14px 16px 12px", borderBottom: dark ? "1px solid rgba(217,177,95,0.10)" : "1px solid rgba(139,106,16,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: dark ? "linear-gradient(135deg,#0E1E3A,#162D50)" : "#E0D5BC",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid rgba(212,175,55,0.45)",
              boxShadow: "0 0 12px rgba(212,175,55,0.15)",
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: "#E6B84A" }}>
                {initials || "—"}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: dark ? "#EDE8DC" : "#2D2A26", fontFamily: "'Playfair Display',serif" }}>
                {username || "Hafiz"}
              </div>
              <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.50)" : "#6B645A", marginTop: 2 }}>
                {completedCount} of 30 juz · {streak}d streak
              </div>
            </div>
            <div className="sbtn" onClick={onClose} style={{ fontSize: 22, color: dark ? "rgba(243,231,200,0.45)" : "rgba(0,0,0,0.45)", lineHeight: 1, padding: "0 6px", fontWeight: 300 }}>×</div>
          </div>
        </div>

        {/* Body — scroll if rows overflow */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 18px" }}>
          <SectionLabel>Journey</SectionLabel>
          <Row icon="🏆" label="Achievements" sublabel="Streaks, juz badges, hafiz" id="achievements"/>
          <Row icon="📊" label="Stats & Progress" sublabel="History, daily score, totals" id="stats"/>
          <Row icon="📅" label="Adjust Plan" sublabel="Set goal timeline + memorization pace" id="plan"/>

          <SectionLabel>App</SectionLabel>
          <Row icon="🎙️" label="Memorization Reciter" sublabel="Audio for Fajr/Dhuhr/Asr/Maghrib/Isha sessions" id="hifzReciter"/>
          <Row icon="⚙️" label="Settings" sublabel="Profile, reset" id="settings"/>
          <Row icon="🌙" label={dark ? "Light Mode" : "Dark Mode"} id="theme"/>
          <Row icon="🔔" label="Reminders" id="reminders"/>

          <SectionLabel>Support</SectionLabel>
          <Row icon="📚" label="The Method" sublabel="Shaykh Al-Qasim's approach" id="method"/>
          <Row icon="❔" label="Help" id="help"/>
          <Row icon="ℹ️" label="About" id="about"/>
          <Row icon="📄" label="Terms & Privacy" id="terms"/>
          <Row icon="📤" label="Export Data" id="export"/>
        </div>

        <style>{`
          @keyframes sideMenuIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
          @keyframes fi { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    </>
  );
}
