import React, { useMemo, useState } from "react";

// HeatmapProgress — GitHub-contribution style calendar. Each square is one
// day, shaded from dim to gold based on that day's discipline score. 5
// shade tiers, plus an empty/dim tile for no activity.

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_IDS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

function loadSessionLog() {
  try { return JSON.parse(localStorage.getItem("rihlat-session-log") || "{}"); } catch { return {}; }
}
function dailyScore(dayLog) {
  if (!dayLog) return 0;
  let s = 0;
  for (const id of SESSION_IDS) s += (dayLog[id]?.score) ?? 0;
  return s / SESSION_IDS.length;
}
function fmtKey(d) {
  // Local-date ISO key (matches the writer in quran-hifz-tracker.jsx).
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
}
function fmtShort(d) { return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }

const TIER_COLORS_DARK = [
  "rgba(212,175,55,0.05)",   // 0     — empty
  "rgba(212,175,55,0.25)",   // 0..25
  "rgba(212,175,55,0.45)",   // 25..50
  "rgba(212,175,55,0.70)",   // 50..75
  "rgba(246,226,122,0.95)",  // 75..100
];
const TIER_COLORS_LIGHT = [
  "rgba(180,83,9,0.05)",
  "rgba(180,83,9,0.20)",
  "rgba(180,83,9,0.40)",
  "rgba(180,83,9,0.65)",
  "rgba(180,83,9,0.95)",
];

function tier(score) {
  if (score <= 0) return 0;
  if (score < 0.25) return 1;
  if (score < 0.50) return 2;
  if (score < 0.75) return 3;
  return 4;
}

export default function HeatmapProgress({ dark, completedCount = 0, sessionJuz, goalLabel, streak = 0, dailyChecks, checkHistory = {} }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [hover, setHover] = useState(null);

  // Build a calendar-month grid for the month containing `today`. Rows are
  // weeks (Sun-Sat). Days from the prior/next month that fill the corner
  // squares are rendered faintly so the grid stays rectangular.
  const grid = useMemo(() => {
    const log = loadSessionLog();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const firstDow = monthStart.getDay();             // weekday of day 1 (0=Sun)
    const totalCells = Math.ceil((firstDow + monthEnd.getDate()) / 7) * 7;
    const gridStart = new Date(monthStart.getTime() - firstDow * DAY_MS);
    const rows = [];
    for (let r = 0; r < totalCells / 7; r++) {
      const row = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(gridStart.getTime() + (r * 7 + d) * DAY_MS);
        const future = date > today;
        const outOfMonth = date.getMonth() !== today.getMonth();
        const k = fmtKey(date);
        const dayLog = log[k];
        let score = future ? 0 : dailyScore(dayLog);
        let sessionsCompleted = dayLog ? SESSION_IDS.filter(id => dayLog[id]).length : 0;
        if (!future && score === 0 && checkHistory && checkHistory[k]) {
          const ch = checkHistory[k];
          const completedIds = SESSION_IDS.filter(id => ch[id]);
          if (completedIds.length > 0) {
            score = (completedIds.length * 0.7) / SESSION_IDS.length;
            sessionsCompleted = completedIds.length;
          }
        }
        row.push({ date, key: k, future, outOfMonth, score, sessionsCompleted });
      }
      rows.push(row);
    }
    return rows;
  }, [today, dailyChecks, checkHistory]);

  const palette = dark ? TIER_COLORS_DARK : TIER_COLORS_LIGHT;
  const accent = dark ? "#E6B84A" : "#B45309";
  const text = dark ? "#F3E7C8" : "#2D2A26";
  const sub = dark ? "rgba(243,231,200,0.55)" : "#6B645A";
  const muted = dark ? "rgba(243,231,200,0.30)" : "#8B7355";
  const todayKey = fmtKey(today);

  // Stats: active days in window + best week
  const flat = grid.flat();
  const activeDays = flat.filter(d => d.score > 0).length;
  const totalScore = flat.reduce((s, d) => s + d.score, 0);
  const avg = activeDays > 0 ? Math.round((totalScore / activeDays) * 100) : 0;

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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: sub, fontWeight: 700 }}>Memorization Activity</div>
          <div style={{ fontSize: 11, color: accent, marginTop: 2 }}>{sessionJuz ? `Currently on Juz ${sessionJuz}` : "Begin your journey"}</div>
          <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>{completedCount} of 30 Juz · Goal: {goalLabel || "—"}</div>
        </div>
      </div>

      {/* Month label + weekday header + grid */}
      <div style={{ textAlign: "center", fontSize: 11, fontFamily: "'Playfair Display', serif", fontWeight: 700, color: text, marginBottom: 6 }}>
        {today.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
        {["S","M","T","W","T","F","S"].map((w, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 8, color: muted, fontWeight: 700, letterSpacing: ".06em" }}>{w}</div>
        ))}
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ display: "grid", gridTemplateRows: `repeat(${grid.length}, 1fr)`, gap: 3 }}>
          {grid.map((row, ri) => (
            <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
              {row.map((cell, ci) => {
                const isToday = cell.key === todayKey;
                const t = tier(cell.score);
                const dayNum = cell.date.getDate();
                return (
                  <div
                    key={cell.key}
                    onMouseEnter={() => setHover({ ci, ri, cell })}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      aspectRatio: "1 / 1",
                      borderRadius: 4,
                      background: cell.future || cell.outOfMonth ? "transparent" : palette[t],
                      border: isToday ? `1.5px solid ${accent}` : "none",
                      boxShadow: t === 4 ? `0 0 6px ${dark ? "rgba(246,226,122,0.45)" : "rgba(180,83,9,0.45)"}` : "none",
                      cursor: (cell.future || cell.outOfMonth) ? "default" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9,
                      color: cell.outOfMonth ? "rgba(150,140,120,0.30)" : (t >= 3 ? (dark ? "#0F1A2B" : "#FFFFFF") : muted),
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontWeight: isToday ? 700 : 500,
                      transition: "transform .12s ease",
                      transform: hover && hover.ci === ci && hover.ri === ri ? "scale(1.10)" : "scale(1)",
                    }}
                  >
                    {!cell.outOfMonth && dayNum}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Hover tooltip */}
        {hover && !hover.cell.future && (
          <div style={{
            position: "absolute", top: -34,
            left: `${(hover.ci / 12) * 100}%`,
            transform: "translateX(-50%)",
            background: dark ? "rgba(8,14,28,0.95)" : "rgba(255,255,255,0.95)",
            color: text, fontSize: 10, padding: "4px 8px", borderRadius: 6,
            border: dark ? "1px solid rgba(212,175,55,0.25)" : "1px solid rgba(139,106,16,0.25)",
            whiteSpace: "nowrap", pointerEvents: "none",
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {fmtShort(hover.cell.date)} · {Math.round(hover.cell.score * 100)}% · {hover.cell.sessionsCompleted}/5 sessions
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, fontSize: 9, color: muted, fontFamily: "'IBM Plex Mono', monospace" }}>
        <span>12 weeks ago</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span>less</span>
          {palette.map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }}/>
          ))}
          <span>more</span>
        </div>
        <span>Today</span>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 12, paddingTop: 10, borderTop: dark ? "1px solid rgba(212,175,55,0.10)" : "1px solid rgba(0,0,0,0.06)" }}>
        {[
          { label: "Streak", value: streak, unit: "d" },
          { label: "Active", value: activeDays, unit: "d" },
          { label: "Avg", value: avg, unit: "%" },
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
