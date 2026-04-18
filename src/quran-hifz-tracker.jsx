import { useState, useEffect, useRef, useMemo } from "react";
import MUTASHABIHAT from "./mutashabihat.json";
import { RECITERS, SURAH_EN, SURAH_AYAH_COUNTS, JUZ_RANGES, DARK, LIGHT, STATUS_CFG, MONTH_NAMES, TODAY, DATEKEY, FMTDATE } from "./data/constants";
import { SESSIONS, getSessionWisdom } from "./data/sessions";
import { SURAH_AR, JUZ_OPENERS, JUZ_META, JUZ_SURAHS } from "./data/quran-metadata";
import { LIVE_STREAMS, RAMADAN_NIGHTS_MAKKAH, RAMADAN_NIGHTS_MADINAH, MAKKAH_IMAMS, MADINAH_IMAMS, HARAMAIN_SURAHS } from "./data/haramain";
import { mushafImageUrl, audioUrl, audioUrlFallback, toArabicDigits, calcTimeline, loadCompletedAyahs, saveCompletedAyahs, expandRangeToKeys, getJuzKeys, cropMushafImage } from "./utils";
import HlsPlayer from "./components/HlsPlayer";
import AsrSessionView from "./components/AsrSessionView";
import QuranPageView from "./components/QuranPageView";
import SettingsModal from "./components/SettingsModal";
import JuzSelectorModal from "./components/JuzSelectorModal";
import SurahPickerModal from "./components/SurahPickerModal";
import AdjustPlan from "./components/AdjustPlan";
import RihlahProgressPath from "./components/RihlahProgressPath";
import RihlahHome from "./tabs/RihlahHome";
import TwoPageWarningModal from "./components/TwoPageWarningModal";
import MushafRangePickerModal from "./components/MushafRangePickerModal";
import QuranJuzModal from "./components/QuranJuzModal";
import ReciterModal from "./components/ReciterModal";
import HaramainPlayer from "./components/HaramainPlayer";
import useHifzProgress from "./hooks/useHifzProgress";
import useAudio from "./hooks/useAudio";
import MasjidaynTab from "./tabs/MasjidaynTab";
import MyHifzTab from "./tabs/MyHifzTab";
import MyMemorizationView from "./tabs/MyMemorizationView";
import useHaramainPlayer from "./hooks/useHaramainPlayer";
import { parseTafsirBlocks } from "./data/tafsir";
import QuranTab from "./tabs/QuranTab";
import Onboarding from "./components/Onboarding";

export default function RihlatAlHifz() {
  const [dark,setDark]=useState(true);
  const [showSettings,setShowSettings]=useState(false);
  const [tabBeforeAdjust,setTabBeforeAdjust]=useState(null); // {activeTab, rihlahTab}
  const [editName,setEditName]=useState("");
  const [showNameModal,setShowNameModal]=useState(false);
  const [showResetConfirm,setShowResetConfirm]=useState(false);
  const [showTerms,setShowTerms]=useState(false);
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
  const [hifzViewMode,setHifzViewMode]=useState("mushaf"); // "interactive" or "mushaf"
  const [badgeCelebration,setBadgeCelebration]=useState(null); // {emoji, title, message}
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
  const setActiveSessionIndex=(v)=>{setActiveSessionIndex_(v);};
  const SESSION_CTA=["Finish Fajr — Well Done","Finish Dhuhr — Solid Review","Finish Asr — Great Effort","Finish Maghrib — Beautifully Done","Finish Isha — Day Complete"];
  const [sessionsCompleted,setSessionsCompleted]=useState({fajr:false,dhuhr:false,asr:false,maghrib:false,isha:false});
  const [duaIdx,setDuaIdx]=useState(()=>Math.floor(Math.random()*6));
  const [activeTab,setActiveTab_]=useState("rihlah");
  const scrollAllToTop=()=>{if(showOnboarding) return;setTimeout(()=>{document.querySelectorAll('.fi, [class*="fi"]').forEach(el=>el.scrollTop=0);document.querySelectorAll('div').forEach(el=>{const s=getComputedStyle(el);if(s.overflowY==='auto'||s.overflowY==='scroll')el.scrollTop=0;});window.scrollTo(0,0);},50);};
  const setActiveTab=(tab)=>{setActiveTab_(tab);};
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
  const [fontSize,setFontSize]=useState(()=>{try{return parseInt(localStorage.getItem("rihlat-fontsize"))||19;}catch{return 19;}});
  useEffect(()=>{try{localStorage.setItem("rihlat-fontsize",String(fontSize));}catch{}},[fontSize]);
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
  // Plan mode: "shaykh" (default — one mushaf page per day) or "custom" (the
  // user has adjusted their timeline in Settings; calcTimeline drives the pace).
  const [userPlanMode,setUserPlanMode_]=useState(()=>{
    try { return localStorage.getItem("rihlat-plan-mode")||"shaykh"; } catch { return "shaykh"; }
  });
  const setUserPlanMode=(m)=>{
    setUserPlanMode_(m);
    try { localStorage.setItem("rihlat-plan-mode", m); } catch {}
  };
  const [openMethod,setOpenMethod]=useState(null);
  const [sessionJuz,setSessionJuz]=useState(null);
  const [sessionIdx,setSessionIdx]=useState(0);
  const [juzProgress,setJuzProgress]=useState({});
  const [sessionDone,setSessionDone]=useState([]);
  const [sessionVerses,setSessionVerses]=useState([]);
  const [allJuzVerses,setAllJuzVerses]=useState([]); // unfiltered juz verses in hifz order — for dhuhr fallback
  const [yesterdayBatch,setYesterdayBatch]=useState([]);
  const [recentBatches,setRecentBatches]=useState([]); // last 5 days of fajr batches
  const [recentActivity,setRecentActivity]=useState(()=>{
    try { return JSON.parse(localStorage.getItem("jalil-recent-activity")||"[]"); } catch { return []; }
  }); // last 5 activity events — {type, text, ts}
  function pushActivity(type, text) {
    setRecentActivity(prev => {
      const next = [{type, text, ts: Date.now()}, ...prev].slice(0, 7);
      try { localStorage.setItem("jalil-recent-activity", JSON.stringify(next)); } catch {}
      return next;
    });
  }
  const [asrSelectedSurahs,setAsrSelectedSurahs]=useState([]);
  const [asrSelectedJuz,setAsrSelectedJuz]=useState([]);
  const [asrReviewBatch,setAsrReviewBatch]=useState([]);
  const [sessLoading,setSessLoading]=useState(false);
  const [sessError,setSessError]=useState(false);
  const AYAHS_PER_PAGE = 7;
  const [ayahPage, setAyahPage_] = useState(0);
  const setAyahPage=(v)=>{setAyahPage_(v);};
  const [asrStarted,setAsrStarted]=useState(false);
  const [asrIsCustomized,setAsrIsCustomized]=useState(false); // session-scoped, never persisted
  const [asrActiveJuzPanel,setAsrActiveJuzPanel]=useState(null);
  const [asrSurahShowCount,setAsrSurahShowCount]=useState(10);
  const [memSections,setMemSections]=useState({completed:true,inprogress:true,upcoming:true,upcomingAll:false});
  const [asrPage,setAsrPage_]=useState(0);
  const setAsrPage=(v)=>{setAsrPage_(v);};
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
          fetch(`https://api.quran.com/api/v4/verses/by_page/${mushafPage}?words=true&word_fields=line_number&fields=text_uthmani,verse_key,juz_number&per_page=50`),
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

  // Badge milestone celebrations — fires once per milestone, stored in localStorage.
  // On the first run after onboarding, any milestones the user already meets (because
  // they marked prior memorization during onboarding) are stamped as "shown" without
  // firing any popup. Celebrations only fire when the user actually crosses a
  // threshold through in-app work.
  useEffect(()=>{
    if(!loaded||showOnboarding) return;
    const hasStorage=localStorage.getItem("jalil-badge-milestones")!==null;
    const shown=JSON.parse(localStorage.getItem("jalil-badge-milestones")||"{}");
    const milestones=[
      {key:"juz-1",test:completedCount>=1,emoji:"🎉",title:"Al-Hamdulillah!",msg:"You just completed your first juz!"},
      {key:"juz-5",test:completedCount>=5,emoji:"🌟",title:"Al-Hamdulillah!",msg:"5 juz memorized — keep going!"},
      {key:"juz-10",test:completedCount>=10,emoji:"✨",title:"Al-Hamdulillah!",msg:"10 juz memorized — a third of the Qur'an!"},
      {key:"juz-15",test:completedCount>=15,emoji:"🌙",title:"Al-Hamdulillah!",msg:"Half the Qur'an memorized!"},
      {key:"juz-20",test:completedCount>=20,emoji:"📖",title:"Al-Hamdulillah!",msg:"20 juz — you are close!"},
      {key:"juz-30",test:completedCount>=30,emoji:"🕋",title:"You are now a Hafiz!",msg:"30 juz — the entire Qur'an. Al-Hamdulillah!"},
      {key:"streak-7",test:streak>=7,emoji:"🔥",title:"7 Day Streak!",msg:"A week of consistency — Al-Hamdulillah!"},
      {key:"streak-21",test:streak>=21,emoji:"🔥",title:"21 Day Streak!",msg:"Three weeks — it's becoming a habit!"},
      {key:"streak-40",test:streak>=40,emoji:"🔥",title:"Habituated!",msg:"40 days — the Salaf said this is when habits form."},
    ];
    if(!hasStorage){
      // First run: seed any already-met milestones as shown, don't pop.
      let seeded=false;
      for(const m of milestones){ if(m.test){ shown[m.key]=true; seeded=true; } }
      localStorage.setItem("jalil-badge-milestones",JSON.stringify(shown));
      if(seeded) return; // skip popping on the seed pass
    }
    for(const m of milestones){
      if(m.test&&!shown[m.key]){
        setBadgeCelebration({emoji:m.emoji,title:m.title,message:m.msg});
        shown[m.key]=true;
        localStorage.setItem("jalil-badge-milestones",JSON.stringify(shown));
        break;
      }
    }
  },[completedCount,streak,loaded]);
  const [checkHistory,setCheckHistory]=useState({});
  const [calMonth,setCalMonth]=useState(new Date().getMonth());
  const [calYear,setCalYear]=useState(new Date().getFullYear());
  const [reciter,setReciter]=useState(null);
  const [quranReciter,setQuranReciter]=useState(null);
  const [showReciterModal,setShowReciterModal]=useState(false);
  const [reciterMode,setReciterMode]=useState("hifz");
  const [showJuzModal,setShowJuzModal]=useState(false);
  const [activeStream,setActiveStream]=useState(0);
  const [masjidaynTab, setMasjidaynTab_]=useState("ramadan");
  const setMasjidaynTab=(tab)=>{setMasjidaynTab_(tab);};
  const [rihlahTab, setRihlahTab_]=useState("juz");
  const rihlahScrollRef=useRef(null);
  const setRihlahTab=(tab)=>{setRihlahTab_(tab);};
  const [haramainMosque,setHaramainMosque]=useState("makkah");
  const [openImam,setOpenImam]=useState(null);
  const {
    haramainPlaying, setHaramainPlaying,
    haramainMeta, setHaramainMeta,
    haramainTime,
    haramainDuration,
    haramainRate,
    haramainExpanded, setHaramainExpanded,
    haramainIsPaused,
    haramainRef,
    playHaramainSurah,
    stopHaramain,
    toggleHaramainPlayPause,
    seekHaramain,
    skipHaramain,
    haramainNext,
    haramainPrev,
    setHaramainPlaybackRate,
  } = useHaramainPlayer({ activeTab });
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
            const res=await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surahNum}?words=false&fields=text_uthmani,verse_key,surah_number,page_number,juz_number,hizb_number,rub_el_hizb_number&per_page=300&page=${page}`);
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

        // Build full juz in hifz-descending order (NOT filtered by completion) — for dhuhr review
        const hifzSort=(verses, surahOrder)=>[...verses].sort((a,b)=>{
          const sA=a.surah_number||parseInt(a.verse_key?.split(":")?.[0],10);
          const sB=b.surah_number||parseInt(b.verse_key?.split(":")?.[0],10);
          const aA=parseInt(a.verse_key?.split(":")?.[1],10);
          const aB=parseInt(b.verse_key?.split(":")?.[1],10);
          const iA=surahOrder.indexOf(sA), iB=surahOrder.indexOf(sB);
          if(iA!==iB) return iA-iB;
          return aA-aB;
        });
        const orderedAll=hifzSort(all, descendingSurahOrder);

        // Cross-juz: also fetch previous juz (in hifz order) for dhuhr walk-back
        let prevJuzVerses=[];
        const prevJuzNum=sessionJuz<30?sessionJuz+1:null;
        if(prevJuzNum&&!cancelled){
          try{
            const prevSurahs=(JUZ_SURAHS[prevJuzNum]||[]).map(item=>item.s);
            let prevAll=[];
            for(const sn of prevSurahs){
              const res=await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${sn}?words=false&fields=text_uthmani,verse_key,surah_number,page_number,juz_number,hizb_number,rub_el_hizb_number&per_page=300&page=1`);
              if(!res.ok||cancelled) break;
              const data=await res.json();
              prevAll=[...prevAll,...(data.verses||[])];
            }
            prevAll.forEach(v=>{ if(v.text_uthmani) v.text_uthmani=v.text_uthmani.replace(/\u06DF/g,"\u0652"); });
            const prevDescOrder=[...prevSurahs].reverse();
            prevJuzVerses=hifzSort(prevAll, prevDescOrder);
          }catch{}
        }
        if(!cancelled) setAllJuzVerses([...prevJuzVerses,...orderedAll]);

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
          const res=await fetch(`https://api.quran.com/api/v4/verses/by_juz/${selectedJuz}?words=false&fields=text_uthmani,verse_key,surah_number,page_number,juz_number,hizb_number,rub_el_hizb_number&per_page=50&page=${page}`);
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
  const meta=JUZ_META.find(j=>j.num===selectedJuz);
  const curStatus=juzStatus[selectedJuz]||"not_started";
  const curCfg=STATUS_CFG[curStatus];
  const timeline=calcTimeline(goalYears,memorizedAyahs,goalMonths,nextJuzAyahs,completedCount);
  const targetDaily=Math.round(parseFloat(timeline.ayahsPerDay));

  // Sheikh Al-Qasim's 2-page rule — allow up to 2 full pages worth of content.
  // Uses distinct-page counting so it works in any traversal order (hifz is
  // descending by surah, so page_number decreases as you go forward).
  const twoPageLimit=(()=>{
    if(!sessionVerses.length||sessionIdx>=sessionVerses.length) return {count:targetDaily,capped:false};
    const startPage=sessionVerses[sessionIdx]?.page_number;
    if(!startPage) return {count:targetDaily,capped:false};
    const prevAyah=sessionIdx>0?sessionVerses[sessionIdx-1]:null;
    const startsAtPageBeginning=!prevAyah||prevAyah.page_number!==startPage;
    // Starting at page beginning → 2 distinct pages. Mid-page → 3 (current + 2 more).
    const maxDistinctPages=startsAtPageBeginning?2:3;
    const pagesSeen=new Set();
    let maxCount=0;
    for(let i=sessionIdx;i<sessionVerses.length;i++){
      const p=sessionVerses[i]?.page_number;
      if(!p){ maxCount++; continue; }
      if(!pagesSeen.has(p)){
        if(pagesSeen.size>=maxDistinctPages) break;
        pagesSeen.add(p);
      }
      maxCount++;
    }
    return {count:Math.min(targetDaily,maxCount),capped:targetDaily>maxCount,maxAllowed:maxCount};
  })();
  const dailyNew=twoPageLimit.count;
  const currentSessionId=SESSIONS[activeSessionIndex]?.id;

  // Show warning when 2-page cap kicks in — once per juz per day.
  // Depend on capped/sessionVerses.length so it refires after verses finish loading.
  useEffect(()=>{
    if(!twoPageLimit.capped||!sessionVerses.length||currentSessionId!=="fajr") return;
    const today=TODAY();
    const key=`2page-warn-${sessionJuz}-${today}`;
    if(localStorage.getItem(key)) return;
    setTwoPageWarning({target:targetDaily,actual:twoPageLimit.count});
    localStorage.setItem(key,"1");
  },[sessionJuz,currentSessionId,twoPageLimit.capped,sessionVerses.length]);

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
  // Seed todayFajrBatch from the ayah-count fajrBatch only as a fallback —
  // MyHifzTab overrides it with the page batch when running in Shaykh mode.
  useEffect(()=>{if(fajrBatch.length>0&&todayFajrBatch.length===0)setTodayFajrBatch(fajrBatch);},[fajrBatch.length]);
  const isDhuhr=currentSessionId==="dhuhr";
  const isAsr=currentSessionId==="asr";
  const isMaghrib=currentSessionId==="maghrib";
  const isIsha=currentSessionId==="isha";

  let batch=fajrBatch;
  if(isDhuhr){
    // Dhuhr = 5 days of previous memorization. What "5 days" means depends on
    // the plan:
    //   - Shaykh mode (default): 5 mushaf pages, since 1 page = 1 day.
    //   - Custom mode: dailyNew * 5 ayahs, since N ayahs = 1 day.
    const isShaykh=userPlanMode!=="custom";
    const seen=new Set();
    const combined=[];
    let pagesCollectedSet=null; // set for Shaykh mode, null for custom
    if(allJuzVerses.length>0){
      const currentKey=sessionVerses[sessionIdx]?.verse_key;
      let allIdx=currentKey?allJuzVerses.findIndex(v=>v.verse_key===currentKey):allJuzVerses.length;
      if(allIdx<0) allIdx=allJuzVerses.length;
      if(isShaykh){
        // Shaykh mode: review = the 5 most recent memorized (surah, page) day-units,
        // EXCLUDING today's Fajr work. Phase 1 walks back through allJuzVerses
        // counting distinct (surah, page) day-units until 5 are collected (and
        // tracking their physical pages). Phase 2 includes ALL memorized ayahs on
        // those pages — so when page 564 is collected via Mulk 27-30, Qalam 1-15
        // on the same page is included too. Today's day-unit is skipped in both
        // phases so the boundary page between today and yesterday only shows the
        // earlier (memorized-before-today) portion.
        const todaySurah=fajrBatch[0]?.surah_number||parseInt(fajrBatch[0]?.verse_key?.split(":")?.[0]||"0",10);
        const todayPage=fajrBatch[0]?.page_number||sessionVerses[sessionIdx]?.page_number||0;
        const todayKey=todaySurah&&todayPage?`${todaySurah}-${todayPage}`:null;
        const dayKeysCollected=new Set();
        pagesCollectedSet=new Set();
        for(let i=allIdx-1;i>=0&&dayKeysCollected.size<5;i--){
          const v=allJuzVerses[i];
          const s=v?.surah_number||parseInt(v?.verse_key?.split(":")?.[0]||"0",10);
          const p=v?.page_number;
          if(!p||!s) continue;
          const k=`${s}-${p}`;
          if(todayKey&&k===todayKey) continue;
          if(!dayKeysCollected.has(k)){
            dayKeysCollected.add(k);
            pagesCollectedSet.add(p);
          }
        }
        allJuzVerses.forEach((v,i)=>{
          if(i>=allIdx) return;
          if(!v.page_number||!pagesCollectedSet.has(v.page_number)) return;
          const s=v.surah_number||parseInt(v.verse_key?.split(":")?.[0]||"0",10);
          const k=`${s}-${v.page_number}`;
          if(todayKey&&k===todayKey) return;
          if(v.verse_key&&!seen.has(v.verse_key)){
            seen.add(v.verse_key);
            combined.push(v);
          }
        });
      } else {
        // Custom mode: walk back (dailyNew * 5) ayahs from the current position.
        const reviewCount=Math.max(dailyNew*5,5);
        allJuzVerses.slice(Math.max(0,allIdx-reviewCount),allIdx).forEach(v=>{
          if(v.verse_key&&!seen.has(v.verse_key)){ seen.add(v.verse_key); combined.push(v); }
        });
      }
    }
    // Fallback merges. In Shaykh mode, only include ayahs whose page is in
    // pagesCollectedSet so we don't accidentally pull in stale pages from
    // recentBatches. In custom mode, merge freely to backfill a short walkback.
    const passFallback=(v)=>{
      if(!v.verse_key||seen.has(v.verse_key)) return false;
      if(isShaykh&&pagesCollectedSet){
        return !!(v.page_number&&pagesCollectedSet.has(v.page_number));
      }
      return true;
    };
    (yesterdayBatch||[]).forEach(v=>{ if(passFallback(v)){ seen.add(v.verse_key); combined.push(v); }});
    (recentBatches||[]).flat().forEach(v=>{ if(passFallback(v)){ seen.add(v.verse_key); combined.push(v); }});
    // Display in natural mushaf order (page ascending, then ayah) so the
    // review reads Al-Baqarah → An-Nas direction like a user holding the mushaf
    // open. (Memorization goes descending; review goes ascending.)
    combined.sort((a,b)=>{
      const pa=a.page_number||0, pb=b.page_number||0;
      if(pa!==pb) return pa-pb;
      const sa=a.surah_number||parseInt(a.verse_key?.split(":")?.[0]||"0",10);
      const sb=b.surah_number||parseInt(b.verse_key?.split(":")?.[0]||"0",10);
      if(sa!==sb) return sa-sb;
      const aa=parseInt(a.verse_key?.split(":")?.[1]||"0",10);
      const ab=parseInt(b.verse_key?.split(":")?.[1]||"0",10);
      return aa-ab;
    });
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
  const currentReciter=reciter?(RECITERS.find(r=>r.id===reciter)||RECITERS[0]):{id:null,name:"Select your reciter"};

  // ── Plan label (shared by the universal header and Rihlah home) ──
  // Shaykh mode: pages-remaining at 1 page/day → months → "N-Month Hafiz".
  // Custom mode: goalYears * 12 + goalMonths → same label formatter.
  const planPagesCompleted=(()=>{
    const completedSurahsSet=new Set();
    Object.entries(juzStatus||{}).forEach(([key,val])=>{
      if(val!=="complete") return;
      if(key.startsWith("s")){ const n=parseInt(key.slice(1),10); if(n>=1&&n<=114) completedSurahsSet.add(n); }
    });
    const surahsOnPage={};
    for(let s=1;s<=114;s++){
      const st=SURAH_PAGES[s]; if(!st) continue;
      const nx=s<114?SURAH_PAGES[s+1]:605;
      const en=Math.max(st,nx-1);
      for(let p=st;p<=en;p++){ if(!surahsOnPage[p]) surahsOnPage[p]=[]; surahsOnPage[p].push(s); }
    }
    let pagesDone=0;
    for(let p=1;p<=604;p++){
      const list=surahsOnPage[p];
      if(list&&list.length>0&&list.every(s=>completedSurahsSet.has(s))) pagesDone++;
    }
    return pagesDone;
  })();
  const planMonthsRemaining=Math.max(1,Math.ceil(Math.max(0,604-planPagesCompleted)/30));
  const formatHafizLabel=(months)=>{
    if(months<=0) return "Set goal";
    if(months<24) return `${months}-Month Hafiz`;
    const y=Math.floor(months/12), r=months%12;
    return r===0?`${y}-Year Hafiz`:`${y}-Year ${r}-Month Hafiz`;
  };
  const goalLabel=userPlanMode==="custom"
    ? formatHafizLabel((goalYears||0)*12+(goalMonths||0))
    : formatHafizLabel(planMonthsRemaining);

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
    // Describe today's actual slice (asrReviewBatch), not the eligible pool.
    // Compact form: "Juz 30 — An-Nabaʾ to Al-Ghāshiyah" when a slice spans
    // multiple surahs within a single juz; otherwise just the first→last
    // surah range, or a single surah name.
    const b = asrReviewBatch || [];
    if (!b.length) {
      const parts = [];
      if (asrSelectedJuz.length) parts.push(...asrSelectedJuz.map(j => `Juz ${j}`));
      if (asrSelectedSurahs.length) parts.push(...asrSelectedSurahs.map(s => SURAH_EN[s]).filter(Boolean));
      if (!parts.length) return "";
      return `${asrIsCustomized ? "Customized" : "Reviewing"}: ${parts.join(" · ")}`;
    }
    const label = asrIsCustomized ? "Customized" : "Reviewing";
    const surahSet = new Set(b.map(v => v.surah_number || parseInt(v.verse_key?.split(":")?.[0] || "0", 10)));
    // Full-juz match → "Juz N".
    let matchedJuz = null;
    for (let j = 1; j <= 30; j++) {
      const jSurahs = (JUZ_SURAHS[j] || []).map(s => s.s);
      if (jSurahs.length === surahSet.size && jSurahs.every(s => surahSet.has(s))) { matchedJuz = j; break; }
    }
    if (matchedJuz) return `${label}: Juz ${matchedJuz}`;
    // First-last surah range (ascending surah number).
    const sorted = [...surahSet].sort((a,b)=>a-b);
    const firstS = sorted[0], lastS = sorted[sorted.length-1];
    const firstName = SURAH_EN[firstS] || `Surah ${firstS}`;
    const lastName = SURAH_EN[lastS] || `Surah ${lastS}`;
    const rangeLabel = firstS === lastS ? firstName : `${firstName} to ${lastName}`;
    // If every surah in the slice belongs to the same juz, prefix with that juz.
    let containingJuz = null;
    for (let j = 1; j <= 30; j++) {
      const jSurahs = new Set((JUZ_SURAHS[j] || []).map(s => s.s));
      if (sorted.every(s => jSurahs.has(s))) { containingJuz = j; break; }
    }
    return containingJuz ? `${label}: Juz ${containingJuz} — ${rangeLabel}` : `${label}: ${rangeLabel}`;
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
    const wasChecked=dailyChecks[id];
    // Session-complete flows always want to mark the session checked AND push
    // an activity, even if dailyChecks[id] was somehow already true. So this
    // function normalizes to "checked" (not toggle), and the activity logic
    // below fires on every call instead of only on false→true.
    const updated={...dailyChecks,[id]:true};
    setDailyChecks(updated);
    const dk=DATEKEY();
    setCheckHistory(prev=>({...prev,[dk]:{...(prev[dk]||{}),[id]:true}}));
    // Push activity + streak bump on every session completion (this function
    // is only called from the Complete Session button, which unconditionally
    // wants the activity regardless of prior state).
    {
      // Build a "Surah X ayat A-B" label from a batch; handles cross-surah batches too
      const describeBatch=(b)=>{
        if(!b||!b.length) return "";
        const first=b[0], last=b[b.length-1];
        const fS=first.surah_number||parseInt(first.verse_key?.split(":")?.[0]||"0",10);
        const lS=last.surah_number||parseInt(last.verse_key?.split(":")?.[0]||"0",10);
        const fA=parseInt(first.verse_key?.split(":")?.[1]||"0",10);
        const lA=parseInt(last.verse_key?.split(":")?.[1]||"0",10);
        const fN=SURAH_EN[fS]||"";
        const lN=SURAH_EN[lS]||"";
        if(fS===lS) return fA===lA?`Surah ${fN} ayah ${fA}`:`Surah ${fN} ayat ${fA}-${lA}`;
        return `Surah ${fN} ${fA} – Surah ${lN} ${lA}`;
      };
      if(id==="fajr"){
        // Describe the batch using whichever is authoritative — in Shaykh mode
        // that's the page-based todayFajrBatch; in custom it's fajrBatch.
        const src=todayFajrBatch.length>0?todayFajrBatch:fajrBatch;
        const batchLabel=describeBatch(src);
        const hasPending=src.some(v=>(repCounts[v.verse_key]||0)<20);
        if(hasPending){
          // Single combined entry (red, reminder type) — cleaner than two lines.
          pushActivity("reminder", batchLabel
            ? `${batchLabel} marked complete, still pending repetitions`
            : "Fajr marked complete, still pending repetitions");
        } else {
          pushActivity("memorize", batchLabel?`Memorized ${batchLabel}`:"Completed Fajr session");
        }
        // Clear any legacy banner reminder from older versions.
        try { localStorage.removeItem("jalil-hifz-reminder"); } catch{}
      } else if(id==="dhuhr"){
        const label=describeBatch(batch);
        pushActivity("review",label?`Reviewed ${label}`:"Completed Dhuhr review");
      } else if(id==="asr"){
        // Describe what was actually reviewed today. If today's slice happens
        // to exactly cover all surahs of a juz, call it "Juz N". Otherwise
        // use a compact "Surah A – Surah B" label so we don't claim a juz was
        // reviewed when it wasn't.
        const b=asrReviewBatch||[];
        let label="";
        if(b.length){
          const surahSet=new Set(b.map(v=>v.surah_number||parseInt(v.verse_key?.split(":")?.[0]||"0",10)));
          let matchedJuz=null;
          for(let j=1;j<=30;j++){
            const jSurahs=(JUZ_SURAHS[j]||[]).map(s=>s.s);
            if(jSurahs.length===surahSet.size&&jSurahs.every(s=>surahSet.has(s))){ matchedJuz=j; break; }
          }
          if(matchedJuz){
            label=`Juz ${matchedJuz}`;
          } else {
            const first=b[0], last=b[b.length-1];
            const fS=first.surah_number||parseInt(first.verse_key?.split(":")?.[0]||"0",10);
            const lS=last.surah_number||parseInt(last.verse_key?.split(":")?.[0]||"0",10);
            label=fS===lS?`Surah ${SURAH_EN[fS]||""}`:`Surah ${SURAH_EN[fS]||""} – Surah ${SURAH_EN[lS]||""}`;
          }
        }
        pushActivity("review", label?`Revised ${label} during Asr review`:"Completed Asr review");
      } else if(id==="maghrib"){
        // Describe using the page the user actually saw (Maghrib inherits Fajr's page).
        const src=todayFajrBatch.length>0?todayFajrBatch:fajrBatch;
        const label=describeBatch(src);
        pushActivity("listen",label?`Listened to ${label}`:"Completed Maghrib listening");
      } else if(id==="isha"){
        const src=todayFajrBatch.length>0?todayFajrBatch:fajrBatch;
        const label=describeBatch(src);
        pushActivity("review",label?`Final review of ${label} before sleep`:"Completed Isha review");
      }
    }
    // Streak only bumps when this call is the transition that completes the
    // last remaining session for the day — not on repeated Complete taps.
    if(!wasChecked&&SESSIONS.every(s=>updated[s.id])){
      setStreak(p=>{
        const next=p+1;
        if([7,14,21,30,40,60,100].includes(next)){
          pushActivity("streak",`${next} day streak — Keep going!`);
        }
        return next;
      });
    }
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

      // Step 2 — Shaykh Al-Qasim's 6-stage revision table (book pp. 44-45).
      // Revision amount is keyed to the surah you are currently memorizing —
      // not to how many juz you've finished. Revision always starts from the
      // beginning of An-Nās and walks back toward your memorization point.
      //   Stage 1: memorizing An-Nās (114) → Al-Aḥqāf (46)      → 1/2 juz/day
      //   Stage 2: memorizing Al-Jāthiyah (45) → Al-ʿAnkabūt (29) → 1 juz/day
      //   Stage 3: memorizing Al-Qaṣaṣ (28) → Al-Kahf (18)        → 1.5 juz/day
      //   Stage 4: memorizing Al-Isrā (17) → At-Tawbah (9)         → 2 juz/day
      //   Stage 5: memorizing Al-Anfāl (8) → Al-Māʾidah (5)        → 2.5 juz/day
      //   Stage 6: memorizing An-Nisā (4) → Al-Baqarah (2)         → 3 juz/day
      const activeSurahForStage = sessionVerses[sessionIdx]?.surah_number
        || parseInt(sessionVerses[sessionIdx]?.verse_key?.split(":")?.[0] || "114", 10);
      const dailyJuzAmount = activeSurahForStage >= 46 ? 0.5
        : activeSurahForStage >= 29 ? 1
        : activeSurahForStage >= 18 ? 1.5
        : activeSurahForStage >= 9 ? 2
        : activeSurahForStage >= 5 ? 2.5
        : 3;
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
          const res = await fetch(`https://api.quran.com/api/v4/verses/by_juz/${juzNum}?words=false&fields=text_uthmani,verse_key,surah_number,page_number,juz_number,hizb_number,rub_el_hizb_number&per_page=50&page=${page}`);
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
        const res = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surahNum}?words=false&fields=text_uthmani,verse_key,surah_number,page_number,juz_number,hizb_number,rub_el_hizb_number&per_page=300&page=1`);
        if(!res.ok) continue;
        const data = await res.json();
        (data.verses||[]).forEach(v => {
          if(!seenKeys.has(v.verse_key)) { seenKeys.add(v.verse_key); allVerses.push(v); }
        });
      }

      // Fix U+06DF dots for UthmanicHafs font
      allVerses.forEach(v=>{ if(v.text_uthmani) v.text_uthmani=v.text_uthmani.replace(/\u06DF/g,"\u0652"); });

      // Compute the Dhuhr-active page window so Asr can exclude it. Dhuhr covers
      // the last 5 memorized (surah, page) day-units (see Dhuhr logic earlier in
      // this file). Mirror the walk-back here against allJuzVerses to find which
      // pages are currently in Dhuhr's window, then drop them from the Asr pool
      // so today's Asr doesn't repeat today's Dhuhr content.
      const dhuhrPages = new Set();
      if (allJuzVerses.length > 0) {
        const currentKey = sessionVerses[sessionIdx]?.verse_key;
        let allIdx = currentKey ? allJuzVerses.findIndex(v => v.verse_key === currentKey) : allJuzVerses.length;
        if (allIdx < 0) allIdx = allJuzVerses.length;
        const todaySurah = fajrBatch[0]?.surah_number || parseInt(fajrBatch[0]?.verse_key?.split(":")?.[0] || "0", 10);
        const todayPage = fajrBatch[0]?.page_number || sessionVerses[sessionIdx]?.page_number || 0;
        const todayKey = todaySurah && todayPage ? `${todaySurah}-${todayPage}` : null;
        const dayKeysCollected = new Set();
        for (let i = allIdx - 1; i >= 0 && dayKeysCollected.size < 5; i--) {
          const v = allJuzVerses[i];
          const s = v?.surah_number || parseInt(v?.verse_key?.split(":")?.[0] || "0", 10);
          const p = v?.page_number;
          if (!p || !s) continue;
          const k = `${s}-${p}`;
          if (todayKey && k === todayKey) continue;
          if (!dayKeysCollected.has(k)) {
            dayKeysCollected.add(k);
            dhuhrPages.add(p);
          }
        }
      }

      // Remove Al-Fatiha from revision — it's recited 17+ times daily in salah.
      // Also drop any verses on pages currently covered by Dhuhr — no overlap.
      const filtered=allVerses.filter(v=>{
        const s=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);
        if(s===1) return false;
        if(v.page_number&&dhuhrPages.has(v.page_number)) return false;
        return true;
      });

      // Step 5 — sort in mushaf order (Al-Baqarah → An-Nas) so the batch reads
      // contiguously — no "Nabā' → Nāzi'āt → 'Abasa → jump to Tīn → Qāri'ah".
      filtered.sort((a,b)=>{
        const sa=a.surah_number||parseInt(a.verse_key?.split(":")?.[0],10);
        const sb=b.surah_number||parseInt(b.verse_key?.split(":")?.[0],10);
        if(sa!==sb) return sa-sb;
        const aa=parseInt(a.verse_key?.split(":")?.[1],10);
        const ab=parseInt(b.verse_key?.split(":")?.[1],10);
        return aa-ab;
      });

      // Step 6 — split each fully-memorized juz into two halves (like Fajr's
      // 2-section page split), cycling through halves across juz. Stage 1 =
      // 0.5 juz/day means each day is one half of one juz. Individual
      // surah marks that aren't part of a complete juz are appended as one
      // extra chunk at the end of the cycle.
      const chunks = []; // each chunk is an array of verse objects (the daily slice)
      const eligibleJuzSorted = [...eligibleJuz].sort((a, b) => a - b);
      for (const j of eligibleJuzSorted) {
        const juzVerses = filtered.filter(v => v.juz_number === j);
        if (juzVerses.length === 0) continue;
        // Find surah-start indices within this juz.
        const surahStarts = [];
        let prev = null;
        juzVerses.forEach((v, i) => {
          const s = v.surah_number || parseInt(v.verse_key?.split(":")?.[0] || "0", 10);
          if (s !== prev) { surahStarts.push(i); prev = s; }
        });
        surahStarts.push(juzVerses.length);
        // Pick the surah boundary closest to the ayah midpoint.
        const mid = juzVerses.length / 2;
        let bestBoundary = null;
        let bestDiff = Infinity;
        for (const b of surahStarts) {
          if (b === 0 || b === juzVerses.length) continue;
          const diff = Math.abs(b - mid);
          if (diff < bestDiff) { bestDiff = diff; bestBoundary = b; }
        }
        if (bestBoundary == null) {
          // Only one surah in this juz (rare) — use the whole juz as one chunk.
          chunks.push(juzVerses);
        } else {
          chunks.push(juzVerses.slice(0, bestBoundary));
          chunks.push(juzVerses.slice(bestBoundary));
        }
      }
      // Append any verses from filtered whose juz isn't a complete memorized
      // juz (i.e., individual-surah marks outside a fully-memorized juz) as a
      // single trailing chunk.
      const coveredJuz = new Set(eligibleJuzSorted);
      const extraVerses = filtered.filter(v => !coveredJuz.has(v.juz_number));
      if (extraVerses.length > 0) chunks.push(extraVerses);

      const numChunks = chunks.length || 1;
      const chunkIdx = ((asrCycle % numChunks) + numChunks) % numChunks;
      const daily = chunks[chunkIdx] || filtered;

      setAsrSelectedJuz(juzPool);
      setAsrSelectedSurahs(eligibleSurahs);
      setAsrReviewBatch(daily);
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
      const res=await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surahNum}?words=false&fields=text_uthmani,verse_key,surah_number,page_number,juz_number,hizb_number,rub_el_hizb_number&per_page=300&page=1`);
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
        const res=await fetch(`https://api.quran.com/api/v4/verses/by_juz/${juzNum}?words=false&fields=text_uthmani,verse_key,surah_number,page_number,juz_number,hizb_number,rub_el_hizb_number&per_page=50&page=${page}`);
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
      {(<>

      {/* ── ONBOARDING FLOW ── */}
      {showOnboarding&&(
      <Onboarding
        userName={userName} setUserName={setUserName}
        onboardStep={onboardStep} setOnboardStep={setOnboardStep}
        visibleOnboardJuzCount={visibleOnboardJuzCount} setVisibleOnboardJuzCount={setVisibleOnboardJuzCount}
        goalYears={goalYears} setGoalYears={setGoalYears}
        goalMonths={goalMonths} setGoalMonths={setGoalMonths}
        juzStatus={juzStatus} setJuzStatus={setJuzStatus}
        memorizedAyahs={memorizedAyahs} completedCount={completedCount}
        v9MarkJuzComplete={v9MarkJuzComplete} v9MarkJuzIncomplete={v9MarkJuzIncomplete}
        v9IsJuzComplete={v9IsJuzComplete} v9MarkSurahComplete={v9MarkSurahComplete} v9MarkSurahIncomplete={v9MarkSurahIncomplete}
        openMethod={openMethod} setOpenMethod={setOpenMethod}
        openJuzPanel={openJuzPanel} setOpenJuzPanel={setOpenJuzPanel}
        loaded={loaded}
        setShowOnboarding={setShowOnboarding}
        JUZ_PAGES={JUZ_PAGES} SURAH_PAGES={SURAH_PAGES}
      />
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
                {(()=>{
                  // Use the live session pointer — this already follows Sheikh Al-Qasim's
                  // descending order within each juz
                  const nv=sessionVerses[sessionIdx];
                  if(nv){
                    const sn=nv.surah_number||parseInt(nv.verse_key?.split(":")[0]||"0",10);
                    const name=SURAH_EN[sn];
                    if(name) return <div style={{fontSize:9,color:T.sub,marginTop:2}}>Next Target · Surah {name}</div>;
                  }
                  return null;
                })()}
              </div>
              {/* Settings gear */}
              <div className="sbtn" onClick={()=>{setEditName(localStorage.getItem("rihlat-username")||"Abdul Jalil");setShowSettings(true);}} style={{flexShrink:0,width:32,height:32,borderRadius:"50%",background:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",display:"flex",alignItems:"center",justifyContent:"center"}}>
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
      {activeTab==="myhifz"&&!showTerms&&(
        <MyHifzTab
          pushActivity={pushActivity}
          asrSessionView={(!sessLoading&&currentSessionId==="asr"&&asrStarted&&batch.length>0)?(
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
              playMushafRange={playMushafRange}
              stopMushafAudio={stopMushafAudio}
              mushafAudioPlaying={mushafAudioPlaying}
              onComplete={()=>{
                const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];
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
                setAsrIsCustomized(true);
              }}
              asrIsCustomized={asrIsCustomized}
              completedAyahs={completedAyahs}
              fontSize={fontSize}
            />
          ):null}
          haramainMeta={haramainMeta}
          dark={dark} T={T} SESSIONS={SESSIONS} fontSize={fontSize}
          reciter={reciter} currentReciter={currentReciter} setReciterMode={setReciterMode} setShowReciterModal={setShowReciterModal} hasPerAyah={hasPerAyah}
          sessionJuz={sessionJuz} setSessionJuz={setSessionJuz} sessionIdx={sessionIdx} setSessionIdx={setSessionIdx} totalSV={totalSV} dailyNew={dailyNew}
          setShowJuzModal={setShowJuzModal}
          activeSessionIndex={activeSessionIndex} setActiveSessionIndex={setActiveSessionIndex} sessionsCompleted={sessionsCompleted} setSessionsCompleted={setSessionsCompleted}
          currentSessionId={currentSessionId} isAsr={isAsr} toggleCheck={toggleCheck}
          batch={batch} bEnd={bEnd} bDone={bDone} fajrBatch={fajrBatch} sessionVerses={sessionVerses}
          sessLoading={sessLoading} sessError={sessError}
          repCounts={repCounts} setRepCounts={setRepCounts} connectionReps={connectionReps} setConnectionReps={setConnectionReps}
          openAyah={openAyah} setOpenAyah={setOpenAyah} ayahPage={ayahPage} setAyahPage={setAyahPage} touchStartRef={touchStartRef}
          hifzViewMode={hifzViewMode} setHifzViewMode={setHifzViewMode}
          translations={translations} fetchTranslations={fetchTranslations}
          playingKey={playingKey} audioLoading={audioLoading} playAyah={playAyah} looping={looping} setLooping={setLooping} audioRef={audioRef}
          playMushafRange={playMushafRange} stopMushafAudio={stopMushafAudio} mushafAudioPlaying={mushafAudioPlaying}
          completedAyahs={completedAyahs} setCompletedAyahs={setCompletedAyahs}
          asrStarted={asrStarted} setAsrStarted={setAsrStarted} asrIsCustomized={asrIsCustomized} setAsrIsCustomized={setAsrIsCustomized}
          asrActiveJuzPanel={asrActiveJuzPanel} setAsrActiveJuzPanel={setAsrActiveJuzPanel}
          asrSelectedJuz={asrSelectedJuz} asrSelectedSurahs={asrSelectedSurahs} asrSurahShowCount={asrSurahShowCount} setAsrSurahShowCount={setAsrSurahShowCount}
          asrSelectionSummary={asrSelectionSummary} asrCanStart={asrCanStart} setAsrPage={setAsrPage} setAsrExpandedAyah={setAsrExpandedAyah}
          completedJuzOptions={completedJuzOptions} isSurahComplete={isSurahComplete} loadAsrJuzReview={loadAsrJuzReview} toggleAsrSurahReview={toggleAsrSurahReview}
          setJuzProgress={setJuzProgress} setJuzStatus={setJuzStatus} markJuzAndSurahsComplete={markJuzAndSurahsComplete}
          juzCompletedInSession={juzCompletedInSession} setJuzCompletedInSession={setJuzCompletedInSession}
          v9IsJuzComplete={v9IsJuzComplete} v9MarkJuzComplete={v9MarkJuzComplete} v9MarkSurahComplete={v9MarkSurahComplete}
          setYesterdayBatch={setYesterdayBatch} setRecentBatches={setRecentBatches} setTodayFajrBatch={setTodayFajrBatch} todayFajrBatch={todayFajrBatch}
          simVerseCache={simVerseCache} fetchSimVerse={fetchSimVerse}
          userPlanMode={userPlanMode}
          qpcPages={qpcPages}
          mushafLayout={mushafLayout}
        />
      )}

      {/* ═══ MY RIHLAH — PROFILE HOME ═══ */}
      {activeTab==="rihlah"&&rihlahTab==="home"&&!showTerms&&(
        <RihlahHome dark={dark} T={T} rihlahScrollRef={rihlahScrollRef} completedCount={completedCount} sessionJuz={sessionJuz} sessionIdx={sessionIdx} totalSV={totalSV} timeline={timeline} goalYears={goalYears} goalMonths={goalMonths} pct={pct} SESSIONS={SESSIONS} dailyChecks={dailyChecks} toggleCheck={toggleCheck} streak={streak} checkedCount={checkedCount} dailyNew={dailyNew} allChecked={allChecked} setRihlahTab={setRihlahTab} haramainMeta={haramainMeta} recentActivity={recentActivity} userPlanMode={userPlanMode} goalLabel={goalLabel}/>
      )}

      {/* ═══ MY MEMORIZATION — JOURNEY VIEW ═══ */}
      {activeTab==="rihlah"&&rihlahTab==="juz"&&(
        <MyMemorizationView
          dark={dark}
          rihlahScrollRef={rihlahScrollRef}
          sessionJuz={sessionJuz} setSessionJuz={setSessionJuz}
          juzStatus={juzStatus}
          juzProgress={juzProgress}
          totalSV={totalSV}
          sessionVerses={sessionVerses} sessionIdx={sessionIdx}
          memSections={memSections} setMemSections={setMemSections}
          setActiveTab={setActiveTab}
          setRihlahTab={setRihlahTab}
        />
      )}
      {/* ═══ QURAN TEXT ═══ */}
      {activeTab==="quran"&&!showTerms&&(
        <QuranTab
          haramainMeta={haramainMeta}
          dark={dark}
          SURAH_PAGES={SURAH_PAGES}
          TAFSIR_SOURCES={TAFSIR_SOURCES}
          parseTafsirBlocks={parseTafsirBlocks}
          getEveryayahFolder={getEveryayahFolder}
          mushafSurahNum={mushafSurahNum}
          mushafJuzNum={mushafJuzNum}
          quranMode={quranMode} setQuranMode={setQuranMode}
          mushafPage={mushafPage} setMushafPage={setMushafPage}
          mushafSwipeAnim={mushafSwipeAnim} setMushafSwipeAnim={setMushafSwipeAnim}
          mushafAudioPlaying={mushafAudioPlaying}
          mushafLoading={mushafLoading}
          mushafVerses={mushafVerses}
          selectedAyah={selectedAyah} setSelectedAyah={setSelectedAyah}
          drawerView={drawerView} setDrawerView={setDrawerView}
          translations={translations} fetchTranslations={fetchTranslations}
          mushafBookmarks={mushafBookmarks} setMushafBookmarks={setMushafBookmarks}
          playingKey={playingKey} setPlayingKey={setPlayingKey}
          quranReciter={quranReciter}
          fontSize={fontSize}
          tafsirData={tafsirData} tafsirTab={tafsirTab} setTafsirTab={setTafsirTab}
          setTafsirAyah={setTafsirAyah} fetchTafsir={fetchTafsir}
          reflections={reflections} setReflections={setReflections}
          croppedPages={croppedPages}
          setShowQuranJuzModal={setShowQuranJuzModal}
          setShowQuranSurahModal={setShowQuranSurahModal}
          setShowMushafSheet={setShowMushafSheet}
          setShowMushafRangePicker={setShowMushafRangePicker}
          setShowReciterModal={setShowReciterModal}
          setReciterMode={setReciterMode}
          setShowReflect={setShowReflect}
          setMushafRangeStart={setMushafRangeStart}
          setMushafRangeEnd={setMushafRangeEnd}
          quranTouchRef={quranTouchRef}
          audioRef={audioRef}
          stopMushafAudio={stopMushafAudio}
          playMushafRange={playMushafRange}
          mushafLayout={mushafLayout}
        />
      )}

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
      {showTerms&&(
        <div style={{flex:1,overflowY:"auto",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",padding:"20px 16px 120px"}} className="fi">
          <div style={{marginBottom:14}}>
            <div className="sbtn" onClick={()=>{setShowTerms(false);setShowSettings(true);}} style={{display:"inline-block",padding:"6px 12px",background:dark?"rgba(255,255,255,0.04)":"#EADFC8",border:dark?"1px solid rgba(217,177,95,0.12)":"1px solid rgba(0,0,0,0.08)",borderRadius:8,fontSize:11,color:dark?"rgba(243,231,200,0.50)":"#6B645A"}}>← Back</div>
          </div>
          <div style={{maxWidth:500,margin:"0 auto"}}>
            <div style={{textAlign:"center",marginBottom:18}}>
              <div style={{fontSize:18,fontWeight:700,color:dark?"#F3E7C8":"#3D2E0A"}}>Terms & Privacy</div>
              <div style={{fontSize:10,color:T.dim,marginTop:4}}>Last updated: April 2026</div>
            </div>
            <div style={{fontSize:11,color:"#D4AF37",letterSpacing:".12em",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Privacy</div>
            <div style={{fontSize:13,color:T.sub,lineHeight:1.7,marginBottom:18}}>
              <div style={{display:"flex",gap:8,marginBottom:8}}><span>•</span><span>All your progress, goals, and preferences are stored <strong>only on your device</strong> using localStorage.</span></div>
              <div style={{display:"flex",gap:8,marginBottom:8}}><span>•</span><span>There is no account, no sign-up, and no sign-in required.</span></div>
              <div style={{display:"flex",gap:8,marginBottom:8}}><span>•</span><span>We do not collect, track, or transmit any personal data.</span></div>
              <div style={{display:"flex",gap:8,marginBottom:8}}><span>•</span><span>No analytics, no ads, no tracking cookies.</span></div>
              <div style={{display:"flex",gap:8,marginBottom:8}}><span>•</span><span>Quran text, audio, and tafsir are fetched from Quran Foundation APIs only when you use those features.</span></div>
              <div style={{display:"flex",gap:8}}><span>•</span><span>Your memorization data never leaves your device unless you explicitly export it.</span></div>
            </div>
            <div style={{fontSize:11,color:"#D4AF37",letterSpacing:".12em",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Terms of Use</div>
            <div style={{fontSize:13,color:T.sub,lineHeight:1.7,marginBottom:18}}>
              <div style={{display:"flex",gap:8,marginBottom:8}}><span>•</span><span>Rihlat Al-Hifz is free to use for personal hifz journey and reflection.</span></div>
              <div style={{display:"flex",gap:8,marginBottom:8}}><span>•</span><span>This app is a supplementary tool — it is not a substitute for guidance from a qualified Quran teacher.</span></div>
              <div style={{display:"flex",gap:8,marginBottom:8}}><span>•</span><span>Rihlat Al-Hifz is an independent project and is <strong>not affiliated with, endorsed by, or sponsored by Quran Foundation, Quran.com, or any other organization</strong>. We gratefully use their public APIs to bring the Quran to you.</span></div>
              <div style={{display:"flex",gap:8}}><span>•</span><span>May Allah accept your efforts and grant you success in memorizing His Book.</span></div>
            </div>
            <div style={{fontSize:11,color:"#D4AF37",letterSpacing:".12em",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Attribution</div>
            <div style={{fontSize:13,color:T.sub,lineHeight:1.7,marginBottom:18}}>
              <div style={{display:"flex",gap:8,marginBottom:8}}><span>•</span><span><strong>Quranic text & metadata:</strong> Quran Foundation (quran.com / quran.foundation)</span></div>
              <div style={{display:"flex",gap:8,marginBottom:8}}><span>•</span><span><strong>Ayah-by-ayah audio:</strong> everyayah.com</span></div>
              <div style={{display:"flex",gap:8,marginBottom:8}}><span>•</span><span><strong>Full surah recitations:</strong> quranicaudio.com</span></div>
              <div style={{display:"flex",gap:8,marginBottom:8}}><span>•</span><span><strong>Tafsir:</strong> As-Sa'di, Al-Muyassar, Ibn Kathir (via Quran.com API)</span></div>
              <div style={{display:"flex",gap:8,marginBottom:8}}><span>•</span><span><strong>Methodology:</strong> "The Easiest Way to Memorize the Noble Qur'an" by Sheikh Abdul Muhsin Al-Qasim</span></div>
              <div style={{display:"flex",gap:8}}><span>•</span><span><strong>Haramain imam recordings:</strong> haramain.info, Internet Archive</span></div>
            </div>
            <div style={{textAlign:"center",marginTop:14,fontSize:11,color:T.dim,fontStyle:"italic"}}>
              بَارَكَ اللَّهُ فِيكُمْ
            </div>
          </div>
        </div>
      )}

      {activeTab==="rihlah"&&rihlahTab==="adjust"&&!showTerms&&(
        <AdjustPlan
          dark={dark}
          T={T}
          goalYears={goalYears}
          setGoalYears={setGoalYears}
          goalMonths={goalMonths}
          setGoalMonths={setGoalMonths}
          memorizedAyahs={memorizedAyahs}
          completedCount={completedCount}
          timeline={timeline}
          dailyNew={dailyNew}
          rihlahScrollRef={rihlahScrollRef}
          userPlanMode={userPlanMode} setUserPlanMode={setUserPlanMode}
          onBack={()=>{
            if(tabBeforeAdjust){
              setActiveTab(tabBeforeAdjust.activeTab);
              setRihlahTab(tabBeforeAdjust.rihlahTab);
              setTabBeforeAdjust(null);
            } else {
              setRihlahTab("home");
            }
            setShowSettings(true);
          }}
        />
      )}

      {/* ── Juz Selector Modal ── */}
      <JuzSelectorModal
        show={showJuzModal}
        onClose={()=>setShowJuzModal(false)}
        dark={dark}
        sessionJuz={sessionJuz}
        setSessionJuz={setSessionJuz}
        juzStatus={juzStatus}
        juzProgress={juzProgress}
        setJuzProgress={setJuzProgress}
        sessionIdx={sessionIdx}
        setSessionIdx={setSessionIdx}
        setRepCounts={setRepCounts}
        setConnectionReps={setConnectionReps}
        setOpenAyah={setOpenAyah}
      />

      {/* Mushaf Audio Range Picker */}
      <MushafRangePickerModal
        show={showMushafRangePicker}
        onClose={()=>setShowMushafRangePicker(false)}
        dark={dark}
        mushafPage={mushafPage}
        mushafVerses={mushafVerses}
        mushafRangeStart={mushafRangeStart} setMushafRangeStart={setMushafRangeStart}
        mushafRangeEnd={mushafRangeEnd} setMushafRangeEnd={setMushafRangeEnd}
        playMushafRange={playMushafRange}
      />

      {/* Quran Juz Picker Modal */}
      <QuranJuzModal
        show={showQuranJuzModal}
        onClose={()=>setShowQuranJuzModal(false)}
        dark={dark}
        JUZ_PAGES={JUZ_PAGES}
        mushafJuzNum={mushafJuzNum}
        setMushafJuzNum={setMushafJuzNum}
        setMushafPage={setMushafPage}
      />

      {/* Quran Surah Picker Modal */}
      <SurahPickerModal
        show={showQuranSurahModal}
        onClose={()=>setShowQuranSurahModal(false)}
        dark={dark}
        mushafSurahNum={mushafSurahNum}
        setMushafPage={setMushafPage}
        setMushafSurahNum={setMushafSurahNum}
        setSelectedSurahNum={setSelectedSurahNum}
      />

      {/* Quran Reciter Modal */}
{/* ── SETTINGS + SUB-MODALS (extracted) ── */}
<SettingsModal
  show={showSettings}
  onClose={()=>setShowSettings(false)}
  dark={dark} T={T}
  fontSize={fontSize} setFontSize={setFontSize}
  editName={editName} setEditName={setEditName}
  showNameModal={showNameModal} setShowNameModal={setShowNameModal}
  showResetConfirm={showResetConfirm} setShowResetConfirm={setShowResetConfirm}
  showTerms={showTerms} setShowTerms={setShowTerms}
  setDark={setDark}
  onAdjustPlan={()=>{setTabBeforeAdjust({activeTab,rihlahTab});setShowSettings(false);setActiveTab("rihlah");setRihlahTab("adjust");}}
  onAbout={()=>{setTabBeforeAdjust({activeTab,rihlahTab});setShowSettings(false);setActiveTab("masjidayn");setMasjidaynTab("about");}}
/>

<TwoPageWarningModal warning={twoPageWarning} onClose={()=>setTwoPageWarning(null)} dark={dark} />

<ReciterModal
  show={showReciterModal}
  onClose={()=>setShowReciterModal(false)}
  dark={dark}
  reciterMode={reciterMode}
  quranReciter={quranReciter} setQuranReciter={setQuranReciter}
  reciter={reciter} setReciter={setReciter}
  currentReciter={currentReciter}
  setPlayingSurah={setPlayingSurah}
  setPlayingKey={setPlayingKey}
  setAudioLoading={setAudioLoading}
  audioRef={audioRef}
/>

      {activeTab==="masjidayn"&&!showTerms&&(
        <MasjidaynTab
          dark={dark} T={T}
          masjidaynTab={masjidaynTab} setMasjidaynTab={setMasjidaynTab}
          activeStream={activeStream}
          selectedRamadanNight={selectedRamadanNight} setSelectedRamadanNight={setSelectedRamadanNight}
          ramadanVideoType={ramadanVideoType} setRamadanVideoType={setRamadanVideoType}
          haramainMosque={haramainMosque} setHaramainMosque={setHaramainMosque}
          openImam={openImam} setOpenImam={setOpenImam}
          haramainPlaying={haramainPlaying} playHaramainSurah={playHaramainSurah}
          stopHaramain={stopHaramain} haramainMeta={haramainMeta}
          onBackToSettings={masjidaynTab==="about"?()=>{
            if(tabBeforeAdjust){
              setActiveTab(tabBeforeAdjust.activeTab);
              setRihlahTab(tabBeforeAdjust.rihlahTab);
              setTabBeforeAdjust(null);
            }
            setShowSettings(true);
          }:null}
        />
      )}

      {/* ── GLOBAL HARAMAIN PLAYER ── */}
      {haramainMeta && (
        <HaramainPlayer
          meta={haramainMeta}
          isPlaying={!haramainIsPaused}
          time={haramainTime}
          duration={haramainDuration}
          rate={haramainRate}
          expanded={haramainExpanded}
          setExpanded={setHaramainExpanded}
          onPlayPause={toggleHaramainPlayPause}
          onSeek={seekHaramain}
          onSkip={skipHaramain}
          onSetRate={setHaramainPlaybackRate}
          onNext={haramainNext}
          onPrev={haramainPrev}
          onStop={stopHaramain}
          dark={dark}
        />
      )}

    </>)}

    {/* Badge celebration toast */}
    {badgeCelebration&&(
      <div onClick={()=>setBadgeCelebration(null)} style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.60)",backdropFilter:"blur(4px)"}}>
        <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:24,padding:"32px 28px",maxWidth:320,width:"90%",textAlign:"center",border:"1px solid rgba(217,177,95,0.25)",boxShadow:"0 20px 60px rgba(0,0,0,0.50),0 0 40px rgba(212,175,55,0.15)"}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:48,marginBottom:12}}>{badgeCelebration.emoji}</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:dark?"#F3E7C8":"#2D2A26",marginBottom:8}}>{badgeCelebration.title}</div>
          <div style={{fontSize:13,color:dark?"rgba(243,231,200,0.65)":"#6B645A",lineHeight:1.6,marginBottom:20}}>{badgeCelebration.message}</div>
          <div className="sbtn" onClick={()=>setBadgeCelebration(null)} style={{padding:"12px 28px",borderRadius:14,fontSize:13,fontWeight:700,color:"#0A0E1A",background:"linear-gradient(180deg,#E6B84A,#D4A62A)",boxShadow:"0 6px 18px rgba(230,184,74,0.25)",display:"inline-block"}}>Al-Hamdulillah</div>
        </div>
      </div>
    )}

    </div>
  );
}
