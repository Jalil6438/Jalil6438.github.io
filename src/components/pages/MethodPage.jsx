import React from "react";
import AppPage from "./AppPage";

export default function MethodPage({ dark, onBack }) {
  return (
    <AppPage dark={dark} title="Shaykh Al-Qasim's Method" subtitle="The framework this app is built on" onBack={onBack}>
      <div style={{ fontSize: 13, color: dark ? "rgba(243,231,200,0.85)" : "#2D2A26", lineHeight: 1.85, padding: "4px 2px" }}>
        <p style={{ marginBottom: 14 }}><strong style={{ color: dark ? "#E6B84A" : "#6B4F00" }}>One mushaf page per day.</strong> No more, no less. Quality over quantity.</p>
        <p style={{ marginBottom: 14 }}><strong style={{ color: dark ? "#E6B84A" : "#6B4F00" }}>Reverse-order memorization.</strong> Start at An-Nās (114) and work back toward Al-Baqarah. Short, familiar surahs first.</p>
        <p style={{ marginBottom: 14 }}><strong style={{ color: dark ? "#E6B84A" : "#6B4F00" }}>20× per ayah.</strong> Repeat each ayah twenty times before moving on.</p>
        <p style={{ marginBottom: 14 }}><strong style={{ color: dark ? "#E6B84A" : "#6B4F00" }}>Connection phase (الربط).</strong> Once a pair is at 20×, recite both together 10×. Once a surah's full set of pairs is done, recite the entire surah together 10× — the closer.</p>
        <p style={{ marginBottom: 14 }}><strong style={{ color: dark ? "#E6B84A" : "#6B4F00" }}>5 sessions a day.</strong> Fajr (memorize), Dhuhr (review last 5 days), Asr (revise older juz), Maghrib (listen to today's page), Isha (final review before sleep).</p>
        <p>Consistency beats speed. The 30-juz target is years away — what matters is showing up tomorrow.</p>
      </div>
    </AppPage>
  );
}
