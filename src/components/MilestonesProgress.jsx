import { useState, useEffect } from "react";

// MilestonesProgress — the "Rihlat Al-Hifz" journey as a braided, expandable
// timeline. Major STAGES are collapsed (each dated); tapping one opens the
// noteworthy wins inside it. The spine braids the two real strands of hifz:
//   MEMORIZE (Juz N memorized, page by page) and REVISE (Juz N secured on the
//   way back through), alternating exactly as al-Qasim's method runs them.
// Granularity is stage-matched: a beginner at Juz 30 (½ juz/day Asr) earns a
// "½ Juz 30 Revised" win; an advanced memorizer earns whole-juz/cycle wins.
// Memorization & revision are measured IN-APP (vs the baseline at join), so a
// user who joins already knowing ajzā' still starts a fresh journey here. The
// Current Goal card stays anchored to the real next juz.

const TOTAL_AYAHS = 6236, TOTAL_PAGES = 604, DAY_MS = 86400000;
const SES = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

const readJSON = (k, fb) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : fb; } catch { return fb; } };

function sessionStats() {
  const log = readJSON("rihlat-session-log", {}) || {};
  const days = Object.keys(log).sort();
  let total = 0, activeDays = 0, fullDay = false, longest = 0, run = 0, prev = null;
  for (const k of days) {
    const n = SES.filter((id) => log[k] && log[k][id]).length;
    if (n === 0) continue;
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
    return d.toLocaleDateString(undefined, d.getFullYear() === now.getFullYear() ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
};

// juz-count stages (memorize + revise), matching the al-Qasim 30→1 path
const BANDS = [
  { n: 1, mem: "Juz 30 Complete", rev: "First Juz Revised" },
  { n: 5, mem: "Five Juz Complete", rev: "Five Juz Revision Complete" },
  { n: 10, mem: "Ten Juz Complete", rev: "Ten Juz Revision Complete" },
  { n: 15, mem: "Half the Qur'an", rev: "Half Qur'an Revised" },
  { n: 20, mem: "Twenty Juz Complete", rev: "Twenty Juz Revision Complete" },
  { n: 25, mem: "Twenty-Five Juz Complete", rev: "Twenty-Five Juz Revision Complete" },
  { n: 30, mem: "Ḥāfiẓ al-Qur'an", rev: "First Complete Qur'an Revision" },
];

export default function MilestonesProgress({ dark, completedCount = 0, memorizedAyahs = 0, streak = 0, sessionJuz, goalLabel }) {
  const accent = dark ? "#E6B84A" : "#B45309";
  const gold = dark ? "#F6E27A" : "#D4AF37";
  const text = dark ? "#F3E7C8" : "#2D2A26";
  const sub = dark ? "rgba(243,231,200,0.55)" : "#6B645A";
  const muted = dark ? "rgba(243,231,200,0.30)" : "#8B7355";
  const branch = dark ? "rgba(246,226,122,0.22)" : "rgba(140,100,20,0.20)";
  const revAccent = dark ? "#7FD4C0" : "#2A8F7B"; // a distinct hue for the revise strand

  const journey = readJSON("rihlat-journey-start", null);
  const baseAyahs = journey ? (journey.ayahs ?? 0) : memorizedAyahs;
  const baseJuz = journey ? (journey.juz ?? 0) : completedCount;
  const joinTs = journey ? journey.ts : null;

  const { total: sessionsCount, activeDays, fullDay, longestStreak } = sessionStats();
  const maxStreak = Math.max(streak || 0, longestStreak || 0);
  const inAppPages = Math.max(0, Math.round((memorizedAyahs / TOTAL_AYAHS) * TOTAL_PAGES) - Math.round((baseAyahs / TOTAL_AYAHS) * TOTAL_PAGES));
  const inAppJuz = Math.max(0, completedCount - baseJuz);
  const revJuz = readJSON("rihlat-revised-juz", {}) || {}; // { [juz]: { half, full } }
  const stored = readJSON("rihlat-milestone-dates", {}) || {};
  const now = Date.now();

  // ── build the braided stage list ──
  const stages = [
    { key: "joined", label: "Joined Al-Hifz", done: true, fixedDate: joinTs, subs: [] },
    { key: "first-day", label: "First Day", done: sessionsCount >= 1, subs: [
      { key: "first-session", label: "First Session", done: sessionsCount >= 1 },
      { key: "first-page", label: "First Page", done: inAppPages >= 1 },
    ] },
    { key: "first-week", label: "First Week", done: activeDays >= 7, subs: [
      { key: "first-full-day", label: "First Full Day", done: fullDay },
      { key: "week-streak", label: "7 Consecutive Days", done: maxStreak >= 7 },
    ] },
    { key: "first-month", label: "First Month", done: activeDays >= 30, subs: [
      { key: "month-days", label: "30 Active Days", done: activeDays >= 30 },
      { key: "month-streak", label: "30-Day Streak", done: maxStreak >= 30 },
    ] },
  ];

  let prevN = 0;
  for (const b of BANDS) {
    const bandJuz = []; for (let k = prevN + 1; k <= b.n; k++) bandJuz.push(31 - k); // memorized order 30,29,28…
    // MEMORIZE stage
    const memSubs = b.n === 1
      ? [...[5, 10, 15, 20].map((p) => ({ key: `pg-${p}`, label: `${p} Pages Memorized`, done: inAppPages >= p })), { key: "juz-30-mem", label: "Juz 30 Memorized", done: inAppJuz >= 1 }]
      : bandJuz.map((J) => ({ key: `juz-${J}-mem`, label: `Juz ${J} Memorized`, done: inAppJuz >= 31 - J }));
    stages.push({ key: `mem-${b.n}`, label: b.mem, strand: "mem", done: b.n === 30 ? completedCount >= 30 : inAppJuz >= b.n, subs: memSubs });
    // REVISE stage
    const revSubs = b.n === 1
      ? [{ key: "rev-30-half", label: "½ Juz 30 Revised", done: !!revJuz[30]?.half, fixedDate: revJuz[30]?.half }, { key: "rev-30-full", label: "Juz 30 Revised", done: !!revJuz[30]?.full, fixedDate: revJuz[30]?.full }]
      : bandJuz.map((J) => ({ key: `juz-${J}-rev`, label: `Juz ${J} Revised`, done: !!revJuz[J]?.full, fixedDate: revJuz[J]?.full }));
    stages.push({ key: `rev-${b.n}`, label: b.rev, strand: "rev", done: revSubs.length > 0 && revSubs.every((s) => s.done), subs: revSubs });
    prevN = b.n;
  }
  const hafidhTs = stored["mem-30"];
  stages.push({ key: "maintain", label: "One Year Maintaining Hifz", strand: "rev", done: completedCount >= 30 && hafidhTs && now - hafidhTs >= 365 * DAY_MS, subs: [] });

  const dateOf = (m) => (m.done ? (m.fixedDate || stored[m.key] || now) : null);
  const doneSig = stages.map((p) => (p.done ? "1" : "0") + p.subs.map((s) => (s.done ? "1" : "0")).join("")).join("");
  useEffect(() => {
    const d = readJSON("rihlat-milestone-dates", {}) || {};
    let changed = false;
    for (const p of stages) for (const m of [p, ...p.subs]) if (m.done && m.key !== "joined" && !m.fixedDate && !d[m.key]) { d[m.key] = now; changed = true; }
    if (changed) { try { localStorage.setItem("rihlat-milestone-dates", JSON.stringify(d)); } catch { /* ignore */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneSig]);

  const currentKey = (stages.find((s) => !s.done) || stages[stages.length - 1]).key;
  const [openKey, setOpenKey] = useState(undefined);
  const effectiveOpen = openKey === undefined ? currentKey : openKey;

  const isHafidh = completedCount >= 30;
  const goalJuz = sessionJuz && sessionJuz < 30 - completedCount + 1 ? sessionJuz : Math.max(1, 30 - completedCount);
  const goalText = isHafidh ? "Qur'an Complete" : `Complete Juz ${goalJuz}`;
  const goalSub = isHafidh ? "Alhamdulillah — a Hafidh" : (goalLabel ? `Toward: ${goalLabel}` : "Keep going");

  const Node = ({ done, hue }) => (
    done
      ? <div style={{ width: 22, height: 22, borderRadius: "50%", background: `radial-gradient(circle at 50% 35%, ${hue}, ${dark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.18)"})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: dark ? "#0C1320" : "#fff", boxShadow: `0 0 9px ${hue}66`, flexShrink: 0 }}>✓</div>
      : <div style={{ width: 16, height: 16, borderRadius: "50%", border: `1.5px solid ${branch}`, background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", flexShrink: 0 }} />
  );

  return (
    <div style={{ position: "relative", borderRadius: 16, padding: "12px 14px 12px", background: dark ? "linear-gradient(180deg, rgba(15,26,43,0.85) 0%, rgba(10,17,32,0.92) 100%)" : "linear-gradient(180deg, rgba(232,221,200,0.95) 0%, rgba(218,205,180,0.95) 100%)", border: dark ? "1px solid rgba(212,175,55,0.18)" : "1px solid rgba(139,106,16,0.16)", boxShadow: dark ? "0 4px 16px rgba(0,0,0,0.30)" : "0 2px 10px rgba(0,0,0,0.06)", marginBottom: 10 }}>
      <style>{`@keyframes mlGlow{0%,100%{box-shadow:0 0 14px rgba(246,226,122,0.25)}50%{box-shadow:0 0 24px rgba(246,226,122,0.5)}}@media (prefers-reduced-motion: reduce){.ml-goal{animation:none!important}}`}</style>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: sub, fontWeight: 700 }}>Memorization Journey</div>
        <div style={{ fontSize: 10, color: muted, marginTop: 3 }}>{joinTs ? `Since ${fmtDate(joinTs)}` : "Your journey in Al-Hifz"}</div>
      </div>

      <div className="ml-goal" style={{ borderRadius: 14, padding: "12px 14px", marginBottom: 14, background: dark ? "linear-gradient(135deg, rgba(212,175,55,0.14), rgba(212,175,55,0.04))" : "rgba(180,140,40,0.08)", border: `1px solid ${dark ? "rgba(246,226,122,0.35)" : "rgba(140,100,20,0.25)"}`, animation: "mlGlow 3s ease-in-out infinite" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: accent }}>Current Goal</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: gold, fontFamily: "'Playfair Display',serif", lineHeight: 1.15 }}>{goalText}</div>
        <div style={{ fontSize: 10, color: sub, marginTop: 2 }}>{goalSub}</div>
      </div>

      {/* strand legend */}
      <div style={{ display: "flex", gap: 14, marginBottom: 8, paddingLeft: 2 }}>
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: gold }}>● Memorize</span>
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: revAccent }}>● Revise</span>
      </div>

      <div style={{ maxHeight: "min(42vh, 360px)", overflowY: "auto", paddingRight: 2 }}>
        {stages.map((p) => {
          const hue = p.strand === "rev" ? revAccent : gold;
          const open = effectiveOpen === p.key;
          const pDate = dateOf(p);
          const isCurrent = p.key === currentKey;
          return (
            <div key={p.key} style={{ marginBottom: 6 }}>
              <div onClick={() => setOpenKey(open ? null : p.key)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: p.subs.length ? "pointer" : "default", padding: "3px 0" }}>
                <Node done={p.done} hue={hue} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: p.done ? text : (isCurrent ? accent : muted), fontFamily: "'DM Sans',sans-serif" }}>{p.label}</span>
                  {p.done && pDate ? <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 600, color: hue, fontFamily: "'IBM Plex Mono',monospace" }}>{fmtDate(pDate)}</span>
                    : isCurrent ? <span style={{ flexShrink: 0, fontSize: 7, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: dark ? "#1A1206" : "#3A2A06", background: `linear-gradient(90deg,${gold},${accent})`, padding: "2px 6px", borderRadius: 999 }}>Now</span> : null}
                </div>
                {p.subs.length > 0 && <span style={{ flexShrink: 0, fontSize: 9, color: muted, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▸</span>}
              </div>
              {open && p.subs.length > 0 && (
                <div style={{ marginLeft: 10, marginTop: 3, marginBottom: 4, paddingLeft: 16, borderLeft: `2px solid ${hue}44`, display: "flex", flexDirection: "column", gap: 6 }}>
                  {p.subs.map((s) => {
                    const sDate = dateOf(s);
                    return (
                      <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: s.done ? 13 : 9, height: s.done ? 13 : 9, borderRadius: "50%", flexShrink: 0, background: s.done ? hue : "transparent", border: s.done ? "none" : `1.5px solid ${branch}`, boxShadow: s.done ? `0 0 5px ${hue}66` : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 900, color: dark ? "#0C1320" : "#fff" }}>{s.done ? "✓" : ""}</div>
                        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: s.done ? 600 : 400, color: s.done ? sub : muted, fontFamily: "'DM Sans',sans-serif" }}>{s.label}</span>
                          {s.done && sDate && <span style={{ flexShrink: 0, fontSize: 8.5, color: muted, fontFamily: "'IBM Plex Mono',monospace" }}>{fmtDate(sDate)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginTop: 10, paddingTop: 10, borderTop: dark ? "1px solid rgba(212,175,55,0.10)" : "1px solid rgba(0,0,0,0.06)" }}>
        {[{ label: "Days", value: activeDays }, { label: "Sessions", value: sessionsCount }, { label: "Streak", value: streak }, { label: "Juz", value: completedCount }].map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: accent, fontFamily: "'Playfair Display',serif", lineHeight: 1.1 }}>{s.value}</div>
            <div style={{ fontSize: 8, letterSpacing: ".10em", textTransform: "uppercase", color: muted, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
