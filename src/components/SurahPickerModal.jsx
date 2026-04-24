import React from "react";
import { SURAH_EN } from "../data/constants";
import { SURAH_AR, JUZ_SURAHS, JUZ_META } from "../data/quran-metadata";

const SURAH_PAGES={1:1,2:2,3:50,4:77,5:106,6:128,7:151,8:177,9:187,10:208,11:221,12:235,13:249,14:255,15:262,16:267,17:282,18:293,19:305,20:312,21:322,22:332,23:342,24:350,25:359,26:367,27:377,28:385,29:396,30:404,31:411,32:415,33:418,34:428,35:434,36:440,37:446,38:453,39:458,40:467,41:477,42:483,43:489,44:496,45:499,46:502,47:507,48:511,49:515,50:518,51:520,52:523,53:526,54:528,55:531,56:534,57:537,58:542,59:545,60:549,61:551,62:553,63:554,64:556,65:558,66:560,67:562,68:564,69:566,70:568,71:570,72:572,73:574,74:575,75:577,76:578,77:580,78:582,79:583,80:585,81:586,82:587,83:587,84:589,85:590,86:591,87:591,88:592,89:593,90:594,91:595,92:595,93:596,94:596,95:597,96:597,97:598,98:598,99:599,100:599,101:600,102:600,103:601,104:601,105:601,106:602,107:602,108:602,109:603,110:603,111:603,112:604,113:604,114:604};

export default function SurahPickerModal({
  show,
  onClose,
  dark,
  mushafSurahNum,
  setMushafPage,
  setMushafSurahNum,
  setSelectedSurahNum,
}){
  if(!show) return null;
  // Group surahs by their FIRST juz (where the surah begins). A surah that spans
  // multiple juz (like Al-Baqarah) sits under the juz it starts in.
  const surahToFirstJuz = {};
  for (let j = 1; j <= 30; j++) {
    for (const s of (JUZ_SURAHS[j] || [])) {
      if (!(s.s in surahToFirstJuz)) surahToFirstJuz[s.s] = j;
    }
  }
  const juzGroups = [];
  for (let j = 1; j <= 30; j++) {
    const surahs = Object.keys(SURAH_PAGES)
      .map(Number)
      .filter(n => surahToFirstJuz[n] === j)
      .sort((a,b) => a - b);
    if (surahs.length) juzGroups.push({ juz: j, surahs });
  }
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.80)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",padding:"16px 18px 32px",width:"100%",maxWidth:520,maxHeight:"75vh",overflowY:"auto",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:"rgba(255,255,255,0.10)",borderRadius:2,margin:"0 auto 14px"}}/>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.50) 100%)"}}/>
          <div style={{fontSize:9,color:"rgba(217,177,95,0.70)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600}}>Select Surah</div>
          <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(232,200,120,0.50) 0%,rgba(217,177,95,0) 100%)"}}/>
        </div>
        {juzGroups.map(g => {
          const meta = JUZ_META.find(m => m.num === g.juz);
          return (
            <div key={g.juz} style={{marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,padding:"0 2px"}}>
                <div style={{fontSize:10,color:dark?"rgba(217,177,95,0.55)":"rgba(140,100,20,0.60)",letterSpacing:".14em",textTransform:"uppercase",fontWeight:700}}>Juz {g.juz}</div>
                {meta?.roman && <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.35)":"rgba(107,100,90,0.55)",fontStyle:"italic"}}>{meta.roman}</div>}
                <div style={{flex:1,height:1,background:dark?"linear-gradient(90deg,rgba(217,177,95,0.25) 0%,rgba(217,177,95,0) 100%)":"linear-gradient(90deg,rgba(140,100,20,0.25) 0%,rgba(140,100,20,0) 100%)"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {g.surahs.map(n => {
                  const pg = SURAH_PAGES[n];
                  const isSel = mushafSurahNum === n;
                  return (
                    <div key={n} className="sbtn" onClick={()=>{setMushafPage(pg);setMushafSurahNum(n);setSelectedSurahNum(n);onClose();}}
                      style={{padding:"10px 14px",borderRadius:12,display:"flex",alignItems:"center",gap:10,
                        background:isSel?"rgba(217,177,95,0.12)":dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",
                        border:`1px solid ${isSel?"rgba(232,200,120,0.65)":dark?"rgba(217,177,95,0.10)":"rgba(0,0,0,0.08)"}`,
                        boxShadow:isSel?"0 0 18px rgba(232,200,120,0.25),inset 0 0 10px rgba(217,177,95,0.06)":"none"}}>
                      <div style={{fontSize:10,width:26,textAlign:"center",color:isSel?"#F6E27A":dark?"rgba(217,177,95,0.40)":"rgba(107,100,90,0.55)",fontFamily:"'IBM Plex Mono',monospace"}}>{n}</div>
                      <div style={{flex:1,minWidth:0,fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:isSel?600:500,color:isSel?"#F6E27A":dark?"rgba(243,231,200,0.80)":"#2D2A26",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{SURAH_EN[n]}</div>
                      <div style={{fontFamily:"'Amiri',serif",fontSize:14,color:isSel?"rgba(246,226,122,0.70)":dark?"rgba(217,177,95,0.50)":"rgba(107,100,90,0.65)",direction:"rtl",flexShrink:0}}>{SURAH_AR[n]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
