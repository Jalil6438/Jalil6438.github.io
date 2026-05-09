import React, { useMemo } from "react";

// RingsProgress — Apple Watch style concentric rings, one per session,
// plus a central "Day" ring summarizing today's overall completion.

const SESSIONS = [
  { id: "fajr",    label: "Fajr",    color: "#60A5FA" },
  { id: "dhuhr",   label: "Dhuhr",   color: "#F59E0B" },
  { id: "asr",     label: "Asr",     color: "#FB923C" },
  { id: "maghrib", label: "Maghrib", color: "#A78BFA" },
  { id: "isha",    label: "Isha",    color: "#34D399" },
];

function loadSessionLog() {
  try { return JSON.parse(localStorage.getItem("rihlat-session-log") || "{}"); } catch { return {}; }
}
function fmtKey(d) { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`; }

// Ring geometry: concentric circles, outer = Fajr, inner = Isha. The
// inner-most ring leaves ~30 unit radius clear so the center label has
// breathing room.
const CX = 80, CY = 80;
const RING_GAP = 3;
const STROKE_W = 7;
const OUTER_R = 72;

export default function RingsProgress({ dark, completedCount = 0, sessionJuz, goalLabel, streak = 0, dailyChecks }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const todayKey = fmtKey(today);

  const dayLog = useMemo(() => {
    return loadSessionLog()[todayKey] || {};
  }, [todayKey, dailyChecks]);

  const accent = dark ? "#E6B84A" : "#B45309";
  const sub = dark ? "rgba(243,231,200,0.55)" : "#6B645A";
  const muted = dark ? "rgba(243,231,200,0.30)" : "#8B7355";
  const trackColor = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const completedSessions = SESSIONS.filter(s => dayLog[s.id]).length;
  const dayPct = SESSIONS.reduce((sum, s) => sum + ((dayLog[s.id]?.score) ?? 0), 0) / SESSIONS.length;

  return (
    <div style={{
      borderRadius: 16, padding: "14px 16px 12px",
      background: dark
        ? "linear-gradient(180deg, rgba(15,26,43,0.85) 0%, rgba(10,17,32,0.92) 100%)"
        : "linear-gradient(180deg, rgba(232,221,200,0.95) 0%, rgba(218,205,180,0.95) 100%)",
      border: dark ? "1px solid rgba(212,175,55,0.18)" : "1px solid rgba(139,106,16,0.16)",
      boxShadow: dark ? "0 4px 16px rgba(0,0,0,0.30)" : "0 2px 10px rgba(0,0,0,0.06)",
      marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: sub, fontWeight: 700 }}>Today's Sessions</div>
          <div style={{ fontSize: 11, color: accent, marginTop: 2 }}>{sessionJuz ? `Currently on Juz ${sessionJuz}` : "Begin your journey"}</div>
          <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>{completedCount} of 30 Juz · Goal: {goalLabel || "—"}</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0" }}>
        <svg viewBox="0 0 160 160" style={{ width: "70%", maxWidth: 240, height: "auto" }}>
          {SESSIONS.map((s, i) => {
            const r = OUTER_R - i * (STROKE_W + RING_GAP);
            const C = 2 * Math.PI * r;
            const score = (dayLog[s.id]?.score) ?? 0;
            const filled = C * Math.min(1, score);
            return (
              <g key={s.id}>
                {/* Track */}
                <circle
                  cx={CX} cy={CY} r={r} fill="none"
                  stroke={trackColor}
                  strokeWidth={STROKE_W}
                />
                {/* Progress arc */}
                {score > 0 && (
                  <circle
                    cx={CX} cy={CY} r={r} fill="none"
                    stroke={s.color}
                    strokeWidth={STROKE_W}
                    strokeLinecap="round"
                    strokeDasharray={`${filled} ${C}`}
                    transform={`rotate(-90 ${CX} ${CY})`}
                    style={{ filter: `drop-shadow(0 0 4px ${s.color})` }}
                  />
                )}
              </g>
            );
          })}
          {/* Center disc — masks any ring stroke that would otherwise
              overlap the "70% TODAY" label. Sits inside the innermost ring. */}
          <circle cx={CX} cy={CY} r={OUTER_R - 4 * (STROKE_W + RING_GAP) - STROKE_W / 2 - 1}
            fill={dark ? "#0F1A2B" : "#E8DDC8"} />
          <text x={CX} y={CY - 3} textAnchor="middle" fill={accent} fontSize="18" fontWeight="700" fontFamily="'Playfair Display', serif">
            {Math.round(dayPct * 100)}%
          </text>
          <text x={CX} y={CY + 11} textAnchor="middle" fill={sub} fontSize="7" letterSpacing="2" fontWeight="600">
            TODAY
          </text>
        </svg>
      </div>

      {/* Session legend */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginTop: 4 }}>
        {SESSIONS.map(s => {
          const done = !!dayLog[s.id];
          const score = dayLog[s.id]?.score ?? 0;
          return (
            <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: done ? s.color : trackColor, boxShadow: done ? `0 0 4px ${s.color}` : "none" }}/>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".06em", color: done ? s.color : muted, textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>{s.label}</span>
              </div>
              <span style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: done ? accent : muted }}>
                {done ? `${Math.round(score * 100)}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12, paddingTop: 10, borderTop: dark ? "1px solid rgba(212,175,55,0.10)" : "1px solid rgba(0,0,0,0.06)" }}>
        {[
          { label: "Sessions", value: completedSessions, unit: "/5" },
          { label: "Streak", value: streak, unit: "d" },
          { label: "Total", value: completedCount, unit: "juz" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: accent, fontFamily: "'Playfair Display', serif" }}>
              {s.value}<span style={{ fontSize: 9, color: muted, marginLeft: 2 }}>{s.unit}</span>
            </div>
            <div style={{ fontSize: 8, letterSpacing: ".10em", textTransform: "uppercase", color: muted, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
