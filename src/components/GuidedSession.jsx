/* eslint-disable react-hooks/set-state-in-effect -- the overlay advances its step
   by observing the user's real action on the underlying My Hifz UI (external
   state); each branch is guarded by `step` so it can never loop. */
import { useEffect, useState } from "react";

// ── Guided first-session tutorial ────────────────────────────────────────────
// A companion that guides a brand-new user through their first hifz session on
// the REAL My Hifz UI. Each instructional step advances only when the user
// performs the real action — no "Next" buttons. Guidance is a manga-style speech
// bubble that sits BESIDE the highlighted control and points at it with a tail;
// the control is the hero (glow + pulse) and is never covered. Connection and
// closer are two tappable demo cards. The parent runs this with repTarget=1 and
// tutorialMode on, so nothing is committed as real memorization progress.

const PHRASE = { 1: "Read to Teacher", 2: "Tap Study", 3: "First Ayah", 4: "Recite → Tap", 5: "Next Ayah", 6: "Connect Ayahs", 7: "Recite Together" };
const TUT = { 1: "guided-mushaf", 2: "guided-study", 3: "guided-ayah", 4: "guided-rep", 5: "guided-ayah-2" };

const CREAM = "#FBF4E2";
const INK = "#2A2418";

// manga speech bubble: rounded cream body + an outlined pointed tail toward the target
function Bubble({ left, top, phrase, tailDir, tailOffset }) {
  const down = tailDir === "down";
  return (
    <div style={{ position: "absolute", left, top, transform: "translateX(-50%)", pointerEvents: "none" }}>
      <div style={{ position: "relative", background: CREAM, color: INK, padding: "11px 20px", borderRadius: 24, fontWeight: 800, fontSize: 17, whiteSpace: "nowrap", boxShadow: "0 12px 32px rgba(0,0,0,0.55)", border: `2.5px solid ${INK}`, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.15 }}>
        {phrase}
        {/* tail outline (ink) then fill (cream) → a comic-outlined pointer */}
        <div style={{ position: "absolute", left: `calc(50% + ${tailOffset}px)`, [down ? "top" : "bottom"]: "calc(100% - 2px)", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "13px solid transparent", borderRight: "13px solid transparent", [down ? "borderTop" : "borderBottom"]: `19px solid ${INK}` }} />
        <div style={{ position: "absolute", left: `calc(50% + ${tailOffset}px)`, [down ? "top" : "bottom"]: "calc(100% - 5px)", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", [down ? "borderTop" : "borderBottom"]: `15px solid ${CREAM}` }} />
      </div>
    </div>
  );
}

// connection / closer demo card (the hero for steps 6 & 7) — user taps once
function DemoCard({ dark, kind, a1, a2, onTap }) {
  const conn = kind === "connection";
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", pointerEvents: "auto" }} />
      <div className="sbtn" onClick={onTap} style={{ position: "absolute", left: "50%", top: "46%", transform: "translate(-50%,-50%)", width: "min(320px,86vw)", pointerEvents: "auto", background: dark ? "linear-gradient(180deg,#10203A,#0A1424)" : "#EADFC8", border: "1px solid rgba(246,226,122,0.5)", borderRadius: 18, padding: "18px 18px 20px", textAlign: "center", animation: "guidedCardPulse 1.5s ease-in-out infinite" }}>
        <div style={{ fontSize: 9, letterSpacing: ".2em", textTransform: "uppercase", fontWeight: 800, color: "#F6E27A", marginBottom: 12 }}>{conn ? "Connection" : "Closer"}</div>
        <div style={{ fontFamily: "'UthmanicHafs','Amiri Quran','Amiri',serif", fontSize: 18, color: dark ? "rgba(243,231,200,0.85)" : "#2D2A26", marginBottom: 4 }}>{conn ? `${a1}  ﴿◇﴾  ${a2}` : "◈ ◈ ◈"}</div>
        <div style={{ fontSize: 12, color: dark ? "rgba(243,231,200,0.5)" : "#6B645A", marginBottom: 16 }}>{conn ? "Recite both ayahs together" : "Recite the section together"}</div>
        <div style={{ padding: "13px", borderRadius: 12, background: "linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)", color: "#060A07", fontWeight: 800, fontSize: 14 }}>Recited 0/1 · Tap after reciting</div>
      </div>
    </>
  );
}

function Completion({ dark, onComplete }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.68)", pointerEvents: "auto" }} />
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(340px,88vw)", pointerEvents: "auto", background: dark ? "linear-gradient(180deg,#10203A,#0A1424)" : "#EADFC8", border: "1px solid rgba(246,226,122,0.4)", borderRadius: 20, padding: "26px 22px", boxShadow: "0 22px 60px rgba(0,0,0,0.6)", textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 6 }}>🎓</div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: dark ? "#F6E27A" : "#6B4F00", marginBottom: 14 }}>Guided Session Complete</div>
        <div style={{ textAlign: "left", display: "inline-block", fontSize: 14, lineHeight: 2, color: dark ? "rgba(243,231,200,0.88)" : "#2D2A26", marginBottom: 20 }}>
          You learned:<br />✓ Study<br />✓ Repetition<br />✓ Connection<br />✓ Closer
        </div>
        <div className="sbtn" onClick={onComplete} style={{ padding: "13px", borderRadius: 14, textAlign: "center", fontWeight: 800, fontSize: 14, background: "linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)", color: "#060A07", boxShadow: "0 10px 24px rgba(212,175,55,0.25)" }}>Start Session</div>
      </div>
    </>
  );
}

const nextKey = (vk) => { const [s, a] = (vk || "114:1").split(":"); return `${s}:${Number(a) + 1}`; };

export default function GuidedSession({ step, setStep, dark, hifzViewMode, openAyah, setOpenAyah, repCounts, onComplete }) {
  const [rect, setRect] = useState(null);
  const repped = Object.keys(repCounts || {}).filter((k) => (repCounts[k] || 0) >= 1);
  const reppedCount = repped.length;

  // ── action-based auto-advance: each step advances only on the real action ──
  useEffect(() => {
    let next = null;
    if (step === 2 && hifzViewMode === "interactive") next = 3;
    else if (step === 3 && openAyah) next = 4;
    else if (step === 4 && reppedCount >= 1) next = 5;
    else if (step === 5 && openAyah && !repped.includes(openAyah)) next = 6;
    if (next != null) {
      if (next === 6 && setOpenAyah) setOpenAyah(null); // close the ayah-2 popup so the connection card is clean
      setStep(next);
    }
  }, [step, hifzViewMode, openAyah, reppedCount, repped, setStep, setOpenAyah]);

  // ── live position of the single highlighted control (steps 1–5) ──
  const tut = TUT[step];
  useEffect(() => {
    if (step >= 6) { setRect(null); return; }
    let raf;
    const tick = () => { const el = tut ? document.querySelector(`[data-tut="${tut}"]`) : null; setRect(el ? el.getBoundingClientRect() : null); raf = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [step, tut]);

  // ── resolve the target box for the bubble (steps 1–5 → the live rect; 6–7 →
  //    the centered demo card) and place the bubble BESIDE it, never on it ──
  let target = null;
  if (step <= 5 && rect) target = { cx: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom };
  if (step === 6 || step === 7) { const ct = window.innerHeight * 0.46; target = { cx: window.innerWidth / 2, top: ct - 96, bottom: ct + 96 }; }

  let bub = null;
  if (target) {
    // step 1 + steps 6/7 always sit ABOVE the target so the page / card stays clear;
    // otherwise prefer below for top-half targets, above for bottom-half ones.
    const below = step !== 1 && step < 6 && target.top < window.innerHeight * 0.5;
    const top = below ? target.bottom + 18 : Math.max(108, target.top - 62);
    const left = Math.min(Math.max(target.cx, 112), window.innerWidth - 112);
    bub = { left, top, tailDir: below ? "up" : "down", tailOffset: Math.max(-58, Math.min(58, target.cx - left)) };
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 4000, pointerEvents: "none" }}>
      <style>{`@keyframes guidedPulse{0%,100%{box-shadow:0 0 0 9999px rgba(0,0,0,0.5),0 0 0 4px rgba(246,226,122,0.7),0 0 22px 6px rgba(246,226,122,0.55)}50%{box-shadow:0 0 0 9999px rgba(0,0,0,0.5),0 0 0 7px rgba(246,226,122,0.92),0 0 44px 12px rgba(246,226,122,0.95)}}@keyframes guidedCardPulse{0%,100%{box-shadow:0 0 26px 5px rgba(246,226,122,0.45),0 20px 50px rgba(0,0,0,0.6)}50%{box-shadow:0 0 48px 12px rgba(246,226,122,0.8),0 20px 50px rgba(0,0,0,0.6)}}`}</style>

      {/* STEP 1 — Mushaf is the hero: very light dim, page fully readable, tap to continue */}
      {step === 1 && (
        <div onClick={() => setStep(2)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.12)", pointerEvents: "auto" }} />
      )}

      {/* STEPS 2–5 — spotlight ONLY the current control (glow + pulse, dim-hole); click-through */}
      {step >= 2 && step <= 5 && (
        rect ? (
          <div style={{ position: "absolute", left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16, borderRadius: 14, animation: "guidedPulse 1.5s ease-in-out infinite", pointerEvents: "none" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
        )
      )}

      {/* STEPS 6–7 — connection / closer demo card is the hero */}
      {(step === 6 || step === 7) && (
        <DemoCard dark={dark} kind={step === 6 ? "connection" : "closer"} a1={repped[0] || "114:1"} a2={nextKey(repped[0])} onTap={() => setStep(step + 1)} />
      )}

      {/* the guiding bubble — beside the hero, pointing at it (steps 1–7) */}
      {step <= 7 && bub && <Bubble left={bub.left} top={bub.top} phrase={PHRASE[step]} tailDir={bub.tailDir} tailOffset={bub.tailOffset} />}

      {/* STEP 8 — completion */}
      {step === 8 && <Completion dark={dark} onComplete={onComplete} />}
    </div>
  );
}
