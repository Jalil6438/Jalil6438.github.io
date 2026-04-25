import { useState, useEffect } from "react";

export default function MushafRangePickerModal({
  show, onClose, dark, mushafPage, mushafVerses,
  mushafRangeStart, setMushafRangeStart,
  mushafRangeEnd, setMushafRangeEnd,
  playMushafRange,
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
        const isPicked = (pickerMode === "from" && i === startIdx) || (pickerMode === "to" && i === endIdx);
        return(
          <div key={vKey} className="sbtn"
            onClick={()=>onPick(i)}
            style={{padding:"10px 14px",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,
              background:isPicked?"rgba(217,177,95,0.14)":"rgba(255,255,255,0.03)",
              border:`1px solid ${isPicked?"rgba(232,200,120,0.70)":"rgba(217,177,95,0.08)"}`,
            }}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
              <div style={{fontSize:10,fontFamily:"'IBM Plex Mono',monospace",color:"rgba(217,177,95,0.50)",minWidth:42}}>{vKey}</div>
            </div>
            <div style={{flex:1,minWidth:0,fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:18,lineHeight:1.7,color:isPicked?"#F5E6B3":"rgba(243,231,200,0.65)",direction:"rtl",textAlign:"right"}}>{(v.text_uthmani||"").replace(/۟/g,"ْ")}</div>
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
                  style={{flex:1,padding:"12px 14px",borderRadius:12,background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.04)",border:"1px solid rgba(217,177,95,0.14)",display:"flex",flexDirection:"column",gap:4}}>
                  <div style={{fontSize:9,color:"rgba(217,177,95,0.55)",letterSpacing:".18em",textTransform:"uppercase",fontWeight:700}}>{f.label}</div>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:15,color:dark?"#F3E7C8":"#3D2E0A",fontWeight:700}}>{f.value || "—"}</div>
                </div>
              ))}
            </div>

            <div className="sbtn"
              onClick={()=>{
                const slice=mushafVerses.slice(startIdx,endIdx+1);
                onClose();
                playMushafRange(slice);
              }}
              style={{width:"100%",padding:"14px",borderRadius:14,textAlign:"center",background:"linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)",color:"#060A07",fontSize:14,fontWeight:700,border:"1px solid transparent",boxShadow:"0 8px 24px rgba(212,175,55,0.22)"}}>
              Play {startKey} → {endKey}
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
