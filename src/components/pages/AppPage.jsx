import React from "react";

// AppPage — shared full-screen layout for global app pages reached from the
// side drawer (Stats, Reminders, Method, Help, About, Export, Settings,
// Terms). Bottom tabs stay visible underneath; this component renders the
// scrolling content area between the header and the tab bar.
//
// Each page passes a title (and optional subtitle), an onBack handler that
// closes the page (typically setAppPage(null)), and its own children.
export default function AppPage({ dark, title, subtitle, onBack, children, maxWidth = 560 }) {
  return (
    <div style={{
      flex: 1,
      overflowY: "auto",
      background: dark ? "linear-gradient(180deg,#0B1220,#0E1628)" : "#F3E9D2",
      padding: "16px 16px 120px",
    }} className="fi">
      {/* Top bar with back */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <div className="sbtn" onClick={onBack} style={{
          padding: "6px 12px",
          background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
          border: dark ? "1px solid rgba(217,177,95,0.12)" : "1px solid rgba(139,106,16,0.15)",
          borderRadius: 8, fontSize: 11,
          color: dark ? "rgba(243,231,200,0.50)" : "#6B645A",
        }}>← Back</div>
      </div>

      {/* Content container */}
      <div style={{ maxWidth, margin: "0 auto" }}>
        {/* Page title */}
        {title && (
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ fontSize: 9, letterSpacing: ".22em", textTransform: "uppercase", fontWeight: 700, color: dark ? "rgba(217,177,95,0.65)" : "rgba(140,100,20,0.65)", marginBottom: 8 }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 12, color: dark ? "rgba(243,231,200,0.55)" : "#6B645A", lineHeight: 1.6, maxWidth: 360, margin: "0 auto" }}>
                {subtitle}
              </div>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
