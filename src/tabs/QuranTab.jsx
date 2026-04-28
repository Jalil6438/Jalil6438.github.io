import { SURAH_EN, MADANI_SURAHS, RECITERS } from "../data/constants";
import { SURAH_AR, JUZ_META } from "../data/quran-metadata";
import React, { useState, useEffect, useRef } from "react";
import { toArabicDigits } from "../utils";
import { loadQulSegments } from "../hooks/useAudio";

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
    tafsirView, setTafsirView,
    mushafBookmarks, setMushafBookmarks,
    playingKey, setPlayingKey,
    quranReciter,
    fontSize,
    tafsirData, tafsirTab, setTafsirTab, setTafsirAyah, fetchTafsir,
    reflections, setReflections,
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
  // Tajweed coloring is just the third Reading mode — derived, not its own
  // state. quranMode persistence happens in the parent.
  // TAJWEED DISABLED 2026-04-26 — uncomment line below + delete `false` line
  // to restore. All V4 conditional branches stay live but unreachable while
  // tajweedFont is hardcoded to false.
  // const tajweedFont = quranMode === "tajweed";
  const tajweedFont = false;
  const loadQcfFont = (pageN) => {
    if (!pageN || pageN < 1 || pageN > 604) return;
    // V2 fonts (quran.com CDN) for plain Study mode, V4-tajweed (self-hosted
    // in /fonts/v4/) when the user opts into tajweed coloring. Use a per-
    // edition family name (p${pageN}-v2 / p${pageN}-v4) so both editions
    // can coexist without collision and the renderer picks the active one.
    const ed = tajweedFont ? "v4" : "v2";
    const isTajweedEd = tajweedFont;
    const family = `p${pageN}-${ed}`;
    // ID includes the family name to avoid collision with other consumers
    // (MyHifz, Asr, Memorization) which register `font-family: 'p${pageN}'`
    // under id `qcf-font-v2-${pageN}`. Same id would short-circuit our
    // registration and our `p${pageN}-${ed}` family would never exist.
    const elId = `qcf-font-${family}`;
    if (!document.getElementById(elId)) {
      const style = document.createElement("style");
      style.id = elId;
      const src = isTajweedEd
        ? `url('/fonts/v4/p${pageN}.woff2') format('woff2')`
        : `url('https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v2/woff2/p${pageN}.woff2') format('woff2'),url('https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v2/woff/p${pageN}.woff') format('woff')`;
      // For the V4 tajweed font, register a custom palette that overrides the
      // base ink color (index 0 — the non-tajweed letters) to ivory so the
      // text remains legible on dark mode while tajweed-rule colors stay
      // intact. The @font-palette-values rule binds to this specific family.
      const paletteRule = isTajweedEd
        ? `@font-palette-values --dark-${family}{font-family:'${family}';base-palette:0;override-colors:0 #E8DFC0;}`
        : "";
      style.textContent = `@font-face{font-family:'${family}';src:${src};font-display:block;}${paletteRule}`;
      document.head.appendChild(style);
    }
    const key = `${ed}-${pageN}`;
    if (loadedFonts.has(key)) return;
    if (document.fonts && document.fonts.load) {
      document.fonts.load(`16px '${family}'`).then(() => {
        setLoadedFonts(prev => { const n = new Set(prev); n.add(key); return n; });
      }).catch(() => {});
    }
  };
  useEffect(() => {
    // Preload current + neighbors in a wider window so casual page flips
    // (swipes, 'next/prev' taps) don't wait for network. Also re-runs
    // when the user flips the Study/Tajweed toggle so fonts re-fetch.
    for (let i = -4; i <= 4; i++) loadQcfFont(mushafPage + i);
  }, [mushafPage, tajweedFont]);

  // Load the authoritative mushaf page layout — pre-computed line strings
  // and alignment per page from public/mushaf-pages.json +
  // public/mushaf-layout.json. Using these instead of the API's
  // line_number guarantees each line matches the real KFGQPC mushaf.
  // V2 and V4 layouts are loaded separately. The active layout is paired
  // with the active font edition (V2 fonts ↔ V2 layout, V4 fonts ↔ V4 layout)
  // — line-wrap calculations were done against each font's metrics, so a
  // mismatch causes some lines to come up short and `space-between` spreads
  // them unevenly.
  const [pagesV2, setPagesV2] = useState(null);
  const [pagesV4, setPagesV4] = useState(null);
  const [layoutV2, setLayoutV2] = useState(null);
  const [layoutV4, setLayoutV4] = useState(null);
  const mushafPagesData = tajweedFont ? pagesV4 : pagesV2;
  const mushafLayoutData = tajweedFont ? layoutV4 : layoutV2;
  const [pageContentMap, setPageContentMap] = useState(null); // { [page]: [{sNum, minA, maxA}, ...] }
  // Verses physically on the current mushaf page per OUR layout
  // (KFGQPC v2 verse-to-page.json). quran.com's default by_page uses
  // different page boundaries, so we drive the Translation view from
  // pageContentMap and fetch the exact verses we need.
  const [pageVerses, setPageVerses] = useState([]);
  // Flat array of verse_keys, one per glyph on the current page, in mushaf
  // reading order. Built by concatenating each verse's code_v2 (which uses
  // the same KFGQPC v2 PUA glyphs as our pages.json). Independent of the
  // API's line_number / page boundaries, so per-word tap mapping is correct
  // even when the API mushaf disagrees with ours (e.g. p592 shifts surah
  // headers, p580 doesn't).
  const [glyphVerseKeys, setGlyphVerseKeys] = useState([]);
  // Cache per-surah code_v2 lookups so flipping pages within a surah is fast.
  const codeV2CacheRef = useRef({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // TAJWEED DISABLED 2026-04-26 — V4 layout/pages fetched but unused
        // while tajweedFont is hardcoded false. Restore by uncommenting V4
        // entries below + the setPagesV4/setLayoutV4 lines.
        const [pV2, lV2, /*pV4, lV4,*/ v] = await Promise.all([
          fetch("/v2/mushaf-pages.json"),
          fetch("/v2/mushaf-layout.json"),
          /* fetch("/mushaf-pages.json"),     // active default = V4
          fetch("/mushaf-layout.json"), */
          fetch("/verse-to-page.json"),
        ]);
        if (!cancelled && pV2.ok) setPagesV2(await pV2.json());
        if (!cancelled && lV2.ok) setLayoutV2(await lV2.json());
        /* if (!cancelled && pV4.ok) setPagesV4(await pV4.json());
        if (!cancelled && lV4.ok) setLayoutV4(await lV4.json()); */
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

  // Build the exact list of verses physically on this page (per our layout)
  // by fetching the surahs covering it and slicing to the right ayah ranges.
  useEffect(() => {
    if (drawerView !== "translation" && drawerView !== "tafsir-page") return;
    const surahs = pageContentMap?.[mushafPage];
    if (!surahs || !surahs.length) return;
    let cancelled = false;
    (async () => {
      const all = [];
      for (const s of surahs) {
        try {
          const r = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${s.sNum}?words=false&fields=text_uthmani,verse_key&per_page=300`);
          if (!r.ok) continue;
          const d = await r.json();
          if (cancelled) return;
          const filtered = (d.verses || []).filter(v => {
            const a = parseInt(v.verse_key.split(":")[1], 10);
            return a >= s.minA && a <= s.maxA;
          });
          all.push(...filtered);
        } catch {}
      }
      if (!cancelled) setPageVerses(all);
    })();
    return () => { cancelled = true; };
  }, [drawerView, mushafPage, pageContentMap]);

  // Build the per-glyph verse_key array for the CURRENT page using
  // code_v2 (KFGQPC v2). Uses our own pageContentMap so it always matches
  // what's rendered, regardless of the API's mushaf-edition differences.
  useEffect(() => {
    const surahs = pageContentMap?.[mushafPage];
    if (!surahs || !surahs.length) return;
    let cancelled = false;
    (async () => {
      const flat = [];
      for (const s of surahs) {
        try {
          let verses = codeV2CacheRef.current[s.sNum];
          if (!verses) {
            const r = await fetch(`https://api.quran.com/api/v4/quran/verses/code_v2?chapter_number=${s.sNum}`);
            if (!r.ok) continue;
            const d = await r.json();
            verses = d.verses || [];
            codeV2CacheRef.current[s.sNum] = verses;
          }
          if (cancelled) return;
          verses
            .filter(v => {
              const a = parseInt(v.verse_key.split(":")[1], 10);
              return a >= s.minA && a <= s.maxA;
            })
            .forEach(v => {
              (v.code_v2 || "").split(" ").forEach(() => flat.push(v.verse_key));
            });
        } catch {}
      }
      if (!cancelled) setGlyphVerseKeys(flat);
    })();
    return () => { cancelled = true; };
  }, [mushafPage, pageContentMap]);

  // Prefetch tafsir for every verse on the page when entering the page-tafsir view.
  useEffect(() => {
    if (drawerView !== "tafsir-page") return;
    (pageVerses || []).forEach(v => {
      if (!tafsirData[`${tafsirTab}-${v.verse_key}`]) fetchTafsir(v.verse_key);
    });
  }, [drawerView, pageVerses, tafsirTab]);

  // While a Play Range is running, follow the playing ayah in the drawer
  // so the user sees Arabic + translation update in sync with the audio.
  useEffect(() => {
    if (!mushafAudioPlaying) return;
    if (!playingKey) return;
    if (playingKey === selectedAyah) return;
    setSelectedAyah(playingKey);
  }, [playingKey, mushafAudioPlaying]);

  // Clear selectedAyah when navigating to a new page where the ayah no
  // longer lives — otherwise the drawer keeps showing a stale verse from
  // the previous page after a swipe or surah pick.
  useEffect(() => {
    if (!selectedAyah) return;
    if (mushafAudioPlaying) return; // Range playback intentionally crosses pages.
    const surahsOnPage = pageContentMap?.[mushafPage];
    if (!surahsOnPage) return;
    const [sn,a] = selectedAyah.split(":").map(Number);
    const onPage = surahsOnPage.some(s => sn===s.sNum && a>=s.minA && a<=s.maxA);
    if (!onPage) setSelectedAyah(null);
  }, [mushafPage, pageContentMap]);

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
  }, [tajweedFont]);

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

  // Header surah priority:
  //   1. If a surah header (ornament) is on this page, that's the surah the
  //      page "introduces" — matches the surah picker which jumps to the page
  //      where a surah's header lives.
  //   2. Otherwise, fall back to the first verse actually visible on the page.
  //   3. Last resort: the user's last picked surah.
  const surahHeaderOnPage = (mushafLayoutData?.[mushafPage]||[]).find(e=>e.type==="surah_name")?.sn;
  const firstVerseOnPage = (mushafVerses||[])[0]?.verse_key;
  const curSurahNum = surahHeaderOnPage
    ? surahHeaderOnPage
    : (firstVerseOnPage ? parseInt(firstVerseOnPage.split(":")[0],10) : mushafSurahNum);
  const curSurahPage = SURAH_PAGES[curSurahNum] || 1;
  const [showPickers, setShowPickers] = useState(false);
  const [showQuranSettings, setShowQuranSettings] = useState(false);
  const parchment = dark ? "linear-gradient(180deg,#0B1220,#0E1628)" : "#F3E9D2";
  const goldColor = "#E8D5A3";
  const inkColor = "#E8D5A3";

  return (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:parchment}}>

          {/* Header — sticky so it's always visible regardless of scroll.
              Compact since the surah/juz title moved into the framed page
              below; only the hamburger menu lives here now. */}
          <div style={{flexShrink:0,background:dark?"#0B1220":"#F3E9D2",paddingTop:"max(env(safe-area-inset-top,8px),8px)",position:"sticky",top:0,zIndex:201}}>
            <div style={{display:"flex",alignItems:"center",padding:"2px 10px"}}>
              <div className="sbtn" onClick={()=>setShowPickers(true)} style={{flexShrink:0,width:26,height:26,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,padding:"4px",borderRadius:6}} aria-label="Open menu">
                <div style={{width:14,height:2,borderRadius:1,background:dark?"rgba(232,200,120,0.85)":"#6B4F00"}}/>
                <div style={{width:14,height:2,borderRadius:1,background:dark?"rgba(232,200,120,0.85)":"#6B4F00"}}/>
                <div style={{width:14,height:2,borderRadius:1,background:dark?"rgba(232,200,120,0.85)":"#6B4F00"}}/>
              </div>
              <div style={{flex:1}}/>
            </div>
            <div style={{height:1,background:dark?"linear-gradient(to right,transparent,rgba(217,177,95,0.20),transparent)":"linear-gradient(to right,transparent,rgba(139,106,16,0.12),transparent)"}}/>
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
                      <Row icon="📖" label="Tafsir" onClick={()=>{
                        // Mushaf mode is always full-page (image isn't tap-interactive).
                        // Study mode follows the user's tafsirView preference.
                        const useFull=quranMode==="mushaf"||tafsirView==="full";
                        if(useFull){
                          setDrawerView("tafsir-page");
                        }else{
                          const surahsOnPage=pageContentMap?.[mushafPage]||[];
                          const firstVk=surahsOnPage[0]?`${surahsOnPage[0].sNum}:${surahsOnPage[0].minA}`:null;
                          const onPage=selectedAyah&&surahsOnPage.some(s=>{const [sn,a]=selectedAyah.split(":").map(Number);return sn===s.sNum&&a>=s.minA&&a<=s.maxA;});
                          const vk=onPage?selectedAyah:firstVk;
                          if(!vk){setShowPickers(false);return;}
                          setSelectedAyah(vk);setTafsirAyah(vk);fetchTafsir(vk);setDrawerView("tafsir");
                        }
                        setShowPickers(false);
                      }}/>
                      <Row icon="🎙️" label="Reciter" onClick={()=>{setReciterMode("quran");setShowReciterModal(true);setShowPickers(false);}}/>
                    </>);
                  })()}
                  {/* Divider */}
                  <div style={{height:1,background:dark?"linear-gradient(90deg,transparent,rgba(217,177,95,0.18),transparent)":"linear-gradient(90deg,transparent,rgba(139,106,16,0.18),transparent)",margin:"14px 0 10px"}}/>
                  {/* NAVIGATE section */}
                  <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.45)":"rgba(140,100,20,0.55)",letterSpacing:".18em",textTransform:"uppercase",fontWeight:700,padding:"6px 8px"}}>Navigate</div>
                  {(()=>{
                    const NavRow=({img,emoji,label,onClick})=>(
                      <div className="sbtn" onClick={onClick} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 10px",borderRadius:10,marginBottom:2,color:dark?"rgba(243,231,200,0.85)":"#2D2A26",fontSize:13,fontWeight:500,cursor:"pointer"}}>
                        {img?<img src={img} alt="" style={{width:44,height:44,objectFit:"contain",flexShrink:0,opacity:0.95}}/>:<span style={{fontSize:28,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{emoji}</span>}
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
                    <div style={{fontSize:13,fontWeight:600,color:dark?"rgba(243,231,200,0.90)":"#2D2A26"}}>Reading mode</div>
                    {/* TAJWEED DISABLED 2026-04-26 — original subtitle: "Mushaf · Study · Tajweed colors" */}
                    <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.40)":"#6B645A",marginTop:2}}>Mushaf · Study</div>
                  </div>
                  {setQuranMode&&(()=>{
                    // TAJWEED DISABLED 2026-04-26 — original modes array included tajweed:
                    //   const modes=[{id:"mushaf",label:"Mushaf"},{id:"interactive",label:"Study"},{id:"tajweed",label:"Tajweed"}];
                    // and the slider divisor below was /3 (3 modes). Restore both together.
                    const modes=[{id:"mushaf",label:"Mushaf"},{id:"interactive",label:"Study"}/*,{id:"tajweed",label:"Tajweed"}*/];
                    const idx=Math.max(0,modes.findIndex(m=>m.id===quranMode));
                    return (
                      <div onClick={e=>e.stopPropagation()} style={{position:"relative",display:"flex",borderRadius:999,width:210,background:dark?"rgba(12,20,34,0.80)":"rgba(0,0,0,0.08)",border:dark?"1px solid rgba(212,175,55,0.15)":"1px solid rgba(139,106,16,0.20)",padding:2,height:28}}>
                        <div style={{position:"absolute",top:2,left:`calc((100% - 4px) * ${idx} / 2 + 2px)`,width:"calc((100% - 4px) / 2)",height:24,borderRadius:999,background:"linear-gradient(160deg,#D4AF37 0%,#8B6A10 100%)",boxShadow:"0 0 10px rgba(212,175,55,0.40)",transition:"left .25s ease"}}/>
                        {modes.map(m=>(
                          <div key={m.id} className="sbtn" onClick={()=>setQuranMode(m.id)} style={{position:"relative",zIndex:1,flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,letterSpacing:".05em",color:quranMode===m.id?"#0A0E1A":dark?"rgba(212,175,55,0.45)":"rgba(0,0,0,0.50)",fontWeight:700}}>{m.label}</div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                {/* Translation source */}
                <div style={{padding:"12px 6px",borderBottom:dark?"1px solid rgba(217,177,95,0.10)":"1px solid rgba(139,106,16,0.10)"}}>
                  <div style={{fontSize:13,fontWeight:600,color:dark?"rgba(243,231,200,0.90)":"#2D2A26",marginBottom:2}}>Translation</div>
                  <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.40)":"#6B645A",marginBottom:10}}>Full-page only in Mushaf mode</div>
                  <div style={{display:"flex",gap:6}}>
                    {[{id:"muhsin_khan",name:"Muhsin Khan"},{id:"sahih_intl",name:"Sahih International"}].map(src=>{
                      const sel=translationSource===src.id;
                      return (
                        <div key={src.id} className="sbtn" onClick={()=>setTranslationSource&&setTranslationSource(src.id)} style={{flex:1,padding:"8px 6px",borderRadius:10,fontSize:11,fontWeight:700,textAlign:"center",background:sel?"linear-gradient(160deg,#D4AF37 0%,#8B6A10 100%)":dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",border:`1px solid ${sel?"rgba(232,200,120,0.65)":dark?"rgba(217,177,95,0.10)":"rgba(0,0,0,0.06)"}`,boxShadow:sel?"0 0 10px rgba(212,175,55,0.40)":"none",color:sel?"#0A0E1A":dark?"rgba(243,231,200,0.70)":"#2D2A26"}}>{src.name}</div>
                      );
                    })}
                  </div>
                </div>
                {/* Tafsir */}
                <div style={{padding:"12px 6px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:4}}>
                    <div style={{fontSize:13,fontWeight:600,color:dark?"rgba(243,231,200,0.90)":"#2D2A26"}}>Tafsir</div>
                    {setTafsirView&&(
                      <div onClick={e=>e.stopPropagation()} style={{position:"relative",display:"flex",borderRadius:999,width:120,background:dark?"rgba(12,20,34,0.80)":"rgba(0,0,0,0.08)",border:dark?"1px solid rgba(212,175,55,0.15)":"1px solid rgba(139,106,16,0.20)",padding:2,height:26}}>
                        <div style={{position:"absolute",top:2,left:tafsirView==="single"?2:"calc(50% + 1px)",width:"calc(50% - 3px)",height:22,borderRadius:999,background:"linear-gradient(160deg,#D4AF37 0%,#8B6A10 100%)",boxShadow:"0 0 10px rgba(212,175,55,0.40)",transition:"left .25s ease"}}/>
                        <div className="sbtn" onClick={()=>setTafsirView("single")} style={{position:"relative",zIndex:1,flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,letterSpacing:".05em",color:tafsirView==="single"?"#0A0E1A":dark?"rgba(212,175,55,0.45)":"rgba(0,0,0,0.50)",fontWeight:700}}>Ayah</div>
                        <div className="sbtn" onClick={()=>setTafsirView("full")} style={{position:"relative",zIndex:1,flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,letterSpacing:".05em",color:tafsirView==="full"?"#0A0E1A":dark?"rgba(212,175,55,0.45)":"rgba(0,0,0,0.50)",fontWeight:700}}>Full</div>
                      </div>
                    )}
                  </div>
                  <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.40)":"#6B645A",marginBottom:10}}>Full-page only in Mushaf mode</div>
                  <div style={{display:"flex",gap:6}}>
                    {TAFSIR_SOURCES.map(src=>{
                      const sel=tafsirTab===src.id;
                      return (
                        <div key={src.id} className="sbtn" onClick={()=>setTafsirTab(src.id)} style={{flex:1,padding:"8px 6px",borderRadius:10,fontSize:11,fontWeight:700,textAlign:"center",background:sel?"linear-gradient(160deg,#D4AF37 0%,#8B6A10 100%)":dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",border:`1px solid ${sel?"rgba(232,200,120,0.65)":dark?"rgba(217,177,95,0.10)":"rgba(0,0,0,0.06)"}`,boxShadow:sel?"0 0 10px rgba(212,175,55,0.40)":"none",color:sel?"#0A0E1A":dark?"rgba(243,231,200,0.70)":"#2D2A26"}}>{src.name}</div>
                      );
                    })}
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
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2"}}>
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
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2"}}>
                <div style={{flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px",borderBottom:dark?"1px solid rgba(212,175,55,0.12)":"1px solid rgba(0,0,0,0.08)"}}>
                  <div className="sbtn" onClick={()=>{setDrawerView("default");setShowPickers(false);}} style={{fontSize:11,fontWeight:700,color:dark?"#E6B84A":"#8B6A10",padding:"6px 10px",borderRadius:8,background:dark?"rgba(230,184,74,0.08)":"rgba(180,140,40,0.06)",border:dark?"1px solid rgba(230,184,74,0.25)":"1px solid rgba(160,120,20,0.25)"}}>← Back to Qur'an</div>
                  <div style={{fontSize:10,color:dark?"rgba(217,177,95,0.60)":"#6B645A",letterSpacing:".14em",fontWeight:700,textTransform:"uppercase"}}>Page {mushafPage}</div>
                </div>
                <div style={{flexShrink:0,padding:"10px 20px 0",textAlign:"center"}}>
                  <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.55)":"rgba(140,100,20,0.65)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:700}}>Translation · {sourceLabel}</div>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"14px 20px 120px"}}>
                  {(pageVerses||[]).length===0?(
                    <div style={{textAlign:"center",padding:40,color:dark?"rgba(243,231,200,0.20)":"#6B645A",fontSize:11}}>Loading...</div>
                  ):(()=>{
                    let prevSurah=null;
                    return pageVerses.map(v=>{
                      const t=translations[v.verse_key]||"";
                      const sNum=parseInt(v.verse_key.split(":")[0],10);
                      const showSurahHeader=sNum!==prevSurah;
                      prevSurah=sNum;
                      return (
                        <React.Fragment key={v.verse_key}>
                          {showSurahHeader&&(
                            <div style={{display:"flex",alignItems:"center",gap:10,margin:"10px 0 18px"}}>
                              <div style={{flex:1,height:1,background:dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.45) 100%)":"linear-gradient(90deg,rgba(140,100,20,0) 0%,rgba(140,100,20,0.40) 100%)"}}/>
                              <div style={{textAlign:"center",flexShrink:0}}>
                                <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:600,color:dark?"#F6E27A":"#8B6A10",letterSpacing:".02em"}}>{SURAH_EN[sNum]||""}</div>
                                <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.55)":"rgba(140,100,20,0.60)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:700,marginTop:2}}>Surah {sNum} · {MADANI_SURAHS.has(sNum)?"Madani":"Meccan"}</div>
                              </div>
                              <div style={{flex:1,height:1,background:dark?"linear-gradient(90deg,rgba(232,200,120,0.45) 0%,rgba(217,177,95,0) 100%)":"linear-gradient(90deg,rgba(140,100,20,0.40) 0%,rgba(140,100,20,0) 100%)"}}/>
                            </div>
                          )}
                          <div style={{marginBottom:22,paddingBottom:18,borderBottom:dark?"1px solid rgba(212,175,55,0.08)":"1px solid rgba(0,0,0,0.05)"}}>
                            <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.55)":"rgba(140,100,20,0.60)",letterSpacing:".18em",textTransform:"uppercase",fontWeight:700,marginBottom:8,fontFamily:"'IBM Plex Mono',monospace"}}>{v.verse_key}</div>
                            <div style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:fontSize,lineHeight:2,color:dark?"#E8DFC0":"#2D2A26",direction:"rtl",textAlign:"right",marginBottom:10}}>{(v.text_uthmani||"").replace(/۟/g,"ْ")}</div>
                            {t?(
                              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,lineHeight:1.75,color:dark?"rgba(243,231,200,0.80)":"#2D2A26"}}>{t}</div>
                            ):(
                              <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.30)":"#9A9488",fontStyle:"italic"}}>Loading translation…</div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>
              </div>
            );
          })()}

          {/* Page Tafsir — full-page list of every ayah on the current mushaf page with its tafsir */}
          {drawerView==="tafsir-page"&&(()=>{
            const sourceLabel=TAFSIR_SOURCES.find(s=>s.id===tafsirTab)?.name||"";
            const isFullArabic=TAFSIR_SOURCES.find(s=>s.id===tafsirTab)?.lang==="ar";
            return (
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2"}}>
                <div style={{flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px",borderBottom:dark?"1px solid rgba(212,175,55,0.12)":"1px solid rgba(0,0,0,0.08)"}}>
                  <div className="sbtn" onClick={()=>{setDrawerView("default");setShowPickers(false);}} style={{fontSize:11,fontWeight:700,color:dark?"#E6B84A":"#8B6A10",padding:"6px 10px",borderRadius:8,background:dark?"rgba(230,184,74,0.08)":"rgba(180,140,40,0.06)",border:dark?"1px solid rgba(230,184,74,0.25)":"1px solid rgba(160,120,20,0.25)"}}>← Back to Qur'an</div>
                  <div style={{fontSize:10,color:dark?"rgba(217,177,95,0.60)":"#6B645A",letterSpacing:".14em",fontWeight:700,textTransform:"uppercase"}}>Page {mushafPage}</div>
                </div>
                <div style={{flexShrink:0,padding:"10px 20px 0",textAlign:"center"}}>
                  <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.55)":"rgba(140,100,20,0.65)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:700}}>Tafsir · {sourceLabel}</div>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"14px 20px 120px"}}>
                  {(pageVerses||[]).length===0?(
                    <div style={{textAlign:"center",padding:40,color:dark?"rgba(243,231,200,0.20)":"#6B645A",fontSize:11}}>Loading...</div>
                  ):(()=>{
                    let prevSurah=null;
                    return pageVerses.map(v=>{
                      const sNum=parseInt(v.verse_key.split(":")[0],10);
                      const showSurahHeader=sNum!==prevSurah;
                      prevSurah=sNum;
                      const rawText=tafsirData[`${tafsirTab}-${v.verse_key}`];
                      return (
                        <React.Fragment key={v.verse_key}>
                          {showSurahHeader&&(
                            <div style={{display:"flex",alignItems:"center",gap:10,margin:"10px 0 18px"}}>
                              <div style={{flex:1,height:1,background:dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.45) 100%)":"linear-gradient(90deg,rgba(140,100,20,0) 0%,rgba(140,100,20,0.40) 100%)"}}/>
                              <div style={{textAlign:"center",flexShrink:0}}>
                                <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:600,color:dark?"#F6E27A":"#8B6A10",letterSpacing:".02em"}}>{SURAH_EN[sNum]||""}</div>
                                <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.55)":"rgba(140,100,20,0.60)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:700,marginTop:2}}>Surah {sNum} · {MADANI_SURAHS.has(sNum)?"Madani":"Meccan"}</div>
                              </div>
                              <div style={{flex:1,height:1,background:dark?"linear-gradient(90deg,rgba(232,200,120,0.45) 0%,rgba(217,177,95,0) 100%)":"linear-gradient(90deg,rgba(140,100,20,0.40) 0%,rgba(140,100,20,0) 100%)"}}/>
                            </div>
                          )}
                          <div style={{marginBottom:26,paddingBottom:20,borderBottom:dark?"1px solid rgba(212,175,55,0.08)":"1px solid rgba(0,0,0,0.05)"}}>
                            <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.55)":"rgba(140,100,20,0.60)",letterSpacing:".18em",textTransform:"uppercase",fontWeight:700,marginBottom:8,fontFamily:"'IBM Plex Mono',monospace"}}>{v.verse_key}</div>
                            <div style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:fontSize,lineHeight:2,color:dark?"#E8DFC0":"#2D2A26",direction:"rtl",textAlign:"right",marginBottom:14}}>{(v.text_uthmani||"").replace(/۟/g,"ْ")}</div>
                            {!rawText?(
                              <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.30)":"#9A9488",fontStyle:"italic"}}>Loading tafsir…</div>
                            ):isFullArabic?(
                              <div style={{fontFamily:"'Amiri',serif",fontSize:18,lineHeight:2.1,color:dark?"rgba(243,231,200,0.85)":"#2D2A26",direction:"rtl",textAlign:"right"}}>{rawText}</div>
                            ):(
                              parseTafsirBlocks(rawText).map((block,i)=>(block.type==="arabic"?(
                                <div key={i} style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:18,lineHeight:2.1,color:dark?"#E8C76A":"#2D2A26",direction:"rtl",textAlign:"center",padding:"14px 12px",margin:"10px 0",background:dark?"rgba(212,175,55,0.04)":"rgba(212,175,55,0.06)",borderRadius:10,border:dark?"1px solid rgba(212,175,55,0.10)":"1px solid rgba(0,0,0,0.06)"}}>{block.text}</div>
                              ):(
                                <div key={i} style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,lineHeight:1.85,color:dark?"rgba(243,231,200,0.78)":"#2D2A26",marginBottom:12,direction:"ltr",textAlign:"left"}}>{block.text}</div>
                              )))
                            )}
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>
              </div>
            );
          })()}

          {/* Viewer */}
          {drawerView!=="tafsir"&&drawerView!=="translation"&&drawerView!=="tafsir-page"&&(quranMode==="mushaf"?(
            <div style={{flex:1,overflow:"hidden",backgroundColor:dark?"#0B1220":"#F3E9D2",display:"flex",flexDirection:"column",position:"relative"}}
              onTouchStart={e=>{ quranTouchRef.current=e.touches[0].clientX; }}
              onTouchEnd={e=>{
                const dx=e.changedTouches[0].clientX-quranTouchRef.current;
                if(Math.abs(dx)<40) return;
                if(dx<0){ setMushafSwipeAnim("left"); setMushafPage(p=>Math.max(1,p-1)); }
                else { setMushafSwipeAnim("right"); setMushafPage(p=>Math.min(604,p+1)); }
              }}
              onClick={()=>setShowMushafSheet(true)}
            >
              {(()=>{
                // Font-based mushaf rendering — same V2 layout JSON path Study
                // mode uses, no per-ayah click handlers (the whole container's
                // onClick opens the mushaf control sheet). Page swap is instant
                // because fonts are cached and pagesV2/layoutV2 is bundled —
                // replaces the previous <img> path that fetched a new PNG from
                // raw.githubusercontent.com on every swipe.
                const fontEd=tajweedFont?"v4":"v2";
                const pageFontReady=loadedFonts.has(`${fontEd}-${mushafPage}`);
                if(!pageFontReady){
                  return (
                    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:dark?"rgba(217,177,95,0.35)":"rgba(107,100,90,0.55)",fontSize:12,letterSpacing:".08em"}}>
                      <span>loading mushaf…</span>
                    </div>
                  );
                }
                const pageLines=mushafPagesData&&mushafPagesData[mushafPage];
                const pageLayout=mushafLayoutData&&mushafLayoutData[mushafPage];
                if(!pageLines||!pageLayout) return null;
                let ayahIdx=-1;
                const entries=pageLayout.map((layoutEntry,i)=>{
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
                  if(type==="basmallah"){
                    return (
                      <div key={i} style={{textAlign:"center",padding:"1px 0",flexShrink:0}}>
                        {bismillahGlyphs&&loadedFonts.has(`${fontEd}-1`)?(
                          <div style={{fontFamily:`'p1-${fontEd}',serif`,fontSize:"clamp(16px,4.8vw,24px)",color:dark?"rgba(232,200,120,0.85)":"rgba(0,0,0,0.70)",direction:"rtl",lineHeight:1.4}}>{bismillahGlyphs}</div>
                        ):(
                          <div style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:18,color:dark?"rgba(232,200,120,0.65)":"rgba(0,0,0,0.50)",direction:"rtl",lineHeight:1.4}}>بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِيمِ</div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div key={i} className={mushafSwipeAnim==="left"?"asr-slide-left":mushafSwipeAnim==="right"?"asr-slide-right":""} style={{direction:"rtl",display:"flex",justifyContent:isCenter?"center":"space-between",alignItems:"center",maxWidth:"min(540px,90vw)",marginInline:"auto",fontFamily:`'p${mushafPage}-${fontEd}',serif`,fontSize:"clamp(20px,5vw,29px)",color:dark?"#E8DFC0":"#2D2A26",padding:"2px 0",whiteSpace:"nowrap",gap:isCenter?"0.25em":"0.10em",fontPalette:dark&&fontEd==="v4"?`--dark-p${mushafPage}-v4`:undefined}}>
                      {lineText.split(" ").map((w,wi)=><span key={wi}>{w}</span>)}
                    </div>
                  );
                });
                return (<div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"12px 8px"}}>{entries}</div>);
              })()}
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
              style={{position:"relative",flex:1,overflowY:"auto",scrollbarGutter:"stable both-edges",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",padding:`10px 6px ${haramainMeta?"120px":"60px"}`,display:"flex",flexDirection:"column",justifyContent:"flex-start"}}
            >
              {/* ── CONTINUOUS READING SURFACE ── */}
              {mushafLoading?(
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:"rgba(232,213,163,0.25)",fontSize:11,letterSpacing:".12em"}}>Loading...</div>
              ):(
                <div style={mushafPage<=2?{padding:0,flex:1,display:"flex",flexDirection:"column",minHeight:0}:{padding:0}}>
                  {(()=>{
                    const playAyahAudio = async (vk) => {
                      if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; setPlayingKey(null); }
                      const [s,a]=vk.split(":");
                      const rObj=RECITERS.find(r=>r.id===quranReciter);
                      // qulSlug → play surah file with seek+clip to ayah's [from,to]
                      if(rObj?.qulSlug){
                        try{
                          const data=await loadQulSegments(rObj.qulSlug);
                          const t=data.verses[vk];
                          if(t){
                            const url=`${data.audio_base}${String(s).padStart(3,"0")}.mp3`;
                            const au=new Audio(url); audioRef.current=au;
                            const startMs=t[0], endMs=t[1];
                            au.onloadedmetadata=()=>{ try{au.currentTime=startMs/1000;}catch{} au.play(); };
                            au.ontimeupdate=()=>{ if(au.currentTime*1000>=endMs){ try{au.pause();}catch{} setPlayingKey(null); } };
                            setPlayingKey(vk);
                            return;
                          }
                        } catch {}
                      }
                      const folder=getEveryayahFolder(quranReciter);
                      if(!folder) return;
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
                    // Frame styles — cream "paper" inside a gold ornamental
                    // border, mimicking the printed Madinah mushaf margin.
                    const frameStyle={
                      borderRadius:6,
                      background:dark?"linear-gradient(180deg,#0F1A2B 0%,#0C1526 100%)":"#FAF3E0",
                      border:dark?"1px solid #C8A24A":"2px solid #5C8A4A",
                      boxShadow:dark
                        ?"0 0 0 3px #050A14, 0 0 0 4px rgba(212,175,55,0.40), 0 8px 28px rgba(0,0,0,0.5)"
                        :"0 0 0 3px #FAF3E0, 0 0 0 5px #C8A24A, 0 8px 22px rgba(0,0,0,0.30)",
                      margin:"4px 6px",
                    };
                    // Page footer text (page number + hizb marker) — moved
                    // inside the frame so the frame visually wraps surah +
                    // juz header at top, ayat in middle, page number at
                    // bottom, like a real printed mushaf page.
                    const rubsForFooter=[];
                    (mushafVerses||[]).forEach((v,i)=>{
                      const r=v.rub_el_hizb_number;
                      if(typeof r!=="number") return;
                      const prevRub=i===0?prevPageLastRub[mushafPage]:mushafVerses[i-1]?.rub_el_hizb_number;
                      if(prevRub===undefined||prevRub===r) return;
                      rubsForFooter.push(r);
                    });
                    if(mushafPage===1&&rubsForFooter.length===0&&mushafVerses?.[0]?.rub_el_hizb_number===1){
                      rubsForFooter.push(1);
                    }
                    const _r=rubsForFooter[0];
                    let _hizbLabel=null;
                    if(_r!=null){
                      const _pos=((_r-1)%4)+1;
                      const _hizb=Math.ceil(_r/4);
                      _hizbLabel=_pos===1?`Hizb ${_hizb}`:_pos===2?`1/4 Hizb ${_hizb}`:_pos===3?`1/2 Hizb ${_hizb}`:`3/4 Hizb ${_hizb}`;
                    }
                    const _isOdd=mushafPage%2===1;
                    const _pageFooterText=_isOdd
                      ? (_hizbLabel?`${_hizbLabel} | Page ${mushafPage}`:`Page ${mushafPage}`)
                      : (_hizbLabel?`Page ${mushafPage} | ${_hizbLabel}`:`Page ${mushafPage}`);
                    return (<div style={mushafPage<=2?{padding:"12px 14px",position:"relative",flex:1,display:"flex",flexDirection:"column",minHeight:0,...frameStyle}:{padding:"12px 14px",position:"relative",...frameStyle}}>
                      {(curSurahNum||mushafJuzNum)&&(
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:dark?"#E8C76A":"#6B4F00",marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${dark?"rgba(212,175,55,0.20)":"rgba(140,100,20,0.20)"}`}}>
                          <span>{curSurahNum?(SURAH_EN[curSurahNum]||""):""}</span>
                          <span>{mushafJuzNum?`Juz ${mushafJuzNum}`:""}</span>
                        </div>
                      )}
                      {(()=>{
                        const fontEd=tajweedFont?"v4":"v2";
                        const pageFontReady=loadedFonts.has(`${fontEd}-${mushafPage}`);
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
                        // Tap mapping uses glyphVerseKeys — a flat per-glyph
                        // verse_key array we built from code_v2 against our
                        // pageContentMap. Independent of the API's mushaf
                        // edition (which differs from KFGQPC v2 on some
                        // pages), so taps land on the right ayah everywhere.
                        let glyphCursor=0;
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
                                {bismillahGlyphs&&loadedFonts.has(`${tajweedFont?"v4":"v2"}-1`)?(
                                  <div style={{fontFamily:`'p1-${tajweedFont?"v4":"v2"}',serif`,fontSize:"clamp(16px,4.8vw,24px)",color:dark?"rgba(232,200,120,0.85)":"rgba(0,0,0,0.70)",direction:"rtl",lineHeight:1.4}}>{bismillahGlyphs}</div>
                                ):(
                                  <div style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:18,color:dark?"rgba(232,200,120,0.65)":"rgba(0,0,0,0.50)",direction:"rtl",lineHeight:1.4}}>بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِيمِ</div>
                                )}
                              </div>
                            );
                          }
                          const tokens=lineText.split(" ");
                          // glyphVerseKeys is one entry per individual PUA glyph,
                          // but a pages.json token can contain 2+ glyphs (e.g. an
                          // end-of-ayah marker fused to the previous letter:
                          // "ﱜﱝ"). Walk by glyph count, not token count, so the
                          // cursor stays aligned with the flat array.
                          const tokenStartGlyph=[];
                          let rowGlyphs=0;
                          tokens.forEach(t=>{ tokenStartGlyph.push(rowGlyphs); rowGlyphs+=t.length; });
                          const rowStart=glyphCursor;
                          glyphCursor+=rowGlyphs;
                          const pickAyah=(vk)=>{setSelectedAyah(vk);setDrawerView("default");setTimeout(()=>{try{window.scrollTo({top:0,behavior:"smooth"});document.querySelectorAll('[class*="fi"]').forEach(el=>{if(el.scrollTop>0)el.scrollTo({top:0,behavior:"smooth"});});}catch{}},10);};
                          return (
                          <div key={i} style={{direction:"rtl",display:"flex",justifyContent:isCenter?"center":"space-between",alignItems:"center",maxWidth:"min(540px,90vw)",marginInline:"auto",fontFamily:`'p${mushafPage}-${fontEd}',serif`,fontSize:"clamp(20px,5vw,29px)",color:dark?"#E8DFC0":"#2D2A26",padding:"2px 0",whiteSpace:"nowrap",gap:isCenter?"0.25em":"0.10em",fontPalette:dark&&fontEd==="v4"?`--dark-p${mushafPage}-v4`:undefined}}>
                            {tokens.map((w,wi)=>{
                              const vk=glyphVerseKeys[rowStart+tokenStartGlyph[wi]]||glyphVerseKeys[rowStart+rowGlyphs-1];
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
                      <div style={{textAlign:_isOdd?"right":"left",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:dark?"rgba(217,177,95,0.55)":"#6B645A",letterSpacing:".06em",marginTop:12,paddingTop:8,borderTop:`1px solid ${dark?"rgba(212,175,55,0.15)":"rgba(140,100,20,0.15)"}`}}>
                        {_pageFooterText}
                      </div>
                    </div>);
                  })()}
                </div>
              )}

              {/* ── UNIFIED 50% DRAWER ── (skip for tafsir — renders inline above) */}
              {(selectedAyah||drawerView==="bookmarks")&&drawerView!=="tafsir"&&drawerView!=="translation"&&drawerView!=="tafsir-page"&&(()=>{
                const [sNum,aNum] = (selectedAyah||"").split(":");
                const surahN = parseInt(sNum,10);
                const selVerse = (mushafVerses||[]).find(v=>v.verse_key===selectedAyah);
                const transText = selVerse?._translation || translations[selectedAyah] || "";
                if(!transText && selVerse) fetchTranslations([selVerse]);
                // Single-ayah Play button should only show Stop when the
                // user explicitly started single-ayah playback — not when the
                // Play Range happens to be passing through this ayah.
                const isPlaying = !mushafAudioPlaying && playingKey === selectedAyah;
                const playAyahAudio = async (vk) => {
                  if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; setPlayingKey(null); }
                  const [s,a]=vk.split(":");
                  const rObj=RECITERS.find(r=>r.id===quranReciter);
                  if(rObj?.qulSlug){
                    try{
                      const data=await loadQulSegments(rObj.qulSlug);
                      const t=data.verses[vk];
                      if(t){
                        const url=`${data.audio_base}${String(s).padStart(3,"0")}.mp3`;
                        const au=new Audio(url); audioRef.current=au;
                        const startMs=t[0], endMs=t[1];
                        au.onloadedmetadata=()=>{ try{au.currentTime=startMs/1000;}catch{} au.play(); };
                        au.ontimeupdate=()=>{ if(au.currentTime*1000>=endMs){ try{au.pause();}catch{} setPlayingKey(null); } };
                        setPlayingKey(vk);
                        return;
                      }
                    } catch {}
                  }
                  const folder=getEveryayahFolder(quranReciter);
                  if(!folder) return;
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
                      background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",
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
                          <div style={{direction:"rtl",textAlign:"center",fontFamily:`'p${mushafPage}-${tajweedFont?"v4":"v2"}',serif`,fontSize:"clamp(20px,5vw,28px)",lineHeight:1.9,color:dark?"#E8DFC0":"#2D2A26",padding:"6px 4px 10px",flexShrink:0}}>
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
                            mushafAudioPlaying
                              ? {icon:"⏹", label:"Stop", action:()=>{ stopMushafAudio(); }}
                              : {icon:"⏭", label:"Play Range", action:()=>{ stopMushafAudio();setMushafRangeStart(null);setMushafRangeEnd(null);setShowMushafRangePicker(true); }},
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



        </div>
  );
}
