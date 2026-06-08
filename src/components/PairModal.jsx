import { toArabicDigits, normalizeUthmani } from "../utils";

// Connection-phase pair modal (الربط) — pops when a pair unlocks; tap each pair
// to count to 10. Auto-close/dismiss is controlled by the parent (rendered only
// when showPairModal). Pure presentational — extracted verbatim from MyHifzTab.
export default function PairModal({ connVisiblePairs, connectionReps, setConnectionReps, newestPairRef, setPairModalDismissed, dark }) {
  return (
    <div onClick={()=>setPairModalDismissed(true)} style={{position:"fixed",inset:0,zIndex:250,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",background:"rgba(0,0,0,0.72)",backdropFilter:"blur(6px)"}}>
      <div className="fi" onClick={e=>e.stopPropagation()} style={{position:"relative",maxWidth:460,width:"100%",maxHeight:"85vh",overflowY:"auto",scrollBehavior:"smooth",borderRadius:20,padding:"24px 20px 20px",background:dark?"linear-gradient(180deg,rgba(15,26,43,0.98) 0%,rgba(10,17,32,0.99) 100%),radial-gradient(circle at 50% 0%,rgba(212,175,55,0.08),transparent 60%)":"#EADFC8",border:`1px solid ${dark?"rgba(217,177,95,0.25)":"rgba(140,100,20,0.25)"}`,boxShadow:"0 24px 60px rgba(0,0,0,0.55),0 0 30px rgba(212,175,55,0.08)"}}>
        <div className="sbtn" onClick={()=>setPairModalDismissed(true)} style={{position:"absolute",top:12,right:16,fontSize:22,lineHeight:1,color:dark?"rgba(243,231,200,0.35)":"rgba(45,42,38,0.40)"}}>×</div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingRight:18}}>
          <div style={{fontSize:20}}>🔗</div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:dark?"#E8C76A":"#6B4F00"}}>Connection Phase (الربط)</div>
            <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.50)":"rgba(100,70,10,0.60)",marginTop:2,lineHeight:1.4}}>Recite each pair 10 times to link them together, while they are fresh.</div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {connVisiblePairs.map((step,idx)=>{
            const cr=connectionReps[step.key]||0;
            const crDone=cr>=10;
            const pct=Math.min((cr/10)*100,100);
            return (
              <div key={step.key} ref={idx===0?newestPairRef:null} className="sbtn" onClick={()=>setConnectionReps(prev=>({...prev,[step.key]:Math.min(10,(prev[step.key]||0)+1)}))}
                style={{padding:"12px 14px",borderRadius:12,cursor:"pointer",userSelect:"none",background:dark?(crDone?"rgba(74,222,128,0.08)":"rgba(255,255,255,0.03)"):(crDone?"rgba(74,222,128,0.08)":"rgba(0,0,0,0.03)"),border:`1px solid ${crDone?(dark?"rgba(74,222,128,0.30)":"rgba(46,204,113,0.35)"):(dark?"rgba(217,177,95,0.18)":"rgba(0,0,0,0.10)")}`,transition:"all .15s"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{fontSize:12,fontWeight:600,color:crDone?(dark?"#4ADE80":"#2ECC71"):(dark?"rgba(243,231,200,0.75)":"#3D2E0A")}}>{step.label}</div>
                  <div style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",color:crDone?"#4ADE80":"rgba(230,184,74,0.65)"}}>{cr}/10</div>
                </div>
                <div style={{direction:"rtl",textAlign:"right",lineHeight:2}}>
                  {step.ayahs.map((a,ai)=>(
                    <span key={a.verse_key}><span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:22,color:dark?"rgba(243,231,200,0.80)":"rgba(40,30,10,0.80)"}}>{normalizeUthmani(a.text_uthmani)}</span>{ai<step.ayahs.length-1&&<span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:22,color:dark?"rgba(212,175,55,0.55)":"rgba(140,100,20,0.55)",margin:"0 4px"}}>{toArabicDigits(parseInt(a.verse_key.split(":")[1],10))}</span>}</span>
                  ))}
                </div>
                <div style={{height:3,marginTop:8,borderRadius:999,background:dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:crDone?"#4ADE80":"linear-gradient(90deg,#E6B84A,#F0C040)",borderRadius:999,transition:"width .3s"}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
