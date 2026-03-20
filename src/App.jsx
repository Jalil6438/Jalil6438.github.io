
import { useState } from "react";
import StudyPlan from "./study-plan-tracker";
import QuranTracker from "./quran-hifz-tracker";

export default function App() {
  const [tab, setTab] = useState("study");
  return (
    <div>
      <div style={{ display: "flex", gap: 0, background: "#050807", padding: "8px 16px" }}>
        <button onClick={() => setTab("study")} style={{ marginRight: 10, padding: "6px 14px", background: tab === "study" ? "#C9A84C" : "#0A120C", color: tab === "study" ? "#050807" : "#4A7A58", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: 600 }}>
          Study Plan
        </button>
        <button onClick={() => setTab("quran")} style={{ padding: "6px 14px", background: tab === "quran" ? "#C9A84C" : "#0A120C", color: tab === "quran" ? "#050807" : "#4A7A58", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: 600 }}>
          Quran Hifz
        </button>
      </div>
      {tab === "study" ? <StudyPlan /> : <QuranTracker />}
    </div>
  );
}