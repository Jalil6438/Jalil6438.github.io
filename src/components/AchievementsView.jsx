import React from "react";

// AchievementsView — full-page badge wall, rendered as a Rihlah sub-tab
// (rihlahTab === "achievements"). Replaces the cramped drawer sheet so
// celebratory content has real estate for the Hafiz halo, earn states,
// and future per-badge details (date earned, du'a fired, ayah linked).

const STREAK_TIERS = [
  { n: 7,   label: "7 Days",      img: "/badge-streak-7.png" },
  { n: 14,  label: "14 Days",     img: "/badge-streak-14.png" },
  { n: 21,  label: "21 Days",     img: "/badge-streak-21.png" },
  { n: 30,  label: "30 Days",     img: "/badge-streak-30.png" },
  { n: 40,  label: "Habituated",  img: "/badge-habituated.png" },
  { n: 60,  label: "Devotion",    img: "/badge-devotion-60.png" },
  { n: 100, label: "Mastery",     img: "/badge-mastery-90.png" },
];
const JUZ_TIERS = [
  { n: 1,  label: "First Juz",   img: "/badge-juz-1.png" },
  { n: 5,  label: "5 Juz",       img: "/badge-juz-5.png" },
  { n: 10, label: "10 Juz",      img: "/badge-juz-10.png" },
  { n: 15, label: "Half Quran",  img: "/badge-juz-15.png" },
  { n: 20, label: "20 Juz",      img: "/badge-juz-20.png" },
  { n: 25, label: "25 Juz",      img: "/badge-juz-25.png" },
  { n: 30, label: "Hafiz",       img: "/badge-hafiz.png" },
];

function Badge({ tier, current, isHafiz, dark }) {
  const earned = current >= tier.n;
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "14px 8px", borderRadius: 14,
      background: earned
        ? (isHafiz
            ? (dark ? "linear-gradient(180deg,rgba(212,175,55,0.22),rgba(212,175,55,0.05))" : "linear-gradient(180deg,rgba(212,175,55,0.26),rgba(212,175,55,0.05))")
            : (dark ? "rgba(212,175,55,0.07)" : "rgba(180,140,40,0.06)"))
        : (dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"),
      border: earned
        ? `1px solid ${isHafiz ? "rgba(212,175,55,0.60)" : "rgba(212,175,55,0.30)"}`
        : `1px dashed ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)"}`,
      opacity: earned ? 1 : 0.45,
      boxShadow: earned
        ? (isHafiz
            ? "0 0 32px rgba(212,175,55,0.45), 0 0 14px rgba(246,226,122,0.25)"
            : "0 0 16px rgba(212,175,55,0.18), 0 0 6px rgba(246,226,122,0.10)")
        : "none",
      transition: "all .2s",
    }}>
      <img src={tier.img} alt={tier.label} style={{
        width: 72, height: 72, objectFit: "contain",
        filter: earned ? (isHafiz ? "drop-shadow(0 0 8px rgba(246,226,122,0.45))" : "drop-shadow(0 0 4px rgba(212,175,55,0.30))") : "grayscale(100%) brightness(0.7)",
        marginBottom: 8,
      }}/>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: ".04em",
        color: earned ? (dark ? "#F0C040" : "#6B4F00") : (dark ? "rgba(243,231,200,0.40)" : "#8B7355"),
        textAlign: "center", lineHeight: 1.2,
      }}>
        {tier.label}
      </div>
      {!earned && (
        <div style={{ fontSize: 9.5, color: dark ? "rgba(243,231,200,0.30)" : "#9A8A6A", marginTop: 3 }}>
          {tier.n - current} to go
        </div>
      )}
    </div>
  );
}

export default function AchievementsView({ dark, completedCount = 0, streak = 0, longestStreak = 0, onBack }) {
  const peakStreak = Math.max(streak || 0, longestStreak || 0);
  const earnedStreakCount = STREAK_TIERS.filter(t => peakStreak >= t.n).length;
  const earnedJuzCount = JUZ_TIERS.filter(t => completedCount >= t.n).length;
  const totalCount = STREAK_TIERS.length + JUZ_TIERS.length;
  const earnedCount = earnedStreakCount + earnedJuzCount;

  return (
    <div style={{
      flex: 1, overflowY: "auto",
      background: dark ? "linear-gradient(180deg,#0B1220,#0E1628)" : "#F3E9D2",
      padding: "16px 16px 24px",
    }} className="fi">
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div className="sbtn" onClick={onBack} style={{
          padding: "6px 12px",
          background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
          border: dark ? "1px solid rgba(217,177,95,0.12)" : "1px solid rgba(139,106,16,0.15)",
          borderRadius: 8, fontSize: 11,
          color: dark ? "rgba(243,231,200,0.50)" : "#6B645A",
        }}>← Back</div>
      </div>

      {/* Hero header */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 9, letterSpacing: ".22em", textTransform: "uppercase", fontWeight: 700, color: dark ? "rgba(217,177,95,0.65)" : "rgba(140,100,20,0.65)", marginBottom: 8 }}>
          Achievements
        </div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, color: dark ? "#F3E7C8" : "#2D2A26", fontWeight: 700, lineHeight: 1.15, marginBottom: 8 }}>
          {earnedCount} of {totalCount} earned
        </div>
        <div style={{ fontSize: 12, color: dark ? "rgba(243,231,200,0.55)" : "#6B645A", lineHeight: 1.6, maxWidth: 320, margin: "0 auto" }}>
          Each milestone is unlocked when you cross its threshold. May Allah preserve you by His Book.
        </div>
      </div>

      {/* Streak section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", fontWeight: 700, color: dark ? "rgba(217,177,95,0.75)" : "rgba(140,100,20,0.75)" }}>
            Streak Tiers
          </div>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${dark ? "rgba(217,177,95,0.20)" : "rgba(139,106,16,0.18)"} 0%,transparent 100%)` }}/>
          <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.45)" : "#8B7355", fontWeight: 600 }}>
            {earnedStreakCount}/{STREAK_TIERS.length}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {STREAK_TIERS.map(t => <Badge key={t.n} tier={t} current={peakStreak} dark={dark}/>)}
        </div>
      </div>

      {/* Juz section */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", fontWeight: 700, color: dark ? "rgba(217,177,95,0.75)" : "rgba(140,100,20,0.75)" }}>
            Juz Milestones
          </div>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${dark ? "rgba(217,177,95,0.20)" : "rgba(139,106,16,0.18)"} 0%,transparent 100%)` }}/>
          <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.45)" : "#8B7355", fontWeight: 600 }}>
            {earnedJuzCount}/{JUZ_TIERS.length}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {JUZ_TIERS.map(t => <Badge key={t.n} tier={t} current={completedCount} isHafiz={t.n === 30} dark={dark}/>)}
        </div>
      </div>

      <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.35)" : "#8B7355", textAlign: "center", marginTop: 12, lineHeight: 1.6, fontStyle: "italic" }}>
        Earn dates and the du'a that fired with each will appear here as you cross thresholds.
      </div>
    </div>
  );
}
