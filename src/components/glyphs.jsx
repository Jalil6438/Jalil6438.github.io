// Small inline functional glyphs for Al-Hifz — calm gold/ivory line marks that
// replace emoji in functional UI (status, actions). They inherit the surrounding
// text color via `currentColor` so they adopt each context's intent (gold,
// green "done", red "delete"), stay minimal, and read at small sizes. Not
// medallions, not decorative. All are aria-hidden (labels/text carry meaning).
import React from "react";

const base = (size, style) => ({
  width: size, height: size, display: "inline-block",
  verticalAlign: "middle", flexShrink: 0, ...style,
});
const Svg = ({ size, style, children, sw = 1.8, fill = "none" }) => (
  <svg viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" style={base(size, style)} aria-hidden="true">
    {children}
  </svg>
);

export const CheckGlyph = ({ size = 16, style }) => (
  <Svg size={size} style={style} sw={2.4}><path d="M5 12.5l4.2 4.2L19 7" /></Svg>
);
export const WarnGlyph = ({ size = 16, style }) => (
  <Svg size={size} style={style} sw={1.9}>
    <path d="M12 3.4l8.6 15H3.4z" /><path d="M12 9.5v4.2" />
    <circle cx="12" cy="16.6" r="0.5" fill="currentColor" stroke="none" />
  </Svg>
);
export const BellGlyph = ({ size = 16, style }) => (
  <Svg size={size} style={style}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5z" />
    <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
  </Svg>
);
export const StreakGlyph = ({ size = 16, style }) => ( // calm continuity, not fire
  <Svg size={size} style={style}>
    <path d="M4 15l5-5 4 3 7-8" />
    <circle cx="4" cy="15" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="9" cy="10" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="13" cy="13" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="20" cy="5" r="1.3" fill="currentColor" stroke="none" />
  </Svg>
);
export const GoalGlyph = ({ size = 16, style }) => ( // waypoint / marker
  <Svg size={size} style={style}>
    <path d="M12 21c4.5-5 7-8 7-11a7 7 0 0 0-14 0c0 3 2.5 6 7 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </Svg>
);
export const UserGlyph = ({ size = 16, style }) => (
  <Svg size={size} style={style}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
  </Svg>
);
export const TrashGlyph = ({ size = 16, style }) => (
  <Svg size={size} style={style}>
    <path d="M4 6.5h16M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13" />
    <path d="M10 10v6M14 10v6" />
  </Svg>
);
export const LoopGlyph = ({ size = 16, style }) => ( // revision / repeat
  <Svg size={size} style={style}>
    <path d="M4 9a8 8 0 0 1 14-3l2 2" /><path d="M20 5v4h-4" />
    <path d="M20 15a8 8 0 0 1-14 3l-2-2" /><path d="M4 19v-4h4" />
  </Svg>
);
export const LinkGlyph = ({ size = 16, style }) => (
  <Svg size={size} style={style}>
    <path d="M9 15l6-6" /><path d="M8 12l-2 2a3.5 3.5 0 0 0 5 5l2-2" />
    <path d="M16 12l2-2a3.5 3.5 0 0 0-5-5l-2 2" />
  </Svg>
);
export const StreamGlyph = ({ size = 16, style }) => ( // broadcast waves
  <Svg size={size} style={style}>
    <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
    <path d="M8.6 8.6a5 5 0 0 0 0 6.8M15.4 8.6a5 5 0 0 1 0 6.8" />
    <path d="M6 6a9 9 0 0 0 0 12M18 6a9 9 0 0 1 0 12" />
  </Svg>
);
export const BookmarkGlyph = ({ size = 16, style }) => (
  <Svg size={size} style={style}><path d="M6 4h12v17l-6-4-6 4z" /></Svg>
);
export const PinGlyph = ({ size = 16, style }) => ( // pushpin
  <Svg size={size} style={style}>
    <path d="M9 3h6l-1 6 3 3H7l3-3z" /><path d="M12 12v8.5" />
  </Svg>
);
export const EditGlyph = ({ size = 16, style }) => (
  <Svg size={size} style={style}>
    <path d="M14.5 5.5l4 4L8 20H4v-4z" /><path d="M13 7l4 4" />
  </Svg>
);
// Neutral placeholder shown only if a medallion image fails to load (was an
// emoji fallback). Subtle ring — never draws attention, keeps row alignment.
export const FallbackGlyph = ({ size = 20, style }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
    style={{ ...base(size, style), opacity: 0.35 }} aria-hidden="true"><circle cx="12" cy="12" r="8.5" /></svg>
);

// ── Reciter / library glyphs (functional) ──
export const MicGlyph = ({ size = 16, style }) => (
  <Svg size={size} style={style}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M6 11a6 6 0 0 0 12 0" /><line x1="12" y1="17" x2="12" y2="20.5" /><line x1="8.5" y1="20.5" x2="15.5" y2="20.5" />
  </Svg>
);
export const LibraryGlyph = ({ size = 16, style }) => ( // stacked books "view saved"
  <Svg size={size} style={style}>
    <rect x="4" y="4" width="4" height="16" rx="1" /><rect x="9.5" y="4" width="4" height="16" rx="1" />
    <path d="M15.2 5.4l3.9 1 -3 15.2-3.9-1z" /><line x1="4" y1="8.5" x2="8" y2="8.5" /><line x1="9.5" y1="8.5" x2="13.5" y2="8.5" />
  </Svg>
);

export const StarGlyph = ({ size = 16, filled = true, style }) => (
  <Svg size={size} style={style} sw={1.5} fill={filled ? "currentColor" : "none"}>
    <path d="M12 3.6l2.5 5.4 5.9.8-4.3 4.1 1.1 5.9L12 17l-5.2 2.8 1.1-5.9L3.6 9.8l5.9-.8z" />
  </Svg>
);

// ── Media controls (filled) — replace the play / pause / stop / next / square media symbols. ──
const fillSvg = (size, style, children) => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={base(size, style)} aria-hidden="true">{children}</svg>
);
export const PlayGlyph = ({ size = 16, style }) => fillSvg(size, style, <path d="M7.5 5.4v13.2L18 12z" />);
export const PauseGlyph = ({ size = 16, style }) => fillSvg(size, style, <><rect x="6.5" y="5.5" width="3.6" height="13" rx="1" /><rect x="13.9" y="5.5" width="3.6" height="13" rx="1" /></>);
export const StopGlyph = ({ size = 16, style }) => fillSvg(size, style, <rect x="6" y="6" width="12" height="12" rx="2" />);
export const NextGlyph = ({ size = 16, style }) => fillSvg(size, style, <><path d="M6 5.5v13l8.5-6.5z" /><rect x="15.5" y="5.5" width="2.8" height="13" rx="1" /></>);
export const RewindGlyph = ({ size = 16, style }) => fillSvg(size, style, <><path d="M11.5 6.5v11l-6.5-5.5z" /><path d="M19.5 6.5v11l-6.5-5.5z" /></>);
export const ForwardGlyph = ({ size = 16, style }) => fillSvg(size, style, <><path d="M4.5 6.5v11l6.5-5.5z" /><path d="M12.5 6.5v11l6.5-5.5z" /></>);

// "current / in progress" marker (replaces the half-filled circle symbol)
export const HalfDiscGlyph = ({ size = 16, style }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={base(size, style)} aria-hidden="true">
    <circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" stroke="none" />
  </svg>
);

// ── Session (prayer-time) glyphs — calm gold line marks, colored by session. ──
export const FajrGlyph = ({ size = 16, style }) => ( // sunrise
  <Svg size={size} style={style}>
    <line x1="4" y1="18.5" x2="20" y2="18.5" /><path d="M7.5 18.5a4.5 4.5 0 0 1 9 0" />
    <line x1="12" y1="8.4" x2="12" y2="5.8" /><line x1="6.4" y1="10.4" x2="5" y2="9" /><line x1="17.6" y1="10.4" x2="19" y2="9" />
  </Svg>
);
export const DhuhrGlyph = ({ size = 16, style }) => ( // full sun
  <Svg size={size} style={style}>
    <circle cx="12" cy="12" r="3.6" />
    <line x1="12" y1="3.5" x2="12" y2="5.8" /><line x1="12" y1="18.2" x2="12" y2="20.5" />
    <line x1="3.5" y1="12" x2="5.8" y2="12" /><line x1="18.2" y1="12" x2="20.5" y2="12" />
    <line x1="6" y1="6" x2="7.6" y2="7.6" /><line x1="16.4" y1="16.4" x2="18" y2="18" />
    <line x1="18" y1="6" x2="16.4" y2="7.6" /><line x1="7.6" y1="16.4" x2="6" y2="18" />
  </Svg>
);
export const AsrGlyph = ({ size = 16, style }) => ( // sun behind cloud
  <Svg size={size} style={style}>
    <circle cx="9" cy="8.5" r="2.8" />
    <line x1="9" y1="3.4" x2="9" y2="4.9" /><line x1="4.3" y1="8.5" x2="3" y2="8.5" /><line x1="5.6" y1="5.1" x2="4.6" y2="4.1" />
    <path d="M9 18.5h8a3 3 0 0 0 .2-6 4 4 0 0 0-7.5-1.1A3 3 0 0 0 9 18.5z" />
  </Svg>
);
export const MaghribGlyph = ({ size = 16, style }) => ( // sunset + reflection
  <Svg size={size} style={style}>
    <path d="M7.5 15.5a4.5 4.5 0 0 1 9 0" /><line x1="4" y1="15.5" x2="20" y2="15.5" />
    <line x1="7.5" y1="18.5" x2="12.5" y2="18.5" /><line x1="9.5" y1="21" x2="14.5" y2="21" />
  </Svg>
);
export const IshaGlyph = ({ size = 16, style }) => ( // crescent
  <Svg size={size} style={style} fill="currentColor" sw={0}>
    <path d="M20 14.2A8 8 0 1 1 11 4.2a6.3 6.3 0 0 0 9 10z" />
  </Svg>
);
const SESSION_GLYPHS = { fajr: FajrGlyph, dhuhr: DhuhrGlyph, asr: AsrGlyph, maghrib: MaghribGlyph, isha: IshaGlyph };
export const SessionGlyph = ({ id, size = 16, style }) => {
  const G = SESSION_GLYPHS[id] || DhuhrGlyph;
  return <G size={size} style={style} />;
};

// ── Bucket 3: milestone / plan-detail / empty-state glyphs ──
// Calm line marks (currentColor) that replace the remaining decorative emoji in
// milestone toasts, the plan/pace panels, and empty/complete states.
export const BookGlyph = ({ size = 16, style }) => ( // open mushaf / memorization
  <Svg size={size} style={style}>
    <path d="M12 6.4C10 5.1 7.4 4.7 4.5 5.1v12.5c2.9-.4 5.5 0 7.5 1.3 2-1.3 4.6-1.7 7.5-1.3V5.1C16.6 4.7 14 5.1 12 6.4z" />
    <path d="M12 6.4V19" />
  </Svg>
);
export const CalendarGlyph = ({ size = 16, style }) => (
  <Svg size={size} style={style} sw={1.7}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
    <line x1="4" y1="9.5" x2="20" y2="9.5" />
    <line x1="8" y1="3.5" x2="8" y2="7" /><line x1="16" y1="3.5" x2="16" y2="7" />
  </Svg>
);
export const ChartGlyph = ({ size = 16, style }) => ( // progress bars
  <Svg size={size} style={style} sw={1.7}>
    <path d="M4 19.5h16" />
    <rect x="6" y="14" width="3" height="5.5" rx="0.6" />
    <rect x="10.5" y="10" width="3" height="9.5" rx="0.6" />
    <rect x="15" y="6.5" width="3" height="13" rx="0.6" />
  </Svg>
);
export const CrescentGlyph = ({ size = 16, style }) => ( // milestone / rest state
  <Svg size={size} style={style} fill="currentColor" sw={0}>
    <path d="M20 14.2A8 8 0 1 1 11 4.2a6.3 6.3 0 0 0 9 10z" />
  </Svg>
);
export const KaabaGlyph = ({ size = 16, style }) => ( // full Qur'an completion
  <Svg size={size} style={style} sw={1.7}>
    <rect x="5" y="6.5" width="14" height="13" rx="1" />
    <line x1="5" y1="10.5" x2="19" y2="10.5" strokeWidth={2.2} />
    <path d="M10.5 19.5v-3.4h3v3.4" />
  </Svg>
);
export const SealGlyph = ({ size = 16, style }) => ( // 8-point rosette — celebration
  <Svg size={size} style={style} sw={1.5}>
    <path d="M12 2.6 20 12 12 21.4 4 12z" />
    <rect x="5.8" y="5.8" width="12.4" height="12.4" />
    <circle cx="12" cy="12" r="2" />
  </Svg>
);
// "not yet / future" marker — pairs with HalfDiscGlyph (current) + CheckGlyph (done)
export const PendingGlyph = ({ size = 16, style }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    style={base(size, style)} aria-hidden="true"><circle cx="12" cy="12" r="7.5" strokeDasharray="2.6 2.6" /></svg>
);
// Graded 1–5 intensity meter for the plan pace picker (5 = intense … 1 = gentle).
export const IntensityGlyph = ({ level = 3, size = 16, style }) => (
  <svg viewBox="0 0 24 24" style={base(size, style)} aria-hidden="true">
    {[0, 1, 2, 3, 4].map((i) => {
      const h = 5 + i * 3.4;
      return <rect key={i} x={2.2 + i * 4.4} y={20 - h} width="2.8" height={h} rx="1"
        fill="currentColor" opacity={i < level ? 1 : 0.22} />;
    })}
  </svg>
);
