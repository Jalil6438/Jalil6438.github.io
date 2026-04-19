import { useState, useRef, useEffect } from "react";
import MUTASHABIHAT from "../mutashabihat.json";
import { SURAH_EN } from "../data/constants";
import { SURAH_AR } from "../data/quran-metadata";
import { toArabicDigits, mushafImageUrl } from "../utils";

// ── ASR SESSION VIEW (must be outside parent to avoid remount on every render) ─
function AsrSessionView({
    asrSelectionSummary,asrSafePage,asrPages,asrPageStart,asrPageEnd,
    asrVisibleAyahs,asrBatch,asrExpandedAyah,setAsrExpandedAyah,asrTouchStartRef,
    setAsrPage,asrSlideDir,setAsrSlideDir,translations,fetchTranslations,playAyah,playingKey,
    audioLoading,asrSurahProgress,onComplete,onChangeSelection,asrIsCustomized,dark,completedAyahs,
    playMushafRange,stopMushafAudio,mushafAudioPlaying,
    fontSize = 19,
  }) {
    const [asrViewMode,setAsrViewMode]=useState("mushaf"); // "mushaf" default, "study" for cards
    const asrMushafScrollRef=useRef(null);
    // KFGQPC V2 per-page fonts + bismillah glyphs — same authentic mushaf
    // rendering used in QuranTab / MyHifzTab Fajr/Dhuhr views.
    const [loadedFonts, setLoadedFonts] = useState(() => new Set());
    const [pageVerses, setPageVerses] = useState({});
    const [bismillahGlyphs, setBismillahGlyphs] = useState(null);
    const [mushafPagesData, setMushafPagesData] = useState(null);
    const [mushafLayoutData, setMushafLayoutData] = useState(null);
    useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          const [p, l] = await Promise.all([fetch("/mushaf-pages.json"), fetch("/mushaf-layout.json")]);
          if (!cancelled && p.ok) setMushafPagesData(await p.json());
          if (!cancelled && l.ok) setMushafLayoutData(await l.json());
        } catch {}
      })();
      return () => { cancelled = true; };
    }, []);
    const loadQcfFont = (pageN) => {
      if (!pageN || pageN < 1 || pageN > 604) return;
      const elId = `qcf-font-v2-${pageN}`;
      if (!document.getElementById(elId)) {
        const legacy = document.getElementById(`qcf-font-${pageN}`);
        if (legacy) legacy.remove();
        const style = document.createElement("style");
        style.id = elId;
        style.textContent = `@font-face{font-family:'p${pageN}';src:url('https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v2/woff2/p${pageN}.woff2') format('woff2'),url('https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v2/woff/p${pageN}.woff') format('woff');font-display:block;}`;
        document.head.appendChild(style);
      }
      if (loadedFonts.has(pageN)) return;
      if (document.fonts && document.fonts.load) {
        document.fonts.load(`16px 'p${pageN}'`).then(() => {
          setLoadedFonts(prev => { const n = new Set(prev); n.add(pageN); return n; });
        }).catch(() => {});
      }
    };
    const asrPageNums = Array.from(new Set((asrBatch || []).map(v => v.page_number).filter(Boolean)));
    useEffect(() => {
      if (!asrPageNums.length) return;
      let cancelled = false;
      (async () => {
        for (const pn of asrPageNums) {
          if (pageVerses[pn]) { loadQcfFont(pn); continue; }
          try {
            const res = await fetch(`https://api.quran.com/api/v4/verses/by_page/${pn}?words=true&word_fields=line_number,code_v2,char_type_name,page_number&fields=text_uthmani,verse_key&per_page=50`);
            if (!res.ok || cancelled) continue;
            const data = await res.json();
            const vs = data.verses || [];
            if (!cancelled) setPageVerses(prev => prev[pn] ? prev : { ...prev, [pn]: vs });
            loadQcfFont(pn);
          } catch {}
        }
      })();
      return () => { cancelled = true; };
    }, [asrPageNums.join(",")]);
    useEffect(() => {
      loadQcfFont(1);
      let cancelled = false;
      (async () => {
        try {
          const res = await fetch("https://api.quran.com/api/v4/verses/by_key/1:1?words=true&word_fields=code_v2,char_type_name");
          if (!res.ok || cancelled) return;
          const data = await res.json();
          const words = (data.verse?.words || []).filter(w => w.char_type_name === "word").map(w => w.code_v2 || "");
          if (!cancelled && words.length) setBismillahGlyphs(words.join(""));
        } catch {}
      })();
      return () => { cancelled = true; };
    }, []);
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

          {/* Play Page pill — top of the Asr view, Mushaf mode only */}
          {asrViewMode==="mushaf"&&playMushafRange&&asrBatch.length>0&&(()=>{
            const pageGroups=[];
            let cg=null;
            asrBatch.forEach(v=>{
              const pn=v.page_number||0;
              if(!cg||cg.page!==pn){cg={page:pn,ayahs:[]};pageGroups.push(cg);}
              cg.ayahs.push(v);
            });
            const safeIdx=Math.min(asrSafePage,Math.max(0,pageGroups.length-1));
            const pageAyahs=pageGroups[safeIdx]?.ayahs||[];
            if(pageAyahs.length===0) return null;
            return (
              <div style={{textAlign:"center",marginBottom:10}}>
                <div className="sbtn" onClick={()=>{ if(mushafAudioPlaying) stopMushafAudio&&stopMushafAudio(); else playMushafRange(pageAyahs); }}
                  style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:999,fontSize:10,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:dark?"#E8C76A":"#6B4F00",background:dark?"rgba(217,177,95,0.10)":"rgba(180,140,40,0.08)",border:`1px solid ${dark?"rgba(217,177,95,0.25)":"rgba(140,100,20,0.20)"}`}}>
                  <span style={{fontSize:10}}>{mushafAudioPlaying?"■":"▶"}</span>
                  {mushafAudioPlaying?"Stop":"Play Page"}
                </div>
              </div>
            );
          })()}

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
            // Group by mushaf page_number — one page at a time with nav
            const pageGroups=[];
            let curGroup=null;
            asrBatch.forEach(v=>{
              const pn=v.page_number||0;
              if(!curGroup||curGroup.page!==pn){ curGroup={page:pn,ayahs:[]}; pageGroups.push(curGroup); }
              curGroup.ayahs.push(v);
            });
            const totalPages=pageGroups.length;
            const safePage=Math.min(asrSafePage,Math.max(0,totalPages-1));
            const currentPage=pageGroups[safePage];
            if(!currentPage) return null;
            // Sub-group by surah within this page
            const subs=[];let sg=null;
            currentPage.ayahs.forEach(v=>{
              const sn=v.surah_number||parseInt(v.verse_key.split(":")[0],10);
              if(!sg||sg.sNum!==sn){sg={sNum:sn,ayahs:[]};subs.push(sg);}
              sg.ayahs.push(v);
            });
            // Dominant surah for this page (most ayahs wins, ties go to later surah)
            const dominantSurah=(()=>{
              const counts={};const order=[];
              currentPage.ayahs.forEach(v=>{
                const sn=v.surah_number||parseInt(v.verse_key.split(":")[0],10);
                if(counts[sn]===undefined){counts[sn]=0;order.push(sn);}
                counts[sn]+=1;
              });
              let w=order[0]||0;
              order.forEach(sn=>{
                if(counts[sn]>counts[w]||(counts[sn]===counts[w]&&order.indexOf(sn)>order.indexOf(w))) w=sn;
              });
              return w;
            })();
            const asrJuzNum=currentPage.ayahs[0]?.juz_number;
            const asrHizbLabel=(()=>{
              for(let i=0;i<currentPage.ayahs.length;i++){
                const v=currentPage.ayahs[i];
                const r=v.rub_el_hizb_number;
                if(typeof r!=="number") continue;
                const prev=i>0?currentPage.ayahs[i-1]:null;
                if(prev&&prev.rub_el_hizb_number===r) continue;
                const pos=((r-1)%4)+1;
                const hizb=Math.ceil(r/4);
                // Rub positions mark the start of each quarter within a hizb.
                if(pos===1) return `Hizb ${hizb}`;
                if(pos===2) return `1/4 Hizb ${hizb}`;
                if(pos===3) return `1/2 Hizb ${hizb}`;
                if(pos===4) return `3/4 Hizb ${hizb}`;
              }
              return null;
            })();
            return (
            <div style={{flex:1,overflow:"hidden",position:"relative",display:"flex",flexDirection:"column"}}
              onTouchStart={e=>{asrTouchStartRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
              onTouchEnd={e=>{
                if(!asrTouchStartRef.current) return;
                const dx=e.changedTouches[0].clientX-asrTouchStartRef.current.x;
                const dy=e.changedTouches[0].clientY-asrTouchStartRef.current.y;
                asrTouchStartRef.current=null;
                if(Math.abs(dx)<60||Math.abs(dy)>Math.abs(dx)) return;
                if(dx>0&&safePage<totalPages-1){ setAsrSlideDir("left"); setAsrPage(p=>Math.min(totalPages-1,p+1)); }
                else if(dx<0&&safePage>0){ setAsrSlideDir("right"); setAsrPage(p=>Math.max(0,p-1)); }
              }}>
              {/* Page chrome — dominant Surah top-left, Part top-right (matches Fajr Mushaf) */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 14px 4px",flexShrink:0}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:dark?"#E8C76A":"#6B4F00"}}>{SURAH_EN[dominantSurah]||""}</div>
                {asrJuzNum?(
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:dark?"#E8C76A":"#6B4F00"}}>Part {asrJuzNum}</div>
                ):<div/>}
              </div>
              <div key={safePage} ref={asrMushafScrollRef} className={asrSlideDir==="left"?"asr-slide-left":asrSlideDir==="right"?"asr-slide-right":""} style={{flex:1,overflow:"hidden",padding:"8px 2px"}}>
                {(()=>{
                  const pageNum=currentPage.page;
                  const pageFontReady=loadedFonts.has(pageNum);
                  if(!pageFontReady){
                    return (
                      <div style={{minHeight:400,display:"flex",alignItems:"center",justifyContent:"center",color:dark?"rgba(217,177,95,0.35)":"rgba(107,100,90,0.55)",fontSize:12,letterSpacing:".08em"}}>
                        <span>loading mushaf…</span>
                      </div>
                    );
                  }
                  const pageLines=mushafPagesData&&mushafPagesData[pageNum];
                  const pageLayout=mushafLayoutData&&mushafLayoutData[pageNum];
                  if(!pageLines||!pageLayout) return null;
                  let ayahIdx=-1;
                  return pageLayout.map((layoutEntry,i)=>{
                    const type=layoutEntry.type;
                    let lineText="";
                    if(type!=="surah_name"&&type!=="basmallah"){
                      ayahIdx++;
                      lineText=pageLines[ayahIdx]||"";
                    }
                    const isCenter=layoutEntry.center===1;
                    if(type==="surah_name"){
                      const sn=layoutEntry.sn;
                      return (
                        <div key={i} style={{textAlign:"center",padding:"8px 0"}}>
                          <div style={{position:"relative",width:"100%",height:70,backgroundImage:"url('/surah_ornament.png')",backgroundSize:"100% 100%",backgroundRepeat:"no-repeat",backgroundPosition:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <span style={{fontFamily:"'surah-names',serif",fontSize:"clamp(28px,7.5vw,44px)",color:dark?"rgba(232,200,120,0.85)":"rgba(0,0,0,0.70)",lineHeight:1,display:"inline-flex",alignItems:"center",gap:"0.04em",direction:"rtl"}}>
                              <span>surah</span>
                              <span>{String(sn).padStart(3,"0")}</span>
                            </span>
                          </div>
                        </div>
                      );
                    }
                    if(type==="basmallah"){
                      return (
                        <div key={i} style={{textAlign:"center",padding:"4px 0"}}>
                          {bismillahGlyphs&&loadedFonts.has(1)?(
                            <div style={{fontFamily:"'p1',serif",fontSize:"clamp(20px,5.8vw,32px)",color:dark?"rgba(232,200,120,0.85)":"rgba(0,0,0,0.70)",direction:"rtl",lineHeight:2}}>{bismillahGlyphs}</div>
                          ):(
                            <div style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:20,color:dark?"rgba(232,200,120,0.65)":"rgba(0,0,0,0.50)",direction:"rtl",lineHeight:2}}>بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِيمِ</div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div key={i} style={{direction:"rtl",display:"flex",justifyContent:isCenter?"center":"space-between",alignItems:"center",maxWidth:"min(560px,94vw)",marginInline:"auto",fontFamily:`'p${pageNum}',serif`,fontSize:"clamp(22px,5.5vw,32px)",color:dark?"#E8DFC0":"#2D2A26",padding:"1px 0",whiteSpace:"nowrap",gap:isCenter?"0.25em":0}}>
                        {lineText.split(" ").map((w,wi)=>(<span key={wi}>{w}</span>))}
                      </div>
                    );
                  });
                })()}
              </div>
              {/* Page chrome bottom — hizb | page on the right */}
              <div style={{textAlign:"right",padding:"6px 14px 2px",flexShrink:0,marginTop:"auto",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:dark?"rgba(217,177,95,0.55)":"#6B645A",letterSpacing:".06em"}}>
                {asrHizbLabel?`${asrHizbLabel} | `:""}{currentPage.page}
              </div>
              {/* Nav buttons + session page counter centered between them */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px 16px",flexShrink:0,gap:8}}>
                <div className={safePage<totalPages-1?"sbtn":""} onClick={()=>{if(safePage<totalPages-1){setAsrSlideDir("left");setAsrPage(p=>p+1);}}} style={{padding:"8px 18px",borderRadius:10,fontSize:13,fontWeight:600,color:safePage<totalPages-1?(dark?"#E8C76A":"#6B4F00"):(dark?"rgba(243,231,200,0.15)":"rgba(0,0,0,0.15)"),background:safePage<totalPages-1?(dark?"rgba(217,177,95,0.08)":"rgba(180,140,40,0.06)"):"transparent",border:`1px solid ${safePage<totalPages-1?(dark?"rgba(217,177,95,0.20)":"rgba(140,100,20,0.15)"):"transparent"}`}}>‹ Next</div>
                <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.50)":"#8B7355",fontFamily:"'IBM Plex Mono',monospace"}}>{safePage+1} of {totalPages}</div>
                <div className={safePage>0?"sbtn":""} onClick={()=>{if(safePage>0){setAsrSlideDir("right");setAsrPage(p=>p-1);}}} style={{padding:"8px 18px",borderRadius:10,fontSize:13,fontWeight:600,color:safePage>0?(dark?"#E8C76A":"#6B4F00"):(dark?"rgba(243,231,200,0.15)":"rgba(0,0,0,0.15)"),background:safePage>0?(dark?"rgba(217,177,95,0.08)":"rgba(180,140,40,0.06)"):"transparent",border:`1px solid ${safePage>0?(dark?"rgba(217,177,95,0.20)":"rgba(140,100,20,0.15)"):"transparent"}`}}>Prev ›</div>
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
