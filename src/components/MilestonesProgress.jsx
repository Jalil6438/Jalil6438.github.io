import { useRef, useEffect } from "react";

// MilestonesProgress — the "Rihlat Al-Hifz" journey as a vertical timeline of
// milestones earned WHILE USING the app, each stamped with the date it was
// reached. It is deliberately NOT a lifetime-hifz scoreboard: a user who joins
// already knowing several ajzā' should still have a fresh journey here. App
// milestones (joined / sessions / streaks / engagement) plus memorization done
// *inside* Al-Hifz (current minus the baseline snapshotted at join). The Current
// Goal card stays anchored to the user's real level ("Complete Juz N").

const TOTAL_AYAHS = 6236, TOTAL_PAGES = 604, DAY_MS = 86400000;
const SES = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

const readJSON = (k, fb) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : fb; } catch { return fb; } };

// Cumulative session signals from the per-day session log.
function sessionStats() {
  const log = readJSON("rihlat-session-log", {}) || {};
  const days = Object.keys(log).sort();
  let total = 0, activeDays = 0, fullDay = false, longest = 0, run = 0, prev = null;
  for (const k of days) {
    const n = SES.filter((id) => log[k] && log[k][id]).length;
    if (n === 0) { continue; }
    total += n; activeDays++; if (n === 5) fullDay = true;
    const d = new Date(k + "T00:00:00").getTime();
    run = prev !== null && Math.round((d - prev) / DAY_MS) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run); prev = d;
  }
  return { total, activeDays, fullDay, longestStreak: longest };
}

const fmtDate = (ts) => {
  if (!ts) return "";
  try {
    const d = new Date(ts), now = new Date();
    const opt = d.getFullYear() === now.getFullYear() ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" };
    return d.toLocaleDateString(undefined, opt);
  } catch { return ""; }
};

export default function MilestonesProgress({ dark, completedCount = 0, completedSurahCount = 0, memorizedAyahs = 0, streak = 0, sessionJuz, goalLabel }) {
  const accent = dark ? "#E6B84A" : "#B45309";
  const gold = dark ? "#F6E27A" : "#D4AF37";
  const text = dark ? "#F3E7C8" : "#2D2A26";
  const sub = dark ? "rgba(243,231,200,0.55)" : "#6B645A";
  const muted = dark ? "rgba(243,231,200,0.30)" : "#8B7355";
  const lineLit = dark ? "rgba(246,226,122,0.6)" : "rgba(180,140,40,0.55)";
  const lineDim = dark ? "rgba(243,231,200,0.10)" : "rgba(45,42,38,0.10)";

  // ── journey baseline (captured at join; falls back to "current" so we never
  //    retroactively credit pre-app memorization) ──
  const journey = readJSON("rihlat-journey-start", null);
  const baseAyahs = journey ? (journey.ayahs ?? 0) : memorizedAyahs;
  const baseJuz = journey ? (journey.juz ?? 0) : completedCount;
  const baseSurahs = journey ? (journey.surahs ?? 0) : completedSurahCount;
  const joinTs = journey ? journey.ts : null;

  const { total: sessionsCount, activeDays, fullDay, longestStreak } = sessionStats();
  const maxStreak = Math.max(streak || 0, longestStreak || 0);
  const reflectionsCount = Object.keys(readJSON("rihlat-reflections", {}) || {}).length;
  const bookmarksCount = (readJSON("rihlat-mushaf-bookmarks", []) || []).length;
  const pages = Math.round((memorizedAyahs / TOTAL_AYAHS) * TOTAL_PAGES);
  const basePages = Math.round((baseAyahs / TOTAL_AYAHS) * TOTAL_PAGES);

  // ── milestone definitions — all relative to the Al-Hifz journey ──
  const defs = [
    { key: "joined", label: "Joined Al-Hifz", note: "Your journey began", done: true, fixedDate: joinTs },
    { key: "first-session", label: "First Session", note: "Your first sitting", done: sessionsCount >= 1 },
    { key: "first-full-day", label: "First Full Day", note: "All five sessions in a day", done: fullDay },
    { key: "first-week", label: "First Week", note: "Seven active days", done: activeDays >= 7 },
    { key: "streak-7", label: "7-Day Streak", note: "A week unbroken", done: maxStreak >= 7 },
    { key: "streak-30", label: "30-Day Streak", note: "A month unbroken", done: maxStreak >= 30 },
    { key: "sessions-100", label: "100 Sessions", note: "A hundred sittings", done: sessionsCount >= 100 },
    { key: "first-reflection", label: "First Reflection", note: "A thought recorded", done: reflectionsCount >= 1 },
    { key: "first-bookmark", label: "First Bookmark", note: "A place saved", done: bookmarksCount >= 1 },
    { key: "hifz-ayah", label: "First Ayah in Al-Hifz", note: "New memorization begun", done: memorizedAyahs > baseAyahs },
    { key: "hifz-page", label: "First Page in Al-Hifz", note: "A page held, here", done: pages > basePages },
    { key: "hifz-surah", label: "First Surah in Al-Hifz", note: "A surah completed, here", done: completedSurahCount > baseSurahs },
    { key: "hifz-juz", label: "First Juz in Al-Hifz", note: "A juz completed, here", done: completedCount > baseJuz },
  ];

  // ── stamp + read achievement dates ──
  const stored = readJSON("rihlat-milestone-dates", {}) || {};
  const now = Date.now();
  const items = defs.map((m) => ({ ...m, date: m.done ? (m.fixedDate || stored[m.key] || now) : null }));
  const doneSig = items.map((m) => (m.done ? "1" : "0")).join("");
  useEffect(() => {
    const d = readJSON("rihlat-milestone-dates", {}) || {};
    let changed = false;
    for (const m of items) {
      if (m.done && m.key !== "joined" && !d[m.key]) { d[m.key] = m.date; changed = true; }
    }
    if (changed) { try { localStorage.setItem("rihlat-milestone-dates", JSON.stringify(d)); } catch { /* ignore */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneSig]);

  // Timeline order: achieved first (chronological by date), then locked.
  const achieved = items.filter((m) => m.done).sort((a, b) => (a.date || 0) - (b.date || 0));
  const locked = items.filter((m) => !m.done);
  const timeline = [...achieved, ...locked];

  const isHafidh = completedCount >= 30;
  // Next juz on the (juz 30 → 1) path, derived from the real completed count so
  // it always reflects the user's actual level — even when joining mid-journey.
  const goalJuz = sessionJuz && sessionJuz < 30 - completedCount + 1 ? sessionJuz : Math.max(1, 30 - completedCount);
  const goalText = isHafidh ? "Qur'an Complete" : `Complete Juz ${goalJuz}`;
  const goalSub = isHafidh ? "Alhamdulillah — a Hafidh" : (goalLabel ? `Toward: ${goalLabel}` : "Keep going");

  const scrollRef = useRef(null);

  const stats = [
    { label: "Days", value: activeDays },
    { label: "Sessions", value: sessionsCount },
    { label: "Streak", value: streak },
    { label: "Juz", value: completedCount },
  ];

  return (
    <div style={{ position: "relative", borderRadius: 16, padding: "12px 14px 12px", background: dark ? "linear-gradient(180deg, rgba(15,26,43,0.85) 0%, rgba(10,17,32,0.92) 100%)" : "linear-gradient(180deg, rgba(232,221,200,0.95) 0%, rgba(218,205,180,0.95) 100%)", border: dark ? "1px solid rgba(212,175,55,0.18)" : "1px solid rgba(139,106,16,0.16)", boxShadow: dark ? "0 4px 16px rgba(0,0,0,0.30)" : "0 2px 10px rgba(0,0,0,0.06)", marginBottom: 10 }}>
      <style>{`@keyframes mlGlow{0%,100%{box-shadow:0 0 14px rgba(246,226,122,0.25)}50%{box-shadow:0 0 24px rgba(246,226,122,0.5)}}@media (prefers-reduced-motion: reduce){.ml-goal{animation:none!important}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: sub, fontWeight: 700 }}>Memorization Journey</div>
        <div style={{ fontSize: 10, color: muted, marginTop: 3 }}>{joinTs ? `Since ${fmtDate(joinTs)}` : "Your journey in Al-Hifz"}</div>
      </div>

      {/* Current Goal — anchored to the user's REAL level, not the app milestones */}
      <div className="ml-goal" style={{ borderRadius: 14, padding: "12px 14px", marginBottom: 14, background: dark ? "linear-gradient(135deg, rgba(212,175,55,0.14), rgba(212,175,55,0.04))" : "rgba(180,140,40,0.08)", border: `1px solid ${dark ? "rgba(246,226,122,0.35)" : "rgba(140,100,20,0.25)"}`, animation: "mlGlow 3s ease-in-out infinite" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: accent }}>Current Goal</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: gold, fontFamily: "'Playfair Display',serif", lineHeight: 1.15 }}>{goalText}</div>
        <div style={{ fontSize: 10, color: sub, marginTop: 2 }}>{goalSub}</div>
      </div>

      {/* Journey timeline — app milestones, each with the date it was reached */}
      <div ref={scrollRef} style={{ maxHeight: "min(34vh, 280px)", overflowY: "auto", margin: "0 -2px", paddingRight: 2 }}>
        {timeline.map((m, i) => {
          const topLit = i > 0 && timeline[i - 1].done;
          const botLit = m.done;
          return (
            <div key={m.key} style={{ display: "flex", gap: 12, minHeight: 44 }}>
              <div style={{ position: "relative", width: 26, flexShrink: 0 }}>
                {i > 0 && <div style={{ position: "absolute", left: "50%", top: 0, height: "50%", width: 2, transform: "translateX(-50%)", background: topLit ? lineLit : lineDim }} />}
                {i < timeline.length - 1 && <div style={{ position: "absolute", left: "50%", top: "50%", bottom: 0, width: 2, transform: "translateX(-50%)", background: botLit ? lineLit : lineDim }} />}
                <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
                  {m.done ? (
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: `radial-gradient(circle at 50% 35%, ${gold}, ${dark ? "#B8860B" : "#A87B12"})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: dark ? "#1A1206" : "#3A2A06", boxShadow: `0 0 10px ${dark ? "rgba(246,226,122,0.45)" : "rgba(180,140,40,0.35)"}` }}>✓</div>
                  ) : (
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${lineDim}`, background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }} />
                  )}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: m.done ? 700 : 500, color: m.done ? text : muted, fontFamily: "'DM Sans',sans-serif" }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: m.done ? sub : muted, marginTop: 1, opacity: m.done ? 0.9 : 0.6 }}>{m.note}</div>
                </div>
                {m.done && m.date && <div style={{ flexShrink: 0, fontSize: 9, fontWeight: 600, color: accent, fontFamily: "'IBM Plex Mono',monospace", whiteSpace: "nowrap" }}>{fmtDate(m.date)}</div>}
                {!m.done && <span style={{ flexShrink: 0, fontSize: 11, opacity: 0.4 }}>🔒</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Journey stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginTop: 10, paddingTop: 10, borderTop: dark ? "1px solid rgba(212,175,55,0.10)" : "1px solid rgba(0,0,0,0.06)" }}>
        {stats.map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: accent, fontFamily: "'Playfair Display',serif", lineHeight: 1.1 }}>{s.value}</div>
            <div style={{ fontSize: 8, letterSpacing: ".10em", textTransform: "uppercase", color: muted, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
