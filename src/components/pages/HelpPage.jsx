import React from "react";
import AppPage from "./AppPage";

export default function HelpPage({ dark, onBack }) {
  return (
    <AppPage dark={dark} title="Help" subtitle="Common questions" onBack={onBack}>
      <div style={{ fontSize: 13, color: dark ? "rgba(243,231,200,0.80)" : "#2D2A26", lineHeight: 1.8, padding: "4px 2px" }}>
        <p style={{ marginBottom: 12 }}><strong>Why is my Dhuhr review so big?</strong> It's the last 5 mushaf pages of memorized content. Once your daily Fajr advances, the window scrolls forward.</p>
        <p style={{ marginBottom: 12 }}><strong>Can I memorize at my own pace?</strong> Yes — Plan → adjust your timeline. Custom pace switches Fajr to your chosen ayah count, but Dhuhr stays at 5 pages.</p>
        <p style={{ marginBottom: 12 }}><strong>What if I miss a day?</strong> Your streak resets but your memorized juz are kept. Pick up the next morning at the same Fajr page.</p>
        <p><strong>Where's my data?</strong> Stored locally in your browser. Use Export Data (in the menu) to save a backup.</p>
      </div>
    </AppPage>
  );
}
