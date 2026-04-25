import { SURAH_EN } from "../data/constants";
import { SURAH_AR, JUZ_META } from "../data/quran-metadata";
import { useState, useEffect } from "react";
import { mushafImageUrl, toArabicDigits } from "../utils";

export default function QuranTab(props) {
  const {
    haramainMeta,
    // theme
    dark,
    setActiveTab,
    setRihlahTab,
    setDark,
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
    translationSource, setTranslationSource,
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
  const [showQuranSettings, setShowQuranSettings] = useState(false);
  const parchment = dark ? "linear-gradient(180deg,#0B1220,#0E1628)" : "#F3E9D2";
  const goldColor = "#E8D5A3";
  const inkColor = "#E8D5A3";

  return (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:parchment}}>

          {/* Header — sticky so it's always visible regardless of scroll. */}
          <div style={{flexShrink:0,background:dark?"#060C18":"#EADFC8",paddingTop:28,position:"sticky",top:0,zIndex:201}}>
            {/* Title row — hamburger left, surah/juz right */}
            <div style={{display:"flex",alignItems:"center",padding:"6px 12px",gap:10}}>
              <div className="sbtn" onClick={()=>setShowPickers(true)} style={{flexShrink:0,width:32,height:32,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:"4px",borderRadius:8}} aria-label="Open menu">
                <div style={{width:18,height:2,borderRadius:1,background:dark?"rgba(232,200,120,0.85)":"#6B4F00"}}/>
                <div style={{width:18,height:2,borderRadius:1,background:dark?"rgba(232,200,120,0.85)":"#6B4F00"}}/>
                <div style={{width:18,height:2,borderRadius:1,background:dark?"rgba(232,200,120,0.85)":"#6B4F00"}}/>
              </div>
              <div style={{flex:1,minWidth:0,fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,color:dark?"#E8C878":"#6B4F00",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"left"}}>{SURAH_EN[curSurahNum]||""}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:dark?"#E8C878":"#6B4F00",flexShrink:0,whiteSpace:"nowrap"}}>Juz {mushafJuzNum}</div>
            </div>
            <div style={{height:1,background:dark?"linear-gradient(to right,transparent,rgba(217,177,95,0.35),transparent)":"linear-gradient(to right,transparent,rgba(139,106,16,0.20),transparent)"}}/>
          </div>

          {/* ── SIDE MENU ── slides in from the left, partial width */}
          {showPickers&&(
            <>
              <div onClick={()=>setShowPickers(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(2px)",zIndex:300,animation:"fi .18s ease"}}/>
              <div style={{position:"fixed",top:0,bottom:0,left:0,width:"min(280px,78vw)",zIndex:301,background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRight:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(139,106,16,0.18)",boxShadow:"6px 0 28px rgba(0,0,0,0.45)",display:"flex",flexDirection:"column",animation:"sideMenuIn .22s ease-out",paddingTop:"env(safe-area-inset-top,28px)"}} onClick={e=>e.stopPropagation()}>
                {/* Close + label */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px 8px"}}>
                  <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.50)":"rgba(140,100,20,0.55)",letterSpacing:".18em",textTransform:"uppercase",fontWeight:700}}>Menu</div>
                  <div className="sbtn" onClick={()=>setShowPickers(false)} style={{fontSize:20,color:dark?"rgba(243,231,200,0.55)":"rgba(0,0,0,0.55)",lineHeight:1,padding:"0 6px",fontWeight:300}}>×</div>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"4px 12px 16px"}}>
                  {/* QURAN section */}
                  <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.45)":"rgba(140,100,20,0.55)",letterSpacing:".18em",textTransform:"uppercase",fontWeight:700,padding:"6px 8px"}}>Qur'an</div>
                  {(()=>{
                    const Row=({icon,label,onClick,disabled})=>(
                      <div className={disabled?undefined:"sbtn"} onClick={disabled?undefined:onClick} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 10px",borderRadius:10,marginBottom:2,opacity:disabled?0.35:1,cursor:disabled?"default":"pointer",color:dark?"rgba(243,231,200,0.85)":"#2D2A26",fontSize:13,fontWeight:500}}>
                        <span style={{fontSize:16,width:22,textAlign:"center",flexShrink:0}}>{icon}</span>
                        <span style={{flex:1,minWidth:0}}>{label}</span>
                      </div>
                    );
                    return (<>
                      <Row icon="📋" label="Surah" onClick={()=>{setShowQuranSurahModal(true);setShowPickers(false);}}/>
                      <Row icon="🌐" label="Translation" onClick={()=>{setDrawerView("translation");setShowPickers(false);}}/>
                      <Row icon="📖" label="Tafsir" onClick={()=>{const vk=selectedAyah||mushafVerses?.[0]?.verse_key;if(!vk)return;setSelectedAyah(vk);setTafsirAyah(vk);fetchTafsir(vk);setDrawerView("tafsir");setShowPickers(false);}}/>
                      <Row icon="🎙️" label="Reciter" onClick={()=>{setReciterMode("quran");setShowReciterModal(true);setShowPickers(false);}}/>
                      <div onClick={e=>e.stopPropagation()} style={{position:"relative",display:"flex",borderRadius:999,background:dark?"rgba(12,20,34,0.80)":"rgba(0,0,0,0.08)",border:dark?"1px solid rgba(212,175,55,0.15)":"1px solid rgba(139,106,16,0.20)",padding:2,height:30,margin:"6px 4px 4px"}}>
                        <div style={{position:"absolute",top:2,left:quranMode==="mushaf"?2:"calc(50% + 1px)",width:"calc(50% - 3px)",height:26,borderRadius:999,background:"linear-gradient(160deg,#D4AF37 0%,#8B6A10 100%)",boxShadow:"0 0 10px rgba(212,175,55,0.40)",transition:"left .25s ease"}}/>
                        <div className="sbtn" onClick={()=>setQuranMode("mushaf")} style={{position:"relative",zIndex:1,flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,letterSpacing:".05em",color:quranMode==="mushaf"?"#0A0E1A":dark?"rgba(212,175,55,0.45)":"rgba(0,0,0,0.50)",fontWeight:700}}>Mushaf</div>
                        <div className="sbtn" onClick={()=>setQuranMode("interactive")} style={{position:"relative",zIndex:1,flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,letterSpacing:".05em",color:quranMode==="interactive"?"#0A0E1A":dark?"rgba(212,175,55,0.45)":"rgba(0,0,0,0.50)",fontWeight:700}}>Study</div>
                      </div>
                    </>);
                  })()}
                  {/* Divider */}
                  <div style={{height:1,background:dark?"linear-gradient(90deg,transparent,rgba(217,177,95,0.18),transparent)":"linear-gradient(90deg,transparent,rgba(139,106,16,0.18),transparent)",margin:"14px 0 10px"}}/>
                  {/* NAVIGATE section */}
                  <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.45)":"rgba(140,100,20,0.55)",letterSpacing:".18em",textTransform:"uppercase",fontWeight:700,padding:"6px 8px"}}>Navigate</div>
                  {(()=>{
                    const NavRow=({img,emoji,label,onClick})=>(
                      <div className="sbtn" onClick={onClick} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 10px",borderRadius:10,marginBottom:2,color:dark?"rgba(243,231,200,0.85)":"#2D2A26",fontSize:13,fontWeight:500,cursor:"pointer"}}>
                        {img?<img src={img} alt="" style={{width:36,height:36,objectFit:"contain",flexShrink:0,opacity:0.95}}/>:<span style={{fontSize:28,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{emoji}</span>}
                        <span style={{flex:1,minWidth:0}}>{label}</span>
                      </div>
                    );
                    return (<>
                      {setActiveTab&&<NavRow img="/tab-hifz.png" label="My Hifz" onClick={()=>{setActiveTab("myhifz");setShowPickers(false);}}/>}
                      {setActiveTab&&setRihlahTab&&<NavRow img="/tab-rihlah.png" label="Journey" onClick={()=>{setRihlahTab("home");setActiveTab("rihlah");setShowPickers(false);}}/>}
                      {setActiveTab&&<NavRow emoji="🕋" label="Haramain" onClick={()=>{setActiveTab("masjidayn");setShowPickers(false);}}/>}
                    </>);
                  })()}
                </div>
                {/* Settings — pinned to bottom */}
                <div style={{borderTop:dark?"1px solid rgba(217,177,95,0.10)":"1px solid rgba(139,106,16,0.12)",padding:"10px 12px"}}>
                  <div className="sbtn" onClick={()=>{setShowQuranSettings(true);setShowPickers(false);}} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 10px",borderRadius:10,color:dark?"rgba(243,231,200,0.85)":"#2D2A26",fontSize:13,fontWeight:500,cursor:"pointer"}}>
                    <span style={{fontSize:18,width:22,textAlign:"center",flexShrink:0}}>⚙️</span>
                    <span style={{flex:1,minWidth:0}}>Settings</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── QURAN SETTINGS SHEET ── */}
          {showQuranSettings&&(
            <>
              <div onClick={()=>setShowQuranSettings(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:998}}/>
              <div onClick={e=>e.stopPropagation()} style={{position:"fixed",bottom:0,left:0,right:0,zIndex:999,maxHeight:"80vh",background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",borderTop:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(139,106,16,0.18)",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)",padding:"14px 18px 32px",overflowY:"auto",animation:"slideUpDrawer .22s ease-out"}}>
                <div style={{width:36,height:4,background:dark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)",borderRadius:2,margin:"0 auto 14px"}}/>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div style={{fontSize:11,color:dark?"rgba(217,177,95,0.65)":"rgba(140,100,20,0.60)",letterSpacing:".18em",textTransform:"uppercase",fontWeight:700}}>Qur'an Settings</div>
                  <div className="sbtn" onClick={()=>setShowQuranSettings(false)} style={{fontSize:20,color:dark?"rgba(243,231,200,0.55)":"rgba(0,0,0,0.55)",lineHeight:1,padding:"0 4px",fontWeight:300}}>×</div>
                </div>
                {/* Theme */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 6px",borderBottom:dark?"1px solid rgba(217,177,95,0.10)":"1px solid rgba(139,106,16,0.10)"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:dark?"rgba(243,231,200,0.90)":"#2D2A26"}}>Theme</div>
                    <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.40)":"#6B645A",marginTop:2}}>Dark or light parchment</div>
                  </div>
                  {setDark&&(
                    <div onClick={e=>e.stopPropagation()} style={{position:"relative",display:"flex",borderRadius:999,width:110,background:dark?"rgba(12,20,34,0.80)":"rgba(0,0,0,0.08)",border:dark?"1px solid rgba(212,175,55,0.15)":"1px solid rgba(139,106,16,0.20)",padding:2,height:28}}>
                      <div style={{position:"absolute",top:2,left:dark?2:"calc(50% + 1px)",width:"calc(50% - 3px)",height:24,borderRadius:999,background:"linear-gradient(160deg,#D4AF37 0%,#8B6A10 100%)",boxShadow:"0 0 10px rgba(212,175,55,0.40)",transition:"left .25s ease"}}/>
                      <div className="sbtn" onClick={()=>setDark(true)} style={{position:"relative",zIndex:1,flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,letterSpacing:".05em",color:dark?"#0A0E1A":"rgba(0,0,0,0.50)",fontWeight:700}}>Dark</div>
                      <div className="sbtn" onClick={()=>setDark(false)} style={{position:"relative",zIndex:1,flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,letterSpacing:".05em",color:!dark?"#0A0E1A":"rgba(212,175,55,0.45)",fontWeight:700}}>Light</div>
                    </div>
                  )}
                </div>
                {/* Default reading mode */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 6px",borderBottom:dark?"1px solid rgba(217,177,95,0.10)":"1px solid rgba(139,106,16,0.10)"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:dark?"rgba(243,231,200,0.90)":"#2D2A26"}}>Default reading mode</div>
                    <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.40)":"#6B645A",marginTop:2}}>Mushaf page or Study verses</div>
                  </div>
                  <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.30)":"#9A8A6A",fontStyle:"italic"}}>coming soon</div>
                </div>
                {/* Translation source */}
                <div style={{padding:"12px 6px",borderBottom:dark?"1px solid rgba(217,177,95,0.10)":"1px solid rgba(139,106,16,0.10)"}}>
                  <div style={{fontSize:13,fontWeight:600,color:dark?"rgba(243,231,200,0.90)":"#2D2A26",marginBottom:2}}>Translation source</div>
                  <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.40)":"#6B645A",marginBottom:10}}>Used in Study mode and the ayah drawer</div>
                  <div style={{display:"flex",gap:6}}>
                    {[{id:"muhsin_khan",name:"Muhsin Khan"},{id:"sahih_intl",name:"Sahih International"}].map(src=>{
                      const sel=translationSource===src.id;
                      return (
                        <div key={src.id} className="sbtn" onClick={()=>setTranslationSource&&setTranslationSource(src.id)} style={{flex:1,padding:"8px 6px",borderRadius:10,fontSize:11,fontWeight:600,textAlign:"center",background:sel?"rgba(217,177,95,0.12)":dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",border:`1px solid ${sel?"rgba(232,200,120,0.65)":dark?"rgba(217,177,95,0.10)":"rgba(0,0,0,0.06)"}`,color:sel?"#F6E27A":dark?"rgba(243,231,200,0.70)":"#2D2A26"}}>{src.name}</div>
                      );
                    })}
                  </div>
                </div>
                {/* Show translation inline */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 6px",borderBottom:dark?"1px solid rgba(217,177,95,0.10)":"1px solid rgba(139,106,16,0.10)"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:dark?"rgba(243,231,200,0.90)":"#2D2A26"}}>Show translation inline</div>
                    <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.40)":"#6B645A",marginTop:2}}>Below each ayah in Study mode</div>
                  </div>
                  <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.30)":"#9A8A6A",fontStyle:"italic"}}>coming soon</div>
                </div>
                {/* Default tafsir source */}
                <div style={{padding:"12px 6px"}}>
                  <div style={{fontSize:13,fontWeight:600,color:dark?"rgba(243,231,200,0.90)":"#2D2A26",marginBottom:2}}>Default tafsir source</div>
                  <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.40)":"#6B645A",marginBottom:10}}>What opens first when you tap Tafsir</div>
                  <div style={{display:"flex",gap:6}}>
                    {TAFSIR_SOURCES.map(src=>(
                      <div key={src.id} className="sbtn" onClick={()=>setTafsirTab(src.id)} style={{flex:1,padding:"8px 6px",borderRadius:10,fontSize:11,fontWeight:600,textAlign:"center",background:tafsirTab===src.id?"rgba(217,177,95,0.12)":dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",border:`1px solid ${tafsirTab===src.id?"rgba(232,200,120,0.65)":dark?"rgba(217,177,95,0.10)":"rgba(0,0,0,0.06)"}`,color:tafsirTab===src.id?"#F6E27A":dark?"rgba(243,231,200,0.70)":"#2D2A26"}}>{src.name}</div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

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
                <div style={{flexShrink:0,padding:"10px 20px 0",textAlign:"center"}}>
                  <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.55)":"rgba(140,100,20,0.65)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:700}}>Tafsir · {TAFSIR_SOURCES.find(s=>s.id===tafsirTab)?.name||""}</div>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"14px 20px 120px"}}>
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

          {/* Page Translation — full-page list of every ayah on the current mushaf page with its translation */}
          {drawerView==="translation"&&(()=>{
            const sourceLabel=translationSource==="sahih_intl"?"Sahih International":"Muhsin Khan";
            return (
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:dark?"linear-gradient(180deg,#0C1422 0%,#060E1A 100%)":"linear-gradient(180deg,#E0D5BC 0%,#D8CCB0 100%)"}}>
                <div style={{flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px",borderBottom:dark?"1px solid rgba(212,175,55,0.12)":"1px solid rgba(0,0,0,0.08)"}}>
                  <div className="sbtn" onClick={()=>{setDrawerView("default");setShowPickers(false);}} style={{fontSize:11,fontWeight:700,color:dark?"#E6B84A":"#8B6A10",padding:"6px 10px",borderRadius:8,background:dark?"rgba(230,184,74,0.08)":"rgba(180,140,40,0.06)",border:dark?"1px solid rgba(230,184,74,0.25)":"1px solid rgba(160,120,20,0.25)"}}>← Back to Qur'an</div>
                  <div style={{fontSize:10,color:dark?"rgba(217,177,95,0.60)":"#6B645A",letterSpacing:".14em",fontWeight:700,textTransform:"uppercase"}}>Page {mushafPage}</div>
                </div>
                <div style={{flexShrink:0,padding:"10px 20px 0",textAlign:"center"}}>
                  <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.55)":"rgba(140,100,20,0.65)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:700}}>Translation · {sourceLabel}</div>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"14px 20px 120px"}}>
                  {(mushafVerses||[]).length===0?(
                    <div style={{textAlign:"center",padding:40,color:dark?"rgba(243,231,200,0.20)":"#6B645A",fontSize:11}}>Loading...</div>
                  ):(mushafVerses||[]).map(v=>{
                    const t=translations[v.verse_key]||"";
                    return (
                      <div key={v.verse_key} style={{marginBottom:22,paddingBottom:18,borderBottom:dark?"1px solid rgba(212,175,55,0.08)":"1px solid rgba(0,0,0,0.05)"}}>
                        <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.55)":"rgba(140,100,20,0.60)",letterSpacing:".18em",textTransform:"uppercase",fontWeight:700,marginBottom:8,fontFamily:"'IBM Plex Mono',monospace"}}>{SURAH_EN[parseInt(v.verse_key.split(":")[0],10)]||""} · {v.verse_key}</div>
                        <div style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:fontSize,lineHeight:2,color:dark?"#E8DFC0":"#2D2A26",direction:"rtl",textAlign:"right",marginBottom:10}}>{(v.text_uthmani||"").replace(/۟/g,"ْ")}</div>
                        {t?(
                          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,lineHeight:1.75,color:dark?"rgba(243,231,200,0.80)":"#2D2A26"}}>{t}</div>
                        ):(
                          <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.30)":"#9A9488",fontStyle:"italic"}}>Loading translation…</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Viewer */}
          {drawerView!=="tafsir"&&drawerView!=="translation"&&(quranMode==="mushaf"?(
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
              style={{position:"relative",flex:1,overflowY:"auto",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",padding:`10px 6px ${haramainMeta?"120px":"60px"}`,display:"flex",flexDirection:"column",justifyContent:"flex-start"}}
            >
              {/* ── CONTINUOUS READING SURFACE ── */}
              {mushafLoading?(
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:"rgba(232,213,163,0.25)",fontSize:11,letterSpacing:".12em"}}>Loading...</div>
              ):(
                <div style={mushafPage<=2?{padding:0,flex:1,display:"flex",flexDirection:"column",minHeight:0}:{padding:0}}>
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
                    return (<div style={mushafPage<=2?{padding:"8px 2px 0",position:"relative",flex:1,display:"flex",flexDirection:"column",minHeight:0}:{padding:"8px 2px 0",position:"relative"}}>
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
                        // Word-level verse-key map per physical line. Pages with
                        // multiple ayahs on one line (e.g. p50 line 3 holds 3:1,
                        // 3:2, and start of 3:3) need per-word selection — a
                        // line-level click would always pick the first ayah.
                        // Token count in pages.json aligns 1:1 with API word
                        // count per line, so we pair tokens by index.
                        const lineWordKeys={};
                        (mushafVerses||[]).forEach(v=>{
                          (v.words||[]).forEach(w=>{
                            if(typeof w.line_number!=="number") return;
                            if(!lineWordKeys[w.line_number]) lineWordKeys[w.line_number]=[];
                            lineWordKeys[w.line_number].push(v.verse_key);
                          });
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
                                <div style={{position:"relative",width:"100%",height:68,backgroundImage:"url('/surah_ornament.png')",backgroundSize:"contain",backgroundRepeat:"no-repeat",backgroundPosition:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                  <span style={{fontFamily:"'surah-names',serif",fontSize:"clamp(24px,6.5vw,38px)",color:dark?"rgba(232,200,120,0.85)":"rgba(0,0,0,0.70)",lineHeight:1,display:"inline-flex",alignItems:"center",gap:"0.04em",direction:"rtl"}}>
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
                          const lineNum=layoutEntry.ln||(i+1);
                          const wordsOnLine=lineWordKeys[lineNum]||[];
                          const tokens=lineText.split(" ");
                          const pickAyah=(vk)=>{setSelectedAyah(vk);setDrawerView("default");setTimeout(()=>{try{window.scrollTo({top:0,behavior:"smooth"});document.querySelectorAll('[class*="fi"]').forEach(el=>{if(el.scrollTop>0)el.scrollTo({top:0,behavior:"smooth"});});}catch{}},10);};
                          return (
                          <div key={i} style={{direction:"rtl",display:"flex",justifyContent:isCenter?"center":"space-between",alignItems:"center",maxWidth:"min(560px,94vw)",marginInline:"auto",fontFamily:`'p${mushafPage}',serif`,fontSize:"clamp(22px,5.4vw,31px)",color:dark?"#E8DFC0":"#2D2A26",padding:"1px 0",whiteSpace:"nowrap",gap:isCenter?"0.25em":0}}>
                            {tokens.map((w,wi)=>{
                              const vk=wordsOnLine[wi];
                              return <span key={wi} className={vk?"sbtn":undefined} onClick={vk?()=>pickAyah(vk):undefined} style={{cursor:vk?"pointer":"default"}}>{w}</span>;
                            })}
                          </div>
                          );
                        });
                        // Short pages (1-2): center the whole block vertically.
                        if(mushafPage<=2){
                          return (<div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center"}}>{entries}</div>);
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
              {(selectedAyah||drawerView==="bookmarks")&&drawerView!=="tafsir"&&drawerView!=="translation"&&(()=>{
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
                        {/* Source name — set in Settings */}
                        <div style={{flexShrink:0,padding:"10px 20px 0",textAlign:"center"}}>
                          <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.55)":"rgba(140,100,20,0.65)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:700}}>Tafsir · {TAFSIR_SOURCES.find(s=>s.id===tafsirTab)?.name||""}</div>
                        </div>
                        {/* Tafsir content — parsed into blocks */}
                        <div style={{flex:1,overflowY:"auto",padding:"14px 20px 120px"}}>
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
