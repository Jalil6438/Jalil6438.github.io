import { SURAH_EN } from "../data/constants";
import { SURAH_AR, JUZ_META } from "../data/quran-metadata";
import { useState, useEffect } from "react";
import { mushafImageUrl, toArabicDigits } from "../utils";

export default function QuranTab(props) {
  const {
    haramainMeta,
    // theme
    dark,
    // constants/helpers passed from parent (defined inside main component)
    SURAH_PAGES,
    TAFSIR_SOURCES,
    parseTafsirBlocks,
    getEveryayahFolder,
    // state
    mushafSurahNum,
    mushafJuzNum,
    quranMode, setQuranMode,
    mushafPage, setMushafPage,
    mushafSwipeAnim, setMushafSwipeAnim,
    mushafAudioPlaying,
    mushafLoading,
    mushafVerses,
    selectedAyah, setSelectedAyah,
    drawerView, setDrawerView,
    translations, fetchTranslations,
    mushafBookmarks, setMushafBookmarks,
    playingKey, setPlayingKey,
    quranReciter,
    fontSize,
    tafsirData, tafsirTab, setTafsirTab, setTafsirAyah, fetchTafsir,
    reflections, setReflections,
    croppedPages,
    // setters for modals
    setShowQuranJuzModal,
    setShowQuranSurahModal,
    setShowMushafSheet,
    setShowMushafRangePicker,
    setShowReciterModal,
    setReciterMode,
    setShowReflect,
    setMushafRangeStart,
    setMushafRangeEnd,
    // refs
    quranTouchRef,
    audioRef,
    // audio functions
    stopMushafAudio,
    playMushafRange,
    mushafLayout,
    qpcPages,
  } = props;

  // Dynamically load the KFGQPC V2 per-page font (one font per mushaf page).
  // Paired with code_v2 PUA glyphs so each mushaf page renders at authentic
  // layout. Source: jsdelivr mirror of quran.com's font bundle.
  const loadQcfFont = (pageN) => {
    if (!pageN || pageN < 1 || pageN > 604) return;
    if (document.getElementById(`qcf-font-${pageN}`)) return;
    const style = document.createElement("style");
    style.id = `qcf-font-${pageN}`;
    // Prefer woff2 (smaller, faster) with woff fallback for older browsers.
    style.textContent = `@font-face{font-family:'p${pageN}';src:url('https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v2/woff2/p${pageN}.woff2') format('woff2'),url('https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v2/woff/p${pageN}.woff') format('woff');font-display:swap;}`;
    document.head.appendChild(style);
  };
  useEffect(() => {
    // Load current page's font + preload adjacent pages so swipes feel instant.
    loadQcfFont(mushafPage);
    loadQcfFont(mushafPage + 1);
    loadQcfFont(mushafPage - 1);
  }, [mushafPage]);

  // Track the rub_el_hizb_number of the LAST verse on the previous page so we
  // can detect when a new rub starts at the very first verse of the current
  // page (otherwise our transition-within-page check misses boundary pages).
  const [prevPageLastRub, setPrevPageLastRub] = useState({});
  useEffect(() => {
    if (mushafPage <= 1 || prevPageLastRub[mushafPage] !== undefined) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`https://api.quran.com/api/v4/verses/by_page/${mushafPage - 1}?fields=rub_el_hizb_number&per_page=50`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const last = data.verses?.[data.verses.length - 1]?.rub_el_hizb_number;
        if (!cancelled) setPrevPageLastRub(p => ({ ...p, [mushafPage]: last ?? null }));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [mushafPage]);

  const curSurahNum = mushafSurahNum;
  const curSurahPage = SURAH_PAGES[curSurahNum] || 1;
  const [showPickers, setShowPickers] = useState(false);
  const parchment = dark ? "linear-gradient(180deg,#0B1220,#0E1628)" : "#F3E9D2";
  const goldColor = "#E8D5A3";
  const inkColor = "#E8D5A3";

  return (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:parchment,paddingBottom:100}}>

          {/* Header — collapsible. Dropdown sits ABOVE the surah trigger so it opens from the top. */}
          <div style={{flexShrink:0,background:dark?"#060C18":"#EADFC8",paddingTop:28}}>
            {/* Dropdown — juz, surah, mushaf/study — hidden until tapped */}
            <div style={{maxHeight:showPickers?120:0,overflow:"hidden",transition:"max-height .28s ease",padding:showPickers?"14px 16px 6px":"0 16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div className="sbtn" onClick={()=>{setShowQuranJuzModal(true);setShowPickers(false);}} style={{flex:1,padding:"7px 12px",background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)",border:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(139,106,16,0.20)",borderRadius:10,fontSize:11,fontWeight:700,color:dark?"rgba(217,177,95,0.90)":"#6B645A",display:"flex",alignItems:"center",justifyContent:"center",gap:5,height:32,overflow:"hidden"}}>
                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Juz {JUZ_META.find(m=>m.num===mushafJuzNum)?.roman||mushafJuzNum}</span>
                  <span style={{fontSize:9,opacity:0.5,flexShrink:0}}>▾</span>
                </div>
                <div className="sbtn" onClick={()=>{setShowQuranSurahModal(true);setShowPickers(false);}} style={{flex:1,padding:"7px 12px",background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)",border:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(139,106,16,0.20)",borderRadius:10,fontSize:11,color:dark?"rgba(243,231,191,0.70)":"#4A3A10",display:"flex",alignItems:"center",justifyContent:"center",gap:4,overflow:"hidden",height:32}}>
                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{SURAH_EN[curSurahNum]||"Surah"}</span>
                  <span style={{fontSize:9,opacity:0.5,flexShrink:0}}>▾</span>
                </div>
                <div style={{position:"relative",display:"flex",borderRadius:999,flex:1,background:dark?"rgba(12,20,34,0.80)":"rgba(0,0,0,0.08)",border:dark?"1px solid rgba(212,175,55,0.15)":"1px solid rgba(139,106,16,0.20)",padding:2,height:32}}>
                  <div style={{position:"absolute",top:2,left:quranMode==="mushaf"?2:"calc(50% + 1px)",width:"calc(50% - 3px)",height:28,borderRadius:999,background:"linear-gradient(160deg,#D4AF37 0%,#8B6A10 100%)",boxShadow:"0 0 14px rgba(212,175,55,0.45), 0 0 6px rgba(212,175,55,0.25)",transition:"left .25s ease"}}/>
                  <div className="sbtn" onClick={()=>setQuranMode("mushaf")} style={{position:"relative",zIndex:1,flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,letterSpacing:".06em",color:quranMode==="mushaf"?"#0A0E1A":dark?"rgba(212,175,55,0.35)":"rgba(0,0,0,0.40)",transition:"color .2s ease",fontWeight:700}}>Mushaf</div>
                  <div className="sbtn" onClick={()=>setQuranMode("interactive")} style={{position:"relative",zIndex:1,flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,letterSpacing:".06em",color:quranMode==="interactive"?"#0A0E1A":dark?"rgba(212,175,55,0.35)":"rgba(0,0,0,0.40)",transition:"color .2s ease",fontWeight:700}}>Study</div>
                </div>
              </div>
            </div>
            {/* Slim trigger bar — tap to open dropdown above */}
            <div className="sbtn" onClick={()=>setShowPickers(v=>!v)} style={{display:"flex",alignItems:"center",padding:"10px 16px",gap:8}}>
              <div style={{flex:1,minWidth:0,fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,color:dark?"#E8C878":"#6B4F00",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"left"}}>{SURAH_EN[curSurahNum]||""}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:dark?"#E8C878":"#6B4F00"}}>Part {mushafJuzNum}</div>
                <div style={{fontSize:12,color:dark?"rgba(217,177,95,0.60)":"#8B6A10",transform:showPickers?"rotate(180deg)":"rotate(0deg)",transition:"transform .22s ease"}}>▾</div>
              </div>
            </div>
            <div style={{height:1,background:dark?"linear-gradient(to right,transparent,rgba(217,177,95,0.35),transparent)":"linear-gradient(to right,transparent,rgba(139,106,16,0.20),transparent)"}}/>
          </div>

          {/* Viewer */}
          {quranMode==="mushaf"?(
            <div style={{flex:1,overflow:"hidden",backgroundColor:dark?"#0b1a2b":"#F3E9D2",display:"flex",justifyContent:"center",alignItems:"center",position:"relative"}}
              onTouchStart={e=>{ quranTouchRef.current=e.touches[0].clientX; }}
              onTouchEnd={e=>{
                const dx=e.changedTouches[0].clientX-quranTouchRef.current;
                if(Math.abs(dx)<40) return;
                if(dx<0){ setMushafSwipeAnim("left"); setMushafPage(p=>Math.max(1,p-1)); }
                else { setMushafSwipeAnim("right"); setMushafPage(p=>Math.min(604,p+1)); }
              }}
            >
              <img
                key={mushafPage}
                src={croppedPages[mushafPage] || mushafImageUrl(mushafPage)}
                alt={`Mushaf page ${mushafPage}`}
                draggable={false}
                onClick={()=>setShowMushafSheet(true)}
                className={mushafSwipeAnim==="left"?"asr-slide-left":mushafSwipeAnim==="right"?"asr-slide-right":""}
                style={{width:"100%",height:"100%",objectFit:"contain",display:"block",userSelect:"none",cursor:"pointer"}}
              />
              {/* Surah name — top left */}
              <div style={{position:"absolute",top:10,left:10,padding:"5px 12px",borderRadius:8,background:dark?"rgba(8,16,34,0.75)":"rgba(255,253,245,0.90)",border:`1px solid ${dark?"rgba(217,177,95,0.35)":"rgba(140,100,20,0.25)"}`,boxShadow:dark?"0 2px 8px rgba(0,0,0,0.30)":"0 2px 6px rgba(0,0,0,0.08)",backdropFilter:"blur(4px)",pointerEvents:"none"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:12,fontWeight:700,color:dark?"#E8C878":"#6B4F00",letterSpacing:".02em",lineHeight:1}}>{SURAH_EN[curSurahNum]||""}</div>
              </div>
              {/* Part (juz) — top right */}
              <div style={{position:"absolute",top:10,right:10,padding:"5px 12px",borderRadius:8,background:dark?"rgba(8,16,34,0.75)":"rgba(255,253,245,0.90)",border:`1px solid ${dark?"rgba(217,177,95,0.35)":"rgba(140,100,20,0.25)"}`,boxShadow:dark?"0 2px 8px rgba(0,0,0,0.30)":"0 2px 6px rgba(0,0,0,0.08)",backdropFilter:"blur(4px)",pointerEvents:"none"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:12,fontWeight:700,color:dark?"#E8C878":"#6B4F00",letterSpacing:".02em",lineHeight:1}}>Part {mushafJuzNum}</div>
              </div>
              {/* Playing indicator — subtle, non-intrusive */}
              {mushafAudioPlaying&&(
                <div style={{position:"absolute",bottom:10,left:0,right:0,display:"flex",justifyContent:"center",pointerEvents:"none"}}>
                  <div className="sbtn" onClick={(e)=>{e.stopPropagation();stopMushafAudio();}} style={{pointerEvents:"auto",padding:"6px 16px",borderRadius:20,background:"rgba(8,16,34,0.90)",border:"1px solid rgba(217,177,95,0.40)",color:"#E8D5A3",fontSize:12,display:"flex",alignItems:"center",gap:8}}>
                    <span style={{color:"#E6B84A"}}>▶</span> Playing · tap to stop
                  </div>
                </div>
              )}
            </div>
          ):(
            <div
              onTouchStart={(e)=>{ quranTouchRef.current=e.touches[0].clientX; }}
              onTouchEnd={(e)=>{
                const dx=e.changedTouches[0].clientX-quranTouchRef.current;
                if(dx < -40){ setMushafSwipeAnim("left"); setMushafPage(p=>Math.max(1,p-1)); }
                if(dx > 40){ setMushafSwipeAnim("right"); setMushafPage(p=>Math.min(604,p+1)); }
              }}
              style={{position:"relative",flex:1,overflowY:"auto",background:dark?"#060C18":"#F3E9D2",padding:`10px 12px ${haramainMeta?"120px":"60px"}`,display:"flex",flexDirection:"column",justifyContent:"center"}}
            >
              {/* ── CONTINUOUS READING SURFACE ── */}
              {mushafLoading?(
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:"rgba(232,213,163,0.25)",fontSize:11,letterSpacing:".12em"}}>Loading...</div>
              ):(
                <div style={{padding:"0 4px"}}>
                  {(()=>{
                    const playAyahAudio = (vk) => {
                      if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; setPlayingKey(null); }
                      const [s,a]=vk.split(":");
                      const folder=getEveryayahFolder(quranReciter);
                      const url=`https://everyayah.com/data/${folder}/${String(s).padStart(3,"0")}${String(a).padStart(3,"0")}.mp3`;
                      const au=new Audio(url);
                      audioRef.current=au;
                      setPlayingKey(vk);
                      au.play();
                      au.onended=()=>setPlayingKey(null);
                    };
                    // Group verses by surah for proper header centering
                    const surahGroups=[];
                    let cg=null;
                    (mushafVerses||[]).forEach(verse=>{
                      const sn=parseInt(verse.verse_key.split(":")[0],10);
                      if(!cg||cg.sn!==sn){cg={sn,verses:[]};surahGroups.push(cg);}
                      cg.verses.push(verse);
                    });
                    return (<div style={{padding:"24px 12px 0",position:"relative"}}>
                    {surahGroups.map((group,gi)=>{
                      const isFirst=group.verses[0]&&group.verses[0].verse_key.split(":")[1]==="1";
                      return (
                        <div key={group.sn+"-"+gi}>
                          {/* Surah header — centered, outside RTL flow */}
                          {(gi>0||isFirst)&&(
                            <div style={{textAlign:"center",padding:gi===0?"0 0 40px":"16px 0 12px"}}>
                              <div style={{position:"relative",width:"100%",height:90,backgroundImage:"url('/surah_ornament.png')",backgroundSize:"contain",backgroundRepeat:"no-repeat",backgroundPosition:"center",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:gi===0?40:0}}>
                                <span style={{fontFamily:"'Amiri',serif",fontSize:18,color:dark?"#E8C878":"#6B4F00",fontWeight:700,transform:"translateY(0%)"}}>{SURAH_AR[group.sn]?`سُورَةُ ${SURAH_AR[group.sn]}`:""}</span>
                              </div>
                              {isFirst&&group.sn!==9&&group.sn!==1&&(
                                <div style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:20,color:dark?"rgba(232,200,120,0.65)":"rgba(0,0,0,0.50)",direction:"rtl",lineHeight:2,marginBottom:28}}>
                                  بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِيمِ
                                </div>
                              )}
                            </div>
                          )}
                          {/* Authentic KFGQPC V2 render — words use code_v2 PUA
                              glyphs rendered with the page-specific font p{N}.
                              Falls back to text_uthmani with UthmanicHafs when
                              code_v2 isn't available. */}
                          <div style={{direction:"rtl",textAlign:"justify",textAlignLast:"right",lineHeight:1.95,wordBreak:"keep-all",overflowWrap:"normal"}}>
                            {group.verses.map(verse=>{
                              const isSelected=selectedAyah===verse.verse_key;
                              const pageNum=verse.page_number||mushafPage;
                              const hasCodeV2=(verse.words||[]).some(w=>w.code_v2);
                              return (
                                <span key={verse.verse_key} className="sbtn"
                                  onClick={()=>{setSelectedAyah(isSelected?null:verse.verse_key);setShowReflect(false);setDrawerView("default");}}
                                  style={{cursor:"pointer",borderRadius:6,padding:"2px 3px",
                                    background:isSelected?(dark?"rgba(212,175,55,0.18)":"rgba(212,175,55,0.15)"):"transparent",
                                    boxShadow:isSelected?(dark?"0 0 8px rgba(212,175,55,0.20)":"0 0 8px rgba(212,175,55,0.15)"):"none",
                                    transition:"background .15s",
                                  }}>
                                  {hasCodeV2?(
                                    (verse.words||[]).map((w,wi)=>(
                                      <span key={wi} style={{fontFamily:`'p${pageNum}','UthmanicHafs',serif`,fontSize:Math.round(fontSize*1.15),color:isSelected?(dark?"#F5E6B3":"#3A2200"):(dark?"#E8DFC0":"#2D2A26")}}>{w.code_v2||""}{wi<(verse.words||[]).length-1?" ":""}</span>
                                    ))
                                  ):(
                                    <span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:fontSize,color:isSelected?(dark?"#F5E6B3":"#3A2200"):(dark?"#E8DFC0":"#2D2A26")}}>{(verse.text_uthmani||"").replace(/\u06DF/g,"\u0652")}</span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    </div>);
                  })()}
                  {/* Bottom corner marker — page number + Hizb label, paired.
                      Alternates right (odd page) / left (even page) like a real
                      mushaf spread. */}
                  {(()=>{
                    const rubs=[];
                    (mushafVerses||[]).forEach((v,i)=>{
                      const r=v.rub_el_hizb_number;
                      if(typeof r!=="number") return;
                      // First verse: compare to prev page's last rub (if known).
                      // Later verses: compare to the verse right before on the page.
                      const prevRub=i===0?prevPageLastRub[mushafPage]:mushafVerses[i-1]?.rub_el_hizb_number;
                      if(prevRub===undefined||prevRub===r) return;
                      rubs.push(r);
                    });
                    // Page 1 is the start of the mushaf — Hizb 1 starts here.
                    if(mushafPage===1&&rubs.length===0&&mushafVerses?.[0]?.rub_el_hizb_number===1){
                      rubs.push(1);
                    }
                    const r=rubs[0];
                    let hizbLabel=null;
                    if(r!=null){
                      const pos=((r-1)%4)+1;
                      const hizb=Math.ceil(r/4);
                      hizbLabel=pos===1?`Hizb ${hizb}`:pos===2?`1/4 Hizb ${hizb}`:pos===3?`1/2 Hizb ${hizb}`:`3/4 Hizb ${hizb}`;
                    }
                    const isOdd=mushafPage%2===1;
                    const text=isOdd
                      ? (hizbLabel?`${hizbLabel} | Page ${mushafPage}`:`Page ${mushafPage}`)
                      : (hizbLabel?`Page ${mushafPage} | ${hizbLabel}`:`Page ${mushafPage}`);
                    return (
                      <div style={{position:"absolute",bottom:16,[isOdd?"right":"left"]:20,fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:dark?"rgba(217,177,95,0.60)":"#6B645A",letterSpacing:".06em"}}>
                        {text}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── UNIFIED 50% DRAWER ── */}
              {selectedAyah&&(()=>{
                const [sNum,aNum] = selectedAyah.split(":");
                const surahN = parseInt(sNum,10);
                const selVerse = (mushafVerses||[]).find(v=>v.verse_key===selectedAyah);
                const transText = selVerse?._translation || translations[selectedAyah] || "";
                if(!transText && selVerse) fetchTranslations([selVerse]);
                const isPlaying = playingKey === selectedAyah;
                const isSaved = mushafBookmarks.includes(selectedAyah);
                const isBookmarkedPage = mushafBookmarks.includes(mushafPage);
                const playAyahAudio = (vk) => {
                  if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; setPlayingKey(null); }
                  const [s,a]=vk.split(":");
                  const folder=getEveryayahFolder(quranReciter);
                  const url=`https://everyayah.com/data/${folder}/${String(s).padStart(3,"0")}${String(a).padStart(3,"0")}.mp3`;
                  const au=new Audio(url); audioRef.current=au; setPlayingKey(vk);
                  au.play(); au.onended=()=>setPlayingKey(null);
                };
                return (
                  <>
                  <div onClick={()=>{setSelectedAyah(null);setDrawerView("default");}} style={{position:"fixed",inset:0,zIndex:199,background:"transparent"}}/>
                  <div
                    onClick={e=>e.stopPropagation()}
                    style={{
                      position:"fixed",bottom:drawerView==="tafsir"?0:100,left:0,right:0,zIndex:200,
                      height:drawerView==="tafsir"?"100vh":"50vh",
                      transition:"height .25s ease, bottom .25s ease",
                      background:dark?"linear-gradient(180deg,#0C1422 0%,#060E1A 100%)":"linear-gradient(180deg,#E0D5BC 0%,#D8CCB0 100%)",
                      borderTop:dark?"1px solid rgba(212,175,55,0.22)":"1px solid rgba(139,106,16,0.18)",
                      borderRadius:"20px 20px 0 0",
                      boxShadow:dark?"0 -12px 40px rgba(0,0,0,0.70)":"0 -12px 40px rgba(0,0,0,0.12)",
                      animation:"slideUpDrawer .22s ease-out",
                      display:"flex",flexDirection:"column",
                    }}
                  >
                    {/* Drag handle + header row */}
                    <div style={{flexShrink:0,padding:"10px 20px 0"}}>
                      <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
                        <div style={{width:36,height:4,borderRadius:2,background:dark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.20)"}}/>
                      </div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        {drawerView!=="default"?(
                          <div className="sbtn" onClick={()=>setDrawerView("default")}
                            style={{fontSize:11,color:"rgba(212,175,55,0.60)",display:"flex",alignItems:"center",gap:4,fontFamily:"'DM Sans',sans-serif"}}>
                            ← Back
                          </div>
                        ):(
                          <div style={{fontSize:10,color:dark?"rgba(217,177,95,0.50)":"#6B645A",letterSpacing:".14em",fontWeight:700,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>
                            {SURAH_EN[surahN]||""} · {sNum}:{aNum}
                          </div>
                        )}
                        <div className="sbtn" onClick={()=>{setSelectedAyah(null);setDrawerView("default");}}
                          style={{fontSize:18,color:dark?"rgba(243,231,200,0.20)":"rgba(0,0,0,0.30)",lineHeight:1,padding:"0 4px"}}>×</div>
                      </div>
                    </div>

                    {/* ── VIEW: DEFAULT ── */}
                    {drawerView==="default"&&(
                      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",padding:"8px 20px 0"}}>
                        {/* Translation */}
                        <div style={{flex:1,overflowY:"auto",marginBottom:10}}>
                          {transText?(
                            <div style={{fontSize:15,color:dark?"rgba(243,231,200,0.78)":"#2D2A26",lineHeight:1.85,fontFamily:"'DM Sans',sans-serif",textAlign:"center",padding:"12px 8px",display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}>
                              {transText}
                            </div>
                          ):(
                            <div style={{height:12}}/>
                          )}
                        </div>

                        {/* Ayah action buttons */}
                        <div style={{flexShrink:0,display:"flex",justifyContent:"center",gap:12,marginBottom:10}}>
                          {[
                            {icon:isPlaying?"⏹":"▶", label:isPlaying?"Stop":"Play",
                              action:()=>{ if(isPlaying){audioRef.current?.pause();audioRef.current=null;setPlayingKey(null);}else{playAyahAudio(selectedAyah);} }},
                            {icon:"📖", label:"Tafsir",
                              action:()=>{ if(!selectedAyah)return; setTafsirAyah(selectedAyah); fetchTafsir(selectedAyah); setDrawerView("tafsir"); }},
                            {icon:isSaved?"✦":"🔖", label:isSaved?"Saved":"Save",
                              action:()=>{ setDrawerView("save-options"); }},
                            {icon:"✏️", label:"Reflect", action:()=>setDrawerView("reflect")},
                          ].map(btn=>(
                            <div key={btn.label} className="sbtn"
                              onClick={e=>{e.stopPropagation();btn.action();}}
                              style={{
                                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,
                                width:56,height:56,borderRadius:999,fontSize:9,fontWeight:700,
                                letterSpacing:".06em",textTransform:"uppercase",
                                border:dark?"1.5px solid rgba(212,175,55,0.30)":"1.5px solid rgba(139,106,16,0.25)",
                                color:isSaved&&btn.label==="Saved"?(dark?"#E8C878":"#6B645A"):(dark?"rgba(243,231,200,0.75)":"#5A4A20"),
                                background:isSaved&&btn.label==="Saved"?(dark?"radial-gradient(circle at 50% 40%,rgba(212,175,55,0.12),rgba(12,20,34,0.95))":"radial-gradient(circle at 50% 40%,rgba(139,106,16,0.10),rgba(240,230,210,0.95))"):(dark?"radial-gradient(circle at 50% 40%,rgba(212,175,55,0.06),rgba(12,20,34,0.95))":"radial-gradient(circle at 50% 40%,rgba(139,106,16,0.04),rgba(240,230,210,0.95))"),
                                boxShadow:dark?"0 0 12px rgba(212,175,55,0.18), 0 4px 14px rgba(0,0,0,0.40)":"0 0 8px rgba(139,106,16,0.10), 0 2px 8px rgba(0,0,0,0.08)",
                                fontFamily:"'DM Sans',sans-serif",
                                transition:"all .15s ease",
                              }}
                            >
                              <span style={{fontSize:16}}>{btn.icon}</span>
                              <span style={{fontSize:7}}>{btn.label}</span>
                            </div>
                          ))}
                        </div>

                        {/* Page action row */}
                        <div style={{flexShrink:0,display:"flex",gap:6,paddingBottom:12,borderTop:dark?"1px solid rgba(212,175,55,0.08)":"1px solid rgba(0,0,0,0.08)",paddingTop:8}}>
                          {[
                            {icon:mushafAudioPlaying?"⏹":"▶", label:mushafAudioPlaying?"Stop":"Page",
                              action:()=>{ if(mushafAudioPlaying){stopMushafAudio();}else{setMushafRangeStart(null);setMushafRangeEnd(null);playMushafRange(mushafVerses);} }},
                            {icon:"⏭", label:"Range", action:()=>{ stopMushafAudio();setMushafRangeStart(null);setMushafRangeEnd(null);setShowMushafRangePicker(true); }},
                            {icon:"🎙️", label:"Reciter", action:()=>{ setReciterMode("quran");setShowReciterModal(true); }},
                            {icon:"🔖", label:"Bookmarks",
                              action:()=>{ setDrawerView("bookmarks"); }},
                          ].map(btn=>(
                            <div key={btn.label} className="sbtn" onClick={e=>{e.stopPropagation();btn.action();}}
                              style={{
                                flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,
                                padding:"8px 4px",borderRadius:10,fontSize:8,fontWeight:700,
                                letterSpacing:".06em",textTransform:"uppercase",
                                color:dark?"rgba(212,175,55,0.45)":"rgba(0,0,0,0.70)",
                                fontFamily:"'DM Sans',sans-serif",
                              }}
                            >
                              <span style={{fontSize:14}}>{btn.icon}</span>
                              <span>{btn.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── VIEW: TAFSIR (full screen with pinned ayah) ── */}
                    {drawerView==="tafsir"&&(
                      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",padding:"8px 0 0"}}>
                        {/* Pinned ayah */}
                        <div style={{flexShrink:0,padding:"12px 20px 10px",borderBottom:dark?"1px solid rgba(212,175,55,0.12)":"1px solid rgba(0,0,0,0.08)",background:dark?"rgba(0,0,0,0.15)":"rgba(0,0,0,0.03)"}}>
                          <div style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:fontSize,lineHeight:2,color:dark?"#E8DFC0":"#2D2A26",direction:"rtl",textAlign:"center"}}>
                            {(selVerse?.text_uthmani||"").replace(/\u06DF/g,"\u0652")}
                          </div>
                          {transText&&<div style={{fontSize:12,color:dark?"rgba(243,231,200,0.78)":"#6B645A",textAlign:"center",marginTop:4,lineHeight:1.6,fontFamily:"'DM Sans',sans-serif"}}>{transText}</div>}
                        </div>
                        {/* Tab selector */}
                        <div style={{display:"flex",borderBottom:dark?"1px solid rgba(212,175,55,0.10)":"1px solid rgba(0,0,0,0.06)",padding:"0 20px",flexShrink:0,gap:4}}>
                          {TAFSIR_SOURCES.map(src=>(
                            <div key={src.id} className="sbtn" onClick={()=>{setTafsirTab(src.id);if(!tafsirData[`${src.id}-${selectedAyah}`])fetchTafsir(selectedAyah);}}
                              style={{flex:1,textAlign:"center",padding:"10px 4px 8px",fontSize:11,fontWeight:tafsirTab===src.id?700:500,
                              letterSpacing:".02em",
                              color:tafsirTab===src.id?(dark?"#E8C76A":"#D4AF37"):(dark?"rgba(243,231,200,0.30)":"#9A9488"),
                              borderBottom:`2.5px solid ${tafsirTab===src.id?(dark?"#E8C76A":"#D4AF37"):"transparent"}`,
                              transition:"all .2s ease"}}>
                              {src.name}
                            </div>
                          ))}
                        </div>
                        {/* Tafsir content — parsed into blocks */}
                        <div style={{flex:1,overflowY:"auto",padding:"20px 20px 120px"}}>
                          {(()=>{
                            const rawText = tafsirData[`${tafsirTab}-${selectedAyah}`];
                            if(!rawText) return <div style={{textAlign:"center",padding:40,color:dark?"rgba(243,231,200,0.20)":"#6B645A",fontSize:11}}>Loading...</div>;
                            const isFullArabic = TAFSIR_SOURCES.find(s=>s.id===tafsirTab)?.lang==="ar";
                            if(isFullArabic) {
                              // Full Arabic tafsir — render as one styled block
                              return <div style={{fontFamily:"'Amiri',serif",fontSize:16,lineHeight:2.2,color:dark?"rgba(243,231,200,0.85)":"#2D2A26",direction:"rtl",textAlign:"right"}}>{rawText}</div>;
                            }
                            const blocks = parseTafsirBlocks(rawText);
                            return blocks.map((block,i) => (
                              block.type==="arabic" ? (
                                <div key={i} style={{
                                  fontFamily:"'Amiri Quran','Amiri',serif",fontSize:20,lineHeight:2.2,
                                  color:dark?"#E8C76A":"#2D2A26",
                                  direction:"rtl",textAlign:"center",
                                  padding:"20px 16px",margin:"16px 0",
                                  background:dark?"rgba(212,175,55,0.04)":"rgba(212,175,55,0.06)",
                                  borderRadius:12,
                                  border:dark?"1px solid rgba(212,175,55,0.10)":"1px solid rgba(0,0,0,0.06)",
                                }}>{block.text}</div>
                              ) : (
                                <div key={i} style={{
                                  fontFamily:"'DM Sans',sans-serif",fontSize:14,lineHeight:1.85,
                                  color:dark?"rgba(243,231,200,0.75)":"#2D2A26",
                                  marginBottom:18,
                                  direction:"ltr",textAlign:"left",
                                }}>{block.text}</div>
                              )
                            ));
                          })()}
                        </div>
                      </div>
                    )}

                    {/* ── VIEW: REFLECT ── */}
                    {drawerView==="reflect"&&(
                      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 16px",overflow:"hidden"}}>
                        <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.45)":"rgba(140,100,20,0.55)",letterSpacing:".14em",textTransform:"uppercase",fontWeight:700,marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}>
                          Your Reflection · {SURAH_EN[surahN]||""} {sNum}:{aNum}
                        </div>
                        {selVerse&&<div style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:18,color:dark?"rgba(243,231,200,0.70)":"#2D2A26",direction:"rtl",textAlign:"center",lineHeight:1.8,marginBottom:8,padding:"6px 0",borderBottom:dark?"1px solid rgba(217,177,95,0.10)":"1px solid rgba(0,0,0,0.06)"}}>{(selVerse.text_uthmani||"").replace(/\u06DF/g,"\u0652")}</div>}
                        <textarea
                          value={reflections[selectedAyah]||""}
                          onChange={e=>{
                            const updated={...reflections,[selectedAyah]:e.target.value};
                            setReflections(updated);
                            try{localStorage.setItem("rihlat-reflections",JSON.stringify(updated));}catch{}
                          }}
                          placeholder="Write your thoughts on this ayah..."
                          style={{
                            flex:1,width:"100%",background:"rgba(255,255,255,0.03)",
                            border:"1px solid rgba(212,175,55,0.15)",borderRadius:12,
                            padding:"12px",outline:"none",
                            color:"rgba(243,231,200,0.80)",fontSize:13,lineHeight:1.75,
                            fontFamily:"'DM Sans',sans-serif",resize:"none",
                          }}
                        />
                        {reflections[selectedAyah]&&(
                          <div style={{fontSize:9,color:"rgba(217,177,95,0.35)",textAlign:"right",fontFamily:"'DM Sans',sans-serif",marginTop:4}}>Saved ✓</div>
                        )}
                      </div>
                    )}

                    {/* ── SAVE OPTIONS ── */}
                    {drawerView==="save-options"&&(()=>{
                      const isAyahSaved=mushafBookmarks.includes(selectedAyah);
                      const isPageSaved=mushafBookmarks.includes(mushafPage);
                      return (
                        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px",gap:10}}>
                          <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.45)":"rgba(140,100,20,0.55)",letterSpacing:".14em",textTransform:"uppercase",fontWeight:700,marginBottom:6}}>Save Options</div>
                          <div className="sbtn" onClick={()=>{const bm=[...mushafBookmarks];const idx=bm.indexOf(selectedAyah);if(idx>=0)bm.splice(idx,1);else bm.push(selectedAyah);setMushafBookmarks(bm);try{localStorage.setItem("rihlat-mushaf-bookmarks",JSON.stringify(bm));}catch{} setDrawerView("default");}}
                            style={{width:"100%",padding:"14px",borderRadius:12,textAlign:"center",background:isAyahSaved?(dark?"rgba(74,222,128,0.08)":"rgba(46,204,113,0.06)"):(dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)"),border:`1px solid ${isAyahSaved?(dark?"rgba(74,222,128,0.25)":"rgba(46,204,113,0.20)"):(dark?"rgba(217,177,95,0.15)":"rgba(0,0,0,0.08)")}`,color:isAyahSaved?(dark?"#4ADE80":"#2ECC71"):(dark?"rgba(243,231,200,0.70)":"#2D2A26"),fontSize:13,fontWeight:600}}>
                            {isAyahSaved?"✦ Ayah Saved — Tap to Remove":`🔖 Save Ayah · ${selectedAyah}`}
                          </div>
                          <div className="sbtn" onClick={()=>{const updated=isPageSaved?mushafBookmarks.filter(p=>p!==mushafPage):[...mushafBookmarks,mushafPage];setMushafBookmarks(updated);try{localStorage.setItem("rihlat-mushaf-bookmarks",JSON.stringify(updated));}catch{} setDrawerView("default");}}
                            style={{width:"100%",padding:"14px",borderRadius:12,textAlign:"center",background:isPageSaved?(dark?"rgba(74,222,128,0.08)":"rgba(46,204,113,0.06)"):(dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)"),border:`1px solid ${isPageSaved?(dark?"rgba(74,222,128,0.25)":"rgba(46,204,113,0.20)"):(dark?"rgba(217,177,95,0.15)":"rgba(0,0,0,0.08)")}`,color:isPageSaved?(dark?"#4ADE80":"#2ECC71"):(dark?"rgba(243,231,200,0.70)":"#2D2A26"),fontSize:13,fontWeight:600}}>
                            {isPageSaved?`✦ Page ${mushafPage} Saved — Tap to Remove`:`📌 Save Page ${mushafPage}`}
                          </div>
                          <div className="sbtn" onClick={()=>setDrawerView("default")} style={{fontSize:11,color:dark?"rgba(243,231,200,0.30)":"#9A8A6A",marginTop:4}}>Cancel</div>
                        </div>
                      );
                    })()}

                    {/* ── BOOKMARKS VIEW ── */}
                    {drawerView==="bookmarks"&&(
                      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 16px",overflow:"hidden"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                          <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.45)":"rgba(140,100,20,0.55)",letterSpacing:".14em",textTransform:"uppercase",fontWeight:700}}>Bookmarks & Saved</div>
                          <div className="sbtn" onClick={()=>setDrawerView("default")} style={{fontSize:12,color:dark?"rgba(243,231,200,0.30)":"#9A8A6A"}}>×</div>
                        </div>
                        <div style={{flex:1,overflowY:"auto"}}>
                          {/* Saved Ayahs */}
                          {mushafBookmarks.filter(b=>typeof b==="string").length>0&&(
                            <div style={{marginBottom:12}}>
                              <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.35)":"#6B645A",fontWeight:600,marginBottom:6}}>Saved Ayahs</div>
                              {mushafBookmarks.filter(b=>typeof b==="string").map(vk=>{
                                const [s]=vk.split(":");
                                return (
                                  <div key={vk} className="sbtn" onClick={()=>{const pg=SURAH_PAGES[Number(s)]||1;setMushafPage(pg);setSelectedAyah(null);setDrawerView("default");}}
                                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",borderRadius:8,marginBottom:4,background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:dark?"1px solid rgba(255,255,255,0.05)":"1px solid rgba(0,0,0,0.06)"}}>
                                    <span style={{fontSize:12,color:dark?"rgba(243,231,200,0.70)":"#2D2A26"}}>{SURAH_EN[Number(s)]} · {vk}</span>
                                    <span style={{fontSize:10,color:dark?"rgba(243,231,200,0.25)":"#9A8A6A"}}>→</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {/* Bookmarked Pages */}
                          {mushafBookmarks.filter(b=>typeof b==="number").length>0&&(
                            <div style={{marginBottom:12}}>
                              <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.35)":"#6B645A",fontWeight:600,marginBottom:6}}>Bookmarked Pages</div>
                              {mushafBookmarks.filter(b=>typeof b==="number").sort((a,b)=>a-b).map(pg=>(
                                <div key={pg} className="sbtn" onClick={()=>{setMushafPage(pg);setDrawerView("default");setSelectedAyah(null);}}
                                  style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",borderRadius:8,marginBottom:4,background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:dark?"1px solid rgba(255,255,255,0.05)":"1px solid rgba(0,0,0,0.06)"}}>
                                  <span style={{fontSize:12,color:dark?"rgba(243,231,200,0.70)":"#2D2A26"}}>Page {pg}</span>
                                  <span style={{fontSize:10,color:dark?"rgba(243,231,200,0.25)":"#9A8A6A"}}>→</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Reflections */}
                          {Object.keys(reflections||{}).filter(k=>reflections[k]).length>0&&(
                            <div>
                              <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.35)":"#6B645A",fontWeight:600,marginBottom:6}}>Reflections</div>
                              {Object.entries(reflections||{}).filter(([,v])=>v).map(([vk,note])=>{
                                const [s]=vk.split(":");
                                return (
                                  <div key={vk} className="sbtn" onClick={()=>{const pg=SURAH_PAGES[Number(s)]||1;setMushafPage(pg);setSelectedAyah(vk);setDrawerView("reflect");}}
                                    style={{padding:"8px 10px",borderRadius:8,marginBottom:4,background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:dark?"1px solid rgba(255,255,255,0.05)":"1px solid rgba(0,0,0,0.06)"}}>
                                    <div style={{fontSize:12,color:dark?"rgba(243,231,200,0.70)":"#2D2A26",marginBottom:2}}>{SURAH_EN[Number(s)]} · {vk}</div>
                                    <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.40)":"#6B645A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{note}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {mushafBookmarks.length===0&&Object.keys(reflections||{}).filter(k=>reflections[k]).length===0&&(
                            <div style={{textAlign:"center",padding:"20px 0",fontSize:12,color:dark?"rgba(243,231,200,0.30)":"#9A8A6A"}}>No saved items yet</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Page nav */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px",borderTop:dark?"1px solid rgba(217,177,95,0.12)":"1px solid rgba(139,106,16,0.15)",flexShrink:0,background:dark?"#060C18":"#EADFC8"}}>
            <div className="sbtn" onClick={()=>{setMushafSwipeAnim("left");setMushafPage(p=>Math.min(604,p+1));}} style={{padding:"10px 22px",fontSize:22,color:mushafPage<604?(dark?"rgba(217,177,95,0.60)":"#6B645A"):(dark?"rgba(217,177,95,0.15)":"rgba(0,0,0,0.20)"),borderRadius:10,border:dark?"1px solid rgba(217,177,95,0.15)":"1px solid rgba(139,106,16,0.18)",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.05)"}}>‹</div>
            <div style={{flex:1}}/>
            <div className="sbtn" onClick={()=>{setMushafSwipeAnim("right");setMushafPage(p=>Math.max(1,p-1));}} style={{padding:"10px 22px",fontSize:22,color:mushafPage>1?(dark?"rgba(217,177,95,0.60)":"#6B645A"):(dark?"rgba(217,177,95,0.15)":"rgba(0,0,0,0.20)"),borderRadius:10,border:dark?"1px solid rgba(217,177,95,0.15)":"1px solid rgba(139,106,16,0.18)",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.05)"}}>›</div>
          </div>


        </div>
  );
}
