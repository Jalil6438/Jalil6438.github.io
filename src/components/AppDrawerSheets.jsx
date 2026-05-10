import React, { useEffect, useState } from "react";

// AppDrawerSheets — full-screen sheets that open from the side drawer.
// Each `id` maps to a labeled panel; the parent owns which one is open
// via a `view` string (null = closed). Lightweight scaffolding so each
// drawer entry has a real destination instead of a TODO.

function Sheet({ open, onClose, dark, title, subtitle, children }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(2px)", zIndex: 410,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520,
          maxHeight: "92vh",
          borderRadius: "20px 20px 0 0",
          padding: "16px 18px 22px",
          paddingBottom: "calc(22px + env(safe-area-inset-bottom,0px))",
          background: dark ? "linear-gradient(180deg,#0E1628 0%,#080E1A 100%)" : "#EADFC8",
          border: dark ? "1px solid rgba(217,177,95,0.25)" : "1px solid rgba(139,106,16,0.25)",
          boxShadow: "0 -12px 40px rgba(0,0,0,0.55)",
          animation: "slideUp .25s ease-out",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.20)" }}/>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: dark ? "#F3E7C8" : "#2D2A26", fontFamily: "'Playfair Display', serif" }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 11, color: dark ? "rgba(243,231,200,0.55)" : "#6B645A", marginTop: 3 }}>
                {subtitle}
              </div>
            )}
          </div>
          <div className="sbtn" onClick={onClose} style={{ fontSize: 22, color: dark ? "rgba(243,231,200,0.40)" : "rgba(0,0,0,0.40)", lineHeight: 1, padding: "0 4px" }}>×</div>
        </div>
        {children}
        <style>{`@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      </div>
    </div>
  );
}

// RemindersSheet — per-session toggle + time picker. Settings persist to
// localStorage "rihlat-reminders". Background firing requires the user to
// install the app to home screen (PWA), which is honest in the copy.
function RemindersSheet({ open, onClose, dark }) {
  const DEFAULTS = [
    { id: "fajr",    label: "Fajr",    note: "Memorize today's page",         time: "06:00" },
    { id: "dhuhr",   label: "Dhuhr",   note: "Review last 5 days",            time: "13:00" },
    { id: "asr",     label: "Asr",     note: "Revise older juz",              time: "16:30" },
    { id: "maghrib", label: "Maghrib", note: "Listen to today's page",        time: "18:30" },
    { id: "isha",    label: "Isha",    note: "Final review before sleep",     time: "21:00" },
  ];

  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("rihlat-reminders") || "null");
      if (saved && saved.sessions) return saved;
    } catch {}
    const sessions = {};
    DEFAULTS.forEach(d => { sessions[d.id] = { enabled: false, time: d.time }; });
    return { sessions };
  });
  const [permission, setPermission] = useState(() =>
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    try { localStorage.setItem("rihlat-reminders", JSON.stringify(prefs)); } catch {}
  }, [prefs]);

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch {}
  };

  const toggleSession = (id) => {
    setPrefs(p => ({ ...p, sessions: { ...p.sessions, [id]: { ...p.sessions[id], enabled: !p.sessions[id].enabled } } }));
  };
  const setTime = (id, time) => {
    setPrefs(p => ({ ...p, sessions: { ...p.sessions, [id]: { ...p.sessions[id], time } } }));
  };

  const sendTest = () => {
    if (permission !== "granted") return;
    try { new Notification("Rihlat al-Hifz", { body: "Notifications are working — bismillah." }); } catch {}
  };

  const enabledCount = DEFAULTS.filter(d => prefs.sessions[d.id]?.enabled).length;

  return (
    <Sheet open={open} onClose={onClose} dark={dark} title="Reminders" subtitle={`${enabledCount} of 5 enabled`}>
      {/* Permission banner */}
      <div style={{
        marginBottom: 14, padding: "10px 12px", borderRadius: 12,
        background: permission === "granted"
          ? (dark ? "rgba(56,214,126,0.08)" : "rgba(20,140,60,0.06)")
          : (dark ? "rgba(212,175,55,0.06)" : "rgba(180,140,40,0.05)"),
        border: `1px solid ${permission === "granted"
          ? (dark ? "rgba(56,214,126,0.30)" : "rgba(20,140,60,0.25)")
          : (dark ? "rgba(212,175,55,0.20)" : "rgba(139,106,16,0.18)")}`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ fontSize: 18 }}>{permission === "granted" ? "✓" : "🔔"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: dark ? "#F3E7C8" : "#2D2A26" }}>
            {permission === "granted" ? "Notifications enabled" : permission === "denied" ? "Notifications blocked" : permission === "unsupported" ? "Notifications not supported" : "Allow notifications"}
          </div>
          <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.55)" : "#6B645A", marginTop: 2, lineHeight: 1.4 }}>
            {permission === "granted" ? "Reminders will fire while the app is open." :
             permission === "denied" ? "Re-enable in your browser site settings." :
             permission === "unsupported" ? "This browser doesn't expose notifications." :
             "Browser will ask for permission."}
          </div>
        </div>
        {permission !== "granted" && permission !== "denied" && permission !== "unsupported" && (
          <div className="sbtn" onClick={requestPermission} style={{
            padding: "7px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: dark ? "rgba(212,175,55,0.18)" : "rgba(180,140,40,0.15)",
            color: dark ? "#F0C040" : "#6B4F00",
            border: `1px solid ${dark ? "rgba(212,175,55,0.40)" : "rgba(139,106,16,0.30)"}`,
          }}>Allow</div>
        )}
        {permission === "granted" && (
          <div className="sbtn" onClick={sendTest} style={{
            padding: "7px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: dark ? "rgba(56,214,126,0.10)" : "rgba(20,140,60,0.08)",
            color: dark ? "#34D399" : "#0E6B30",
            border: `1px solid ${dark ? "rgba(56,214,126,0.30)" : "rgba(20,140,60,0.25)"}`,
          }}>Test</div>
        )}
      </div>

      {/* Per-session rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {DEFAULTS.map(d => {
          const s = prefs.sessions[d.id] || { enabled: false, time: d.time };
          return (
            <div key={d.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 12,
              background: s.enabled
                ? (dark ? "rgba(212,175,55,0.05)" : "rgba(180,140,40,0.05)")
                : (dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"),
              border: `1px solid ${s.enabled
                ? (dark ? "rgba(212,175,55,0.20)" : "rgba(139,106,16,0.18)")
                : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)")}`,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: dark ? "#F3E7C8" : "#2D2A26" }}>{d.label}</div>
                <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.50)" : "#6B645A", marginTop: 1 }}>{d.note}</div>
              </div>
              <input
                type="time"
                value={s.time}
                onChange={e => setTime(d.id, e.target.value)}
                disabled={!s.enabled}
                style={{
                  padding: "6px 8px", borderRadius: 8,
                  background: dark ? "rgba(0,0,0,0.30)" : "rgba(255,255,255,0.60)",
                  color: s.enabled ? (dark ? "#F0C040" : "#6B4F00") : (dark ? "rgba(243,231,200,0.30)" : "#9A8A6A"),
                  border: `1px solid ${dark ? "rgba(212,175,55,0.20)" : "rgba(139,106,16,0.20)"}`,
                  fontSize: 12, fontWeight: 600,
                  fontFamily: "inherit", colorScheme: dark ? "dark" : "light",
                }}
              />
              {/* Toggle */}
              <div className="sbtn" onClick={() => toggleSession(d.id)} style={{
                width: 40, height: 22, borderRadius: 999, position: "relative",
                background: s.enabled
                  ? (dark ? "linear-gradient(90deg,#D4AF37,#F6E27A)" : "linear-gradient(90deg,#B45309,#E0BD78)")
                  : (dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.15)"),
                cursor: "pointer", transition: "background .2s",
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: "#fff",
                  position: "absolute", top: 2, left: s.enabled ? 20 : 2,
                  transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                }}/>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.40)" : "#8B7355", textAlign: "center", marginTop: 16, lineHeight: 1.6, fontStyle: "italic" }}>
        Reminders fire only while the app is open in your browser. For background nudges, install the app to your home screen.
      </div>
    </Sheet>
  );
}

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

const SESSION_DEFS = [
  { id: "fajr",    label: "Fajr",    color: "#60A5FA" },
  { id: "dhuhr",   label: "Dhuhr",   color: "#F59E0B" },
  { id: "asr",     label: "Asr",     color: "#FB923C" },
  { id: "maghrib", label: "Maghrib", color: "#A78BFA" },
  { id: "isha",    label: "Isha",    color: "#34D399" },
];

export default function AppDrawerSheets({
  view, onClose, dark,
  completedCount, streak, longestStreak, sessionJuz, goalLabel,
  memorizedAyahs = 0, totalAyahs = 6236,
  pct = 0,
  juzProgress = 0,
  checkHistory = {},
  onExport,
}) {
  const close = () => onClose && onClose();

  // Achievements is now a full Rihlah sub-tab (AchievementsView) — drawer
  // routes there directly. No sheet here.

  // Stats & Progress
  if (view === "stats") {
    // Use the same pct as the profile-header progress bar so they match.
    const pctVal = Math.min(100, Math.max(0, Math.round(pct || 0)));
    const ringR = 56;
    const ringC = 2 * Math.PI * ringR;
    const ringFilled = ringC * (pctVal / 100);
    // Match the profile-header progress bar gradient: green → gold.
    const ringTrack = dark ? "rgba(212,175,55,0.10)" : "rgba(139,106,16,0.12)";
    const ringHigh = "#F0C040"; // gold (end of header bar)
    const ringMid = "#156A30";  // deep green (start of header bar)
    return (
      <Sheet open onClose={close} dark={dark} title="Stats & Progress" subtitle="Your numbers, in detail">
        {/* Progress ring */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "8px 0 14px" }}>
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
      </Sheet>
    );
  }

  // Reminders
  if (view === "reminders") {
    return <RemindersSheet open onClose={close} dark={dark}/>;
  }

  // The Method
  if (view === "method") {
    return (
      <Sheet open onClose={close} dark={dark}
        title="Shaykh Al-Qasim's Method"
        subtitle="The framework this app is built on"
      >
        <div style={{ fontSize: 12.5, color: dark ? "rgba(243,231,200,0.85)" : "#2D2A26", lineHeight: 1.85, padding: "4px 2px" }}>
          <p style={{ marginBottom: 12 }}><strong style={{ color: dark ? "#E6B84A" : "#6B4F00" }}>One mushaf page per day.</strong> No more, no less. Quality over quantity.</p>
          <p style={{ marginBottom: 12 }}><strong style={{ color: dark ? "#E6B84A" : "#6B4F00" }}>Reverse-order memorization.</strong> Start at An-Nās (114) and work back toward Al-Baqarah. Short, familiar surahs first.</p>
          <p style={{ marginBottom: 12 }}><strong style={{ color: dark ? "#E6B84A" : "#6B4F00" }}>20× per ayah.</strong> Repeat each ayah twenty times before moving on.</p>
          <p style={{ marginBottom: 12 }}><strong style={{ color: dark ? "#E6B84A" : "#6B4F00" }}>Connection phase (الربط).</strong> Once a pair is at 20×, recite both together 10×. Once a surah's full set of pairs is done, recite the entire surah together 10× — the closer.</p>
          <p style={{ marginBottom: 12 }}><strong style={{ color: dark ? "#E6B84A" : "#6B4F00" }}>5 sessions a day.</strong> Fajr (memorize), Dhuhr (review last 5 days), Asr (revise older juz), Maghrib (listen to today's page), Isha (final review before sleep).</p>
          <p>Consistency beats speed. The 30-juz target is years away — what matters is showing up tomorrow.</p>
        </div>
      </Sheet>
    );
  }

  // Help
  if (view === "help") {
    return (
      <Sheet open onClose={close} dark={dark} title="Help" subtitle="Common questions">
        <div style={{ fontSize: 12.5, color: dark ? "rgba(243,231,200,0.80)" : "#2D2A26", lineHeight: 1.8, padding: "4px 2px" }}>
          <p style={{ marginBottom: 10 }}><strong>Why is my Dhuhr review so big?</strong> It's the last 5 mushaf pages of memorized content. Once your daily Fajr advances, the window scrolls forward.</p>
          <p style={{ marginBottom: 10 }}><strong>Can I memorize at my own pace?</strong> Yes — Plan → adjust your timeline. Custom pace switches Fajr to your chosen ayah count, but Dhuhr stays at 5 pages.</p>
          <p style={{ marginBottom: 10 }}><strong>What if I miss a day?</strong> Your streak resets but your memorized juz are kept. Pick up the next morning at the same Fajr page.</p>
          <p><strong>Where's my data?</strong> Stored locally in your browser. Use Export Data (in this menu) to save a backup.</p>
        </div>
      </Sheet>
    );
  }

  // About
  if (view === "about") {
    return (
      <Sheet open onClose={close} dark={dark} title="About Rihlat al-Hifz" subtitle="Your journey to memorization">
        <div style={{ fontSize: 12.5, color: dark ? "rgba(243,231,200,0.85)" : "#2D2A26", lineHeight: 1.85, padding: "4px 2px" }}>
          <p style={{ marginBottom: 12 }}>
            <strong style={{ color: dark ? "#E6B84A" : "#6B4F00" }}>Rihlat al-Hifz</strong> (رحلة الحفظ — "the journey of memorization") is a tracker built around the method taught by <strong>Shaykh Abdul Muhsin Al-Qasim</strong>, imam of Masjid an-Nabawi.
          </p>
          <p style={{ marginBottom: 12 }}>
            One mushaf page a day, in reverse order from An-Nās to Al-Baqarah, with the discipline of 20× repetition and the connection phase that locks each surah into long-term memory.
          </p>
          <p style={{ marginBottom: 12 }}>
            Built for the Muslim who wants to become a hafiz over years — not weeks. Quality over quantity. Consistency over intensity.
          </p>
          <div style={{ marginTop: 18, padding: "12px 14px", borderRadius: 12, background: dark ? "rgba(212,175,55,0.05)" : "rgba(180,140,40,0.05)", border: `1px solid ${dark ? "rgba(212,175,55,0.15)" : "rgba(139,106,16,0.15)"}` }}>
            <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 700, color: dark ? "#E6B84A" : "#6B4F00", marginBottom: 6 }}>Version</div>
            <div style={{ fontSize: 12, color: dark ? "rgba(243,231,200,0.65)" : "#5A4A2A" }}>v1.0 · Built with intention by Mark</div>
          </div>
          <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.35)" : "#8B7355", textAlign: "center", marginTop: 14, fontStyle: "italic" }}>
            "And We have indeed made the Qur'an easy to remember, so is there anyone who will remember?" <br/>— Surah Al-Qamar, 54:17
          </div>
        </div>
      </Sheet>
    );
  }

  // Export
  if (view === "export") {
    return (
      <Sheet open onClose={close} dark={dark} title="Export Data" subtitle="Download a backup of your progress">
        <div style={{ fontSize: 12, color: dark ? "rgba(243,231,200,0.70)" : "#3D2E0A", lineHeight: 1.7, marginBottom: 14 }}>
          Saves your completed ayahs, streaks, daily score history, settings, and reflections as a JSON file. Keep it somewhere safe — you can re-import it later.
        </div>
        <div className="sbtn" onClick={() => { onExport && onExport(); close(); }}
          style={{
            width: "100%", padding: "13px 16px", borderRadius: 14, textAlign: "center",
            fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
            background: "linear-gradient(180deg,#E0BD78 0%,#CEAA60 100%)",
            color: "#0A1020",
            cursor: "pointer",
          }}
        >
          Download Backup (.json)
        </div>
      </Sheet>
    );
  }

  return null;
}
