// "My Plan" view (rihlahTab === "timeline") — the hifz plan summary: goal,
// pace, principles of memorization, and a daily-rotating verse. Pure
// presentational; the Arabic verses are copied byte-for-byte from the original.
// The render gate stays in the parent (same pattern as RihlahHome).
export default function PlanTimeline({ dark, setRihlahTab, rihlahScrollRef, userPlanMode, goalYears, goalMonths, goalLabel, dailyNew, timeline, pct, sessionJuz }) {
  return (
        <div ref={rihlahScrollRef} style={{flex:1,overflowY:"auto",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",padding:"16px 16px 24px"}} className="fi gold-particles">

          {/* Header */}
          <div style={{marginBottom:22}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div className="sbtn" onClick={()=>setRihlahTab("home")} style={{padding:"6px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(217,177,95,0.12)",borderRadius:8,fontSize:11,color:"rgba(243,231,200,0.50)"}}>← Back</div>
            </div>
            <div style={{fontSize:9,color:"rgba(217,177,95,0.60)",letterSpacing:".18em",textTransform:"uppercase",fontWeight:600}}>My Plan</div>
          </div>

          {/* ── GOAL SECTION ── */}
          <div style={{marginBottom:24}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#F3E7C8",fontWeight:700,lineHeight:1.2,marginBottom:6}}>
              {userPlanMode==="custom"
                ? `${goalYears}-Year${goalMonths>0?` ${goalMonths}-Month`:""} Hifz Plan`
                : `${goalLabel.replace(" Hafiz","")} Hifz Plan`}
            </div>
            <div style={{fontSize:13,color:"rgba(243,231,200,0.45)"}}>
              {userPlanMode==="custom"
                ? `${dailyNew} ayahs per day`
                : "1 page per day"} · {timeline.juzLeft} juz remaining
            </div>
            <div style={{fontSize:12,color:"rgba(230,184,74,0.40)",marginTop:6}}>
              You are on track — Alhamdulillah
            </div>
            <div style={{marginTop:12,position:"relative"}}>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:5}}>
                <div style={{fontSize:11,color:"rgba(230,184,74,0.55)",fontFamily:"'IBM Plex Mono',monospace"}}>{pct}% · Juz {sessionJuz||"\u2014"}</div>
              </div>
              {/* Gold dust glow behind bar */}
              <div style={{position:"absolute",top:"50%",left:`${Math.max(5,pct/2)}%`,width:`${Math.max(30,pct)}%`,height:60,transform:"translateY(-40%)",background:`radial-gradient(ellipse at center,rgba(212,175,55,${(0.06+pct*0.002).toFixed(3)}) 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>
              <div style={{position:"relative",zIndex:1,height:10,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                <div className="pbfill" style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,#8B7030,#D4AF37 ${Math.max(40,pct)}%,#F6E27A)`,borderRadius:999,boxShadow:`0 0 ${8+Math.round(pct*0.18)}px rgba(212,175,55,${(0.20+pct*0.006).toFixed(2)}), 0 0 ${3+Math.round(pct*0.08)}px rgba(246,226,122,${(0.10+pct*0.004).toFixed(2)})`}}/>
              </div>
            </div>
          </div>

          {/* ── YOUR PACE ── */}
          <div style={{padding:"16px",borderRadius:16,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(217,177,95,0.18)",marginBottom:14,boxShadow:"0 4px 16px rgba(0,0,0,0.22),0 0 10px rgba(217,177,95,0.06)"}}>
            <div style={{fontSize:11,color:"rgba(217,177,95,0.55)",fontWeight:600,letterSpacing:".08em",marginBottom:12}}>Your Pace</div>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0"}}>
              <span style={{fontSize:14}}>📖</span>
              <span style={{fontSize:14,color:"#F3E7C8",fontWeight:600}}>{userPlanMode==="custom"?`${dailyNew} ayahs / day`:"1 page / day"}</span>
            </div>
            <div style={{height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.35) 50%,rgba(217,177,95,0) 100%)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0"}}>
              <span style={{fontSize:14}}>📆</span>
              <span style={{fontSize:14,color:"#F3E7C8",fontWeight:600}}>{userPlanMode==="custom"?`${timeline.juzPerMonth} juz / month`:"~1.5 juz / month"}</span>
            </div>
          </div>


          {/* ── GUIDANCE ── */}
          <div style={{padding:"16px",borderRadius:16,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(217,177,95,0.15)",marginBottom:18,boxShadow:"0 4px 16px rgba(0,0,0,0.20),0 0 8px rgba(217,177,95,0.05)"}}>
            <div style={{fontSize:11,color:"rgba(217,177,95,0.70)",fontWeight:700,letterSpacing:".08em",marginBottom:12}}>Principles of Memorization</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                "Memorization becomes firm with constant repetition",
                "Reviewing what you have memorized is more important than taking on new material",
                "Do not move forward until what you have memorized is firm",
                "Small, consistent efforts lead to great results",
              ].map((t,i)=>(
                <div key={i} style={{display:"flex",gap:8,fontSize:12,color:"rgba(243,231,200,0.55)",lineHeight:1.6}}>
                  <span style={{flexShrink:0,color:"rgba(217,177,95,0.45)"}}>·</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,fontSize:10,color:"rgba(217,177,95,0.30)",fontStyle:"italic"}}>Based on the methodology of Shaykh Abdul Muhsin al-Qasim</div>
          </div>

          {/* ── QURAN VERSE (rotates daily) ── */}
          {(()=>{
            const verses=[
              {ar:"\u0648\u064E\u0644\u064E\u0642\u064E\u062F\u0652 \u064A\u064E\u0633\u0651\u064E\u0631\u0652\u0646\u064E\u0627 \u0627\u0644\u0652\u0642\u064F\u0631\u0652\u0622\u0646\u064E \u0644\u0650\u0644\u0630\u0651\u0650\u0643\u0652\u0631\u0650",en:"\"And We have certainly made the Quran easy for remembrance\"",ref:"Al-Qamar 54:17"},
              {ar:"\u0625\u0650\u0646\u0651\u064E\u0627 \u0646\u064E\u062D\u0652\u0646\u064F \u0646\u064E\u0632\u0651\u064E\u0644\u0652\u0646\u064E\u0627 \u0627\u0644\u0630\u0651\u0650\u0643\u0652\u0631\u064E \u0648\u064E\u0625\u0650\u0646\u0651\u064E\u0627 \u0644\u064E\u0647\u064F \u0644\u064E\u062D\u064E\u0627\u0641\u0650\u0638\u064F\u0648\u0646\u064E",en:"\"Indeed, it is We who sent down the reminder and We will be its guardian\"",ref:"Al-Hijr 15:9"},
              {ar:"\u0641\u064E\u0627\u0630\u0652\u0643\u064F\u0631\u064F\u0648\u0646\u0650\u064A \u0623\u064E\u0630\u0652\u0643\u064F\u0631\u0652\u0643\u064F\u0645\u0652",en:"\"So remember Me; I will remember you\"",ref:"Al-Baqarah 2:152"},
              {ar:"\u0631\u064E\u0628\u0651\u0650 \u0632\u0650\u062F\u0652\u0646\u0650\u064A \u0639\u0650\u0644\u0652\u0645\u064B\u0627",en:"\"My Lord, increase me in knowledge\"",ref:"Ta-Ha 20:114"},
              {ar:"\u0648\u064E\u0631\u064E\u062A\u0651\u0650\u0644\u0650 \u0627\u0644\u0652\u0642\u064F\u0631\u0652\u0622\u0646\u064E \u062A\u064E\u0631\u0652\u062A\u0650\u064A\u0644\u064B\u0627",en:"\"And recite the Quran with measured recitation\"",ref:"Al-Muzzammil 73:4"},
              {ar:"\u0648\u064E\u0627\u0635\u0652\u0628\u0650\u0631\u0652 \u0641\u064E\u0625\u0650\u0646\u0651\u064E \u0627\u0644\u0644\u0651\u064E\u0647\u064E \u0644\u064E\u0627 \u064A\u064F\u0636\u0650\u064A\u0639\u064F \u0623\u064E\u062C\u0652\u0631\u064E \u0627\u0644\u0652\u0645\u064F\u062D\u0652\u0633\u0650\u0646\u0650\u064A\u0646\u064E",en:"\"Be patient, for Allah does not let the reward of the good be lost\"",ref:"Hud 11:115"},
              {ar:"\u0625\u0650\u0646\u0651\u064E \u0645\u064E\u0639\u064E \u0627\u0644\u0652\u0639\u064F\u0633\u0652\u0631\u0650 \u064A\u064F\u0633\u0652\u0631\u064B\u0627",en:"\"Indeed, with hardship comes ease\"",ref:"Ash-Sharh 94:6"},
            ];
            const dayIdx=Math.floor(Date.now()/3600000)%verses.length;
            const v=verses[dayIdx];
            return (
          <div style={{padding:"18px",borderRadius:16,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(217,177,95,0.18)",textAlign:"center",marginBottom:18,boxShadow:"0 4px 16px rgba(0,0,0,0.22),0 0 10px rgba(217,177,95,0.06)"}}>
            <div style={{fontFamily:"'Amiri',serif",fontSize:22,color:"#E6B84A",direction:"rtl",marginBottom:8}}>{v.ar}</div>
            <div style={{fontSize:12,color:"rgba(243,231,200,0.45)",fontStyle:"italic",marginBottom:3}}>{v.en}</div>
            <div style={{fontSize:10,color:"rgba(243,231,200,0.22)"}}>{v.ref}</div>
          </div>
            );
          })()}

        </div>
  );
}
