import React from "react";

// JuzProgressRing — replaces the wall of 15 juz badges with a single 30-segment
// ring. Each segment is one juz; lit segments = memorized. Subtle gap between
// segments so the count is glanceable. Center shows N of 30 + current juz label.
export default function JuzProgressRing({ dark, completedCount = 0, sessionJuz, juzProgress = 0 }) {
  const total = 30;
  const completed = Math.min(total, Math.max(0, completedCount));
  const cx = 80, cy = 80, r = 60;
  const C = 2 * Math.PI * r;
  const segGap = 2.6;                     // pixels between segments
  const segLen = (C - total * segGap) / total;
  const filled = "#F6E27A";
  const partial = dark ? "#D4AF37" : "#B45309";
  const dim = dark ? "rgba(212,175,55,0.18)" : "rgba(139,106,16,0.16)";
  const accent = dark ? "#E6B84A" : "#B45309";
  const sub = dark ? "rgba(243,231,200,0.55)" : "#6B645A";
  const muted = dark ? "rgba(243,231,200,0.30)" : "#8B7355";
  const isHafiz = completed >= total;
  const inProgressJuz = isHafiz ? null : completed + 1;
  const inProgress = !isHafiz && juzProgress > 0 && juzProgress < 1;

  // Each segment is rendered as a stroke-dasharray slice of a circle.
  // Rotate -90deg so segment 1 starts at the top.
  const segments = Array.from({ length: total }, (_, i) => {
    const offset = i * (segLen + segGap);
    const lit = i < completed;
    const isInProgress = !lit && i === completed && inProgress;
    return { i, offset, lit, isInProgress };
  });

  return (
    <div
      style={{
        borderRadius: 16,
        padding: "14px 16px 14px",
        background: dark
          ? "linear-gradient(180deg, rgba(15,26,43,0.85) 0%, rgba(10,17,32,0.92) 100%)"
          : "linear-gradient(180deg, rgba(232,221,200,0.95) 0%, rgba(218,205,180,0.95) 100%)",
        border: dark ? "1px solid rgba(212,175,55,0.18)" : "1px solid rgba(139,106,16,0.16)",
        boxShadow: dark ? "0 4px 16px rgba(0,0,0,0.30)" : "0 2px 10px rgba(0,0,0,0.06)",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: sub, fontWeight: 700 }}>
          Juz Progress
        </div>
        <div style={{ fontSize: 9, color: muted, fontFamily: "'IBM Plex Mono', monospace" }}>
          {completed} / {total}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 0" }}>
        <svg viewBox="0 0 160 160" style={{ width: "60%", maxWidth: 220, height: "auto" }}>
          <defs>
            <filter id="juzRingGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.1" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Track — full ring of dim segments */}
          {segments.map(s => (
            <circle
              key={`t-${s.i}`}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={dim}
              strokeWidth="7"
              strokeDasharray={`${segLen} ${C - segLen}`}
              strokeDashoffset={-s.offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          ))}

          {/* Lit segments */}
          {segments.filter(s => s.lit).map(s => (
            <circle
              key={`l-${s.i}`}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={filled}
              strokeWidth="7"
              strokeLinecap="butt"
              strokeDasharray={`${segLen} ${C - segLen}`}
              strokeDashoffset={-s.offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              filter="url(#juzRingGlow)"
            />
          ))}

          {/* Current in-progress segment (partial fill) */}
          {segments.filter(s => s.isInProgress).map(s => (
            <circle
              key={`p-${s.i}`}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={partial}
              strokeWidth="7"
              strokeLinecap="butt"
              strokeDasharray={`${segLen * juzProgress} ${C - segLen * juzProgress}`}
              strokeDashoffset={-s.offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              opacity="0.85"
            />
          ))}

          {/* Center labels */}
          <text x={cx} y={cy - 4} textAnchor="middle" fill={accent} fontSize="26" fontWeight="700" fontFamily="'Playfair Display', serif">
            {isHafiz ? "30" : completed}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill={sub} fontSize="8" letterSpacing="2" fontWeight="600">
            {isHafiz ? "HAFIZ" : `OF ${total}`}
          </text>
          {!isHafiz && sessionJuz && (
            <text x={cx} y={cy + 28} textAnchor="middle" fill={muted} fontSize="8" fontFamily="'DM Sans', sans-serif">
              On Juz {sessionJuz}
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}
