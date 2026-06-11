/* eslint-disable react-hooks/set-state-in-effect -- the overlay advances its step
   by observing the user's real action on the underlying My Hifz UI (external
   state); each branch is guarded by `step` so it can never loop. */
import { useEffect, useRef, useState } from "react";

// ── Guided first-session tutorial ────────────────────────────────────────────
// A companion that guides a brand-new user through their first hifz session on
// the REAL My Hifz UI. Each instructional step advances only when the user
// performs the real action — no "Next" buttons. Guidance is a manga-style speech
// bubble that sits BESIDE the highlighted control and points at it with a tail;
// the control is the hero (glow + pulse) and is never covered. The session is:
// recite ayah 1 → recite ayah 2 → connect the two. Connection is a tappable
// card that shows the REAL ayahs. The parent runs this with
// repTarget=1 and tutorialMode on, so nothing is committed as real progress.

const PHRASE = { 1: "Read to Teacher", 2: "Tap Study", 3: "First Ayah", 4: "Recite → Tap", 5: "Next Ayah", 6: "Connect Ayahs" };
const TUT = { 1: "guided-mushaf-btn", 2: "guided-study", 3: "guided-ayah", 4: "guided-rep", 5: "guided-ayah-2" };

const CREAM = "#FBF4E2";
const INK = "#2A2418";

// read an ayah's rendered text AND its font straight from the Study card's RTL
// line — capturing the font matters because Shaykh-plan pages render per-page
// PUA glyphs (p{n}-v2) that only display in that exact font.
const ayahOf = (k) => {
  try {
    const card = document.querySelector(`[data-tut="${k}"]`);
    const rtl = card && card.querySelector('[style*="rtl"]');
    if (!rtl) return null;
    const text = (rtl.textContent || "").replace(/⁠/g, "").trim();
    if (!text) return null;
    const inner = rtl.querySelector("span") || rtl;
    return { text, font: getComputedStyle(inner).fontFamily };
  } catch { return null; }
};

// soft rounded speech bubble: one clean shape, light outline, a small pointed
// tail toward the target. Calm — no float, the highlighted control is the hero.
function Bubble({ left, top, phrase, tailDir, tailOffset }) {
  const down = tailDir === "down";
  return (
    <div style={{ position: "absolute", left, top, transform: "translateX(-50%)", pointerEvents: "none" }}>
      <div style={{ position: "relative", minWidth: 118, background: CREAM, color: INK, padding: "10px 18px", borderRadius: 18, fontWeight: 700, fontSize: 15.5, whiteSpace: "nowrap", textAlign: "center", boxShadow: "0 8px 22px rgba(0,0,0,0.42)", border: "1.5px solid rgba(42,36,24,0.45)", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.2 }}>
        {phrase}
        {/* small pointed tail (thin outline behind a cream fill) */}
        <div style={{ position: "absolute", left: `calc(50% + ${tailOffset}px)`, [down ? "top" : "bottom"]: "calc(100% - 1px)", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", [down ? "borderTop" : "borderBottom"]: "13px solid rgba(42,36,24,0.45)" }} />
        <div style={{ position: "absolute", left: `calc(50% + ${tailOffset}px)`, [down ? "top" : "bottom"]: "calc(100% - 3px)", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", [down ? "borderTop" : "borderBottom"]: `12px solid ${CREAM}` }} />
      </div>
    </div>
  );
}

// connection demo card (the hero for step 6). Shows the REAL ayahs the user just
// recited (captured earlier, each with its own font) so they can recite them
// together, then tap once. The opaque dim hides the live My Hifz UI behind it.
function DemoCard({ dark, ayahs, onTap }) {
  const lines = (ayahs || []).filter((a) => a && a.text);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.9)", pointerEvents: "auto" }} />
      <div className="sbtn" onClick={onTap} style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(340px,88vw)", maxHeight: "72vh", overflowY: "auto", pointerEvents: "auto", background: dark ? "linear-gradient(180deg,#10203A,#0A1424)" : "#EADFC8", border: "1px solid rgba(246,226,122,0.5)", borderRadius: 18, padding: "20px 18px 22px", textAlign: "center", animation: "guidedCardPulse 1.5s ease-in-out infinite" }}>
        <div style={{ fontSize: 9, letterSpacing: ".2em", textTransform: "uppercase", fontWeight: 800, color: "#F6E27A", marginBottom: 16 }}>Connection</div>
        {lines.length ? lines.map((a, i) => (
          <div key={i} style={{ direction: "rtl", textAlign: "center", fontFamily: a.font || "'UthmanicHafs','Amiri Quran','Amiri',serif", fontSize: "clamp(22px,6vw,30px)", lineHeight: 2.1, color: dark ? "rgba(255,255,255,0.92)" : "#2D2A26", marginBottom: i < lines.length - 1 ? 4 : 14 }}>{a.text}</div>
        )) : <div style={{ fontSize: 14, color: dark ? "rgba(243,231,200,0.7)" : "#2D2A26", marginBottom: 14 }}>Connect the two ayahs</div>}
        <div style={{ fontSize: 12, color: dark ? "rgba(243,231,200,0.55)" : "#6B645A", marginBottom: 16 }}>Recite both ayahs together</div>
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
          You learned:<br />✓ Study<br />✓ Repetition<br />✓ Connection
        </div>
        <div className="sbtn" onClick={onComplete} style={{ padding: "13px", borderRadius: 14, textAlign: "center", fontWeight: 800, fontSize: 14, background: "linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)", color: "#060A07", boxShadow: "0 10px 24px rgba(212,175,55,0.25)" }}>Start Session</div>
      </div>
    </>
  );
}

export default function GuidedSession({ step, setStep, dark, hifzViewMode, openAyah, setOpenAyah, repCounts, onComplete }) {
  const [rect, setRect] = useState(null);
  // captured ayahs (text + font) for the connection card — grabbed while
  // the Study rows are still on screen, since they're replaced once the real
  // connection phase opens behind the overlay.
  const ayahsRef = useRef([null, null]);
  const [cardAyahs, setCardAyahs] = useState([null, null]);
  const repped = Object.keys(repCounts || {}).filter((k) => (repCounts[k] || 0) >= 1);
  const reppedCount = repped.length;

  // Step 5 switches its hero once Ayah 2 is open: card → "Next Ayah", then the
  // repetition tracker inside the popup → "Recite → Tap" (so the user recites it).
  const ayah2Open = step === 5 && openAyah && !repped.includes(openAyah);
  const activeTut = ayah2Open ? "guided-rep" : (TUT[step] || null);
  const phrase = ayah2Open ? "Recite → Tap" : PHRASE[step];

  // ── action-based auto-advance: each step advances only on the real action ──
  useEffect(() => {
    let next = null;
    if (step === 2 && hifzViewMode === "interactive") next = 3;
    else if (step === 3 && openAyah) next = 4;
    else if (step === 4 && reppedCount >= 1) next = 5;
    else if (step === 5 && reppedCount >= 2) next = 6; // recited ayah 2 (1 rep)
    if (next != null) {
      if (next === 6) {
        setCardAyahs([...ayahsRef.current]); // snapshot the ayahs while the Study rows are still on screen
        if (setOpenAyah) setOpenAyah(null); // close popup → clean connection card
      }
      setStep(next);
    }
  }, [step, hifzViewMode, openAyah, reppedCount, setStep, setOpenAyah]);

  // ── live position of the single highlighted control (steps 1–5) ──
  useEffect(() => {
    if (step >= 6) { setRect(null); return; }
    let raf;
    const tick = () => {
      const el = activeTut ? document.querySelector(`[data-tut="${activeTut}"]`) : null;
      setRect(el ? el.getBoundingClientRect() : null);
      const a1 = ayahOf("guided-ayah"); if (a1) ayahsRef.current[0] = a1;
      const a2 = ayahOf("guided-ayah-2"); if (a2) ayahsRef.current[1] = a2;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [step, activeTut]);

  // ── place the bubble BESIDE the hero, pointing at it, never on it ──
  let target = null;
  if (step <= 5 && rect) target = { cx: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom };
  if (step === 6) target = { cx: window.innerWidth / 2, top: window.innerHeight * 0.30, bottom: window.innerHeight * 0.72 };

  let bub = null;
  if (target) {
    const below = step < 6 && target.top < window.innerHeight * 0.5;
    const top = below ? target.bottom + 18 : Math.max(108, target.top - 62);
    const left = Math.min(Math.max(target.cx, 112), window.innerWidth - 112);
    bub = { left, top, tailDir: below ? "up" : "down", tailOffset: Math.max(-46, Math.min(46, target.cx - left)) };
  }

  return (
    <div data-guided-step={step} style={{ position: "fixed", inset: 0, zIndex: 4000, pointerEvents: "none" }}>
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

      {/* STEP 6 — connection card showing the real ayahs */}
      {step === 6 && (
        <DemoCard dark={dark} ayahs={cardAyahs} onTap={() => setStep(7)} />
      )}

      {/* the guiding bubble — beside the hero, pointing at it (steps 1–6) */}
      {step <= 6 && bub && <Bubble left={bub.left} top={bub.top} phrase={phrase} tailDir={bub.tailDir} tailOffset={bub.tailOffset} />}

      {/* STEP 7 — completion */}
      {step === 7 && <Completion dark={dark} onComplete={onComplete} />}
    </div>
  );
}
