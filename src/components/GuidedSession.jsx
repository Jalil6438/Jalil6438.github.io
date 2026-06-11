/* eslint-disable react-hooks/set-state-in-effect -- the overlay advances its step
   by observing the user's real action on the underlying My Hifz UI (external
   state); each branch is guarded by `step` so it can never loop. */
import { useEffect, useState } from "react";

// ── Guided first-session tutorial ────────────────────────────────────────────
// Behaves like a teacher pointing the user through their first hifz session. It
// rides ON TOP of the real My Hifz UI: every instructional step advances only
// when the user performs the real action (tap Study, open an ayah, tap a rep) —
// there are no "Next" buttons. The guidance is a small comic-style speech bubble
// near the highlighted control; the control itself is spotlighted (glow + pulse)
// and never covered. Connection + closer are two tappable demo cards so the user
// actually performs one tutorial repetition of each. The parent runs this with a
// tutorial repTarget of 1 and tutorialMode on, so nothing is committed as real
// memorization progress.

const STEP = {
  1: { target: "guided-mushaf", phrase: "Read to Teacher" },
  2: { target: "guided-study", phrase: "Tap Study" },
  3: { target: "guided-ayah", phrase: "Open Ayah 1" },
  4: { target: "guided-rep", phrase: "Recite → Tap" },
  5: { target: "guided-ayah-2", phrase: "Next Ayah" },
  6: { phrase: "Connect Ayahs" },
  7: { phrase: "Recite Together" },
};

// ── small comic-style speech bubble with a tail toward the target ──
function Bubble({ cx, top, phrase, tailUp, hint }) {
  return (
    <div style={{ position: "absolute", left: cx, top, transform: "translateX(-50%)", pointerEvents: "none", textAlign: "center" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <div style={{ position: "absolute", left: "50%", [tailUp ? "top" : "bottom"]: -6, transform: "translateX(-50%) rotate(45deg)", width: 14, height: 14, background: "#FBF4E2", borderRadius: 3 }} />
        <div style={{ position: "relative", background: "#FBF4E2", color: "#2A2418", padding: "10px 18px", borderRadius: 22, fontWeight: 800, fontSize: 17, whiteSpace: "nowrap", boxShadow: "0 10px 28px rgba(0,0,0,0.5)", fontFamily: "'DM Sans',sans-serif", border: "1px solid rgba(180,150,60,0.30)" }}>{phrase}</div>
      </div>
      {hint && <div style={{ marginTop: 6, color: "#F6E27A", fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" }}>{hint}</div>}
    </div>
  );
}

// ── connection / closer demo card the user taps once (steps 6 & 7) ──
function DemoCard({ dark, kind, phrase, a1, a2, onTap }) {
  const conn = kind === "connection";
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.62)", pointerEvents: "auto" }} />
      <Bubble cx={window.innerWidth / 2} top="26%" phrase={phrase} tailUp={false} />
      <div className="sbtn" onClick={onTap} style={{ position: "absolute", left: "50%", top: "46%", transform: "translate(-50%,-50%)", width: "min(320px,86vw)", pointerEvents: "auto", background: dark ? "linear-gradient(180deg,#10203A,#0A1424)" : "#EADFC8", border: "1px solid rgba(246,226,122,0.45)", borderRadius: 18, padding: "18px 18px 20px", boxShadow: "0 0 0 9999px rgba(0,0,0,0), 0 0 30px 6px rgba(246,226,122,0.45), 0 20px 50px rgba(0,0,0,0.6)", textAlign: "center", animation: "guidedCardPulse 1.6s ease-in-out infinite" }}>
        <div style={{ fontSize: 9, letterSpacing: ".2em", textTransform: "uppercase", fontWeight: 800, color: "#F6E27A", marginBottom: 12 }}>{conn ? "Connection" : "Closer"}</div>
        <div style={{ fontFamily: "'UthmanicHafs','Amiri Quran','Amiri',serif", fontSize: 18, color: dark ? "rgba(243,231,200,0.8)" : "#2D2A26", marginBottom: 4 }}>{conn ? `${a1}  ﴿◇﴾  ${a2}` : "◈ ◈ ◈"}</div>
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
        <div className="sbtn" onClick={onComplete} style={{ padding: "13px", borderRadius: 14, textAlign: "center", fontWeight: 800, fontSize: 14, background: "linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)", color: "#060A07", boxShadow: "0 10px 24px rgba(212,175,55,0.25)" }}>Begin Real Session</div>
      </div>
    </>
  );
}

export default function GuidedSession({ step, setStep, dark, hifzViewMode, openAyah, repCounts, onComplete }) {
  const [rect, setRect] = useState(null);
  const repped = Object.keys(repCounts || {}).filter((k) => (repCounts[k] || 0) >= 1);
  const reppedCount = repped.length;

  // ── action-based auto-advance: advance only when the real action happens.
  // No Next buttons. Each branch is guarded by `step` so it never loops.
  useEffect(() => {
    let next = null;
    if (step === 2 && hifzViewMode === "interactive") next = 3;
    else if (step === 3 && openAyah) next = 4;
    else if (step === 4 && reppedCount >= 1) next = 5;
    else if (step === 5 && reppedCount >= 2) next = 6;
    if (next != null) setStep(next);
  }, [step, hifzViewMode, openAyah, reppedCount, setStep]);

  // ── live position of the highlighted control (steps 1–5) ──
  const cfg = STEP[step];
  useEffect(() => {
    if (step >= 6) { setRect(null); return; }
    let raf;
    const tick = () => { const el = cfg?.target ? document.querySelector(`[data-tut="${cfg.target}"]`) : null; setRect(el ? el.getBoundingClientRect() : null); raf = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [step, cfg?.target]);

  // bubble geometry: near the target, never on it. Step 1 sits low so the Mushaf
  // (and its ayat) stay fully readable.
  let bubble = null;
  if (rect && step !== 1) {
    const below = rect.bottom + 96 < window.innerHeight;
    bubble = { cx: Math.min(Math.max(rect.left + rect.width / 2, 80), window.innerWidth - 80), top: below ? rect.bottom + 16 : rect.top - 70, tailUp: below };
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 4000, pointerEvents: "none" }}>
      <style>{`@keyframes guidedPulse{0%,100%{box-shadow:0 0 0 9999px rgba(0,0,0,0.32),0 0 0 3px rgba(246,226,122,0.5),0 0 20px 5px rgba(246,226,122,0.5)}50%{box-shadow:0 0 0 9999px rgba(0,0,0,0.32),0 0 0 6px rgba(246,226,122,0.72),0 0 36px 9px rgba(246,226,122,0.85)}}@keyframes guidedCardPulse{0%,100%{box-shadow:0 0 30px 5px rgba(246,226,122,0.4),0 20px 50px rgba(0,0,0,0.6)}50%{box-shadow:0 0 44px 10px rgba(246,226,122,0.7),0 20px 50px rgba(0,0,0,0.6)}}`}</style>

      {/* STEP 1 — Mushaf stays readable: very light dim, tap the page to continue */}
      {step === 1 && (
        <>
          <div onClick={() => setStep(2)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.12)", pointerEvents: "auto" }} />
          <Bubble cx={window.innerWidth / 2} top={window.innerHeight - 200} phrase="Read to Teacher" tailUp hint="tap page to continue" />
        </>
      )}

      {/* STEPS 2–5 — spotlight the real control (dim-hole + glow pulse); click-through */}
      {step >= 2 && step <= 5 && (
        <>
          {rect ? (
            <div style={{ position: "absolute", left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16, borderRadius: 14, animation: "guidedPulse 1.5s ease-in-out infinite", pointerEvents: "none" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.32)" }} />
          )}
          {bubble && <Bubble cx={bubble.cx} top={bubble.top} phrase={cfg.phrase} tailUp={bubble.tailUp} />}
        </>
      )}

      {/* STEPS 6–7 — connection / closer demo cards the user taps once */}
      {(step === 6 || step === 7) && (
        <DemoCard dark={dark} kind={step === 6 ? "connection" : "closer"} phrase={cfg.phrase} a1={repped[0] || "114:1"} a2={repped[1] || "114:2"} onTap={() => setStep(step + 1)} />
      )}

      {/* STEP 8 — completion */}
      {step === 8 && <Completion dark={dark} onComplete={onComplete} />}
    </div>
  );
}
