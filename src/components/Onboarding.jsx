import { calcTimeline } from "../utils";
import { JUZ_META, JUZ_SURAHS, JUZ_OPENERS } from "../data/quran-metadata";

export default function Onboarding({
  userName, setUserName,
  onboardStep, setOnboardStep,
  visibleOnboardJuzCount, setVisibleOnboardJuzCount,
  goalYears, setGoalYears,
  goalMonths, setGoalMonths,
  juzStatus, setJuzStatus,
  memorizedAyahs, completedCount,
  v9MarkJuzComplete, v9MarkJuzIncomplete,
  v9IsJuzComplete, v9MarkSurahComplete, v9MarkSurahIncomplete,
  openMethod, setOpenMethod,
  openJuzPanel, setOpenJuzPanel,
  loaded,
  setShowOnboarding,
}) {
  return (
    <div style={{position:"fixed",inset:0,background:"#060A07",zIndex:1000,display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* ── STEP 1 — BISMILLAH ── */}
                {onboardStep===1&&(
        <div className="fi" style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 28px",textAlign:"center",position:"relative",overflow:"hidden",background:"linear-gradient(180deg,#04070A 0%,#0A1120 50%,#0C1526 100%)"}}>
          {/* Top ambient glow */}
          <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 50% 0%,rgba(212,175,55,0.10),transparent 60%)",zIndex:0}}/>
          {/* Star field */}
          <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(1px 1px at 15% 20%,rgba(212,175,55,0.20) 0%,transparent 100%),radial-gradient(1px 1px at 75% 15%,rgba(255,255,255,0.08) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 45% 8%,rgba(212,175,55,0.18) 0%,transparent 100%),radial-gradient(1px 1px at 85% 35%,rgba(255,255,255,0.06) 0%,transparent 100%),radial-gradient(1px 1px at 25% 65%,rgba(212,175,55,0.08) 0%,transparent 100%)",pointerEvents:"none",zIndex:0}}/>
          <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",width:"100%"}}>
            <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(28px,6vw,44px)",color:"#F6E27A",direction:"rtl",lineHeight:1.7,marginBottom:24,textShadow:"0 0 22px rgba(212,175,55,0.18)"}}>
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
            </div>
            <div style={{width:50,height:1,background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.5),transparent)",margin:"0 auto 24px"}}/>
            <div style={{fontFamily:"'Amiri',serif",fontSize:18,color:"#D4AF37",direction:"rtl",lineHeight:2,marginBottom:8,opacity:.85,textShadow:"0 0 10px rgba(212,175,55,0.12)"}}>
              وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ
            </div>
            <div style={{fontSize:11,color:"rgba(243,231,191,0.5)",fontStyle:"italic",marginBottom:4}}>"And We have certainly made the Qur'an easy for remembrance"</div>
            <div style={{fontSize:9,color:"rgba(212,175,55,0.35)",marginBottom:40}}>Al-Qamar · 54:17</div>

            <div className="sbtn" onClick={()=>setOnboardStep(3)} style={{width:"100%",maxWidth:360,padding:"15px",background:"linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)",borderRadius:12,fontSize:14,fontWeight:700,color:"#060A07",letterSpacing:".02em",boxShadow:"0 12px 24px rgba(212,175,55,0.22)"}}>
              Begin Your Journey →
            </div>
            <div style={{width:40,height:1,background:"rgba(212,175,55,0.25)",margin:"16px auto 10px"}}/><div style={{fontSize:9,color:"rgba(243,231,191,0.7)",fontWeight:500,letterSpacing:".08em",textShadow:"0 0 8px rgba(212,175,55,0.12)"}}>© 2026 NoorTech Studio</div>
          </div>
        </div>
      )}


      {/* ── STEP 3 — NAME INPUT ── */}
      {onboardStep===3&&(
        <div className="fi" style={{flex:1,display:"flex",flexDirection:"column",padding:"24px 24px 32px",overflow:"auto",background:"linear-gradient(180deg,#04070A 0%,#0A1120 50%,#0C1526 100%)",minHeight:0,position:"relative"}}>
          <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 50% 0%,rgba(212,175,55,0.08),transparent 55%)",zIndex:0}}/>
          <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",flex:1,justifyContent:"space-between"}}>
            {/* TOP — progress + welcome + question + input */}
            <div>
              <div style={{display:"flex",gap:5,marginBottom:32}}>
                {[1,2,3].map(i=>(<div key={i} style={{flex:1,height:3,borderRadius:2,background:"linear-gradient(90deg,#C8961E,#F6E27A,#D4AF37)",boxShadow:"0 0 12px rgba(212,175,55,0.40)"}}/>))}
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Amiri',serif",fontSize:28,color:"#F6E27A",direction:"rtl",lineHeight:1.7,marginBottom:10,textShadow:"0 0 10px rgba(212,175,55,0.12)"}}>أَهْلًا وَسَهْلًا</div>
                <div style={{fontSize:14,color:"rgba(243,231,191,0.85)",marginBottom:24}}>Welcome to your Hifz journey</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#F3E7BF",textShadow:"0 0 14px rgba(212,175,55,0.10)",marginBottom:20}}>What should we call you?</div>
                <input
                  type="text"
                  value={userName}
                  onChange={e=>setUserName(e.target.value)}
                  placeholder="Enter your name"
                  style={{width:"100%",background:"linear-gradient(180deg,rgba(15,20,32,0.97),rgba(9,13,22,0.99))",border:`1px solid ${userName?"rgba(212,175,55,0.35)":"rgba(255,255,255,0.08)"}`,borderRadius:12,padding:"14px 16px",fontSize:18,color:"#F3E7BF",fontFamily:"'DM Sans',sans-serif",outline:"none",transition:"border .2s",textAlign:"center",boxShadow:userName?"0 0 14px rgba(212,175,55,0.08),inset 0 0 12px rgba(212,175,55,0.06)":"inset 0 0 12px rgba(212,175,55,0.04)"}}
                />
              </div>
            </div>
            {/* MIDDLE — preview card floats centered */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
              {userName&&(
                <div className="fi" style={{width:"100%",padding:"14px 18px",background:"linear-gradient(180deg,rgba(15,20,32,0.97),rgba(9,13,22,0.99)), radial-gradient(circle at 50% 30%,rgba(212,175,55,0.05),transparent 65%)",border:"1px solid rgba(212,175,55,0.20)",borderRadius:14,textAlign:"center",boxShadow:"0 0 18px rgba(212,175,55,0.08),inset 0 1px 0 rgba(212,175,55,0.10)"}}>
                  <div style={{fontSize:9,color:"rgba(212,175,55,0.55)",marginBottom:6,letterSpacing:".10em",textTransform:"uppercase"}}>Your name</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#F6E27A",marginBottom:4,textShadow:"0 0 16px rgba(212,175,55,0.18)"}}>{userName}</div>
                  <div style={{fontSize:10,color:"rgba(243,231,191,0.50)",fontStyle:"italic"}}>May Allah make it easy for you 🤲</div>
                </div>
              )}
            </div>
            {/* BOTTOM — buttons */}
            <div>
              <div style={{display:"flex",gap:8,marginBottom:0}}>
                <div className="sbtn" onClick={()=>setOnboardStep(1)} style={{padding:"14px 18px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,fontSize:14,color:"rgba(243,231,191,0.50)"}}>←</div>
                <div className="sbtn" onClick={()=>setOnboardStep(4)} style={{flex:1,padding:"14px",background:"linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)",borderRadius:12,fontSize:14,fontWeight:700,color:"#060A07",textAlign:"center",boxShadow:"0 12px 24px rgba(212,175,55,0.22)"}}>
                  Continue →
                </div>
              </div>
              <div className="sbtn" onClick={()=>setOnboardStep(4)} style={{textAlign:"center",fontSize:11,color:"rgba(212,175,55,0.35)",marginTop:10,opacity:0.5}}>Skip for now</div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4 — GOAL + JUZ TRACKER ── */}
      {onboardStep===4&&!loaded&&(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(180deg,#04070A 0%,#0A1120 50%,#0C1526 100%)"}}>
          <div className="spin" style={{width:24,height:24,border:"2px solid rgba(212,175,55,0.15)",borderTopColor:"#D4AF37",borderRadius:"50%"}}/>
        </div>
      )}
      {onboardStep===4&&loaded&&(()=>{
        try {
        // Page-based pace: 1 mushaf page per day. Pages-per-juz averages ~20.1
        // across the 30 juz, so each completed juz subtracts ~20 pages from the
        // remaining total. At 30 days/month this yields the completion timeline.
        const AVG_PAGES_PER_JUZ=604/30;
        const pagesCompleted=Math.round((completedCount||0)*AVG_PAGES_PER_JUZ);
        const pagesRemaining=Math.max(0,604-pagesCompleted);
        const monthsRemaining=Math.max(1,Math.round(pagesRemaining/30));
        const displayedJuz=JUZ_META.slice().reverse().slice(0,visibleOnboardJuzCount);
        return (
          <div className="fi" style={{flex:1,display:"flex",flexDirection:"column",padding:"20px 20px 24px",overflow:"auto",background:"linear-gradient(180deg,#04070A 0%,#0A1120 50%,#0C1526 100%)",position:"relative"}}>
            <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 50% 0%,rgba(212,175,55,0.10),transparent 60%)",zIndex:0}}/>
            <div style={{position:"relative",zIndex:1,display:"flex",gap:5,marginBottom:20}}>
              {[1,2,3].map(i=>(<div key={i} style={{flex:1,height:3,borderRadius:2,background:"linear-gradient(90deg,#C8961E,#F6E27A,#D4AF37)",boxShadow:"0 0 12px rgba(212,175,55,0.40)"}}/>))}
            </div>
            <div style={{textAlign:"center",marginBottom:18}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:"#F3E7BF",lineHeight:1.2,marginBottom:8,textShadow:"0 0 18px rgba(212,175,55,0.15)"}}>Your Daily Practice</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"rgba(243,231,191,0.75)",lineHeight:1.2}}>Mark Your Memorization</div>
            </div>
            <div style={{background:"linear-gradient(180deg,rgba(15,20,32,0.97) 0%,rgba(9,13,22,0.99) 100%), radial-gradient(circle at 50% 30%,rgba(212,175,55,0.05),transparent 65%)",border:"1px solid rgba(212,175,55,0.18)",borderRadius:20,padding:"18px 18px 16px",marginBottom:18,boxShadow:"0 0 18px rgba(212,175,55,0.08),0 12px 35px rgba(0,0,0,0.40),inset 0 1px 0 rgba(212,175,55,0.10)"}}>
              <div style={{textAlign:"center",fontSize:9,color:"#D4AF37",letterSpacing:".18em",textTransform:"uppercase",marginBottom:10}}>Shaykh Al-Qasim's Method</div>
              <div style={{textAlign:"center",fontFamily:"'Playfair Display',serif",fontSize:24,color:"#F6E27A",lineHeight:1.2,marginBottom:8}}>One Page Per Day</div>
              <div style={{textAlign:"center",fontSize:12,color:"rgba(243,231,191,0.62)",lineHeight:1.5,marginBottom:14,fontStyle:"italic"}}>
                <div>The Methodology of Shaykh Abdul Muhsin Al-Qasim</div>
                <div>Imam of Masjid an-Nabawi</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12,fontSize:12,color:"rgba(243,231,191,0.75)",lineHeight:1.6,textAlign:"center"}}>
                <div>20 repetitions per ayah</div>
                <div>10 repetitions to connect each pair</div>
                <div>One page of the mushaf each day</div>
              </div>
              <div style={{height:1,background:"linear-gradient(90deg,rgba(212,175,55,0) 0%,rgba(232,200,120,0.30) 50%,rgba(212,175,55,0) 100%)",margin:"0 0 12px"}}/>
              <div style={{textAlign:"center",fontSize:12,color:"rgba(243,231,191,0.70)",lineHeight:1.5}}>
                Completion in <span style={{color:"#F6E27A",fontWeight:700}}>approximately {monthsRemaining} month{monthsRemaining===1?"":"s"}</span>, in shā' Allāh.
              </div>
              <div style={{textAlign:"center",fontSize:10,color:"rgba(212,175,55,0.50)",marginTop:10,fontStyle:"italic",lineHeight:1.5}}>
                Pace can be adjusted in Settings.
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:9,color:"rgba(243,231,191,0.65)",letterSpacing:".16em",textTransform:"uppercase"}}>Mark Your Memorization</div>
              <div style={{fontSize:11,color:"rgba(212,175,55,0.75)",fontWeight:700}}>{completedCount} Juz completed</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12}}>
              {displayedJuz.map(j=>{
                const isOpen=openJuzPanel===j.num;
                const surahs=JUZ_SURAHS[j.num]||[];
                const allChecked=surahs.every(s=>juzStatus[`s${s.s}`]==="complete");
                const someChecked=surahs.some(s=>juzStatus[`s${s.s}`]==="complete");
                const juzComplete=v9IsJuzComplete(j.num);
                return (
                  <div key={j.num} style={{borderRadius:18,overflow:"hidden",border:juzComplete?"1px solid rgba(246,226,122,0.45)":someChecked?"1px solid rgba(212,175,55,0.22)":"1px solid rgba(212,175,55,0.12)",background:juzComplete?"linear-gradient(180deg,rgba(18,22,34,0.97) 0%,rgba(10,13,22,0.99) 100%), radial-gradient(circle at 50% 40%,rgba(212,175,55,0.07),transparent 60%)":"linear-gradient(180deg,rgba(14,18,28,0.97) 0%,rgba(8,11,20,0.99) 100%), radial-gradient(circle at 50% 40%,rgba(212,175,55,0.04),transparent 60%)",transition:"all .18s ease",boxShadow:juzComplete?"0 0 20px rgba(212,175,55,0.14),0 12px 28px rgba(0,0,0,0.38),inset 0 1px 0 rgba(212,175,55,0.12)":"0 0 12px rgba(212,175,55,0.05),0 8px 22px rgba(0,0,0,0.32),inset 0 1px 0 rgba(212,175,55,0.06)"}}>
                    {/* Juz header — tap to expand, long-press or ✓ button to mark complete */}
                    <div className="sbtn" onClick={()=>setOpenJuzPanel(isOpen?null:j.num)} style={{padding:"16px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:11,color:juzComplete?"#F6E27A":"rgba(255,255,255,0.40)",marginBottom:6,letterSpacing:".08em"}}>Juz {j.num}</div>
                        <div style={{fontFamily:"'Amiri',serif",fontSize:24,lineHeight:1.5,color:juzComplete?"#FFF6D6":"#E8DFC0",textShadow:juzComplete?"0 0 16px rgba(212,175,55,0.18)":"0 0 10px rgba(255,240,200,0.12)",letterSpacing:"0.5px"}}>{JUZ_OPENERS[j.num]}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div className="sbtn" onClick={e=>{e.stopPropagation();const completing=!v9IsJuzComplete(j.num);setJuzStatus(prev=>{const next={...prev};if(!completing){delete next[j.num];surahs.forEach(s=>{delete next[`s${s.s}`];});}else{next[j.num]="complete";surahs.forEach(s=>{next[`s${s.s}`]="complete";});}return next;});if(completing){v9MarkJuzComplete(j.num);surahs.forEach(s=>v9MarkSurahComplete(s.s));}else v9MarkJuzIncomplete(j.num);}} style={{width:22,height:22,borderRadius:"50%",background:juzComplete?"rgba(246,226,122,0.14)":"rgba(255,255,255,0.04)",border:`1px solid ${juzComplete?"rgba(246,226,122,0.45)":"rgba(212,175,55,0.25)"}`,display:"flex",alignItems:"center",justifyContent:"center",color:juzComplete?"#F6E27A":"rgba(212,175,55,0.4)",fontSize:11,fontWeight:700}}>{juzComplete?"✓":"○"}</div>
                        <div style={{color:"rgba(212,175,55,0.7)",fontSize:14,transition:"transform .2s",transform:isOpen?"rotate(180deg) translateY(-2px)":"translateY(2px)"}}>▾</div>
                      </div>
                    </div>
                    {/* Surah list */}
                    {isOpen&&(
                      <div style={{borderTop:"1px solid rgba(212,175,55,0.12)",padding:"14px 14px 16px",background:"rgba(0,0,0,0.18)"}}>
                        {/* Select All */}
                        <div className="sbtn" onClick={()=>{
                          const completing=!allChecked;
                          setJuzStatus(prev=>{
                            const next={...prev};
                            if(!completing){ surahs.forEach(s=>{delete next[`s${s.s}`];}); delete next[j.num]; }
                            else { surahs.forEach(s=>{next[`s${s.s}`]="complete";}); next[j.num]="complete"; }
                            return next;
                          });
                          // V9: add/remove all ayahs for every surah in this juz
                          if(completing) surahs.forEach(s=>v9MarkSurahComplete(s.s));
                          else v9MarkJuzIncomplete(j.num);
                        }} style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"8px 10px",borderRadius:10,background:"rgba(212,175,55,0.03)",border:"1px solid rgba(212,175,55,0.16)",boxShadow:"0 0 10px rgba(212,175,55,0.05)"}}>
                          <div style={{width:18,height:18,borderRadius:5,background:allChecked?"linear-gradient(135deg,#D4AF37,#F6E27A)":"transparent",border:allChecked?"1px solid rgba(246,226,122,0.7)":"1.5px solid rgba(212,175,55,0.35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#060A07",fontWeight:700,flexShrink:0,boxShadow:allChecked?"0 0 10px rgba(212,175,55,0.35)":"none"}}>{allChecked?"✓":""}</div>
                          <div style={{fontSize:12,color:allChecked?"#F6E27A":"rgba(212,175,55,0.8)",fontWeight:700,letterSpacing:".02em"}}>Select all surahs in Juz {j.num}</div>
                        </div>
                        {/* Surah grid */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                          {surahs.map((s,si)=>{
                            const checked=juzStatus[`s${s.s}`]==="complete";
                            return (
                              <div key={s.s} className="sbtn" onClick={()=>{
                                const completing=!checked;
                                setJuzStatus(prev=>{
                                  const next={...prev,[`s${s.s}`]:completing?"complete":undefined};
                                  if(!completing) delete next[`s${s.s}`];
                                  const allNow=surahs.every(sr=>next[`s${sr.s}`]==="complete");
                                  if(allNow) next[j.num]="complete"; else delete next[j.num];
                                  return next;
                                });
                                // V9: add/remove this surah's ayahs
                                if(completing) v9MarkSurahComplete(s.s);
                                else v9MarkSurahIncomplete(s.s);
                              }} style={{display:"flex",alignItems:"center",gap:7,padding:"9px 10px",borderRadius:10,background:checked?"linear-gradient(180deg,rgba(212,175,55,0.08) 0%,rgba(12,16,26,0.96) 100%)":"rgba(255,255,255,0.02)",border:checked?"1px solid rgba(212,175,55,0.38)":"1px solid rgba(255,255,255,0.05)",boxShadow:checked?"0 0 14px rgba(212,175,55,0.12)":"none",transform:checked?"scale(1.01)":"scale(1)",transition:"all .18s ease"}}>
                                <div style={{width:14,height:14,borderRadius:4,background:checked?"linear-gradient(135deg,#D4AF37,#F6E27A)":"transparent",border:checked?"1px solid rgba(246,226,122,0.7)":"1.5px solid rgba(212,175,55,0.35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#060A07",fontWeight:800,flexShrink:0,boxShadow:checked?"0 0 10px rgba(212,175,55,0.35)":"none"}}>{checked?"✓":""}</div>
                                <div style={{fontSize:10,color:checked?"#F6E27A":"rgba(255,255,255,0.65)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:checked?600:400}}>{s.name}</div>
                                <div style={{fontSize:8,color:"rgba(255,255,255,0.25)",flexShrink:0}}>{s.a}v</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {visibleOnboardJuzCount<30&&(
              <div style={{textAlign:"center",marginBottom:18}}>
                <div className="sbtn" onClick={()=>setVisibleOnboardJuzCount(v=>Math.min(v+7,30))} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"10px 16px",borderRadius:999,background:"rgba(212,175,55,0.03)",border:"1px solid rgba(212,175,55,0.12)",color:"rgba(212,175,55,0.85)",fontSize:12,fontWeight:600}}>
                  Load More <span style={{fontSize:11}}>↓</span>
                </div>
              </div>
            )}
            <div style={{flex:1}}/>
            <div style={{display:"flex",gap:8}}>
              <div className="sbtn" onClick={()=>setOnboardStep(3)} style={{padding:"14px 18px",background:"#0D1008",border:"1px solid #1E2A18",borderRadius:12,fontSize:14,color:"#A8B89A"}}>←</div>
              <div className="sbtn" onClick={()=>{if(userName) localStorage.setItem("rihlat-username",userName);localStorage.setItem("rihlat-onboarded","1");setShowOnboarding(false);}} style={{flex:1,padding:"14px",background:"linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)",borderRadius:12,fontSize:14,fontWeight:700,color:"#060A07",textAlign:"center",boxShadow:"0 12px 24px rgba(212,175,55,0.22)"}}>
                Select your starting point
              </div>
            </div>
          </div>
        );
        } catch(e) {
          return <div style={{flex:1,padding:"24px",background:"#060A07",color:"#E5534B",fontSize:11,fontFamily:"monospace",whiteSpace:"pre-wrap",overflowY:"auto"}}>
            ERROR IN STEP 4:{"\n"}{e?.message}{"\n\n"}{e?.stack}
          </div>;
        }
      })()}

    </div>
  );
}
