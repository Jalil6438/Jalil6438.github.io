import React, { useMemo, useState } from "react";

// DailyProgressChart — bar chart of daily new ayahs over time, with key
// stats (streak / longest / total / daily average) shown below.
//
// Data source: localStorage["rihlat-daily-progress"] is an object
//   { "YYYY-MM-DD": { newAyahs: number, totalAyahs: number }, ... }
// If empty, the chart backfills the last 5 days from `recentBatches` so
// new users see something instead of an empty grid.

const DAY_MS = 24 * 60 * 60 * 1000;
const fmtKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fmtShort = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

function loadSnapshots() {
  try {
    return JSON.parse(localStorage.getItem("rihlat-daily-progress") || "{}");
  } catch {
    return {};
  }
}

function loadSessionLog() {
  try {
    return JSON.parse(localStorage.getItem("rihlat-session-log") || "{}");
  } catch {
    return {};
  }
}

const SESSION_IDS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

// Daily discipline score: mean of 5 session scores. Missed sessions count
// as 0. Range 0..1. A perfect-on-time day = 1.0. Half-skipped + delayed
// sessions land around 0.3-0.5.
function dailyScore(dayLog) {
  if (!dayLog) return 0;
  let sum = 0;
  for (const id of SESSION_IDS) {
    sum += (dayLog[id]?.score) ?? 0;
  }
  return sum / SESSION_IDS.length;
}

export default function DailyProgressChart({
  dark,
  completedCount,
  streak,
  longestStreak,
  recentBatches = [],
  goalLabel,
  sessionJuz,
  dailyChecks,
}) {
  const [windowDays, setWindowDays] = useState(30);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Build the daily series. Each day gets a 0-1 discipline score from the
  // session-log (timing + (eventually) quality). Falls back to a partial
  // score from recentBatches presence for backfilled days that pre-date
  // session-log logging.
  const series = useMemo(() => {
    const snaps = loadSnapshots();
    const sessionLog = loadSessionLog();
    const days = [];
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY_MS);
      const key = fmtKey(d);
      const snap = snaps[key];
      const dayLog = sessionLog[key];
      const score = dayLog ? dailyScore(dayLog) : 0;
      const sessionsCompleted = dayLog ? SESSION_IDS.filter(id => dayLog[id]).length : 0;
      days.push({
        date: d,
        key,
        score,
        sessionsCompleted,
        newAyahs: snap?.newAyahs ?? 0,
      });
    }
    // Backfill from recentBatches: any day with prior Fajr work but no log
    // gets a partial score (0.5) so the chart isn't blank for pre-logging days.
    const rb = recentBatches || [];
    for (let i = 0; i < rb.length; i++) {
      const dayOffset = rb.length - 1 - i;
      const idx = days.length - 1 - dayOffset;
      if (idx < 0 || idx >= days.length) continue;
      if (days[idx].score === 0 && (rb[i] || []).length > 0) {
        days[idx].score = 0.5;
        days[idx].newAyahs = (rb[i] || []).length;
      }
    }
    return days;
  }, [windowDays, today, recentBatches, dailyChecks]);

  const totalNew = series.reduce((s, d) => s + d.newAyahs, 0);
  const activeDays = series.filter(d => d.score > 0).length;
  const avg = activeDays > 0 ? Math.round(totalNew / activeDays) : 0;
  const [hoverIdx, setHoverIdx] = useState(null);

  const accent = dark ? "#E6B84A" : "#B45309";
  const accentDim = dark ? "rgba(212,175,55,0.18)" : "rgba(180,83,9,0.18)";
  const text = dark ? "#F3E7C8" : "#2D2A26";
  const sub = dark ? "rgba(243,231,200,0.55)" : "#6B645A";
  const muted = dark ? "rgba(243,231,200,0.30)" : "#8B7355";

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
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: sub, fontWeight: 700 }}>
            Memorization Activity
          </div>
          <div style={{ fontSize: 11, color: accent, marginTop: 2 }}>
            {sessionJuz ? `Currently on Juz ${sessionJuz}` : "Begin your journey"}
          </div>
          <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>
            {completedCount} of 30 Juz · Goal: {goalLabel || "—"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[14, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setWindowDays(d)}
              style={{
                padding: "3px 8px",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                borderRadius: 6,
                background: windowDays === d ? (dark ? "rgba(212,175,55,0.15)" : "rgba(180,140,40,0.10)") : "transparent",
                color: windowDays === d ? accent : muted,
                border: `1px solid ${windowDays === d ? (dark ? "rgba(212,175,55,0.30)" : "rgba(140,100,20,0.20)") : "transparent"}`,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Chart — SVG bar chart, full width */}
      <div style={{ position: "relative", width: "100%", height: 130 }}>
        <svg viewBox={`0 0 ${windowDays * 10} 100`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
          {[0.25, 0.5, 0.75, 1].map(p => (
            <line
              key={p}
              x1="0"
              y1={100 - p * 90}
              x2={windowDays * 10}
              y2={100 - p * 90}
              stroke={dark ? "rgba(243,231,200,0.05)" : "rgba(0,0,0,0.05)"}
              strokeWidth="0.5"
              strokeDasharray="2 3"
            />
          ))}
          {series.map((d, i) => {
            // Bar height = discipline score (0..1), so an 8-ayah page reads
            // the same as a 25-ayah page — what matters is that the day was
            // completed on time, not the verse count.
            const h = d.score * 90;
            const x = i * 10 + 1;
            const w = 8;
            const isToday = i === series.length - 1;
            const active = d.score > 0;
            return (
              <g key={d.key} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} style={{ cursor: "pointer" }}>
                <rect x={i * 10} y={0} width="10" height="100" fill="transparent" />
                {!active && (
                  <rect x={x} y={98} width={w} height={2} fill={accentDim} rx="1" />
                )}
                {active && (
                  <rect
                    x={x}
                    y={100 - h}
                    width={w}
                    height={h}
                    fill={isToday ? "#F6E27A" : accent}
                    rx="1"
                    opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.55}
                  />
                )}
              </g>
            );
          })}
        </svg>
        {/* Hover tooltip */}
        {hoverIdx !== null && (
          <div
            style={{
              position: "absolute",
              top: -2,
              left: `${(hoverIdx / windowDays) * 100}%`,
              transform: "translateX(-50%)",
              background: dark ? "rgba(8,14,28,0.95)" : "rgba(255,255,255,0.95)",
              color: text,
              fontSize: 10,
              padding: "4px 8px",
              borderRadius: 6,
              border: dark ? "1px solid rgba(212,175,55,0.25)" : "1px solid rgba(139,106,16,0.25)",
              fontFamily: "'IBM Plex Mono', monospace",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.30)",
            }}
          >
            {fmtShort(series[hoverIdx].date)} · {Math.round(series[hoverIdx].score * 100)}% · {series[hoverIdx].sessionsCompleted ?? 0}/5 sessions
          </div>
        )}
      </div>

      {/* X-axis labels — first, middle, today */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: muted, fontFamily: "'IBM Plex Mono', monospace" }}>
        <span>{fmtShort(series[0].date)}</span>
        <span>{fmtShort(series[Math.floor(series.length / 2)].date)}</span>
        <span>Today</span>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 12, paddingTop: 10, borderTop: dark ? "1px solid rgba(212,175,55,0.10)" : "1px solid rgba(0,0,0,0.06)" }}>
        {[
          { label: "Streak", value: streak ?? 0, unit: "d" },
          { label: "Longest", value: longestStreak ?? streak ?? 0, unit: "d" },
          { label: "Total", value: completedCount ?? 0, unit: "juz" },
          { label: "Avg/day", value: avg, unit: "ayah" },
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
    </div>
  );
}
