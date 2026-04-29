import { useState, useEffect } from "react";
import { SURAH_EN } from "../data/constants";

function formatLabel(verseKey){
  if(!verseKey) return "—";
  const [s,a]=verseKey.split(":");
  return `${SURAH_EN[Number(s)]||`Surah ${s}`} ${a}`;
}

export default function MushafRangePickerModal({
  show, onClose, dark, mushafPage, mushafVerses,
  mushafRangeStart, setMushafRangeStart,
  mushafRangeEnd, setMushafRangeEnd,
  playMushafRange,
  looping, setLooping,
}){
  const [pickerMode, setPickerMode] = useState("compact"); // "compact" | "from" | "to"

  // Default the range to the full page on first open so the compact view
  // always has a meaningful From / To to display.
  useEffect(() => {
    if (show && mushafVerses.length) {
      if (mushafRangeStart === null) setMushafRangeStart(0);
      if (mushafRangeEnd === null) setMushafRangeEnd(mushafVerses.length - 1);
    }
    if (!show) setPickerMode("compact");
  }, [show, mushafVerses.length]);

  if(!show) return null;

  const startIdx = mushafRangeStart ?? 0;
  const endIdx = mushafRangeEnd ?? (mushafVerses.length - 1);
  const startKey = mushafVerses[startIdx]?.verse_key;
  const endKey = mushafVerses[endIdx]?.verse_key;

  const renderAyahList = (onPick) => (
    <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
      {mushafVerses.map((v,i)=>{
        const vKey=v.verse_key;
        const [s,a]=vKey.split(":");
        const surahName=SURAH_EN[Number(s)]||`Surah ${s}`;
        const isPicked = (pickerMode === "from" && i === startIdx) || (pickerMode === "to" && i === endIdx);
        return(
          <div key={vKey} className="sbtn"
            onClick={()=>onPick(i)}
            style={{padding:"10px 14px",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,
              background:isPicked?"rgba(217,177,95,0.14)":"rgba(255,255,255,0.03)",
              border:`1px solid ${isPicked?"rgba(232,200,120,0.70)":"rgba(217,177,95,0.08)"}`,
            }}>
            <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0,minWidth:90}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:isPicked?"#F6E27A":"rgba(243,231,200,0.85)"}}>{surahName}</div>
              <div style={{fontSize:9,color:"rgba(217,177,95,0.55)",letterSpacing:".08em",fontFamily:"'IBM Plex Mono',monospace"}}>Ayah {a}</div>
            </div>
            <div style={{flex:1,minWidth:0,fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:17,lineHeight:1.5,color:isPicked?"#F5E6B3":"rgba(243,231,200,0.65)",direction:"rtl",textAlign:"right",overflow:"hidden",whiteSpace:"nowrap",WebkitMaskImage:"linear-gradient(to left, black 65%, transparent 100%)",maskImage:"linear-gradient(to left, black 65%, transparent 100%)"}}>{(v.text_uthmani||"").replace(/۟/g,"ْ")}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",padding:"16px 18px 32px",width:"100%",maxWidth:520,maxHeight:"70vh",overflowY:"auto",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:"rgba(255,255,255,0.10)",borderRadius:2,margin:"0 auto 14px"}}/>

        {pickerMode === "compact" ? (
          <>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(217,177,95,0),rgba(232,200,120,0.50))"}}/>
              <div style={{fontSize:9,color:"rgba(217,177,95,0.70)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600}}>Play Range</div>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(232,200,120,0.50),rgba(217,177,95,0))"}}/>
            </div>
            <div style={{fontSize:11,color:"rgba(217,177,95,0.40)",textAlign:"center",marginBottom:18}}>Page {mushafPage} · {mushafVerses.length} ayahs</div>

            <div style={{display:"flex",gap:10,marginBottom:20}}>
              {[
                {label:"From", value:startKey, onClick:()=>setPickerMode("from")},
                {label:"To",   value:endKey,   onClick:()=>setPickerMode("to")},
              ].map(f=>(
                <div key={f.label} className="sbtn" onClick={f.onClick}
                  style={{flex:1,minWidth:0,padding:"12px 14px",borderRadius:12,background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.04)",border:"1px solid rgba(217,177,95,0.14)",display:"flex",flexDirection:"column",gap:4}}>
                  <div style={{fontSize:9,color:"rgba(217,177,95,0.55)",letterSpacing:".18em",textTransform:"uppercase",fontWeight:700}}>{f.label}</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:dark?"#F3E7C8":"#3D2E0A",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{formatLabel(f.value)}</div>
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:10,alignItems:"stretch"}}>
              <div className="sbtn"
                onClick={()=>{
                  const slice=mushafVerses.slice(startIdx,endIdx+1);
                  onClose();
                  playMushafRange(slice);
                }}
                style={{flex:1,padding:"14px",borderRadius:14,textAlign:"center",background:"linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)",color:"#060A07",fontSize:14,fontWeight:700,border:"1px solid transparent",boxShadow:"0 8px 24px rgba(212,175,55,0.22)"}}>
                Play {formatLabel(startKey)} → {formatLabel(endKey)}
              </div>
              {setLooping&&(
                <div className="sbtn" onClick={()=>setLooping(!looping)} title={looping?"Repeat on":"Repeat off"}
                  style={{flexShrink:0,padding:"0 12px",borderRadius:14,display:"flex",alignItems:"center",gap:8,
                    background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",
                    border:`1px solid ${looping?"rgba(232,200,120,0.55)":"rgba(217,177,95,0.14)"}`}}>
                  <span style={{fontSize:16,opacity:looping?1:0.55}}>🔁</span>
                  <div style={{position:"relative",width:34,height:20,borderRadius:999,background:looping?"linear-gradient(90deg,#D4AF37,#8B6A10)":dark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.18)",transition:"background .2s"}}>
                    <div style={{position:"absolute",top:2,left:looping?16:2,width:16,height:16,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.30)",transition:"left .2s"}}/>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div className="sbtn" onClick={()=>setPickerMode("compact")} style={{fontSize:11,fontWeight:700,color:dark?"#E6B84A":"#8B6A10",padding:"6px 10px",borderRadius:8,background:dark?"rgba(230,184,74,0.08)":"rgba(180,140,40,0.06)",border:dark?"1px solid rgba(230,184,74,0.25)":"1px solid rgba(160,120,20,0.25)"}}>← Back</div>
              <div style={{fontSize:9,color:"rgba(217,177,95,0.70)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600}}>Pick {pickerMode === "from" ? "Start" : "End"} Ayah</div>
              <div style={{width:48}}/>
            </div>
            {renderAyahList((i)=>{
              if (pickerMode === "from") {
                setMushafRangeStart(i);
                if (mushafRangeEnd !== null && i > mushafRangeEnd) setMushafRangeEnd(i);
              } else {
                setMushafRangeEnd(i);
                if (mushafRangeStart !== null && i < mushafRangeStart) setMushafRangeStart(i);
              }
              setPickerMode("compact");
            })}
          </>
        )}
      </div>
    </div>
  );
}
