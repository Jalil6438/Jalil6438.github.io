import { useEffect, useState } from "react";

// ── Guided first-session tutorial ────────────────────────────────────────────
// A one-time coachmark overlay that walks a brand-new user through the real My
// Hifz workflow: Mushaf → Study → tap ayah → repetition → next ayah → connection
// → closer → complete. It rides ON TOP of the real UI (the user taps the real
// Study toggle / ayah / rep button), but the parent runs it with a tutorial
// repTarget of 1 and snapshots+restores localStorage around it, so nothing the
// tutorial does is committed as real memorization progress.
//
// Steps 2–5 auto-advance when the watched state changes (hifzViewMode / openAyah
// / repCounts); steps 1, 6, 7, 8 advance on a button. Connection + closer are
// taught as coachmarks here — the real PairModal/CloserModal appear in the user's
// actual session, which keeps the tutorial from forcing/altering session logic.

const STEPS = [
  { n: 1, target: null, title: "1 · Read first", text: "Before memorizing, read this page to a qualified teacher and make sure your recitation is corrected.", button: "Next" },
  { n: 2, target: "guided-study", title: "2 · Study mode", text: "Tap Study to begin memorization.", action: true },
  { n: 3, target: "guided-ayah", title: "3 · Your first ayah", text: "This is your first ayah. Tap it to begin.", action: true },
  { n: 4, target: "guided-rep", title: "4 · Repetition", text: "For this tutorial, tap once after reciting. Real sessions use the full repetition target.", action: true },
  { n: 5, target: "guided-ayah-2", title: "5 · Ayah by ayah", text: "Al-Hifz moves ayah by ayah. Open the next ayah and tap once the same way.", action: true },
  { n: 6, target: null, title: "6 · Connection", text: "Now Al-Hifz connects ayahs together so transitions become strong.", button: "Next" },
  { n: 7, target: null, title: "7 · Closer", text: "The closer is where you recite the section together to cement it.", button: "Next" },
  { n: 8, target: null, title: "Done", text: "You completed the guided session. Real memorization sessions will now use the full Al-Hifz method and repetition targets.", button: "Start Real Session", final: true },
];

export default function GuidedSession({ step, setStep, dark, hifzViewMode, openAyah, repCounts, onComplete }) {
  const cfg = STEPS.find((s) => s.n === step) || STEPS[0];
  const [rect, setRect] = useState(null);
  // distinct ayahs that reached >=1 rep during the tutorial (repTarget is 1 here)
  const reppedCount = (() => { const s = new Set(); Object.keys(repCounts || {}).forEach((k) => { if ((repCounts[k] || 0) >= 1) s.add(k); }); return s.size; })();

  // ── auto-advance on watched state ──
  useEffect(() => {
    if (step === 2 && hifzViewMode === "interactive") setStep(3);
  }, [step, hifzViewMode, setStep]);
  useEffect(() => {
    if (step === 3 && openAyah) setStep(4);
  }, [step, openAyah, setStep]);
  useEffect(() => {
    // step 4: first ayah recorded one rep (popup auto-closes at target=1)
    if (step === 4 && reppedCount >= 1) setStep(5);
    // step 5: a second distinct ayah recorded a rep
    if (step === 5 && reppedCount >= 2) setStep(6);
  }, [step, reppedCount, setStep]);

  // ── track the highlighted target's position (it may mount after a beat) ──
  useEffect(() => {
    let raf;
    const tick = () => {
      const el = cfg.target ? document.querySelector(`[data-tut="${cfg.target}"]`) : null;
      setRect(el ? el.getBoundingClientRect() : null);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [cfg.target, step]);

  const gold = "#E6B84A";
  // bubble sits below the target if there's room, else above; centered if no target
  const bubbleTop = rect ? (rect.bottom + 180 < window.innerHeight ? rect.bottom + 14 : Math.max(12, rect.top - 168)) : null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 4000, pointerEvents: "none" }}>
      {/* full dim only when there is no spotlight target; otherwise the ring's
          0 0 0 9999px shadow dims everything except the highlighted control */}
      {!rect && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />}
      {/* spotlight ring around the live target (click-through so the real control is tappable) */}
      {rect && (
        <div style={{ position: "absolute", left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16, borderRadius: 14, border: `2px solid ${gold}`, boxShadow: `0 0 0 9999px rgba(0,0,0,0.45), 0 0 22px ${gold}`, pointerEvents: "none" }} />
      )}
      {/* coachmark bubble */}
      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: bubbleTop != null ? bubbleTop : undefined, bottom: bubbleTop == null ? "16%" : undefined, width: "min(360px,90vw)", pointerEvents: "auto", background: dark ? "linear-gradient(180deg,#10203A,#0A1424)" : "#FBF4E2", border: `1px solid ${gold}55`, borderRadius: 16, padding: "16px 18px", boxShadow: "0 18px 50px rgba(0,0,0,0.55)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700, color: gold }}>{cfg.title}</div>
          <div style={{ fontSize: 9, color: dark ? "rgba(243,231,200,0.4)" : "#9A8A6A", fontFamily: "'IBM Plex Mono',monospace" }}>{step}/8</div>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: dark ? "rgba(243,231,200,0.92)" : "#2D2A26", fontFamily: "'DM Sans',sans-serif" }}>{cfg.text}</div>
        {(cfg.button || cfg.final) && (
          <div className="sbtn" onClick={() => (cfg.final ? onComplete() : setStep(step + 1))} style={{ marginTop: 14, padding: "11px 14px", borderRadius: 12, textAlign: "center", fontSize: 13, fontWeight: 800, letterSpacing: ".02em", background: "linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)", color: "#060A07", boxShadow: "0 10px 22px rgba(212,175,55,0.22)" }}>{cfg.button}</div>
        )}
        {cfg.action && (
          <div style={{ marginTop: 10, fontSize: 10, color: dark ? "rgba(243,231,200,0.35)" : "#9A8A6A", textAlign: "center", fontStyle: "italic" }}>Tap the highlighted control to continue</div>
        )}
      </div>
    </div>
  );
}
