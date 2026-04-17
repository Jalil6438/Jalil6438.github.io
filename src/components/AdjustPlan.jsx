import React from "react";
import { calcTimeline } from "../utils";

export default function AdjustPlan({ dark, T, goalYears, setGoalYears, goalMonths, setGoalMonths, memorizedAyahs, completedCount, timeline, dailyNew, onBack, rihlahScrollRef, userPlanMode, setUserPlanMode }){
  // Any slider/preset change in this screen means the user has deviated from
  // the Shaykh's default plan — flip to custom mode so the rest of the app
  // drives the batch from calcTimeline instead of the page-based default.
  const setYears=(y)=>{ setGoalYears(y); if(setUserPlanMode) setUserPlanMode("custom"); };
  const setMonths=(m)=>{ setGoalMonths(m); if(setUserPlanMode) setUserPlanMode("custom"); };
  const restoreDefaults=()=>{
    // Reset the goal back to the ~20-month Shaykh baseline, and flip mode.
    setGoalYears(1);
    setGoalMonths(8);
    if(setUserPlanMode) setUserPlanMode("shaykh");
  };
  const onDefaults=(typeof userPlanMode==="string")?userPlanMode!=="custom":true;
  return (
        <div ref={rihlahScrollRef} style={{flex:1,overflowY:"auto",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",padding:"16px 16px 120px"}} className="fi gold-particles">
          <div style={{marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <div className="sbtn" onClick={onBack} style={{padding:"6px 12px",background:dark?"rgba(255,255,255,0.04)":"#EADFC8",border:dark?"1px solid rgba(217,177,95,0.12)":"1px solid rgba(0,0,0,0.08)",borderRadius:8,fontSize:11,color:dark?"rgba(243,231,200,0.50)":"#6B645A"}}>← Back</div>
            <div className="sbtn" onClick={restoreDefaults} style={{padding:"6px 12px",background:onDefaults?"linear-gradient(90deg,#D4AF37,#F6E27A)":"rgba(212,175,55,0.10)",border:"1px solid rgba(212,175,55,0.35)",borderRadius:8,fontSize:11,fontWeight:700,color:onDefaults?"#060A07":(dark?"#E6B84A":"#6B4F00")}}>
              {onDefaults?"✓ Default Settings":"Default Settings"}
            </div>
          </div>
          <div style={{padding:"22px 18px",borderRadius:20,marginBottom:16,textAlign:"center",position:"relative",overflow:"hidden",background:dark?"linear-gradient(180deg,rgba(15,26,43,0.97) 0%,rgba(12,21,38,0.99) 100%)":"#EADFC8",border:dark?"1px solid rgba(217,177,95,0.22)":"1px solid rgba(0,0,0,0.08)",boxShadow:dark?"0 10px 40px rgba(0,0,0,0.40),0 0 20px rgba(217,177,95,0.08)":"0 4px 16px rgba(0,0,0,0.06)"}}>
            <div style={{position:"absolute",inset:0,pointerEvents:"none",background:dark?"radial-gradient(circle at 50% 20%,rgba(212,175,55,0.08) 0%,transparent 50%)":"none"}}/>
            <div style={{position:"relative",zIndex:1}}>
              <div style={{fontSize:13,color:dark?"rgba(243,231,200,0.50)":"#6B645A",marginBottom:8}}>Complete Your Hifz In</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,color:dark?"#F6E27A":"#D4AF37",fontWeight:700,marginBottom:10,textShadow:dark?"0 0 18px rgba(246,226,122,0.15)":"none"}}>
                {goalYears} Year{goalYears!==1?"s":""}{goalMonths>0?<span style={{fontSize:24,marginLeft:8}}>{goalMonths} Month{goalMonths!==1?"s":""}</span>:""}
              </div>
              <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.35)":"#6B645A"}}>Your path to completion</div>
            </div>
          </div>
          <div style={{padding:"16px 18px",borderRadius:16,background:dark?"rgba(255,255,255,0.02)":"#EADFC8",border:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(0,0,0,0.08)",marginBottom:16,boxShadow:dark?"0 4px 16px rgba(0,0,0,0.22),0 0 10px rgba(217,177,95,0.05)":"0 2px 8px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:12,color:dark?"rgba(243,231,200,0.50)":"#6B645A"}}>Base Timeline</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,color:dark?"#E6B84A":"#D4AF37",fontWeight:600}}>{goalYears} Year{goalYears!==1?"s":""}</span>
            </div>
            <input type="range" min={0} max={10} value={goalYears} onChange={e=>setYears(Number(e.target.value))} style={{width:"100%",marginBottom:16}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:12,color:dark?"rgba(243,231,200,0.50)":"#6B645A"}}>Extra Buffer</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,color:dark?"#E6B84A":"#D4AF37",fontWeight:600}}>+{goalMonths} Month{goalMonths!==1?"s":""}</span>
            </div>
            <input type="range" min={0} max={11} value={goalMonths} onChange={e=>setMonths(Number(e.target.value))} style={{width:"100%"}}/>
          </div>
          <div style={{padding:"16px 18px",borderRadius:16,background:dark?"rgba(255,255,255,0.02)":"#EADFC8",border:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(0,0,0,0.08)",marginBottom:16,boxShadow:dark?"0 4px 16px rgba(0,0,0,0.22),0 0 10px rgba(217,177,95,0.05)":"0 2px 8px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}><span style={{fontSize:14}}>📖</span><span style={{fontSize:13,color:dark?"rgba(243,231,200,0.60)":"#2D2A26"}}>{dailyNew} ayahs per day</span></div>
            <div style={{height:1,background:dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.25) 50%,rgba(217,177,95,0) 100%)":"linear-gradient(90deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0.08) 50%,rgba(0,0,0,0) 100%)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",position:"relative"}}>
              <div style={{position:"absolute",inset:0,pointerEvents:"none",background:dark?"radial-gradient(ellipse at 30% 50%,rgba(212,175,55,0.06) 0%,transparent 60%)":"none"}}/>
              <span style={{fontSize:16,position:"relative",zIndex:1}}>📆</span>
              <span style={{fontSize:16,color:dark?"#F6E27A":"#D4AF37",fontWeight:700,position:"relative",zIndex:1,textShadow:dark?"0 0 10px rgba(246,226,122,0.20)":"none"}}>~{timeline.daysPerJuz} days per juz</span>
            </div>
            <div style={{height:1,background:dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.25) 50%,rgba(217,177,95,0) 100%)":"linear-gradient(90deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0.08) 50%,rgba(0,0,0,0) 100%)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}><span style={{fontSize:14}}>📊</span><span style={{fontSize:13,color:dark?"rgba(243,231,200,0.45)":"#2D2A26"}}>{timeline.juzPerMonth} juz per month</span></div>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:dark?"rgba(217,177,95,0.55)":"#6B645A",fontWeight:600,letterSpacing:".08em",marginBottom:12}}>Choose Your Pace</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              {[{y:1,label:"Intense",icon:"⚡"},{y:2,label:"Focused",icon:"🔥"}].map(p=>{
                const t=calcTimeline(p.y,memorizedAyahs,0,null,completedCount);const isA=p.y===goalYears;
                return (<div key={p.y} className="sbtn" onClick={()=>{setYears(p.y);setMonths(0);}} style={{padding:"12px 8px",borderRadius:14,textAlign:"center",background:isA?(dark?"rgba(230,184,74,0.10)":"rgba(212,175,55,0.12)"):(dark?"rgba(255,255,255,0.02)":"#EADFC8"),border:`1px solid ${isA?(dark?"rgba(232,200,120,0.50)":"#D4AF37"):(dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.08)")}`,boxShadow:isA?"0 0 16px rgba(230,184,74,0.15)":"none"}}>
                  <div style={{fontSize:13,color:isA?(dark?"#F6E27A":"#D4AF37"):(dark?"rgba(243,231,200,0.50)":"#2D2A26"),fontWeight:700}}>{p.y} Year{p.y!==1?"s":""}</div>
                  <div style={{fontSize:11,color:isA?(dark?"#E6B84A":"#D4AF37"):(dark?"rgba(243,231,200,0.30)":"#6B645A"),fontWeight:600,marginTop:2}}>{Math.round(parseFloat(t.ayahsPerDay))} ayahs/day</div>
                  <div style={{fontSize:9,color:isA?(dark?"rgba(230,184,74,0.65)":"#D4AF37"):(dark?"rgba(243,231,200,0.22)":"#6B645A"),marginTop:6}}>{p.icon} {p.label}</div>
                </div>);
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[{y:3,label:"Balanced",icon:"✅"},{y:5,label:"Light",icon:"🧘"},{y:7,label:"Gentle",icon:"🌙"}].map(p=>{
                const t=calcTimeline(p.y,memorizedAyahs,0,null,completedCount);const isA=p.y===goalYears;
                return (<div key={p.y} className="sbtn" onClick={()=>{setYears(p.y);setMonths(0);}} style={{padding:"12px 8px",borderRadius:14,textAlign:"center",background:isA?(dark?"rgba(230,184,74,0.10)":"rgba(212,175,55,0.12)"):(dark?"rgba(255,255,255,0.02)":"#EADFC8"),border:`1px solid ${isA?(dark?"rgba(232,200,120,0.50)":"#D4AF37"):(dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.08)")}`,boxShadow:isA?"0 0 16px rgba(230,184,74,0.15)":"none"}}>
                  <div style={{fontSize:13,color:isA?(dark?"#F6E27A":"#D4AF37"):(dark?"rgba(243,231,200,0.50)":"#2D2A26"),fontWeight:700}}>{p.y} Year{p.y!==1?"s":""}</div>
                  <div style={{fontSize:11,color:isA?(dark?"#E6B84A":"#D4AF37"):(dark?"rgba(243,231,200,0.30)":"#6B645A"),fontWeight:600,marginTop:2}}>{Math.round(parseFloat(t.ayahsPerDay))} ayahs/day</div>
                  <div style={{fontSize:9,color:isA?(dark?"rgba(230,184,74,0.65)":"#D4AF37"):(dark?"rgba(243,231,200,0.22)":"#6B645A"),marginTop:6}}>{p.icon} {p.label}</div>
                </div>);
              })}
            </div>
          </div>
          <div style={{textAlign:"center",padding:"14px 10px",marginBottom:20}}>
            <div style={{fontSize:12,color:"rgba(243,231,200,0.35)",lineHeight:1.7}}>This plan requires consistency, not perfection.<br/>Small daily effort leads to completion — <span style={{fontFamily:"'Amiri',serif",fontSize:14,color:"rgba(230,184,74,0.50)"}}>بِإذْنِ اللَّهِ</span></div>
          </div>
          <div className="sbtn" onClick={onBack} style={{width:"100%",padding:"15px",borderRadius:16,textAlign:"center",fontSize:15,fontWeight:700,color:"#0B1220",background:"linear-gradient(180deg,#E6B84A,#D4A62A)",boxShadow:"0 8px 22px rgba(230,184,74,0.25),0 0 12px rgba(230,184,74,0.10)"}}>
            Save & Return
          </div>
        </div>
  );
}
