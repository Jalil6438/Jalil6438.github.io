import React from "react";
import { JUZ_META, JUZ_SURAHS } from "../data/quran-metadata";

export default function JuzSelectorModal({
  show,
  onClose,
  dark,
  sessionJuz,
  setSessionJuz,
  juzStatus,
  juzProgress,
  setJuzProgress,
  sessionIdx,
  setSessionIdx,
  setRepCounts,
  setConnectionReps,
  setOpenAyah,
}){
  if(!show) return null;

  // Find the furthest juz the user has reached (first incomplete in hifz order 30→1)
  const isJuzDone=(n)=>juzStatus[n]==="complete"||(JUZ_SURAHS[n]||[]).every(s=>juzStatus[`s${s.s}`]==="complete");
  let furthestJuz=30;
  for(let j=30;j>=1;j--){ if(!isJuzDone(j)){ furthestJuz=j; break; } }
  const furthestOrder=(JUZ_META.find(j=>j.num===furthestJuz)||{}).order||1;
  const isJuzUnlocked=(juzNum)=>{
    if(juzNum===sessionJuz) return true;
    if(juzStatus[juzNum]==="complete") return true;
    const surahs=JUZ_SURAHS[juzNum]||[];
    if(surahs.some(s=>juzStatus[`s${s.s}`]==="complete")) return true;
    const jOrder=(JUZ_META.find(j=>j.num===juzNum)||{}).order||99;
    return jOrder<=furthestOrder;
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.80)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",padding:"16px 18px 32px",width:"100%",maxWidth:520,maxHeight:"70vh",overflowY:"auto",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:dark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)",borderRadius:2,margin:"0 auto 14px"}}/>

        {/* Header divider */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div style={{flex:1,height:1,background:dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.50) 100%)":"linear-gradient(90deg,rgba(140,100,20,0) 0%,rgba(140,100,20,0.30) 100%)"}}/>
          <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.70)":"rgba(100,70,10,0.65)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600,whiteSpace:"nowrap"}}>Select Juz</div>
          <div style={{flex:1,height:1,background:dark?"linear-gradient(90deg,rgba(232,200,120,0.50) 0%,rgba(217,177,95,0) 100%)":"linear-gradient(90deg,rgba(140,100,20,0.30) 0%,rgba(140,100,20,0) 100%)"}}/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,paddingBottom:8}}>
          {JUZ_META.slice().reverse().map(j=>{
            const isSel=sessionJuz===j.num;
            const isDone=juzStatus[j.num]==="complete"||(JUZ_SURAHS[j.num]||[]).every(s=>juzStatus[`s${s.s}`]==="complete");
            const unlocked=isJuzUnlocked(j.num);
            return (
              <div key={j.num} className={unlocked?"sbtn":""} onClick={()=>{ if(!unlocked)return; setJuzProgress(prev=>({...prev,[sessionJuz]:sessionIdx})); setSessionJuz(j.num); setSessionIdx(juzProgress[j.num]||0); setRepCounts({});setConnectionReps({}); setOpenAyah(null); onClose(); }}
                style={{padding:"13px 16px",borderRadius:14,textAlign:"center",transition:"all .18s",
                  background:isSel?(dark?"rgba(217,177,95,0.14)":"rgba(180,140,40,0.12)"):isDone?(dark?"rgba(217,177,95,0.06)":"rgba(180,140,40,0.06)"):unlocked?(dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)"):(dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)"),
                  border:`1px solid ${isSel?(dark?"rgba(232,200,120,0.65)":"rgba(160,120,20,0.55)"):isDone?(dark?"rgba(217,177,95,0.25)":"rgba(160,120,20,0.25)"):unlocked?(dark?"rgba(217,177,95,0.15)":"rgba(0,0,0,0.12)"):(dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.05)")}`,
                  boxShadow:isSel?"0 0 28px rgba(232,200,120,0.30),0 0 8px rgba(217,177,95,0.20),inset 0 0 14px rgba(217,177,95,0.08)":"none",
                  opacity:unlocked?1:0.3,
                  pointerEvents:unlocked?"auto":"none"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:isSel?(dark?"#F6E27A":"#6B4F00"):isDone?(dark?"#E2BC72":"#8B6914"):unlocked?(dark?"rgba(243,231,200,0.70)":"rgba(40,30,10,0.65)"):(dark?"rgba(243,231,200,0.30)":"rgba(40,30,10,0.25)"),fontWeight:600}}>Juz {j.num}</div>
                {isDone&&(
                  <div style={{fontSize:10,color:isSel?(dark?"rgba(246,226,122,0.60)":"rgba(107,79,0,0.60)"):(dark?"rgba(230,184,74,0.55)":"rgba(140,100,20,0.60)"),marginTop:4,textShadow:dark?"0 0 8px rgba(230,184,74,0.15)":"none"}}>Complete — Alhamdulillah</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
