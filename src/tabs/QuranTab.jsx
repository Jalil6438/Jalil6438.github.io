import { SURAH_EN } from "../data/constants";
import { SURAH_AR } from "../data/quran-metadata";
import { useState, useEffect } from "react";
import { mushafImageUrl, toArabicDigits } from "../utils";

export default function QuranTab(props) {
  const {
    haramainMeta,
    // theme
    dark,
    setActiveTab,
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
  // Track which pages' QCF V2 fonts are loaded & ready. Used to switch each
  // page's render from the fallback (text_uthmani + UthmanicHafs) to the
  // authentic (code_v2 + p{N}) once the per-page font has downloaded.
  const [loadedFonts, setLoadedFonts] = useState(() => new Set());
  const loadQcfFont = (pageN) => {
    if (!pageN || pageN < 1 || pageN > 604) return;
    const elId = `qcf-font-v2-${pageN}`;
    if (!document.getElementById(elId)) {
      // Clean up any stale version from a previous load (e.g. v4 leftovers
      // under the legacy ID `qcf-font-${pageN}`).
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
  useEffect(() => {
    // Preload current + neighbors in a wider window so casual page flips
    // (swipes, 'next/prev' taps) don't wait for network.
    for (let i = -4; i <= 4; i++) loadQcfFont(mushafPage + i);
  }, [mushafPage]);

  // Load the authoritative mushaf page layout — pre-computed line strings
  // and alignment per page from public/mushaf-pages.json +
  // public/mushaf-layout.json. Using these instead of the API's
  // line_number guarantees each line matches the real KFGQPC mushaf.
  const [mushafPagesData, setMushafPagesData] = useState(null);
  const [mushafLayoutData, setMushafLayoutData] = useState(null);
  const [pageContentMap, setPageContentMap] = useState(null); // { [page]: [{sNum, minA, maxA}, ...] }
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, l, v] = await Promise.all([
          fetch("/mushaf-pages.json"),
          fetch("/mushaf-layout.json"),
          fetch("/verse-to-page.json"),
        ]);
        if (!cancelled && p.ok) setMushafPagesData(await p.json());
        if (!cancelled && l.ok) setMushafLayoutData(await l.json());
        if (!cancelled && v.ok) {
          const map = await v.json();
          // Invert verse->page into page->[{sNum,minA,maxA}] so bookmark
          // pages can list their surahs + ayah ranges.
          const inv = {};
          Object.entries(map).forEach(([vk, pg]) => {
            const [s, a] = vk.split(":").map(Number);
            if (!inv[pg]) inv[pg] = {};
            if (!inv[pg][s]) inv[pg][s] = { min: a, max: a };
            else {
              if (a < inv[pg][s].min) inv[pg][s].min = a;
              if (a > inv[pg][s].max) inv[pg][s].max = a;
            }
          });
          const out = {};
          Object.entries(inv).forEach(([pg, surahs]) => {
            out[pg] = Object.entries(surahs)
              .map(([s, r]) => ({ sNum: Number(s), minA: r.min, maxA: r.max }))
              .sort((a, b) => a.sNum - b.sNum);
          });
          setPageContentMap(out);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch Fatihah verse 1:1 (the universal bismillah) once. We render
  // every surah-opener bismillah using THESE exact glyphs + the p1 font,
  // so the style is identical to what you see on page 1 of the mushaf.
  const [bismillahGlyphs, setBismillahGlyphs] = useState(null);
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
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:parchment}}>

          {/* Header — sticky so it's always visible regardless of scroll. Only title row toggles. */}
          <div style={{flexShrink:0,background:dark?"#060C18":"#EADFC8",paddingTop:28,position:"sticky",top:0,zIndex:201}}>
            {/* Dropdown — surah, tafsir, reciter, mushaf/study — slides down ABOVE the title */}
            <div style={{maxHeight:showPickers?54:0,overflow:"hidden",transition:"max-height .28s ease",padding:showPickers?"0 12px 6px":"0 12px",position:"relative",zIndex:2}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                {setActiveTab&&(
                  <div className="sbtn" onClick={e=>{e.stopPropagation();setActiveTab("myhifz");}} style={{flexShrink:0,padding:"0 8px",background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)",border:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(139,106,16,0.20)",borderRadius:8,fontSize:10,fontWeight:600,color:dark?"rgba(232,200,120,0.80)":"#6B4F00",display:"flex",alignItems:"center",height:24,whiteSpace:"nowrap"}}>
                    ← Hifz
                  </div>
                )}
                <div className="sbtn" onClick={e=>{e.stopPropagation();setShowQuranSurahModal(true);}} style={{flex:1,padding:"0 6px",background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)",border:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(139,106,16,0.20)",borderRadius:8,fontSize:10,color:dark?"rgba(243,231,191,0.70)":"#4A3A10",display:"flex",alignItems:"center",justifyContent:"center",gap:2,overflow:"hidden",height:24,whiteSpace:"nowrap"}}>
                  <span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{SURAH_EN[curSurahNum]||"Surah"}</span>
                  <span style={{fontSize:8,opacity:0.5,flexShrink:0}}>▾</span>
                </div>
                <div className="sbtn" onClick={e=>{e.stopPropagation();const vk=selectedAyah||mushafVerses?.[0]?.verse_key;if(!vk)return;setSelectedAyah(vk);setTafsirAyah(vk);fetchTafsir(vk);setDrawerView("tafsir");}} style={{flex:1,padding:"0 6px",background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)",border:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(139,106,16,0.20)",borderRadius:8,fontSize:10,color:dark?"rgba(243,231,191,0.70)":"#4A3A10",display:"flex",alignItems:"center",justifyContent:"center",gap:2,overflow:"hidden",height:24,whiteSpace:"nowrap"}}>
                  <span>Tafsir</span>
                  <span style={{fontSize:8,opacity:0.5,flexShrink:0}}>▾</span>
                </div>
                <div className="sbtn" onClick={e=>{e.stopPropagation();setReciterMode("quran");setShowReciterModal(true);}} style={{flex:1,padding:"0 6px",background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)",border:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(139,106,16,0.20)",borderRadius:8,fontSize:10,color:dark?"rgba(243,231,191,0.70)":"#4A3A10",display:"flex",alignItems:"center",justifyContent:"center",gap:2,overflow:"hidden",height:24,whiteSpace:"nowrap"}}>
                  <span>Reciter</span>
                  <span style={{fontSize:8,opacity:0.5,flexShrink:0}}>▾</span>
                </div>
                <div onClick={e=>e.stopPropagation()} style={{position:"relative",display:"flex",borderRadius:999,width:110,flexShrink:0,background:dark?"rgba(12,20,34,0.80)":"rgba(0,0,0,0.08)",border:dark?"1px solid rgba(212,175,55,0.15)":"1px solid rgba(139,106,16,0.20)",padding:2,height:24}}>
                  <div style={{position:"absolute",top:2,left:quranMode==="mushaf"?2:"calc(50% + 1px)",width:"calc(50% - 3px)",height:20,borderRadius:999,background:"linear-gradient(160deg,#D4AF37 0%,#8B6A10 100%)",boxShadow:"0 0 10px rgba(212,175,55,0.40), 0 0 4px rgba(212,175,55,0.20)",transition:"left .25s ease"}}/>
                  <div className="sbtn" onClick={e=>{e.stopPropagation();setQuranMode("mushaf");}} style={{position:"relative",zIndex:1,flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,letterSpacing:".04em",color:quranMode==="mushaf"?"#0A0E1A":dark?"rgba(212,175,55,0.35)":"rgba(0,0,0,0.40)",transition:"color .2s ease",fontWeight:700}}>Mushaf</div>
                  <div className="sbtn" onClick={e=>{e.stopPropagation();setQuranMode("interactive");}} style={{position:"relative",zIndex:1,flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,letterSpacing:".04em",color:quranMode==="interactive"?"#0A0E1A":dark?"rgba(212,175,55,0.35)":"rgba(0,0,0,0.40)",transition:"color .2s ease",fontWeight:700}}>Study</div>
                </div>
              </div>
            </div>
            {/* Title row — tappable to toggle the drawers */}
            <div className="sbtn" onClick={()=>setShowPickers(v=>!v)} style={{display:"flex",alignItems:"center",padding:"10px 16px",gap:8}}>
              <div style={{flex:1,minWidth:0,fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,color:dark?"#E8C878":"#6B4F00",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"left"}}>{SURAH_EN[curSurahNum]||""}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:dark?"#E8C878":"#6B4F00",flexShrink:0}}>Part {mushafJuzNum}</div>
            </div>
            <div style={{height:1,background:dark?"linear-gradient(to right,transparent,rgba(217,177,95,0.35),transparent)":"linear-gradient(to right,transparent,rgba(139,106,16,0.20),transparent)"}}/>
          </div>

          {/* Inline Tafsir — replaces the viewer when active, keeps header pickers visible */}
          {drawerView==="tafsir"&&selectedAyah&&(()=>{
            const selVerse=(mushafVerses||[]).find(v=>v.verse_key===selectedAyah);
            const transText=selVerse?._translation||translations[selectedAyah]||"";
            return (
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:dark?"linear-gradient(180deg,#0C1422 0%,#060E1A 100%)":"linear-gradient(180deg,#E0D5BC 0%,#D8CCB0 100%)"}}>
                <div style={{flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px",borderBottom:dark?"1px solid rgba(212,175,55,0.12)":"1px solid rgba(0,0,0,0.08)"}}>
                  <div className="sbtn" onClick={()=>{setSelectedAyah(null);setDrawerView("default");setShowPickers(false);}} style={{fontSize:11,fontWeight:700,color:dark?"#E6B84A":"#8B6A10",padding:"6px 10px",borderRadius:8,background:dark?"rgba(230,184,74,0.08)":"rgba(180,140,40,0.06)",border:dark?"1px solid rgba(230,184,74,0.25)":"1px solid rgba(160,120,20,0.25)"}}>← Back to Qur'an</div>
                  <div style={{fontSize:10,color:dark?"rgba(217,177,95,0.60)":"#6B645A",letterSpacing:".14em",fontWeight:700,textTransform:"uppercase"}}>{SURAH_EN[parseInt(selectedAyah.split(":")[0],10)]||""} · {selectedAyah}</div>
                </div>
                <div style={{flexShrink:0,padding:"12px 20px 10px",borderBottom:dark?"1px solid rgba(212,175,55,0.12)":"1px solid rgba(0,0,0,0.08)",background:dark?"rgba(0,0,0,0.15)":"rgba(0,0,0,0.03)"}}>
                  <div style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:fontSize,lineHeight:2,color:dark?"#E8DFC0":"#2D2A26",direction:"rtl",textAlign:"center"}}>
                    {(selVerse?.text_uthmani||"").replace(/۟/g,"ْ")}
                  </div>
                  {transText&&<div style={{fontSize:12,color:dark?"rgba(243,231,200,0.78)":"#6B645A",textAlign:"center",marginTop:4,lineHeight:1.6,fontFamily:"'DM Sans',sans-serif"}}>{transText}</div>}
                </div>
                <div style={{display:"flex",borderBottom:dark?"1px solid rgba(212,175,55,0.10)":"1px solid rgba(0,0,0,0.06)",padding:"0 20px",flexShrink:0,gap:4}}>
                  {TAFSIR_SOURCES.map(src=>(
                    <div key={src.id} className="sbtn" onClick={()=>{setTafsirTab(src.id);if(!tafsirData[`${src.id}-${selectedAyah}`])fetchTafsir(selectedAyah);}}
                      style={{flex:1,textAlign:"center",padding:"10px 4px 8px",fontSize:11,fontWeight:tafsirTab===src.id?700:500,letterSpacing:".02em",color:tafsirTab===src.id?(dark?"#E8C76A":"#D4AF37"):(dark?"rgba(243,231,200,0.30)":"#9A9488"),borderBottom:`2.5px solid ${tafsirTab===src.id?(dark?"#E8C76A":"#D4AF37"):"transparent"}`,transition:"all .2s ease"}}>
                      {src.name}
                    </div>
                  ))}
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"20px 20px 120px"}}>
                  {(()=>{
                    const rawText=tafsirData[`${tafsirTab}-${selectedAyah}`];
                    if(!rawText) return <div style={{textAlign:"center",padding:40,color:dark?"rgba(243,231,200,0.20)":"#6B645A",fontSize:11}}>Loading...</div>;
                    const isFullArabic=TAFSIR_SOURCES.find(s=>s.id===tafsirTab)?.lang==="ar";
                    if(isFullArabic) return <div style={{fontFamily:"'Amiri',serif",fontSize:19,lineHeight:2.2,color:dark?"rgba(243,231,200,0.85)":"#2D2A26",direction:"rtl",textAlign:"center"}}>{rawText}</div>;
                    const blocks=parseTafsirBlocks(rawText);
                    return blocks.map((block,i)=>(block.type==="arabic"?(<div key={i} style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:20,lineHeight:2.2,color:dark?"#E8C76A":"#2D2A26",direction:"rtl",textAlign:"center",padding:"20px 16px",margin:"16px 0",background:dark?"rgba(212,175,55,0.04)":"rgba(212,175,55,0.06)",borderRadius:12,border:dark?"1px solid rgba(212,175,55,0.10)":"1px solid rgba(0,0,0,0.06)"}}>{block.text}</div>):(<div key={i} style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,lineHeight:1.85,color:dark?"rgba(243,231,200,0.75)":"#2D2A26",marginBottom:18,direction:"ltr",textAlign:"left"}}>{block.text}</div>)));
                  })()}
                </div>
              </div>
            );
          })()}

          {/* Viewer */}
          {drawerView!=="tafsir"&&(quranMode==="mushaf"?(
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
            </div>
          ):(
            <div
              onTouchStart={(e)=>{ quranTouchRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY}; }}
              onTouchEnd={(e)=>{
                const start=quranTouchRef.current;
                if(!start||typeof start!=="object") return;
                const dx=e.changedTouches[0].clientX-start.x;
                const dy=e.changedTouches[0].clientY-start.y;
                // Only treat as a page swipe if horizontal movement clearly
                // dominates — otherwise this was a vertical scroll.
                if(Math.abs(dx)<40||Math.abs(dx)<Math.abs(dy)) return;
                if(dx<0){ setMushafSwipeAnim("left"); setMushafPage(p=>Math.max(1,p-1)); }
                else { setMushafSwipeAnim("right"); setMushafPage(p=>Math.min(604,p+1)); }
              }}
              style={{position:"relative",flex:1,overflowY:"hidden",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",padding:`4px 0 36px`,display:"flex",flexDirection:"column",justifyContent:"flex-start"}}
            >
              {/* ── CONTINUOUS READING SURFACE ── */}
              {mushafLoading?(
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:"rgba(232,213,163,0.25)",fontSize:11,letterSpacing:".12em"}}>Loading...</div>
              ):(
                <div style={{padding:0,flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
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
                    // Render ONCE per page directly from the authoritative
                    // mushaf layout. Each page gives us its 15 line strings
                    // plus per-line alignment (center vs space-between).
                    return (<div style={{padding:"2px 2px 0",position:"relative",display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
                      {(()=>{
                        const pageFontReady=loadedFonts.has(mushafPage);
                        if(!pageFontReady){
                          return (
                            <div style={{minHeight:400,display:"flex",alignItems:"center",justifyContent:"center",color:dark?"rgba(217,177,95,0.35)":"rgba(107,100,90,0.55)",fontSize:12,letterSpacing:".08em"}}>
                              <span>loading mushaf…</span>
                            </div>
                          );
                        }
                        const pageLines=mushafPagesData&&mushafPagesData[mushafPage];
                        const pageLayout=mushafLayoutData&&mushafLayoutData[mushafPage];
                        if(!pageLines||!pageLayout){
                          return null;
                        }
                        // Build a physical-line → first-verse-key lookup so
                        // tapping a mushaf line selects the ayah that starts
                        // (or spans) that line. Layout entries are 1-indexed
                        // relative to the physical 15-line mushaf page.
                        const lineToVerse={};
                        (mushafVerses||[]).forEach(v=>{
                          const lines=new Set();
                          (v.words||[]).forEach(w=>{ if(typeof w.line_number==="number") lines.add(w.line_number); });
                          lines.forEach(ln=>{ if(!lineToVerse[ln]) lineToVerse[ln]=v.verse_key; });
                        });
                        // pageLines only contains AYAH rows (no surah_name
                        // or basmallah rows). Track an ayah-row cursor to
                        // pair each layout entry with the correct text.
                        let ayahIdx=-1;
                        const entries=pageLayout.map((layoutEntry,i)=>{
                          const type=layoutEntry.type;
                          let lineText="";
                          if(type!=="surah_name"&&type!=="basmallah"){
                            ayahIdx++;
                            lineText=pageLines[ayahIdx]||"";
                          }
                          const isCenter=layoutEntry.center===1;
                          // Surah name line: render our custom ornament
                          // instead of the font's surah_name glyph so it
                          // matches our app's ornament aesthetic.
                          if(type==="surah_name"){
                            const sn=layoutEntry.sn;
                            return (
                              <div key={i} style={{textAlign:"center",padding:"2px 0",flexShrink:0}}>
                                <div style={{position:"relative",width:"100%",height:56,backgroundImage:"url('/surah_ornament.png')",backgroundSize:"contain",backgroundRepeat:"no-repeat",backgroundPosition:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                  <span style={{fontFamily:"'surah-names',serif",fontSize:"clamp(18px,5vw,28px)",color:dark?"rgba(232,200,120,0.85)":"rgba(0,0,0,0.70)",lineHeight:1,display:"inline-flex",alignItems:"center",gap:"0.5em",direction:"rtl",letterSpacing:"0.06em"}}>
                                    <span>surah</span>
                                    <span>{String(sn).padStart(3,"0")}</span>
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          // Basmallah: use p1 font + Fatihah 1:1 glyphs so
                          // every surah opener reads the same universal
                          // bismillah.
                          if(type==="basmallah"){
                            return (
                              <div key={i} style={{textAlign:"center",padding:"1px 0",flexShrink:0}}>
                                {bismillahGlyphs&&loadedFonts.has(1)?(
                                  <div style={{fontFamily:"'p1',serif",fontSize:"clamp(16px,4.8vw,24px)",color:dark?"rgba(232,200,120,0.85)":"rgba(0,0,0,0.70)",direction:"rtl",lineHeight:1.4}}>{bismillahGlyphs}</div>
                                ):(
                                  <div style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:18,color:dark?"rgba(232,200,120,0.65)":"rgba(0,0,0,0.50)",direction:"rtl",lineHeight:1.4}}>بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِيمِ</div>
                                )}
                              </div>
                            );
                          }
                          const lineNum=i+1;
                          const vkForLine=lineToVerse[lineNum];
                          return (
                          <div key={i} className={vkForLine?"sbtn":undefined} onClick={vkForLine?()=>{setSelectedAyah(vkForLine);setDrawerView("default");setShowPickers(true);setTimeout(()=>{try{window.scrollTo({top:0,behavior:"smooth"});document.querySelectorAll('[class*="fi"]').forEach(el=>{if(el.scrollTop>0)el.scrollTo({top:0,behavior:"smooth"});});}catch{}},10);}:undefined} style={{direction:"rtl",display:"flex",justifyContent:isCenter?"center":"space-between",alignItems:"center",width:"100%",padding:"4px 6px",fontFamily:`'p${mushafPage}',serif`,fontSize:"clamp(18px,5vw,28px)",color:dark?"#E8DFC0":"#2D2A26",whiteSpace:"nowrap",gap:isCenter?"0.25em":0,cursor:vkForLine?"pointer":"default",boxSizing:"border-box"}}>
                            {lineText.split(" ").map((w,wi)=>(<span key={wi}>{w}</span>))}
                          </div>
                          );
                        });
                        // Short pages (1-2): split header (surah+basmallah) from ayahs so ayahs can center vertically in the remaining space, while the ornament stays near the top.
                        if(mushafPage<=2){
                          // Only the surah ornament sits up top — basmallah stays with the ayahs so the whole reading block centers together.
                          const headerCount=pageLayout.findIndex(e=>e.type!=="surah_name");
                          const headerNodes=headerCount>0?entries.slice(0,headerCount):[];
                          const bodyNodes=headerCount>0?entries.slice(headerCount):entries;
                          return (<>
                            {headerNodes}
                            <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                              {bodyNodes}
                            </div>
                          </>);
                        }
                        return entries;
                      })()}
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

              {/* ── UNIFIED 50% DRAWER ── (skip for tafsir — renders inline above) */}
              {(selectedAyah||drawerView==="bookmarks")&&drawerView!=="tafsir"&&(()=>{
                const [sNum,aNum] = (selectedAyah||"").split(":");
                const surahN = parseInt(sNum,10);
                const selVerse = (mushafVerses||[]).find(v=>v.verse_key===selectedAyah);
                const transText = selVerse?._translation || translations[selectedAyah] || "";
                if(!transText && selVerse) fetchTranslations([selVerse]);
                const isPlaying = playingKey === selectedAyah;
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
                  <div onClick={()=>{setSelectedAyah(null);setDrawerView("default");setShowPickers(false);}} style={{position:"fixed",inset:0,zIndex:199,background:"transparent"}}/>
                  <div
                    onClick={e=>e.stopPropagation()}
                    style={{
                      position:"fixed",left:0,right:0,zIndex:200,
                      ...(drawerView==="tafsir"
                        ? {top:0,bottom:0,boxShadow:dark?"0 12px 40px rgba(0,0,0,0.70)":"0 12px 40px rgba(0,0,0,0.12)",animation:"slideDownDrawer .22s ease-out"}
                        : {bottom:0,maxHeight:`calc(100vh - ${showPickers?180:130}px)`,height:"auto",borderTop:dark?"1px solid rgba(212,175,55,0.22)":"1px solid rgba(139,106,16,0.18)",borderRadius:"20px 20px 0 0",boxShadow:dark?"0 -12px 40px rgba(0,0,0,0.70)":"0 -12px 40px rgba(0,0,0,0.12)",animation:"slideUpDrawer .22s ease-out"}),
                      transition:"max-height .25s ease, bottom .25s ease, top .25s ease",
                      background:dark?"linear-gradient(180deg,#0C1422 0%,#060E1A 100%)":"linear-gradient(180deg,#E0D5BC 0%,#D8CCB0 100%)",
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
                            style={{fontSize:11,color:dark?"rgba(212,175,55,0.60)":"#6B645A",fontFamily:"'DM Sans',sans-serif"}}>
                            ← Back
                          </div>
                        ):(
                          <div style={{fontSize:10,color:dark?"rgba(217,177,95,0.50)":"#6B645A",letterSpacing:".14em",fontWeight:700,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>
                            {SURAH_EN[surahN]||""} · {sNum}:{aNum}
                          </div>
                        )}
                        <div className="sbtn" onClick={()=>{setSelectedAyah(null);setDrawerView("default");setShowPickers(false);}}
                          style={{fontSize:22,color:dark?"rgba(243,231,200,0.55)":"rgba(0,0,0,0.55)",lineHeight:1,padding:"0 4px",fontWeight:300}}>×</div>
                      </div>
                    </div>

                    {/* ── VIEW: DEFAULT ── */}
                    {drawerView==="default"&&(
                      <div style={{display:"flex",flexDirection:"column",overflow:"hidden",padding:"8px 20px 0",minHeight:0}}>
                        {/* Arabic text — per-page mushaf font when words are
                            available; fall back to UthmanicHafs. */}
                        {selVerse&&(selVerse.words?.some(w=>w.code_v2)?(
                          <div style={{direction:"rtl",textAlign:"center",fontFamily:`'p${mushafPage}',serif`,fontSize:"clamp(20px,5vw,28px)",lineHeight:1.9,color:dark?"#E8DFC0":"#2D2A26",padding:"6px 4px 10px",flexShrink:0}}>
                            {selVerse.words.filter(w=>!w.char_type_name||w.char_type_name==="word"||w.char_type_name==="end").map((w,wi)=>(<span key={wi}>{w.code_v2||""} </span>))}
                          </div>
                        ):selVerse.text_uthmani?(
                          <div style={{direction:"rtl",textAlign:"center",fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:"clamp(20px,5vw,28px)",lineHeight:1.9,color:dark?"#E8DFC0":"#2D2A26",padding:"6px 4px 10px",flexShrink:0}}>
                            {(selVerse.text_uthmani||"").replace(/\u06DF/g,"\u0652")}
                            <span style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:14,color:dark?"rgba(212,175,55,0.45)":"#A08848",marginRight:4}}>﴿{toArabicDigits(parseInt(aNum,10))}﴾</span>
                          </div>
                        ):null)}
                        {/* Translation */}
                        <div style={{overflowY:"auto",marginBottom:10,minHeight:0}}>
                          {transText?(
                            <div style={{fontSize:15,color:dark?"rgba(243,231,200,0.78)":"#2D2A26",lineHeight:1.85,fontFamily:"'DM Sans',sans-serif",textAlign:"center",padding:"12px 8px"}}>
                              {transText}
                            </div>
                          ):(
                            <div style={{height:12}}/>
                          )}
                        </div>

                        {/* Ayah action buttons */}
                        <div style={{flexShrink:0,display:"flex",justifyContent:"space-around",gap:4,marginBottom:14,padding:"0 4px"}}>
                          {[
                            {icon:"🔖", label:"Bookmark", action:()=>setDrawerView("save-options")},
                            {icon:isPlaying?"⏹":"▶", label:isPlaying?"Stop":"Play",
                              action:()=>{ if(isPlaying){audioRef.current?.pause();audioRef.current=null;setPlayingKey(null);}else{playAyahAudio(selectedAyah);} }},
                            {icon:"⏭", label:"Play Range",
                              action:()=>{ stopMushafAudio();setMushafRangeStart(null);setMushafRangeEnd(null);setShowMushafRangePicker(true); }},
                            {icon:"✏️", label:"Reflect", action:()=>setDrawerView("reflect")},
                          ].map(btn=>(
                            <div key={btn.label} className="sbtn"
                              onClick={e=>{e.stopPropagation();btn.action();}}
                              style={{
                                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,
                                flex:1,minHeight:56,padding:"8px 4px",fontWeight:700,
                                letterSpacing:".04em",textTransform:"uppercase",
                                color:dark?"rgba(243,231,200,0.80)":"#5A4A20",
                                fontFamily:"'DM Sans',sans-serif",
                                textAlign:"center",
                              }}
                            >
                              <span style={{fontSize:22}}>{btn.icon}</span>
                              <span style={{fontSize:7,lineHeight:1.1}}>{btn.label}</span>
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
                              return <div style={{fontFamily:"'Amiri',serif",fontSize:19,lineHeight:2.2,color:dark?"rgba(243,231,200,0.85)":"#2D2A26",direction:"rtl",textAlign:"center"}}>{rawText}</div>;
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

                    {/* ── BOOKMARK (save/view) ── */}
                    {drawerView==="save-options"&&(()=>{
                      const isAyahSaved=mushafBookmarks.includes(selectedAyah);
                      const isPageSaved=mushafBookmarks.includes(mushafPage);
                      return (
                        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px",gap:10}}>
                          <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.45)":"rgba(140,100,20,0.55)",letterSpacing:".14em",textTransform:"uppercase",fontWeight:700,marginBottom:6}}>Bookmark</div>
                          <div className="sbtn" onClick={()=>{const updated=isPageSaved?mushafBookmarks.filter(p=>p!==mushafPage):[...mushafBookmarks,mushafPage];setMushafBookmarks(updated);try{localStorage.setItem("rihlat-mushaf-bookmarks",JSON.stringify(updated));}catch{} setDrawerView("default");}}
                            style={{width:"100%",padding:"14px",borderRadius:12,textAlign:"center",background:isPageSaved?(dark?"rgba(74,222,128,0.08)":"rgba(46,204,113,0.06)"):(dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)"),border:`1px solid ${isPageSaved?(dark?"rgba(74,222,128,0.25)":"rgba(46,204,113,0.20)"):(dark?"rgba(217,177,95,0.15)":"rgba(0,0,0,0.08)")}`,color:isPageSaved?(dark?"#4ADE80":"#2ECC71"):(dark?"rgba(243,231,200,0.70)":"#2D2A26"),fontSize:13,fontWeight:600}}>
                            {isPageSaved?`✦ Page ${mushafPage} Saved — Tap to Remove`:`📌 Save Page ${mushafPage}`}
                          </div>
                          <div className="sbtn" onClick={()=>{const bm=[...mushafBookmarks];const idx=bm.indexOf(selectedAyah);if(idx>=0)bm.splice(idx,1);else bm.push(selectedAyah);setMushafBookmarks(bm);try{localStorage.setItem("rihlat-mushaf-bookmarks",JSON.stringify(bm));}catch{} setDrawerView("default");}}
                            style={{width:"100%",padding:"14px",borderRadius:12,textAlign:"center",background:isAyahSaved?(dark?"rgba(74,222,128,0.08)":"rgba(46,204,113,0.06)"):(dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)"),border:`1px solid ${isAyahSaved?(dark?"rgba(74,222,128,0.25)":"rgba(46,204,113,0.20)"):(dark?"rgba(217,177,95,0.15)":"rgba(0,0,0,0.08)")}`,color:isAyahSaved?(dark?"#4ADE80":"#2ECC71"):(dark?"rgba(243,231,200,0.70)":"#2D2A26"),fontSize:13,fontWeight:600}}>
                            {isAyahSaved?"✦ Ayah Saved — Tap to Remove":`🔖 Save Ayah · ${selectedAyah}`}
                          </div>
                          <div className="sbtn" onClick={()=>setDrawerView("bookmarks")}
                            style={{width:"100%",padding:"14px",borderRadius:12,textAlign:"center",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:dark?"1px solid rgba(217,177,95,0.15)":"1px solid rgba(0,0,0,0.08)",color:dark?"rgba(243,231,200,0.70)":"#2D2A26",fontSize:13,fontWeight:600}}>
                            📚 View Saved
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
                                  <div key={vk} className="sbtn" onClick={()=>{const pg=SURAH_PAGES[Number(s)]||1;setMushafPage(pg);setSelectedAyah(null);setDrawerView("default");setShowPickers(false);}}
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
                              {mushafBookmarks.filter(b=>typeof b==="number").sort((a,b)=>a-b).map(pg=>{
                                const content=pageContentMap&&pageContentMap[pg];
                                const label=content&&content.length>0
                                  ? content.map(c=>`${SURAH_EN[c.sNum]||c.sNum} ${c.minA}${c.minA===c.maxA?"":"-"+c.maxA}`).join(" · ")
                                  : null;
                                return (
                                <div key={pg} className="sbtn" onClick={()=>{setMushafPage(pg);setDrawerView("default");setSelectedAyah(null);}}
                                  style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 10px",borderRadius:8,marginBottom:4,background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:dark?"1px solid rgba(255,255,255,0.05)":"1px solid rgba(0,0,0,0.06)"}}>
                                  <div style={{flex:1,minWidth:0,fontSize:12,color:dark?"rgba(243,231,200,0.70)":"#2D2A26",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label||`Page ${pg}`}</div>
                                  <span style={{flexShrink:0,fontSize:11,color:dark?"rgba(243,231,200,0.45)":"#6B645A",fontFamily:"'IBM Plex Mono',monospace"}}>Page {pg}</span>
                                </div>
                                );
                              })}
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
          ))}

          {/* Page nav — ‹ / › prev-next */}
          <div style={{flexShrink:0,background:dark?"#060C18":"#EADFC8",borderTop:dark?"1px solid rgba(217,177,95,0.12)":"1px solid rgba(139,106,16,0.15)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px"}}>
              <div className="sbtn" onClick={()=>{setMushafSwipeAnim("left");setMushafPage(p=>Math.min(604,p+1));}} style={{padding:"10px 22px",fontSize:22,color:mushafPage<604?(dark?"rgba(217,177,95,0.60)":"#6B645A"):(dark?"rgba(217,177,95,0.15)":"rgba(0,0,0,0.20)"),borderRadius:10,border:dark?"1px solid rgba(217,177,95,0.15)":"1px solid rgba(139,106,16,0.18)",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.05)"}}>‹</div>
              <div style={{flex:1}}/>
              <div className="sbtn" onClick={()=>{setMushafSwipeAnim("right");setMushafPage(p=>Math.max(1,p-1));}} style={{padding:"10px 22px",fontSize:22,color:mushafPage>1?(dark?"rgba(217,177,95,0.60)":"#6B645A"):(dark?"rgba(217,177,95,0.15)":"rgba(0,0,0,0.20)"),borderRadius:10,border:dark?"1px solid rgba(217,177,95,0.15)":"1px solid rgba(139,106,16,0.18)",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.05)"}}>›</div>
            </div>
          </div>


        </div>
  );
}
