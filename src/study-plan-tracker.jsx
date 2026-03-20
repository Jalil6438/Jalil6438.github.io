import { useState, useEffect, useCallback } from "react";

// ── DATA ─────────────────────────────────────────────────────────────────────

const PHASES = [
  {
    id: 1, label: "Phase 1", name: "Web Foundations", icon: "◈",
    weeks: "1–12", color: "#D4A84B", dim: "#1C1408",
    duration: "12 Weeks", buffer: false,
    courses: ["The Complete JavaScript Course 2025", "Web Design for Web Developers", "Advanced CSS and Sass"],
    note: "💡 Don't pressure yourself to start building in Week 1. If fundamentals aren't solid by the end of Week 2, delay the first project by a week — the foundation is everything.",
    markazTip: "Study JS variables, data types, and functions passively (1 day/week). Readable theory — browser console is all you need. This lays the ground so Phase 1 moves faster when you start properly.",
    skills: [
      {id:"sk1",name:"JavaScript basics"},{id:"sk2",name:"DOM manipulation"},
      {id:"sk3",name:"Async JavaScript + Fetch"},{id:"sk4",name:"Flexbox"},
      {id:"sk5",name:"CSS Grid"},{id:"sk6",name:"Sass"},
    ],
    projects: [
      {id:"pr1",name:"Prayer Times App",weeks:"Wks 1–6"},
      {id:"pr2",name:"Coffee Roasting Website",weeks:"Wks 7–8"},
      {id:"pr3",name:"Cleaning Company Website",weeks:"Wks 9–10"},
      {id:"pr4",name:"Islamic Reminder Generator",weeks:"Wks 11–12"},
    ],
    weeklyPlan: [
      {label:"Weeks 1–2",topics:["JS: Variables, data types, operators","JS: Functions, arrays, objects","CSS: Flexbox basics"],proj:"Prayer Times App — HTML/CSS skeleton (start when ready, not before)"},
      {label:"Weeks 3–4",topics:["JS: DOM manipulation","JS: Events","CSS: Responsive design"],proj:"Prayer Times App — DOM rendering + countdown timer"},
      {label:"Weeks 5–6",topics:["JS: Async JavaScript + Fetch API","CSS: Grid layouts"],proj:"Prayer Times App — API integration + dynamic prayer time updates"},
      {label:"Weeks 7–8",topics:["JS: Advanced functions + closures","JS: ES6 modules","CSS: Animations + transitions"],proj:"Coffee Roasting Website — responsive layout + product sections"},
      {label:"Weeks 9–10",topics:["JS: OOP in JavaScript","JS: Architecture patterns","CSS: Sass basics"],proj:"Cleaning Company Website — booking form + pricing calculator"},
      {label:"Weeks 11–12",topics:["JS: Mapty / Bankist project sections","CSS: Sass architecture"],proj:"Islamic Reminder Generator — arrays + objects + UI polish"},
    ],
  },
  {
    id: 2, label: "Phase 2", name: "React Frontend", icon: "⬡",
    weeks: "13–20", color: "#4ECDC4", dim: "#061A18",
    duration: "8 Weeks", buffer: false,
    courses: ["The Ultimate React Course 2025"],
    note: "💡 Redux feels abstract at first — that's normal. If it hasn't clicked by Week 20, deploy the platform without it and refactor later. Shipping > perfecting.",
    markazTip: "Watch React component and JSX conceptual videos passively. Theory absorption now means faster hands-on progress later. No coding environment needed.",
    skills: [
      {id:"sk7",name:"React components + JSX"},{id:"sk8",name:"useState + useEffect"},
      {id:"sk9",name:"React Router"},{id:"sk10",name:"Context API"},{id:"sk11",name:"Redux"},
    ],
    projects: [
      {id:"pr5",name:"Islamic Learning Platform",weeks:"Wks 13–20"},
    ],
    weeklyPlan: [
      {label:"Weeks 13–14",topics:["React components, props, state","JSX + conditional rendering"],proj:"Islamic Learning Platform — UI skeleton"},
      {label:"Weeks 15–16",topics:["Hooks: useState, useEffect","Lists, forms, controlled components"],proj:"Islamic Learning Platform — lessons list + API fetch"},
      {label:"Weeks 17–18",topics:["React Router","Context API","Component architecture"],proj:"Islamic Learning Platform — login system + navigation"},
      {label:"Weeks 19–20",topics:["Redux","Performance optimization"],proj:"Islamic Learning Platform — progress tracking + deployment"},
    ],
  },
  {
    id: "b1", label: "Buffer", name: "Review & Rest", icon: "◌",
    weeks: "21", color: "#4A5568", dim: "#0E1118",
    duration: "1 Week", buffer: true,
    courses: [],
    note: "🌙 Intentional pause. Revisit anything shaky from Phases 1–2, polish your projects, and write proper GitHub READMEs. This week compounds everything before it.",
    markazTip: null, skills: [], projects: [],
    weeklyPlan: [
      {label:"Week 21",topics:["Revisit weak areas from Phases 1–2","Polish existing projects","Write GitHub READMEs","Rest and reflect"],proj:""},
    ],
  },
  {
    id: 3, label: "Phase 3", name: "Backend Dev", icon: "⬟",
    weeks: "22–31", color: "#68D391", dim: "#061A0E",
    duration: "10 Weeks", buffer: false,
    courses: ["Node.js, Express & MongoDB — The Complete Bootcamp"],
    note: "💡 The Masjid Management System carries directly into Phase 4. Leave it in a clean, deployable state by Week 31 — future you will thank present you.",
    markazTip: "REST API concepts, HTTP fundamentals, and MVC architecture are excellent passive reading — no terminal needed. Great docs exist for all three.",
    skills: [
      {id:"sk12",name:"Node.js fundamentals"},{id:"sk13",name:"Express"},
      {id:"sk14",name:"MongoDB + Mongoose"},{id:"sk15",name:"Authentication (JWT)"},
      {id:"sk16",name:"Authorization"},{id:"sk17",name:"MVC architecture"},{id:"sk18",name:"Deployment"},
    ],
    projects: [
      {id:"pr6",name:"Islamic Bookstore Backend",weeks:"Wks 22–27"},
      {id:"pr7",name:"Masjid Management System",weeks:"Wks 28–31"},
    ],
    weeklyPlan: [
      {label:"Weeks 22–23",topics:["Node.js fundamentals","Express basics","REST API structure"],proj:"Islamic Bookstore — CRUD for books"},
      {label:"Weeks 24–25",topics:["MongoDB + Mongoose","Data modeling"],proj:"Islamic Bookstore — user accounts + orders"},
      {label:"Weeks 26–27",topics:["Authentication (JWT)","Authorization","Security practices"],proj:"Islamic Bookstore — admin dashboard"},
      {label:"Weeks 28–29",topics:["MVC architecture","Error handling"],proj:"Masjid Management System — backend foundation"},
      {label:"Weeks 30–31",topics:["Deployment","Performance optimization"],proj:"Masjid Management System — full backend deployment"},
    ],
  },
  {
    id: "b2", label: "Buffer", name: "Review & Rest", icon: "◌",
    weeks: "32", color: "#4A5568", dim: "#0E1118",
    duration: "1 Week", buffer: true,
    courses: [],
    note: "🌙 Critical checkpoint before DevOps. Both backend apps should be live and clean on GitHub. Your portfolio should reflect strong Phase 3 work before you move forward.",
    markazTip: null, skills: [], projects: [],
    weeklyPlan: [
      {label:"Week 32",topics:["Finalize + deploy backend projects","Code review + cleanup","Update portfolio + LinkedIn","Rest"],proj:""},
    ],
  },
  {
    id: 4, label: "Phase 4", name: "DevOps", icon: "⚙",
    weeks: "33–40", color: "#FC8181", dim: "#1A0808",
    duration: "8 Weeks", buffer: false,
    courses: ["Learn GitHub Actions for CI/CD","Kubernetes for Developers","Practical Kubernetes Guide","Deploy Infrastructure with Terraform"],
    note: "⚠️ Four deep courses across 8 weeks is aggressive. If Kubernetes or Terraform needs more time, use Weeks 41–42 as overflow before Phase 5. Quality over calendar — don't rush these.",
    markazTip: "Read GitHub Actions YAML structure and CI/CD theory. Docker conceptual architecture is also digestible reading — no terminal needed to understand containers at the conceptual level.",
    skills: [
      {id:"sk19",name:"GitHub Actions"},{id:"sk20",name:"CI/CD pipelines"},
      {id:"sk21",name:"Docker"},{id:"sk22",name:"Kubernetes"},{id:"sk23",name:"Terraform"},
    ],
    projects: [
      {id:"pr8",name:"Full DevOps Deployment Pipeline",weeks:"Wks 33–40"},
    ],
    weeklyPlan: [
      {label:"Weeks 33–34",topics:["GitHub Actions","CI/CD pipeline fundamentals"],proj:"CI/CD pipeline for Masjid Management System"},
      {label:"Weeks 35–36",topics:["Docker fundamentals","Containerizing applications"],proj:"Dockerize Islamic Bookstore Backend"},
      {label:"Weeks 37–38",topics:["Kubernetes basics","Deploying containers"],proj:"Kubernetes deployment for Masjid Management System"},
      {label:"Weeks 39–40",topics:["Terraform","Infrastructure as Code"],proj:"Terraform infrastructure for full app suite"},
    ],
  },
  {
    id: 5, label: "Phase 5", name: "Azure Cloud", icon: "☁",
    weeks: "41–46", color: "#63B3ED", dim: "#060F1A",
    duration: "6 Weeks", buffer: false,
    courses: ["Getting Started with Azure Cloud","Azure Networking Services","Learn Azure DevOps CI/CD Pipelines"],
    note: "💡 Azure's free tier is generous — spin up resources confidently. Always tear down after each project to avoid unexpected charges. Real infra, real discipline.",
    markazTip: "Study Azure architecture diagrams and VNet/networking theory. The Azure docs are well-written and approachable — great passive reading without needing a terminal.",
    skills: [
      {id:"sk24",name:"Azure compute + App Services"},{id:"sk25",name:"Azure Networking (VNets)"},
      {id:"sk26",name:"Load balancing"},{id:"sk27",name:"Azure DevOps pipelines"},
    ],
    projects: [
      {id:"pr9",name:"Islamic Learning Platform → Azure",weeks:"Wks 41–42"},
      {id:"pr10",name:"Masjid System secured on Azure",weeks:"Wks 43–44"},
      {id:"pr11",name:"Full-Stack Azure CI/CD Pipeline",weeks:"Wks 45–46"},
    ],
    weeklyPlan: [
      {label:"Weeks 41–42",topics:["Azure compute","App Services"],proj:"Deploy Islamic Learning Platform to Azure"},
      {label:"Weeks 43–44",topics:["Azure networking","VNets + load balancers"],proj:"Secure Masjid Management System on Azure"},
      {label:"Weeks 45–46",topics:["Azure DevOps pipelines","Cloud CI/CD"],proj:"Full-stack Azure deployment pipeline"},
    ],
  },
  {
    id: 6, label: "Phase 6", name: "AI Integration", icon: "◈",
    weeks: "47–52", color: "#B794F4", dim: "#0E0618",
    duration: "4–6 Weeks", buffer: false,
    courses: ["RAG in Azure with OpenAI","API Management for Generative AI"],
    note: "💡 Budget 6 weeks, not 4. RAG pipelines have a real learning curve and this is your capstone — it deserves full attention. Weeks 51–52 are for portfolio polish and showcase.",
    markazTip: "LLM fundamentals, embedding theory, and vector database concepts are genuinely fascinating reading that requires zero coding environment. Excellent Markaz reading material.",
    skills: [
      {id:"sk28",name:"Embeddings"},{id:"sk29",name:"Vector databases"},
      {id:"sk30",name:"RAG pipelines"},{id:"sk31",name:"Azure OpenAI"},{id:"sk32",name:"Secure AI endpoints"},
    ],
    projects: [
      {id:"pr12",name:"Islamic AI Knowledge API",weeks:"Wks 47–52"},
    ],
    weeklyPlan: [
      {label:"Weeks 47–48",topics:["Vector databases","Embeddings","RAG architecture"],proj:"Islamic AI Knowledge API — RAG pipeline build"},
      {label:"Weeks 49–50",topics:["API management","Secure AI endpoints"],proj:"Islamic AI Knowledge API — deploy to Azure"},
      {label:"Weeks 51–52",topics:["Documentation + polish","Portfolio + LinkedIn showcase"],proj:"Showcase all projects — GitHub portfolio site + LinkedIn"},
    ],
  },
];

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function StudyPlan() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [markazMode, setMarkazMode] = useState(false);
  const [openWeeks, setOpenWeeks] = useState({});
  const [checked, setChecked] = useState({ skills: {}, projects: {} });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=IBM+Plex+Mono:wght@400;600&family=DM+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("jalil-study-v1");
      if (saved) setChecked(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("jalil-study-v1", JSON.stringify(checked));
    } catch {}
  }, [checked, loaded]);

  const toggle = useCallback((type, id) => {
    setChecked(prev => ({ ...prev, [type]: { ...prev[type], [id]: !prev[type]?.[id] } }));
  }, []);

  const toggleWeek = useCallback((key) => {
    setOpenWeeks(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const phase = PHASES[activeIdx];
  const allSkills = PHASES.flatMap(p => p.skills);
  const allProjects = PHASES.flatMap(p => p.projects);
  const doneSkills = allSkills.filter(s => checked.skills?.[s.id]).length;
  const doneProjects = allProjects.filter(p => checked.projects?.[p.id]).length;
  const overallPct = Math.round(((doneSkills + doneProjects) / (allSkills.length + allProjects.length)) * 100) || 0;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#07090F", minHeight: "100vh", color: "#D0C8B8" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#0C1018;}
        ::-webkit-scrollbar-thumb{background:#202A3A;border-radius:2px;}
        .ptab{transition:all .18s ease;cursor:pointer;}
        .ptab:hover{opacity:.82;transform:translateY(-1px);}
        .wblk{transition:background .15s;cursor:pointer;}
        .wblk:hover{background:rgba(255,255,255,.03)!important;}
        .chk{transition:opacity .15s;cursor:pointer;}
        .chk:hover{opacity:.78;}
        .tog{transition:all .18s;cursor:pointer;}
        .tog:hover{opacity:.8;}
        @keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fi{animation:fi .25s ease;}
        .pbfill{transition:width .7s cubic-bezier(.4,0,.2,1);}
        .expand{animation:fi .2s ease;}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background: "linear-gradient(160deg,#0A0D16 0%,#0C1220 100%)", borderBottom: "1px solid #161E2E", padding: "18px 20px 14px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: ".22em", color: "#C9A84C", fontWeight: 600, textTransform: "uppercase", marginBottom: 5 }}>
                Abdul Jalil · Study Roadmap
              </div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(16px,2.8vw,24px)", color: "#EDE0C8", fontWeight: 700, lineHeight: 1.2 }}>
                Full-Stack → DevOps → Azure Cloud + AI
              </h1>
              <div style={{ fontSize: 11, color: "#3E5068", marginTop: 5, fontFamily: "'IBM Plex Mono', monospace" }}>
                52 weeks · 6 phases · 2 buffer weeks · 32 skills · 12 milestones
              </div>
            </div>

            {/* Markaz toggle */}
            <div className="tog" onClick={() => setMarkazMode(m => !m)} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "7px 13px",
              background: markazMode ? "#0D2010" : "#101520",
              border: `1px solid ${markazMode ? "#2ECC7150" : "#1E2A3A"}`,
              borderRadius: 20, userSelect: "none", flexShrink: 0,
            }}>
              <div style={{ width: 26, height: 15, borderRadius: 8, background: markazMode ? "#2ECC71" : "#1E2A3A", position: "relative", transition: "background .2s" }}>
                <div style={{ position: "absolute", top: 2, left: markazMode ? 13 : 2, width: 11, height: 11, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
              </div>
              <span style={{ fontSize: 11, color: markazMode ? "#2ECC71" : "#4A5A70", fontWeight: 500 }}>
                {markazMode ? "Markaz Mode ON" : "Markaz Mode"}
              </span>
            </div>
          </div>

          {/* Progress bars */}
          <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            {[
              { label: "Overall", done: overallPct, total: 100, val: `${overallPct}%`, color: "#C9A84C", pct: overallPct },
              { label: "Skills", done: doneSkills, total: allSkills.length, val: `${doneSkills}/${allSkills.length}`, color: "#4ECDC4", pct: Math.round((doneSkills/allSkills.length)*100) },
              { label: "Milestones", done: doneProjects, total: allProjects.length, val: `${doneProjects}/${allProjects.length}`, color: "#B794F4", pct: Math.round((doneProjects/allProjects.length)*100) },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, minWidth: 100 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "#3E5068", letterSpacing: ".1em", textTransform: "uppercase" }}>{s.label}</span>
                  <span style={{ fontSize: 10, color: s.color, fontFamily: "'IBM Plex Mono', monospace" }}>{s.val}</span>
                </div>
                <div style={{ height: 3, background: "#141E2E", borderRadius: 2, overflow: "hidden" }}>
                  <div className="pbfill" style={{ height: "100%", borderRadius: 2, width: `${s.pct}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PHASE NAV ── */}
      <div style={{ background: "#09090F", borderBottom: "1px solid #131B28", overflowX: "auto", padding: "10px 20px", display: "flex", gap: 5 }}>
        {PHASES.map((p, i) => {
          const isActive = i === activeIdx;
          const phDone = !p.buffer && p.skills.length > 0 &&
            p.skills.every(s => checked.skills?.[s.id]) &&
            p.projects.every(pr => checked.projects?.[pr.id]);
          return (
            <div key={p.id} className="ptab" onClick={() => setActiveIdx(i)} style={{
              flexShrink: 0, padding: p.buffer ? "5px 9px" : "6px 13px",
              borderRadius: 6, userSelect: "none",
              background: isActive ? p.color + "18" : "transparent",
              border: `1px solid ${isActive ? p.color + "80" : "#161E2E"}`,
              color: isActive ? p.color : p.buffer ? "#2E3848" : "#4A5A70",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
            }}>
              <span style={{ fontSize: p.buffer ? 9 : 10, fontFamily: "'IBM Plex Mono', monospace", fontWeight: isActive ? 600 : 400 }}>
                {p.label}
              </span>
              {!p.buffer && (
                <span style={{ fontSize: 8, opacity: .65 }}>Wk {p.weeks}</span>
              )}
              {phDone && <span style={{ fontSize: 8, color: "#2ECC71" }}>✓ done</span>}
            </div>
          );
        })}
      </div>

      {/* ── PHASE CONTENT ── */}
      <div className="fi" key={activeIdx} style={{ maxWidth: 1080, margin: "0 auto", padding: "18px 20px 32px" }}>

        {/* Phase header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 8, flexShrink: 0,
              background: phase.color + "18", border: `1px solid ${phase.color}35`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, color: phase.color,
            }}>{phase.icon}</div>
            <div>
              <div style={{ fontSize: 9, color: phase.color, fontWeight: 600, letterSpacing: ".18em", textTransform: "uppercase" }}>
                {phase.label} · {phase.duration}
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(16px,2.2vw,20px)", color: "#EDE0C8" }}>
                {phase.name}
              </h2>
            </div>
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: phase.color,
            background: phase.color + "12", border: `1px solid ${phase.color}25`,
            padding: "4px 12px", borderRadius: 20, flexShrink: 0,
          }}>
            {phase.buffer ? `Week ${phase.weeks}` : `Weeks ${phase.weeks}`}
          </div>
        </div>

        {/* Courses */}
        {phase.courses.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: "#3E5068", letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 6 }}>Udemy Courses</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {phase.courses.map((c, i) => (
                <div key={i} style={{ fontSize: 11, padding: "4px 10px", background: "#0E1420", border: "1px solid #1A2436", borderRadius: 4, color: "#7A8EA8" }}>
                  {c}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        <div style={{
          background: phase.buffer ? "#0D1016" : phase.dim,
          border: `1px solid ${phase.color}28`,
          borderLeft: `3px solid ${phase.color}`,
          borderRadius: "0 6px 6px 0",
          padding: "10px 14px", marginBottom: 14,
          fontSize: 12, color: "#8AA0B8", lineHeight: 1.65,
        }}>{phase.note}</div>

        {/* Markaz tip */}
        {markazMode && phase.markazTip && (
          <div className="expand" style={{
            background: "#081408", border: "1px solid #2ECC7130",
            borderLeft: "3px solid #2ECC71", borderRadius: "0 6px 6px 0",
            padding: "10px 14px", marginBottom: 14,
            fontSize: 12, color: "#5ACC8A", lineHeight: 1.65,
          }}>
            🕌 <strong style={{ color: "#2ECC71" }}>Markaz Overlap:</strong> {phase.markazTip}
          </div>
        )}

        {/* Main grid */}
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>

          {/* Left: Weekly plan */}
          <div style={{ flex: "1 1 340px", minWidth: 0 }}>
            <div style={{ fontSize: 9, color: "#3E5068", letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 8 }}>Weekly Breakdown</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {phase.weeklyPlan.map((block, i) => {
                const key = `${phase.id}-${i}`;
                const isOpen = !!openWeeks[key];
                return (
                  <div key={i} style={{ border: "1px solid #161E2E", borderLeft: `3px solid ${phase.color}`, borderRadius: "0 6px 6px 0", background: "#0C1018", overflow: "hidden" }}>
                    <div className="wblk" onClick={() => toggleWeek(key)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 13px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: phase.color, flexShrink: 0 }}>{block.label}</span>
                        {block.proj && (
                          <span style={{ fontSize: 10, color: "#2E3E52", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderLeft: "1px solid #161E2E", paddingLeft: 9 }}>
                            {block.proj.split(" — ")[0]}
                          </span>
                        )}
                      </div>
                      <span style={{ color: "#2E3E52", fontSize: 13, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .18s", flexShrink: 0, marginLeft: 6 }}>›</span>
                    </div>
                    {isOpen && (
                      <div className="expand" style={{ padding: "0 13px 11px", borderTop: "1px solid #161E2E" }}>
                        <div style={{ paddingTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                          {block.topics.map((t, j) => (
                            <div key={j} style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 12, color: "#8AA0B8" }}>
                              <span style={{ color: phase.color, flexShrink: 0, marginTop: 1, fontSize: 10 }}>▸</span>{t}
                            </div>
                          ))}
                          {block.proj && (
                            <div style={{ marginTop: 8, padding: "7px 10px", background: phase.color + "0E", border: `1px solid ${phase.color}20`, borderRadius: 5, fontSize: 11, color: phase.color, lineHeight: 1.5 }}>
                              📦 {block.proj}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Skills + Projects */}
          <div style={{ flex: "0 1 260px", minWidth: 220, display: "flex", flexDirection: "column", gap: 16 }}>

            {phase.skills.length > 0 && (
              <div>
                <div style={{ fontSize: 9, color: "#3E5068", letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 7 }}>Skills to Master</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {phase.skills.map(skill => {
                    const done = !!checked.skills?.[skill.id];
                    return (
                      <div key={skill.id} className="chk" onClick={() => toggle("skills", skill.id)} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                        background: done ? phase.color + "0E" : "#0C1018",
                        border: `1px solid ${done ? phase.color + "35" : "#161E2E"}`,
                        borderRadius: 5, fontSize: 12,
                        color: done ? phase.color + "AA" : "#8AA0B8",
                        textDecoration: done ? "line-through" : "none",
                      }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                          border: `1.5px solid ${done ? phase.color : "#202A3A"}`,
                          background: done ? phase.color : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {done && <span style={{ fontSize: 8, color: "#07090F", fontWeight: 700 }}>✓</span>}
                        </div>
                        {skill.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {phase.projects.length > 0 && (
              <div>
                <div style={{ fontSize: 9, color: "#3E5068", letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 7 }}>Project Milestones</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {phase.projects.map(proj => {
                    const done = !!checked.projects?.[proj.id];
                    return (
                      <div key={proj.id} className="chk" onClick={() => toggle("projects", proj.id)} style={{
                        padding: "10px 11px",
                        background: done ? phase.color + "12" : "#0C1018",
                        border: `1px solid ${done ? phase.color + "40" : "#161E2E"}`,
                        borderRadius: 6,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                            border: `1.5px solid ${done ? phase.color : "#202A3A"}`,
                            background: done ? phase.color : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {done && <span style={{ fontSize: 9, color: "#07090F", fontWeight: 700 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 500, color: done ? phase.color + "AA" : "#C0C8D0", textDecoration: done ? "line-through" : "none" }}>
                            {proj.name}
                          </span>
                        </div>
                        <div style={{ fontSize: 9, color: phase.color + "70", fontFamily: "'IBM Plex Mono', monospace", paddingLeft: 24 }}>
                          {proj.weeks}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ maxWidth: 1080, margin: "0 20px 24px", padding: "11px 16px", background: "#09090F", border: "1px solid #121A26", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 10, color: "#2E3E52", lineHeight: 1.7 }}>
          Mon–Thu: 1–2hrs study · Fri: build · Sat: optional · Sun: rest
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          {[
            { label: "Weeks", val: "52", color: "#C9A84C" },
            { label: "Projects", val: `${doneProjects}/12`, color: "#B794F4" },
            { label: "Skills", val: `${doneSkills}/32`, color: "#4ECDC4" },
            { label: "Done", val: `${overallPct}%`, color: "#68D391" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: s.color, fontWeight: 600 }}>{s.val}</div>
              <div style={{ fontSize: 8, color: "#2E3E52", letterSpacing: ".12em", textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
