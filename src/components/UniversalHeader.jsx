// Universal app header — brand lockup (hamburger + dedicated Al-Hifz calligraphy
// medallion, title, subtitle) plus the overall memorization progress bar. The
// medallion reuses the My-Hifz nav icon's الحفظ mark at higher resolution.
// User identity (avatar,
// name, next-target, badges) now lives in the side drawer. Hidden on the Quran
// tab unless a drawer page is open. Returns null when it shouldn't render so the
// caller can mount it unconditionally.
export default function UniversalHeader({ activeTab, appPage, dark, T, setShowAppDrawer, pct }) {
  if (!(activeTab !== "quran" || appPage)) return null;
  const bar = dark ? "rgba(232,200,120,0.85)" : "#6B4F00";
  return (
    <div style={{background:activeTab==="rihlah"?"transparent":(dark?"linear-gradient(160deg,#0A1628 0%,#0E1E3A 50%,#081220 100%)":"#EADFC8"),padding:"11px 16px 9px",flexShrink:0,borderBottom:activeTab==="rihlah"?"none":`1px solid ${T.border}`,position:"relative",overflow:"hidden",zIndex:1}}>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 12% 18%, rgba(212,175,55,0.08) 0, transparent 18%), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.04) 0, transparent 14%)"}}/>
      <div style={{position:"relative",zIndex:1}}>
        {/* Brand row — hamburger left, Al-Hifz brand centered */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
          <div className="sbtn" onClick={()=>setShowAppDrawer(true)} aria-label="Open menu" style={{flexShrink:0,width:32,height:32,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:"4px",borderRadius:8}}>
            <div style={{width:18,height:2,borderRadius:1,background:bar}}/>
            <div style={{width:18,height:2,borderRadius:1,background:bar}}/>
            <div style={{width:18,height:2,borderRadius:1,background:bar}}/>
          </div>
          <div style={{flex:1,minWidth:0,display:"flex",alignItems:"center",justifyContent:"center",gap:14}}>
            {/* Dedicated Al-Hifz brand medallion — the الحفظ calligraphy (the
                My-Hifz nav-icon mark, at high resolution) set inside the SAME
                empty ornate frame used for the user-avatar medallion. Brand mark
                and user avatar therefore share one frame, differing only by the
                centre: calligraphy here, dynamic initials in the side drawer.
                Baked asset; the avatar frame and the nav icon are both unchanged. */}
            <div style={{width:64,height:64,flexShrink:0,filter:"drop-shadow(0 0 9px rgba(230,184,74,0.55)) drop-shadow(0 1px 2px rgba(0,0,0,0.35))"}}>
              <img src="/al-hifz-medallion.webp" alt="Al-Hifz" style={{display:"block",width:"100%",height:"100%",objectFit:"contain"}}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:0}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:23,fontWeight:800,color:T.accent,letterSpacing:".02em",textShadow:"0 0 14px rgba(212,175,55,0.40)",lineHeight:1}}>Al-Hifz</div>
              <div style={{fontSize:10,color:T.sub,fontFamily:"'DM Sans',sans-serif",letterSpacing:".04em",lineHeight:1.3}}>Your Journey to Memorizing the Qur'an</div>
            </div>
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
