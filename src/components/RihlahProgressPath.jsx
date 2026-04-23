import React from "react";

export default function RihlahProgressPath({dark,T,completedCount,sessionJuz,timeline,pct,goalYears,goalMonths}){
  const completed=completedCount;
  const waypoints=[
    {x:320,y:175,juz:5},
    {x:-15, y:140,juz:10},
    {x:300,y:90, juz:15},
    {x:50, y:45, juz:20},
    {x:340,y:10, juz:25},
    {x:340,y:-25, juz:30},
  ];
  const startPt={x:-130,y:210};
  const pathD=`M ${startPt.x} ${startPt.y} C -60 240 370 190 ${waypoints[0].x} ${waypoints[0].y} C 370 155 -50 145 ${waypoints[1].x} ${waypoints[1].y} C -50 105 340 98 ${waypoints[2].x} ${waypoints[2].y} C 340 65 20 55 ${waypoints[3].x} ${waypoints[3].y} C 20 22 380 15 ${waypoints[4].x} ${waypoints[4].y}`;
  const litCount=waypoints.filter(w=>completed>=w.juz).length;
  const currentWpIdx=waypoints.findIndex(w=>completed<w.juz);
  const currentWp=currentWpIdx>=0?waypoints[currentWpIdx]:waypoints[5];
  return (
    <div style={{borderRadius:20,overflow:"visible",marginBottom:10,position:"relative",padding:"10px 16px 0"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:0}}>
        <div>
          <div style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:dark?"rgba(255,255,255,0.6)":"#6B645A",fontWeight:700}}>Your Memorization Journey</div>
          <div style={{fontSize:10,color:dark?"rgba(230,184,74,0.55)":"#8B7355",marginTop:2}}>You are currently on Juz {sessionJuz||"—"}</div>
          <div style={{fontSize:9,color:dark?"rgba(255,255,255,0.35)":"#6B645A",marginTop:3}}>{completedCount} of 30 Juz · Goal: {goalYears} year{goalYears!==1?"s":""}{goalMonths>0?` ${goalMonths}mo`:""}</div>
        </div>
      </div>
      <svg viewBox="-140 -50 540 280" style={{width:"80%",height:"auto",margin:"0 auto",display:"block",overflow:"visible"}}>
        <defs>
          <linearGradient id="pathGold" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5C4A1E"/>
            <stop offset="30%" stopColor="#8B6914"/>
            <stop offset="60%" stopColor="#D4AF37"/>
            <stop offset="85%" stopColor="#F6E27A"/>
            <stop offset="100%" stopColor="#FFFBEA"/>
          </linearGradient>
          <linearGradient id="pathDim" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={dark?"rgba(92,74,30,0.15)":"rgba(0,0,0,0.04)"}/>
            <stop offset="100%" stopColor={dark?"rgba(92,74,30,0.08)":"rgba(0,0,0,0.06)"}/>
          </linearGradient>
          <filter id="pathGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
<filter id="fireGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur1"/>
            <feMerge><feMergeNode in="blur1"/><feMergeNode in="blur1"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {/* Core path + glow — theme-aware */}
        <path d={pathD} fill="none" stroke={dark?"rgba(212,175,55,0.35)":"rgba(139,69,19,0.20)"} strokeWidth="5" strokeLinecap="round" filter="url(#fireGlow)"/>
        <path d={pathD} fill="none" stroke={dark?"rgba(240,192,64,0.5)":"rgba(180,83,9,0.35)"} strokeWidth="3" strokeLinecap="round" filter="url(#pathGlow)"/>
        {completed>0&&(
          <path ref={el=>{
            if(el){
              const totalLen=el.getTotalLength();
              const litLen=totalLen*(Math.min(completed,25)/25);
              el.style.strokeDasharray=`${litLen} ${totalLen}`;
            }
          }} d={pathD} fill="none" stroke={dark?"#F5C518":"#B45309"} strokeWidth="6" strokeLinecap="round" opacity={dark?0.8:0.95} filter="url(#fireGlow)" strokeDasharray="0 9999"/>
        )}
        {completed>0&&(
          <path ref={el=>{
            if(el){
              const totalLen=el.getTotalLength();
              const litLen=totalLen*(Math.min(completed,25)/25);
              el.style.strokeDasharray=`${litLen} ${totalLen}`;
            }
          }} d={pathD} fill="none" stroke={dark?"#FFEAA0":"#D97706"} strokeWidth="3" strokeLinecap="round" filter="url(#pathGlow)" strokeDasharray="0 9999"/>
        )}
        <path ref={el=>{
          if(el&&completed>0&&completed<30){
            const wp=waypoints.find(w=>w.juz===completed);
            let x, y;
            if(wp){ x=wp.x; y=wp.y; }
            else {
              const len=el.getTotalLength();
              const pt=el.getPointAtLength(len*(completed/30));
              x=pt.x; y=pt.y;
            }
            const marker=el.parentNode.querySelector('#juzMarker');
            if(marker){marker.setAttribute('transform',`translate(${x},${y})`);marker.style.display='';}
          }
        }} d={pathD} fill="none" stroke="none"/>
        <g id="juzMarker" style={{display:completed>0&&completed<30?'':'none'}}>
          <circle cx="0" cy="0" r="14" fill={dark?"rgba(212,175,55,0.1)":"rgba(180,83,9,0.12)"} filter="url(#fireGlow)"/>
          <circle cx="0" cy="0" r="10" fill={dark?"rgba(212,175,55,0.15)":"rgba(180,83,9,0.18)"} filter="url(#pathGlow)"/>
          <circle cx="0" cy="0" r="5" fill={dark?"#D4AF37":"#B45309"} stroke={dark?"#F6E27A":"#78350F"} strokeWidth="1.5" filter="url(#pathGlow)"/>
          <text x="0" y="-14" textAnchor="middle" fill={dark?"#F0C040":"#78350F"} fontSize="18" fontWeight="700">Juz {completed}</text>
          <circle cx="0" cy="0" r="14" fill="none" stroke="rgba(240,192,64,0.5)" strokeWidth="1.5">
            <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="0" cy="0" r="18" fill="none" stroke="rgba(240,192,64,0.3)" strokeWidth="1">
            <animate attributeName="r" values="16;26;16" dur="2.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.4;0;0.4" dur="2.5s" repeatCount="indefinite"/>
          </circle>
        </g>
        {/* Extra dot between Juz 20 and 25, closer to 25 */}
        {(()=>{const d25=completed>=25;return <><circle cx={260} cy={18} r={d25?"7":"6"} fill={d25?"#D4AF37":(dark?"rgba(200,180,100,0.35)":"rgba(0,0,0,0.15)")} stroke={d25?"#F6E27A":(dark?"rgba(200,180,100,0.5)":"rgba(0,0,0,0.2)")} strokeWidth="1.5" filter={d25?"url(#pathGlow)":"none"}/><text x={260} y={6} textAnchor="middle" fill={d25?"#F0C040":(dark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.2)")} fontSize="18" fontWeight="700">Juz 25</text></>;})()}
        {waypoints.map((w,i)=>{
          const done=completed>=w.juz;
          const isCurrent=currentWpIdx===i;
          const isLast=i===5;
          if(isLast) return (
            <g key={i} transform={`translate(${w.x},${w.y}) scale(1.8)`}>
              {/* Radiant glow */}
              <circle cx="0" cy="0" r="22" fill="rgba(240,192,64,0.06)" filter="url(#fireGlow)"/>
              <circle cx="0" cy="0" r="16" fill="rgba(240,192,64,0.1)" filter="url(#pathGlow)"/>
              <circle cx="0" cy="0" r="28" fill="none" stroke="rgba(240,192,64,0.15)" strokeWidth="1">
                <animate attributeName="r" values="24;30;24" dur="3s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite"/>
              </circle>
              <circle cx="0" cy="0" r="20" fill="none" stroke="rgba(240,192,64,0.25)" strokeWidth="0.8">
                <animate attributeName="r" values="18;24;18" dur="2.5s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2.5s" repeatCount="indefinite"/>
              </circle>
              <circle cx="0" cy="0" r="12" fill="rgba(240,192,64,0.12)"/>
              <circle cx="0" cy="0" r="8" fill="rgba(212,175,55,0.2)"/>
              {/* Open Quran book */}
              <defs>
                <linearGradient id="quranPage" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FEF3C7"/>
                  <stop offset="100%" stopColor="#F59E0B"/>
                </linearGradient>
              </defs>
              <path d="M -1 -10 Q -9 -12 -16 -9 L -16 8 Q -9 5 -1 7 Z" fill="url(#quranPage)" stroke="#B45309" strokeWidth="0.8"/>
              <path d="M 1 -10 Q 9 -12 16 -9 L 16 8 Q 9 5 1 7 Z" fill="url(#quranPage)" stroke="#B45309" strokeWidth="0.8"/>
              <line x1="0" y1="-10" x2="0" y2="7" stroke="#92400E" strokeWidth="1"/>
              <line x1="-13" y1="-5" x2="-3" y2="-5" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
              <line x1="-13" y1="-2" x2="-3" y2="-2" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
              <line x1="-12" y1="1" x2="-3" y2="1" stroke="#92400E" strokeWidth="0.5" opacity="0.4"/>
              <line x1="3" y1="-5" x2="13" y2="-5" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
              <line x1="3" y1="-2" x2="13" y2="-2" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
              <line x1="3" y1="1" x2="12" y2="1" stroke="#92400E" strokeWidth="0.5" opacity="0.4"/>
              {isCurrent&&!done&&(
                <circle cx="0" cy="0" r="16" fill="none" stroke="rgba(240,192,64,0.4)" strokeWidth="1.5">
                  <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite"/>
                </circle>
              )}
            </g>
          );
          return (
            <g key={i}>
              {done&&<><circle cx={w.x} cy={w.y} r="16" fill="rgba(212,175,55,0.1)" filter="url(#fireGlow)"/><circle cx={w.x} cy={w.y} r="12" fill="rgba(212,175,55,0.15)" filter="url(#pathGlow)"/></>}
              <circle cx={w.x} cy={w.y} r={done?"7":"6"} fill={done?"#D4AF37":isCurrent?"rgba(240,192,64,0.5)":(dark?"rgba(200,180,100,0.35)":"rgba(0,0,0,0.15)")} stroke={done?"#F6E27A":isCurrent?"rgba(240,192,64,0.5)":(dark?"rgba(200,180,100,0.5)":"rgba(0,0,0,0.2)")} strokeWidth="1.5" filter={done?"url(#pathGlow)":"none"}/>
              {w.juz!==25&&completed!==w.juz&&<text x={w.juz===10||w.juz===20?w.x-12:w.x+12} y={w.y+2} textAnchor={w.juz===10||w.juz===20?"end":"start"} dominantBaseline="middle" fill={done?"#F0C040":(dark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.2)")} fontSize="18" fontWeight="700">Juz {w.juz}</text>}
              {done&&(<circle cx={w.x} cy={w.y} r="14" fill="none" stroke="rgba(240,192,64,0.4)" strokeWidth="1"><animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/></circle>)}
              {isCurrent&&!done&&(<circle cx={w.x} cy={w.y} r="12" fill="none" stroke="rgba(240,192,64,0.4)" strokeWidth="1.5"><animate attributeName="r" values="10;16;10" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite"/></circle>)}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
