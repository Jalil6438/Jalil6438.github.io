import { toArabicDigits, normalizeUthmani } from "../utils";

// Surah closer modal (الربط) — takes the screen when a surah is ready for its
// "all N ayahs together × 10" closer; tap to count to 10. Visibility/dismiss is
// controlled by the parent (rendered only when showCloserModal && activeCloser).
// Pure presentational — extracted verbatim from MyHifzTab.
export default function CloserModal({ activeCloser, connectionReps, setConnectionReps, setCloserModalDismissed, dark }) {
  const cr = connectionReps[activeCloser.key] || 0;
  const pct = Math.min((cr / 10) * 100, 100);
  // Only call it a "Surah Closer" when this group actually reaches the surah's
  // final ayah (a surah can span multiple pages). Sections of a page connect a
  // section; a full-page group that isn't the surah's end connects the page.
  const closesSurah = !!activeCloser.closesSurah;
  const isSection = /-s[12]$/.test(activeCloser.key);
  const closerKind = closesSurah ? "Surah Closer" : isSection ? "Section Closer" : "Page Closer";
  const closerNote = closesSurah
    ? "Recite all ayahs together 10 times to seal the surah in memory."
    : isSection
      ? "Recite all ayahs together 10 times to connect this section."
      : "Recite all ayahs together 10 times to connect this page.";
  return (
    <div onClick={()=>setCloserModalDismissed(true)} style={{position:"fixed",inset:0,zIndex:260,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",background:"rgba(0,0,0,0.78)",backdropFilter:"blur(8px)"}}>
      <div className="fi" onClick={e=>e.stopPropagation()} style={{position:"relative",maxWidth:520,width:"100%",maxHeight:"88vh",overflowY:"auto",borderRadius:22,padding:"28px 22px 22px",background:dark?"radial-gradient(circle at 50% 0%,rgba(212,175,55,0.14),rgba(0,0,0,0) 55%),linear-gradient(180deg,rgba(15,26,43,0.99) 0%,rgba(10,17,32,1) 100%)":"#EADFC8",border:`1px solid ${dark?"rgba(217,177,95,0.35)":"rgba(140,100,20,0.30)"}`,boxShadow:"0 30px 70px rgba(0,0,0,0.60),0 0 40px rgba(212,175,55,0.15)"}}>
        <div className="sbtn" onClick={()=>setCloserModalDismissed(true)} style={{position:"absolute",top:12,right:16,fontSize:22,lineHeight:1,color:dark?"rgba(243,231,200,0.35)":"rgba(45,42,38,0.40)"}}>×</div>
        <div style={{textAlign:"center",marginBottom:18,paddingTop:4}}>
          <div style={{fontSize:10,letterSpacing:".22em",textTransform:"uppercase",fontWeight:700,color:dark?"rgba(217,177,95,0.75)":"rgba(140,100,20,0.70)",marginBottom:6}}>{closerKind} (الربط)</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:dark?"#F3E7BF":"#3D2E0A",lineHeight:1.3}}>{activeCloser.label}</div>
          <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.50)":"rgba(100,70,10,0.65)",marginTop:6,lineHeight:1.5}}>{closerNote}</div>
        </div>
        <div className="sbtn" onClick={()=>setConnectionReps(prev=>({...prev,[activeCloser.key]:Math.min(10,(prev[activeCloser.key]||0)+1)}))}
          style={{padding:"16px 16px 18px",borderRadius:14,cursor:"pointer",transition:"all .2s",background:dark?"rgba(212,175,55,0.06)":"rgba(212,175,55,0.06)",border:`1.5px solid ${dark?"rgba(212,175,55,0.35)":"rgba(140,100,20,0.30)"}`,boxShadow:"0 0 14px rgba(212,175,55,0.12),0 4px 14px rgba(0,0,0,0.18)"}}>
          <div style={{direction:"rtl",textAlign:"center",lineHeight:2,marginBottom:12}}>
            {activeCloser.ayahs.map(a=>(
              <span key={a.verse_key}>
                <span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:22,color:dark?"rgba(243,231,200,0.90)":"rgba(40,30,10,0.90)"}}>{normalizeUthmani(a.text_uthmani)}</span>
                <span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:22,color:dark?"rgba(212,175,55,0.55)":"rgba(140,100,20,0.55)",margin:"0 4px"}}>{toArabicDigits(parseInt(a.verse_key.split(":")[1],10))}</span>
              </span>
            ))}
          </div>
          <div style={{fontSize:13,fontWeight:700,color:dark?"rgba(243,231,200,0.80)":"#3D2E0A",marginBottom:8,textAlign:"center"}}>Recited <span style={{color:"#F0C040",fontSize:16}}>{cr}/10</span> · Tap to count</div>
          <div style={{width:"100%",height:6,borderRadius:999,background:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,borderRadius:999,background:"linear-gradient(90deg,#E6B84A,#F0C040)",transition:"width .35s cubic-bezier(.4,0,.2,1)"}}/>
          </div>
        </div>
      </div>
    </div>
  );
}
