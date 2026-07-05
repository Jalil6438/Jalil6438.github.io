import React from "react";
import AppPage from "./AppPage";

// About Al-Hifz — brand-aligned with the app header ("Al-Hifz · Your journey to
// memorizing the Qur'an"). Header is rendered here (not via AppPage's title) so
// the top spacing stays tight. No decorative Qur'an verses or du'a by design;
// the method bullets stay calm and generously spaced so it never crowds on mobile.
export default function AboutPage({ dark, onBack }) {
  const gold = dark ? "#E6B84A" : "#6B4F00";
  const body = dark ? "rgba(243,231,200,0.86)" : "#2D2A26";
  const muted = dark ? "rgba(243,231,200,0.62)" : "#6B5A2A";
  const label = { fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 700, color: gold };
  const value = { fontSize: 13, color: dark ? "rgba(243,231,200,0.82)" : "#5A4A2A" };

  const steps = [
    "Memorize one mushaf page per day.",
    "Begin from the end of the Qur'an, moving from An-Nās toward Al-Baqarah.",
    "Repeat the new page 20 times to strengthen retention.",
    "Review yesterday's memorization before moving forward.",
    "Continue progressive revision so earlier pages stay connected.",
    "Complete the day with a final lock-in session before the next page begins.",
  ];

  return (
    <AppPage dark={dark} onBack={onBack} maxWidth={480}>
      {/* Header — kept tight to the back bar */}
      <div style={{ textAlign: "center", marginTop: -4, marginBottom: 24 }}>
        <div style={{ fontSize: 9, letterSpacing: ".24em", textTransform: "uppercase", fontWeight: 700, color: gold, marginBottom: 9 }}>About Al-Hifz</div>
        <div style={{ fontSize: 12.5, color: muted, lineHeight: 1.6 }}>Your journey to memorizing the Qur'an</div>
      </div>

      {/* Body */}
      <div style={{ fontSize: 13, color: body, lineHeight: 1.95 }}>
        <p style={{ marginBottom: 18 }}>
          <strong style={{ color: gold }}>Al-Hifz</strong> — Your Journey to Memorizing the Qur'an — is a Qur'an memorization companion built for steady, long-term hifz.
        </p>
        <p style={{ marginBottom: 18 }}>
          It is designed for the Muslim who wants to memorize with discipline, patience, and consistency — not rush through pages and forget them later.
        </p>
        <p style={{ marginBottom: 22 }}>
          The app is built around the method taught by <strong>Shaykh Abdul Muhsin Al-Qasim</strong>, imam of Masjid an-Nabawi, in his book <span style={{ fontStyle: "italic" }}>The Easiest Way to Memorize the Noble Qur'an</span>.
        </p>

        <p style={{ marginBottom: 14, fontWeight: 700, color: dark ? "#F3E7C8" : "#3D2E0A" }}>The method is simple and structured:</p>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
          {steps.map((t, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 13, lineHeight: 1.65 }}>
              <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: "50%", background: dark ? "rgba(230,184,74,0.55)" : "rgba(139,106,16,0.55)", marginTop: 8, flexShrink: 0 }} />
              <span>{t}</span>
            </li>
          ))}
        </ul>

        <p style={{ marginBottom: 4 }}>
          <strong style={{ color: gold }}>Al-Hifz</strong> is not built around speed. It is built around permanence.
        </p>
        <div style={{ textAlign: "center", margin: "22px auto 2px", maxWidth: 340, lineHeight: 2.05, fontStyle: "italic", color: dark ? "rgba(230,184,74,0.72)" : "#6B4F00" }}>
          Quality over quantity.<br />
          Consistency over intensity.<br />
          A little every day until the Qur'an becomes firmly rooted in the heart.
        </div>
      </div>

      {/* Info card — centered, with generous room above the bottom nav */}
      <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${dark ? "rgba(217,177,95,0.15)" : "rgba(139,106,16,0.15)"}`, textAlign: "center", paddingBottom: 44 }}>
        <div style={{ ...label, marginBottom: 6 }}>Version</div>
        <div style={value}>v1.5</div>
        <div style={{ ...label, marginTop: 16, marginBottom: 6 }}>Created by</div>
        <div style={{ ...value, lineHeight: 1.55 }}>Abū ʿAbdir-Raḥmān<br />ʿAbdul-Jalīl</div>
        <div style={{ ...label, marginTop: 16, marginBottom: 6 }}>Contact</div>
        <a href="mailto:info@noortechstudios.com" style={{ fontSize: 13, color: dark ? "rgba(230,184,74,0.82)" : "#6B4F00", textDecoration: "none" }}>info@noortechstudios.com</a>
      </div>
    </AppPage>
  );
}
