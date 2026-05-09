import React from "react";

// TreeProgress — each juz memorized lights a leaf on a stylized tree.
// Layout: 30 leaf positions arranged as canopy levels around a central
// trunk. As completedCount grows, leaves transition from faint outline
// to glowing gold. Latest-juz leaf has a subtle pulse so the user can
// spot their current progress.

// 30 leaf positions in viewBox 100x150. Roughly arranged in canopy
// layers from bottom (juz 1) to top (juz 30). Asymmetric for natural look.
const LEAVES = [
  // Lower canopy — juz 1-6
  { x: 30, y: 95,  juz: 1 },
  { x: 70, y: 95,  juz: 2 },
  { x: 22, y: 88,  juz: 3 },
  { x: 78, y: 88,  juz: 4 },
  { x: 38, y: 86,  juz: 5 },
  { x: 62, y: 86,  juz: 6 },
  // Mid-lower — juz 7-12
  { x: 18, y: 78,  juz: 7 },
  { x: 82, y: 78,  juz: 8 },
  { x: 30, y: 76,  juz: 9 },
  { x: 70, y: 76,  juz: 10 },
  { x: 42, y: 73,  juz: 11 },
  { x: 58, y: 73,  juz: 12 },
  // Mid canopy — juz 13-18
  { x: 22, y: 65,  juz: 13 },
  { x: 78, y: 65,  juz: 14 },
  { x: 35, y: 62,  juz: 15 },
  { x: 65, y: 62,  juz: 16 },
  { x: 50, y: 60,  juz: 17 },
  { x: 28, y: 55,  juz: 18 },
  // Upper-mid — juz 19-24
  { x: 72, y: 55,  juz: 19 },
  { x: 42, y: 50,  juz: 20 },
  { x: 58, y: 50,  juz: 21 },
  { x: 35, y: 44,  juz: 22 },
  { x: 65, y: 44,  juz: 23 },
  { x: 50, y: 42,  juz: 24 },
  // Top canopy — juz 25-30
  { x: 40, y: 36,  juz: 25 },
  { x: 60, y: 36,  juz: 26 },
  { x: 46, y: 30,  juz: 27 },
  { x: 54, y: 30,  juz: 28 },
  { x: 50, y: 24,  juz: 29 },
  { x: 50, y: 18,  juz: 30 }, // crown
];

// Branch lines — thin curves from trunk to each leaf. Hand-drawn so
// the tree looks organic rather than radially perfect.
const BRANCHES = [
  // Lower branches from trunk base (50, 100)
  "M 50 100 Q 40 96 30 95",
  "M 50 100 Q 60 96 70 95",
  "M 50 95 Q 36 90 22 88",
  "M 50 95 Q 64 90 78 88",
  "M 50 95 Q 44 89 38 86",
  "M 50 95 Q 56 89 62 86",
  // Mid branches from trunk middle (50, 80)
  "M 50 85 Q 30 80 18 78",
  "M 50 85 Q 70 80 82 78",
  "M 50 80 Q 40 78 30 76",
  "M 50 80 Q 60 78 70 76",
  "M 50 75 Q 46 74 42 73",
  "M 50 75 Q 54 74 58 73",
  // Upper canopy from trunk (50, 65)
  "M 50 70 Q 35 67 22 65",
  "M 50 70 Q 65 67 78 65",
  "M 50 65 Q 42 63 35 62",
  "M 50 65 Q 58 63 65 62",
  "M 50 60 L 50 60",
  "M 50 58 Q 38 56 28 55",
  "M 50 58 Q 62 56 72 55",
  "M 50 52 Q 46 51 42 50",
  "M 50 52 Q 54 51 58 50",
  "M 50 46 Q 42 45 35 44",
  "M 50 46 Q 58 45 65 44",
  "M 50 44 L 50 42",
  "M 50 38 Q 44 37 40 36",
  "M 50 38 Q 56 37 60 36",
  "M 50 32 Q 48 31 46 30",
  "M 50 32 Q 52 31 54 30",
  "M 50 26 L 50 24",
  "M 50 20 L 50 18",
];

export default function TreeProgress({ dark, completedCount = 0, sessionJuz, goalLabel, streak = 0 }) {
  const completed = completedCount;
  const trunkColor = dark ? "rgba(120,80,40,0.85)" : "rgba(92,60,28,0.90)";
  const branchColor = dark ? "rgba(160,110,60,0.55)" : "rgba(110,72,32,0.65)";
  const leafLit = dark ? "#F6E27A" : "#D4AF37";
  const leafDim = dark ? "rgba(243,231,200,0.18)" : "rgba(45,42,38,0.18)";
  const accent = dark ? "#E6B84A" : "#B45309";
  const text = dark ? "#F3E7C8" : "#2D2A26";
  const sub = dark ? "rgba(243,231,200,0.55)" : "#6B645A";
  const muted = dark ? "rgba(243,231,200,0.30)" : "#8B7355";

  const latest = LEAVES.filter(l => l.juz <= completed).slice(-1)[0];

  return (
    <div
      style={{
        borderRadius: 16,
        padding: "14px 16px 12px",
        background: dark
          ? "linear-gradient(180deg, rgba(15,26,43,0.85) 0%, rgba(10,17,32,0.92) 100%)"
          : "linear-gradient(180deg, rgba(232,221,200,0.95) 0%, rgba(218,205,180,0.95) 100%)",
        border: dark ? "1px solid rgba(212,175,55,0.18)" : "1px solid rgba(139,106,16,0.16)",
        boxShadow: dark ? "0 4px 16px rgba(0,0,0,0.30)" : "0 2px 10px rgba(0,0,0,0.06)",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: sub, fontWeight: 700 }}>
            Memorization Tree
          </div>
          <div style={{ fontSize: 11, color: accent, marginTop: 2 }}>
            {sessionJuz ? `Currently on Juz ${sessionJuz}` : "Plant your tree"}
          </div>
          <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>
            {completed} of 30 Juz · Goal: {goalLabel || "—"}
          </div>
        </div>
      </div>

      <div style={{ position: "relative", width: "100%", aspectRatio: "100 / 150", maxHeight: "55vh" }}>
        <svg viewBox="0 0 100 150" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}>
          <defs>
            <radialGradient id="leafGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={leafLit} stopOpacity="0.85" />
              <stop offset="60%" stopColor={leafLit} stopOpacity="0.40" />
              <stop offset="100%" stopColor={leafLit} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="trunkGrad" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor={trunkColor} stopOpacity="0.5" />
              <stop offset="100%" stopColor={trunkColor} stopOpacity="0.95" />
            </linearGradient>
            <filter id="leafFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Ground */}
          <ellipse cx="50" cy="138" rx="38" ry="3" fill={dark ? "rgba(80,60,30,0.40)" : "rgba(110,80,40,0.30)"} />

          {/* Trunk — wider at base, tapering up */}
          <path
            d="M 47 138 Q 46 110 48 80 Q 49 50 50 18 Q 51 50 52 80 Q 54 110 53 138 Z"
            fill="url(#trunkGrad)"
            stroke={trunkColor}
            strokeWidth="0.4"
          />

          {/* Branches */}
          {BRANCHES.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={branchColor}
              strokeWidth="0.7"
              strokeLinecap="round"
              opacity={LEAVES[i] && completed >= LEAVES[i].juz ? 0.9 : 0.4}
            />
          ))}

          {/* Leaves — almond/teardrop path, rotated per leaf for natural look.
              The shape: stem at bottom, body curves out and tapers to a tip at top. */}
          {LEAVES.map(l => {
            const lit = completed >= l.juz;
            const isLatest = latest && l.juz === latest.juz;
            // Pseudo-random rotation seeded by juz number so leaves don't all point the same way.
            const rot = ((l.juz * 53) % 80) - 40;
            // Lean leaves outward from the trunk so they look like they're hanging off branches.
            const lean = (l.x - 50) * 1.2;
            const angle = rot + lean;
            const size = lit ? 1 : 0.8;
            return (
              <g key={l.juz} transform={`translate(${l.x} ${l.y}) rotate(${angle}) scale(${size})`}>
                {lit && (
                  <ellipse cx="0" cy="0" rx="3.5" ry="3.5" fill="url(#leafGlow)" filter="url(#leafFilter)" />
                )}
                {/* Almond leaf shape — pointed at both tips, full body in the middle */}
                <path
                  d="M 0 -2.4 C 1.6 -1.6, 1.6 1.6, 0 2.4 C -1.6 1.6, -1.6 -1.6, 0 -2.4 Z"
                  fill={lit ? leafLit : leafDim}
                  stroke={lit ? leafLit : (dark ? "rgba(243,231,200,0.30)" : "rgba(45,42,38,0.30)")}
                  strokeWidth="0.25"
                />
                {/* Center vein */}
                <line x1="0" y1="-2.2" x2="0" y2="2.2" stroke={lit ? "rgba(92,60,28,0.55)" : "rgba(0,0,0,0.20)"} strokeWidth="0.18" strokeLinecap="round" />
                {isLatest && (
                  <circle cx="0" cy="0" r="3" fill="none" stroke={leafLit} strokeWidth="0.4" className="tree-pulse">
                    <animate attributeName="r" values="2.6;4.4;2.6" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.75;0;0.75" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10, paddingTop: 10, borderTop: dark ? "1px solid rgba(212,175,55,0.10)" : "1px solid rgba(0,0,0,0.06)" }}>
        {[
          { label: "Juz", value: completed, unit: `of 30` },
          { label: "Streak", value: streak, unit: "d" },
          { label: "Remaining", value: 30 - completed, unit: "juz" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: accent, fontFamily: "'Playfair Display', serif" }}>
              {s.value}<span style={{ fontSize: 9, color: muted, marginLeft: 2 }}>{s.unit}</span>
            </div>
            <div style={{ fontSize: 8, letterSpacing: ".10em", textTransform: "uppercase", color: muted, fontWeight: 600 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .tree-pulse animate { display: none; }
        }
      `}</style>
    </div>
  );
}
