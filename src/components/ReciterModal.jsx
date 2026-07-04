import { QURAN_RECITERS, RECITERS } from "../data/constants";
import { CheckGlyph } from "./glyphs";

// Small, restrained line glyphs for reciter rows + group headers. Gold/ivory,
// no glow — deliberately lighter than the drawer medallions so a long reciter
// list stays scannable and uncrowded. Decorative (aria-hidden); the adjacent
// name/label carries the meaning.
function WaveGlyph({ size = 12, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" style={{ display: "block" }}>
      <line x1="5" y1="9.5" x2="5" y2="14.5" />
      <line x1="9.5" y1="5.5" x2="9.5" y2="18.5" />
      <line x1="14" y1="8" x2="14" y2="16" />
      <line x1="18.5" y1="10.5" x2="18.5" y2="13.5" />
    </svg>
  );
}
function KaabaGlyph({ size = 12, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round" style={{ display: "block" }}>
      <rect x="5.5" y="6.5" width="13" height="13" rx="1" />
      <line x1="5.5" y1="10.5" x2="18.5" y2="10.5" strokeWidth="1.9" />
      <path d="M10.8 19.5v-3.4h2.4v3.4" />
    </svg>
  );
}
function CrescentGlyph({ size = 12, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={color} style={{ display: "block" }}>
      <path d="M20.5 14.2A8 8 0 1 1 11 4.2a6.3 6.3 0 0 0 9.5 10z" />
    </svg>
  );
}

export default function ReciterModal({
  show, onClose, dark,
  reciterMode, quranReciter, setQuranReciter,
  reciter, setReciter, currentReciter,
  setPlayingSurah, setPlayingKey, setAudioLoading, audioRef,
}){
  if(!show) return null;
  const list=reciterMode==="quran"?QURAN_RECITERS:RECITERS;
  const selectedId=reciterMode==="quran"?quranReciter:reciter;
  const groups=["Masjid Al-Haram","Masjid An-Nabawi","Hifz Favorite","Popular"];
  const renderReciter=(r)=>{
    const isSelected=selectedId===r.id;
    return (
      <div key={r.id} className="sbtn" onClick={()=>{
        if(reciterMode==="quran"){
          setQuranReciter(r.id);
          setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null);
          if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; }
        } else { setReciter(r.id); }
        onClose();
      }} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:10,transition:"all .15s",
        background:isSelected?(dark?"rgba(230,184,74,0.10)":"rgba(180,140,40,0.08)"):(dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)"),
        border:`1px solid ${isSelected?(dark?"rgba(230,184,74,0.35)":"rgba(160,120,20,0.40)"):(dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)")}`,
        boxShadow:isSelected?"0 0 14px rgba(230,184,74,0.08),inset 0 0 12px rgba(230,184,74,0.06)":"none"}}>
        <div style={{width:22,height:22,borderRadius:"50%",background:isSelected?(dark?"rgba(230,184,74,0.12)":"rgba(180,140,40,0.10)"):(dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)"),border:`1px solid ${isSelected?(dark?"rgba(230,184,74,0.25)":"rgba(160,120,20,0.30)"):(dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)")}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><WaveGlyph size={12} color={isSelected?(dark?"#E6B84A":"#8C6410"):(dark?"rgba(230,184,74,0.55)":"rgba(140,100,20,0.55)")}/></div>
        <div style={{flex:1,minWidth:0,fontSize:12,fontWeight:isSelected?700:500,color:isSelected?(dark?"#F3E7C8":"#3D2E0A"):(dark?"rgba(243,231,200,0.70)":"rgba(40,30,10,0.70)"),overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
        <div style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:16,direction:"rtl",color:isSelected?(dark?"rgba(230,184,74,0.85)":"rgba(140,100,20,0.90)"):(dark?"rgba(243,231,200,0.55)":"rgba(40,30,10,0.65)"),flexShrink:0,lineHeight:1,transform:"translateY(-3px)"}}>{r.arabic}</div>
        {isSelected&&<div style={{display:"flex",color:"#E6B84A",flexShrink:0,marginLeft:2}}><CheckGlyph size={13}/></div>}
      </div>
    );
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.80)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",width:"100%",maxWidth:500,maxHeight:"68vh",display:"flex",flexDirection:"column",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"12px 18px 0",textAlign:"center"}}>
          <div style={{width:36,height:4,background:dark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)",borderRadius:2,margin:"0 auto 12px"}}/>
          <div style={{fontSize:13,fontWeight:700,color:dark?"#F3E7C8":"#3D2E0A",letterSpacing:".03em"}}>Select Reciter</div>
          <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.45)":"rgba(40,30,10,0.55)",marginTop:4}}>Plays in Study mode (tap an ayah)</div>
          <div style={{marginBottom:10}}/>
        </div>
        <div style={{overflowY:"auto",padding:"0 12px 28px"}}>
          {groups.map(group=>{
            const groupReciters=list.filter(r=>r.tag===group);
            if(!groupReciters.length) return null;
            return (
              <div key={group} style={{marginBottom:12}}>
                <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.50)":"rgba(140,100,20,0.50)",letterSpacing:".14em",textTransform:"uppercase",fontWeight:700,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                    {(()=>{const c=dark?"rgba(217,177,95,0.70)":"rgba(140,100,20,0.65)";return group==="Masjid Al-Haram"?<KaabaGlyph size={12} color={c}/>:group==="Masjid An-Nabawi"?<CrescentGlyph size={12} color={c}/>:<WaveGlyph size={12} color={c}/>;})()}
                    <span>{group}</span>
                  </span>
                  <div style={{flex:1,height:1,background:dark?"rgba(217,177,95,0.12)":"rgba(0,0,0,0.06)"}}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {groupReciters.map(renderReciter)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
