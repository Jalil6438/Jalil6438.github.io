import MUTASHABIHAT from "../mutashabihat.json";
import { SURAH_EN } from "../data/constants";
import { saveCompletedAyahs, normalizeUthmani } from "../utils";
import SimilarVerses from "./SimilarVerses";

// Ayah detail popup for all non-Asr sessions — Arabic + reference + translation,
// audio play/loop, the Fajr rep counter (20×), and similar-verses (المتشابهات).
// Visibility is controlled by the parent (rendered only when
// currentSessionId !== "asr" && openAyah). Returns null if the open ayah isn't in
// the batch. Pure presentational — extracted verbatim from MyHifzTab.
export default function AyahPopupModal({
  batch, openAyah, setOpenAyah, translations,
  playingKey, audioLoading, repCounts, setRepCounts, repTarget,
  currentSessionId, dark, hasPerAyah, reciter, currentReciter, playAyah,
  looping, setLooping, audioRef, completedAyahs, setCompletedAyahs,
  sessionVerses, simVerseCache, fetchSimVerse, sessionJuz, tutorialMode = false,
}) {
  const mv=batch.find(v=>v.verse_key===openAyah);
  if(!mv) return null;
  const mvKey=mv.verse_key;
  const mvSurah=mv.surah_number||parseInt(mvKey.split(":")[0],10);
  const mvAyah=mvKey.split(":")[1];
  const mvTrans=translations[mvKey];
  const mvPlaying=playingKey===mvKey;
  const mvLoading=audioLoading===mvKey;
  const mvReps=repCounts[mvKey]||0;
  const mvRepsDone=mvReps>=repTarget;
  const mvPct=Math.min((mvReps/repTarget)*100,100);
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",background:"rgba(0,0,0,0.70)",backdropFilter:"blur(6px)"}} onClick={()=>setOpenAyah(null)}>
      <div className="fi" style={{position:"relative",width:"100%",maxWidth:400,maxHeight:"85vh",overflowY:"auto",borderRadius:24,padding:"28px 22px 22px",background:dark?"radial-gradient(circle at 50% 0%,rgba(58,92,165,0.10) 0%,rgba(0,0,0,0) 40%),linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",border:"1px solid rgba(217,177,95,0.15)",boxShadow:"0 24px 60px rgba(0,0,0,0.50),0 0 30px rgba(217,177,95,0.06)"}} onClick={e=>e.stopPropagation()}>
        <div className="sbtn" onClick={()=>setOpenAyah(null)} style={{position:"absolute",top:14,right:18,fontSize:18,color:"rgba(243,231,200,0.30)"}}>×</div>
        {/* Current ayah — keep the student's focus on what they're memorizing */}
        <div style={{fontSize:9,letterSpacing:".18em",textTransform:"uppercase",fontWeight:700,color:dark?"rgba(230,184,74,0.55)":"rgba(140,100,20,0.55)",textAlign:"center",marginBottom:4}}>Current Ayah · {mvKey}</div>
        <div style={{direction:"rtl",textAlign:"center",fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:"clamp(22px,5.4vw,31px)",lineHeight:2,color:"#F3E7C8",marginBottom:16}}>
          {normalizeUthmani(mv.text_uthmani)}
        </div>
        {/* Reference */}
        <div style={{textAlign:"center",fontSize:12,color:"rgba(243,231,200,0.45)",marginBottom:20}}>
          Ayah {mvAyah} of Surah {SURAH_EN[mvSurah]||mvSurah}
        </div>
        {/* Translation */}
        <div style={{color:"rgba(243,231,200,0.78)",fontSize:14,lineHeight:1.8,textAlign:"center",marginBottom:18}}>
          {mvTrans===undefined?<span style={{color:"rgba(243,231,200,0.42)"}}>Loading...</span>:mvTrans||<span style={{color:"rgba(243,231,200,0.42)"}}>Translation unavailable</span>}
        </div>
        {/* Audio controls */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16}}>
          <div className="sbtn" onClick={()=>(hasPerAyah(reciter)||currentReciter?.qulSlug)?playAyah(mvKey,mvKey):null} style={{width:56,height:56,borderRadius:"50%",background:dark?(mvPlaying?"radial-gradient(circle at 50% 40%,rgba(212,175,55,0.12),rgba(12,20,34,0.95))":"radial-gradient(circle at 50% 40%,rgba(212,175,55,0.06),rgba(12,20,34,0.95))"):(mvPlaying?"radial-gradient(circle at 50% 40%,rgba(139,106,16,0.10),rgba(228,216,184,0.95))":"radial-gradient(circle at 50% 40%,rgba(139,106,16,0.04),rgba(228,216,184,0.95))"),border:`1.5px solid ${mvPlaying?"rgba(212,175,55,0.40)":"rgba(212,175,55,0.30)"}`,boxShadow:"0 0 12px rgba(212,175,55,0.18), 0 4px 14px rgba(0,0,0,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:mvPlaying?(dark?"#F0C040":"#6B645A"):(dark?"rgba(243,231,200,0.75)":"#5A4A20"),opacity:(hasPerAyah(reciter)||currentReciter?.qulSlug)?1:0.4}}>
            {mvLoading?<div className="spin" style={{width:14,height:14,border:"2px solid rgba(212,175,55,0.3)",borderTopColor:"#D4AF37",borderRadius:"50%"}}/>:(mvPlaying?"⏸":"▶")}
          </div>
          <div className="sbtn" onClick={()=>{setLooping(l=>{const next=!l;if(audioRef.current)audioRef.current.loop=next;return next;});}} style={{width:56,height:56,borderRadius:"50%",background:dark?(looping?"radial-gradient(circle at 50% 40%,rgba(212,175,55,0.12),rgba(12,20,34,0.95))":"radial-gradient(circle at 50% 40%,rgba(212,175,55,0.06),rgba(12,20,34,0.95))"):(looping?"radial-gradient(circle at 50% 40%,rgba(139,106,16,0.10),rgba(228,216,184,0.95))":"radial-gradient(circle at 50% 40%,rgba(139,106,16,0.04),rgba(228,216,184,0.95))"),border:`1.5px solid ${looping?"rgba(212,175,55,0.40)":"rgba(212,175,55,0.30)"}`,boxShadow:"0 0 12px rgba(212,175,55,0.18), 0 4px 14px rgba(0,0,0,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:looping?(dark?"#F0C040":"#6B645A"):(dark?"rgba(243,231,200,0.75)":"#5A4A20")}}>🔁</div>
        </div>
        {/* Rep counter — only in Fajr (new memorization). Review sessions
            show translation + audio only; no rep taps to avoid confusing
            users into thinking reviews involve 20× repetition. */}
        {currentSessionId==="fajr"&&(
          <div data-tut="guided-rep" className={mvRepsDone?"rep-done-glow":""} onClick={()=>{setRepCounts(prev=>{const newCount=Math.min(repTarget,(prev[mvKey]||0)+1);if(newCount>=repTarget&&!tutorialMode&&!completedAyahs.has(mvKey)){setCompletedAyahs(ca=>{const next=new Set(ca);next.add(mvKey);saveCompletedAyahs(next);return next;});}if(newCount>=repTarget){setTimeout(()=>setOpenAyah(null),450);}return{...prev,[mvKey]:newCount};});}}
            style={{width:"100%",padding:"14px",borderRadius:14,textAlign:"center",cursor:"pointer",transition:"all .3s ease",
              background:dark?(mvRepsDone?"rgba(212,175,55,0.10)":"rgba(212,175,55,0.04)"):(mvRepsDone?"rgba(0,0,0,0.08)":"rgba(0,0,0,0.03)"),
              border:`1.5px solid ${mvRepsDone?"rgba(212,175,55,0.45)":"rgba(212,175,55,0.25)"}`,
              boxShadow:mvRepsDone?"0 0 16px rgba(212,175,55,0.20), 0 4px 14px rgba(0,0,0,0.15)":"0 0 12px rgba(212,175,55,0.12), 0 4px 14px rgba(0,0,0,0.10)"}}>
            {mvRepsDone?(
              <div style={{fontSize:13,fontWeight:700,color:"#E6B84A"}}>✓ {repTarget}/{repTarget} Complete — MashaAllah!</div>
            ):(
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.7)",marginBottom:8}}>Recited <span style={{color:"#F0C040",fontWeight:700,transition:"all .2s"}}>{mvReps}/{repTarget}</span> · Tap after each recitation</div>
                <div style={{width:"100%",height:5,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                  <div style={{width:`${mvPct}%`,height:"100%",borderRadius:999,background:mvPct>=100?"linear-gradient(90deg,#D4AF37,#F6E27A)":"linear-gradient(90deg,rgba(220,90,90,0.85) 0%,rgba(224,178,66,0.9) 55%,rgba(56,214,126,0.9) 100%)",transition:"width 0.4s cubic-bezier(.4,0,.2,1)"}}/>
                </div>
              </div>
            )}
          </div>
        )}
        {currentSessionId==="fajr"&&mvReps>0&&<div className="sbtn" onClick={()=>setRepCounts(prev=>({...prev,[mvKey]:0}))} style={{textAlign:"center",fontSize:10,color:"rgba(255,255,255,0.2)",marginTop:8}}>Restart</div>}
        {/* Similar verses (المتشابهات) — before/after context + location + status */}
        <SimilarVerses
          mvKey={mvKey}
          matches={MUTASHABIHAT[mvKey]}
          completedAyahs={completedAyahs}
          sessionJuz={sessionJuz}
          dark={dark}
          resolveText={k=>{const v=batch.find(x=>x.verse_key===k)||sessionVerses.find(x=>x.verse_key===k);return v?normalizeUthmani(v.text_uthmani):simVerseCache[k];}}
          requestFetch={fetchSimVerse}
        />
      </div>
    </div>
  );
}
