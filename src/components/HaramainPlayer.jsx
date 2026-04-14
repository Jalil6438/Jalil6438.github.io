// ── HARAMAIN PLAYER ──
// Two-state: mini bar (collapsed) + full player (expanded).
// Mounts with slide-up animation. Tap mini to expand, tap chevron to collapse.

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
  expanded,
  setExpanded,
  onPlayPause,
  onSeek,
  onSkip,
  onNext,
  onPrev,
  onStop,
  dark,
}) {
  const barRef = useRef(null);
  const [dragX, setDragX] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  function handleClose() {
    setClosing(true);
    setTimeout(() => onStop(), 320);
  }

  if (!meta) return null;

  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  const mosqueColor = meta.mosqueColor || "#D4AF37";
  const imamName = meta.imam?.name || "Imam";
  const surahName = meta.surahName || "";

  const shellStyle = {
    position: "fixed",
    bottom: 88,
    left: 0,
    right: 0,
    zIndex: 200,
    background: dark ? "linear-gradient(180deg,#0E1628 0%,#080E1A 100%)" : "#EADFC8",
    borderTop: `1px solid ${mosqueColor}30`,
    boxShadow: "0 -10px 30px rgba(0,0,0,0.40)",
    transform: (closing || !mounted) ? "translateY(110%)" : "translateY(0)",
    transition: "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease",
    opacity: (closing || !mounted) ? 0 : 1,
  };

  // ── MINI STATE ──
  if (!expanded) {
    return (
      <div onClick={() => setExpanded(true)} style={{ ...shellStyle, padding: "10px 14px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, padding: "2px 4px" }}>
            <div style={{ width: 6, height: 28, borderRadius: 3, background: mosqueColor, boxShadow: `0 0 10px ${mosqueColor}80`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: dark ? "#F3E7C8" : "#3D2E0A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {imamName} · <span style={{ color: mosqueColor }}>Surah {surahName}</span>
              </div>
              <div style={{ fontSize: 9, color: dark ? "rgba(243,231,200,0.45)" : "#6B645A", fontFamily: "'IBM Plex Mono',monospace" }}>
                {formatTime(time)} / {formatTime(duration)}
              </div>
            </div>
          </div>
          <div className="sbtn" onClick={(e) => { e.stopPropagation(); onPlayPause(); }} style={{ fontSize: 24, color: mosqueColor, padding: "0 6px", textShadow: `0 0 12px ${mosqueColor}60`, flexShrink: 0, lineHeight: 1 }}>{isPlaying ? "⏸" : "▶"}</div>
          <div className="sbtn" onClick={(e) => { e.stopPropagation(); handleClose(); }} style={{ fontSize: 18, color: dark ? "rgba(243,231,200,0.45)" : "#6B645A", padding: "0 4px", flexShrink: 0, lineHeight: 1 }}>×</div>
        </div>
        {/* Thin mini progress strip */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: mosqueColor, transition: "width 0.2s linear" }}/>
        </div>
      </div>
    );
  }

  // ── EXPANDED STATE ──
  function handleSeek(clientX) {
    if (!barRef.current || !duration) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const pctSeek = x / rect.width;
    onSeek(pctSeek * duration);
  }

  const stop = (fn) => (e) => { e.stopPropagation(); fn && fn(e); };

  return (
    <div onClick={() => setExpanded(false)} style={{ ...shellStyle, padding: "8px 16px 12px", display: "flex", flexDirection: "column", gap: 8, cursor: "pointer" }}>
      {/* Top: imam name + surah + close */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: dark ? "#F3E7C8" : "#3D2E0A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {imamName} · <span style={{ color: mosqueColor }}>Surah {surahName}</span>
          </div>
          <div style={{ fontSize: 9, color: dark ? "rgba(243,231,200,0.45)" : "#6B645A", fontFamily: "'IBM Plex Mono',monospace" }}>
            {formatTime(time)} / {formatTime(duration)}
          </div>
        </div>
        <div className="sbtn" onClick={stop(handleClose)} style={{ position: "absolute", right: 0, top: 0, fontSize: 18, color: dark ? "rgba(243,231,200,0.45)" : "#6B645A", padding: "0 6px", flexShrink: 0 }}>×</div>
      </div>
      {/* Progress bar */}
      <div ref={barRef} onClick={(e) => { e.stopPropagation(); handleSeek(e.clientX); }} onTouchStart={(e) => { e.stopPropagation(); setDragX(e.touches[0].clientX); handleSeek(e.touches[0].clientX); }} onTouchMove={(e) => { e.stopPropagation(); if (dragX !== null) handleSeek(e.touches[0].clientX); }} onTouchEnd={(e) => { e.stopPropagation(); setDragX(null); }} style={{ height: 14, display: "flex", alignItems: "center", cursor: "pointer", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 4, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)", borderRadius: 999 }}/>
        <div style={{ position: "absolute", left: 0, height: 4, width: `${pct}%`, background: `linear-gradient(90deg,${mosqueColor},${mosqueColor}DD)`, borderRadius: 999, transition: "width 0.2s linear" }}/>
        <div style={{ position: "absolute", left: `calc(${pct}% - 6px)`, width: 12, height: 12, borderRadius: "50%", background: mosqueColor, boxShadow: `0 0 8px ${mosqueColor}`, transition: "left 0.2s linear" }}/>
      </div>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", marginTop: 2, position: "relative" }}>
        <div className="sbtn" onClick={stop(onPrev)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: 4 }}>
          <div style={{ fontSize: 18, color: dark ? "rgba(243,231,200,0.75)" : "#3D2E0A", lineHeight: 1 }}>⏮</div>
          <div style={{ fontSize: 7, letterSpacing: ".08em", fontWeight: 700, color: dark ? "rgba(243,231,200,0.40)" : "#6B645A" }}>previous</div>
        </div>
        <div className="sbtn" onClick={stop(() => onSkip(-10))} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: 4 }}>
          <div style={{ fontSize: 18, color: dark ? "rgba(243,231,200,0.80)" : "#3D2E0A", lineHeight: 1 }}>⏪</div>
          <div style={{ fontSize: 7, letterSpacing: ".08em", fontWeight: 700, color: dark ? "rgba(243,231,200,0.40)" : "#6B645A" }}>10s back</div>
        </div>
        <div className="sbtn" onClick={stop(onPlayPause)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: 4 }}>
          <div style={{ fontSize: 28, color: mosqueColor, lineHeight: 1, textShadow: `0 0 16px ${mosqueColor}60` }}>{isPlaying ? "⏸" : "▶"}</div>
          <div style={{ fontSize: 7, letterSpacing: ".08em", fontWeight: 700, color: mosqueColor, opacity: 0.7 }}>{isPlaying ? "pause" : "play"}</div>
        </div>
        <div className="sbtn" onClick={stop(() => onSkip(10))} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: 4 }}>
          <div style={{ fontSize: 18, color: dark ? "rgba(243,231,200,0.80)" : "#3D2E0A", lineHeight: 1 }}>⏩</div>
          <div style={{ fontSize: 7, letterSpacing: ".08em", fontWeight: 700, color: dark ? "rgba(243,231,200,0.40)" : "#6B645A" }}>10s fwd</div>
        </div>
        <div className="sbtn" onClick={stop(onNext)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: 4 }}>
          <div style={{ fontSize: 18, color: dark ? "rgba(243,231,200,0.75)" : "#3D2E0A", lineHeight: 1 }}>⏭</div>
          <div style={{ fontSize: 7, letterSpacing: ".08em", fontWeight: 700, color: dark ? "rgba(243,231,200,0.40)" : "#6B645A" }}>next</div>
        </div>
      </div>
    </div>
  );
}
