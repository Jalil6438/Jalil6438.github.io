import React from "react";
import AppPage from "./AppPage";

function StatCell({ dark, label, value, unit }) {
  const accent = dark ? "#E6B84A" : "#B45309";
  const muted = dark ? "rgba(243,231,200,0.30)" : "#8B7355";
  return (
    <div style={{
      flex: 1,
      padding: "12px",
      borderRadius: 12,
      background: dark ? "rgba(212,175,55,0.04)" : "rgba(180,140,40,0.05)",
      border: dark ? "1px solid rgba(212,175,55,0.10)" : "1px solid rgba(139,106,16,0.10)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent, fontFamily: "'Playfair Display',serif" }}>
        {value}<span style={{ fontSize: 11, color: muted, marginLeft: 3 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 9, letterSpacing: ".10em", textTransform: "uppercase", color: muted, fontWeight: 600, marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

export default function StatsPage({ dark, onBack, completedCount = 0, streak = 0, longestStreak = 0, sessionJuz, goalLabel, pct = 0 }) {
  const pctVal = Math.min(100, Math.max(0, Math.round(pct || 0)));
  const ringR = 56;
  const ringC = 2 * Math.PI * ringR;
  const ringFilled = ringC * (pctVal / 100);
  const ringTrack = dark ? "rgba(212,175,55,0.10)" : "rgba(139,106,16,0.12)";
  const ringHigh = "#F0C040";
  const ringMid = "#156A30";

  return (
    <AppPage dark={dark} title="Stats & Progress" subtitle="Your numbers, in detail" onBack={onBack}>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "8px 0 18px" }}>
        <svg width={150} height={150} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="statsRingGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={ringMid}/>
              <stop offset="100%" stopColor={ringHigh}/>
            </linearGradient>
            <filter id="statsRingGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <circle cx={75} cy={75} r={ringR} fill="none" stroke={ringTrack} strokeWidth={10}/>
          {pctVal > 0 && (
            <circle cx={75} cy={75} r={ringR} fill="none" stroke="url(#statsRingGrad)" strokeWidth={10}
              strokeDasharray={`${ringFilled} ${ringC}`} strokeLinecap="round"
              transform="rotate(-90 75 75)" filter="url(#statsRingGlow)"/>
          )}
          <text x={75} y={71} textAnchor="middle" fill={dark ? ringHigh : "#1a1a1a"} fontSize="28" fontWeight="700" fontFamily="'Playfair Display', serif">
            {pctVal}%
          </text>
          <text x={75} y={88} textAnchor="middle" fill={dark ? "rgba(243,231,200,0.55)" : "#6B645A"} fontSize="9" letterSpacing="2" fontWeight="600">
            MEMORIZED
          </text>
        </svg>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <StatCell dark={dark} label="Juz Memorized" value={completedCount} unit="of 30"/>
        <StatCell dark={dark} label="Current Streak" value={streak} unit="d"/>
        <StatCell dark={dark} label="Longest Streak" value={longestStreak ?? streak} unit="d"/>
        <StatCell dark={dark} label="Currently On" value={sessionJuz || "—"} unit="juz"/>
      </div>
      <div style={{ fontSize: 11, color: dark ? "rgba(243,231,200,0.55)" : "#6B645A", textAlign: "center", padding: "12px 8px", lineHeight: 1.6 }}>
        Goal: {goalLabel || "—"}
      </div>
    </AppPage>
  );
}
