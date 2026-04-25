export default function MushafRangePickerModal({
  show, onClose, dark, mushafPage, mushafVerses,
  mushafRangeStart, setMushafRangeStart,
  mushafRangeEnd, setMushafRangeEnd,
  playMushafRange,
}){
  if(!show) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",padding:"16px 18px 32px",width:"100%",maxWidth:520,maxHeight:"70vh",overflowY:"auto",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:"rgba(255,255,255,0.10)",borderRadius:2,margin:"0 auto 14px"}}/>

        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
          <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(217,177,95,0),rgba(232,200,120,0.50))"}}/>
          <div style={{fontSize:9,color:"rgba(217,177,95,0.70)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600}}>Select Ayah Range</div>
          <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(232,200,120,0.50),rgba(217,177,95,0))"}}/>
        </div>
        <div style={{fontSize:11,color:"rgba(217,177,95,0.40)",textAlign:"center",marginBottom:16}}>Page {mushafPage} · {mushafVerses.length} ayahs</div>

        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
          {mushafVerses.map((v,i)=>{
            const vKey=v.verse_key;
            const isStart=mushafRangeStart===i;
            const isEnd=mushafRangeEnd===i;
            const inRange=mushafRangeStart!==null&&mushafRangeEnd!==null&&i>=mushafRangeStart&&i<=mushafRangeEnd;
            return(
              <div key={vKey} className="sbtn"
                onClick={()=>{
                  if(mushafRangeStart===null||mushafRangeEnd!==null){
                    setMushafRangeStart(i); setMushafRangeEnd(null);
                  } else if(i<mushafRangeStart){
                    setMushafRangeStart(i);
                  } else {
                    setMushafRangeEnd(i);
                  }
                }}
                style={{padding:"10px 14px",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,
                  background:inRange?"rgba(217,177,95,0.10)":isStart||isEnd?"rgba(217,177,95,0.14)":"rgba(255,255,255,0.03)",
                  border:`1px solid ${isStart?"rgba(232,200,120,0.70)":isEnd?"rgba(232,200,120,0.50)":inRange?"rgba(217,177,95,0.20)":"rgba(217,177,95,0.08)"}`,
                }}>
                <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                  <div style={{fontSize:10,fontFamily:"'IBM Plex Mono',monospace",color:"rgba(217,177,95,0.50)",minWidth:42}}>{vKey}</div>
                  <div style={{fontSize:10,color:isStart?"#F6E27A":isEnd?"rgba(246,226,122,0.60)":"transparent",fontWeight:600}}>
                    {isStart?"START":isEnd?"END":""}
                  </div>
                </div>
                <div style={{flex:1,minWidth:0,fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:18,lineHeight:1.4,color:inRange||isStart||isEnd?"#F5E6B3":"rgba(243,231,200,0.65)",direction:"rtl",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(v.text_uthmani||"").replace(/۟/g,"ْ")}</div>
              </div>
            );
          })}
        </div>

        <div className="sbtn"
          onClick={()=>{
            const start=mushafRangeStart??0;
            const end=mushafRangeEnd??mushafVerses.length-1;
            const slice=mushafVerses.slice(start,end+1);
            onClose();
            playMushafRange(slice);
          }}
          style={{width:"100%",padding:"14px",borderRadius:14,textAlign:"center",background:mushafRangeStart!==null?"linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)":"rgba(255,255,255,0.04)",color:mushafRangeStart!==null?"#060A07":"rgba(243,231,200,0.30)",fontSize:14,fontWeight:700,border:`1px solid ${mushafRangeStart!==null?"transparent":"rgba(217,177,95,0.12)"}`,boxShadow:mushafRangeStart!==null?"0 8px 24px rgba(212,175,55,0.22)":"none"}}>
          {mushafRangeStart===null?"Tap an ayah to set start range":`Play ${mushafVerses[mushafRangeStart]?.verse_key} → ${mushafVerses[mushafRangeEnd??mushafVerses.length-1]?.verse_key}`}
        </div>
      </div>
    </div>
  );
}
