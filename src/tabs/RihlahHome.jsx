import { useState, useEffect, useRef } from "react";
import RihlahProgressPath from "../components/RihlahProgressPath";

// Single activity row. Measures text width on mount — if the text overflows
// its container, it scrolls horizontally in a gentle marquee. Short entries
// that already fit stay static.
function ActivityRow({ ev, dark, timeAgo }) {
  const boxRef = useRef(null);
  const textRef = useRef(null);
  const [overflow, setOverflow] = useState(false); // does the text overflow?
  const [textWidth, setTextWidth] = useState(0); // px — single copy width
  useEffect(() => {
    const tick = () => {
      const box = boxRef.current, text = textRef.current;
      if (!box || !text) return;
      const tw = text.scrollWidth;
      const over = tw - box.clientWidth > 2;
      setOverflow(over);
      setTextWidth(tw);
    };
    tick();
    window.addEventListener("resize", tick);
    return () => window.removeEventListener("resize", tick);
  }, [ev.text]);
  // Speed ~40 px/s (slower, easier to read). Duration scales with text width
  // so longer entries take longer, not move faster.
  const duration = overflow ? Math.max(10, Math.round((textWidth + 40) / 40)) : 0;
  const isReminder = ev.type === "reminder";
  const textStyleBase = {
    display: "inline-block",
    fontSize: 12,
    color: isReminder
      ? (dark ? "#F87171" : "#B91C1C")
      : (dark ? "rgba(243,231,200,0.85)" : "#2D2A26"),
    fontWeight: isReminder ? 600 : 500,
    whiteSpace: "nowrap",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div ref={boxRef} style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        {overflow ? (
          <div
            style={{
              display: "inline-flex",
              willChange: "transform",
              animation: `activity-marquee-${ev.ts} ${duration}s linear infinite`,
            }}
          >
            <span style={{ ...textStyleBase, paddingRight: 40 }}>{ev.text}</span>
            <span style={{ ...textStyleBase, paddingRight: 40 }}>{ev.text}</span>
            <style>{`
              @keyframes activity-marquee-${ev.ts} {
                0% { transform: translateX(0); }
                100% { transform: translateX(-${textWidth + 40}px); }
              }
            `}</style>
          </div>
        ) : (
          <div ref={textRef} style={textStyleBase}>{ev.text}</div>
        )}
        {/* Hidden measurer — only used when not overflowing to capture natural width on first paint */}
        {!overflow && (
          <div ref={textRef} style={{ ...textStyleBase, position: "absolute", visibility: "hidden", pointerEvents: "none" }} aria-hidden="true">{ev.text}</div>
        )}
      </div>
      <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.35)" : "#8B7355", flexShrink: 0, fontFamily: "'DM Sans',sans-serif" }}>{timeAgo(ev.ts)}</div>
    </div>
  );
}



export default function RihlahHome({
  dark, T,
  rihlahScrollRef,
  completedCount, sessionJuz, sessionIdx, totalSV, timeline,
  goalYears, goalMonths, pct,
  SESSIONS, dailyChecks, toggleCheck,
  streak, checkedCount,
  dailyNew, allChecked,
  setRihlahTab,
  haramainMeta,
  recentActivity,
  userPlanMode,
  goalLabel: goalLabelProp,
}) {
  const isShaykhPlan = userPlanMode !== "custom";
  // Relative time formatter: "just now" / "8 mins ago" / "Yesterday" / "3 days ago"
  function timeAgo(ts){
    if(!ts) return "";
    const diff=Date.now()-ts;
    const mins=Math.floor(diff/60000);
    if(mins<1) return "just now";
    if(mins<60) return `${mins} min${mins===1?"":"s"} ago`;
    const hours=Math.floor(mins/60);
    if(hours<24) return `${hours} hour${hours===1?"":"s"} ago`;
    const days=Math.floor(hours/24);
    if(days===1) return "Yesterday";
    if(days<7) return `${days} days ago`;
    const weeks=Math.floor(days/7);
    if(weeks<4) return `${weeks} week${weeks===1?"":"s"} ago`;
    const months=Math.floor(days/30);
    return `${months} month${months===1?"":"s"} ago`;
  }
  const username=localStorage.getItem("rihlat-username")||"Abdul Jalil";
  const initials=username.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const joinYear=2026;
  const goalLabel = goalLabelProp || (goalYears===0?`${goalMonths}-Month Hafiz`:goalYears<=1?"1-Year Hafiz":goalYears<=3?"3-Year Hafiz":"Long-Term Hafiz");
  const radius=52, circ=2*Math.PI*radius;
  const filled=circ*(pct/100);
  const activeSess=SESSIONS.find(s=>!dailyChecks[s.id])||SESSIONS[SESSIONS.length-1];
  const activeDone=!!dailyChecks[activeSess.id];
  const activeSteps=activeSess?.steps||[];

  // ── Enhanced Badge Components ──
  // Progressive badge glow — `progress` is 0..1, controls opacity, grayscale, and glow intensity.
  // earned = progress >= 1. Smooth ramp lets an almost-earned badge already look alive.
  const progressStyles=(progress)=>{
    const p=Math.max(0,Math.min(1,progress||0));
    return {
      opacity: 0.15 + 0.85 * p,
      grayscale: (1 - p) * 0.8,
      glowAlpha: 0.22 * p,
      bgAlpha: 0.06 * p,
    };
  };
  // Badge tier system — streak tiers promote through slots
  const STREAK_TIERS=[
    {min:0,target:7,img:"/badge-streak-7.png",label:"7 Days"},
    {min:7,target:14,img:"/badge-streak-14.png",label:"14 Days"},
    {min:14,target:21,img:"/badge-streak-21.png",label:"21 Days"},
    {min:21,target:30,img:"/badge-streak-30.png",label:"30 Days"},
    {min:30,target:40,img:"/badge-habituated.png",label:"Habituated"},
    {min:40,target:60,img:"/badge-devotion-60.png",label:"Devotion"},
    {min:60,target:90,img:"/badge-mastery-90.png",label:"Mastery"},
  ];
  const currentTierIdx=STREAK_TIERS.findIndex(t=>(streak||0)<t.target);
  const currentTier=STREAK_TIERS[currentTierIdx>=0?currentTierIdx:STREAK_TIERS.length-1];
  const nextTier=STREAK_TIERS[currentTierIdx>=0?Math.min(currentTierIdx+1,STREAK_TIERS.length-1):STREAK_TIERS.length-1];
  const streakProgress=currentTier.target>currentTier.min?((streak||0)-currentTier.min)/(currentTier.target-currentTier.min):1;
  const nextProgress=nextTier.target>nextTier.min?Math.max(0,((streak||0)-nextTier.min)/(nextTier.target-nextTier.min)):0;

  const JuzBadge=({count,juzProgress})=>{
    const p=Math.max(0,Math.min(1,juzProgress||0));
    const pPct=Math.round(p*100);
    const working=(count||0)<30?(count||0)+1:30;
    const done=(count||0)>=30;
    const juzImg=done?"/badge-hafiz.png":working<=15?`/badge-juz-${working}.png`:"/badge-juz-15.png";
    return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,borderRadius:16,padding:"8px",marginTop:8}}>
      <img src={juzImg} alt="" style={{width:85,height:85,objectFit:"contain",flexShrink:0,
        opacity:0.08+0.92*p,
        filter:`grayscale(${(1-p)*0.9}) drop-shadow(0 0 ${35*p}px rgba(52,211,153,${1*p})) drop-shadow(0 0 ${18*p}px rgba(100,255,180,${0.8*p})) drop-shadow(0 0 ${8*p}px rgba(200,255,230,${0.5*p})) brightness(${1+0.6*p})`,
        transition:"all .4s ease"}}/>
      <span style={{fontSize:8,color:`rgba(255,255,255,${0.06+0.94*p})`,fontWeight:600,transition:"color .4s ease"}}>{done?"Hafiz!":`Juz ${working}`}</span>
    </div>
    );
  };
  const StreakSlot=({progress,tier})=>{
    const p=Math.max(0,Math.min(1,progress||0));
    return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,borderRadius:16,padding:"8px"}}>
      <img src={tier.img} alt="" style={{width:92,height:92,objectFit:"contain",flexShrink:0,
        opacity:0.08+0.92*p,
        filter:`grayscale(${(1-p)*0.9}) drop-shadow(0 0 ${35*p}px rgba(249,115,22,${1*p})) drop-shadow(0 0 ${18*p}px rgba(255,200,50,${0.8*p})) drop-shadow(0 0 ${8*p}px rgba(255,255,200,${0.5*p})) brightness(${1+0.6*p})`,
        transition:"all .4s ease"}}/>
      <span style={{fontSize:8,color:`rgba(255,255,255,${0.06+0.94*p})`,fontWeight:600,transition:"color .4s ease"}}>{tier.label}</span>
    </div>
    );
  };
  const HifzGoalBadge=({progress})=>{
    const p=Math.max(0,Math.min(1,progress||0));
    const pPct=Math.round(p*100);
    return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,borderRadius:16,padding:"8px",marginTop:4}}>
      <img src="/badge-hafiz.png" alt="" style={{width:92,height:92,objectFit:"contain",flexShrink:0,
        opacity:0.08+0.92*p,
        filter:`grayscale(${(1-p)*0.9}) drop-shadow(0 0 ${35*p}px rgba(212,175,55,${1*p})) drop-shadow(0 0 ${18*p}px rgba(255,220,100,${0.8*p})) drop-shadow(0 0 ${8*p}px rgba(255,255,200,${0.5*p})) brightness(${1+0.6*p})`,
        transition:"all .4s ease"}}/>
      <span style={{fontSize:8,color:`rgba(255,255,255,${0.06+0.94*p})`,fontWeight:600,transition:"color .4s ease"}}>Hifz Goal</span>
    </div>
    );
  };

  return (
    <div ref={rihlahScrollRef} style={{flex:1,overflowY:"auto",background:dark?"radial-gradient(circle at top, rgba(32,44,90,0.35) 0%, rgba(8,12,24,1) 45%, rgba(4,7,15,1) 100%)":"#F3E9D2"}} className="fi">

      {/* ── AMBIENT GLOW ── */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        <div style={{position:"absolute",top:"10%",left:"15%",width:300,height:300,background:"rgba(14,40,60,0.12)",borderRadius:"50%",filter:"blur(60px)"}}/>
        <div style={{position:"absolute",bottom:"25%",right:"10%",width:250,height:250,background:"rgba(212,175,55,0.05)",borderRadius:"50%",filter:"blur(60px)"}}/>
      </div>

      {/* Profile header removed — now in universal header */}

      <div style={{padding:`12px 14px ${haramainMeta?"240px":"120px"}`,position:"relative",zIndex:1}}>

      {/* ── YOUR MEMORIZATION JOURNEY — Progress Path ── */}
      <RihlahProgressPath dark={dark} T={T} completedCount={completedCount} sessionJuz={sessionJuz} timeline={timeline} pct={pct} goalYears={goalYears} goalMonths={goalMonths} goalLabel={goalLabel}/>

      {/* ── DAILY GOALS + NAV — single card ── */}
      <div style={{background:dark?"linear-gradient(135deg,rgba(30,35,50,0.9) 0%,rgba(20,25,40,0.7) 100%)":"#EADFC8",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,boxShadow:dark?"0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)":"0 4px 16px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.5)",padding:"12px",marginTop:24,marginBottom:8}}>

        {/* ── Nav buttons ── */}
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <div className="sbtn" onClick={()=>setRihlahTab("juz")} style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:dark?"1px solid rgba(74,222,128,0.15)":"1px solid rgba(0,0,0,0.08)",borderRadius:10}}>
            <span style={{fontSize:16}}>📖</span>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:dark?"#EDE8DC":"#2D2A26"}}>My Memorization</div>
              <div style={{fontSize:8,color:dark?"rgba(255,255,255,0.30)":"#6B645A"}}>Track progress</div>
            </div>
          </div>
          <div className="sbtn" onClick={()=>setRihlahTab("timeline")} style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:dark?"1px solid rgba(240,192,64,0.15)":"1px solid rgba(0,0,0,0.08)",borderRadius:10}}>
            <span style={{fontSize:16}}>⏱️</span>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:dark?"#EDE8DC":"#2D2A26"}}>My Plan</div>
              <div style={{fontSize:8,color:dark?"rgba(255,255,255,0.30)":"#6B645A"}}>Hifz timeline</div>
            </div>
          </div>
        </div>

        {/* ── Gold divider ── */}
        <div style={{position:"relative",height:1,marginBottom:16}}>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent 0%,rgba(201,166,70,0.6) 50%,transparent 100%)"}}/>
        </div>

        {/* ── Daily Goals ── */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.7)",fontWeight:700}}>Your Daily Plan</div>
          <div style={{display:"flex",alignItems:"baseline",gap:4}}>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:24,color:"#F0C040",fontWeight:700,lineHeight:1}}>{checkedCount}</span>
            <span style={{fontSize:13,color:"rgba(255,255,255,0.35)"}}> of {SESSIONS.length}</span>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginLeft:4}}>Sessions Completed</span>
          </div>
        </div>
        <div style={{height:5,background:"rgba(255,255,255,0.08)",borderRadius:999,overflow:"hidden",marginBottom:12}}>
          <div style={{height:"100%",width:`${Math.round((checkedCount/SESSIONS.length)*100)}%`,background:"linear-gradient(90deg,#D4AF37,#E6B84A)",borderRadius:999,boxShadow:"0 0 10px rgba(212,175,55,0.3)",transition:"width .5s"}}/>
        </div>
        <div style={{background:"rgba(255,255,255,0.02)",padding:"14px 12px",borderRadius:16,boxShadow:"inset 0 0 10px rgba(255,255,255,0.02)"}}>
          {(()=>{
            const planRows=[
              {id:"fajr",label:"Begin your memorization",desc:isShaykhPlan?"Memorize 1 mushaf page — the foundation is repetition":`Memorize ${dailyNew} new ayahs — the foundation is repetition`,glow:"rgba(240,192,64,0.35)"},
              {id:"dhuhr",label:"Review what you learned",desc:"Go over what you memorized earlier",glow:"rgba(246,166,35,0.30)"},
              {id:"asr",label:"Strengthen your memorization",desc:"Revision scales as you progress",glow:"rgba(78,205,196,0.25)"},
              {id:"maghrib",label:"Sit with the Qur'an and listen",desc:"Listen and follow along (15–20 min)",glow:"rgba(183,148,244,0.25)"},
              {id:"isha",label:"Complete today's journey",desc:"Recite everything one final time",glow:"rgba(104,211,145,0.25)"},
            ];
            return planRows.map((row,i,arr)=>{
              const sess=SESSIONS.find(s=>s.id===row.id);
              const done=!!dailyChecks[row.id];
              const isActive=row.id===activeSess?.id&&!done;
              return (
                <div key={row.id}>
                  <div className="sbtn" onClick={()=>toggleCheck(row.id)} style={{padding:"10px 8px",cursor:"pointer",borderRadius:10,background:done?`linear-gradient(90deg,${sess?.color||"#4ADE80"}22 0%,${sess?.color||"#4ADE80"}08 100%)`:"transparent",border:`1px solid ${done?(sess?.color||"#4ADE80")+"55":"transparent"}`,boxShadow:done?`inset 0 0 14px ${sess?.color||"#4ADE80"}18`:"none",transition:"all .2s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:30,height:30,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,background:`radial-gradient(circle,${row.glow} 0%,transparent 70%)`,filter:`drop-shadow(0 0 ${done?10:6}px ${row.glow})`,position:"relative"}}>
                        {sess?.icon}
                        {done&&<div style={{position:"absolute",bottom:-2,right:-2,width:14,height:14,borderRadius:"50%",background:sess?.color||"#4ADE80",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",fontWeight:800,boxShadow:`0 0 6px ${sess?.color||"#4ADE80"}80`}}>✓</div>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600}}>
                          <span style={{color:isActive?"#F0C040":done?(sess?.color||"#4ADE80"):"#E6B84A",textShadow:isActive?"0 0 10px rgba(240,192,64,0.30)":done?`0 0 10px ${sess?.color||"#4ADE80"}55`:"0 0 10px rgba(230,184,74,0.25)"}}>{sess?.time||row.id}</span>{" "}
                          <span style={{fontWeight:400,color:done?"rgba(243,231,200,0.85)":"rgba(243,231,200,0.55)"}}>— {row.label}</span>
                        </div>
                        <div style={{fontSize:11,color:done?"rgba(243,231,200,0.55)":"rgba(243,231,200,0.30)",marginTop:2}}>{row.desc}</div>
                      </div>
                    </div>
                  </div>
                  {i<arr.length-1&&<div style={{height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.30) 50%,rgba(217,177,95,0) 100%)"}}/>}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Nav buttons moved to after Overall Progress */}


      {/* ── 5. ACTIVE SESSION CHECKLIST — emphasized so the current step stands out ── */}
      <div style={{background:dark?`linear-gradient(135deg,rgba(30,35,50,0.95) 0%,rgba(20,25,40,0.85) 100%), radial-gradient(circle at 50% 0%,${activeSess.color}22 0%,transparent 60%)`:"#EADFC8",backdropFilter:"blur(20px)",border:`1.5px solid ${activeSess.color}66`,borderRadius:22,boxShadow:dark?`0 12px 40px rgba(0,0,0,0.45),0 0 28px ${activeSess.color}33,inset 0 1px 0 ${activeSess.color}22`:"0 6px 22px rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,0.5)",padding:"14px",marginBottom:10,transform:"scale(1.01)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:36,height:36,borderRadius:12,background:`linear-gradient(135deg,${activeSess.color}88,${activeSess.color}44)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 12px ${activeSess.color}40`}}>
              <span style={{fontSize:18}}>{activeSess.icon}</span>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.9)",letterSpacing:".05em",textTransform:"uppercase"}}>{activeSess.time}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:1}}>{activeSess.title}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",gap:3}}>
              {SESSIONS.map(s=>(
                <div key={s.id} style={{width:6,height:6,borderRadius:"50%",background:dailyChecks[s.id]?s.color:"rgba(255,255,255,0.12)",transition:"background .3s"}}/>
              ))}
            </div>
            <div className="sbtn" onClick={()=>toggleCheck(activeSess.id)} style={{fontSize:9,padding:"5px 14px",background:activeDone?"#4ADE80":"rgba(255,255,255,0.06)",border:activeDone?"1px solid rgba(74,222,128,0.4)":"1px solid rgba(255,255,255,0.1)",borderRadius:20,color:activeDone?"#052e16":"rgba(255,255,255,0.5)",fontWeight:700,boxShadow:activeDone?"0 0 12px rgba(74,222,128,0.3)":"none",transition:"all .2s"}}>
              {activeDone?"✓ Done":`Complete ${activeSess.time}`}
            </div>
          </div>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5}}>
            <span>{checkedCount} / {SESSIONS.length} sessions complete</span>
            {activeSess.id==="fajr"&&<span style={{color:"#F0C040",fontWeight:600}}>{isShaykhPlan?"1 page today":`${dailyNew} ayahs today`}</span>}
          </div>
          <div style={{height:6,background:"rgba(255,255,255,0.08)",borderRadius:999,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.round((checkedCount/SESSIONS.length)*100)}%`,background:"linear-gradient(90deg,rgba(240,192,64,0.95),rgba(240,192,64,0.75))",borderRadius:999,boxShadow:"0 0 10px rgba(240,192,64,0.3)",transition:"width .5s"}}/>
          </div>
        </div>
        {allChecked?(
          <div style={{textAlign:"center",padding:"14px 0"}}>
            <div style={{fontSize:24,marginBottom:6}}>🌙</div>
            <div style={{fontSize:14,fontWeight:700,color:"#F0C040",marginBottom:4}}>All Sessions Complete — MashaAllah!</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>May Allah accept your worship today.</div>
          </div>
        ):(
          activeSteps.map((step,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"4px 10px",fontSize:12,color:activeDone?(dark?"rgba(245,231,184,0.6)":"rgba(40,30,10,0.50)"):(dark?"rgba(255,255,255,0.85)":"#2D2A26"),lineHeight:1.5}}>
              <span style={{flexShrink:0,color:dark?"rgba(217,177,95,0.55)":"rgba(140,100,20,0.55)",marginTop:1}}>•</span>
              <span style={{opacity:activeDone?0.65:1}}>{step}</span>
            </div>
          ))
        )}
      </div>

      {/* ── REMINDER BANNER ── */}
      {(()=>{
        try{
          const r=JSON.parse(localStorage.getItem("jalil-hifz-reminder")||"null");
          if(!r||!r.text) return null;
          // Only show if from today AND Fajr hasn't been checked off yet
          if(r.ts&&new Date(r.ts).toDateString()!==new Date().toDateString()) return null;
          if(dailyChecks?.fajr) return null;
          return (
            <div style={{background:dark?"rgba(229,83,75,0.08)":"rgba(229,83,75,0.06)",border:"1px solid rgba(229,83,75,0.25)",borderRadius:14,padding:"12px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:16,flexShrink:0}}>⏳</span>
              <span style={{fontSize:12,color:dark?"rgba(243,231,200,0.85)":"#2D2A26",fontWeight:500}}>{r.text}</span>
            </div>
          );
        }catch{return null;}
      })()}

      {/* ── 6. TODAY'S ACTIVITY ──
          Entries persist until the next Fajr, not until midnight. We
          approximate Fajr as 5 AM local (no prayer-time API wired yet); a
          reminder from 11 PM yesterday still shows at 3 AM today, and drops
          off once the device passes 5 AM. */}
      {(()=>{
        const FAJR_HOUR=5;
        const now=new Date();
        const lastFajr=new Date(now);
        lastFajr.setHours(FAJR_HOUR,0,0,0);
        if(lastFajr>now) lastFajr.setDate(lastFajr.getDate()-1);
        const lastFajrTs=lastFajr.getTime();
        const todayActivity=(recentActivity||[]).filter(ev=>ev.ts&&ev.ts>=lastFajrTs);
        return (
        <div style={{background:dark?"linear-gradient(135deg,rgba(30,35,50,0.9) 0%,rgba(20,25,40,0.7) 100%)":"#EADFC8",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,boxShadow:dark?"0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)":"0 4px 16px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.5)",padding:"16px 18px",marginBottom:10}}>
          <div style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:dark?"rgba(255,255,255,0.7)":"#6B645A",fontWeight:700,marginBottom:14}}>Today's Activity</div>
          {todayActivity.length>0?(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {todayActivity.slice(0,7).map((ev,i)=>(
                <ActivityRow key={`${ev.ts}-${i}`} ev={ev} dark={dark} timeAgo={timeAgo} />
              ))}
            </div>
          ):(
            <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.35)":"#8B7355",textAlign:"center",padding:"14px 0",fontStyle:"italic"}}>
              Complete a session and it will show up here.
            </div>
          )}
        </div>
        );
      })()}

      {/* ── 7. BADGES ── */}
      <div style={{background:dark?"linear-gradient(135deg,rgba(30,35,50,0.9) 0%,rgba(20,25,40,0.7) 100%)":"#EADFC8",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,boxShadow:dark?"0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)":"0 4px 16px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.5)",padding:"12px 14px",marginBottom:10,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 12% 18%, rgba(240,192,64,0.08) 0, transparent 20%), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.04) 0, transparent 16%)"}}/>
        <div style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.7)",fontWeight:700,marginBottom:10,position:"relative",zIndex:1}}>Badges Earned</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,position:"relative",zIndex:1,padding:"2px 4px"}}>
          <JuzBadge count={completedCount||0} juzProgress={totalSV>0?sessionIdx/totalSV:(completedCount>0?1:0)}/>
          <StreakSlot progress={streakProgress>0?Math.max(0.3,Math.pow(streakProgress,0.5)):0} tier={currentTier}/>
          <HifzGoalBadge progress={(completedCount||0)>0?Math.min(1,(completedCount||0)/30):0}/>
        </div>
      </div>

      {/* Nav buttons moved to after Overall Progress */}

      </div>
    </div>
  );
}
