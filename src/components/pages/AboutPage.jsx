import React from "react";
import AppPage from "./AppPage";

export default function AboutPage({ dark, onBack }) {
  return (
    <AppPage dark={dark} title="About Rihlat al-Hifz" subtitle="Your journey to memorization" onBack={onBack}>
      <div style={{ fontSize: 13, color: dark ? "rgba(243,231,200,0.85)" : "#2D2A26", lineHeight: 1.85, padding: "4px 2px" }}>
        <p style={{ marginBottom: 14 }}>
          <strong style={{ color: dark ? "#E6B84A" : "#6B4F00" }}>Rihlat al-Hifz</strong> (رحلة الحفظ — "the journey of memorization") is a tracker built around the method taught by <strong>Shaykh Abdul Muhsin Al-Qasim</strong>, imam of Masjid an-Nabawi.
        </p>
        <p style={{ marginBottom: 14 }}>
          The method is simple: one mushaf page a day, in reverse order from An-Nās to Al-Baqarah, with the discipline of 20× repetition and a connection phase that locks each surah into long-term memory.
        </p>
        <p style={{ marginBottom: 14 }}>
          It is built for the Muslim who wants to become a hafiz over years — not weeks. Quality over quantity. Consistency over intensity.
        </p>
        <div style={{ marginTop: 20, padding: "12px 14px", borderRadius: 12, background: dark ? "rgba(212,175,55,0.05)" : "rgba(180,140,40,0.05)", border: `1px solid ${dark ? "rgba(212,175,55,0.15)" : "rgba(139,106,16,0.15)"}` }}>
          <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 700, color: dark ? "#E6B84A" : "#6B4F00", marginBottom: 6 }}>Version</div>
          <div style={{ fontSize: 12, color: dark ? "rgba(243,231,200,0.65)" : "#5A4A2A" }}>v1.0 · Built with intention by Abu 'Abdur-Rahman Abdul Jalil</div>
        </div>
        <div style={{ fontSize: 11, color: dark ? "rgba(243,231,200,0.40)" : "#8B7355", textAlign: "center", marginTop: 16, fontStyle: "italic", lineHeight: 1.7 }}>
          "And We have indeed made the Qur'an easy to remember, so is there anyone who will remember?" <br/>— Surah Al-Qamar, 54:17
        </div>
      </div>
    </AppPage>
  );
}
