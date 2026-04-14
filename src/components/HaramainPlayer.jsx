// ── HARAMAIN PLAYER ──
// Two-level audio controller: persistent mini bar + expandable full player.
// Shown when a Haramain imam surah is playing.

import { useState, useRef, useEffect } from "react";

function formatTime(s) {
  if (!s || !isFinite(s)) return "0:00";
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function HaramainPlayer({
  meta,
  isPlaying,
  time,
  duration,
  rate,
  expanded,
  setExpanded,
  onPlayPause,
  onSeek,
  onSkip,
  onSetRate,
  onNext,
  onPrev,
  onStop,
  dark,
}) {
  const barRef = useRef(null);
  const [dragX, setDragX] = useState(null);

  if (!meta) return null;

  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  const mosqueColor = meta.mosqueColor || "#D4AF37";
  const imamName = meta.imam?.name || "Imam";
  const surahName = meta.surahName || "";
  const surahAr = meta.surahAr || "";

  // ── Seek handlers (tap and drag on progress bar) ──
  function handleSeek(clientX) {
    if (!barRef.current || !duration) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const pctSeek = x / rect.width;
    onSeek(pctSeek * duration);
  }

  // Naked-icon player, edge-to-edge, flush with bottom tab bar
  return (
    <div
      style={{
        position: "fixed",
        bottom: 88, // clears bottom tab bar
        left: 0,
        right: 0,
        zIndex: 200,
        background: dark ? "linear-gradient(180deg,#0E1628 0%,#080E1A 100%)" : "#EADFC8",
        borderTop: `1px solid ${mosqueColor}30`,
        boxShadow: "0 -10px 30px rgba(0,0,0,0.40)",
        padding: "10px 16px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Top: imam name + surah (centered) + close */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: dark ? "#F3E7C8" : "#3D2E0A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {imamName} · <span style={{ color: mosqueColor }}>Surah {surahName}</span>
          </div>
          <div style={{ fontSize: 9, color: dark ? "rgba(243,231,200,0.45)" : "#6B645A", fontFamily: "'IBM Plex Mono',monospace" }}>
            {formatTime(time)} / {formatTime(duration)}
          </div>
        </div>
        <div className="sbtn" onClick={onStop} style={{ position: "absolute", right: 0, top: 0, fontSize: 18, color: dark ? "rgba(243,231,200,0.45)" : "#6B645A", padding: "0 6px", flexShrink: 0 }}>×</div>
      </div>
      {/* Progress bar */}
      <div ref={barRef} onClick={(e) => handleSeek(e.clientX)} onTouchStart={(e) => { setDragX(e.touches[0].clientX); handleSeek(e.touches[0].clientX); }} onTouchMove={(e) => { if (dragX !== null) handleSeek(e.touches[0].clientX); }} onTouchEnd={() => setDragX(null)} style={{ height: 14, display: "flex", alignItems: "center", cursor: "pointer", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 4, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)", borderRadius: 999 }}/>
        <div style={{ position: "absolute", left: 0, height: 4, width: `${pct}%`, background: `linear-gradient(90deg,${mosqueColor},${mosqueColor}DD)`, borderRadius: 999, transition: "width 0.2s linear" }}/>
        <div style={{ position: "absolute", left: `calc(${pct}% - 6px)`, width: 12, height: 12, borderRadius: "50%", background: mosqueColor, boxShadow: `0 0 8px ${mosqueColor}`, transition: "left 0.2s linear" }}/>
      </div>
      {/* All controls in one row including speed */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", marginTop: 2, position: "relative" }}>
        <div className="sbtn" onClick={onPrev} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: 4 }}>
          <div style={{ fontSize: 18, color: dark ? "rgba(243,231,200,0.75)" : "#3D2E0A", lineHeight: 1 }}>⏮</div>
          <div style={{ fontSize: 7, letterSpacing: ".08em", fontWeight: 700, color: dark ? "rgba(243,231,200,0.40)" : "#6B645A" }}>previous</div>
        </div>
        <div className="sbtn" onClick={() => onSkip(-10)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: 4 }}>
          <div style={{ fontSize: 18, color: dark ? "rgba(243,231,200,0.80)" : "#3D2E0A", lineHeight: 1 }}>⏪</div>
          <div style={{ fontSize: 7, letterSpacing: ".08em", fontWeight: 700, color: dark ? "rgba(243,231,200,0.40)" : "#6B645A" }}>10s back</div>
        </div>
        <div className="sbtn" onClick={onPlayPause} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: 4 }}>
          <div style={{ fontSize: 28, color: mosqueColor, lineHeight: 1, textShadow: `0 0 16px ${mosqueColor}60` }}>{isPlaying ? "⏸" : "▶"}</div>
          <div style={{ fontSize: 7, letterSpacing: ".08em", fontWeight: 700, color: mosqueColor, opacity: 0.7 }}>{isPlaying ? "pause" : "play"}</div>
        </div>
        <div className="sbtn" onClick={() => onSkip(10)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: 4 }}>
          <div style={{ fontSize: 18, color: dark ? "rgba(243,231,200,0.80)" : "#3D2E0A", lineHeight: 1 }}>⏩</div>
          <div style={{ fontSize: 7, letterSpacing: ".08em", fontWeight: 700, color: dark ? "rgba(243,231,200,0.40)" : "#6B645A" }}>10s fwd</div>
        </div>
        <div className="sbtn" onClick={onNext} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: 4 }}>
          <div style={{ fontSize: 18, color: dark ? "rgba(243,231,200,0.75)" : "#3D2E0A", lineHeight: 1 }}>⏭</div>
          <div style={{ fontSize: 7, letterSpacing: ".08em", fontWeight: 700, color: dark ? "rgba(243,231,200,0.40)" : "#6B645A" }}>next</div>
        </div>
      </div>
    </div>
  );
}
