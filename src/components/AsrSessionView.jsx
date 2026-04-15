import { useState, useRef } from "react";
import MUTASHABIHAT from "../mutashabihat.json";
import { SURAH_EN } from "../data/constants";
import { SURAH_AR } from "../data/quran-metadata";
import { toArabicDigits } from "../utils";

// ── ASR SESSION VIEW (must be outside parent to avoid remount on every render) ─
function AsrSessionView({
    asrSelectionSummary,asrSafePage,asrPages,asrPageStart,asrPageEnd,
    asrVisibleAyahs,asrBatch,asrExpandedAyah,setAsrExpandedAyah,asrTouchStartRef,
    setAsrPage,asrSlideDir,setAsrSlideDir,translations,fetchTranslations,playAyah,playingKey,
    audioLoading,asrSurahProgress,onComplete,onChangeSelection,asrIsCustomized,dark,completedAyahs,
  }) {
    const [asrViewMode,setAsrViewMode]=useState("mushaf"); // "mushaf" default, "study" for cards
    const asrMushafScrollRef=useRef(null);
    const [simVerseCache,setSimVerseCache]=useState({});
    const fetchSimVerse=async(vk)=>{
      if(simVerseCache[vk]) return;
      const [s,a]=vk.split(":");
      const nextKey=`${s}:${Number(a)+1}`;
      try{
        const [res1,res2]=await Promise.all([
          fetch(`https://api.quran.com/api/v4/verses/by_key/${vk}?words=false&fields=text_uthmani`),
          fetch(`https://api.quran.com/api/v4/verses/by_key/${nextKey}?words=false&fields=text_uthmani`)
        ]);
        const d1=res1.ok?await res1.json():null;
        const d2=res2.ok?await res2.json():null;
        const text=(d1?.verse?.text_uthmani||"").replace(/\u06DF/g,"\u0652");
        const nextText=(d2?.verse?.text_uthmani||"").replace(/\u06DF/g,"\u0652");
        if(text) setSimVerseCache(prev=>({...prev,[vk]:text,[nextKey+"_next"]:nextText}));
      }catch{}
    };
    const T2={
      gold:"#D2A85A",goldBright:"#E2BC72",
      ivory:"#F3E7C8",ivoryDim:"rgba(243,231,200,0.74)",ivoryFaint:"rgba(243,231,200,0.46)",
      green:"#59D98A",greenSoft:"rgba(89,217,138,0.16)",
    };
    return (
      <div className="fi" style={{fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",padding:"4px 0 16px"}}>
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          {/* Exit button */}
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:4}}>
            <div className="sbtn" onClick={onChangeSelection} style={{padding:"6px 10px",fontSize:18,color:"rgba(232,200,120,0.40)",lineHeight:1}}>×</div>
          </div>
          <div className="asr-title">ASR SESSION</div>
          <div className="asr-title-line"/>

          {/* Reviewing + selection + customize */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:T2.green,boxShadow:"0 0 10px rgba(89,217,138,0.26)",flexShrink:0}}/>
              <div style={{color:"rgba(243,231,200,0.52)",fontSize:11,letterSpacing:".12em",textTransform:"uppercase",fontWeight:500}}>{asrIsCustomized?"Customized":"Auto"}</div>
            </div>
            <div className="sbtn" onClick={onChangeSelection}
              style={{fontSize:9,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",
              padding:"3px 9px",borderRadius:20,border:"1px solid rgba(217,177,95,0.22)",
              color:"rgba(217,177,95,0.55)"}}>
              Customize
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div style={{color:dark?T2.ivory:"#2D2A26",fontSize:14,fontWeight:600,lineHeight:1.25,maxWidth:"70%"}}>{asrSelectionSummary||"Asr Review"}</div>
            <div style={{display:"flex",gap:4}}>
              {["mushaf","study"].map(m=>(
                <div key={m} className="sbtn" onClick={()=>setAsrViewMode(m)} style={{padding:"3px 8px",borderRadius:6,fontSize:9,fontWeight:asrViewMode===m?700:400,letterSpacing:".06em",textTransform:"uppercase",color:asrViewMode===m?(dark?"#E8C76A":"#6B4F00"):(dark?"rgba(243,231,200,0.35)":"#9A8A6A"),background:asrViewMode===m?(dark?"rgba(217,177,95,0.10)":"rgba(180,140,40,0.08)"):"transparent",border:`1px solid ${asrViewMode===m?(dark?"rgba(217,177,95,0.25)":"rgba(140,100,20,0.20)"):"transparent"}`}}>
                  {m==="mushaf"?"Mushaf":"Study"}
                </div>
              ))}
            </div>
          </div>

          {/* ── MUSHAF MODE — paged by surah ── */}
          {asrViewMode==="mushaf"&&(()=>{
            // Group ayahs by surah
            const surahGroups=[];
            let curGroup=null;
            asrBatch.forEach(v=>{
              const sNum=v.surah_number||parseInt(v.verse_key.split(":")[0],10);
              if(!curGroup||curGroup.sNum!==sNum){ curGroup={sNum,ayahs:[]}; surahGroups.push(curGroup); }
              curGroup.ayahs.push(v);
            });
            const totalSurahPages=surahGroups.length;
            const safeSurahPage=Math.min(asrSafePage,totalSurahPages-1);
            const currentGroup=surahGroups[safeSurahPage>=0?safeSurahPage:0];
            if(!currentGroup) return null;
            return (
            <div style={{flex:1,overflow:"hidden",position:"relative"}}
              onTouchStart={e=>{asrTouchStartRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
              onTouchEnd={e=>{
                if(!asrTouchStartRef.current) return;
                const dx=e.changedTouches[0].clientX-asrTouchStartRef.current.x;
                const dy=e.changedTouches[0].clientY-asrTouchStartRef.current.y;
                asrTouchStartRef.current=null;
                if(Math.abs(dx)<60||Math.abs(dy)>Math.abs(dx)) return;
                if(dx>0&&safeSurahPage<totalSurahPages-1){ setAsrSlideDir("left"); setAsrPage(p=>Math.min(totalSurahPages-1,p+1)); asrMushafScrollRef.current?.scrollTo(0,0); }
                else if(dx<0&&safeSurahPage>0){ setAsrSlideDir("right"); setAsrPage(p=>Math.max(0,p-1)); asrMushafScrollRef.current?.scrollTo(0,0); }
              }}>
              <div ref={asrMushafScrollRef} style={{overflowY:"auto",padding:"12px 14px",height:"100%"}}>
                {/* Surah header */}
                <div style={{textAlign:"center",marginBottom:12}}>
                  <div style={{fontFamily:"'Amiri',serif",fontSize:22,color:dark?"#E8C878":"#6B645A",fontWeight:700,marginBottom:2}}>{SURAH_AR[currentGroup.sNum]||""}</div>
                  <div style={{fontSize:10,color:dark?"rgba(217,177,95,0.50)":"rgba(140,100,20,0.50)",letterSpacing:".12em",textTransform:"uppercase",fontWeight:600,marginBottom:6}}>{SURAH_EN[currentGroup.sNum]}</div>
                  {currentGroup.sNum!==9&&currentGroup.sNum!==1&&<div style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:17,color:dark?"rgba(232,200,120,0.55)":"rgba(0,0,0,0.45)",lineHeight:2}}>بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِيمِ</div>}
                  <div style={{height:1,margin:"8px 16px 0",background:dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.28) 50%,rgba(217,177,95,0) 100%)":"linear-gradient(90deg,rgba(139,106,16,0) 0%,rgba(139,106,16,0.18) 50%,rgba(139,106,16,0) 100%)"}}/>
                </div>
                {/* Flowing ayahs */}
                <div style={{direction:"rtl",textAlign:"right",lineHeight:1.95,wordBreak:"keep-all",overflowWrap:"normal"}}>
                  {currentGroup.ayahs.map(v=>{
                    const vKey=v.verse_key;
                    const aNum=parseInt(vKey.split(":")[1],10);
                    return (
                      <span key={vKey} className="sbtn" onClick={()=>{setAsrExpandedAyah(vKey);if(!translations[vKey])fetchTranslations([v]);}}
                        style={{cursor:"pointer",borderRadius:6,padding:"2px 4px"}}>
                        <span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:22,color:dark?"#E8DFC0":"#2D2A26"}}>{(v.text_uthmani||"").replace(/\u06DF/g,"\u0652")}</span>
                        <span style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:16,color:dark?"rgba(212,175,55,0.38)":"#A08848",marginRight:2,marginLeft:2}}>﴿{toArabicDigits(aNum)}﴾</span>
                      </span>
                    );
                  })}
                </div>
              {/* Page nav */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",marginTop:8}}>
                <div className={safeSurahPage<totalSurahPages-1?"sbtn":""} onClick={()=>{if(safeSurahPage<totalSurahPages-1){setAsrSlideDir("left");setAsrPage(p=>p+1);asrMushafScrollRef.current?.scrollTo(0,0);}}} style={{padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:600,color:safeSurahPage<totalSurahPages-1?(dark?"#E8C76A":"#6B4F00"):(dark?"rgba(243,231,200,0.15)":"rgba(0,0,0,0.15)"),background:safeSurahPage<totalSurahPages-1?(dark?"rgba(217,177,95,0.08)":"rgba(180,140,40,0.06)"):"transparent",border:`1px solid ${safeSurahPage<totalSurahPages-1?(dark?"rgba(217,177,95,0.20)":"rgba(140,100,20,0.15)"):"transparent"}`}}>← Next</div>
                <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.30)":"#9A8A6A"}}>{safeSurahPage+1} / {totalSurahPages}</div>
                <div className={safeSurahPage>0?"sbtn":""} onClick={()=>{if(safeSurahPage>0){setAsrSlideDir("right");setAsrPage(p=>p-1);asrMushafScrollRef.current?.scrollTo(0,0);}}} style={{padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:600,color:safeSurahPage>0?(dark?"#E8C76A":"#6B4F00"):(dark?"rgba(243,231,200,0.15)":"rgba(0,0,0,0.15)"),background:safeSurahPage>0?(dark?"rgba(217,177,95,0.08)":"rgba(180,140,40,0.06)"):"transparent",border:`1px solid ${safeSurahPage>0?(dark?"rgba(217,177,95,0.20)":"rgba(140,100,20,0.15)"):"transparent"}`}}>Prev →</div>
              </div>
              </div>
            </div>
            );
          })()}

          {/* ── STUDY MODE — card view with pagination ── */}
          {asrViewMode==="study"&&(
          <div>
          {/* Ayah panel — frame is static, only content slides */}
          <div
            className="asr-ayah-panel"
            style={{padding:"6px 0",marginBottom:0,borderRadius:0,borderTop:"1px solid rgba(217,177,95,0.32)",borderBottom:"1px solid rgba(217,177,95,0.32)",position:"relative",overflow:"hidden"}}
            onTouchStart={e=>{asrTouchStartRef.current=e.touches[0].clientX;}}
            onTouchEnd={e=>{
              if(asrTouchStartRef.current==null) return;
              const delta=e.changedTouches[0].clientX-asrTouchStartRef.current;
              asrTouchStartRef.current=null;
              if(Math.abs(delta)<40) return;
              if(delta>0&&asrSafePage<asrPages-1){ setAsrSlideDir("left"); setAsrPage(p=>Math.min(asrPages-1,p+1)); }
              else if(delta<0&&asrSafePage>0){ setAsrSlideDir("right"); setAsrPage(p=>Math.max(0,p-1)); }
            }}
          >
            <div className="asr-arw left" onClick={()=>{if(asrSafePage===0)return;setAsrSlideDir("right");setAsrPage(p=>Math.max(0,p-1));}} style={{opacity:asrSafePage===0?0.25:1,pointerEvents:asrSafePage===0?"none":"auto"}}>‹</div>
            <div className="asr-arw right" onClick={()=>{if(asrSafePage>=asrPages-1)return;setAsrSlideDir("left");setAsrPage(p=>Math.min(asrPages-1,p+1));}} style={{opacity:asrSafePage>=asrPages-1?0.25:1,pointerEvents:asrSafePage>=asrPages-1?"none":"auto"}}>›</div>

            {/* Ayah list — slides on page change */}
            <div key={asrSafePage} className={asrSlideDir==="left"?"asr-slide-left":asrSlideDir==="right"?"asr-slide-right":""} style={{display:"flex",flexDirection:"column",gap:8,padding:"4px 0"}}>
              {asrVisibleAyahs.map((v,idx)=>{
                const vKey=v.verse_key;
                const sNum=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);
                return (
                  <div key={vKey} className="sbtn" onClick={()=>{setAsrExpandedAyah(vKey);if(!translations[vKey])fetchTranslations([v]);}}
                    style={{borderRadius:14,padding:"12px 14px",background:dark?"rgba(14,22,40,0.80)":"#EADFC8",border:dark?"1px solid rgba(217,177,95,0.08)":"1px solid rgba(0,0,0,0.08)",boxShadow:dark?"0 2px 8px rgba(0,0,0,0.20)":"0 2px 8px rgba(0,0,0,0.06)",transition:"all .15s"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:11,color:dark?"rgba(243,231,200,0.50)":"#6B645A"}}>{SURAH_EN[sNum]||`Surah ${sNum}`} · {vKey}</span>
                    </div>
                    <div style={{direction:"rtl",textAlign:"right",lineHeight:2}}>
                      <span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:22,color:dark?"rgba(243,231,200,0.88)":"#2D2A26"}}>{(v.text_uthmani||"").replace(/\u06DF/g,"\u0652")}</span>
                      <span style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:18,color:dark?"rgba(212,175,55,0.38)":"#A08848",marginRight:4}}>﴿{toArabicDigits(parseInt(vKey.split(":")[1],10))}﴾</span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
          </div>
          )}

          <div className="asr-progress-rule" style={{margin:"18px 20px 16px"}}/>

          {/* Progress */}
          <div style={{marginBottom:6,padding:"0 20px"}}>
            <div style={{color:T2.goldBright,fontSize:12,fontWeight:800,marginBottom:8}}>Progress</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
              <div style={{padding:"6px 12px",borderRadius:999,background:T2.greenSoft,border:"1px solid rgba(89,217,138,0.16)",color:"#B8F5D0",fontSize:12,fontWeight:700}}>
                {asrSurahProgress.filter(s=>s.state==="complete").length} Memorized
              </div>
              {asrSurahProgress.find(s=>s.state==="current")&&(
                <div style={{padding:"6px 12px",borderRadius:999,background:"transparent",border:"1px solid rgba(210,168,90,0.18)",color:"rgba(226,188,114,0.65)",fontSize:11,fontWeight:400}}>
                  {asrSurahProgress.find(s=>s.state==="current")?.label}
                </div>
              )}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{color:T2.ivoryFaint,fontSize:12}}>Pages</div>
              <div style={{color:T2.goldBright,fontSize:12,fontWeight:600}}>Page {asrSafePage+1} of {asrPages}</div>
            </div>
            <div style={{height:6,background:"rgba(255,255,255,0.08)",borderRadius:999,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.round(((asrSafePage+1)/asrPages)*100)}%`,background:"linear-gradient(90deg,#D2A85A,#E2BC72)",borderRadius:999}}/>
            </div>
          </div>

          {/* Buttons */}
          <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:22,padding:"0 20px"}}>
            <div className="sbtn" onClick={onComplete} style={{width:"100%",padding:"15px 16px",borderRadius:18,textAlign:"center",fontSize:14,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",background:"linear-gradient(180deg,#E0BD78 0%,#CEAA60 100%)",color:"#0A1020",boxShadow:"0 8px 18px rgba(210,168,90,0.10),inset 0 1px 0 rgba(255,255,255,0.10)"}}>
              Complete Asr Session
            </div>
            <div className="sbtn" onClick={onChangeSelection} style={{width:"100%",padding:"13px 16px",borderRadius:18,textAlign:"center",fontSize:13,fontWeight:600,color:"rgba(226,188,114,0.82)",border:"1px solid rgba(210,170,95,0.14)",background:"rgba(8,16,30,0.22)"}}>
              Change Selection
            </div>
          </div>
        </div>{/* end flex column wrapper */}

        {/* Ayah popup modal — outside scroll container */}
        {asrExpandedAyah&&(()=>{
          const ev=asrBatch.find(v=>v.verse_key===asrExpandedAyah);
          if(!ev) return null;
          const evKey=ev.verse_key;
          const evSurah=ev.surah_number||parseInt(evKey.split(":")[0],10);
          const evAyah=evKey.split(":")[1];
          const evTrans=translations[evKey];
          const evPlaying=playingKey===evKey;
          const evLoading=audioLoading===evKey;
          return (
            <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",background:"rgba(0,0,0,0.70)",backdropFilter:"blur(6px)"}} onClick={()=>setAsrExpandedAyah(null)}>
              <div className="fi" style={{position:"relative",width:"100%",maxWidth:400,borderRadius:24,padding:"28px 24px 24px",background:dark?"radial-gradient(circle at 50% 0%,rgba(58,92,165,0.12) 0%,rgba(0,0,0,0) 40%),linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",border:"1px solid rgba(217,177,95,0.15)",boxShadow:"0 24px 60px rgba(0,0,0,0.50),0 0 30px rgba(217,177,95,0.06)"}} onClick={e=>e.stopPropagation()}>
                <div className="sbtn" onClick={()=>setAsrExpandedAyah(null)} style={{position:"absolute",top:14,right:18,fontSize:18,color:"rgba(243,231,200,0.30)"}}>×</div>
                <div style={{direction:"rtl",textAlign:"center",fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:26,lineHeight:2,color:"#F3E7C8",marginBottom:16}}>
                  {ev.text_uthmani}
                </div>
                <div style={{textAlign:"center",fontSize:12,color:"rgba(243,231,200,0.45)",marginBottom:20}}>
                  Ayah {evAyah} of Surah {SURAH_EN[evSurah]||evSurah}
                </div>
                <div style={{color:"rgba(243,231,200,0.78)",fontSize:14,lineHeight:1.8,textAlign:"center",marginBottom:18}}>
                  {evTrans===undefined?<span style={{color:"rgba(243,231,200,0.42)"}}>Loading...</span>:evTrans||<span style={{color:"rgba(243,231,200,0.42)"}}>Translation unavailable</span>}
                </div>
                <div style={{display:"flex",justifyContent:"center",marginBottom:MUTASHABIHAT[evKey]&&MUTASHABIHAT[evKey].some(sk=>completedAyahs?.has(sk))?12:0}}>
                  <div className="sbtn" onClick={()=>playAyah(evKey,evKey)} style={{width:42,height:42,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:evPlaying?"rgba(217,177,95,0.14)":"rgba(255,255,255,0.04)",border:`1px solid ${evPlaying?"rgba(217,177,95,0.30)":"rgba(255,255,255,0.08)"}`,color:evPlaying?T2.goldBright:"rgba(243,231,200,0.56)",fontSize:16}}>
                    {evLoading?"…":evPlaying?"⏸":"▶"}
                  </div>
                </div>
                {MUTASHABIHAT[evKey]&&MUTASHABIHAT[evKey].some(sk=>completedAyahs?.has(sk))&&(
                  <div style={{padding:"10px 12px",borderRadius:10,background:dark?"rgba(230,140,40,0.06)":"rgba(180,100,20,0.04)",border:dark?"1px solid rgba(230,140,40,0.15)":"1px solid rgba(180,100,20,0.10)"}}>
                    <div style={{fontSize:10,color:dark?"rgba(230,184,74,0.55)":"rgba(140,100,20,0.55)",letterSpacing:".10em",textTransform:"uppercase",fontWeight:600,marginBottom:6}}>Similar Verses · المتشابهات</div>
                    {MUTASHABIHAT[evKey].filter(sk=>completedAyahs?.has(sk)).map(simKey=>{
                      const [ss,sa]=simKey.split(":");
                      const nextKey=`${ss}:${Number(sa)+1}`;
                      const simVerse=asrBatch.find(v=>v.verse_key===simKey);
                      const nextVerse=asrBatch.find(v=>v.verse_key===nextKey);
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
      </div>
    );
  }

export default AsrSessionView;
