export default function QuranJuzModal({
  show, onClose, dark, JUZ_PAGES,
  mushafJuzNum, setMushafJuzNum, setMushafPage,
}){
  if(!show) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.80)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",padding:"16px 18px 32px",width:"100%",maxWidth:520,maxHeight:"70vh",overflowY:"auto",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:"rgba(255,255,255,0.10)",borderRadius:2,margin:"0 auto 14px"}}/>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.50) 100%)"}}/>
          <div style={{fontSize:9,color:"rgba(217,177,95,0.70)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600}}>Select Juz</div>
          <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(232,200,120,0.50) 0%,rgba(217,177,95,0) 100%)"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {Array.from({length:30},(_,i)=>i+1).map(jNum=>{
            const isSel=mushafJuzNum===jNum;
            const pg=JUZ_PAGES[jNum-1]||1;
            return(
              <div key={jNum} className="sbtn" onClick={()=>{setMushafJuzNum(jNum);setMushafPage(pg);onClose();}}
                style={{padding:"13px 16px",borderRadius:14,textAlign:"center",
                  background:isSel?"rgba(217,177,95,0.12)":"rgba(255,255,255,0.03)",
                  border:`1px solid ${isSel?"rgba(232,200,120,0.65)":"rgba(217,177,95,0.12)"}`,
                  boxShadow:isSel?"0 0 28px rgba(232,200,120,0.30),inset 0 0 14px rgba(217,177,95,0.08)":"none"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:600,color:isSel?"#F6E27A":"rgba(243,231,200,0.70)"}}>Juz {jNum}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
