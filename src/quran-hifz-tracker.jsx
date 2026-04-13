import { useState, useEffect, useRef, useMemo } from "react";
import MUTASHABIHAT from "./mutashabihat.json";
import { QURAN_RECITERS, RECITERS, SURAH_EN, SURAH_AYAH_COUNTS, JUZ_RANGES, DARK, LIGHT, STATUS_CFG, MONTH_NAMES, TODAY, DATEKEY, FMTDATE } from "./data/constants";
import { SESSIONS, getSessionWisdom } from "./data/sessions";
import { SURAH_AR, JUZ_OPENERS, JUZ_META, JUZ_SURAHS } from "./data/quran-metadata";
import { LIVE_STREAMS, RAMADAN_NIGHTS_MAKKAH, RAMADAN_NIGHTS_MADINAH, MAKKAH_IMAMS, MADINAH_IMAMS, HARAMAIN_SURAHS } from "./data/haramain";
import { mushafImageUrl, audioUrl, audioUrlFallback, toArabicDigits, calcTimeline, loadCompletedAyahs, saveCompletedAyahs, expandRangeToKeys, getJuzKeys } from "./utils";
import HlsPlayer from "./components/HlsPlayer";
import AsrSessionView from "./components/AsrSessionView";
import QuranPageView from "./components/QuranPageView";
import useHifzProgress from "./hooks/useHifzProgress";
import useAudio from "./hooks/useAudio";
import MasjidaynTab from "./tabs/MasjidaynTab";

export default function RihlatAlHifz() {
  const [dark,setDark]=useState(true);
  const [showSettings,setShowSettings]=useState(false);
  const [twoPageWarning,setTwoPageWarning]=useState(null); // {target, actual} | null
  const [showDua,setShowDua]=useState(true);
  const [showOnboarding, setShowOnboarding]=useState(()=>!localStorage.getItem("rihlat-onboarded"));
  const [onboardStep,setOnboardStep]=useState(1);
  const [visibleOnboardJuzCount,setVisibleOnboardJuzCount]=useState(5);
  const [userName,setUserName]=useState("");
  const [openJuzPanel,setOpenJuzPanel]=useState(null);
  const [repCounts,setRepCounts]=useState({});
  const [connectionPhase,setConnectionPhase]=useState(false); // true = linking ayahs together
  const [connectionReps,setConnectionReps]=useState({}); // "pair-0-1":count, "all":count
  const [hifzViewMode,setHifzViewMode]=useState("interactive"); // "interactive" or "mushaf"
  const [todayFajrBatch,setTodayFajrBatch]=useState([]); // saved when Fajr has ayahs, used by Maghrib/Isha
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
  const [looping, setLooping]=useState(false);
  const [openAyah,setOpenAyah]=useState(null);
  const [activeSessionIndex,setActiveSessionIndex_]=useState(0);
  const setActiveSessionIndex=(v)=>{setActiveSessionIndex_(v);scrollAllToTop();};
  const SESSION_CTA=["Finish Fajr — Well Done","Finish Dhuhr — Solid Review","Finish Asr — Great Effort","Finish Maghrib — Beautifully Done","Finish Isha — Day Complete"];
  const [sessionsCompleted,setSessionsCompleted]=useState({fajr:false,dhuhr:false,asr:false,maghrib:false,isha:false});
  const [duaIdx,setDuaIdx]=useState(()=>Math.floor(Math.random()*6));
  const [activeTab,setActiveTab_]=useState("rihlah");
  const scrollAllToTop=()=>{if(showOnboarding) return;setTimeout(()=>{document.querySelectorAll('.fi, [class*="fi"]').forEach(el=>el.scrollTop=0);document.querySelectorAll('div').forEach(el=>{const s=getComputedStyle(el);if(s.overflowY==='auto'||s.overflowY==='scroll')el.scrollTop=0;});window.scrollTo(0,0);},50);};
  const setActiveTab=(tab)=>{setActiveTab_(tab);scrollAllToTop();};
  const [selectedJuz,setSelectedJuz]=useState(30);
  const [allVerses,setAllVerses]=useState([]);
  const [loading,setLoading]=useState(false);
  const [loadMsg,setLoadMsg]=useState("");
  const [fetchError,setFetchError]=useState(false);
  const [juzStatus,setJuzStatus]=useState({});
  // V9 — ayah-based source of truth
  const [completedAyahs,setCompletedAyahs]=useState(()=>loadCompletedAyahs());
  const [notes,setNotes]=useState({});
  const [loaded,setLoaded]=useState(false);
  const [fontSize,setFontSize]=useState(20);
  const [quranShowCount,setQuranShowCount]=useState(5);
  const [quranPage,setQuranPage]=useState(0);
  const [quranPageDir,setQuranPageDir]=useState(null);
  const quranTouchRef=useRef(0);
  const mushafImgRef=useRef(null);
  const quranContentRef=useRef(null);
  const quranPageRef=useRef(null);
  const [quranContainerH,setQuranContainerH]=useState(0);
  const [mushafPage,setMushafPage]=useState(()=>{try{return parseInt(localStorage.getItem("jalil-quran-lastpage"))||1;}catch{return 1;}});
  const [mushafSwipeAnim,setMushafSwipeAnim]=useState("idle"); // "idle"|"exit-left"|"exit-right"
  const [croppedPages,setCroppedPages]=useState({});
  const [quranMode,setQuranMode]=useState("interactive"); // "mushaf" | "interactive"
  const [selectedAyah,setSelectedAyah]=useState(null);
  const [drawerView,setDrawerView]=useState("default"); // "default"|"tafsir"|"reflect"|"bookmarks"
  const [showTranslation,setShowTranslation]=useState(true);
  const [showReflect,setShowReflect]=useState(false); // legacy, replaced by drawerView
  const [reflections,setReflections]=useState(()=>{try{return JSON.parse(localStorage.getItem("rihlat-reflections")||"{}");}catch{return {};}});
  const [tafsirOn,setTafsirOn]=useState(false);
  const [tafsirAyah,setTafsirAyah]=useState(null);
  const [tafsirData,setTafsirData]=useState({});
  const [tafsirTab,setTafsirTab]=useState("sadi");
  const [mushafVerses,setMushafVerses]=useState([]);
  const [mushafLoading,setMushafLoading]=useState(false);
  const [mushafSurahInfo,setMushafSurahInfo]=useState("");
  const [showSurahPicker,setShowSurahPicker]=useState(false);
  const [showQuranJuzModal,setShowQuranJuzModal]=useState(false);
  const [showQuranSurahModal,setShowQuranSurahModal]=useState(false);
  const [selectedSurahNum,setSelectedSurahNum]=useState(1);
  const [mushafLayout,setMushafLayout]=useState(null); // loaded from /quran-layout.json
  const [mushafWords,setMushafWords]=useState([]);
  const [mushafPageLines,setMushafPageLines]=useState([]);
  const [qpcPages,setQpcPages]=useState(null);
  const [showMushafSheet,setShowMushafSheet]=useState(false);
  const [mushafBookmarks,setMushafBookmarks]=useState(()=>{try{return JSON.parse(localStorage.getItem("rihlat-mushaf-bookmarks")||"[]");}catch{return [];}});
  
  const [showMushafRangePicker,setShowMushafRangePicker]=useState(false);
  const [mushafRangeStart,setMushafRangeStart]=useState(null);
  const [mushafRangeEnd,setMushafRangeEnd]=useState(null);
  const [mushafJuzNum,setMushafJuzNum]=useState(1);
  const [mushafSurahNum,setMushafSurahNum]=useState(1);
  const [quranPageBreaks,setQuranPageBreaks]=useState([0]);
  const [openSurah,setOpenSurah]=useState(null);
  const [goalYears,setGoalYears]=useState(3);
  const [goalMonths,setGoalMonths]=useState(1);
  const [openMethod,setOpenMethod]=useState(null);
  const [sessionJuz,setSessionJuz]=useState(null);
  const [sessionIdx,setSessionIdx]=useState(0);
  const [juzProgress,setJuzProgress]=useState({});
  const [sessionDone,setSessionDone]=useState([]);
  const [sessionVerses,setSessionVerses]=useState([]);
  const [yesterdayBatch,setYesterdayBatch]=useState([]);
  const [recentBatches,setRecentBatches]=useState([]); // last 5 days of fajr batches
  const [asrSelectedSurahs,setAsrSelectedSurahs]=useState([]);
  const [asrSelectedJuz,setAsrSelectedJuz]=useState([]);
  const [asrReviewBatch,setAsrReviewBatch]=useState([]);
  const [sessLoading,setSessLoading]=useState(false);
  const [sessError,setSessError]=useState(false);
  const AYAHS_PER_PAGE = 5;
  const [ayahPage, setAyahPage_] = useState(0);
  const setAyahPage=(v)=>{setAyahPage_(v);scrollAllToTop();};
  const [asrStarted,setAsrStarted]=useState(false);
  const [asrIsCustomized,setAsrIsCustomized]=useState(false); // session-scoped, never persisted
  const [asrActiveJuzPanel,setAsrActiveJuzPanel]=useState(null);
  const [asrSurahShowCount,setAsrSurahShowCount]=useState(10);
  const [memSections,setMemSections]=useState({completed:false,inprogress:true,upcoming:false,upcomingAll:false});
  const [asrPage,setAsrPage_]=useState(0);
  const setAsrPage=(v)=>{setAsrPage_(v);scrollAllToTop();};
  const [asrSlideDir,setAsrSlideDir]=useState(null);
  const [asrExpandedAyah,setAsrExpandedAyah]=useState(null);
  const [juzCompletedInSession,setJuzCompletedInSession]=useState(new Set());
  const asrTouchStartRef=useRef(null);
  const [dailyChecks,setDailyChecks]=useState({date:TODAY()});

  const JUZ_PAGES=[1,22,42,62,82,102,121,142,162,182,201,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582,605];
  const SURAH_PAGES={1:1,2:2,3:50,4:77,5:106,6:128,7:151,8:177,9:187,10:208,11:221,12:235,13:249,14:255,15:262,16:267,17:282,18:293,19:305,20:312,21:322,22:332,23:342,24:350,25:359,26:367,27:377,28:385,29:396,30:404,31:411,32:415,33:418,34:428,35:434,36:440,37:446,38:453,39:458,40:467,41:477,42:483,43:489,44:496,45:499,46:502,47:507,48:511,49:515,50:518,51:520,52:523,53:526,54:528,55:531,56:534,57:537,58:542,59:545,60:549,61:551,62:553,63:554,64:556,65:558,66:560,67:562,68:564,69:566,70:568,71:570,72:572,73:574,74:575,75:577,76:578,77:580,78:582,79:583,80:585,81:586,82:587,83:587,84:589,85:590,86:591,87:591,88:592,89:593,90:594,91:595,92:595,93:596,94:596,95:597,96:597,97:598,98:598,99:599,100:599,101:600,102:600,103:601,104:601,105:601,106:602,107:602,108:602,109:603,110:603,111:603,112:604,113:604,114:604};
  const TAFSIR_SOURCES=[{id:"sadi",apiId:91,name:"As-Sa'di",lang:"ar"},{id:"muyassar",apiId:16,name:"Al-Muyassar",lang:"ar"},{id:"kathir",apiId:169,name:"Ibn Kathir",lang:"en"}];

  const {
    v9MarkJuzComplete, v9MarkJuzIncomplete, v9MarkSurahComplete, v9MarkSurahIncomplete,
    v9JuzProgress, v9IsJuzComplete, isSurahComplete, hasAnyAyahsInJuz,
    memorizedAyahs, totalAyahsInQuran, pct, completedCount, completedSurahCount,
  } = useHifzProgress(completedAyahs, setCompletedAyahs);

  // Load mushaf layout once
  useEffect(()=>{
    fetch("/quran-layout.json").then(r=>r.json()).then(d=>setMushafLayout(d)).catch(()=>{});
  },[]);

  // Bookmark last mushaf page
  useEffect(()=>{try{localStorage.setItem("jalil-quran-lastpage",String(mushafPage));}catch{}},[mushafPage]);

  // Load QPC mushaf pages data
  useEffect(()=>{
    if(qpcPages) return;
    fetch("/mushaf-pages.json").then(r=>r.json()).then(d=>setQpcPages(d)).catch(()=>{});
  },[]);

  useEffect(() => {
    if (activeTab !== "quran") return;
    let cancelled = false;
    (async () => {
      setMushafLoading(true);
      try {
        // Use same source as My Hifz — qurancdn returns clean text_uthmani, no stray tokens
        const [textRes, transRes] = await Promise.all([
          fetch(`https://api.quran.com/api/v4/verses/by_page/${mushafPage}?words=false&fields=text_uthmani,verse_key,juz_number&per_page=50`),
          fetch(`https://api.quran.com/api/v4/verses/by_page/${mushafPage}?per_page=50&translations=203&fields=verse_key`)
        ]);
        if (!textRes.ok) throw new Error();
        const textData = await textRes.json();
        if (cancelled) return;
        const vs = textData.verses || [];
        // Merge translations if available
        if (transRes.ok) {
          const transData = await transRes.json();
          const transMap = {};
          (transData.verses||[]).forEach(v => { transMap[v.verse_key] = v.translations?.[0]?.text || ""; });
          vs.forEach(v => { v._translation = (transMap[v.verse_key]||"").replace(/<sup[^>]*>.*?<\/sup>/gi,"").replace(/<[^>]+>/g,"").replace(/\s*,\s*,/g,",").replace(/\s*,\s*$/,"").replace(/\s{2,}/g," ").trim(); });
        }
        // Fix U+06DF (small high rounded zero) → remove it for UthmanicHafs compatibility
        vs.forEach(v => { if(v.text_uthmani) v.text_uthmani = v.text_uthmani.replace(/\u06DF/g, "\u0652"); });
        setMushafVerses(vs);
        setMushafPageLines([]);
        if (vs.length > 0) {
          setMushafJuzNum(vs[0].juz_number || 1);
          const surahNums = [...new Set(vs.map(v => parseInt(v.verse_key.split(":")[0], 10)))];
          // Only auto-detect surah if user didn't explicitly pick one (surah selector sets it directly)
          setMushafSurahNum(prev => surahNums.includes(prev) ? prev : surahNums[0]||1);
          setMushafSurahInfo(surahNums.map(n => SURAH_EN[n] || "").filter(Boolean).join(" · "));
          setSelectedSurahNum(prev => surahNums.includes(prev) ? prev : surahNums[0]||1);
        } else {
          setMushafJuzNum(1); setMushafSurahInfo("");
        }
      } catch(err) {
        setMushafVerses([]); setMushafPageLines([]);
      } finally {
        if (!cancelled) setMushafLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, mushafPage]);

  // Auto-crop white margins from mushaf page image
  function cropMushafImage(imgUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imgUrl;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        let imageData;
        try { imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); }
        catch(e) { resolve(imgUrl); return; }
        const data = imageData.data;
        let top = 0, bottom = canvas.height - 1, left = 0, right = canvas.width - 1;
        const isWhite = (r,g,b) => r > 240 && g > 240 && b > 240;
        outer: for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if (!isWhite(data[i],data[i+1],data[i+2])) { top = y; break outer; }
          }
        }
        outer: for (let y = canvas.height - 1; y >= 0; y--) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if (!isWhite(data[i],data[i+1],data[i+2])) { bottom = y; break outer; }
          }
        }
        outer: for (let x = 0; x < canvas.width; x++) {
          for (let y = 0; y < canvas.height; y++) {
            const i = (y * canvas.width + x) * 4;
            if (!isWhite(data[i],data[i+1],data[i+2])) { left = x; break outer; }
          }
        }
        outer: for (let x = canvas.width - 1; x >= 0; x--) {
          for (let y = 0; y < canvas.height; y++) {
            const i = (y * canvas.width + x) * 4;
            if (!isWhite(data[i],data[i+1],data[i+2])) { right = x; break outer; }
          }
        }
        const w = right - left;
        const h = bottom - top;
        const out = document.createElement("canvas");
        out.width = w; out.height = h;
        out.getContext("2d").drawImage(canvas, left, top, w, h, 0, 0, w, h);
        resolve(out.toDataURL());
      };
      img.onerror = () => resolve(imgUrl);
    });
  }

  // Crop on page change (cache result so we don't re-crop)
  useEffect(() => {
    if (activeTab !== "quran" || quranMode !== "mushaf") return;
    if (croppedPages[mushafPage]) return;
    const url = mushafImageUrl(mushafPage);
    cropMushafImage(url).then(cropped => {
      setCroppedPages(prev => ({...prev, [mushafPage]: cropped}));
    });
  }, [mushafPage, activeTab, quranMode]);

  // Measure custom Quran page container for font size calculation
  useEffect(()=>{
    if(!quranPageRef.current) return;
    const obs=new ResizeObserver(([entry])=>{
      const h=entry.contentRect.height;
      if(h>0) setQuranContainerH(h);
    });
    obs.observe(quranPageRef.current);
    return()=>obs.disconnect();
  },[quranMode,activeTab]);

  // Parse tafsir text — separate Arabic from English into clean blocks
  function parseTafsirBlocks(text) {
    if(!text) return [];
    const blocks = [];
    // Match any sequence containing Arabic letters (including diacritics, spaces between Arabic words)
    // This catches: standalone Arabic phrases, Arabic embedded in English, hadith quotes, ayah references
    const arabicRun = /([\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\s\u060C\u061B\u061F،؛؟\-.:!]*[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF])/g;
    let lastIdx = 0;
    let match;
    while((match = arabicRun.exec(text)) !== null) {
      const ar = match[0].trim();
      // Only treat as a block if it has at least 2 actual Arabic characters (skip lone chars)
      const arabicCharCount = (ar.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g)||[]).length;
      if(arabicCharCount < 2) continue;
      // English before this Arabic block
      if(match.index > lastIdx) {
        const eng = text.slice(lastIdx, match.index).trim();
        // Clean up dangling punctuation like trailing commas, quotes, brackets
        const cleaned = eng.replace(/^[,\s;:]+|[,\s;:]+$/g,"").trim();
        if(cleaned) blocks.push({type:"english", text:cleaned});
      }
      blocks.push({type:"arabic", text:ar});
      lastIdx = match.index + match[0].length;
    }
    // Remaining English after last Arabic block
    if(lastIdx < text.length) {
      const tail = text.slice(lastIdx).trim().replace(/^[,\s;:()]+|[,\s;:()]+$/g,"").trim();
      if(tail) blocks.push({type:"english", text:tail});
    }
    // If no Arabic found, split by paragraphs
    if(blocks.length === 0) {
      return text.split(/\n\n+/).filter(Boolean).map(p => ({type:"english", text:p.trim()}));
    }
    return blocks;
  }

  async function fetchTafsir(verseKey){
    setTafsirAyah(verseKey);
    const sources=TAFSIR_SOURCES;
    const updates={};
    for(const src of sources){
      const cacheKey=`${src.id}-${verseKey}`;
      if(tafsirData[cacheKey]) continue;
      try {
        const res=await fetch(`https://api.quran.com/api/v4/tafsirs/${src.apiId}/by_ayah/${verseKey}`);
        if(!res.ok) continue;
        const data=await res.json();
        const text=(data.tafsir?.text||"").replace(/<[^>]+>/g,"").trim();
        updates[cacheKey]=text;
      } catch {}
    }
    if(Object.keys(updates).length) setTafsirData(prev=>({...prev,...updates}));
  }

  useEffect(()=>{
    if(!loaded) return;
    const isJuzDone=(juzNum)=>{
      if(juzStatus[juzNum]==="complete") return true;
      const surahs=JUZ_SURAHS[juzNum]||[];
      return surahs.length>0&&surahs.every(s=>juzStatus[`s${s.s}`]==="complete");
    };
    let next=null;
    for(let j=30;j>=1;j--){
      if(!isJuzDone(j)){ next=j; break; }
    }
    const target=next||30;
    console.log('[INIT]', {target, sessionJuz, willUpdate: target!==sessionJuz, juz30done: isJuzDone(30), juz29done: isJuzDone(29), juz28done: isJuzDone(28), s67: juzStatus['s67'], s68: juzStatus['s68'], juz29status: juzStatus[29], juz30status: juzStatus[30]});
    if(target!==sessionJuz) setSessionJuz(target);
  },[loaded,juzStatus]);


  const [streak,setStreak]=useState(0);
  const [checkHistory,setCheckHistory]=useState({});
  const [calMonth,setCalMonth]=useState(new Date().getMonth());
  const [calYear,setCalYear]=useState(new Date().getFullYear());
  const [reciter,setReciter]=useState("dosari");
  const [quranReciter,setQuranReciter]=useState("dosari");
  const [showReciterModal,setShowReciterModal]=useState(false);
  const [reciterMode,setReciterMode]=useState("hifz");
  const [showJuzModal,setShowJuzModal]=useState(false);
  const [activeStream,setActiveStream]=useState(0);
  const [masjidaynTab, setMasjidaynTab_]=useState("ramadan");
  const setMasjidaynTab=(tab)=>{setMasjidaynTab_(tab);scrollAllToTop();};
  const [rihlahTab, setRihlahTab_]=useState("juz");
  const rihlahScrollRef=useRef(null);
  const setRihlahTab=(tab)=>{setRihlahTab_(tab);scrollAllToTop();};
  const [haramainMosque,setHaramainMosque]=useState("makkah");
  const [openImam,setOpenImam]=useState(null);
  const [haramainPlaying,setHaramainPlaying]=useState(null);
  const haramainRef=useRef(null);
  const [showTrans,setShowTrans]=useState(true);
  const [translations,setTranslations]=useState({});
  const touchStartRef=useRef(0);
  const [ramadanMosque,setRamadanMosque]=useState("makkah");
  const [liveSource,setLiveSource]=useState("aloula");
  const [selectedRamadanNight,setSelectedRamadanNight]=useState(null);
  const [ramadanVideoType,setRamadanVideoType]=useState("taraweeh"); // "taraweeh" | "tahajjud"
  const T=dark?DARK:LIGHT;

  useEffect(()=>{
    const l=document.createElement("link"); l.rel="stylesheet";
    l.href="https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&family=Playfair+Display:wght@600;700&family=IBM+Plex+Mono:wght@400;600&family=DM+Sans:wght@400;500;600&display=swap";
    // Load UthmanicHafs for Interactive Quran mode — served locally to avoid CORS
    const ufs=document.createElement("style");
    ufs.textContent="@font-face{font-family:'UthmanicHafs';src:url('/UthmanicHafs1Ver18.woff2') format('woff2');font-display:swap;}@font-face{font-family:'KFGQPC';src:url('/fonts/KFGQPC.otf') format('opentype');font-display:swap;}@font-face{font-family:'KFGQPC Uthmanic Script HAFS';src:url('/fonts/KFGQPC.otf') format('opentype');font-display:swap;}";
    document.head.appendChild(ufs);
    document.head.appendChild(l);
  },[]);

  useEffect(()=>{
    try {
      const d=localStorage.getItem("jalil-quran-v8");
      if(d){
        const p=JSON.parse(d);
        setJuzStatus(p.juzStatus||{});
        setNotes(p.notes||{});
        setGoalYears(p.goalYears||3);
        if(p.goalMonths!==undefined) setGoalMonths(p.goalMonths);
        setSessionJuz(p.sessionJuz ?? null);
        setSessionIdx(p.sessionIdx||0);
        setJuzProgress(p.juzProgress||{});
        setSessionDone(p.sessionDone||[]);
        setYesterdayBatch(p.yesterdayBatch||[]);
        setRecentBatches(p.recentBatches||[]);
        setAsrSelectedSurahs(p.asrSelectedSurahs||[]);
        setAsrSelectedJuz(p.asrSelectedJuz||[]);
        setAsrReviewBatch(p.asrReviewBatch||[]);
        if(p.dark!==undefined) setDark(p.dark);
        if(p.streak!==undefined) setStreak(p.streak);
        if(p.checkHistory) setCheckHistory(p.checkHistory);
        if(p.reciter) setReciter(p.reciter);
        if(p.showTrans!==undefined) setShowTrans(p.showTrans);
        if(p.activeSessionIndex!==undefined) setActiveSessionIndex(p.activeSessionIndex);
        if(p.sessionsCompleted) setSessionsCompleted(p.sessionsCompleted);
        const today=TODAY();
        if(p.dailyChecks?.date===today) setDailyChecks(p.dailyChecks);
        else {
          const prev=p.dailyChecks||{};
          const wasComplete=SESSIONS.every(s=>prev[s.id]);
          setStreak(wasComplete?(p.streak||0)+1:0);
          setDailyChecks({date:today});
        }
      }
    } catch {}
    // One-time backfill: sync juzStatus into completedAyahs
    try {
      const p=JSON.parse(localStorage.getItem("jalil-quran-v8")||"{}");
      const jp=p.juzProgress||{};
      const js=p.juzStatus||{};
      const ca=loadCompletedAyahs();
      const prevSize=ca.size;
      // Add all ayahs for completed juz (numeric keys like 30: "complete")
      Object.entries(js).forEach(([k,v])=>{
        const n=Number(k);
        if(v==="complete"&&!isNaN(n)&&n>=1&&n<=30){
          getJuzKeys(n).forEach(key=>ca.add(key));
        }
      });
      // Add all ayahs for completed surahs (keys like s77: "complete")
      Object.entries(js).forEach(([k,v])=>{
        if(v==="complete"&&k.startsWith("s")){
          const sn=Number(k.slice(1));
          if(sn>=1&&sn<=114){
            const total=SURAH_AYAH_COUNTS[sn]||0;
            for(let i=1;i<=total;i++) ca.add(`${sn}:${i}`);
          }
        }
      });
      const added=ca.size-prevSize;
      console.log('[V9 BACKFILL]',{juzStatus:js,prevSize,newSize:ca.size,added});
      if(added>0){saveCompletedAyahs(ca);setCompletedAyahs(ca);}
    } catch(e){console.error('[V9 BACKFILL ERROR]',e);}
    setLoaded(true);
  },[]);

  useEffect(()=>{
    if(!loaded) return;
    try { localStorage.setItem("jalil-quran-v8",JSON.stringify({juzStatus,notes,goalYears,goalMonths,sessionJuz,sessionIdx,juzProgress,sessionDone,yesterdayBatch,recentBatches,asrSelectedSurahs,asrSelectedJuz,asrReviewBatch,dark,dailyChecks,streak,checkHistory,reciter,showTrans,activeSessionIndex,sessionsCompleted})); } catch {}
  },[juzStatus,notes,goalYears,goalMonths,sessionJuz,sessionIdx,juzProgress,sessionDone,yesterdayBatch,recentBatches,asrSelectedSurahs,asrSelectedJuz,asrReviewBatch,dark,dailyChecks,streak,checkHistory,reciter,showTrans,loaded,activeSessionIndex,sessionsCompleted]);

  // Reset sessionDone when Juz changes so stale batch keys don't show completion screen
  useEffect(()=>{
    if(!sessionJuz) return;
    setSessionDone([]);
  },[sessionJuz]);

  // Fetch session verses (wait for loaded so backfill completes first)
  useEffect(()=>{
    if(!sessionJuz||!loaded) return;
    console.log('[FETCH START]', {sessionJuz, 'juzProgress[sessionJuz]': juzProgress[sessionJuz]});
    let cancelled=false;
    (async()=>{
      setSessLoading(true); setSessionVerses([]); setSessError(false);
      try {
        // Load full surahs (by chapter) for each surah in this juz — ensures surahs start at ayah 1
        // even if they span multiple juz (e.g. Fussilat spans Juz 24 & 25)
        const surahsInJuz=(JUZ_SURAHS[sessionJuz]||[]).map(item=>item.s);
        let all=[];
        for(const surahNum of surahsInJuz){
          let page=1,tp=1;
          do {
            const res=await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surahNum}?words=false&fields=text_uthmani,verse_key,surah_number,page_number&per_page=300&page=${page}`);
            if(!res.ok) throw new Error();
            const data=await res.json();
            if(cancelled) return;
            all=[...all,...(data.verses||[])]; tp=data.pagination?.total_pages||1; page++;
          } while(page<=tp);
        }

        // Fix U+06DF dots for UthmanicHafs font
        all.forEach(v=>{ if(v.text_uthmani) v.text_uthmani=v.text_uthmani.replace(/\u06DF/g,"\u0652"); });

        // 1) Get this juz's surahs in descending memorization order
        const descendingSurahOrder=[...(JUZ_SURAHS[sessionJuz]||[])].map(item=>item.s).reverse();

        // If whole Juz is already complete (verify all surahs too), show full progress
        const juzSurahList=JUZ_SURAHS[sessionJuz]||[];
        const allSurahsActuallyDone=juzSurahList.length>0&&juzSurahList.every(s=>juzStatus[`s${s.s}`]==="complete");
        if(juzStatus[sessionJuz]==="complete"&&allSurahsActuallyDone){
          if(!cancelled){ setSessionVerses(all); setSessionIdx(all.length); }
          if(!cancelled) setSessLoading(false);
          return;
        }

        // 2) Remove surahs already marked complete
        const unfinishedVerses=all.filter(v=>{
          const surahNum=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);
          return juzStatus[`s${surahNum}`]!=="complete";
        });

        // 3) Sort by descending surah order, then ayah ASC inside each surah
        const orderedVerses=unfinishedVerses.sort((a,b)=>{
          const surahA=a.surah_number||parseInt(a.verse_key?.split(":")?.[0],10);
          const surahB=b.surah_number||parseInt(b.verse_key?.split(":")?.[0],10);
          const ayahA=parseInt(a.verse_key?.split(":")?.[1],10);
          const ayahB=parseInt(b.verse_key?.split(":")?.[1],10);
          const idxA=descendingSurahOrder.indexOf(surahA);
          const idxB=descendingSurahOrder.indexOf(surahB);
          if(idxA!==idxB) return idxA-idxB;
          return ayahA-ayahB;
        });

        if(!cancelled){
          const surahsInOrder=[...new Set(orderedVerses.map(v=>v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10)))];
          // Calculate progress from completedAyahs — read fresh from localStorage to avoid stale closure
          const freshCompleted = loadCompletedAyahs();
          let newIdx=0;
          for(let i=0;i<orderedVerses.length;i++){
            if(freshCompleted.has(orderedVerses[i].verse_key)) newIdx=i+1;
            else break;
          }
          // Fallback: if V9 is empty but juzProgress has data, use that and backfill
          const savedProgress=juzProgress[sessionJuz]||0;
          if(newIdx===0 && savedProgress>0 && savedProgress<=orderedVerses.length){
            newIdx=savedProgress;
            // Backfill these ayahs into V9 now
            const toBackfill=orderedVerses.slice(0,newIdx);
            toBackfill.forEach(v=>{if(v.verse_key) freshCompleted.add(v.verse_key);});
            saveCompletedAyahs(freshCompleted);
            setCompletedAyahs(freshCompleted);
            console.log('[PROGRESS BACKFILL]',{savedProgress,backfilled:toBackfill.length});
          }
          console.log('[FETCH DONE]', {sessionJuz, totalVerses: all.length, unfinished: unfinishedVerses.length, ordered: orderedVerses.length, surahsInOrder, newSessionIdx: newIdx, completedAyahsSize: freshCompleted.size, first5: orderedVerses.slice(0,5).map(v=>v.verse_key), verseAtIdx: orderedVerses[newIdx]?.verse_key});
          setSessionVerses(orderedVerses); setSessionIdx(newIdx);
          // Backfill: add already-progressed ayahs to completedAyahs
          if(newIdx>0){
            const toAdd=orderedVerses.slice(0,newIdx);
            console.log('[BACKFILL]', {newIdx, toAdd: toAdd.length, keys: toAdd.slice(0,3).map(v=>v.verse_key)});
            setCompletedAyahs(prev=>{
              const next=new Set(prev);
              let added=0;
              toAdd.forEach(v=>{if(v.verse_key&&!next.has(v.verse_key)){next.add(v.verse_key);added++;}});
              console.log('[BACKFILL RESULT]', {added, totalNow: next.size});
              if(added>0) saveCompletedAyahs(next);
              return added>0?next:prev;
            });
          }
        }

      } catch { if(!cancelled) setSessError(true); }
      if(!cancelled) setSessLoading(false);
    })();
    return()=>{cancelled=true;};
  },[sessionJuz,loaded,juzStatus]);

  // Auto-mark Juz complete when sessionVerses goes to 0 after having verses
  // This catches the case where all surahs are marked done via individual surah completion
  useEffect(()=>{
    if(sessLoading) return;
    if(sessError) return;
    if(sessionVerses.length>0) return;
    if(!sessionJuz) return;
    if(juzStatus[sessionJuz]==="complete") return;
    // Only fire if juzProgress shows actual work was done in this Juz
    if((juzProgress[sessionJuz]||0)===0) return;
    const juzSurahs=JUZ_SURAHS[sessionJuz]||[];
    const allSurahsDone=juzSurahs.length>0&&juzSurahs.every(s=>juzStatus[`s${s.s}`]==="complete");
    if(allSurahsDone){
      setJuzStatus(p=>({...p,[sessionJuz]:"complete"}));
    }
  },[sessLoading,sessionVerses.length,sessionJuz,juzStatus]);

  // Auto-fix: if juz marked complete but not all surahs are done, unmark juz but seed juzProgress from completed surahs
  useEffect(()=>{
    if(!loaded) return;
    const juzToUnmark=[];
    const progressUpdates={};
    JUZ_META.forEach(j=>{
      const surahs=JUZ_SURAHS[j.num]||[];
      if(juzStatus[j.num]==="complete"){
        const allDone=surahs.length>0&&surahs.every(s=>juzStatus[`s${s.s}`]==="complete");
        if(!allDone&&!juzCompletedInSession.has(j.num)) juzToUnmark.push(j.num);
      }
      // Note: juzProgress is only written by actual session progress, not seeded here
      // pct calculation uses surah keys directly via memorizedAyahs formula
    });
    if(juzToUnmark.length>0){
      console.log('[AUTO-FIX] UNMARKING JUZ:', juzToUnmark, 'juzCompletedInSession:', [...juzCompletedInSession]);
      juzToUnmark.forEach(n=>{const surahs=JUZ_SURAHS[n]||[];console.log(`[AUTO-FIX] Juz ${n} surahs:`, surahs.map(s=>({s:s.s, status:juzStatus[`s${s.s}`]})));});
      setJuzStatus(prev=>{
        const next={...prev};
        juzToUnmark.forEach(n=>delete next[n]);
        return next;
      });
    }
    if(Object.keys(progressUpdates).length>0){
      setJuzProgress(prev=>({...prev,...progressUpdates}));
    }
  },[loaded,juzStatus,juzCompletedInSession]);

  const fetchTranslations=async(verses)=>{
    const needed=verses.filter(v=>!translations[v.verse_key]);
    if(!needed.length) return;
    const surahSet=new Set(needed.map(v=>v.verse_key.split(":")[0]));
    const updated={};
    for(const surahNum of surahSet){
      try{
        const res=await fetch(`https://api.quran.com/api/v4/quran/translations/203?chapter_number=${surahNum}`);
        if(!res.ok) continue;
        const data=await res.json();
        if(!data.translations?.length) continue;
        data.translations.forEach((t,i)=>{
          const key=`${surahNum}:${i+1}`;
          updated[key]=(t.text||"").replace(/<sup[^>]*>.*?<\/sup>/gi,"").replace(/<[^>]+>/g,"").replace(/\s*,\s*,/g,",").replace(/\s*,\s*$/,"").replace(/\s{2,}/g," ").trim();
        });
      }catch{}
    }
    if(Object.keys(updated).length) setTranslations(prev=>({...prev,...updated}));
  };

  // Fetch quran text tab
  useEffect(()=>{
    if(activeTab!=="quran") return;
    let cancelled=false;
    setOpenSurah(null);
    (async()=>{
      setLoading(true); setFetchError(false); setAllVerses([]);
      try {
        let page=1,all=[],tp=1;
        do {
          setLoadMsg(`Loading page ${page} of ${tp}`);
          const res=await fetch(`https://api.quran.com/api/v4/verses/by_juz/${selectedJuz}?words=false&fields=text_uthmani,verse_key,surah_number&per_page=50&page=${page}`);
          if(!res.ok) throw new Error();
          const data=await res.json();
          if(cancelled) return;
          all=[...all,...(data.verses||[])]; tp=data.pagination?.total_pages||1; page++;
        } while(page<=tp);
        all.forEach(v=>{ if(v.text_uthmani) v.text_uthmani=v.text_uthmani.replace(/\u06DF/g,"\u0652"); });
        if(!cancelled){setAllVerses(all);const f=all[0]?.surah_number||parseInt(all[0]?.verse_key?.split(":")?.[0]);if(f)setOpenSurah(f);}
      } catch{if(!cancelled)setFetchError(true);}
      if(!cancelled){setLoading(false);setLoadMsg("");}
    })();
    return()=>{cancelled=true;};
  },[selectedJuz,activeTab]);

  const surahGroups=[];let cur=null;
  allVerses.forEach(v=>{const s=v.surah_number||parseInt(v.verse_key?.split(":")?.[0]);if(s!==cur){cur=s;surahGroups.push({surahNum:s,verses:[]});}surahGroups[surahGroups.length-1].verses.push(v);});

  const nextIncompleteJuz = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30].find(j=>!v9IsJuzComplete(j));
  const nextJuzAyahs = nextIncompleteJuz ? (JUZ_RANGES[nextIncompleteJuz]?.total ?? null) : null;
  const nextJuz=[...JUZ_META].sort((a,b)=>a.order-b.order).find(j=>!v9IsJuzComplete(j.num));
  const meta=JUZ_META.find(j=>j.num===selectedJuz);
  const curStatus=juzStatus[selectedJuz]||"not_started";
  const curCfg=STATUS_CFG[curStatus];
  const timeline=calcTimeline(goalYears,memorizedAyahs,goalMonths,nextJuzAyahs,completedCount);
  const targetDaily=Math.round(parseFloat(timeline.ayahsPerDay));

  // Sheikh Al-Qasim's 2-page rule — allow up to 2 full pages worth of content
  const twoPageLimit=(()=>{
    if(!sessionVerses.length||sessionIdx>=sessionVerses.length) return {count:targetDaily,capped:false};
    const startPage=sessionVerses[sessionIdx]?.page_number;
    if(!startPage) return {count:targetDaily,capped:false};
    // Check if user is starting at the beginning of a page
    const prevAyah=sessionIdx>0?sessionVerses[sessionIdx-1]:null;
    const startsAtPageBeginning=!prevAyah||prevAyah.page_number!==startPage;
    // If starting at page beginning: allow pages startPage to startPage+1 (2 full pages)
    // If starting mid-page: allow rest of startPage + next 2 pages (startPage+2)
    const maxPage=startsAtPageBeginning?startPage+1:startPage+2;
    let maxCount=0;
    for(let i=sessionIdx;i<sessionVerses.length;i++){
      const p=sessionVerses[i]?.page_number;
      if(p&&p>maxPage) break;
      maxCount++;
    }
    return {count:Math.min(targetDaily,maxCount),capped:targetDaily>maxCount,maxAllowed:maxCount};
  })();
  const dailyNew=twoPageLimit.count;
  const currentSessionId=SESSIONS[activeSessionIndex]?.id;

  // Show warning when 2-page cap kicks in — once per juz per day
  useEffect(()=>{
    if(!twoPageLimit.capped||!sessionVerses.length||currentSessionId!=="fajr") return;
    const today=TODAY();
    const key=`2page-warn-${sessionJuz}-${today}`;
    if(localStorage.getItem(key)) return;
    setTwoPageWarning({target:targetDaily,actual:twoPageLimit.count});
    localStorage.setItem(key,"1");
  },[sessionJuz,currentSessionId]);

    const totalSV=sessionVerses.length;
  const bStart=sessionIdx;
  const bEnd=Math.min(sessionIdx+dailyNew,totalSV);
  // Build batch — prefer completing whole surahs, avoid starting a new surah with a partial
  const fajrBatch=(()=>{
    if(!sessionVerses.length||bStart>=sessionVerses.length) return [];
    const result=[];
    let i=bStart;
    // Pack whole surahs into the batch while we have room
    while(i<sessionVerses.length&&result.length<dailyNew){
      const curSurah=sessionVerses[i].surah_number||parseInt(sessionVerses[i].verse_key?.split(":")?.[0],10);
      // Collect all ayahs of this surah from position i
      const surahAyahs=[];
      let j=i;
      while(j<sessionVerses.length){
        const v=sessionVerses[j];
        const s=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);
        if(s!==curSurah) break;
        surahAyahs.push(v);
        j++;
      }
      // Can we fit the whole surah?
      if(result.length+surahAyahs.length<=dailyNew){
        result.push(...surahAyahs);
        i=j;
      } else {
        // Surah doesn't fit entirely. Only add partial if we haven't started any surah yet
        // (i.e., this is the first surah in the batch and bigger than dailyNew)
        if(result.length===0){
          const take=Math.min(dailyNew,surahAyahs.length);
          result.push(...surahAyahs.slice(0,take));
        }
        // Otherwise stop — don't start a new surah we can't finish
        break;
      }
    }
    return result;
  })();
  // Save Fajr batch so Maghrib/Isha can use it even after sessionIdx advances
  useEffect(()=>{if(fajrBatch.length>0&&todayFajrBatch.length===0)setTodayFajrBatch(fajrBatch);},[fajrBatch.length]);
  const isDhuhr=currentSessionId==="dhuhr";
  const isAsr=currentSessionId==="asr";
  const isMaghrib=currentSessionId==="maghrib";
  const isIsha=currentSessionId==="isha";

  let batch=fajrBatch;
  if(isDhuhr){
    // 5-day rolling review: ONLY Fajr memorization batches — not completed juz (that's Asr's job)
    const seen=new Set();
    const combined=[];
    // yesterdayBatch first (most recent, full objects)
    (yesterdayBatch||[]).forEach(v=>{ if(v.verse_key&&!seen.has(v.verse_key)){ seen.add(v.verse_key); combined.push(v); }});
    // then older days from recentBatches (excluding the last entry which is today's/yesterday's)
    (recentBatches.slice(0,-1)||[]).flat().forEach(v=>{ if(v.verse_key&&!seen.has(v.verse_key)){ seen.add(v.verse_key); combined.push(v); }});
    // Fallback: if no rolling batches yet, use today's Fajr batch (if completed)
    if(combined.length===0&&fajrBatch.length>0&&sessionsCompleted?.fajr){
      fajrBatch.forEach(v=>{ if(v.verse_key&&!seen.has(v.verse_key)){ seen.add(v.verse_key); combined.push(v); }});
    }
    // Fallback for new/onboarded users: pull last 5 days worth from current juz session verses
    if(combined.length===0&&sessionVerses.length>0&&sessionIdx>0){
      const reviewCount=dailyNew*5;
      // Take the last reviewCount ayahs before current position (most recently memorized)
      sessionVerses.slice(Math.max(0,sessionIdx-reviewCount),sessionIdx).forEach(v=>{
        if(v.verse_key&&!seen.has(v.verse_key)){ seen.add(v.verse_key); combined.push(v); }
      });
    }
    batch=combined.length>0?combined:[];
  }
  else if(isAsr){ batch=asrReviewBatch.length>0?asrReviewBatch:[]; }
  else if(isMaghrib||isIsha){ batch=fajrBatch.length>0?fajrBatch:todayFajrBatch; }

  // Build pages — each page holds up to AYAHS_PER_PAGE ayahs AND stops at surah boundary
  const batchPageRanges=(()=>{
    const ranges=[];
    let i=0;
    while(i<batch.length){
      const startSurah=batch[i].surah_number||parseInt(batch[i].verse_key?.split(":")?.[0],10);
      let end=i;
      while(end<batch.length&&end-i<AYAHS_PER_PAGE){
        const s=batch[end].surah_number||parseInt(batch[end].verse_key?.split(":")?.[0],10);
        if(s!==startSurah) break;
        end++;
      }
      ranges.push({start:i,end});
      i=end;
    }
    return ranges.length>0?ranges:[{start:0,end:0}];
  })();
  const totalPages=Math.max(1,batchPageRanges.length);
  const safePage=Math.min(ayahPage,totalPages-1);
  const pageStart=batchPageRanges[safePage]?.start||0;
  const pageEnd=batchPageRanges[safePage]?.end||0;
  const visibleAyahs=batch.slice(pageStart,pageEnd);

  useEffect(()=>{setAyahPage(0);},[currentSessionId,sessionJuz,sessionIdx,dailyNew,batch.length]);

  useEffect(() => {
    if (currentSessionId !== "asr") {
      setAsrStarted(false);
      setAsrPage(0);
      setAsrExpandedAyah(null);
      setAsrIsCustomized(false);
      return;
    }
    // Don't auto-build during onboarding — it would interfere with the flow
    if (showOnboarding) return;
    setAsrPage(0);
    setAsrExpandedAyah(null);
    if (!asrIsCustomized) {
      buildAsrAutoPool();
    }
  }, [currentSessionId, sessionJuz, showOnboarding]);

  const bKey=`${sessionJuz}-${bStart}`;
  const bDone=sessionDone.includes(bKey);
  const sessM=JUZ_META.find(j=>j.num===sessionJuz);
  const sessPct=totalSV>0?Math.round((sessionIdx/totalSV)*100):0;
  const checkedCount=SESSIONS.filter(s=>dailyChecks[s.id]).length;
  const allChecked=checkedCount===SESSIONS.length;
  const currentReciter=RECITERS.find(r=>r.id===reciter)||RECITERS[0];

  const {
    playingKey, setPlayingKey, audioLoading, setAudioLoading, audioRef,
    playingSurah, setPlayingSurah, mushafAudioPlaying, setMushafAudioPlaying,
    playAyah, playSurahQueue, playNextInQueue, getEveryayahFolder, getArchiveUrl,
    hasPerAyah, stopMushafAudio, playMushafRange, getQuranSurahUrl, playQuranSurah,
  } = useAudio({ reciter, currentReciter, looping, quranReciter });

  const ASR_PAGE_SIZE = 5;
  const asrPages = Math.max(1, Math.ceil(batch.length / ASR_PAGE_SIZE));
  const asrSafePage = Math.min(asrPage, Math.max(0, asrPages - 1));
  const asrPageStart = asrSafePage * ASR_PAGE_SIZE;
  const asrPageEnd = Math.min(asrPageStart + ASR_PAGE_SIZE, batch.length);
  const asrVisibleAyahs = batch.slice(asrPageStart, asrPageEnd);

  const asrCanStart =
    currentSessionId === "asr" &&
    !sessLoading &&
    batch.length > 0 &&
    (asrSelectedSurahs.length > 0 || asrSelectedJuz.length > 0);

  const asrSelectionSummary = (() => {
    const parts = [];
    if (asrSelectedJuz.length) parts.push(...asrSelectedJuz.map(j => `Juz ${j}`));
    if (asrSelectedSurahs.length) parts.push(...asrSelectedSurahs.map(s => SURAH_EN[s]).filter(Boolean));
    if (!parts.length) return "";
    const label = asrIsCustomized ? "Customized" : "Reviewing";
    return `${label}: ${parts.join(" · ")}`;
  })();

  const asrSurahProgress = (() => {
    if (currentSessionId !== "asr" || !batch.length) return [];

    const surahOrder = [];
    const surahLastIndex = {};

    batch.forEach((v, idx) => {
      const sNum = v.surah_number || parseInt(v.verse_key?.split(":")?.[0], 10);
      if (!surahOrder.includes(sNum)) surahOrder.push(sNum);
      surahLastIndex[sNum] = idx;
    });

    const viewedThrough = asrPageEnd - 1;

    return surahOrder.map((sNum, idx) => {
      const lastIdx = surahLastIndex[sNum];
      let state = "pending";

      if (viewedThrough >= lastIdx) state = "complete";
      else if (idx === surahOrder.findIndex(n => viewedThrough <= surahLastIndex[n])) state = "current";

      return {
        surahNum: sNum,
        label: SURAH_EN[sNum] || `Surah ${sNum}`,
        state,
      };
    });
  })();

  const completedSurahOptions=Object.entries(juzStatus).filter(([key,value])=>String(key).startsWith("s")&&value==="complete").map(([key])=>{const surahNum=Number(String(key).replace("s",""));return{num:surahNum,en:SURAH_EN[surahNum],ar:SURAH_AR?.[surahNum]||""};}).sort((a,b)=>b.num-a.num);

  const currentMemorizationSurahNum=sessionVerses[0]?.surah_number||parseInt(sessionVerses[0]?.verse_key?.split(":")?.[0]||"0",10);
  const descendingSurahOrderForCurrentJuz=[...(JUZ_SURAHS[sessionJuz]||[])].map(item=>item.s).reverse();

  // Compute surahs fully passed in the current session (based on sessionIdx)
  const asrPassedSurahs=useMemo(()=>{
    const passed=new Set();
    if(!sessionVerses.length||!sessionIdx) return passed;
    const surahOrder=[];
    const surahVerseCount={};
    sessionVerses.forEach(v=>{
      const sn=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);
      if(!surahOrder.includes(sn)) surahOrder.push(sn);
      surahVerseCount[sn]=(surahVerseCount[sn]||0)+1;
    });
    let cursor=0;
    for(const sn of surahOrder){
      const count=surahVerseCount[sn]||0;
      if(cursor+count<=sessionIdx) passed.add(sn);
      cursor+=count;
    }
    return passed;
  },[sessionVerses,sessionIdx]);

  const completedJuzOptions=JUZ_META.filter(j=>{
    if(juzStatus[j.num]==="complete") return true;
    const surahs=JUZ_SURAHS[j.num]||[];
    if(surahs.some(s=>juzStatus[`s${s.s}`]==="complete")) return true;
    // Include current juz if any surahs have been passed through in session
    if(j.num===sessionJuz&&asrPassedSurahs.size>0) return true;
    return false;
  }).map(j=>({num:j.num,name:j.roman||`Juz ${j.num}`,arabic:j.arabic||""})).sort((a,b)=>b.num-a.num);

  useEffect(()=>{if(batch.length)fetchTranslations(batch);},[batch]);

  function toggleCheck(id){
    const updated={...dailyChecks,[id]:!dailyChecks[id]};
    setDailyChecks(updated);
    const dk=DATEKEY();
    setCheckHistory(prev=>({...prev,[dk]:{...(prev[dk]||{}),[id]:!dailyChecks[id]}}));
    if(SESSIONS.every(s=>updated[s.id]))setStreak(p=>p+1);
  }
  function markJuzAndSurahsComplete(prev,juzNum){
    const next={...prev};
    const surahs=JUZ_SURAHS[juzNum]||[];
    surahs.forEach(s=>{ next[`s${s.s}`]="complete"; });
    next[juzNum]="complete";
    return next;
  }

  async function buildAsrAutoPool() {
    if(sessLoading) return;
    setSessLoading(true);
    try {
      // Read fresh from localStorage to avoid stale React state
      const freshCA = loadCompletedAyahs();
      const freshIsJuzComplete = (jn) => { if(!jn||!JUZ_RANGES[jn]) return false; return getJuzKeys(jn).every(k=>freshCA.has(k)); };
      const freshIsSurahComplete = (sn) => { const t=SURAH_AYAH_COUNTS[sn]||0; for(let i=1;i<=t;i++){if(!freshCA.has(`${sn}:${i}`)) return false;} return t>0; };
      const freshHasAny = (jn) => getJuzKeys(jn).some(k=>freshCA.has(k));

      // Also check juzStatus for surahs marked complete in onboarding
      const freshJS = juzStatus;

      // Step 1 — collect eligible juz and surahs
      const eligibleJuz = [];    // fully complete juz nums
      const eligibleSurahs = []; // complete surahs from started-but-incomplete juz

      for(let j=1;j<=30;j++) {
        if(freshIsJuzComplete(j) || freshJS[j]==="complete") {
          eligibleJuz.push(j);
        } else if(freshHasAny(j) || (JUZ_SURAHS[j]||[]).some(({s})=>freshJS[`s${s}`]==="complete")) {
          const juzSurahList = JUZ_SURAHS[j] || [];
          juzSurahList.forEach(({s}) => {
            if((freshIsSurahComplete(s) || freshJS[`s${s}`]==="complete") && !eligibleSurahs.includes(s)) {
              eligibleSurahs.push(s);
            }
          });
        }
      }

      console.log('[ASR POOL]',{freshCASize:freshCA.size,eligibleJuz,eligibleSurahs,juzStatusKeys:Object.keys(freshJS).filter(k=>freshJS[k]==="complete")});
      if(eligibleJuz.length === 0 && eligibleSurahs.length === 0) {
        // Nothing eligible — leave batch empty, show empty state
        setAsrReviewBatch([]);
        setAsrSelectedJuz([]);
        setAsrSelectedSurahs([]);
        setSessLoading(false);
        return;
      }

      // Step 2 — Sheikh Al-Qasim's progressive revision table
      // Daily revision amount scales with how much you've memorized:
      // 1-5 juz → 0.5 juz/day | 6-10 → 1 juz/day | 11-15 → 1.5 juz/day
      // 16-20 → 2 juz/day | 21-25 → 2.5 juz/day | 26-30 → 3 juz/day
      const totalCompleted = eligibleJuz.length;
      const dailyJuzAmount = totalCompleted <= 5 ? 0.5 : totalCompleted <= 10 ? 1 : totalCompleted <= 15 ? 1.5 : totalCompleted <= 20 ? 2 : totalCompleted <= 25 ? 2.5 : 3;
      // Sort eligible juz in mushaf order for cycling
      const sortedEligible = [...eligibleJuz].sort((a,b) => a - b);
      // Rotate through all completed juz — advances each session
      const asrCycle=parseInt(localStorage.getItem("jalil-asr-cycle")||"0",10);
      const juzCount = Math.max(1, Math.ceil(dailyJuzAmount));
      const startIdx = (asrCycle * juzCount) % sortedEligible.length;
      const juzPool = [];
      for(let i = 0; i < juzCount && i < sortedEligible.length; i++) {
        juzPool.push(sortedEligible[(startIdx + i) % sortedEligible.length]);
      }

      // Step 3 — fetch verses for selected juz
      const allVerses = [];
      const seenKeys = new Set();

      for(const juzNum of juzPool) {
        let page=1, tp=1;
        do {
          const res = await fetch(`https://api.quran.com/api/v4/verses/by_juz/${juzNum}?words=false&fields=text_uthmani,verse_key,surah_number&per_page=50&page=${page}`);
          if(!res.ok) break;
          const data = await res.json();
          (data.verses||[]).forEach(v => {
            if(!seenKeys.has(v.verse_key)) { seenKeys.add(v.verse_key); allVerses.push(v); }
          });
          tp = data.pagination?.total_pages || 1; page++;
        } while(page <= tp);
      }

      // Step 4 — fetch verses for eligible surahs
      for(const surahNum of eligibleSurahs) {
        const res = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surahNum}?words=false&fields=text_uthmani,verse_key,surah_number&per_page=300&page=1`);
        if(!res.ok) continue;
        const data = await res.json();
        (data.verses||[]).forEach(v => {
          if(!seenKeys.has(v.verse_key)) { seenKeys.add(v.verse_key); allVerses.push(v); }
        });
      }

      // Fix U+06DF dots for UthmanicHafs font
      allVerses.forEach(v=>{ if(v.text_uthmani) v.text_uthmani=v.text_uthmani.replace(/\u06DF/g,"\u0652"); });

      // Remove Al-Fatiha from revision — it's recited 17+ times daily in salah
      const filtered=allVerses.filter(v=>{const s=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);return s!==1;});

      // Step 5 — sort in mushaf order for revision (Al-Baqarah → An-Nas)
      // The book says: memorize 114→1, but revise from Al-Baqarah to An-Nas (natural reading order)
      filtered.sort((a,b)=>{
        const sa=a.surah_number||parseInt(a.verse_key?.split(":")?.[0],10);
        const sb=b.surah_number||parseInt(b.verse_key?.split(":")?.[0],10);
        if(sa!==sb) return sa-sb; // ascending surah (1 → 114)
        const aa=parseInt(a.verse_key?.split(":")?.[1],10);
        const ab=parseInt(b.verse_key?.split(":")?.[1],10);
        return aa-ab; // ayahs ascending within surah
      });
      setAsrSelectedJuz(juzPool);
      setAsrSelectedSurahs(eligibleSurahs);
      setAsrReviewBatch(filtered);
      setAsrStarted(true);
      setAsrPage(0);
      setAsrExpandedAyah(null);
    } catch(e) {
      console.error('[buildAsrAutoPool]', e.message, e.stack);
      setAsrReviewBatch([]);
    } finally {
      setSessLoading(false);
    }
  }

  function markBatchDone(){
    setSessionDone(d=>[...d,bKey]);
    if(bEnd>=totalSV){
      setJuzStatus(prev=>markJuzAndSurahsComplete(prev,sessionJuz));
      setJuzProgress(p=>({...p,[sessionJuz]:totalSV}));
      setJuzCompletedInSession(prev=>new Set([...prev,sessionJuz]));
      v9MarkJuzComplete(sessionJuz); // V9: add all ayahs of this juz to completedAyahs
    } else {
      const actualEnd=sessionIdx+fajrBatch.length;
      setSessionIdx(actualEnd);
      setJuzProgress(p=>({...p,[sessionJuz]:actualEnd}));
      // V9: add all completed ayahs up to actualEnd (not just current batch)
      setCompletedAyahs(prev=>{const next=new Set(prev);sessionVerses.slice(0,actualEnd).forEach(v=>{if(v.verse_key)next.add(v.verse_key);});saveCompletedAyahs(next);return next;});
      setJuzStatus(prev=>{
        const next={...prev};
        let changed=false;
        // Group sessionVerses by surah in the order they appear (descending surah order)
        const surahOrder=[];
        const surahVerseCount={};
        sessionVerses.forEach(v=>{
          const sn=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);
          if(!surahOrder.includes(sn)) surahOrder.push(sn);
          surahVerseCount[sn]=(surahVerseCount[sn]||0)+1;
        });
        let cursor=0;
        for(const sn of surahOrder){
          const count=surahVerseCount[sn]||0;
          if(next[`s${sn}`]==="complete"){ cursor+=count; continue; }
          if(count===0) continue;
          if(cursor+count<=bEnd){ next[`s${sn}`]="complete"; changed=true; v9MarkSurahComplete(sn); }
          cursor+=count;
        }
        return changed?next:prev;
      });
    }
  }



  const MID_SURAH_JUZ=new Set([2,3,4,5,6,7,8,11,12,16,19,20,21,22,23,24,25,27]);

  async function toggleAsrSurahReview(surahNum){
    try {
      setSessLoading(true);
      if(asrSelectedSurahs.includes(surahNum)){
        const nextSelected=asrSelectedSurahs.filter(n=>n!==surahNum);
        setAsrSelectedSurahs(nextSelected);
        setAsrReviewBatch(prev=>prev.filter(v=>{
          const sNum=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);
          return sNum!==surahNum;
        }));
        return;
      }
      const res=await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surahNum}?words=false&fields=text_uthmani,verse_key,surah_number&per_page=300&page=1`);
      if(!res.ok) throw new Error();
      const data=await res.json();
      const verses=data.verses||[];
      verses.forEach(v=>{ if(v.text_uthmani) v.text_uthmani=v.text_uthmani.replace(/\u06DF/g,"\u0652"); });
      setAsrSelectedSurahs(prev=>[...prev,surahNum]);
      setAsrReviewBatch(prev=>{
        const merged=[...prev,...verses];
        const seen=new Set();
        return merged.filter(v=>{ if(seen.has(v.verse_key)) return false; seen.add(v.verse_key); return true; });
      });
    } catch {}
    finally { setSessLoading(false); }
  }

  async function loadAsrJuzReview(juzNum){
    try {
      setSessLoading(true);
      if(asrSelectedJuz.includes(juzNum)){
        // Deselect — remove Juz and its verses from batch
        setAsrSelectedJuz(prev=>prev.filter(n=>n!==juzNum));
        const juzSurahNums=(JUZ_SURAHS[juzNum]||[]).map(s=>s.s);
        setAsrReviewBatch(prev=>prev.filter(v=>{
          const sNum=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);
          return !juzSurahNums.includes(sNum);
        }));
        return;
      }
      let page=1,all=[],tp=1;
      do {
        const res=await fetch(`https://api.quran.com/api/v4/verses/by_juz/${juzNum}?words=false&fields=text_uthmani,verse_key,surah_number&per_page=50&page=${page}`);
        if(!res.ok) throw new Error();
        const data=await res.json();
        all=[...all,...(data.verses||[])]; tp=data.pagination?.total_pages||1; page++;
      } while(page<=tp);
      all.forEach(v=>{ if(v.text_uthmani) v.text_uthmani=v.text_uthmani.replace(/\u06DF/g,"\u0652"); });
      const juzSurahNums=(JUZ_SURAHS[juzNum]||[]).map(s=>s.s);
      // Remove individually selected surahs from this Juz before adding whole Juz
      setAsrSelectedSurahs(prev=>prev.filter(n=>!juzSurahNums.includes(n)));
      setAsrSelectedJuz(prev=>[...prev,juzNum]);
      setAsrReviewBatch(prev=>{
        // Remove any verses from this Juz's surahs already in batch (from individual selections)
        const withoutJuz=prev.filter(v=>{
          const sNum=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);
          return !juzSurahNums.includes(sNum);
        });
        const merged=[...withoutJuz,...all];
        const seen=new Set();
        return merged.filter(v=>{ if(seen.has(v.verse_key)) return false; seen.add(v.verse_key); return true; });
      });
    } catch {}
    finally { setSessLoading(false); }
  }

  function playHaramainSurah(imam, surahNum, key) {
    if(haramainPlaying===key){ haramainRef.current?.pause(); setHaramainPlaying(null); return; }
    if(haramainRef.current){ haramainRef.current.pause(); haramainRef.current=null; }
    let url;
    if(imam.mp3quran){
      url = `${imam.mp3quran}/${String(surahNum).padStart(3,"0")}.mp3`;
    } else if(imam.quranicaudio){
      url = `https://download.quranicaudio.com/quran/${imam.quranicaudio}/${String(surahNum).padStart(3,"0")}.mp3`;
    } else if(imam.archive){
      url = `https://archive.org/download/${imam.archive}/${String(surahNum).padStart(3,"0")}.mp3`;
    } else { return; }
    const audio = new Audio(url);
    haramainRef.current = audio;
    audio.play().catch(()=>{});
    setHaramainPlaying(key);
    audio.onended = () => setHaramainPlaying(null);
    audio.onerror = () => setHaramainPlaying(null);
  }

  const TABS=[
    {id:"myhifz",     label:"My Hifz"},
    {id:"rihlah",     label:"My Rihlah"},
    {id:"quran",      label:"Al-Quran Al-Karim"},
    {id:"masjidayn",  label:"🕋 Al-Masjidayn"},
  ];



  return (
    <div className={dark?"":"lm"} style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:"100vh",color:T.text,display:"flex",flexDirection:"column",transition:"background .25s,color .25s"}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        .lm div,.lm span,.lm p,.lm label,.lm textarea,.lm input{color:#2D2A26 !important;}
        .lm .asr-title{color:#D4AF37 !important;text-shadow:none !important;}
        .lm [style*="background: linear-gradient"][style*="#D4AF37"] span,.lm [style*="background: linear-gradient"][style*="#D4AF37"] div{color:#0A0E1A !important;}
        .lm .asr-row-divider{background:linear-gradient(90deg,rgba(139,106,16,0) 0%,rgba(139,106,16,0.15) 50%,rgba(139,106,16,0) 100%) !important;box-shadow:none !important;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-thumb{border-radius:3px;background:${dark?"#2A3446":"#C8C0A8"};}
        .sbtn{transition:opacity .12s;cursor:pointer;user-select:none;}.sbtn:hover{opacity:.72;}
        .jrow{cursor:pointer;border-left:3px solid transparent;transition:background .1s;}.jrow:hover{background:${dark?"#141B27":"#EDE8DC"}!important;}
        .srow{cursor:pointer;transition:background .12s;}.srow:hover{background:${dark?"#141B27":"#EDE8DC"}!important;}
        .chkrow{cursor:pointer;transition:all .13s;}.chkrow:hover{background:${dark?"#141B27":"#EDE8DC"}!important;}
        .ttab{cursor:pointer;transition:all .15s;user-select:none;}.ttab:hover{opacity:.8;}
        @keyframes fi{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}.fi{animation:fi .2s ease;}
        @keyframes asrSlideLeft{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes asrSlideRight{from{transform:translateX(-40px);opacity:0}to{transform:translateX(0);opacity:1}}
        .asr-slide-left{animation:asrSlideLeft .2s ease-out}
        .asr-slide-right{animation:asrSlideRight .2s ease-out}
        @keyframes pageTurnNext{0%{transform:perspective(900px) rotateY(18deg) translateX(30px);opacity:0}60%{opacity:1}100%{transform:perspective(900px) rotateY(0deg) translateX(0);opacity:1}}
        @keyframes pageTurnPrev{0%{transform:perspective(900px) rotateY(-18deg) translateX(-30px);opacity:0}60%{opacity:1}100%{transform:perspective(900px) rotateY(0deg) translateX(0);opacity:1}}
        .page-next{animation:pageTurnNext .4s ease-out;transform-origin:left center;}
        .page-prev{animation:pageTurnPrev .4s ease-out;transform-origin:right center;}
        .asr-surah-btn{transition:all .15s ease;transform:scale(1);}
        .asr-surah-btn:active{transform:scale(0.97);transition:transform .06s ease-out;}
        @keyframes goldPulse{0%,100%{box-shadow:0 0 12px rgba(230,184,74,0.15)}50%{box-shadow:0 0 24px rgba(230,184,74,0.35)}}
        .rep-done-glow{animation:goldPulse 2s ease-in-out infinite;}
        @keyframes goldParticle{0%{transform:translateY(0) scale(1);opacity:0.08}50%{opacity:0.05}100%{transform:translateY(-100vh) scale(0.3);opacity:0}}
        .gold-particles::before,.gold-particles::after{content:"";position:fixed;width:3px;height:3px;border-radius:50%;background:#D4AF37;pointer-events:none;z-index:0;}
        .gold-particles::before{left:15%;bottom:-10px;animation:goldParticle 12s linear infinite;opacity:0.07;}
        .gold-particles::after{left:75%;bottom:-10px;animation:goldParticle 18s linear 4s infinite;opacity:0.05;width:2px;height:2px;}
        @keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .9s linear infinite;}@keyframes slideUpDrawer{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}.pulse{animation:pulse 1.6s infinite;}

        .pbfill{transition:width .8s cubic-bezier(.4,0,.2,1);}
        input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;background:${dark?"#0C1A0E":"#D0C8B0"};outline:none;}
        .asr-shell{position:relative;border-radius:30px;padding:16px 0px 22px;overflow:visible;background:${dark?"radial-gradient(circle at 50% 12%,rgba(58,92,165,0.16) 0%,rgba(58,92,165,0.05) 18%,rgba(0,0,0,0) 42%),linear-gradient(180deg,#081225 0%,#050A14 100%)":"#EADFC8"};box-shadow:${dark?"0 14px 36px rgba(0,0,0,0.42)":"0 4px 16px rgba(0,0,0,0.08)"};}
        .asr-shell::before{content:"";position:absolute;inset:0;border-radius:30px;padding:1px;background:${dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(217,177,95,0.03) 10%,rgba(232,200,120,0.18) 50%,rgba(217,177,95,0.03) 90%,rgba(217,177,95,0) 100%) top/100% 1px no-repeat,linear-gradient(180deg,rgba(217,177,95,0.05) 0%,rgba(217,177,95,0.015) 30%,rgba(217,177,95,0.035) 100%)":"linear-gradient(90deg,rgba(139,106,16,0) 0%,rgba(139,106,16,0.12) 50%,rgba(139,106,16,0) 100%) top/100% 1px no-repeat,linear-gradient(180deg,rgba(139,106,16,0.08) 0%,rgba(139,106,16,0.03) 100%)"};-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;}
        .asr-title{text-align:center;font-size:15px;letter-spacing:.26em;text-transform:uppercase;font-weight:800;color:${dark?"#E8C878":"#6B645A"};margin-bottom:10px;text-shadow:${dark?"0 0 18px rgba(217,177,95,0.28)":"none"};}
        .asr-title-line{position:relative;height:1px;margin:8px 0 18px;background:linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(217,177,95,0.04) 18%,rgba(232,200,120,0.42) 50%,rgba(217,177,95,0.04) 82%,rgba(217,177,95,0) 100%);}
        .asr-ayah-panel{position:relative;border-radius:0;padding:6px 20px;overflow:visible;background:${dark?"rgba(8,16,34,0.30)":"rgba(0,0,0,0.04)"};}
        .asr-ayah-panel::before{display:none;}
        .asr-row{display:flex;align-items:center;gap:4px;min-height:56px;padding:10px 6px 14px;}
        .asr-row-divider{height:1px;margin:0 18px;background:linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(217,177,95,0.15) 15%,rgba(232,200,120,0.55) 50%,rgba(217,177,95,0.15) 85%,rgba(217,177,95,0) 100%);box-shadow:0 0 6px rgba(217,177,95,0.18),0 1px 3px rgba(217,177,95,0.10);}
        .asr-num{width:30px;height:30px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:rgba(226,188,114,0.72);font-size:11px;font-weight:500;background:transparent;box-shadow:inset 0 0 0 1px rgba(217,177,95,0.18);}
        .asr-arw{position:absolute;top:50%;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;color:rgba(226,188,114,0.52);font-size:28px;font-weight:300;background:transparent;cursor:pointer;user-select:none;transition:all .15s;z-index:5;}
        .asr-arw:hover{opacity:1;color:rgba(226,188,114,0.80);} .asr-arw.left{left:6px;} .asr-arw.right{right:6px;}
        .asr-progress-rule{height:1px;margin:18px 0 16px;background:linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(217,177,95,0.05) 20%,rgba(243,231,200,0.08) 50%,rgba(217,177,95,0.05) 80%,rgba(217,177,95,0) 100%);}

        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${T.accent};cursor:pointer;}
        textarea:focus{outline:none;} select{cursor:pointer;}
      `}</style>

      {/* ── ASR FULL-SCREEN MODE ── */}
      {!sessLoading&&activeTab==="myhifz"&&currentSessionId==="asr"&&asrStarted&&batch.length>0&&(
        <AsrSessionView
          dark={dark}
          asrSelectionSummary={asrSelectionSummary}
          asrSafePage={asrSafePage}
          asrPages={asrPages}
          asrPageStart={asrPageStart}
          asrPageEnd={asrPageEnd}
          asrVisibleAyahs={asrVisibleAyahs}
          asrBatch={batch}
          asrExpandedAyah={asrExpandedAyah}
          setAsrExpandedAyah={setAsrExpandedAyah}
          asrTouchStartRef={asrTouchStartRef}
          setAsrPage={setAsrPage}
          asrSlideDir={asrSlideDir}
          setAsrSlideDir={setAsrSlideDir}
          translations={translations}
          fetchTranslations={fetchTranslations}
          playAyah={playAyah}
          playingKey={playingKey}
          audioLoading={audioLoading}
          asrSurahProgress={asrSurahProgress}
          onComplete={()=>{
            const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];
            console.log('[ASR COMPLETE]', {activeSessionIndex, nextIndex: Math.min(SESSIONS.length-1,activeSessionIndex+1)});
            // Advance Asr rotation for next session
            const asrCycle=parseInt(localStorage.getItem("jalil-asr-cycle")||"0",10);
            localStorage.setItem("jalil-asr-cycle",String(asrCycle+1));
            setSessionsCompleted(prev=>({...prev,[sess.id]:true}));
            toggleCheck(sess.id);
            setAsrStarted(false);
            setAsrPage(0);
            setAsrExpandedAyah(null);
            setActiveSessionIndex(i=>Math.min(SESSIONS.length-1,i+1));
          }}
          onChangeSelection={()=>{
            setAsrStarted(false);
            setAsrPage(0);
            setAsrExpandedAyah(null);
            setAsrIsCustomized(true); // open customize picker
          }}
          asrIsCustomized={asrIsCustomized}
          completedAyahs={completedAyahs}
        />
      )}

      {/* Everything below is hidden during Asr full-screen */}
      {!(activeTab==="myhifz"&&currentSessionId==="asr"&&asrStarted&&batch.length>0)&&(<>

      {/* ── ONBOARDING FLOW ── */}
      {showOnboarding&&(
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
                <div style={{fontSize:11,color:"rgba(243,231,191,0.5)",fontStyle:"italic",marginBottom:4}}>"And We have certainly made the Quran easy for remembrance"</div>
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
            const tl=calcTimeline(goalYears,memorizedAyahs,goalMonths,null,completedCount);
            const remainingJuz=tl.juzLeft;
            const apd=Math.round(parseFloat(tl.ayahsPerDay));
            const daysPerJuz=tl.daysPerJuz;
            const displayedJuz=JUZ_META.slice().reverse().slice(0,visibleOnboardJuzCount);
            return (
              <div className="fi" style={{flex:1,display:"flex",flexDirection:"column",padding:"20px 20px 24px",overflow:"auto",background:"linear-gradient(180deg,#04070A 0%,#0A1120 50%,#0C1526 100%)",position:"relative"}}>
                <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 50% 0%,rgba(212,175,55,0.10),transparent 60%)",zIndex:0}}/>
                <div style={{position:"relative",zIndex:1,display:"flex",gap:5,marginBottom:20}}>
                  {[1,2,3].map(i=>(<div key={i} style={{flex:1,height:3,borderRadius:2,background:"linear-gradient(90deg,#C8961E,#F6E27A,#D4AF37)",boxShadow:"0 0 12px rgba(212,175,55,0.40)"}}/>))}
                </div>
                <div style={{textAlign:"center",marginBottom:18}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:"#F3E7BF",lineHeight:1.2,marginBottom:8,textShadow:"0 0 18px rgba(212,175,55,0.15)"}}>Choose Your Timeline</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"rgba(243,231,191,0.75)",lineHeight:1.2}}>Mark Your Memorization</div>
                </div>
                <div style={{background:"linear-gradient(180deg,rgba(15,20,32,0.97) 0%,rgba(9,13,22,0.99) 100%), radial-gradient(circle at 50% 30%,rgba(212,175,55,0.05),transparent 65%)",border:"1px solid rgba(212,175,55,0.18)",borderRadius:20,padding:"18px 16px",marginBottom:18,textAlign:"center",boxShadow:"0 0 18px rgba(212,175,55,0.08),0 12px 35px rgba(0,0,0,0.40),inset 0 1px 0 rgba(212,175,55,0.10)"}}>
                  <div style={{fontSize:9,color:"#D4AF37",letterSpacing:".18em",textTransform:"uppercase",marginBottom:8}}>Your Goal</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#F6E27A",marginBottom:10}}>{goalYears>0?`${goalYears} Year${goalYears!==1?"s":""}`:""}{goalYears>0&&goalMonths>0?" • ":""}{goalMonths>0?`${goalMonths} Month${goalMonths!==1?"s":""}`:goalYears===0?"Set goal":""}</div>
                  <div style={{fontSize:13,color:"rgba(243,231,191,0.75)",lineHeight:1.7,marginBottom:10}}>
                    <span style={{color:"#F6E27A",fontWeight:700}}>{apd} ayahs per day</span><span style={{opacity:0.7}}>{" • "}{daysPerJuz} days per juz</span><span style={{opacity:0.7}}>{" • "}{remainingJuz} juz remaining</span>
                  </div>
                  <div className="sbtn" onClick={()=>setOpenMethod(openMethod==="timeline-adjust"?null:"timeline-adjust")} style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:"#D4AF37",padding:"6px 12px",borderRadius:999,border:"1px solid rgba(212,175,55,0.22)",background:"rgba(212,175,55,0.05)"}}>
                    Adjust timeline <span style={{fontSize:11}}>{openMethod==="timeline-adjust"?"▴":"▾"}</span>
                  </div>
                </div>
                {openMethod==="timeline-adjust"&&(
                  <div className="fi" style={{background:"rgba(12,18,30,0.92)",border:"1px solid rgba(212,175,55,0.16)",borderRadius:16,padding:"14px 14px 12px",marginBottom:18}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:9,color:"#A8B89A",letterSpacing:".1em",textTransform:"uppercase"}}>Years</span><span style={{fontSize:12,color:"#F6E27A",fontWeight:700}}>{goalYears}</span></div>
                        <input type="range" min="0" max="10" value={goalYears} onChange={e=>setGoalYears(Number(e.target.value))} style={{width:"100%"}}/>
                      </div>
                      <div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:9,color:"#A8B89A",letterSpacing:".1em",textTransform:"uppercase"}}>Months</span><span style={{fontSize:12,color:"#F6E27A",fontWeight:700}}>{goalMonths}</span></div>
                        <input type="range" min="0" max="11" value={goalMonths} onChange={e=>setGoalMonths(Number(e.target.value))} style={{width:"100%"}}/>
                      </div>
                    </div>
                  </div>
                )}
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
                            <div className="sbtn" onClick={e=>{e.stopPropagation();const completing=!v9IsJuzComplete(j.num);setJuzStatus(prev=>{const next={...prev};if(!completing)delete next[j.num];else next[j.num]="complete";return next;});if(completing)v9MarkJuzComplete(j.num);else v9MarkJuzIncomplete(j.num);}} style={{width:22,height:22,borderRadius:"50%",background:juzComplete?"rgba(246,226,122,0.14)":"rgba(255,255,255,0.04)",border:`1px solid ${juzComplete?"rgba(246,226,122,0.45)":"rgba(212,175,55,0.25)"}`,display:"flex",alignItems:"center",justifyContent:"center",color:juzComplete?"#F6E27A":"rgba(212,175,55,0.4)",fontSize:11,fontWeight:700}}>{juzComplete?"✓":"○"}</div>
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
      )}

      {/* ── DAILY DUA MODAL (every launch, after onboarding) ── */}
      {!showOnboarding&&showDua&&(()=>{
        const DUAS=[
          {arabic:"رَبِّ زِدْنِي عِلْمًا",transliteration:"Rabbi zidni ilma",translation:"My Lord, increase me in knowledge.",source:"Surah Ta-Ha · 20:114"},
          {arabic:"رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",transliteration:"Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina adhaban-nar",translation:"Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",source:"Surah Al-Baqarah · 2:201"},
          {arabic:"رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً",transliteration:"Rabbana la tuzigh qulubana ba'da idh hadaytana wa hab lana min ladunka rahmah",translation:"Our Lord, do not let our hearts deviate after You have guided us, and grant us mercy from Yourself.",source:"Surah Aal-Imran · 3:8"},
          {arabic:"اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا",transliteration:"Allahumma inni as'aluka ilman nafi'an wa rizqan tayyiban wa amalan mutaqabbala",translation:"O Allah, I ask You for beneficial knowledge, pure provision, and accepted deeds.",source:"Morning Dua · Ibn Majah"},
          {arabic:"رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",transliteration:"Rabbi ishrah li sadri wa yassir li amri",translation:"My Lord, expand my chest and ease my affairs.",source:"Surah Ta-Ha · 20:25-26"},
          {arabic:"اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",transliteration:"Allahumma a'inni ala dhikrika wa shukrika wa husni ibadatik",translation:"O Allah, help me to remember You, to be grateful to You, and to worship You in an excellent manner.",source:"Abu Dawud · After every Salah"},
        ];
        const d=DUAS[duaIdx%DUAS.length];
        return (
          <div style={{position:"fixed",inset:0,background:dark?"linear-gradient(180deg,#04070A 0%,#0A1120 50%,#0C1526 100%)":"linear-gradient(180deg,#F7F0DC 0%,#EDE4CC 50%,#E8DCBE 100%)",zIndex:999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{position:"absolute",inset:0,pointerEvents:"none",background:dark?"radial-gradient(circle at 50% 0%,rgba(212,175,55,0.10),transparent 60%)":"radial-gradient(circle at 50% 0%,rgba(139,106,16,0.06),transparent 60%)"}}/>
            <div className="fi" style={{position:"relative",background:dark?"linear-gradient(180deg,rgba(15,20,32,0.97) 0%,rgba(9,13,22,0.99) 100%), radial-gradient(circle at 50% 30%,rgba(212,175,55,0.05),transparent 65%)":"linear-gradient(180deg,#D8CCB0 0%,#CCBFA3 100%)",border:dark?"1px solid rgba(212,175,55,0.20)":"1px solid rgba(139,106,16,0.18)",borderRadius:20,padding:"28px 24px",maxWidth:500,width:"100%",textAlign:"center",boxShadow:dark?"0 20px 50px rgba(0,0,0,0.45),0 0 30px rgba(212,175,55,0.08),inset 0 1px 0 rgba(212,175,55,0.10)":"0 10px 30px rgba(0,0,0,0.08),inset 0 1px 0 rgba(255,255,255,0.5)"}}>
              <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(20px,4.5vw,30px)",color:dark?"#F6E27A":"#2D2A26",direction:"rtl",lineHeight:1.8,marginBottom:20,textShadow:dark?"0 0 18px rgba(212,175,55,0.18)":"none"}}>
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
              </div>
              <div style={{fontSize:8,color:dark?"rgba(212,175,55,0.65)":"#6B645A",letterSpacing:".12em",textTransform:"uppercase",marginBottom:14,opacity:0.75}}>Begin With Dua</div>
              <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(20px,4.5vw,32px)",color:dark?"#F6E27A":"#2D2A26",direction:"rtl",lineHeight:2,marginBottom:16,textShadow:dark?"0 0 12px rgba(212,175,55,0.12)":"none"}}>{d.arabic}</div>
              <div style={{fontSize:11,color:dark?"rgba(243,231,191,0.85)":"#2A1A00",lineHeight:1.6,marginBottom:4,opacity:0.85}}>{d.translation}</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:dark?"rgba(212,175,55,0.40)":"#6B645A",marginBottom:20,opacity:0.5}}>{d.source}</div>
              <div style={{display:"flex",justifyContent:"center",gap:5,marginBottom:20}}>
                {[0,1,2,3,4,5].map(i=>(
                  <div key={i} style={{width:i===duaIdx%6?14:5,height:5,borderRadius:3,background:i===duaIdx%6?"linear-gradient(90deg,#D4AF37,#F6E27A)":"rgba(255,255,255,0.08)",boxShadow:i===duaIdx%6?"0 0 8px rgba(212,175,55,0.35)":"none",opacity:i===duaIdx%6?1:0.3,transition:"all .3s"}}/>
                ))}
              </div>
              <div className="sbtn" onClick={()=>{setShowDua(false);setDuaIdx(i=>(i+1)%6);setActiveTab("myhifz");}} style={{padding:"12px 28px",background:"linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)",color:"#060A07",borderRadius:12,fontSize:13,fontWeight:700,display:"inline-block",boxShadow:"0 12px 30px rgba(212,175,55,0.25),inset 0 1px 0 rgba(255,255,255,0.2)"}}>
                Let's Begin →
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── UNIVERSAL HEADER — hidden on Quran tab ── */}
      {activeTab!=="quran"&&(()=>{
        const username=localStorage.getItem("rihlat-username")||"Abdul Jalil";
        const initials=username.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
        const goalLabel=goalYears===0?`${goalMonths}-Month Hafiz`:goalYears<=1?"1-Year Hafiz":goalYears<=3?"3-Year Hafiz":"Long-Term Hafiz";
        return (
        <div style={{background:dark?"linear-gradient(160deg,#0A1628 0%,#0E1E3A 50%,#081220 100%)":"#EADFC8",padding:"18px 16px 16px",flexShrink:0,borderBottom:`1px solid ${T.border}`,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 12% 18%, rgba(212,175,55,0.08) 0, transparent 18%), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.04) 0, transparent 14%)"}}/>
          <div style={{position:"relative",zIndex:1}}>
            {/* Title */}
            <div style={{textAlign:"center",marginBottom:12}}>
              <div style={{fontSize:13,color:T.accent,letterSpacing:".12em",textTransform:"uppercase",fontWeight:800,fontFamily:"'Playfair Display',serif",textShadow:"0 0 12px rgba(212,175,55,0.40)"}}>Al-Hifz <span style={{fontWeight:400,fontSize:9,fontFamily:"'DM Sans',sans-serif",letterSpacing:".08em",textShadow:"none"}}>· Your journey to memorizing the Qur'an</span></div>
            </div>
            {/* Profile row */}
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              {/* Avatar */}
              <div style={{position:"relative",flexShrink:0}}>
                <div style={{width:48,height:48,borderRadius:"50%",background:dark?"linear-gradient(135deg,#0E1E3A,#162D50)":"#E0D5BC",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid rgba(212,175,55,0.45)",boxShadow:"0 0 12px rgba(212,175,55,0.15)"}}>
                  <span style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:"#E6B84A"}}>{initials}</span>
                </div>
              </div>
              {/* Name + next target */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:700,color:dark?"#EDE8DC":"#2D2A26",fontFamily:"'Playfair Display',serif"}}>{username}</div>
                {nextJuz&&<div style={{fontSize:9,color:T.sub,marginTop:2}}>Next Target · Juz {nextJuz.num}</div>}
              </div>
              {/* Settings gear */}
              <div className="sbtn" onClick={()=>setShowSettings(true)} style={{flexShrink:0,width:32,height:32,borderRadius:"50%",background:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:16,color:T.dim}}>⚙️</span>
              </div>
            </div>
            {/* Badges row — full width */}
            <div style={{display:"flex",gap:6,marginTop:8,justifyContent:"flex-start"}}>
              {[
                {label:"🎯 "+goalLabel, color:dark?"#38BDF8":"#1E6B9A", bg:dark?"rgba(56,189,248,0.12)":"rgba(56,189,248,0.08)", border:dark?"rgba(56,189,248,0.25)":"rgba(56,189,248,0.20)"},
                {label:"🔥 "+streak+"-Day Streak", color:dark?"#F6A623":"#B87A10", bg:dark?"rgba(246,166,35,0.12)":"rgba(246,166,35,0.08)", border:dark?"rgba(246,166,35,0.25)":"rgba(246,166,35,0.20)"},
              ].map((pill,i)=>(
                <div key={i} style={{fontSize:9,color:pill.color,background:pill.bg,padding:"3px 8px",borderRadius:20,border:`1px solid ${pill.border}`,whiteSpace:"nowrap"}}>{pill.label}</div>
              ))}
            </div>
            {/* Progress row */}
            {(
            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
              <div style={{flex:1,height:8,background:T.surface2,borderRadius:999,overflow:"hidden"}}><div className="pbfill" style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#156A30,#F0C040)",borderRadius:999}}/></div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700,color:"#F0C040",flexShrink:0}}>{pct}%</div>
            </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* TABS — fixed bottom bar with icons */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:80,background:dark?"rgba(8,10,18,0.97)":"#EADFC8",borderTop:`1px solid ${dark?"rgba(212,175,55,0.10)":"rgba(0,0,0,0.08)"}`,display:"flex",flexShrink:0,paddingBottom:"env(safe-area-inset-bottom,0px)",backdropFilter:"blur(10px)"}}>
        {[
          {id:"myhifz",  img:"/tab-hifz.png",   label:"My Hifz"},
          {id:"rihlah",  img:"/tab-rihlah.png",  label:"My Rihlah"},
          {id:"quran",   img:"/tab-quran.png",   label:"Al-Qur'an"},
          {id:"masjidayn",icon:"\uD83D\uDD4B",  label:"Haramain"},
        ].map(t=>(
          <div key={t.id} className="ttab" onClick={()=>{setActiveTab(t.id);if(t.id==="rihlah")setRihlahTab("home");}} style={{flex:1,padding:"10px 4px 8px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            {t.img?(
              <img src={t.img} alt={t.label} style={{width:64,height:64,objectFit:"contain",opacity:activeTab===t.id?1:0.55,transition:"all .15s",filter:activeTab===t.id?"brightness(1.2) drop-shadow(0 0 6px rgba(212,175,55,0.7))":"brightness(0.8)"}}/>
            ):(
              <span style={{fontSize:40,width:64,height:64,display:"flex",alignItems:"center",justifyContent:"center",opacity:activeTab===t.id?1:0.55}}>{t.icon}</span>
            )}
            <span style={{fontSize:11,fontWeight:activeTab===t.id?700:400,color:activeTab===t.id?"#E6B84A":"#8A9098"}}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* ═══ TODAY SESSION ═══ */}
      {activeTab==="myhifz"&&(
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

            {/* ── SESSION JUZ ROW ── */}
            <div className="sbtn" onClick={()=>setShowJuzModal(true)} style={{padding:"12px 14px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:4}}>Session Juz · Juz {sessionJuz||""}</div>
                  <div style={{fontSize:12,color:T.sub}}>Progress: {sessionIdx} of {totalSV} ayahs</div>
                  <div style={{fontSize:11,color:T.accent,marginTop:2}}>{dailyNew} ayahs per day</div>
                </div>
                <div style={{color:T.dim,fontSize:14}}>›</div>
              </div>
              <div style={{height:4,marginTop:6,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${totalSV>0?Math.round((sessionIdx/totalSV)*100):0}%`,background:"linear-gradient(90deg,#E6B84A,#F0C040)",borderRadius:999,transition:"width .5s"}}/>
              </div>
            </div>

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
                          <span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:20,color:repsDone?(dark?"#4ADE80":"#2ECC71"):(dark?"#E8DFC0":"#2D2A26")}}>{(v.text_uthmani||"").replace(/\u06DF/g,"\u0652")}</span>
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
                  const APS=5;
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
                          <span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:20,color:dark?"rgba(255,255,255,0.88)":"#2D2A26"}}>{(v.text_uthmani||"").replace(/\u06DF/g,"\u0652")}</span>
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
                  const APS=5;
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
                        <div style={{direction:"rtl",textAlign:"center",fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:20,lineHeight:2,color:"#F3E7C8",marginBottom:16}}>
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
                      const pageSize=5;
                      const pageStart2=ayahPage*pageSize;
                      const pageEnd2=Math.min(pageStart2+pageSize,batch.length);
                      setCompletedAyahs(prev=>{const next=new Set(prev);batch.slice(pageStart2,pageEnd2).forEach(v=>{if(v.verse_key)next.add(v.verse_key);});saveCompletedAyahs(next);return next;});
                      return;
                    }
                    // On last page — complete the session + add last page ayahs to V9
                    {const ps=5;const ps2=ayahPage*ps;const pe2=Math.min(ps2+ps,batch.length);
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
      )}

      {/* ═══ MY RIHLAH — PROFILE HOME ═══ */}
      {activeTab==="rihlah"&&rihlahTab==="home"&&(()=>{
        const username=localStorage.getItem("rihlat-username")||"Abdul Jalil";
        const initials=username.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
        const joinYear=2026;
        const goalLabel=goalYears===0?`${goalMonths}-Month Hafiz`:goalYears<=1?"1-Year Hafiz":goalYears<=3?"3-Year Hafiz":"Long-Term Hafiz";
        const radius=52, circ=2*Math.PI*radius;
        const filled=circ*(pct/100);
        const activeSess=SESSIONS.find(s=>!dailyChecks[s.id])||SESSIONS[SESSIONS.length-1];
        const activeDone=!!dailyChecks[activeSess.id];
        const activeSteps=activeSess?.steps||[];

        // ── Enhanced Badge Components ──
        const JuzBadge=({count,earned})=>(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",opacity:earned?1:0.15,filter:earned?"none":"grayscale(0.8)",background:earned?"rgba(212,175,55,0.06)":"transparent",borderRadius:16,padding:"12px",boxShadow:earned?"0 0 18px rgba(212,175,55,0.22)":"none"}}>
            <div style={{position:"relative",width:52,height:52,marginBottom:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {earned&&<div style={{position:"absolute",inset:0,borderRadius:"50%",background:"rgba(52,211,153,0.2)",filter:"blur(6px)"}}/>}
              <div style={{position:"relative",width:52,height:52,borderRadius:"50%",background:"linear-gradient(180deg,#34D399 0%,#059669 50%,#064E3B 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:"1.5px solid rgba(110,231,183,0.4)"}}>
                <span style={{fontSize:18,fontWeight:700,color:"#fff",lineHeight:1,position:"relative",zIndex:1}}>{count}</span>
                <span style={{fontSize:8,fontWeight:600,color:"rgba(167,243,208,0.9)",position:"relative",zIndex:1}}>Juz</span>
              </div>
            </div>
            <div style={{fontSize:9,fontWeight:700,color:earned?"rgba(255,255,255,0.88)":"rgba(255,255,255,0.18)",textAlign:"center"}}>{count} Juz Memorized</div>
          </div>
        );
        const HabituatedBadge=({earned})=>(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,opacity:earned?1:0.15,filter:earned?"none":"grayscale(0.8)",background:earned?"rgba(245,158,11,0.06)":"transparent",borderRadius:16,padding:"12px",boxShadow:earned?"0 0 18px rgba(245,158,11,0.2)":"none"}}>
            <svg viewBox="0 0 64 64" style={{width:48,height:48,filter:earned?"drop-shadow(0 2px 8px rgba(245,158,11,0.4))":"none"}}>
              <defs><linearGradient id="hg1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#FCD34D"/><stop offset="50%" stopColor="#F59E0B"/><stop offset="100%" stopColor="#B45309"/></linearGradient></defs>
              <path d="M20 50 Q15 40 18 32 Q12 35 10 28 Q15 28 18 25 Q12 22 12 15 Q18 18 22 18 Q20 12 24 8 Q26 14 28 18 Q28 12 32 10" fill="none" stroke="url(#hg1)" strokeWidth="3" strokeLinecap="round"/>
              <path d="M44 50 Q49 40 46 32 Q52 35 54 28 Q49 28 46 25 Q52 22 52 15 Q46 18 42 18 Q44 12 40 8 Q38 14 36 18 Q36 12 32 10" fill="none" stroke="url(#hg1)" strokeWidth="3" strokeLinecap="round"/>
              <ellipse cx="14" cy="30" rx="4" ry="2" fill="url(#hg1)" transform="rotate(-30 14 30)"/><ellipse cx="16" cy="22" rx="4" ry="2" fill="url(#hg1)" transform="rotate(-45 16 22)"/><ellipse cx="22" cy="15" rx="4" ry="2" fill="url(#hg1)" transform="rotate(-60 22 15)"/><ellipse cx="18" cy="38" rx="4" ry="2" fill="url(#hg1)" transform="rotate(-15 18 38)"/><ellipse cx="50" cy="30" rx="4" ry="2" fill="url(#hg1)" transform="rotate(30 50 30)"/><ellipse cx="48" cy="22" rx="4" ry="2" fill="url(#hg1)" transform="rotate(45 48 22)"/><ellipse cx="42" cy="15" rx="4" ry="2" fill="url(#hg1)" transform="rotate(60 42 15)"/><ellipse cx="46" cy="38" rx="4" ry="2" fill="url(#hg1)" transform="rotate(15 46 38)"/>
            </svg>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.5)",fontWeight:500,letterSpacing:".02em"}}>Habituated</span>
          </div>
        );
        const StreakBadge=({earned})=>(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,opacity:earned?1:0.15,filter:earned?"none":"grayscale(0.8)",background:earned?"rgba(249,115,22,0.06)":"transparent",borderRadius:16,padding:"12px",boxShadow:earned?"0 0 18px rgba(249,115,22,0.2)":"none"}}>
            <svg viewBox="0 0 24 24" style={{width:48,height:48,filter:earned?"drop-shadow(0 2px 10px rgba(249,115,22,0.5))":"none"}}>
              <defs><linearGradient id="fg1" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#DC2626"/><stop offset="40%" stopColor="#F97316"/><stop offset="80%" stopColor="#FBBF24"/><stop offset="100%" stopColor="#FEF08A"/></linearGradient></defs>
              <path d="M12 2C10 6 6 8 6 13C6 16.5 8.5 19 12 19C15.5 19 18 16.5 18 13C18 8 14 6 12 2ZM12 17C10.5 17 9 15.5 9 14C9 12 10 11 12 9C14 11 15 12 15 14C15 15.5 13.5 17 12 17Z" fill="url(#fg1)"/>
            </svg>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.5)",fontWeight:500,letterSpacing:".02em"}}>{streak>=21?"21 Day Streak":streak>=14?"14 Day Streak":"7 Day Streak"}</span>
          </div>
        );
        const HifzGoalBadge=({earned})=>(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",opacity:earned?1:0.15,filter:earned?"none":"grayscale(0.8)"}}>
            <div style={{position:"relative",width:64,height:64,marginBottom:4,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {earned&&<div style={{position:"absolute",inset:0,background:"rgba(245,158,11,0.2)",filter:"blur(8px)"}}/>}
              <svg viewBox="0 0 64 64" style={{width:56,height:56,position:"relative",zIndex:1,filter:earned?"drop-shadow(0 2px 10px rgba(245,158,11,0.5))":"none"}}>
                <defs>
                  <linearGradient id="sg1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#FCD34D"/><stop offset="50%" stopColor="#D97706"/><stop offset="100%" stopColor="#92400E"/></linearGradient>
                  <linearGradient id="bg1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#FEF3C7"/><stop offset="100%" stopColor="#F59E0B"/></linearGradient>
                </defs>
                <path d="M32 4 L54 12 L54 32 Q54 52 32 60 Q10 52 10 32 L10 12 Z" fill="url(#sg1)" stroke="#B45309" strokeWidth="1"/>
                <path d="M32 6 L52 13 L52 20 Q40 18 32 20 Q24 18 12 20 L12 13 Z" fill="white" fillOpacity="0.25"/>
                <g transform="translate(18,20)">
                  <path d="M14 2 L2 6 L2 24 L14 20 Z" fill="url(#bg1)" stroke="#92400E" strokeWidth="0.5"/>
                  <path d="M14 2 L26 6 L26 24 L14 20 Z" fill="url(#bg1)" stroke="#92400E" strokeWidth="0.5"/>
                  <line x1="4" y1="10" x2="12" y2="8" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
                  <line x1="4" y1="14" x2="12" y2="12" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
                  <line x1="16" y1="8" x2="24" y2="10" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
                  <line x1="16" y1="12" x2="24" y2="14" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
                  <line x1="14" y1="2" x2="14" y2="20" stroke="#92400E" strokeWidth="1"/>
                </g>
              </svg>
            </div>
            <div style={{background:"linear-gradient(180deg,#F59E0B,#B45309)",padding:"2px 8px",borderRadius:4,border:"1px solid rgba(253,230,138,0.5)"}}>
              <span style={{fontSize:8,fontWeight:700,color:"#fff",letterSpacing:".05em"}}>Hifz Goal</span>
            </div>
          </div>
        );

        return (
          <div ref={rihlahScrollRef} style={{flex:1,overflowY:"auto",background:"radial-gradient(circle at top, rgba(32,44,90,0.35) 0%, rgba(8,12,24,1) 45%, rgba(4,7,15,1) 100%)"}} className="fi">

            {/* ── AMBIENT GLOW ── */}
            <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
              <div style={{position:"absolute",top:"10%",left:"15%",width:300,height:300,background:"rgba(14,40,60,0.12)",borderRadius:"50%",filter:"blur(60px)"}}/>
              <div style={{position:"absolute",bottom:"25%",right:"10%",width:250,height:250,background:"rgba(212,175,55,0.05)",borderRadius:"50%",filter:"blur(60px)"}}/>
            </div>

            {/* Profile header removed — now in universal header */}

            <div style={{padding:"12px 14px 120px",position:"relative",zIndex:1}}>

            {/* ── YOUR MEMORIZATION JOURNEY — Progress Path ── */}
            {(()=>{
              const completed=completedCount;
              const waypoints=[
                {x:320,y:175,juz:5},
                {x:-15, y:140,juz:10},
                {x:300,y:90, juz:15},
                {x:50, y:45, juz:20},
                {x:340,y:10, juz:25},
                {x:340,y:-25, juz:30},
              ];
              const startPt={x:-130,y:210};
              const pathD=`M ${startPt.x} ${startPt.y} C -60 240 370 190 ${waypoints[0].x} ${waypoints[0].y} C 370 155 -50 145 ${waypoints[1].x} ${waypoints[1].y} C -50 105 340 98 ${waypoints[2].x} ${waypoints[2].y} C 340 65 20 55 ${waypoints[3].x} ${waypoints[3].y} C 20 22 380 15 ${waypoints[4].x} ${waypoints[4].y}`;
              const litCount=waypoints.filter(w=>completed>=w.juz).length;
              const currentWpIdx=waypoints.findIndex(w=>completed<w.juz);
              const currentWp=currentWpIdx>=0?waypoints[currentWpIdx]:waypoints[5];
              return (
                <div style={{borderRadius:20,overflow:"visible",marginBottom:10,position:"relative",padding:"10px 16px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:0}}>
                    <div>
                      <div style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:dark?"rgba(255,255,255,0.6)":"#6B645A",fontWeight:700}}>Your Memorization Journey</div>
                      <div style={{fontSize:10,color:dark?"rgba(230,184,74,0.55)":"#8B7355",marginTop:2}}>You are currently on Juz {sessionJuz||"—"}</div>
                      <div style={{fontSize:9,color:dark?"rgba(255,255,255,0.35)":"#6B645A",marginTop:3}}>{completedCount} of 30 Juz · Goal: {goalYears} year{goalYears!==1?"s":""}{goalMonths>0?` ${goalMonths}mo`:""}</div>
                    </div>
                  </div>
                  <svg viewBox="-140 -50 540 280" style={{width:"80%",height:"auto",margin:"0 auto",display:"block",overflow:"visible"}}>
                    <defs>
                      <linearGradient id="pathGold" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#5C4A1E"/>
                        <stop offset="30%" stopColor="#8B6914"/>
                        <stop offset="60%" stopColor="#D4AF37"/>
                        <stop offset="85%" stopColor="#F6E27A"/>
                        <stop offset="100%" stopColor="#FFFBEA"/>
                      </linearGradient>
                      <linearGradient id="pathDim" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={dark?"rgba(92,74,30,0.15)":"rgba(0,0,0,0.04)"}/>
                        <stop offset="100%" stopColor={dark?"rgba(92,74,30,0.08)":"rgba(0,0,0,0.06)"}/>
                      </linearGradient>
                      <filter id="pathGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                      </filter>
<filter id="fireGlow" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="8" result="blur1"/>
                        <feMerge><feMergeNode in="blur1"/><feMergeNode in="blur1"/><feMergeNode in="SourceGraphic"/></feMerge>
                      </filter>
                    </defs>
                    {/* Core golden path + glow — DO NOT CHANGE */}
                    <path d={pathD} fill="none" stroke="rgba(212,175,55,0.35)" strokeWidth="5" strokeLinecap="round" filter="url(#fireGlow)"/>
                    <path d={pathD} fill="none" stroke="rgba(240,192,64,0.5)" strokeWidth="3" strokeLinecap="round" filter="url(#pathGlow)"/>
                    {completed>0&&(
                      <path ref={el=>{
                        if(el){
                          const totalLen=el.getTotalLength();
                          const litLen=totalLen*(Math.min(completed,25)/25);
                          el.style.strokeDasharray=`${litLen} ${totalLen}`;
                        }
                      }} d={pathD} fill="none" stroke="#F5C518" strokeWidth="6" strokeLinecap="round" opacity="0.8" filter="url(#fireGlow)" strokeDasharray="0 9999"/>
                    )}
                    {completed>0&&(
                      <path ref={el=>{
                        if(el){
                          const totalLen=el.getTotalLength();
                          const litLen=totalLen*(Math.min(completed,25)/25);
                          el.style.strokeDasharray=`${litLen} ${totalLen}`;
                        }
                      }} d={pathD} fill="none" stroke="#FFEAA0" strokeWidth="3" strokeLinecap="round" filter="url(#pathGlow)" strokeDasharray="0 9999"/>
                    )}
                    <path ref={el=>{
                      if(el&&completed>0&&completed<30){
                        const len=el.getTotalLength();
                        const pt=el.getPointAtLength(len*(completed/30));
                        const marker=el.parentNode.querySelector('#juzMarker');
                        if(marker){marker.setAttribute('transform',`translate(${pt.x},${pt.y})`);marker.style.display='';}
                      }
                    }} d={pathD} fill="none" stroke="none"/>
                    <g id="juzMarker" style={{display:completed>0&&completed<30?'':'none'}}>
                      <circle cx="0" cy="0" r="14" fill="rgba(212,175,55,0.1)" filter="url(#fireGlow)"/>
                      <circle cx="0" cy="0" r="10" fill="rgba(212,175,55,0.15)" filter="url(#pathGlow)"/>
                      <circle cx="0" cy="0" r="5" fill="#D4AF37" stroke="#F6E27A" strokeWidth="1.5" filter="url(#pathGlow)"/>
                      <text x="0" y="-14" textAnchor="middle" fill="#F0C040" fontSize="18" fontWeight="700">Juz {completed}</text>
                      <circle cx="0" cy="0" r="14" fill="none" stroke="rgba(240,192,64,0.5)" strokeWidth="1.5">
                        <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite"/>
                      </circle>
                      <circle cx="0" cy="0" r="18" fill="none" stroke="rgba(240,192,64,0.3)" strokeWidth="1">
                        <animate attributeName="r" values="16;26;16" dur="2.5s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.4;0;0.4" dur="2.5s" repeatCount="indefinite"/>
                      </circle>
                    </g>
                    {/* Extra dot between Juz 20 and 25, closer to 25 */}
                    {(()=>{const d25=completed>=25;return <><circle cx={260} cy={18} r={d25?"7":"6"} fill={d25?"#D4AF37":(dark?"rgba(200,180,100,0.35)":"rgba(0,0,0,0.15)")} stroke={d25?"#F6E27A":(dark?"rgba(200,180,100,0.5)":"rgba(0,0,0,0.2)")} strokeWidth="1.5" filter={d25?"url(#pathGlow)":"none"}/><text x={260} y={6} textAnchor="middle" fill={d25?"#F0C040":(dark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.2)")} fontSize="18" fontWeight="700">Juz 25</text></>;})()}
                    {waypoints.map((w,i)=>{
                      const done=completed>=w.juz;
                      const isCurrent=currentWpIdx===i;
                      const isLast=i===5;
                      if(isLast) return (
                        <g key={i} transform={`translate(${w.x},${w.y}) scale(1.8)`}>
                          {/* Radiant glow */}
                          <circle cx="0" cy="0" r="22" fill="rgba(240,192,64,0.06)" filter="url(#fireGlow)"/>
                          <circle cx="0" cy="0" r="16" fill="rgba(240,192,64,0.1)" filter="url(#pathGlow)"/>
                          <circle cx="0" cy="0" r="28" fill="none" stroke="rgba(240,192,64,0.15)" strokeWidth="1">
                            <animate attributeName="r" values="24;30;24" dur="3s" repeatCount="indefinite"/>
                            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite"/>
                          </circle>
                          <circle cx="0" cy="0" r="20" fill="none" stroke="rgba(240,192,64,0.25)" strokeWidth="0.8">
                            <animate attributeName="r" values="18;24;18" dur="2.5s" repeatCount="indefinite"/>
                            <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2.5s" repeatCount="indefinite"/>
                          </circle>
                          <circle cx="0" cy="0" r="12" fill="rgba(240,192,64,0.12)"/>
                          <circle cx="0" cy="0" r="8" fill="rgba(212,175,55,0.2)"/>
                          {/* Open Quran book */}
                          <defs>
                            <linearGradient id="quranPage" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#FEF3C7"/>
                              <stop offset="100%" stopColor="#F59E0B"/>
                            </linearGradient>
                          </defs>
                          <path d="M -1 -10 Q -9 -12 -16 -9 L -16 8 Q -9 5 -1 7 Z" fill="url(#quranPage)" stroke="#B45309" strokeWidth="0.8"/>
                          <path d="M 1 -10 Q 9 -12 16 -9 L 16 8 Q 9 5 1 7 Z" fill="url(#quranPage)" stroke="#B45309" strokeWidth="0.8"/>
                          <line x1="0" y1="-10" x2="0" y2="7" stroke="#92400E" strokeWidth="1"/>
                          <line x1="-13" y1="-5" x2="-3" y2="-5" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
                          <line x1="-13" y1="-2" x2="-3" y2="-2" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
                          <line x1="-12" y1="1" x2="-3" y2="1" stroke="#92400E" strokeWidth="0.5" opacity="0.4"/>
                          <line x1="3" y1="-5" x2="13" y2="-5" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
                          <line x1="3" y1="-2" x2="13" y2="-2" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
                          <line x1="3" y1="1" x2="12" y2="1" stroke="#92400E" strokeWidth="0.5" opacity="0.4"/>
                          {isCurrent&&!done&&(
                            <circle cx="0" cy="0" r="16" fill="none" stroke="rgba(240,192,64,0.4)" strokeWidth="1.5">
                              <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite"/>
                              <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite"/>
                            </circle>
                          )}
                        </g>
                      );
                      return (
                        <g key={i}>
                          {done&&<><circle cx={w.x} cy={w.y} r="16" fill="rgba(212,175,55,0.1)" filter="url(#fireGlow)"/><circle cx={w.x} cy={w.y} r="12" fill="rgba(212,175,55,0.15)" filter="url(#pathGlow)"/></>}
                          <circle cx={w.x} cy={w.y} r={done?"7":"6"} fill={done?"#D4AF37":isCurrent?"rgba(240,192,64,0.5)":(dark?"rgba(200,180,100,0.35)":"rgba(0,0,0,0.15)")} stroke={done?"#F6E27A":isCurrent?"rgba(240,192,64,0.5)":(dark?"rgba(200,180,100,0.5)":"rgba(0,0,0,0.2)")} strokeWidth="1.5" filter={done?"url(#pathGlow)":"none"}/>
                          {w.juz!==25&&<text x={w.juz===10||w.juz===20?w.x-12:w.x+12} y={w.y+2} textAnchor={w.juz===10||w.juz===20?"end":"start"} dominantBaseline="middle" fill={done?"#F0C040":(dark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.2)")} fontSize="18" fontWeight="700">Juz {w.juz}</text>}
                          {done&&(<circle cx={w.x} cy={w.y} r="14" fill="none" stroke="rgba(240,192,64,0.4)" strokeWidth="1"><animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/></circle>)}
                          {isCurrent&&!done&&(<circle cx={w.x} cy={w.y} r="12" fill="none" stroke="rgba(240,192,64,0.4)" strokeWidth="1.5"><animate attributeName="r" values="10;16;10" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite"/></circle>)}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              );
            })()}

            {/* ── DAILY GOALS + NAV — single card ── */}
            <div style={{background:dark?"linear-gradient(135deg,rgba(30,35,50,0.9) 0%,rgba(20,25,40,0.7) 100%)":"#EADFC8",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,boxShadow:dark?"0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)":"0 4px 16px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.5)",padding:"12px",marginBottom:8}}>

              {/* ── Nav buttons ── */}
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <div className="sbtn" onClick={()=>setRihlahTab("juz")} style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:dark?"1px solid rgba(74,222,128,0.15)":"1px solid rgba(0,0,0,0.08)",borderRadius:10}}>
                  <span style={{fontSize:16}}>📖</span>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:dark?"#EDE8DC":"#2D2A26"}}>My Memorization</div>
                    <div style={{fontSize:8,color:dark?"rgba(255,255,255,0.30)":"#6B645A"}}>Track progress</div>
                  </div>
                </div>
                <div className="sbtn" onClick={()=>setRihlahTab("timeline")} style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:dark?"1px solid rgba(240,192,64,0.15)":"1px solid rgba(0,0,0,0.08)",borderRadius:10}}>
                  <span style={{fontSize:16}}>⏱️</span>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:dark?"#EDE8DC":"#2D2A26"}}>My Plan</div>
                    <div style={{fontSize:8,color:dark?"rgba(255,255,255,0.30)":"#6B645A"}}>Hifz timeline</div>
                  </div>
                </div>
              </div>

              {/* ── Gold divider ── */}
              <div style={{position:"relative",height:1,marginBottom:16}}>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent 0%,rgba(201,166,70,0.6) 50%,transparent 100%)"}}/>
              </div>

              {/* ── Daily Goals ── */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.7)",fontWeight:700}}>Daily Goals</div>
                <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:24,color:"#F0C040",fontWeight:700,lineHeight:1}}>{checkedCount}</span>
                  <span style={{fontSize:13,color:"rgba(255,255,255,0.35)"}}> of {SESSIONS.length}</span>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginLeft:4}}>Sessions Completed</span>
                </div>
              </div>
              <div style={{height:5,background:"rgba(255,255,255,0.08)",borderRadius:999,overflow:"hidden",marginBottom:12}}>
                <div style={{height:"100%",width:`${Math.round((checkedCount/SESSIONS.length)*100)}%`,background:"linear-gradient(90deg,#D4AF37,#E6B84A)",borderRadius:999,boxShadow:"0 0 10px rgba(212,175,55,0.3)",transition:"width .5s"}}/>
              </div>
              <div style={{background:"rgba(255,255,255,0.02)",padding:"12px",borderRadius:16,boxShadow:"inset 0 0 10px rgba(255,255,255,0.02)"}}>
                {SESSIONS.map((s,i)=>{
                  const done=!!dailyChecks[s.id];
                  const isActive=s.id===activeSess?.id&&!done;
                  const isInactive=!done&&!isActive;
                  return (
                    <div key={s.id} className="sbtn" onClick={()=>toggleCheck(s.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:12,marginBottom:i<SESSIONS.length-1?(isActive?14:10):0,background:isActive?"linear-gradient(180deg,rgba(240,192,64,0.08),rgba(240,192,64,0.02))":done?"rgba(34,197,94,0.06)":"transparent",border:isActive?"1.5px solid rgba(240,192,64,0.6)":done?"1px solid rgba(34,197,94,0.15)":"1px solid transparent",boxShadow:isActive?"0 0 35px rgba(240,192,64,0.18),0 0 30px rgba(240,192,64,0.25),inset 0 0 12px rgba(240,192,64,0.08)":"none",opacity:isInactive?0.2:1,filter:isInactive?"grayscale(0.7)":"none",transition:"all .2s"}}>
                      <div style={{width:18,height:18,borderRadius:"50%",background:done?s.color:"rgba(255,255,255,0.08)",border:done?`2px solid ${s.color}`:"1px solid rgba(255,255,255,0.1)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:done?`0 0 8px ${s.color}60`:"none",filter:isActive?"drop-shadow(0 0 6px rgba(240,192,64,0.4))":"none",transition:"all .2s"}}>
                        {done&&<span style={{fontSize:8,color:"#fff",fontWeight:700}}>✓</span>}
                      </div>
                      <span style={{fontSize:12,color:isActive?"#F0C040":done?s.color:"rgba(255,255,255,0.6)",fontWeight:isActive||done?600:400,flex:1,transition:"color .2s"}}>{s.icon} {s.time} — {s.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nav buttons moved to after Overall Progress */}


            {/* ── 5. ACTIVE SESSION CHECKLIST ── */}
            <div style={{background:dark?"linear-gradient(135deg,rgba(30,35,50,0.9) 0%,rgba(20,25,40,0.7) 100%)":"#EADFC8",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,boxShadow:dark?"0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)":"0 4px 16px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.5)",padding:"12px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:36,height:36,borderRadius:12,background:`linear-gradient(135deg,${activeSess.color}88,${activeSess.color}44)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 12px ${activeSess.color}40`}}>
                    <span style={{fontSize:18}}>{activeSess.icon}</span>
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.9)",letterSpacing:".05em",textTransform:"uppercase"}}>{activeSess.time}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:1}}>{activeSess.title}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{display:"flex",gap:3}}>
                    {SESSIONS.map(s=>(
                      <div key={s.id} style={{width:6,height:6,borderRadius:"50%",background:dailyChecks[s.id]?s.color:"rgba(255,255,255,0.12)",transition:"background .3s"}}/>
                    ))}
                  </div>
                  <div className="sbtn" onClick={()=>toggleCheck(activeSess.id)} style={{fontSize:9,padding:"5px 14px",background:activeDone?"#4ADE80":"rgba(255,255,255,0.06)",border:activeDone?"1px solid rgba(74,222,128,0.4)":"1px solid rgba(255,255,255,0.1)",borderRadius:20,color:activeDone?"#052e16":"rgba(255,255,255,0.5)",fontWeight:700,boxShadow:activeDone?"0 0 12px rgba(74,222,128,0.3)":"none",transition:"all .2s"}}>
                    {activeDone?"✓ Done":`Complete ${activeSess.time}`}
                  </div>
                </div>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5}}>
                  <span>{checkedCount} / {SESSIONS.length} sessions complete</span>
                  {activeSess.id==="fajr"&&<span style={{color:"#F0C040",fontWeight:600}}>{dailyNew} ayahs today</span>}
                </div>
                <div style={{height:6,background:"rgba(255,255,255,0.08)",borderRadius:999,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${Math.round((checkedCount/SESSIONS.length)*100)}%`,background:"linear-gradient(90deg,rgba(240,192,64,0.95),rgba(240,192,64,0.75))",borderRadius:999,boxShadow:"0 0 10px rgba(240,192,64,0.3)",transition:"width .5s"}}/>
                </div>
              </div>
              {allChecked?(
                <div style={{textAlign:"center",padding:"14px 0"}}>
                  <div style={{fontSize:24,marginBottom:6}}>🌙</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#F0C040",marginBottom:4}}>All Sessions Complete — MashaAllah!</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>May Allah accept your worship today.</div>
                </div>
              ):(
                activeSteps.map((step,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",borderRadius:8,marginBottom:2,background:activeDone?"rgba(74,222,128,0.06)":"transparent",border:activeDone?"1px solid rgba(74,222,128,0.1)":"1px solid transparent"}}>
                    <div style={{width:20,height:20,borderRadius:5,background:activeDone?"linear-gradient(135deg,#4ADE80,#22C55E)":(dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.06)"),border:activeDone?"none":`1px solid ${dark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.15)"}`,boxShadow:activeDone?"0 0 10px rgba(74,222,128,0.3)":"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,color:activeDone?"#fff":(dark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.15)")}}>
                      {activeDone?"✓":""}
                    </div>
                    <span style={{fontSize:12,color:activeDone?(dark?"rgba(245,231,184,0.7)":"rgba(40,30,10,0.50)"):(dark?"rgba(255,255,255,0.85)":"#2D2A26"),textDecoration:activeDone?"line-through":"none",opacity:activeDone?0.6:1}}>{step}</span>
                  </div>
                ))
              )}
            </div>

            {/* ── 6. BADGES ── */}
            <div style={{background:dark?"linear-gradient(135deg,rgba(30,35,50,0.9) 0%,rgba(20,25,40,0.7) 100%)":"#EADFC8",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,boxShadow:dark?"0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)":"0 4px 16px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.5)",padding:"18px 14px",marginBottom:10,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 12% 18%, rgba(240,192,64,0.08) 0, transparent 20%), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.04) 0, transparent 16%)"}}/>
              <div style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.7)",fontWeight:700,marginBottom:18,position:"relative",zIndex:1}}>Badges Earned</div>
              <div style={{display:"flex",justifyContent:"space-around",gap:8,position:"relative",zIndex:1,background:"linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.2))",borderRadius:16,padding:"12px",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.05)"}}>
                <JuzBadge count={completedCount||0} earned={completedCount>0}/>
                <StreakBadge earned={streak>=7}/>
                <HabituatedBadge earned={streak>=40}/>
                <HifzGoalBadge earned={completedCount>=30}/>
              </div>
            </div>

            {/* Nav buttons moved to after Overall Progress */}

            </div>
          </div>
        );
      })()}

      {/* ═══ MY MEMORIZATION — JOURNEY VIEW ═══ */}
      {activeTab==="rihlah"&&rihlahTab==="juz"&&(()=>{
        const isJDone=(n)=>juzStatus[n]==="complete"||(JUZ_SURAHS[n]||[]).every(s=>juzStatus[`s${s.s}`]==="complete");
        const currentJuz=sessionJuz||30;
        const currentMeta=JUZ_META.find(j=>j.num===currentJuz)||JUZ_META[0];
        const currentSurahs=JUZ_SURAHS[currentJuz]||[];
        const currentSurah=currentSurahs.find(s=>juzStatus[`s${s.s}`]!=="complete")||currentSurahs[0];
        const curProg=juzProgress[currentJuz]||0;
        const curTotal=totalSV||currentSurahs.reduce((n,s)=>n+s.a,0);

        const completedJuz=JUZ_META.filter(j=>j.num!==currentJuz&&isJDone(j.num)).sort((a,b)=>b.num-a.num);
        const inProgressJuz=JUZ_META.filter(j=>j.num!==currentJuz&&!isJDone(j.num)&&(juzStatus[`s${(JUZ_SURAHS[j.num]||[])[0]?.s}`]==="complete"||(juzProgress[j.num]||0)>0)).sort((a,b)=>b.num-a.num);
        const upcomingJuz=JUZ_META.filter(j=>j.num!==currentJuz&&!isJDone(j.num)&&!inProgressJuz.find(ip=>ip.num===j.num)).sort((a,b)=>b.num-a.num);

        const openSection=memSections;
        const toggleSection=(key)=>setMemSections(p=>({...p,[key]:!p[key]}));

        // Journey strip: sorted descending 30→29→28→27
        const allJourneyNums=new Set([...completedJuz.map(j=>j.num),currentJuz,...upcomingJuz.slice(0,2).map(j=>j.num)]);
        const journeyItems=[...allJourneyNums].sort((a,b)=>b-a).slice(0,6).map(num=>({
          num,state:num===currentJuz?"current":isJDone(num)?"completed":"upcoming"
        }));

        return (
        <div ref={rihlahScrollRef} style={{flex:1,overflowY:"auto",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",padding:"14px 16px 120px"}} className="fi gold-particles">

          {/* Header */}
          <div style={{marginBottom:20}}>
            <div className="sbtn" onClick={()=>setRihlahTab("home")} style={{display:"inline-block",padding:"6px 12px",background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",border:dark?"1px solid rgba(217,177,95,0.12)":"1px solid rgba(0,0,0,0.10)",borderRadius:8,fontSize:11,color:dark?"rgba(243,231,200,0.50)":"#6B645A",marginBottom:10}}>← Back</div>
            <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.60)":"rgba(140,100,20,0.65)",letterSpacing:".18em",textTransform:"uppercase",fontWeight:600}}>My Memorization</div>
          </div>

          {/* ── 1. CURRENT FOCUS CARD ── */}
          <div style={{padding:"20px 18px",borderRadius:18,marginBottom:18,position:"relative",overflow:"hidden",
            background:dark?"linear-gradient(180deg,rgba(15,26,43,0.97) 0%,rgba(12,21,38,0.99) 100%)":"linear-gradient(180deg,#E4D9C0 0%,#DDD0B5 100%)",
            border:dark?"1px solid rgba(230,184,74,0.28)":"1px solid rgba(140,100,20,0.18)",
            boxShadow:dark?"0 10px 40px rgba(0,0,0,0.40),0 0 24px rgba(230,184,74,0.10),inset 0 1px 0 rgba(255,255,255,0.03)":"0 4px 16px rgba(0,0,0,0.06)"}}>
            <div style={{position:"absolute",inset:0,pointerEvents:"none",background:dark?"radial-gradient(circle at 20% 30%,rgba(212,175,55,0.08) 0%,transparent 50%),radial-gradient(circle at 80% 70%,rgba(212,175,55,0.03) 0%,transparent 40%)":"none"}}/>
            <div style={{position:"relative",zIndex:1}}>
              <div style={{fontSize:11,color:dark?"rgba(230,184,74,0.45)":"rgba(140,100,20,0.55)",marginBottom:4}}>Juz {currentJuz} · {currentMeta.roman||currentMeta.arabic}</div>
              {(()=>{const nv=sessionVerses[sessionIdx];const sn=nv?.surah_number||parseInt(nv?.verse_key?.split(":")[0]||"0",10);const name=SURAH_EN[sn]||currentSurah?.name;return name?<div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:dark?"#F3E7C8":"#2D2A26",fontWeight:700,marginBottom:12,lineHeight:1.2}}>Surah {name}</div>:null;})()}
              <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.40)":"rgba(40,30,10,0.45)",marginBottom:8}}><span style={{color:dark?"#E6B84A":"#8B6A10"}}>In Progress</span></div>
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.35)":"rgba(40,30,10,0.40)"}}>Progress</div>
                  <div style={{fontSize:12,color:dark?"rgba(230,184,74,0.65)":"rgba(140,100,20,0.70)",fontFamily:"'IBM Plex Mono',monospace"}}>{curProg} / {curTotal} ayahs</div>
                </div>
                <div style={{height:6,borderRadius:999,background:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)",overflow:"hidden"}}>
                  <div className="pbfill" style={{height:"100%",width:`${curTotal>0?Math.round((curProg/curTotal)*100):0}%`,background:"linear-gradient(90deg,#D4AF37,#F6E27A)",borderRadius:999,boxShadow:"0 0 8px rgba(212,175,55,0.30)"}}/>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.28)":"rgba(40,30,10,0.35)"}}>Next: {(()=>{const nv=sessionVerses[sessionIdx];if(!nv) return "—";const sn=nv.surah_number||parseInt(nv.verse_key?.split(":")[0],10);return `${SURAH_EN[sn]||""} ${nv.verse_key}`;})()}</div>
                <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.22)":"rgba(40,30,10,0.30)"}}>Last session: Today</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div className="sbtn" onClick={()=>{setActiveTab("myhifz");}} style={{display:"inline-block",padding:"11px 22px",borderRadius:12,fontSize:13,fontWeight:700,color:"#0B1220",background:"linear-gradient(180deg,#E6B84A,#D4A62A)",boxShadow:"0 6px 18px rgba(230,184,74,0.25),0 0 12px rgba(230,184,74,0.12)"}}>
                  Continue Memorization
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. JOURNEY STRIP ── */}
          <div style={{marginBottom:18}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:dark?"#F3E7C8":"#2D2A26",marginBottom:12}}>Your Journey Through the Qur'an</div>
            <div style={{display:"flex",alignItems:"center",overflowX:"auto",gap:0,padding:"8px 0"}}>
              {journeyItems.map((item,i)=>{
                const isCur=item.state==="current";
                const isDone=item.state==="completed";
                return (
                  <div key={item.num} style={{display:"flex",alignItems:"center",flexShrink:0}}>
                    {i>0&&<div style={{width:24,height:2,background:isDone||isCur?"rgba(212,175,55,0.35)":(dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.08)")}}/>}
                    <div style={{padding:isCur?"10px 18px":"8px 14px",borderRadius:12,textAlign:"center",
                      background:isCur?(dark?"rgba(217,177,95,0.12)":"rgba(180,140,40,0.10)"):isDone?(dark?"rgba(217,177,95,0.04)":"rgba(180,140,40,0.05)"):(dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)"),
                      border:`1px solid ${isCur?(dark?"rgba(232,200,120,0.55)":"rgba(160,120,20,0.40)"):isDone?(dark?"rgba(217,177,95,0.18)":"rgba(160,120,20,0.15)"):(dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)")}`,
                      boxShadow:isCur?"0 0 20px rgba(230,184,74,0.20)":"none"}}>
                      <div style={{fontSize:isCur?15:12,fontWeight:isCur?700:400,color:isCur?(dark?"#F6E27A":"#6B4F00"):isDone?(dark?"rgba(230,184,74,0.55)":"rgba(140,100,20,0.55)"):(dark?"rgba(255,255,255,0.25)":"rgba(0,0,0,0.25)")}}>{`Juz ${item.num}`}</div>
                      <div style={{fontSize:9,color:isCur?(dark?"rgba(230,184,74,0.65)":"rgba(140,100,20,0.60)"):isDone?(dark?"rgba(230,184,74,0.35)":"rgba(140,100,20,0.40)"):(dark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.20)"),marginTop:2}}>
                        {isCur?"Current":isDone?"Completed":"Next"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 3. COMPLETED JUZ ── */}
          {completedJuz.length>0&&(
            <div style={{marginBottom:12}}>
              <div className="sbtn" onClick={()=>toggleSection("completed")} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
                <div style={{fontSize:12,color:"rgba(243,231,200,0.55)",fontWeight:600}}>Completed Juz <span style={{color:"rgba(243,231,200,0.30)"}}>({completedJuz.length})</span></div>
                <div style={{color:"rgba(217,177,95,0.40)",fontSize:14,transition:"transform .2s",transform:openSection.completed?"rotate(180deg)":"rotate(0deg)"}}>▾</div>
              </div>
              {openSection.completed&&(
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {completedJuz.map(j=>{
                    const jMeta=JUZ_META.find(m=>m.num===j.num);
                    return (
                      <div key={j.num} style={{padding:"16px 16px",borderRadius:14,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(217,177,95,0.12)"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:14,fontWeight:600,color:"rgba(243,231,200,0.75)"}}>Juz {j.num} <span style={{fontSize:11,color:"rgba(243,231,200,0.35)",fontWeight:400}}>({jMeta?.roman?.split(" ")[0]||""})</span></div>
                            <div style={{fontSize:11,color:"rgba(230,184,74,0.45)",marginTop:4,textShadow:"0 0 6px rgba(230,184,74,0.10)"}}>Complete — Alhamdulillah</div>
                          </div>
                          <div className="sbtn" onClick={()=>{setSessionJuz(j.num);setActiveTab("myhifz");}} style={{padding:"6px 12px",borderRadius:10,fontSize:10,fontWeight:500,color:"rgba(243,231,200,0.30)",background:"transparent",border:"1px solid rgba(217,177,95,0.08)"}}>
                            Review
                          </div>
                        </div>
                        <div style={{height:3,borderRadius:999,background:"rgba(255,255,255,0.06)",marginTop:12,overflow:"hidden"}}>
                          <div style={{height:"100%",width:"100%",background:"linear-gradient(90deg,rgba(212,175,55,0.40),rgba(246,226,122,0.30))",borderRadius:999}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 4. IN PROGRESS ── */}
          {inProgressJuz.length>0&&(
            <div style={{marginBottom:12}}>
              <div className="sbtn" onClick={()=>toggleSection("inprogress")} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
                <div style={{fontSize:12,color:"rgba(243,231,200,0.55)",fontWeight:600}}>In Progress <span style={{color:"rgba(243,231,200,0.30)"}}>({inProgressJuz.length})</span></div>
                <div style={{color:"rgba(217,177,95,0.40)",fontSize:14,transition:"transform .2s",transform:openSection.inprogress?"rotate(180deg)":"rotate(0deg)"}}>▾</div>
              </div>
              {openSection.inprogress&&(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {inProgressJuz.map(j=>{
                    const jMeta=JUZ_META.find(m=>m.num===j.num);
                    const jp=juzProgress[j.num]||0;
                    const jTotal=(JUZ_SURAHS[j.num]||[]).reduce((n,s)=>n+s.a,0);
                    return (
                      <div key={j.num} style={{padding:"14px 16px",borderRadius:14,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(217,177,95,0.10)"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:14,fontWeight:600,color:"rgba(243,231,200,0.75)"}}>Juz {j.num} <span style={{fontSize:11,color:"rgba(243,231,200,0.35)",fontWeight:400}}>({jMeta?.roman?.split(" ")[0]||""})</span></div>
                            <div style={{fontSize:11,color:"rgba(243,231,200,0.35)",marginTop:3}}>Progress</div>
                          </div>
                          <div className="sbtn" onClick={()=>{setSessionJuz(j.num);setActiveTab("myhifz");}} style={{padding:"7px 14px",borderRadius:10,fontSize:11,fontWeight:600,color:"#E6B84A",background:"rgba(230,184,74,0.08)",border:"1px solid rgba(230,184,74,0.20)"}}>
                            Continue
                          </div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
                          <div style={{flex:1,height:4,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${jTotal>0?Math.round((jp/jTotal)*100):0}%`,background:"linear-gradient(90deg,#D4AF37,#E6B84A)",borderRadius:999}}/>
                          </div>
                          <div style={{fontSize:11,color:"rgba(243,231,200,0.35)",fontFamily:"'IBM Plex Mono',monospace"}}>{jp} / {jTotal}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 5. UPCOMING JUZ ── */}
          {upcomingJuz.length>0&&(
          <div style={{marginBottom:12}}>
            <div className="sbtn" onClick={()=>toggleSection("upcoming")} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
              <div style={{fontSize:12,color:"rgba(243,231,200,0.55)",fontWeight:600}}>Upcoming Juz</div>
              <div style={{color:"rgba(217,177,95,0.40)",fontSize:14,transition:"transform .2s",transform:openSection.upcoming?"rotate(180deg)":"rotate(0deg)"}}>▾</div>
            </div>
            {openSection.upcoming&&(<>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {upcomingJuz.slice(0,3).map(j=>(
                  <div key={j.num} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.04)"}}>
                    <div style={{fontSize:13,color:"rgba(243,231,200,0.40)",fontWeight:500}}>Juz {j.num}</div>
                    <div style={{fontSize:11,color:"rgba(243,231,200,0.20)"}}>Ready to start</div>
                  </div>
                ))}
              </div>
              {upcomingJuz.length>3&&(
                <div className="sbtn" onClick={()=>toggleSection("upcomingAll")}
                  style={{textAlign:"center",padding:"8px",marginTop:6,borderRadius:8,fontSize:10,fontWeight:500,
                    color:"rgba(217,177,95,0.30)",border:"1px dashed rgba(217,177,95,0.08)",background:"transparent"}}>
                  {openSection.upcomingAll?"Show less":"View all "+upcomingJuz.length+" upcoming"}
                </div>
              )}
              {openSection.upcomingAll&&upcomingJuz.length>3&&(
                <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:6}}>
                  {upcomingJuz.slice(3).map(j=>(
                    <div key={j.num} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.04)"}}>
                      <div style={{fontSize:13,color:"rgba(243,231,200,0.40)",fontWeight:500}}>Juz {j.num}</div>
                      <div style={{fontSize:11,color:"rgba(243,231,200,0.20)"}}>Ready to start</div>
                    </div>
                  ))}
                </div>
              )}
            </>)}
          </div>
          )}

        </div>
        );
      })()}

      {/* ═══ QURAN TEXT ═══ */}
      {activeTab==="quran"&&(()=>{
        const curSurahNum=mushafSurahNum;
        const curSurahPage=SURAH_PAGES[curSurahNum]||1;
        const parchment=dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2";
        const goldColor="#E8D5A3";
        const inkColor="#E8D5A3";

        return (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:parchment,paddingBottom:100}}>

          {/* Header — Asr session style */}
          <div style={{flexShrink:0,padding:"14px 16px 0",background:dark?"#060C18":"#EADFC8"}}>
            <div style={{fontSize:10,color:dark?"rgba(217,177,95,0.50)":"#6B645A",letterSpacing:".18em",textTransform:"uppercase",fontWeight:600,marginBottom:8}}>AL-QUR'AN AL-KARIM</div>
            {/* Picker buttons row */}
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
              <div className="sbtn" onClick={()=>setShowQuranJuzModal(true)} style={{flex:1,padding:"7px 12px",background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)",border:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(139,106,16,0.20)",borderRadius:10,fontSize:11,fontWeight:700,color:dark?"rgba(217,177,95,0.90)":"#6B645A",display:"flex",alignItems:"center",justifyContent:"center",gap:5,height:32}}>
                Juz {mushafJuzNum} <span style={{fontSize:9,opacity:0.5}}>▾</span>
              </div>
              <div className="sbtn" onClick={()=>setShowQuranSurahModal(true)} style={{flex:1,padding:"7px 12px",background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)",border:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(139,106,16,0.20)",borderRadius:10,fontSize:11,color:dark?"rgba(243,231,191,0.70)":"#4A3A10",display:"flex",alignItems:"center",justifyContent:"center",gap:4,overflow:"hidden",height:32}}>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{SURAH_EN[curSurahNum]||"Surah"}</span>
                <span style={{fontSize:9,opacity:0.5,flexShrink:0}}>▾</span>
              </div>
              <div style={{position:"relative",display:"flex",borderRadius:999,flex:1,background:dark?"rgba(12,20,34,0.80)":"rgba(0,0,0,0.08)",border:dark?"1px solid rgba(212,175,55,0.15)":"1px solid rgba(139,106,16,0.20)",padding:2,height:32}}>
                {/* Sliding gold pill */}
                <div style={{position:"absolute",top:2,left:quranMode==="mushaf"?2:"calc(50% + 1px)",width:"calc(50% - 3px)",height:28,borderRadius:999,background:"linear-gradient(160deg,#D4AF37 0%,#8B6A10 100%)",boxShadow:"0 0 14px rgba(212,175,55,0.45), 0 0 6px rgba(212,175,55,0.25)",transition:"left .25s ease"}}/>
                <div className="sbtn" onClick={()=>setQuranMode("mushaf")} style={{position:"relative",zIndex:1,flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,letterSpacing:".06em",color:quranMode==="mushaf"?"#0A0E1A":dark?"rgba(212,175,55,0.35)":"rgba(0,0,0,0.40)",transition:"color .2s ease",fontWeight:700}}>Mushaf</div>
                <div className="sbtn" onClick={()=>setQuranMode("interactive")} style={{position:"relative",zIndex:1,flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,letterSpacing:".06em",color:quranMode==="interactive"?"#0A0E1A":dark?"rgba(212,175,55,0.35)":"rgba(0,0,0,0.40)",transition:"color .2s ease",fontWeight:700}}>Study</div>
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
              style={{position:"relative",flex:1,overflowY:"auto",background:dark?"#060C18":"#F3E9D2",padding:"10px 12px 120px"}}
            >
              {/* ── CONTINUOUS READING SURFACE ── */}
              {mushafLoading?(
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:"rgba(232,213,163,0.25)",fontSize:11,letterSpacing:".12em"}}>Loading...</div>
              ):(
                <div style={{padding:"0 4px"}}>
                  {(()=>{
                    let lastSurah = null;
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
                    return (<div style={{padding:"0 12px"}}>
                    {surahGroups.map((group,gi)=>{
                      const isFirst=group.verses[0]&&group.verses[0].verse_key.split(":")[1]==="1";
                      return (
                        <div key={group.sn+"-"+gi}>
                          {/* Surah header — centered, outside RTL flow */}
                          {(gi>0||isFirst)&&(
                            <div style={{textAlign:"center",padding:"16px 0 12px"}}>
                              <div style={{fontFamily:"'Amiri',serif",fontSize:20,color:dark?"#E8C878":"#6B645A",fontWeight:700,marginBottom:2}}>{SURAH_AR[group.sn]||""}</div>
                              <div style={{fontSize:8,color:dark?"rgba(217,177,95,0.40)":"rgba(0,0,0,0.50)",letterSpacing:".22em",fontWeight:600,textTransform:"uppercase"}}>{SURAH_EN[group.sn]||""}</div>
                              {isFirst&&group.sn!==9&&group.sn!==1&&(
                                <div style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:17,color:dark?"rgba(232,200,120,0.55)":"rgba(0,0,0,0.45)",marginTop:10,direction:"rtl",lineHeight:2}}>
                                  بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِيمِ
                                </div>
                              )}
                              <div style={{height:1,margin:"10px auto 0",width:"80%",background:dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.28) 50%,rgba(217,177,95,0) 100%)":"linear-gradient(90deg,rgba(139,106,16,0) 0%,rgba(139,106,16,0.18) 50%,rgba(139,106,16,0) 100%)"}}/>
                            </div>
                          )}
                          {/* Flowing ayah text */}
                          <div style={{direction:"rtl",textAlign:"justify",textAlignLast:"right",lineHeight:2.0,wordBreak:"keep-all",overflowWrap:"normal"}}>
                            {group.verses.map(verse=>{
                              const aNum=verse.verse_key.split(":")[1];
                              const isSelected=selectedAyah===verse.verse_key;
                              return (
                                <span key={verse.verse_key} className="sbtn"
                                  onClick={()=>{setSelectedAyah(isSelected?null:verse.verse_key);setShowReflect(false);setDrawerView("default");}}
                                  style={{cursor:"pointer",borderRadius:6,padding:"2px 3px",
                                    background:isSelected?(dark?"rgba(212,175,55,0.18)":"rgba(212,175,55,0.15)"):"transparent",
                                    boxShadow:isSelected?(dark?"0 0 8px rgba(212,175,55,0.20)":"0 0 8px rgba(212,175,55,0.15)"):"none",
                                    transition:"background .15s",
                                  }}>
                                  <span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:20,color:isSelected?(dark?"#F5E6B3":"#3A2200"):(dark?"#E8DFC0":"#2D2A26")}}>{(verse.text_uthmani||"").replace(/\u06DF/g,"\u0652")}</span>
                                  <span style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:16,color:isSelected?(dark?"rgba(212,175,55,0.80)":"#7A5C0E"):(dark?"rgba(212,175,55,0.38)":"#A08848"),marginRight:2,marginLeft:2}}>﴿{toArabicDigits(aNum)}﴾</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    </div>);
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
                          <div style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:20,lineHeight:2,color:dark?"#E8DFC0":"#2D2A26",direction:"rtl",textAlign:"center"}}>
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
            <div style={{fontSize:11,color:dark?"rgba(217,177,95,0.45)":"#6B645A",fontFamily:"'DM Sans',sans-serif",letterSpacing:".08em"}}>Page {mushafPage} · Juz {mushafJuzNum}</div>
            <div className="sbtn" onClick={()=>{setMushafSwipeAnim("right");setMushafPage(p=>Math.max(1,p-1));}} style={{padding:"10px 22px",fontSize:22,color:mushafPage>1?(dark?"rgba(217,177,95,0.60)":"#6B645A"):(dark?"rgba(217,177,95,0.15)":"rgba(0,0,0,0.20)"),borderRadius:10,border:dark?"1px solid rgba(217,177,95,0.15)":"1px solid rgba(139,106,16,0.18)",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.05)"}}>›</div>
          </div>


        </div>
        );
      })()}

      {/* ═══ TIMELINE ═══ */}
      {activeTab==="rihlah"&&rihlahTab==="timeline"&&(
        <div ref={rihlahScrollRef} style={{flex:1,overflowY:"auto",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",padding:"16px 16px 120px"}} className="fi gold-particles">

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
              {goalYears}-Year{goalMonths>0?` ${goalMonths}-Month`:""} Hifz Plan
            </div>
            <div style={{fontSize:13,color:"rgba(243,231,200,0.45)"}}>
              {dailyNew} ayahs per day · {timeline.juzLeft} juz remaining
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
              <span style={{fontSize:14,color:"#F3E7C8",fontWeight:600}}>{dailyNew} ayahs / day</span>
            </div>
            <div style={{height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.35) 50%,rgba(217,177,95,0) 100%)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0"}}>
              <span style={{fontSize:14}}>📆</span>
              <span style={{fontSize:14,color:"#F3E7C8",fontWeight:600}}>{timeline.juzPerMonth} juz / month</span>
            </div>
          </div>

          {/* ── TODAY'S FLOW ── */}
          <div style={{padding:"16px",borderRadius:16,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(217,177,95,0.18)",marginBottom:14,boxShadow:"0 4px 16px rgba(0,0,0,0.22),0 0 10px rgba(217,177,95,0.06)"}}>
            <div style={{fontSize:11,color:"rgba(217,177,95,0.55)",fontWeight:600,letterSpacing:".08em",marginBottom:14}}>Your Daily Plan</div>
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {[
                {icon:"\u{1F305}",name:"Fajr",label:"Begin your memorization",desc:`Memorize ${dailyNew} new ayahs \u2014 the foundation is repetition`,glow:"rgba(240,192,64,0.35)"},
                {icon:"\u2600\uFE0F",name:"Dhuhr",label:"Review what you learned",desc:"Go over what you memorized earlier",glow:"rgba(246,166,35,0.30)"},
                {icon:"\u{1F324}\uFE0F",name:"Asr",label:"Strengthen your memorization",desc:"Revision scales as you progress",glow:"rgba(78,205,196,0.25)"},
                {icon:"\u{1F306}",name:"Maghrib",label:"Sit with the Qur'an and listen",desc:"Listen and follow along (15\u201320 min)",glow:"rgba(183,148,244,0.25)"},
                {icon:"\u{1F319}",name:"Isha",label:"Complete today's journey",desc:"Recite everything one final time",glow:"rgba(104,211,145,0.25)"},
              ].map((s,i,arr)=>(
                <div key={s.name}>
                  <div style={{padding:"12px 0"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:30,height:30,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,background:`radial-gradient(circle,${s.glow} 0%,transparent 70%)`,filter:`drop-shadow(0 0 6px ${s.glow})`}}>{s.icon}</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}><span style={{color:"#E6B84A",textShadow:"0 0 10px rgba(230,184,74,0.25)"}}>{s.name}</span> <span style={{fontWeight:400,color:"rgba(243,231,200,0.55)"}}>{"\u2014"} {s.label}</span></div>
                        <div style={{fontSize:11,color:"rgba(243,231,200,0.30)",marginTop:2}}>{s.desc}</div>
                      </div>
                    </div>
                  </div>
                  {i<arr.length-1&&<div style={{height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.30) 50%,rgba(217,177,95,0) 100%)"}}/>}
                </div>
              ))}
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
      )}

      {/* ═══ ADJUST PLAN (opened from settings gear) ═══ */}
      {activeTab==="rihlah"&&rihlahTab==="adjust"&&(
        <div ref={rihlahScrollRef} style={{flex:1,overflowY:"auto",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",padding:"16px 16px 120px"}} className="fi gold-particles">
          <div style={{marginBottom:20}}>
            <div className="sbtn" onClick={()=>setRihlahTab("home")} style={{display:"inline-block",padding:"6px 12px",background:dark?"rgba(255,255,255,0.04)":"#EADFC8",border:dark?"1px solid rgba(217,177,95,0.12)":"1px solid rgba(0,0,0,0.08)",borderRadius:8,fontSize:11,color:dark?"rgba(243,231,200,0.50)":"#6B645A",marginBottom:10}}>← Back</div>
          </div>
          <div style={{padding:"22px 18px",borderRadius:20,marginBottom:16,textAlign:"center",position:"relative",overflow:"hidden",background:dark?"linear-gradient(180deg,rgba(15,26,43,0.97) 0%,rgba(12,21,38,0.99) 100%)":"#EADFC8",border:dark?"1px solid rgba(217,177,95,0.22)":"1px solid rgba(0,0,0,0.08)",boxShadow:dark?"0 10px 40px rgba(0,0,0,0.40),0 0 20px rgba(217,177,95,0.08)":"0 4px 16px rgba(0,0,0,0.06)"}}>
            <div style={{position:"absolute",inset:0,pointerEvents:"none",background:dark?"radial-gradient(circle at 50% 20%,rgba(212,175,55,0.08) 0%,transparent 50%)":"none"}}/>
            <div style={{position:"relative",zIndex:1}}>
              <div style={{fontSize:13,color:dark?"rgba(243,231,200,0.50)":"#6B645A",marginBottom:8}}>Complete Your Hifz In</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,color:dark?"#F6E27A":"#D4AF37",fontWeight:700,marginBottom:10,textShadow:dark?"0 0 18px rgba(246,226,122,0.15)":"none"}}>
                {goalYears} Year{goalYears!==1?"s":""}{goalMonths>0?<span style={{fontSize:24,marginLeft:8}}>{goalMonths} Month{goalMonths!==1?"s":""}</span>:""}
              </div>
              <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.35)":"#6B645A"}}>Your path to completion</div>
            </div>
          </div>
          <div style={{padding:"16px 18px",borderRadius:16,background:dark?"rgba(255,255,255,0.02)":"#EADFC8",border:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(0,0,0,0.08)",marginBottom:16,boxShadow:dark?"0 4px 16px rgba(0,0,0,0.22),0 0 10px rgba(217,177,95,0.05)":"0 2px 8px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:12,color:dark?"rgba(243,231,200,0.50)":"#6B645A"}}>Base Timeline</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,color:dark?"#E6B84A":"#D4AF37",fontWeight:600}}>{goalYears} Year{goalYears!==1?"s":""}</span>
            </div>
            <input type="range" min={0} max={10} value={goalYears} onChange={e=>setGoalYears(Number(e.target.value))} style={{width:"100%",marginBottom:16}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:12,color:dark?"rgba(243,231,200,0.50)":"#6B645A"}}>Extra Buffer</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,color:dark?"#E6B84A":"#D4AF37",fontWeight:600}}>+{goalMonths} Month{goalMonths!==1?"s":""}</span>
            </div>
            <input type="range" min={0} max={11} value={goalMonths} onChange={e=>setGoalMonths(Number(e.target.value))} style={{width:"100%"}}/>
          </div>
          <div style={{padding:"16px 18px",borderRadius:16,background:dark?"rgba(255,255,255,0.02)":"#EADFC8",border:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(0,0,0,0.08)",marginBottom:16,boxShadow:dark?"0 4px 16px rgba(0,0,0,0.22),0 0 10px rgba(217,177,95,0.05)":"0 2px 8px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}><span style={{fontSize:14}}>📖</span><span style={{fontSize:13,color:dark?"rgba(243,231,200,0.60)":"#2D2A26"}}>{dailyNew} ayahs per day</span></div>
            <div style={{height:1,background:dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.25) 50%,rgba(217,177,95,0) 100%)":"linear-gradient(90deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0.08) 50%,rgba(0,0,0,0) 100%)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",position:"relative"}}>
              <div style={{position:"absolute",inset:0,pointerEvents:"none",background:dark?"radial-gradient(ellipse at 30% 50%,rgba(212,175,55,0.06) 0%,transparent 60%)":"none"}}/>
              <span style={{fontSize:16,position:"relative",zIndex:1}}>📆</span>
              <span style={{fontSize:16,color:dark?"#F6E27A":"#D4AF37",fontWeight:700,position:"relative",zIndex:1,textShadow:dark?"0 0 10px rgba(246,226,122,0.20)":"none"}}>~{timeline.daysPerJuz} days per juz</span>
            </div>
            <div style={{height:1,background:dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.25) 50%,rgba(217,177,95,0) 100%)":"linear-gradient(90deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0.08) 50%,rgba(0,0,0,0) 100%)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}><span style={{fontSize:14}}>📊</span><span style={{fontSize:13,color:dark?"rgba(243,231,200,0.45)":"#2D2A26"}}>{timeline.juzPerMonth} juz per month</span></div>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:dark?"rgba(217,177,95,0.55)":"#6B645A",fontWeight:600,letterSpacing:".08em",marginBottom:12}}>Choose Your Pace</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              {[{y:1,label:"Intense",icon:"⚡"},{y:2,label:"Focused",icon:"🔥"}].map(p=>{
                const t=calcTimeline(p.y,memorizedAyahs,0,null,completedCount);const isA=p.y===goalYears;
                return (<div key={p.y} className="sbtn" onClick={()=>{setGoalYears(p.y);setGoalMonths(0);}} style={{padding:"12px 8px",borderRadius:14,textAlign:"center",background:isA?(dark?"rgba(230,184,74,0.10)":"rgba(212,175,55,0.12)"):(dark?"rgba(255,255,255,0.02)":"#EADFC8"),border:`1px solid ${isA?(dark?"rgba(232,200,120,0.50)":"#D4AF37"):(dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.08)")}`,boxShadow:isA?"0 0 16px rgba(230,184,74,0.15)":"none"}}>
                  <div style={{fontSize:13,color:isA?(dark?"#F6E27A":"#D4AF37"):(dark?"rgba(243,231,200,0.50)":"#2D2A26"),fontWeight:700}}>{p.y} Year{p.y!==1?"s":""}</div>
                  <div style={{fontSize:11,color:isA?(dark?"#E6B84A":"#D4AF37"):(dark?"rgba(243,231,200,0.30)":"#6B645A"),fontWeight:600,marginTop:2}}>{Math.round(parseFloat(t.ayahsPerDay))} ayahs/day</div>
                  <div style={{fontSize:9,color:isA?(dark?"rgba(230,184,74,0.65)":"#D4AF37"):(dark?"rgba(243,231,200,0.22)":"#6B645A"),marginTop:6}}>{p.icon} {p.label}</div>
                </div>);
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[{y:3,label:"Balanced",icon:"✅"},{y:5,label:"Light",icon:"🧘"},{y:7,label:"Gentle",icon:"🌙"}].map(p=>{
                const t=calcTimeline(p.y,memorizedAyahs,0,null,completedCount);const isA=p.y===goalYears;
                return (<div key={p.y} className="sbtn" onClick={()=>{setGoalYears(p.y);setGoalMonths(0);}} style={{padding:"12px 8px",borderRadius:14,textAlign:"center",background:isA?(dark?"rgba(230,184,74,0.10)":"rgba(212,175,55,0.12)"):(dark?"rgba(255,255,255,0.02)":"#EADFC8"),border:`1px solid ${isA?(dark?"rgba(232,200,120,0.50)":"#D4AF37"):(dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.08)")}`,boxShadow:isA?"0 0 16px rgba(230,184,74,0.15)":"none"}}>
                  <div style={{fontSize:13,color:isA?(dark?"#F6E27A":"#D4AF37"):(dark?"rgba(243,231,200,0.50)":"#2D2A26"),fontWeight:700}}>{p.y} Year{p.y!==1?"s":""}</div>
                  <div style={{fontSize:11,color:isA?(dark?"#E6B84A":"#D4AF37"):(dark?"rgba(243,231,200,0.30)":"#6B645A"),fontWeight:600,marginTop:2}}>{Math.round(parseFloat(t.ayahsPerDay))} ayahs/day</div>
                  <div style={{fontSize:9,color:isA?(dark?"rgba(230,184,74,0.65)":"#D4AF37"):(dark?"rgba(243,231,200,0.22)":"#6B645A"),marginTop:6}}>{p.icon} {p.label}</div>
                </div>);
              })}
            </div>
          </div>
          <div style={{textAlign:"center",padding:"14px 10px",marginBottom:20}}>
            <div style={{fontSize:12,color:"rgba(243,231,200,0.35)",lineHeight:1.7}}>This plan requires consistency, not perfection.<br/>Small daily effort leads to completion — <span style={{fontFamily:"'Amiri',serif",fontSize:14,color:"rgba(230,184,74,0.50)"}}>بِإذْنِ اللَّهِ</span></div>
          </div>
          <div className="sbtn" onClick={()=>setRihlahTab("home")} style={{width:"100%",padding:"15px",borderRadius:16,textAlign:"center",fontSize:15,fontWeight:700,color:"#0B1220",background:"linear-gradient(180deg,#E6B84A,#D4A62A)",boxShadow:"0 8px 22px rgba(230,184,74,0.25),0 0 12px rgba(230,184,74,0.10)"}}>
            Save & Return
          </div>
        </div>
      )}

      {/* ── Juz Selector Modal ── */}
      {showJuzModal&&(()=>{
        // Find the furthest juz the user has reached (first incomplete in hifz order 30→1)
        const isJuzDone=(n)=>juzStatus[n]==="complete"||(JUZ_SURAHS[n]||[]).every(s=>juzStatus[`s${s.s}`]==="complete");
        let furthestJuz=30;
        for(let j=30;j>=1;j--){ if(!isJuzDone(j)){ furthestJuz=j; break; } }
        const furthestOrder=(JUZ_META.find(j=>j.num===furthestJuz)||{}).order||1;
        const isJuzUnlocked=(juzNum)=>{
          if(juzNum===sessionJuz) return true;
          if(juzStatus[juzNum]==="complete") return true;
          const surahs=JUZ_SURAHS[juzNum]||[];
          if(surahs.some(s=>juzStatus[`s${s.s}`]==="complete")) return true;
          const jOrder=(JUZ_META.find(j=>j.num===juzNum)||{}).order||99;
          return jOrder<=furthestOrder;
        };
        return (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.80)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowJuzModal(false)}>
          <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",padding:"16px 18px 32px",width:"100%",maxWidth:520,maxHeight:"70vh",overflowY:"auto",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,background:dark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)",borderRadius:2,margin:"0 auto 14px"}}/>

            {/* Header divider */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{flex:1,height:1,background:dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.50) 100%)":"linear-gradient(90deg,rgba(140,100,20,0) 0%,rgba(140,100,20,0.30) 100%)"}}/>
              <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.70)":"rgba(100,70,10,0.65)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600,whiteSpace:"nowrap"}}>Select Juz</div>
              <div style={{flex:1,height:1,background:dark?"linear-gradient(90deg,rgba(232,200,120,0.50) 0%,rgba(217,177,95,0) 100%)":"linear-gradient(90deg,rgba(140,100,20,0.30) 0%,rgba(140,100,20,0) 100%)"}}/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,paddingBottom:8}}>
              {JUZ_META.slice().reverse().map(j=>{
                const isSel=sessionJuz===j.num;
                const isDone=juzStatus[j.num]==="complete"||(JUZ_SURAHS[j.num]||[]).every(s=>juzStatus[`s${s.s}`]==="complete");
                const unlocked=isJuzUnlocked(j.num);
                return (
                  <div key={j.num} className={unlocked?"sbtn":""} onClick={()=>{ if(!unlocked)return; setJuzProgress(prev=>({...prev,[sessionJuz]:sessionIdx})); setSessionJuz(j.num); setSessionIdx(juzProgress[j.num]||0); setRepCounts({});setConnectionReps({}); setOpenAyah(null); setShowJuzModal(false); }}
                    style={{padding:"13px 16px",borderRadius:14,textAlign:"center",transition:"all .18s",
                      background:isSel?(dark?"rgba(217,177,95,0.14)":"rgba(180,140,40,0.12)"):isDone?(dark?"rgba(217,177,95,0.06)":"rgba(180,140,40,0.06)"):unlocked?(dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)"):(dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)"),
                      border:`1px solid ${isSel?(dark?"rgba(232,200,120,0.65)":"rgba(160,120,20,0.55)"):isDone?(dark?"rgba(217,177,95,0.25)":"rgba(160,120,20,0.25)"):unlocked?(dark?"rgba(217,177,95,0.15)":"rgba(0,0,0,0.12)"):(dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.05)")}`,
                      boxShadow:isSel?"0 0 28px rgba(232,200,120,0.30),0 0 8px rgba(217,177,95,0.20),inset 0 0 14px rgba(217,177,95,0.08)":"none",
                      opacity:unlocked?1:0.3,
                      pointerEvents:unlocked?"auto":"none"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:isSel?(dark?"#F6E27A":"#6B4F00"):isDone?(dark?"#E2BC72":"#8B6914"):unlocked?(dark?"rgba(243,231,200,0.70)":"rgba(40,30,10,0.65)"):(dark?"rgba(243,231,200,0.30)":"rgba(40,30,10,0.25)"),fontWeight:600}}>Juz {j.num}</div>
                    {isDone&&(
                      <div style={{fontSize:10,color:isSel?(dark?"rgba(246,226,122,0.60)":"rgba(107,79,0,0.60)"):(dark?"rgba(230,184,74,0.55)":"rgba(140,100,20,0.60)"),marginTop:4,textShadow:dark?"0 0 8px rgba(230,184,74,0.15)":"none"}}>Complete — Alhamdulillah</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        );
      })()}

      {/* Mushaf Audio Range Picker */}
      {showMushafRangePicker&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowMushafRangePicker(false)}>
          <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",padding:"16px 18px 32px",width:"100%",maxWidth:520,maxHeight:"70vh",overflowY:"auto",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,background:"rgba(255,255,255,0.10)",borderRadius:2,margin:"0 auto 14px"}}/>

            {/* Header */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(217,177,95,0),rgba(232,200,120,0.50))"}}/>
              <div style={{fontSize:9,color:"rgba(217,177,95,0.70)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600}}>Select Ayah Range</div>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(232,200,120,0.50),rgba(217,177,95,0))"}}/>
            </div>
            <div style={{fontSize:11,color:"rgba(217,177,95,0.40)",textAlign:"center",marginBottom:16}}>Page {mushafPage} · {mushafVerses.length} ayahs</div>

            {/* Ayah list — tap to set start/end */}
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
              {mushafVerses.map((v,i)=>{
                const vKey=v.verse_key;
                const [s,a]=vKey.split(":");
                const ayahNum=Number(a);
                const isStart=mushafRangeStart===i;
                const isEnd=mushafRangeEnd===i;
                const inRange=mushafRangeStart!==null&&mushafRangeEnd!==null&&i>=mushafRangeStart&&i<=mushafRangeEnd;
                return(
                  <div key={vKey} className="sbtn"
                    onClick={()=>{
                      if(mushafRangeStart===null||mushafRangeEnd!==null){
                        setMushafRangeStart(i); setMushafRangeEnd(null);
                      } else if(i<mushafRangeStart){
                        setMushafRangeStart(i);
                      } else {
                        setMushafRangeEnd(i);
                      }
                    }}
                    style={{padding:"10px 14px",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between",
                      background:inRange?"rgba(217,177,95,0.10)":isStart||isEnd?"rgba(217,177,95,0.14)":"rgba(255,255,255,0.03)",
                      border:`1px solid ${isStart?"rgba(232,200,120,0.70)":isEnd?"rgba(232,200,120,0.50)":inRange?"rgba(217,177,95,0.20)":"rgba(217,177,95,0.08)"}`,
                    }}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{fontSize:10,fontFamily:"'IBM Plex Mono',monospace",color:"rgba(217,177,95,0.40)",width:24}}>{ayahNum}</div>
                      <div style={{fontSize:12,color:inRange||isStart||isEnd?"#F5E6B3":"rgba(243,231,200,0.55)",direction:"rtl",maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.text_uthmani||""}</div>
                    </div>
                    <div style={{fontSize:10,color:isStart?"#F6E27A":isEnd?"rgba(246,226,122,0.60)":"transparent",fontWeight:600,flexShrink:0}}>
                      {isStart?"START":isEnd?"END":""}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Play button */}
            <div className="sbtn"
              onClick={()=>{
                const start=mushafRangeStart??0;
                const end=mushafRangeEnd??mushafVerses.length-1;
                const slice=mushafVerses.slice(start,end+1);
                setShowMushafRangePicker(false);
                playMushafRange(slice);
              }}
              style={{width:"100%",padding:"14px",borderRadius:14,textAlign:"center",background:mushafRangeStart!==null?"linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)":"rgba(255,255,255,0.04)",color:mushafRangeStart!==null?"#060A07":"rgba(243,231,200,0.30)",fontSize:14,fontWeight:700,border:`1px solid ${mushafRangeStart!==null?"transparent":"rgba(217,177,95,0.12)"}`,boxShadow:mushafRangeStart!==null?"0 8px 24px rgba(212,175,55,0.22)":"none"}}>
              {mushafRangeStart===null?"Tap an ayah to set start range":`Play Ayah ${Number(mushafVerses[mushafRangeStart]?.verse_key?.split(":")?.[1])} → ${Number(mushafVerses[mushafRangeEnd??mushafVerses.length-1]?.verse_key?.split(":")?.[1])}`}
            </div>
          </div>
        </div>
      )}

      {/* Quran Juz Picker Modal */}
      {showQuranJuzModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.80)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowQuranJuzModal(false)}>
          <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",padding:"16px 18px 32px",width:"100%",maxWidth:520,maxHeight:"70vh",overflowY:"auto",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,background:"rgba(255,255,255,0.10)",borderRadius:2,margin:"0 auto 14px"}}/>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.50) 100%)"}}/>
              <div style={{fontSize:9,color:"rgba(217,177,95,0.70)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600}}>Select Juz</div>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(232,200,120,0.50) 0%,rgba(217,177,95,0) 100%)"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {Array.from({length:30},(_,i)=>i+1).map(jNum=>{
                const isSel=mushafJuzNum===jNum;
                const pg=JUZ_PAGES[jNum-1]||1;
                return(
                  <div key={jNum} className="sbtn" onClick={()=>{setMushafJuzNum(jNum);setMushafPage(pg);setShowQuranJuzModal(false);}}
                    style={{padding:"13px 16px",borderRadius:14,textAlign:"center",
                      background:isSel?"rgba(217,177,95,0.12)":"rgba(255,255,255,0.03)",
                      border:`1px solid ${isSel?"rgba(232,200,120,0.65)":"rgba(217,177,95,0.12)"}`,
                      boxShadow:isSel?"0 0 28px rgba(232,200,120,0.30),inset 0 0 14px rgba(217,177,95,0.08)":"none"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:600,color:isSel?"#F6E27A":"rgba(243,231,200,0.70)"}}>Juz {jNum}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quran Surah Picker Modal */}
      {showQuranSurahModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.80)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowQuranSurahModal(false)}>
          <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",padding:"16px 18px 32px",width:"100%",maxWidth:520,maxHeight:"75vh",overflowY:"auto",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,background:"rgba(255,255,255,0.10)",borderRadius:2,margin:"0 auto 14px"}}/>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.50) 100%)"}}/>
              <div style={{fontSize:9,color:"rgba(217,177,95,0.70)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600}}>Select Surah</div>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(232,200,120,0.50) 0%,rgba(217,177,95,0) 100%)"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {Object.entries(SURAH_PAGES).map(([num,pg])=>{
                const n=Number(num);
                const isSel=mushafSurahNum===n;
                return(
                  <div key={n} className="sbtn" onClick={()=>{setMushafPage(pg);setMushafSurahNum(n);setSelectedSurahNum(n);setShowQuranSurahModal(false);}}
                    style={{padding:"13px 16px",borderRadius:14,textAlign:"center",
                      background:isSel?"rgba(217,177,95,0.12)":"rgba(255,255,255,0.03)",
                      border:`1px solid ${isSel?"rgba(232,200,120,0.65)":"rgba(217,177,95,0.12)"}`,
                      boxShadow:isSel?"0 0 28px rgba(232,200,120,0.30),inset 0 0 14px rgba(217,177,95,0.08)":"none"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:isSel?600:400,color:isSel?"#F6E27A":"rgba(243,231,200,0.70)",marginBottom:2}}>{SURAH_EN[n]}</div>
                    <div style={{fontSize:11,color:isSel?"rgba(246,226,122,0.60)":"rgba(217,177,95,0.35)",direction:"rtl"}}>{SURAH_AR[n]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quran Reciter Modal */}
{/* ── 2-PAGE WARNING MODAL ── */}
{twoPageWarning&&(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(6px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setTwoPageWarning(null)}>
    <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:20,maxWidth:380,width:"100%",border:"1px solid rgba(217,177,95,0.30)",boxShadow:"0 20px 60px rgba(0,0,0,0.60), 0 0 30px rgba(212,175,55,0.15)",padding:"22px 20px"}} onClick={e=>e.stopPropagation()}>
      <div style={{textAlign:"center",marginBottom:12}}>
        <div style={{fontSize:28,marginBottom:8}}>📖</div>
        <div style={{fontSize:10,color:"#D4AF37",letterSpacing:".16em",textTransform:"uppercase",fontWeight:700,marginBottom:6}}>Sheikh Al-Qasim's Wisdom</div>
      </div>
      <div style={{fontFamily:"'Amiri',serif",fontSize:16,color:dark?"#F6E27A":"#B45309",direction:"rtl",textAlign:"center",lineHeight:1.8,marginBottom:12}}>
        لا تحفظ أكثر من صفحتين في اليوم
      </div>
      <div style={{fontSize:13,color:dark?"rgba(243,231,200,0.80)":"#2D2A26",lineHeight:1.7,textAlign:"center",marginBottom:14,fontStyle:"italic"}}>
        "Do not memorize more than two pages a day. Consistency and quality over quantity — this is the path that lasts."
      </div>
      <div style={{padding:"12px 14px",background:dark?"rgba(212,175,55,0.08)":"rgba(212,175,55,0.10)",border:`1px solid ${dark?"rgba(212,175,55,0.25)":"rgba(180,120,30,0.30)"}`,borderRadius:12,marginBottom:14,textAlign:"center"}}>
        <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.60)":"#6B645A",marginBottom:4}}>Your target was</div>
        <div style={{fontSize:14,fontWeight:700,color:dark?"#F0C040":"#B45309",marginBottom:6}}>{twoPageWarning.target} ayahs today</div>
        <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.60)":"#6B645A",marginBottom:4}}>Adjusted to fit within 2 pages</div>
        <div style={{fontSize:18,fontWeight:700,color:"#4ADE80"}}>{twoPageWarning.actual} ayahs today</div>
      </div>
      <div className="sbtn" onClick={()=>setTwoPageWarning(null)} style={{width:"100%",padding:"12px",borderRadius:12,textAlign:"center",fontSize:13,fontWeight:700,color:dark?"#0A0E1A":"#fff",background:"linear-gradient(180deg,#E6B84A,#D4A62A)"}}>
        I understand · بارك الله فيك
      </div>
    </div>
  </div>
)}

{/* ── SETTINGS MODAL ── */}
{showSettings&&(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.80)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowSettings(false)}>
    <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",width:"100%",maxWidth:500,maxHeight:"80vh",display:"flex",flexDirection:"column",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
      <div style={{padding:"12px 18px 0",textAlign:"center",flexShrink:0}}>
        <div style={{width:36,height:4,background:dark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)",borderRadius:2,margin:"0 auto 12px"}}/>
        <div style={{fontSize:15,fontWeight:700,color:dark?"#F3E7C8":"#3D2E0A"}}>Settings</div>
        <div style={{fontSize:10,color:T.dim,marginTop:4}}>📅 Joined 2026</div>
      </div>
      <div style={{overflowY:"auto",padding:"14px 18px 28px"}}>
        {/* Dark mode toggle */}
        <div className="sbtn" onClick={()=>setDark(!dark)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)"}`,borderRadius:12,marginBottom:6}}>
          <div style={{fontSize:13,color:T.text}}>{dark?"🌙 Dark Mode":"☀️ Light Mode"}</div>
          <div style={{width:36,height:20,borderRadius:10,background:dark?"#D4AF37":"rgba(0,0,0,0.15)",padding:2,display:"flex",alignItems:`center`,justifyContent:dark?"flex-end":"flex-start"}}>
            <div style={{width:16,height:16,borderRadius:"50%",background:"#fff",transition:"all .2s"}}/>
          </div>
        </div>
        {/* Adjust Plan */}
        <div className="sbtn" onClick={()=>{setShowSettings(false);setActiveTab("rihlah");setRihlahTab("adjust");}} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)"}`,borderRadius:12,marginBottom:6}}>
          <div style={{fontSize:13,color:T.text}}>⚙️ Adjust Plan</div>
        </div>
        {/* About */}
        <div className="sbtn" onClick={()=>{setShowSettings(false);setActiveTab("masjidayn");setMasjidaynTab("about");}} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)"}`,borderRadius:12,marginBottom:6}}>
          <div style={{fontSize:13,color:T.text}}>ℹ️ About</div>
        </div>
        {/* Terms — placeholder */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)"}`,borderRadius:12,marginBottom:6,opacity:0.5}}>
          <div style={{fontSize:13,color:T.text}}>📄 Terms & Privacy</div>
        </div>
        {/* Version */}
        <div style={{textAlign:"center",marginTop:14,fontSize:10,color:T.dim}}>
          Rihlat Al-Hifz · Version 1.0 · 2026
        </div>
      </div>
    </div>
  </div>
)}

{showReciterModal&&(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.80)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowReciterModal(false)}>
    <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",width:"100%",maxWidth:500,maxHeight:"68vh",display:"flex",flexDirection:"column",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>

      {/* ── Handle + Header ── */}
      <div style={{padding:"12px 18px 0",textAlign:"center"}}>
        <div style={{width:36,height:4,background:dark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)",borderRadius:2,margin:"0 auto 12px"}}/>
        <div style={{fontSize:13,fontWeight:700,color:dark?"#F3E7C8":"#3D2E0A",letterSpacing:".03em"}}>Select Reciter</div>
        <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.40)":"rgba(40,30,10,0.50)",marginTop:4,marginBottom:10}}>
          Currently: <span style={{color:dark?"rgba(230,184,74,0.75)":"rgba(140,100,20,0.85)",fontWeight:600}}>{reciterMode==="quran"?(QURAN_RECITERS.find(r=>r.id===quranReciter)?.name||"Unknown"):currentReciter.name}</span>
        </div>
      </div>

      {/* ── Reciter list ── */}
      <div style={{overflowY:"auto",padding:"0 12px 28px"}}>
        {(()=>{
          const list=reciterMode==="quran"?QURAN_RECITERS:RECITERS;
          const selectedId=reciterMode==="quran"?quranReciter:reciter;
          const groups=["Masjid Al-Haram","Masjid An-Nabawi","Hifz Favorite","Popular"];
          const renderReciter=(r)=>{
            const isSelected=selectedId===r.id;
            return (
              <div key={r.id} className="sbtn" onClick={()=>{
                if(reciterMode==="quran"){
                  setQuranReciter(r.id);
                  setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null);
                  if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; }
                } else { setReciter(r.id); }
                setShowReciterModal(false);
              }} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,transition:"all .15s",
                background:isSelected?(dark?"rgba(230,184,74,0.10)":"rgba(180,140,40,0.08)"):(dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)"),
                border:`1px solid ${isSelected?(dark?"rgba(230,184,74,0.35)":"rgba(160,120,20,0.40)"):(dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)")}`,
                boxShadow:isSelected?"0 0 14px rgba(230,184,74,0.08),inset 0 0 12px rgba(230,184,74,0.06)":"none"}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:isSelected?(dark?"rgba(230,184,74,0.12)":"rgba(180,140,40,0.10)"):(dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)"),border:`1px solid ${isSelected?(dark?"rgba(230,184,74,0.25)":"rgba(160,120,20,0.30)"):(dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)")}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12}}>🎙️</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:isSelected?700:400,color:isSelected?(dark?"#F3E7C8":"#3D2E0A"):(dark?"rgba(243,231,200,0.65)":"rgba(40,30,10,0.65)")}}>{r.name}</div>
                  <div style={{fontFamily:"'Amiri',serif",fontSize:12,color:isSelected?(dark?"rgba(230,184,74,0.55)":"rgba(140,100,20,0.70)"):(dark?"rgba(243,231,200,0.30)":"rgba(40,30,10,0.40)"),marginTop:1}}>{r.arabic}</div>
                </div>
                {isSelected&&<div style={{fontSize:14,color:"#E6B84A",fontWeight:700,flexShrink:0}}>✓</div>}
              </div>
            );
          };
          return groups.map(group=>{
            const groupReciters=list.filter(r=>r.tag===group);
            if(!groupReciters.length) return null;
            return (
              <div key={group} style={{marginBottom:12}}>
                <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.50)":"rgba(140,100,20,0.50)",letterSpacing:".14em",textTransform:"uppercase",fontWeight:700,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                  <span>{group==="Masjid Al-Haram"?"🕋":group==="Masjid An-Nabawi"?"🌙":"🎙️"} {group}</span>
                  <div style={{flex:1,height:1,background:dark?"rgba(217,177,95,0.12)":"rgba(0,0,0,0.06)"}}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {groupReciters.map(renderReciter)}
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  </div>
)}

      {activeTab==="masjidayn"&&(
        <MasjidaynTab
          dark={dark} T={T}
          masjidaynTab={masjidaynTab} setMasjidaynTab={setMasjidaynTab}
          activeStream={activeStream}
          selectedRamadanNight={selectedRamadanNight} setSelectedRamadanNight={setSelectedRamadanNight}
          ramadanVideoType={ramadanVideoType} setRamadanVideoType={setRamadanVideoType}
          haramainMosque={haramainMosque} setHaramainMosque={setHaramainMosque}
          openImam={openImam} setOpenImam={setOpenImam}
          haramainPlaying={haramainPlaying} playHaramainSurah={playHaramainSurah}
        />
      )}

    </>)}

    </div>
  );
}
