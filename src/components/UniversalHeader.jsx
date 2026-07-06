// Universal app header — brand lockup (hamburger + Al-Hifz medallion, title,
// subtitle) plus the overall memorization progress bar. User identity (avatar,
// name, next-target, badges) now lives in the side drawer. Hidden on the Quran
// tab unless a drawer page is open. Returns null when it shouldn't render so the
// caller can mount it unconditionally.
export default function UniversalHeader({ activeTab, appPage, dark, T, setShowAppDrawer, pct }) {
  if (!(activeTab !== "quran" || appPage)) return null;
  const bar = dark ? "rgba(232,200,120,0.85)" : "#6B4F00";
  return (
    <div style={{background:activeTab==="rihlah"?"transparent":(dark?"linear-gradient(160deg,#0A1628 0%,#0E1E3A 50%,#081220 100%)":"#EADFC8"),padding:"10px 16px 10px",flexShrink:0,borderBottom:activeTab==="rihlah"?"none":`1px solid ${T.border}`,position:"relative",overflow:"hidden",zIndex:1}}>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 12% 18%, rgba(212,175,55,0.08) 0, transparent 18%), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.04) 0, transparent 14%)"}}/>
      <div style={{position:"relative",zIndex:1}}>
        {/* Brand row — hamburger left, Al-Hifz brand centered */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <div className="sbtn" onClick={()=>setShowAppDrawer(true)} aria-label="Open menu" style={{flexShrink:0,width:32,height:32,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:"4px",borderRadius:8}}>
            <div style={{width:18,height:2,borderRadius:1,background:bar}}/>
            <div style={{width:18,height:2,borderRadius:1,background:bar}}/>
            <div style={{width:18,height:2,borderRadius:1,background:bar}}/>
          </div>
          <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:64,height:64,position:"relative",flexShrink:0,filter:"brightness(1.15) drop-shadow(0 0 7px rgba(230,184,74,0.85))"}}>
                <img src="/avatar-medallion.png" alt="" aria-hidden="true" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>
                <img src="/al-hifz-logo.webp" alt="Al-Hifz" style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"54%",height:"54%",objectFit:"contain"}}/>
              </div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:23,fontWeight:800,color:T.accent,letterSpacing:".02em",textShadow:"0 0 14px rgba(212,175,55,0.40)"}}>Al-Hifz</div>
            </div>
            <div style={{fontSize:10,color:T.sub,fontFamily:"'DM Sans',sans-serif",letterSpacing:".04em",textAlign:"center"}}>Your Journey to Memorizing the Qur'an</div>
          </div>
          <div style={{width:32,flexShrink:0}}/>
        </div>
        {/* Progress row — overall memorization progress stays in the header */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,height:8,background:T.surface2,borderRadius:999,overflow:"hidden"}}><div className="pbfill" style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#156A30,#F0C040)",borderRadius:999}}/></div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700,color:"#F0C040",flexShrink:0}}>{pct}%</div>
        </div>
      </div>
    </div>
  );
}
