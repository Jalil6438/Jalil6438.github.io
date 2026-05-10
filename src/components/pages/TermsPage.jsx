import React from "react";
import AppPage from "./AppPage";

export default function TermsPage({ dark, T, onBack }) {
  const sub = T?.sub || (dark ? "rgba(243,231,200,0.65)" : "#3D2E0A");
  const dim = T?.dim || (dark ? "rgba(243,231,200,0.40)" : "#8B7355");
  const SectionHead = ({ children }) => (
    <div style={{ fontSize: 11, color: "#D4AF37", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>{children}</div>
  );
  const Bullet = ({ children, last }) => (
    <div style={{ display: "flex", gap: 8, marginBottom: last ? 0 : 8 }}><span>•</span><span>{children}</span></div>
  );

  return (
    <AppPage dark={dark} title="Terms & Privacy" subtitle="Last updated: April 2026" onBack={onBack}>
      <SectionHead>Privacy</SectionHead>
      <div style={{ fontSize: 13, color: sub, lineHeight: 1.7, marginBottom: 22 }}>
        <Bullet>All your progress, goals, and preferences are stored <strong>only on your device</strong> using localStorage.</Bullet>
        <Bullet>There is no account, no sign-up, and no sign-in required.</Bullet>
        <Bullet>We do not collect, track, or transmit any personal data.</Bullet>
        <Bullet>No analytics, no ads, no tracking cookies.</Bullet>
        <Bullet>Quran text, audio, and tafsir are fetched from Quran Foundation APIs only when you use those features.</Bullet>
        <Bullet last>Your memorization data never leaves your device unless you explicitly export it.</Bullet>
      </div>

      <SectionHead>Terms of Use</SectionHead>
      <div style={{ fontSize: 13, color: sub, lineHeight: 1.7, marginBottom: 22 }}>
        <Bullet>Rihlat Al-Hifz is free to use for personal hifz journey and reflection.</Bullet>
        <Bullet>This app is a supplementary tool — it is not a substitute for guidance from a qualified Quran teacher.</Bullet>
        <Bullet>Rihlat Al-Hifz is an independent project and is <strong>not affiliated with, endorsed by, or sponsored by Quran Foundation, Quran.com, or any other organization</strong>. We gratefully use their public APIs to bring the Quran to you.</Bullet>
        <Bullet last>May Allah accept your efforts and grant you success in memorizing His Book.</Bullet>
      </div>

      <SectionHead>Attribution</SectionHead>
      <div style={{ fontSize: 13, color: sub, lineHeight: 1.7, marginBottom: 18 }}>
        <Bullet><strong>Quranic text & metadata:</strong> Quran Foundation (quran.com / quran.foundation)</Bullet>
        <Bullet><strong>Ayah-by-ayah audio:</strong> everyayah.com</Bullet>
        <Bullet><strong>Full surah recitations:</strong> quranicaudio.com</Bullet>
        <Bullet><strong>Tafsir:</strong> As-Sa'di, Al-Muyassar, Ibn Kathir (via Quran.com API)</Bullet>
        <Bullet><strong>Methodology:</strong> "The Easiest Way to Memorize the Noble Qur'an" by Sheikh Abdul Muhsin Al-Qasim</Bullet>
        <Bullet last><strong>Haramain imam recordings:</strong> haramain.info, Internet Archive</Bullet>
      </div>

      <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: dim, fontStyle: "italic" }}>
        بَارَكَ اللَّهُ فِيكُمْ
      </div>
    </AppPage>
  );
}
