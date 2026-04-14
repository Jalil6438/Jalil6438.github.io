import MUTASHABIHAT from "../mutashabihat.json";
import { SURAH_EN } from "../data/constants";
import { JUZ_SURAHS } from "../data/quran-metadata";
import { getSessionWisdom } from "../data/sessions";
import { saveCompletedAyahs, toArabicDigits } from "../utils";

export default function MyHifzTab(props) {
  const {
    // theme/constants
    dark, T, SESSIONS, fontSize,
    // reciter
    reciter, currentReciter, setReciterMode, setShowReciterModal, hasPerAyah,
    // session juz
    sessionJuz, setSessionJuz, sessionIdx, setSessionIdx, totalSV, dailyNew,
    setShowJuzModal,
    // sessions state
    activeSessionIndex, setActiveSessionIndex, sessionsCompleted, setSessionsCompleted,
    currentSessionId, isAsr, toggleCheck,
    // batch
    batch, bEnd, bDone, fajrBatch, sessionVerses,
    // loading
    sessLoading, sessError,
    // repetition/connection
    repCounts, setRepCounts, connectionReps, setConnectionReps,
    // ayah ui
    openAyah, setOpenAyah, ayahPage, setAyahPage, touchStartRef,
    hifzViewMode, setHifzViewMode,
    // translations + audio
    translations, fetchTranslations,
    playingKey, audioLoading, playAyah, looping, setLooping, audioRef,
    // completed ayahs
    completedAyahs, setCompletedAyahs,
    // asr customize state
    asrStarted, setAsrStarted, asrIsCustomized, setAsrIsCustomized,
    asrActiveJuzPanel, setAsrActiveJuzPanel,
    asrSelectedJuz, asrSelectedSurahs, asrSurahShowCount, setAsrSurahShowCount,
    asrSelectionSummary, asrCanStart, setAsrPage, setAsrExpandedAyah,
    completedJuzOptions, isSurahComplete, loadAsrJuzReview, toggleAsrSurahReview,
    // juz status
    setJuzProgress, setJuzStatus, markJuzAndSurahsComplete,
    juzCompletedInSession, setJuzCompletedInSession,
    // v9
    v9IsJuzComplete, v9MarkJuzComplete, v9MarkSurahComplete,
    // recent/yesterday
    setYesterdayBatch, setRecentBatches,
    // sim verses
    simVerseCache, fetchSimVerse,
  } = props;

  return (
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",position:"relative"}} className="fi gold-particles">

          {/* ── STICKY TOP BAR — Reciter + Dark/Light toggle ── */}
          <div style={{position:"sticky",top:0,zIndex:10,background:T.bg,padding:"6px 14px",display:"flex",alignItems:"center",gap:8}}>
            <div className="sbtn" onClick={()=>{setReciterMode("hifz");setShowReciterModal(true);}} style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8}}>
              <div style={{fontSize:12}}>🎙️</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:600,color:T.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{currentReciter.name}</div>
              </div>
              <div style={{fontSize:10,color:T.dim}}>▾</div>
            </div>
          </div>

          <div style={{flex:1,padding:"10px 16px 120px"}}>

{/* ── CURRENT SESSION ── */}
            {(()=>{
              const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];
              if(!sess) return null;
              const sid=sess.id;
              const isDone=sessionsCompleted[sid];
              const hasStarted=batch.some(v=>(repCounts[v.verse_key]||0)>0);
              const dhuhrLocked=sid==="dhuhr"&&batch.length===0;

              const sessionLabel=(()=>{
                if(sid==="fajr") return isDone?"Fajr — Completed · Alhamdulillah":hasStarted?"Fajr — Keep going, you're building it":"Fajr — Fresh start, fresh ayahs";
                if(sid==="dhuhr") return dhuhrLocked?"Finish Fajr first, then we review":"Dhuhr — Review your last 5 days";
                if(sid==="asr") return "Asr — Time to reinforce what you know";
                if(sid==="maghrib") return "Maghrib — Listen, absorb, and reconnect";
                if(sid==="isha") return "Isha — One last pass to seal it in";
                return `${sess.time} — ${sess.title}`;
              })();

              const microGuide=(()=>{
                if(isDone) return null;
                if(sid==="fajr") return "Take your time — say each ayah until it feels natural";
                if(sid==="dhuhr") return dhuhrLocked?null:"Run through the last 5 days — see how much stuck";
                if(sid==="asr") return "Revisit what you've completed — consistency is the key";
                if(sid==="maghrib") return "Close your eyes, listen, and let the words settle in";
                if(sid==="isha") return "Recite it all one more time — you've got this";
                return null;
              })();

              return (
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:8,color:"rgba(230,184,74,0.40)",letterSpacing:".18em",textTransform:"uppercase",marginBottom:5}}>Current Session</div>
                  <div style={{padding:"11px 14px",
                    background:dark?"linear-gradient(180deg,rgba(15,26,43,0.95) 0%,rgba(12,21,38,0.98) 100%)":"#EADFC8",
                    border:`1px solid ${isDone?"rgba(74,222,128,0.20)":(dark?"rgba(230,184,74,0.18)":"rgba(0,0,0,0.18)")}`,borderLeft:`3px solid ${isDone?"#4ADE80":(dark?"#E6B84A":"#B83A1A")}`,borderRadius:"0 10px 10px 0",
                    boxShadow:dark?"0 4px 16px rgba(0,0,0,0.20),0 0 12px rgba(230,184,74,0.06)":"0 2px 8px rgba(0,0,0,0.06)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:700,color:isDone?"#4ADE80":(dark?"#F0E6D0":"#2D2A26")}}>{sessionLabel}</div>
                      </div>
                      <div style={{fontSize:12,color:dark?"rgba(230,184,74,0.60)":"#6B645A",fontFamily:"'IBM Plex Mono',monospace"}}>{isDone?"✓":batch.filter(v=>repCounts[v.verse_key]>=20).length} of {batch.length||dailyNew}</div>
                    </div>
                    {microGuide&&<div style={{fontSize:11,color:dark?"rgba(243,231,200,0.35)":"#6B645A",marginTop:5}}>{microGuide}</div>}
                    {(()=>{
                      const w=getSessionWisdom(sid); if(!w||isDone) return null;
                      return (
                        <div style={{marginTop:8,padding:"10px 12px",borderRadius:8,background:dark?"rgba(217,177,95,0.04)":"rgba(180,140,40,0.04)",border:`1px solid ${dark?"rgba(217,177,95,0.08)":"rgba(140,100,20,0.08)"}`,textAlign:"center"}}>
                          {w.type==="quran"&&<div style={{fontFamily:"'Amiri',serif",fontSize:14,color:dark?"rgba(232,200,120,0.65)":"rgba(140,100,20,0.70)",direction:"rtl",lineHeight:1.8,marginBottom:6}}>{w.arabic}</div>}
                          <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.50)":"#5A4A2A",lineHeight:1.5,fontStyle:w.type==="quran"?"italic":"normal"}}>"{w.text}"</div>
                          <div style={{fontSize:9,color:dark?"rgba(230,184,74,0.35)":"rgba(140,100,20,0.40)",marginTop:4}}>
                            {w.type==="quran"?`— ${w.ref}`:w.type==="hadith"?`— From ${w.src||w.attr}`:w.attr?`— From ${w.attr}`:"— From Sheikh Abdul Muhsin Al-Qasim"}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}

            {/* ── ASR EMPTY STATE — shown when auto-pool has nothing ── */}
            {SESSIONS[activeSessionIndex]?.id==="asr"&&!sessLoading&&!asrStarted&&batch.length===0&&!asrIsCustomized&&(
              <div className="fi" style={{position:"fixed",inset:0,zIndex:90,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:dark?"linear-gradient(180deg,#060C18 0%,#040814 100%)":"#F3E9D2",padding:"32px 24px"}}>
                <div style={{fontSize:36,marginBottom:16}}>📖</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#F3E7C8",fontWeight:700,textAlign:"center",marginBottom:10}}>Nothing to review yet</div>
                <div style={{fontSize:13,color:"rgba(243,231,200,0.45)",textAlign:"center",lineHeight:1.8,maxWidth:280,marginBottom:28}}>
                  Complete a surah or a full juz to unlock Asr review.
                </div>
                <div className="sbtn" onClick={()=>setAsrIsCustomized(true)}
                  style={{padding:"12px 28px",borderRadius:14,border:"1px solid rgba(217,177,95,0.30)",color:"rgba(217,177,95,0.80)",fontSize:12,fontWeight:700,letterSpacing:".10em",textTransform:"uppercase",marginBottom:14}}>
                  Customize Review
                </div>
                <div className="sbtn" onClick={()=>{const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];setSessionsCompleted(prev=>({...prev,[sess.id]:true}));toggleCheck(sess.id);setActiveSessionIndex(i=>Math.min(SESSIONS.length-1,i+1));}}
                  style={{fontSize:11,color:"rgba(243,231,200,0.25)",letterSpacing:".08em"}}>
                  Skip for now ›
                </div>
              </div>
            )}

            {/* ── ASR PICKER — shown only when customizing ── */}
            {SESSIONS[activeSessionIndex]?.id==="asr"&&asrIsCustomized&&(()=>{
              const activeJuz=asrActiveJuzPanel||(completedJuzOptions.length>0?completedJuzOptions[0].num:null);
              const activeJuzSurahs=activeJuz?(JUZ_SURAHS[activeJuz]||[]).filter(s=>isSurahComplete(s.s)||v9IsJuzComplete(activeJuz)):[];
              const isJuzSelected=asrSelectedJuz.includes(activeJuz);
              return (
              <div className="fi" style={{position:"fixed",inset:0,zIndex:90,display:"flex",flexDirection:"column",background:dark?"radial-gradient(circle at 50% 10%,rgba(44,72,130,0.12) 0%,rgba(44,72,130,0.04) 18%,rgba(0,0,0,0) 42%),linear-gradient(180deg,#060C18 0%,#040814 100%)":"#F3E9D2",overflowY:"auto",padding:"32px 20px 40px"}}>

                {/* Header */}
                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:4}}>
                  <div className="sbtn" onClick={()=>{const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];setSessionsCompleted(prev=>({...prev,[sess.id]:true}));toggleCheck(sess.id);setActiveSessionIndex(i=>Math.min(SESSIONS.length-1,i+1));}} style={{padding:"6px 12px",fontSize:20,color:"rgba(232,200,120,0.40)",lineHeight:1}}>×</div>
                </div>
                <div style={{textAlign:"center",marginBottom:8}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:"#F3E7C8",fontWeight:700,fontStyle:"italic",marginBottom:6}}>Customize Asr Review</div>
                  <div style={{fontSize:13,color:"rgba(243,231,200,0.45)"}}>Override the recommended set for this session.</div>
                </div>

                {/* ── SELECT JUZ ── */}
                <div style={{display:"flex",alignItems:"center",gap:12,margin:"20px 0 14px"}}>
                  <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.50) 100%)"}}/>
                  <div style={{fontSize:9,color:"rgba(217,177,95,0.70)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600,whiteSpace:"nowrap"}}>Select Juz</div>
                  <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(232,200,120,0.50) 0%,rgba(217,177,95,0) 100%)"}}/>
                </div>

                {completedJuzOptions.length===0?(
                  <div style={{textAlign:"center",fontSize:12,color:"rgba(243,231,200,0.40)",marginBottom:16}}>No completed Juz yet</div>
                ):(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4}}>
                    {completedJuzOptions.map(j=>{
                      const isSel=j.num===activeJuz;
                      const hasSelections=asrSelectedJuz.includes(j.num)||(JUZ_SURAHS[j.num]||[]).some(s=>asrSelectedSurahs.includes(s.s));
                      return (
                        <div key={j.num} className="sbtn" onClick={()=>{setAsrActiveJuzPanel(j.num);setAsrSurahShowCount(10);}}
                          style={{padding:"13px 16px",borderRadius:14,textAlign:"center",
                            background:isSel?"rgba(217,177,95,0.12)":"rgba(255,255,255,0.03)",
                            border:`1px solid ${isSel?"rgba(232,200,120,0.65)":hasSelections?"rgba(217,177,95,0.35)":"rgba(217,177,95,0.12)"}`,
                            boxShadow:isSel?"0 0 28px rgba(232,200,120,0.30),0 0 8px rgba(217,177,95,0.20),inset 0 0 14px rgba(217,177,95,0.08)":"none",
                            transition:"all .18s"}}>
                          <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:isSel?"#F6E27A":hasSelections?"#E2BC72":"rgba(243,231,200,0.70)",fontWeight:600}}>Juz {j.num}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── SURAHS IN JUZ ── */}
                {activeJuz&&activeJuzSurahs.length>0&&(()=>{
                  const visibleSurahs=activeJuzSurahs.slice(0,asrSurahShowCount);
                  const hasMore=activeJuzSurahs.length>asrSurahShowCount;
                  return (<>
                  <div style={{display:"flex",alignItems:"center",gap:12,margin:"18px 0 10px"}}>
                    <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.50) 100%)"}}/>
                    <div style={{fontSize:9,color:"rgba(217,177,95,0.70)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600,whiteSpace:"nowrap"}}>Surahs in Juz {activeJuz}</div>
                    <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(232,200,120,0.50) 0%,rgba(217,177,95,0) 100%)"}}/>
                  </div>

                  {/* Select All — control row */}
                  <div className="sbtn" onClick={()=>loadAsrJuzReview(activeJuz)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"4px 4px",marginBottom:6}}>
                    <div style={{width:15,height:15,borderRadius:3,background:isJuzSelected?"linear-gradient(135deg,#D4AF37,#F6E27A)":"transparent",border:`1.5px solid ${isJuzSelected?"#D4AF37":"rgba(212,175,55,0.30)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#060A07",fontWeight:700,flexShrink:0}}>{isJuzSelected?"✓":""}</div>
                    <div style={{fontSize:11,color:isJuzSelected?"rgba(217,177,95,0.85)":"rgba(217,177,95,0.50)",fontWeight:500}}>Select all</div>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:4}}>
                    {visibleSurahs.map(s=>{
                      const checked=asrSelectedSurahs.includes(s.s)||isJuzSelected;
                      return (
                        <div key={s.s} className="asr-surah-btn sbtn" onClick={()=>{ if(!isJuzSelected) toggleAsrSurahReview(s.s); }}
                          style={{padding:"10px 14px",borderRadius:12,textAlign:"center",
                            background:checked?"rgba(217,177,95,0.10)":"rgba(255,255,255,0.03)",
                            border:`1px solid ${checked?"rgba(232,200,120,0.55)":"rgba(255,255,255,0.05)"}`,
                            boxShadow:checked?"0 0 22px rgba(217,177,95,0.20),0 0 6px rgba(217,177,95,0.12),inset 0 0 10px rgba(217,177,95,0.05)":"none"}}>
                          <div style={{fontSize:13,color:checked?"#F6E27A":"rgba(243,231,200,0.65)",fontWeight:checked?600:400}}>{s.name}</div>
                        </div>
                      );
                    })}
                  </div>

                  {hasMore&&(
                    <div className="sbtn" onClick={()=>setAsrSurahShowCount(c=>c+10)}
                      style={{textAlign:"center",padding:"8px",marginTop:8,borderRadius:8,fontSize:11,fontWeight:500,
                        color:"rgba(217,177,95,0.40)",letterSpacing:".03em",
                        border:"1px dashed rgba(217,177,95,0.10)",background:"transparent"}}>
                      Load more · {activeJuzSurahs.length-asrSurahShowCount} remaining
                    </div>
                  )}
                </>);})()}

                {/* Summary */}
                <div style={{textAlign:"center",margin:"18px 0 0",minHeight:20}}>
                  {asrSelectionSummary
                    ?<div style={{fontSize:13,color:"rgba(243,231,200,0.65)"}}><span style={{fontSize:10,color:"rgba(243,231,200,0.28)",letterSpacing:".08em",textTransform:"uppercase"}}>Selected:</span><br/><span style={{color:"#F6E27A",fontWeight:700,textShadow:"0 0 12px rgba(217,177,95,0.20)"}}>{asrSelectionSummary}</span></div>
                    :<div style={{fontSize:12,color:"rgba(243,231,200,0.30)"}}>Select a Juz or individual surahs to begin</div>
                  }
                </div>

                {/* CTA */}
                <div className="sbtn" onClick={()=>{if(!asrCanStart)return;setAsrStarted(true);setAsrPage(0);setAsrExpandedAyah(null);}}
                  style={{width:"100%",marginTop:16,padding:"16px",borderRadius:18,textAlign:"center",fontSize:15,fontWeight:800,letterSpacing:".04em",
                    background:asrCanStart?"linear-gradient(180deg,#E3C07A 0%,#D1A659 100%)":"rgba(255,255,255,0.05)",
                    color:asrCanStart?"#0A1020":"rgba(255,255,255,0.25)",
                    boxShadow:asrCanStart?"0 10px 22px rgba(210,168,90,0.22),inset 0 1px 0 rgba(255,255,255,0.14)":"none",
                    border:asrCanStart?"none":"1px solid rgba(255,255,255,0.06)",
                    pointerEvents:asrCanStart?"auto":"none"}}>
                  Start Custom Review
                </div>
              </div>
              );
            })()}


            {/* ── LOADING / ERROR STATES ── */}
            {sessLoading&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:40,gap:12}}><div className="spin" style={{width:26,height:26,border:`2px solid ${T.border}`,borderTopColor:"#F0C040",borderRadius:"50%"}}/><div style={{fontSize:12,color:T.dim}}>Loading ayahs...</div></div>}
            {!sessLoading&&sessError&&(
              <div style={{background:dark?"linear-gradient(180deg,#0F1A2B 0%,#0C1526 100%)":"#EADFC8",border:dark?"1px solid rgba(230,184,74,0.10)":"1px solid rgba(139,106,16,0.15)",borderRadius:20,boxShadow:"0 10px 28px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.03)",padding:"30px 22px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center"}}>
                <div style={{width:74,height:74,borderRadius:"50%",background:"rgba(230,184,74,0.08)",border:"1px solid rgba(230,184,74,0.12)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18,boxShadow:"0 0 10px rgba(230,184,74,0.10)",fontSize:30}}>📖</div>
                <div style={{fontSize:20,fontWeight:700,color:"#F8FAFC",marginBottom:10}}>Unable to load ayahs</div>
                <div style={{fontSize:14,lineHeight:1.7,color:"rgba(255,255,255,0.60)",maxWidth:320,marginBottom:22}}>Please check your connection and try again.</div>
                <div className="sbtn" onClick={()=>setSessionJuz(n=>n)} style={{background:"linear-gradient(180deg,#F0C040 0%,#D89A10 100%)",color:"#0B1220",border:"none",borderRadius:14,padding:"12px 28px",fontWeight:700,fontSize:16,boxShadow:"0 6px 14px rgba(240,192,64,0.14)",cursor:"pointer"}}>Retry</div>
              </div>
            )}

            {/* ── AYAH BATCH ── */}
            {!sessLoading&&batch.length>0&&!isAsr&&(
              <div>
                {/* Batch header + view toggle for Fajr */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase"}}>{currentSessionId==="fajr"?"Fajr":currentSessionId==="dhuhr"?"Dhuhr Review":currentSessionId==="asr"?"Asr Review":currentSessionId==="maghrib"?"Listening":"Isha Review"} — Ayah Batch</div>
                  {currentSessionId==="fajr"&&(
                    <div style={{display:"flex",gap:4}}>
                      {["interactive","mushaf"].map(m=>(
                        <div key={m} className="sbtn" onClick={()=>setHifzViewMode(m)} style={{padding:"3px 8px",borderRadius:6,fontSize:9,fontWeight:hifzViewMode===m?700:400,letterSpacing:".06em",textTransform:"uppercase",color:hifzViewMode===m?(dark?"#E8C76A":"#6B4F00"):(dark?"rgba(243,231,200,0.35)":"#9A8A6A"),background:hifzViewMode===m?(dark?"rgba(217,177,95,0.10)":"rgba(180,140,40,0.08)"):"transparent",border:`1px solid ${hifzViewMode===m?(dark?"rgba(217,177,95,0.25)":"rgba(140,100,20,0.20)"):"transparent"}`}}>
                          {m==="interactive"?"Study":"Mushaf"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Method guide — Fajr only */}
                {currentSessionId==="fajr"&&(
                  <div style={{marginBottom:10,padding:"8px 12px",borderRadius:8,background:dark?"rgba(217,177,95,0.04)":"rgba(180,140,40,0.04)",border:`1px solid ${dark?"rgba(217,177,95,0.08)":"rgba(140,100,20,0.08)"}`,fontSize:11,color:dark?"rgba(243,231,200,0.45)":"#5A4A2A",lineHeight:1.6}}>
                    <strong style={{color:dark?"#E8C76A":"#6B4F00"}}>Sheikh Al-Qasim's Method:</strong> Repeat each ayah <strong>20 times</strong>, then a connection phase appears — recite pairs together <strong>10 times</strong>, then all ayahs together <strong>10 times</strong>.
                  </div>
                )}

                {/* No per-ayah audio warning */}
                {!hasPerAyah(reciter)&&(
                  <div style={{marginBottom:10,padding:"8px 12px",background:T.surface,border:`1px solid ${T.accent}30`,borderLeft:`3px solid ${T.accent}`,borderRadius:"0 6px 6px 0",fontSize:11,color:T.sub}}>
                    🎵 <strong style={{color:T.accent}}>{currentReciter.name}</strong> — full surah only. Switch reciter for per-ayah audio.
                  </div>
                )}

                {/* ── MUSHAF MODE — flowing Arabic text ── */}
                {currentSessionId==="fajr"&&hifzViewMode==="mushaf"&&(
                  <div style={{padding:"12px 20px",borderRadius:14,background:dark?"#0F1A2B":"#EADFC8",border:`1px solid ${dark?"rgba(230,184,74,0.08)":"rgba(0,0,0,0.08)"}`,boxShadow:dark?"0 2px 8px rgba(0,0,0,0.20)":"0 2px 8px rgba(0,0,0,0.06)",marginBottom:16,direction:"rtl",textAlign:"justify",textAlignLast:"right",lineHeight:2,wordBreak:"keep-all",overflowWrap:"normal"}}>
                    {batch.map((v)=>{
                      const vKey=v.verse_key;
                      const aNum=parseInt(vKey.split(":")[1],10);
                      const reps=repCounts[vKey]||0;
                      const repsDone=reps>=20;
                      return (
                        <span key={vKey} className="sbtn" onClick={()=>{setOpenAyah(vKey);fetchTranslations([v]);}}
                          style={{cursor:"pointer",transition:"all .15s",borderRadius:6,padding:"2px 4px",
                            background:repsDone?(dark?"rgba(74,222,128,0.08)":"rgba(46,204,113,0.08)"):(reps>0?(dark?"rgba(230,184,74,0.06)":"rgba(180,140,40,0.06)"):"transparent"),
                          }}>
                          <span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:fontSize,color:repsDone?(dark?"#4ADE80":"#2ECC71"):(dark?"#E8DFC0":"#2D2A26")}}>{(v.text_uthmani||"").replace(/\u06DF/g,"\u0652")}</span>
                          <span style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:16,color:repsDone?(dark?"rgba(74,222,128,0.50)":"rgba(46,204,113,0.50)"):(dark?"rgba(212,175,55,0.38)":"#A08848"),marginRight:2,marginLeft:2}}>﴿{toArabicDigits(aNum)}﴾</span>
                        </span>
                      );
                    })}
                    <div style={{direction:"ltr",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,paddingTop:8,borderTop:`1px solid ${dark?"rgba(217,177,95,0.08)":"rgba(0,0,0,0.06)"}`}}>
                      <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.35)":"#9A8A6A"}}>{batch.filter(v=>(repCounts[v.verse_key]||0)>=20).length} of {batch.length} complete</div>
                      <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.25)":"#9A8A6A"}}>Tap any ayah to begin</div>
                    </div>
                  </div>
                )}

                {/* ── AYAH ROWS — Interactive mode (5 per page, swipeable) ── */}
                {(hifzViewMode==="interactive"||currentSessionId!=="fajr")&&(()=>{
                  const APS=7;
                  const aPages=Math.max(1,Math.ceil(batch.length/APS));
                  const aSafe=Math.min(ayahPage,aPages-1);
                  const aStart=aSafe*APS;
                  const aEnd=Math.min(aStart+APS,batch.length);
                  const pageAyahs=batch.slice(aStart,aEnd);
                  return (
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}
                  onTouchStart={e=>{touchStartRef.current=e.touches[0].clientX;}}
                  onTouchEnd={e=>{const dx=e.changedTouches[0].clientX-touchStartRef.current;if(dx>40&&aSafe<aPages-1)setAyahPage(p=>p+1);else if(dx<-40&&aSafe>0)setAyahPage(p=>p-1);}}>
                  {pageAyahs.map((v,i)=>{
                    const sNum=v.surah_number||parseInt(v.verse_key?.split(":")?.[0]);
                    const vKey=v.verse_key;
                    const reps=repCounts[vKey]||0;
                    const repsDone=reps>=20;

                    return (
                      <div key={vKey} className="sbtn" onClick={()=>{setOpenAyah(vKey);fetchTranslations([v]);}}
                        style={{borderRadius:14,padding:"12px 14px",background:dark?"#0F1A2B":"#EADFC8",border:`1px solid ${repsDone?"rgba(230,184,74,0.35)":"rgba(230,184,74,0.08)"}`,boxShadow:repsDone?"0 0 14px rgba(230,184,74,0.10)":"0 2px 8px rgba(0,0,0,0.20)",transition:"all .15s"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                          <span style={{flex:1,fontSize:11,color:"#9CA3AF"}}>{SURAH_EN[sNum]} · {vKey}</span>
                          <span style={{fontSize:11,color:repsDone?"#2ECC71":reps>0?"#E6B84A":dark?"rgba(255,255,255,0.25)":"rgba(0,0,0,0.25)",fontFamily:"'IBM Plex Mono',monospace"}}>{reps} of 20 Repetitions</span>
                        </div>
                        <div style={{direction:"rtl",textAlign:"right",lineHeight:2}}>
                          <span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:fontSize,color:dark?"rgba(255,255,255,0.88)":"#2D2A26"}}>{(v.text_uthmani||"").replace(/\u06DF/g,"\u0652")}</span>
                          <span style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:18,color:repsDone?(dark?"#E6B84A":"#2ECC71"):(dark?"rgba(212,175,55,0.38)":"#A08848"),marginRight:4}}>﴿{toArabicDigits(parseInt(vKey.split(":")[1],10))}﴾</span>
                        </div>
                      </div>
                    );
                  })}
                  {aPages>1&&(
                    <div style={{textAlign:"center",fontSize:10,color:"rgba(230,184,74,0.35)",marginTop:4}}>
                      Page {aSafe+1} of {aPages}
                    </div>
                  )}
                </div>);})()}

                {/* ── CONNECTION PHASE (الربط) — from Sheikh Al-Qasim's method ── */}
                {currentSessionId==="fajr"&&(()=>{
                  const APS=7;
                  const aPages=Math.max(1,Math.ceil(batch.length/APS));
                  const aSafe=Math.min(ayahPage,aPages-1);
                  const aStart=aSafe*APS;
                  const aEnd=Math.min(aStart+APS,batch.length);
                  const pageAyahs=batch.slice(aStart,aEnd);
                  const allIndividualDone=pageAyahs.length>0&&pageAyahs.every(v=>(repCounts[v.verse_key]||0)>=20);
                  if(!allIndividualDone||pageAyahs.length<2) return null;

                  // Build connection steps: pairs + full group
                  const pairs=[];
                  for(let i=0;i<pageAyahs.length-1;i++){
                    pairs.push({key:`pair-${aStart+i}-${aStart+i+1}`,label:`Ayah ${aStart+i+1} + ${aStart+i+2}`,ayahs:[pageAyahs[i],pageAyahs[i+1]]});
                  }
                  const allGroup={key:`all-${aStart}`,label:`All ${pageAyahs.length} ayahs together`,ayahs:pageAyahs};
                  const steps=[...pairs,allGroup];
                  const allConnectionsDone=steps.every(s=>(connectionReps[s.key]||0)>=10);

                  return (
                    <div style={{marginBottom:16,padding:"14px",borderRadius:14,background:dark?"rgba(217,177,95,0.04)":"rgba(180,140,40,0.04)",border:`1px solid ${dark?"rgba(217,177,95,0.15)":"rgba(140,100,20,0.12)"}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                        <div style={{fontSize:14}}>🔗</div>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:dark?"#E8C76A":"#6B4F00"}}>Connection Phase (الربط)</div>
                          <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.40)":"rgba(100,70,10,0.50)"}}>Now link the ayahs together — recite each pair 10 times</div>
                        </div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {steps.map(step=>{
                          const cr=connectionReps[step.key]||0;
                          const crDone=cr>=10;
                          const pct=Math.min((cr/10)*100,100);
                          return (
                            <div key={step.key} className="sbtn" onClick={()=>setConnectionReps(prev=>({...prev,[step.key]:Math.min(10,(prev[step.key]||0)+1)}))}
                              style={{padding:"12px 14px",borderRadius:10,background:dark?(crDone?"rgba(74,222,128,0.06)":"rgba(255,255,255,0.02)"):(crDone?"rgba(74,222,128,0.06)":"rgba(0,0,0,0.02)"),border:`1px solid ${crDone?(dark?"rgba(74,222,128,0.25)":"rgba(46,204,113,0.30)"):(dark?"rgba(217,177,95,0.10)":"rgba(0,0,0,0.08)")}`,transition:"all .15s"}}>
                              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                                <div style={{fontSize:11,fontWeight:600,color:crDone?(dark?"#4ADE80":"#2ECC71"):(dark?"rgba(243,231,200,0.65)":"#3D2E0A")}}>{step.label}</div>
                                <div style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",color:crDone?"#4ADE80":"rgba(230,184,74,0.60)"}}>{cr}/10</div>
                              </div>
                              <div style={{direction:"rtl",textAlign:"right",lineHeight:2}}>
                                {step.ayahs.map((a,ai)=>(
                                  <span key={a.verse_key}><span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:22,color:dark?"rgba(243,231,200,0.75)":"rgba(40,30,10,0.75)"}}>{(a.text_uthmani||"").replace(/\u06DF/g,"\u0652")}</span>{ai<step.ayahs.length-1&&<span style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:14,color:dark?"rgba(212,175,55,0.30)":"rgba(140,100,20,0.30)",margin:"0 4px"}}>﴿{toArabicDigits(parseInt(a.verse_key.split(":")[1],10))}﴾</span>}</span>
                                ))}
                              </div>
                              <div style={{height:3,marginTop:8,borderRadius:999,background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${pct}%`,background:crDone?"#4ADE80":"linear-gradient(90deg,#E6B84A,#F0C040)",borderRadius:999,transition:"width .3s"}}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {allConnectionsDone&&(
                        <div style={{textAlign:"center",marginTop:10,fontSize:12,fontWeight:700,color:"#4ADE80"}}>✓ Connections complete — ayahs are linked! MashaAllah</div>
                      )}
                    </div>
                  );
                })()}

                {/* ── AYAH POPUP MODAL (all non-ASR sessions) ── */}
                {currentSessionId!=="asr"&&openAyah&&(()=>{
                  const mv=batch.find(v=>v.verse_key===openAyah);
                  if(!mv) return null;
                  const mvKey=mv.verse_key;
                  const mvSurah=mv.surah_number||parseInt(mvKey.split(":")[0],10);
                  const mvAyah=mvKey.split(":")[1];
                  const mvTrans=translations[mvKey];
                  const mvPlaying=playingKey===mvKey;
                  const mvLoading=audioLoading===mvKey;
                  const mvReps=repCounts[mvKey]||0;
                  const mvRepsDone=mvReps>=20;
                  const mvPct=Math.min((mvReps/20)*100,100);
                  return (
                    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",background:"rgba(0,0,0,0.70)",backdropFilter:"blur(6px)"}} onClick={()=>setOpenAyah(null)}>
                      <div className="fi" style={{position:"relative",width:"100%",maxWidth:400,maxHeight:"85vh",overflowY:"auto",borderRadius:24,padding:"28px 22px 22px",background:dark?"radial-gradient(circle at 50% 0%,rgba(58,92,165,0.10) 0%,rgba(0,0,0,0) 40%),linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",border:"1px solid rgba(217,177,95,0.15)",boxShadow:"0 24px 60px rgba(0,0,0,0.50),0 0 30px rgba(217,177,95,0.06)"}} onClick={e=>e.stopPropagation()}>
                        <div className="sbtn" onClick={()=>setOpenAyah(null)} style={{position:"absolute",top:14,right:18,fontSize:18,color:"rgba(243,231,200,0.30)"}}>×</div>
                        {/* Arabic */}
                        <div style={{direction:"rtl",textAlign:"center",fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:fontSize,lineHeight:2,color:"#F3E7C8",marginBottom:16}}>
                          {(mv.text_uthmani||"").replace(/\u06DF/g,"\u0652")}
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
                          <div className="sbtn" onClick={()=>hasPerAyah(reciter)?playAyah(mvKey,mvKey):null} style={{width:56,height:56,borderRadius:"50%",background:dark?(mvPlaying?"radial-gradient(circle at 50% 40%,rgba(212,175,55,0.12),rgba(12,20,34,0.95))":"radial-gradient(circle at 50% 40%,rgba(212,175,55,0.06),rgba(12,20,34,0.95))"):(mvPlaying?"radial-gradient(circle at 50% 40%,rgba(139,106,16,0.10),rgba(228,216,184,0.95))":"radial-gradient(circle at 50% 40%,rgba(139,106,16,0.04),rgba(228,216,184,0.95))"),border:`1.5px solid ${mvPlaying?"rgba(212,175,55,0.40)":"rgba(212,175,55,0.30)"}`,boxShadow:"0 0 12px rgba(212,175,55,0.18), 0 4px 14px rgba(0,0,0,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:mvPlaying?(dark?"#F0C040":"#6B645A"):(dark?"rgba(243,231,200,0.75)":"#5A4A20"),opacity:hasPerAyah(reciter)?1:0.4}}>
                            {mvLoading?<div className="spin" style={{width:14,height:14,border:"2px solid rgba(212,175,55,0.3)",borderTopColor:"#D4AF37",borderRadius:"50%"}}/>:(mvPlaying?"⏸":"▶")}
                          </div>
                          <div className="sbtn" onClick={()=>{setLooping(l=>{const next=!l;if(audioRef.current)audioRef.current.loop=next;return next;});}} style={{width:56,height:56,borderRadius:"50%",background:dark?(looping?"radial-gradient(circle at 50% 40%,rgba(212,175,55,0.12),rgba(12,20,34,0.95))":"radial-gradient(circle at 50% 40%,rgba(212,175,55,0.06),rgba(12,20,34,0.95))"):(looping?"radial-gradient(circle at 50% 40%,rgba(139,106,16,0.10),rgba(228,216,184,0.95))":"radial-gradient(circle at 50% 40%,rgba(139,106,16,0.04),rgba(228,216,184,0.95))"),border:`1.5px solid ${looping?"rgba(212,175,55,0.40)":"rgba(212,175,55,0.30)"}`,boxShadow:"0 0 12px rgba(212,175,55,0.18), 0 4px 14px rgba(0,0,0,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:looping?(dark?"#F0C040":"#6B645A"):(dark?"rgba(243,231,200,0.75)":"#5A4A20")}}>🔁</div>
                        </div>
                        {/* Rep counter */}
                        <div className={mvRepsDone?"rep-done-glow":""} onClick={()=>{setRepCounts(prev=>{const newCount=Math.min(20,(prev[mvKey]||0)+1);if(newCount>=20&&!completedAyahs.has(mvKey)){setCompletedAyahs(ca=>{const next=new Set(ca);next.add(mvKey);saveCompletedAyahs(next);return next;});}return{...prev,[mvKey]:newCount};});}}
                          style={{width:"100%",padding:"14px",borderRadius:14,textAlign:"center",cursor:"pointer",transition:"all .3s ease",
                            background:dark?(mvRepsDone?"rgba(212,175,55,0.10)":"rgba(212,175,55,0.04)"):(mvRepsDone?"rgba(0,0,0,0.08)":"rgba(0,0,0,0.03)"),
                            border:`1.5px solid ${mvRepsDone?"rgba(212,175,55,0.45)":"rgba(212,175,55,0.25)"}`,
                            boxShadow:mvRepsDone?"0 0 16px rgba(212,175,55,0.20), 0 4px 14px rgba(0,0,0,0.15)":"0 0 12px rgba(212,175,55,0.12), 0 4px 14px rgba(0,0,0,0.10)"}}>
                          {mvRepsDone?(
                            <div style={{fontSize:13,fontWeight:700,color:"#E6B84A"}}>✓ 20/20 Complete — MashaAllah!</div>
                          ):(
                            <div>
                              <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.7)",marginBottom:8}}>Recited <span style={{color:"#F0C040",fontWeight:700,transition:"all .2s"}}>{mvReps}/20</span> · Tap after each recitation</div>
                              <div style={{width:"100%",height:5,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                                <div style={{width:`${mvPct}%`,height:"100%",borderRadius:999,background:mvPct>=100?"linear-gradient(90deg,#D4AF37,#F6E27A)":"linear-gradient(90deg,rgba(220,90,90,0.85) 0%,rgba(224,178,66,0.9) 55%,rgba(56,214,126,0.9) 100%)",transition:"width 0.4s cubic-bezier(.4,0,.2,1)"}}/>
                              </div>
                            </div>
                          )}
                        </div>
                        {mvReps>0&&<div className="sbtn" onClick={()=>setRepCounts(prev=>({...prev,[mvKey]:0}))} style={{textAlign:"center",fontSize:10,color:"rgba(255,255,255,0.2)",marginTop:8}}>Restart</div>}
                        {/* Similar verses (المتشابهات) */}
                        {MUTASHABIHAT[mvKey]&&MUTASHABIHAT[mvKey].some(sk=>completedAyahs.has(sk))&&(
                          <div style={{marginTop:12,padding:"10px 12px",borderRadius:10,background:dark?"rgba(230,140,40,0.06)":"rgba(180,100,20,0.04)",border:dark?"1px solid rgba(230,140,40,0.15)":"1px solid rgba(180,100,20,0.10)"}}>
                            <div style={{fontSize:10,color:dark?"rgba(230,184,74,0.55)":"rgba(140,100,20,0.55)",letterSpacing:".10em",textTransform:"uppercase",fontWeight:600,marginBottom:6}}>Similar Verses · المتشابهات</div>
                            {MUTASHABIHAT[mvKey].filter(sk=>completedAyahs.has(sk)).map(simKey=>{
                              const [ss,sa]=simKey.split(":");
                              const nextKey=`${ss}:${Number(sa)+1}`;
                              const simVerse=batch.find(v=>v.verse_key===simKey)||sessionVerses.find(v=>v.verse_key===simKey);
                              const nextVerse=batch.find(v=>v.verse_key===nextKey)||sessionVerses.find(v=>v.verse_key===nextKey);
                              const simText=simVerse?(simVerse.text_uthmani||"").replace(/\u06DF/g,"\u0652"):simVerseCache[simKey];
                              const nextText=nextVerse?(nextVerse.text_uthmani||"").replace(/\u06DF/g,"\u0652"):simVerseCache[nextKey+"_next"];
                              if(!simText&&!simVerseCache[simKey]) fetchSimVerse(simKey);
                              return (
                                <div key={simKey} style={{padding:"8px 0",borderTop:dark?"1px solid rgba(255,255,255,0.04)":"1px solid rgba(0,0,0,0.04)"}}>
                                  <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.45)":"#6B645A",marginBottom:4}}>{SURAH_EN[Number(ss)]} · {simKey}</div>
                                  {simText?<div style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:18,color:dark?"rgba(243,231,200,0.70)":"#3D2E0A",direction:"rtl",textAlign:"right",lineHeight:1.8}}>{simText} <span style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:14,color:dark?"rgba(212,175,55,0.30)":"rgba(140,100,20,0.30)"}}>﴿{toArabicDigits(Number(sa))}﴾</span></div>:<div style={{fontSize:10,color:dark?"rgba(243,231,200,0.25)":"#9A8A6A"}}>Loading...</div>}
                                  {nextText&&<div style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:18,color:dark?"rgba(243,231,200,0.70)":"#3D2E0A",direction:"rtl",textAlign:"right",lineHeight:1.8,marginTop:2}}>{nextText} <span style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:14,color:dark?"rgba(212,175,55,0.30)":"rgba(140,100,20,0.30)"}}>﴿{toArabicDigits(Number(sa)+1)}﴾</span></div>}
                                </div>
                              );
                            })}
                            <div style={{fontSize:9,color:dark?"rgba(243,231,200,0.25)":"rgba(0,0,0,0.25)",marginTop:4}}>Compare these verses to strengthen your memorization</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* ── BATCH DONE ── */}
                {bDone?(
                  <div style={{textAlign:"center",padding:"20px",background:T.surface,border:"1px solid #F0C04030",borderRadius:8}}>
                    <div style={{fontSize:22,marginBottom:8}}>✅</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:"#F0C040",marginBottom:4}}>Batch Complete — MashaAllah!</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.45)"}}>Session complete — MashaAllah! 🤲</div>
                  </div>
                ):(()=>{
                  const batchPages=Math.max(1,Math.ceil(batch.length/5));
                  const onLastPage=ayahPage>=batchPages-1;
                  const isFinal=onLastPage;
                  return (<div>
                  <div className="sbtn" onClick={()=>{
                    if(!onLastPage){
                      // Not on last page — advance to next batch of ayahs
                      setAyahPage(p=>p+1);
                      // V9: add current page's ayahs to completedAyahs
                      const pageSize=7;
                      const pageStart2=ayahPage*pageSize;
                      const pageEnd2=Math.min(pageStart2+pageSize,batch.length);
                      setCompletedAyahs(prev=>{const next=new Set(prev);batch.slice(pageStart2,pageEnd2).forEach(v=>{if(v.verse_key)next.add(v.verse_key);});saveCompletedAyahs(next);return next;});
                      return;
                    }
                    // On last page — complete the session + add last page ayahs to V9
                    {const ps=7;const ps2=ayahPage*ps;const pe2=Math.min(ps2+ps,batch.length);
                    setCompletedAyahs(prev=>{const next=new Set(prev);batch.slice(ps2,pe2).forEach(v=>{if(v.verse_key)next.add(v.verse_key);});saveCompletedAyahs(next);return next;});}
                    const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];
                    setSessionsCompleted(prev=>({...prev,[sess.id]:true}));
                    toggleCheck(sess.id);
                    setRepCounts({});setConnectionReps({});
                    setOpenAyah(null);
                    setAyahPage(0);
                    if(activeSessionIndex>=SESSIONS.length-1){
                      setYesterdayBatch(fajrBatch);
                      setRecentBatches(prev=>[...prev.slice(-4),fajrBatch.map(v=>({verse_key:v.verse_key,text_uthmani:v.text_uthmani,surah_number:v.surah_number}))].slice(-5));
                      if(bEnd>=totalSV&&totalSV>0&&sessionJuz){
                        setSessionIdx(totalSV);
                        setJuzProgress(prev=>({...prev,[sessionJuz]:totalSV}));
                        setJuzStatus(prev=>markJuzAndSurahsComplete(prev,sessionJuz));
                        setJuzCompletedInSession(prev=>new Set([...prev,sessionJuz]));
                        v9MarkJuzComplete(sessionJuz); // V9
                        setSessionJuz(null);
                      } else if(sessionJuz) {
                        const actualEnd=sessionIdx+fajrBatch.length;
                        setSessionIdx(actualEnd);
                        setJuzProgress(prev=>({...prev,[sessionJuz]:actualEnd}));
                        // V9: add all completed ayahs up to actualEnd + mark completed surahs
                        setCompletedAyahs(prev=>{const next=new Set(prev);sessionVerses.slice(0,actualEnd).forEach(v=>{if(v.verse_key)next.add(v.verse_key);});saveCompletedAyahs(next);return next;});
                        // Mark completed surahs in V9
                        const surahCounts={};const surahTotals={};
                        sessionVerses.forEach(v=>{const sn=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);surahTotals[sn]=(surahTotals[sn]||0)+1;});
                        let cursor=0;const surahOrder=[];
                        sessionVerses.forEach(v=>{const sn=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);if(!surahOrder.includes(sn))surahOrder.push(sn);});
                        for(const sn of surahOrder){const count=surahTotals[sn]||0;if(cursor+count<=bEnd)v9MarkSurahComplete(sn);cursor+=count;}
                      }
                      setActiveSessionIndex(0);
                      setSessionsCompleted({fajr:false,dhuhr:false,asr:false,maghrib:false,isha:false});
                    } else {
                      setActiveSessionIndex(i=>i+1);
                    }
                  }} style={{width:"100%",padding:"14px",borderRadius:12,fontSize:14,fontWeight:700,textAlign:"center",transition:"all .2s",
                    background:"linear-gradient(180deg,#E6B84A,#D4A62A)",
                    color:"#0B1220",
                    boxShadow:"0 6px 18px rgba(230,184,74,0.30),0 0 14px rgba(230,184,74,0.15)"}}>
                    {isFinal?"Complete Session":"Next →"}
                  </div>
                  {!isFinal&&<div style={{textAlign:"center",fontSize:10,color:"rgba(243,231,200,0.28)",marginTop:6}}>{ayahPage+1} of {batchPages} · keep going</div>}
                  </div>);
                })()}
              </div>
            )}

            {/* ── JUZ COMPLETE ── */}
            {!sessLoading&&currentSessionId==="dhuhr"&&batch.length===0&&(
              <div style={{padding:"16px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:6}}>No review batch yet</div>
                <div style={{fontSize:11,color:T.sub,lineHeight:1.6,marginBottom:12}}>Complete a full day through Isha to build your 5-day review pool. The Sheikh says: review the previous five days before starting anything new.</div>
                <div className="sbtn" onClick={()=>{
                  const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];
                  setSessionsCompleted(prev=>({...prev,[sess.id]:true}));
                  toggleCheck(sess.id);
                  setRepCounts({});setConnectionReps({});
                  setOpenAyah(null);
                  setActiveSessionIndex(i=>i+1);
                }} style={{width:"100%",padding:"14px",background:"linear-gradient(180deg,#E6B84A,#D4A62A)",borderRadius:12,fontSize:14,fontWeight:700,color:"#0B1220",textAlign:"center",boxShadow:"0 6px 14px rgba(230,184,74,0.2)"}}>
                  Complete Dhuhr Revision
                </div>
              </div>
            )}

            {!sessLoading&&currentSessionId==="fajr"&&batch.length===0&&totalSV>0&&juzCompletedInSession.has(sessionJuz)&&(
              <div style={{textAlign:"center",paddingTop:40}}>
                <div style={{fontSize:26,marginBottom:10}}>🎉</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:T.accent,marginBottom:6}}>Juz {sessionJuz} Complete — Alhamdulillah!</div>
                <div style={{fontSize:13,color:T.sub}}>Select the next Juz above to continue.</div>
              </div>
            )}

          </div>
        </div>
  );
}
