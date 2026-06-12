import { SURAH_EN } from "../data/constants";

// Universal app header — hamburger + app title, profile row (avatar, name,
// next-target), goal/streak badges, and the overall progress bar. Hidden on the
// Quran tab unless a drawer page is open. Pure presentational; extracted
// verbatim from the root component. Returns null when it shouldn't render so the
// caller can mount it unconditionally.
export default function UniversalHeader({ activeTab, appPage, dark, T, setShowAppDrawer, sessionVerses, sessionIdx, goalLabel, streak, pct }) {
  if (!(activeTab !== "quran" || appPage)) return null;
  const username = localStorage.getItem("rihlat-username") || "Abdul Jalil";
  const initials = username.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{background:activeTab==="rihlah"?"transparent":(dark?"linear-gradient(160deg,#0A1628 0%,#0E1E3A 50%,#081220 100%)":"#EADFC8"),padding:"10px 16px 10px",flexShrink:0,borderBottom:activeTab==="rihlah"?"none":`1px solid ${T.border}`,position:"relative",overflow:"hidden",zIndex:1}}>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 12% 18%, rgba(212,175,55,0.08) 0, transparent 18%), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.04) 0, transparent 14%)"}}/>
      <div style={{position:"relative",zIndex:1}}>
        {/* Title row — hamburger left, app title centered */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,gap:8}}>
          <div className="sbtn" onClick={()=>setShowAppDrawer(true)} aria-label="Open menu" style={{flexShrink:0,width:32,height:32,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:"4px",borderRadius:8}}>
            <div style={{width:18,height:2,borderRadius:1,background:dark?"rgba(232,200,120,0.85)":"#6B4F00"}}/>
            <div style={{width:18,height:2,borderRadius:1,background:dark?"rgba(232,200,120,0.85)":"#6B4F00"}}/>
            <div style={{width:18,height:2,borderRadius:1,background:dark?"rgba(232,200,120,0.85)":"#6B4F00"}}/>
          </div>
          <div style={{flex:1,textAlign:"center"}}>
            <div style={{fontSize:13,color:T.accent,letterSpacing:".12em",textTransform:"uppercase",fontWeight:800,fontFamily:"'Playfair Display',serif",textShadow:"0 0 12px rgba(212,175,55,0.40)"}}>Al-Hifz <span style={{fontWeight:400,fontSize:9,fontFamily:"'DM Sans',sans-serif",letterSpacing:".08em",textShadow:"none"}}>· Your journey to memorizing the Qur'an</span></div>
          </div>
          <div style={{width:32,flexShrink:0}}/>
        </div>
        {/* Profile row */}
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {/* Avatar */}
          <div style={{position:"relative",flexShrink:0}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:dark?"linear-gradient(135deg,#0E1E3A,#162D50)":"#E0D5BC",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid rgba(212,175,55,0.45)",boxShadow:"0 0 12px rgba(212,175,55,0.15)"}}>
              <span style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,color:"#E6B84A"}}>{initials}</span>
            </div>
          </div>
          {/* Name + next target */}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:15,fontWeight:700,color:dark?"#EDE8DC":"#2D2A26",fontFamily:"'Playfair Display',serif"}}>{username}</div>
            {(()=>{
              // Use the live session pointer — this already follows Sheikh Al-Qasim's
              // descending order within each juz
              const nv=sessionVerses[sessionIdx];
              if(nv){
                const sn=nv.surah_number||parseInt(nv.verse_key?.split(":")[0]||"0",10);
                const name=SURAH_EN[sn];
                if(name) return <div style={{fontSize:9,color:T.sub,marginTop:2}}>Next Target · Surah {name}</div>;
              }
              return null;
            })()}
          </div>
          {/* Settings gear removed — Settings now lives in the side drawer (hamburger). */}
        </div>
        {/* Badges row — full width */}
        <div style={{display:"flex",gap:6,marginTop:6,justifyContent:"flex-start"}}>
          {[
            {label:"🎯 "+goalLabel, color:dark?"#38BDF8":"#1E6B9A", bg:dark?"rgba(56,189,248,0.12)":"rgba(56,189,248,0.08)", border:dark?"rgba(56,189,248,0.25)":"rgba(56,189,248,0.20)"},
            {label:"🔥 "+streak+"-Day Streak", color:dark?"#F6A623":"#B87A10", bg:dark?"rgba(246,166,35,0.12)":"rgba(246,166,35,0.08)", border:dark?"rgba(246,166,35,0.25)":"rgba(246,166,35,0.20)"},
          ].map((pill,i)=>(
            <div key={i} style={{fontSize:8,color:pill.color,background:pill.bg,padding:"2px 7px",borderRadius:14,border:`1px solid ${pill.border}`,whiteSpace:"nowrap"}}>{pill.label}</div>
          ))}
        </div>
        {/* Progress row */}
        {(
        <div style={{display:"flex",alignItems:"center",gap:10,marginTop:6}}>
          <div style={{flex:1,height:8,background:T.surface2,borderRadius:999,overflow:"hidden"}}><div className="pbfill" style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#156A30,#F0C040)",borderRadius:999}}/></div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700,color:"#F0C040",flexShrink:0}}>{pct}%</div>
        </div>
        )}
      </div>
    </div>
  );
}
