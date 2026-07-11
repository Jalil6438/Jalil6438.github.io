import React from "react";
import AppPage from "./AppPage";

// Privacy / Terms / Contact — a single legal page reached from Settings.
// The wording here is kept deliberately honest and matched to what the code
// actually does (see src/usageCounter.js, api/stats.js, src/push/pushClient.js).
// If you change data handling, update this page in the same commit.

// Stateless presentational helpers (module scope so they are not re-created on
// every render).
const SectionHead = ({ children }) => (
  <div style={{ fontSize: 11, color: "#D4AF37", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>{children}</div>
);
const Bullet = ({ children, last }) => (
  <div style={{ display: "flex", gap: 8, marginBottom: last ? 0 : 8 }}><span>•</span><span>{children}</span></div>
);

export default function TermsPage({ dark, T, onBack }) {
  const sub = T?.sub || (dark ? "rgba(243,231,200,0.65)" : "#3D2E0A");
  const dim = T?.dim || (dark ? "rgba(243,231,200,0.40)" : "#8B7355");

  return (
    <AppPage dark={dark} title="Privacy &amp; Terms" subtitle="Version 1.0 · Effective 11 July 2026" onBack={onBack}>
      <SectionHead>Privacy — what stays on your device</SectionHead>
      <div style={{ fontSize: 13, color: sub, lineHeight: 1.7, marginBottom: 22 }}>
        <Bullet>Your memorization progress, goals, reflections, bookmarks, and app settings are stored <strong>only on your device</strong> (browser localStorage). They are never sent to our servers.</Bullet>
        <Bullet>There is no account, no sign-up, and no sign-in.</Bullet>
        <Bullet last>Your memorization data only leaves your device if you <strong>export a backup yourself</strong>. That backup file is plain text and includes your display name and any reflections you wrote, so keep it somewhere private.</Bullet>
      </div>

      <SectionHead>Privacy — what we do collect</SectionHead>
      <div style={{ fontSize: 13, color: sub, lineHeight: 1.7, marginBottom: 22 }}>
        <Bullet><strong>Anonymous usage counts.</strong> So we can see how many people use Al-Hifz, the app sends a random device identifier (not your name — there is no name or account) and counts app opens, installs, and monthly-active devices. Your approximate country (a two-letter code derived from your connection) is recorded in aggregate.</Bullet>
        <Bullet><strong>No ads, no third-party trackers, no cross-app tracking, no advertising identifiers.</strong> The counts above are our own and are not shared with advertisers or data brokers.</Bullet>
        <Bullet><strong>Reminders (only if you turn them on).</strong> To send prayer-time review notifications when the app is closed, we store your notification subscription, timezone, and chosen reminder times on our server. Turning reminders off (or resetting the app) removes this from our server.</Bullet>
        <Bullet last><strong>Servers and logs.</strong> The app is hosted on Vercel and uses Upstash to hold the counts and reminder data above. As with any website, our servers briefly see your IP address in standard request logs; we do not store your IP — only the two-letter country derived from it.</Bullet>
      </div>

      <SectionHead>Privacy — content providers</SectionHead>
      <div style={{ fontSize: 13, color: sub, lineHeight: 1.7, marginBottom: 22 }}>
        <Bullet last>Quran text, translations, tafsir, audio, and fonts are fetched from public providers (Quran Foundation / Quran.com, everyayah.com, quranicaudio.com, the Internet Archive, jsDelivr, Google Fonts) <strong>only when you use those features</strong>. Like any website you visit, those providers see your IP address and what you request. See Attribution below.</Bullet>
      </div>

      <SectionHead>Your controls</SectionHead>
      <div style={{ fontSize: 13, color: sub, lineHeight: 1.7, marginBottom: 22 }}>
        <Bullet>Turn reminders on or off any time in Settings → Reminders.</Bullet>
        <Bullet>Export or restore your own backup in Settings → Export Data.</Bullet>
        <Bullet last>Erase everything on this device in Settings → Reset All Progress. This also removes any reminder subscription from our server.</Bullet>
      </div>

      <SectionHead>Terms of Use</SectionHead>
      <div style={{ fontSize: 13, color: sub, lineHeight: 1.7, marginBottom: 22 }}>
        <Bullet>Rihlat Al-Hifz is free to use for your personal hifz journey and reflection.</Bullet>
        <Bullet>This app is a supplementary tool — it is not a substitute for guidance from a qualified Quran teacher.</Bullet>
        <Bullet>Rihlat Al-Hifz is an independent project and is <strong>not affiliated with, endorsed by, or sponsored by Quran Foundation, Quran.com, or any other organization</strong>. We gratefully use their public APIs to bring the Quran to you.</Bullet>
        <Bullet last>May Allah accept your efforts and grant you success in memorizing His Book.</Bullet>
      </div>

      <SectionHead>Contact &amp; Support</SectionHead>
      <div style={{ fontSize: 13, color: sub, lineHeight: 1.7, marginBottom: 22 }}>
        <Bullet last>Questions, privacy requests, or issues? Email <a href="mailto:info@noortechstudios.com" style={{ color: "#D4AF37", textDecoration: "none", fontWeight: 600 }}>info@noortechstudios.com</a>.</Bullet>
      </div>

      <SectionHead>Attribution</SectionHead>
      <div style={{ fontSize: 13, color: sub, lineHeight: 1.7, marginBottom: 18 }}>
        <Bullet><strong>Quranic text &amp; metadata:</strong> Quran Foundation (quran.com / quran.foundation)</Bullet>
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
