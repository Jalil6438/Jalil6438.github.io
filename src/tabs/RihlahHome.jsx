import RihlahProgressPath from "../components/RihlahProgressPath";

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
}) {
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
  const goalLabel=goalYears===0?`${goalMonths}-Month Hafiz`:goalYears<=1?"1-Year Hafiz":goalYears<=3?"3-Year Hafiz":"Long-Term Hafiz";
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
  const JuzBadge=({count,juzProgress})=>{
    const p=Math.max(0,Math.min(1,juzProgress||0));
    const pPct=Math.round(p*100);
    const working=(count||0)<30?(count||0)+1:30;
    const done=(count||0)>=30;
    return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",borderRadius:16,padding:"12px"}}>
      <div style={{position:"relative",width:52,height:52,marginBottom:6,borderRadius:"50%",overflow:"hidden",border:"1.5px solid rgba(110,231,183,0.25)"}}>
        <div style={{position:"absolute",inset:0,background:"#0A2E1B"}}/>
        <div style={{position:"absolute",top:0,left:0,bottom:0,width:`${pPct}%`,
          background:"linear-gradient(180deg,#34D399 0%,#059669 100%)",
          boxShadow:p>0?`4px 0 18px rgba(52,211,153,0.7), 0 0 12px rgba(52,211,153,0.5), -2px 0 8px rgba(52,211,153,0.3)`:"none",
          transition:"width .5s ease"}}/>
        <div style={{position:"relative",zIndex:1,width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:18,fontWeight:700,color:`rgba(255,255,255,${0.06+0.94*p})`,lineHeight:1,transition:"color .4s ease"}}>{working}</span>
          <span style={{fontSize:8,fontWeight:600,color:`rgba(167,243,208,${0.05+0.95*p})`,transition:"color .4s ease"}}>Juz</span>
        </div>
      </div>
      <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.75)",textAlign:"center"}}>{done?"Hafiz!":count>0?`${count} Complete`:`${pPct}%`}</div>
    </div>
    );
  };
  const StreakBadge=({progress})=>{
    const p=Math.max(0,Math.min(1,progress||0));
    const img=streak>=30?"/badge-streak-30.png":streak>=21?"/badge-streak-21.png":streak>=14?"/badge-streak-14.png":"/badge-streak-7.png";
    return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,borderRadius:16,padding:"8px"}}>
      <img src={img} alt="" style={{width:56,height:56,objectFit:"contain",opacity:0.06+0.94*p,filter:`grayscale(${(1-p)*0.8}) drop-shadow(0 0 ${12*p}px rgba(249,115,22,${0.6*p}))`,transition:"all .4s ease"}}/>
    </div>
    );
  };
  const HabituatedBadge=({progress})=>{
    const p=Math.max(0,Math.min(1,progress||0));
    return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,borderRadius:16,padding:"8px"}}>
      <img src="/badge-habituated.png" alt="" style={{width:56,height:56,objectFit:"contain",opacity:0.06+0.94*p,filter:`grayscale(${(1-p)*0.8}) drop-shadow(0 0 ${12*p}px rgba(245,158,11,${0.5*p}))`,transition:"all .4s ease"}}/>
    </div>
    );
  };
  const HifzGoalBadge=({progress})=>{
    const p=Math.max(0,Math.min(1,progress||0));
    return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",borderRadius:16,padding:"12px"}}>
      <div style={{position:"relative",width:64,height:64,marginBottom:4,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg viewBox="0 0 64 64" style={{width:56,height:56,opacity:0.06+0.94*p,filter:`grayscale(${(1-p)*0.8}) drop-shadow(0 0 ${12*p}px rgba(245,158,11,${0.5*p}))`,transition:"all .4s ease"}}>
          <defs>
            <linearGradient id="sg1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#FCD34D"/><stop offset="50%" stopColor="#D97706"/><stop offset="100%" stopColor="#92400E"/></linearGradient>
            <linearGradient id="bg1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#FEF3C7"/><stop offset="100%" stopColor="#F59E0B"/></linearGradient>
          </defs>
          <path d="M32 4 L54 12 L54 32 Q54 52 32 60 Q10 52 10 32 L10 12 Z" fill="url(#sg1)" stroke="#B45309" strokeWidth="1"/>
          <path d="M32 6 L52 13 L52 20 Q40 18 32 20 Q24 18 12 20 L12 13 Z" fill="white" fillOpacity="0.25"/>
          <g transform="translate(18,20)">
            <path d="M14 2 L2 6 L2 24 L14 20 Z" fill="url(#bg1)" stroke="#92400E" strokeWidth="0.5"/>
            <path d="M14 2 L26 6 L26 24 L14 20 Z" fill="url(#bg1)" stroke="#92400E" strokeWidth="0.5"/>
            <line x1="4" y1="10" x2="12" y2="8" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
            <line x1="4" y1="14" x2="12" y2="12" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
            <line x1="16" y1="8" x2="24" y2="10" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
            <line x1="16" y1="12" x2="24" y2="14" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
            <line x1="14" y1="2" x2="14" y2="20" stroke="#92400E" strokeWidth="1"/>
          </g>
        </svg>
      </div>
      <span style={{fontSize:9,color:`rgba(255,255,255,${0.06+0.94*p})`,fontWeight:500,letterSpacing:".02em",transition:"color .4s ease"}}>Hifz Goal</span>
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
      <RihlahProgressPath dark={dark} T={T} completedCount={completedCount} sessionJuz={sessionJuz} timeline={timeline} pct={pct} goalYears={goalYears} goalMonths={goalMonths}/>

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
          <div style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.7)",fontWeight:700}}>Daily Goals</div>
          <div style={{display:"flex",alignItems:"baseline",gap:4}}>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:24,color:"#F0C040",fontWeight:700,lineHeight:1}}>{checkedCount}</span>
            <span style={{fontSize:13,color:"rgba(255,255,255,0.35)"}}> of {SESSIONS.length}</span>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginLeft:4}}>Sessions Completed</span>
          </div>
        </div>
        <div style={{height:5,background:"rgba(255,255,255,0.08)",borderRadius:999,overflow:"hidden",marginBottom:12}}>
          <div style={{height:"100%",width:`${Math.round((checkedCount/SESSIONS.length)*100)}%`,background:"linear-gradient(90deg,#D4AF37,#E6B84A)",borderRadius:999,boxShadow:"0 0 10px rgba(212,175,55,0.3)",transition:"width .5s"}}/>
        </div>
        <div style={{background:"rgba(255,255,255,0.02)",padding:"12px",borderRadius:16,boxShadow:"inset 0 0 10px rgba(255,255,255,0.02)"}}>
          {SESSIONS.map((s,i)=>{
            const done=!!dailyChecks[s.id];
            const isActive=s.id===activeSess?.id&&!done;
            const isInactive=!done&&!isActive;
            return (
              <div key={s.id} className="sbtn" onClick={()=>toggleCheck(s.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:12,marginBottom:i<SESSIONS.length-1?(isActive?14:10):0,background:isActive?"linear-gradient(180deg,rgba(240,192,64,0.08),rgba(240,192,64,0.02))":done?"rgba(34,197,94,0.06)":"transparent",border:isActive?"1.5px solid rgba(240,192,64,0.6)":done?"1px solid rgba(34,197,94,0.15)":"1px solid transparent",boxShadow:isActive?"0 0 35px rgba(240,192,64,0.18),0 0 30px rgba(240,192,64,0.25),inset 0 0 12px rgba(240,192,64,0.08)":"none",opacity:isInactive?0.2:1,filter:isInactive?"grayscale(0.7)":"none",transition:"all .2s"}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:done?s.color:"rgba(255,255,255,0.08)",border:done?`2px solid ${s.color}`:"1px solid rgba(255,255,255,0.1)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:done?`0 0 8px ${s.color}60`:"none",filter:isActive?"drop-shadow(0 0 6px rgba(240,192,64,0.4))":"none",transition:"all .2s"}}>
                  {done&&<span style={{fontSize:8,color:"#fff",fontWeight:700}}>✓</span>}
                </div>
                <span style={{fontSize:12,color:isActive?"#F0C040":done?s.color:"rgba(255,255,255,0.6)",fontWeight:isActive||done?600:400,flex:1,transition:"color .2s"}}>{s.icon} {s.time} — {s.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Nav buttons moved to after Overall Progress */}


      {/* ── 5. ACTIVE SESSION CHECKLIST ── */}
      <div style={{background:dark?"linear-gradient(135deg,rgba(30,35,50,0.9) 0%,rgba(20,25,40,0.7) 100%)":"#EADFC8",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,boxShadow:dark?"0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)":"0 4px 16px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.5)",padding:"12px",marginBottom:8}}>
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
            {activeSess.id==="fajr"&&<span style={{color:"#F0C040",fontWeight:600}}>{dailyNew} ayahs today</span>}
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
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",borderRadius:8,marginBottom:2,background:activeDone?"rgba(74,222,128,0.06)":"transparent",border:activeDone?"1px solid rgba(74,222,128,0.1)":"1px solid transparent"}}>
              <div style={{width:20,height:20,borderRadius:5,background:activeDone?"linear-gradient(135deg,#4ADE80,#22C55E)":(dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.06)"),border:activeDone?"none":`1px solid ${dark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.15)"}`,boxShadow:activeDone?"0 0 10px rgba(74,222,128,0.3)":"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,color:activeDone?"#fff":(dark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.15)")}}>
                {activeDone?"✓":""}
              </div>
              <span style={{fontSize:12,color:activeDone?(dark?"rgba(245,231,184,0.7)":"rgba(40,30,10,0.50)"):(dark?"rgba(255,255,255,0.85)":"#2D2A26"),textDecoration:activeDone?"line-through":"none",opacity:activeDone?0.6:1}}>{step}</span>
            </div>
          ))
        )}
      </div>

      {/* ── 6. TODAY'S ACTIVITY ── */}
      {(()=>{
        const todayStr=new Date().toDateString();
        const todayActivity=(recentActivity||[]).filter(ev=>ev.ts&&new Date(ev.ts).toDateString()===todayStr);
        return (
        <div style={{background:dark?"linear-gradient(135deg,rgba(30,35,50,0.9) 0%,rgba(20,25,40,0.7) 100%)":"#EADFC8",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,boxShadow:dark?"0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)":"0 4px 16px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.5)",padding:"16px 18px",marginBottom:10}}>
          <div style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:dark?"rgba(255,255,255,0.7)":"#6B645A",fontWeight:700,marginBottom:14}}>Today's Activity</div>
          {todayActivity.length>0?(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {todayActivity.slice(0,5).map((ev,i)=>(
                <div key={`${ev.ts}-${i}`} style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:dark?"rgba(243,231,200,0.85)":"#2D2A26",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.text}</div>
                  </div>
                  <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.35)":"#8B7355",flexShrink:0,fontFamily:"'DM Sans',sans-serif"}}>{timeAgo(ev.ts)}</div>
                </div>
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
      <div style={{background:dark?"linear-gradient(135deg,rgba(30,35,50,0.9) 0%,rgba(20,25,40,0.7) 100%)":"#EADFC8",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,boxShadow:dark?"0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)":"0 4px 16px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.5)",padding:"18px 14px",marginBottom:10,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 12% 18%, rgba(240,192,64,0.08) 0, transparent 20%), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.04) 0, transparent 16%)"}}/>
        <div style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.7)",fontWeight:700,marginBottom:18,position:"relative",zIndex:1}}>Badges Earned</div>
        <div style={{display:"flex",justifyContent:"space-around",alignItems:"flex-end",gap:4,position:"relative",zIndex:1,background:"linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.2))",borderRadius:16,padding:"12px 8px",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.05)"}}>
          <JuzBadge count={completedCount||0} juzProgress={totalSV>0?sessionIdx/totalSV:(completedCount>0?1:0)}/>
          <StreakBadge progress={(()=>{
            const s=streak||0; if(s===0) return 0;
            if(s<7) return s/7;
            if(s<14) return (s-7)/7;
            if(s<21) return (s-14)/7;
            return 1;
          })()}/>
          <HabituatedBadge progress={(streak||0)>0?Math.min(1,(streak||0)/40):0}/>
          <HifzGoalBadge progress={(completedCount||0)>0?Math.min(1,(completedCount||0)/30):0}/>
        </div>
      </div>

      {/* Nav buttons moved to after Overall Progress */}

      </div>
    </div>
  );
}
