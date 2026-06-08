import { getSessionWisdom } from "../data/sessions";

// Per-session wisdom card (Qur'an ayah / hadith / Shaykh quote) shown under the
// current-session header. Returns null once the session is done or if there's no
// wisdom for it. Pure presentational — extracted verbatim from MyHifzTab.
export default function SessionWisdom({ sid, wisdomOffset, isDone, dark }) {
  const w = getSessionWisdom(sid, (sid === "fajr" || sid === "dhuhr" || sid === "asr") ? wisdomOffset : 0);
  if (!w || isDone) return null;
  return (
    <div style={{marginTop:8,padding:"10px 12px",borderRadius:8,background:dark?"rgba(217,177,95,0.04)":"rgba(180,140,40,0.04)",border:`1px solid ${dark?"rgba(217,177,95,0.08)":"rgba(140,100,20,0.08)"}`,textAlign:"center"}}>
      {w.type==="quran"&&<div style={{fontFamily:"'Amiri',serif",fontSize:14,color:dark?"rgba(232,200,120,0.65)":"rgba(140,100,20,0.70)",direction:"rtl",lineHeight:1.8,marginBottom:6}}>{w.arabic}</div>}
      <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.50)":"#5A4A2A",lineHeight:1.5,fontStyle:w.type==="quran"?"italic":"normal"}}>"{w.text}"</div>
      <div style={{fontSize:9,color:dark?"rgba(230,184,74,0.35)":"rgba(140,100,20,0.40)",marginTop:4}}>
        {w.type==="quran"?`— ${w.ref}`:w.type==="hadith"?`— From ${w.src||w.attr}`:w.attr?`— From ${w.attr}`:"— From Sheikh Abdul Muhsin Al-Qasim"}
      </div>
    </div>
  );
}
