import { useRef, useEffect } from "react";

// MilestonesProgress — the "Rihlat Al-Hifz" journey as a vertical timeline of
// stations rather than an abstract tree. Completed milestones glow gold and are
// joined by an illuminated path; the current goal pulses; future stations sit
// muted and locked. Reads the same progress the rest of the app derives
// (juz / surahs / ayahs / streak) so it always tells the user's real story.

const TOTAL_AYAHS = 6236, TOTAL_PAGES = 604;

function buildMilestones({ memorizedAyahs = 0, completedSurahCount = 0, completedCount = 0, streak = 0, pct = 0 }) {
  const pages = Math.round((memorizedAyahs / TOTAL_AYAHS) * TOTAL_PAGES);
  const pctVal = pct || (memorizedAyahs / TOTAL_AYAHS) * 100;
  // Curated stations along the path to becoming a Hafidh — increasing order so
  // the "current goal" is simply the first one not yet reached.
  return [
    { label: "First Ayah", note: "Your journey begins", done: memorizedAyahs >= 1 },
    { label: "First Page", note: "A full page held", done: pages >= 1 },
    { label: "First Full Day", note: "Every session, one day", done: streak >= 1 },
    { label: "First Surah", note: "A surah complete", done: completedSurahCount >= 1 },
    { label: "Juz 30 Complete", note: "The first juz", done: completedCount >= 1 },
    { label: "Juz 29 Complete", note: "Onward through Juz ʿAmma", done: completedCount >= 2 },
    { label: "100 Pages Memorized", note: "A sixth of the way", done: pages >= 100 },
    { label: "Quarter Qur'an", note: "One quarter held", done: pctVal >= 25 },
    { label: "Half Qur'an", note: "Halfway home", done: pctVal >= 50 },
    { label: "Three Quarters", note: "The summit in sight", done: pctVal >= 75 },
    { label: "Hafidh", note: "The whole Qur'an, by Allah's grace", done: completedCount >= 30 },
  ];
}

export default function MilestonesProgress({ dark, completedCount = 0, completedSurahCount = 0, memorizedAyahs = 0, streak = 0, pct = 0, sessionJuz, goalLabel }) {
  const accent = dark ? "#E6B84A" : "#B45309";
  const gold = dark ? "#F6E27A" : "#D4AF37";
  const text = dark ? "#F3E7C8" : "#2D2A26";
  const sub = dark ? "rgba(243,231,200,0.55)" : "#6B645A";
  const muted = dark ? "rgba(243,231,200,0.30)" : "#8B7355";
  const lineLit = dark ? "rgba(246,226,122,0.6)" : "rgba(180,140,40,0.55)";
  const lineDim = dark ? "rgba(243,231,200,0.10)" : "rgba(45,42,38,0.10)";

  const milestones = buildMilestones({ memorizedAyahs, completedSurahCount, completedCount, streak, pct });
  // Monotonic "reached": reaching a later station implies the earlier ones, so
  // the path never shows a locked/current station above a completed one (the
  // underlying metrics — streak vs ayahs vs juz — don't always complete in order).
  const reached = milestones.map((m) => m.done);
  for (let i = reached.length - 2; i >= 0; i--) if (reached[i + 1]) reached[i] = true;
  const currentIdx = reached.findIndex((r) => !r); // -1 → all complete (Hafidh)
  const pages = Math.round((memorizedAyahs / TOTAL_AYAHS) * TOTAL_PAGES);

  const scrollRef = useRef(null);
  const currentRef = useRef(null);
  useEffect(() => {
    const c = scrollRef.current, r = currentRef.current;
    if (c && r) c.scrollTop = Math.max(0, r.offsetTop - c.clientHeight / 2 + r.clientHeight / 2);
  }, [currentIdx]);

  const stats = [
    { label: "Pages", value: pages },
    { label: "Surahs", value: completedSurahCount },
    { label: "Juz", value: completedCount },
    { label: "Streak", value: streak },
  ];

  return (
    <div style={{ position: "relative", borderRadius: 16, padding: "12px 14px 12px", background: dark ? "linear-gradient(180deg, rgba(15,26,43,0.85) 0%, rgba(10,17,32,0.92) 100%)" : "linear-gradient(180deg, rgba(232,221,200,0.95) 0%, rgba(218,205,180,0.95) 100%)", border: dark ? "1px solid rgba(212,175,55,0.18)" : "1px solid rgba(139,106,16,0.16)", boxShadow: dark ? "0 4px 16px rgba(0,0,0,0.30)" : "0 2px 10px rgba(0,0,0,0.06)", marginBottom: 10 }}>
      <style>{`@keyframes mlPulse{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.9);opacity:0}}@media (prefers-reduced-motion: reduce){.ml-pulse{display:none}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: sub, fontWeight: 700 }}>Memorization Journey</div>
        <div style={{ fontSize: 13, color: accent, marginTop: 3, fontFamily: "'Playfair Display',serif" }}>{sessionJuz ? `Currently on Juz ${sessionJuz}` : "Begin your journey"}</div>
        <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>Goal: {goalLabel || "—"}</div>
      </div>

      {/* Timeline */}
      <div ref={scrollRef} style={{ maxHeight: "min(38vh, 300px)", overflowY: "auto", margin: "0 -2px", paddingRight: 2 }}>
        {milestones.map((m, i) => {
          const done = reached[i];
          const isCurrent = i === currentIdx;
          const topLit = i > 0 && reached[i - 1];
          const botLit = done;
          return (
            <div key={m.label} ref={isCurrent ? currentRef : null} style={{ display: "flex", gap: 12, minHeight: 46 }}>
              {/* indicator column: connecting path + node */}
              <div style={{ position: "relative", width: 26, flexShrink: 0 }}>
                {i > 0 && <div style={{ position: "absolute", left: "50%", top: 0, height: "50%", width: 2, transform: "translateX(-50%)", background: topLit ? lineLit : lineDim }} />}
                {i < milestones.length - 1 && <div style={{ position: "absolute", left: "50%", top: "50%", bottom: 0, width: 2, transform: "translateX(-50%)", background: botLit ? lineLit : lineDim }} />}
                <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {done ? (
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: `radial-gradient(circle at 50% 35%, ${gold}, ${dark ? "#B8860B" : "#A87B12"})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: dark ? "#1A1206" : "#3A2A06", boxShadow: `0 0 10px ${dark ? "rgba(246,226,122,0.45)" : "rgba(180,140,40,0.35)"}` }}>✓</div>
                  ) : isCurrent ? (
                    <div style={{ position: "relative", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div className="ml-pulse" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${gold}`, animation: "mlPulse 2.2s ease-out infinite" }} />
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: gold, boxShadow: `0 0 12px ${gold}, 0 0 22px ${dark ? "rgba(246,226,122,0.5)" : "rgba(180,140,40,0.4)"}` }} />
                    </div>
                  ) : (
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${lineDim}`, background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }} />
                  )}
                </div>
              </div>
              {/* content */}
              <div style={{ flex: 1, minWidth: 0, paddingBottom: 8, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13.5, fontWeight: done || isCurrent ? 700 : 500, color: done ? text : isCurrent ? accent : muted, fontFamily: "'DM Sans',sans-serif" }}>{m.label}</span>
                  {isCurrent && <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: dark ? "#1A1206" : "#3A2A06", background: `linear-gradient(90deg,${gold},${accent})`, padding: "2px 7px", borderRadius: 999 }}>Current Goal</span>}
                </div>
                <div style={{ fontSize: 10, color: done ? sub : muted, marginTop: 1, opacity: isCurrent || done ? 0.9 : 0.6 }}>{m.note}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress summary */}
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
