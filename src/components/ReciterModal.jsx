import { QURAN_RECITERS, RECITERS } from "../data/constants";

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
      }} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,transition:"all .15s",
        background:isSelected?(dark?"rgba(230,184,74,0.10)":"rgba(180,140,40,0.08)"):(dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)"),
        border:`1px solid ${isSelected?(dark?"rgba(230,184,74,0.35)":"rgba(160,120,20,0.40)"):(dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)")}`,
        boxShadow:isSelected?"0 0 14px rgba(230,184,74,0.08),inset 0 0 12px rgba(230,184,74,0.06)":"none"}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:isSelected?(dark?"rgba(230,184,74,0.12)":"rgba(180,140,40,0.10)"):(dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)"),border:`1px solid ${isSelected?(dark?"rgba(230,184,74,0.25)":"rgba(160,120,20,0.30)"):(dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)")}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12}}>🎙️</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:isSelected?700:400,color:isSelected?(dark?"#F3E7C8":"#3D2E0A"):(dark?"rgba(243,231,200,0.65)":"rgba(40,30,10,0.65)")}}>{r.name}</div>
          <div style={{fontFamily:"'Amiri',serif",fontSize:12,color:isSelected?(dark?"rgba(230,184,74,0.55)":"rgba(140,100,20,0.70)"):(dark?"rgba(243,231,200,0.30)":"rgba(40,30,10,0.40)"),marginTop:1}}>{r.arabic}</div>
        </div>
        {isSelected&&<div style={{fontSize:14,color:"#E6B84A",fontWeight:700,flexShrink:0}}>✓</div>}
      </div>
    );
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.80)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",width:"100%",maxWidth:500,maxHeight:"68vh",display:"flex",flexDirection:"column",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"12px 18px 0",textAlign:"center"}}>
          <div style={{width:36,height:4,background:dark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)",borderRadius:2,margin:"0 auto 12px"}}/>
          <div style={{fontSize:13,fontWeight:700,color:dark?"#F3E7C8":"#3D2E0A",letterSpacing:".03em"}}>Select Reciter</div>
          <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.40)":"rgba(40,30,10,0.50)",marginTop:4,marginBottom:10}}>
            Currently: <span style={{color:dark?"rgba(230,184,74,0.75)":"rgba(140,100,20,0.85)",fontWeight:600}}>{reciterMode==="quran"?(QURAN_RECITERS.find(r=>r.id===quranReciter)?.name||"Unknown"):currentReciter.name}</span>
          </div>
        </div>
        <div style={{overflowY:"auto",padding:"0 12px 28px"}}>
          {groups.map(group=>{
            const groupReciters=list.filter(r=>r.tag===group);
            if(!groupReciters.length) return null;
            return (
              <div key={group} style={{marginBottom:12}}>
                <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.50)":"rgba(140,100,20,0.50)",letterSpacing:".14em",textTransform:"uppercase",fontWeight:700,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                  <span>{group==="Masjid Al-Haram"?"🕋":group==="Masjid An-Nabawi"?"🌙":"🎙️"} {group}</span>
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
