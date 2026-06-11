import { useState, useEffect, useRef } from "react";
import { SURAH_EN } from "../data/constants";
import { JUZ_META, JUZ_SURAHS, SURAH_AR } from "../data/quran-metadata";
import { saveCompletedAyahs, normalizeUthmani } from "../utils";
import { useQcfFont } from "../hooks/useQcfFont";
import { useMushafData } from "../hooks/useMushafData";
import { useBismillah } from "../hooks/useBismillah";
import MushafPage from "../components/MushafPage";
import SessionWisdom from "../components/SessionWisdom";
import PairModal from "../components/PairModal";
import CloserModal from "../components/CloserModal";
import AyahPopupModal from "../components/AyahPopupModal";
import FajrMushafView from "../components/FajrMushafView";
import ReviewMushafView from "../components/ReviewMushafView";
import ReviewStudyView from "../components/ReviewStudyView";
import FajrStudyRows from "../components/FajrStudyRows";
import {
  buildConnSurahGroups,
  buildConnectionPairs,
  buildClosers,
  buildPageBatch,
  capToMadinahPage,
  filterActivePlusFresh,
} from "../hifz";

export default function MyHifzTab(props) {
  const {
    asrSessionView,
    pushActivity,
    haramainMeta,
    // theme/constants
    dark, T, SESSIONS, fontSize,
    // reciter
    reciter, currentReciter, setReciterMode, setShowReciterModal, hasPerAyah,
    // session juz
    sessionJuz, setSessionJuz, sessionIdx, setSessionIdx, totalSV, dailyNew,
    setShowJuzModal,
    // sessions state
    activeSessionIndex, setActiveSessionIndex, sessionsCompleted, setSessionsCompleted, setStreak,
    currentSessionId, isAsr, toggleCheck,
    // batch
    batch: rawBatch, bEnd, bDone, fajrBatch, sessionVerses,
    // loading
    sessLoading, sessError,
    // repetition/connection
    repCounts, setRepCounts, connectionReps, setConnectionReps,
    // ayah ui
    openAyah, setOpenAyah, ayahPage, setAyahPage, touchStartRef,
    hifzViewMode, setHifzViewMode,
    // translations + audio
    translations, fetchTranslations,
    playingKey, setPlayingKey, audioLoading, playAyah, looping, setLooping, audioRef,
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
    setTodayFajrBatch, todayFajrBatch,
    // sim verses
    simVerseCache, fetchSimVerse,
    // plan mode — "shaykh" (page-based) or "custom" (ayah-count via calcTimeline)
    userPlanMode = "shaykh",
    // Reps per ayah — Shaykh's default is 20; custom users can adjust.
    repTarget = 20,
    tutorialMode = false,
    // listen-along (full-page recitation helper for Mushaf mode)
    playMushafRange, stopMushafAudio, mushafAudioPlaying,
    // KFGQPC per-page PUA-encoded line data (loaded from /mushaf-pages.json)
    qpcPages,
    // Per-line layout metadata (loaded from /quran-layout.json). Each page has
    // an array of lines with c=1 (centered) or c=0 (justified), plus a type
    // 's' (surah header) or 'a' (ayah flow).
    mushafLayout,
  } = props;

  // Wisdom rotation — two triggers:
  //  1) App launch (component mount) → bump offset so a fresh start shows a fresh card
  //  2) 10 min spent on fajr/dhuhr/asr → bump again mid-session
  const activeSid = SESSIONS[activeSessionIndex]?.id;
  const rotatingSession = activeSid === "fajr" || activeSid === "dhuhr" || activeSid === "asr";
  const [wisdomOffset, setWisdomOffset] = useState(() => {
    try {
      const stored = parseInt(localStorage.getItem("jalil-wisdom-offset") || "0", 10);
      const next = stored + 1 + Math.floor(Math.random() * 100);
      localStorage.setItem("jalil-wisdom-offset", String(next));
      return next;
    } catch { return Math.floor(Math.random() * 100); }
  });
  useEffect(() => {
    if (!rotatingSession) return;
    const t = setTimeout(() => {
      setWisdomOffset(o => {
        const next = o + 1 + Math.floor(Math.random() * 100);
        try { localStorage.setItem("jalil-wisdom-offset", String(next)); } catch {}
        return next;
      });
    }, 10 * 60 * 1000);
    return () => clearTimeout(t);
  }, [rotatingSession, wisdomOffset]);
  // Bump wisdom when entering Fajr (activeSessionIndex === 0) so each new
  // cycle rotates the wisdom pool. Without this, multiple Fajr sessions
  // within the same calendar day all show the same verse since
  // getSessionWisdom keys on Date.now()/86400000 (real day).
  useEffect(() => {
    if (activeSessionIndex !== 0) return;
    setWisdomOffset(o => {
      const next = o + 1 + Math.floor(Math.random() * 100);
      try { localStorage.setItem("jalil-wisdom-offset", String(next)); } catch {}
      return next;
    });
  }, [activeSessionIndex]);

  // Fajr = one full mushaf page as the day's memorization effort (Sheikh Al-Qasim's method).
  // Maghrib and Isha inherit the same page (listening + final review of today's batch).
  // Dhuhr uses its own 5-page review pool; Asr uses its own review batch; neither is affected.
  //
  // Page-based flow only applies when the user is on the Shaykh's default plan.
  // If they've adjusted their timeline in Settings (userPlanMode === "custom"),
  // we fall back to the calcTimeline-driven ayah-count batch from the main file.
  const isShaykhPlan = userPlanMode !== "custom";
  const isFajr = currentSessionId === "fajr";
  const isMaghribOrIsha = currentSessionId === "maghrib" || currentSessionId === "isha";
  const isPageBasedSession = isShaykhPlan && (isFajr || isMaghribOrIsha);
  const isMushafFajr = isFajr && isShaykhPlan && hifzViewMode === "mushaf";

  const [fajrPageVerses, setFajrPageVerses] = useState({}); // { [pageNum]: verses[] }
  // Mushaf fonts, layout data (incl. the Madinah verse→page map), and the
  // universal bismillah glyphs — shared hooks (see src/hooks). Declared up here
  // because the fajrPageVerses fetch effects below gate on verseToPageMap.
  const { loadedFonts, loadQcfFont } = useQcfFont();
  const { mushafPagesData, mushafLayoutData, verseToPageMap } = useMushafData({
    withVerseToPage: true,
  });
  const bismillahGlyphs = useBismillah(loadQcfFont);
  const fajrPageNum = rawBatch[0]?.page_number;
  // Pages used by the Dhuhr/Asr/Maghrib/Isha batch — we fetch each with
  // code_v2 + line_number so every session renders in the authentic
  // KFGQPC V2 mushaf layout (matching Fajr + QuranTab).
  // Fetch ±1 page around each batch page — API and Madinah layouts
  // disagree on boundary verses (e.g. Al-Ala 11-15: API says page 591,
  // Madinah says 592). Pulling both pages lets us rebuild the correct
  // Madinah-page batch via verseToPageMap.
  const sessionPageNums = (() => {
    const s = new Set();
    (rawBatch || []).forEach(v => {
      const p = v.page_number;
      if (!p) return;
      s.add(p);
      if (p > 1) s.add(p - 1);
      if (p < 604) s.add(p + 1);
    });
    return Array.from(s);
  })();
  useEffect(() => {
    if (!sessionPageNums.length) return;
    if (!verseToPageMap) return; // wait for V2 lookup so page_number stamp can run
    let cancelled = false;
    (async () => {
      for (const pn of sessionPageNums) {
        if (fajrPageVerses[pn]) continue;
        try {
          const res = await fetch(`https://api.quran.com/api/v4/verses/by_page/${pn}?words=true&word_fields=line_number,code_v2,char_type_name,page_number&fields=text_uthmani,verse_key,surah_number,page_number,juz_number,hizb_number,rub_el_hizb_number&per_page=50`);
          if (!res.ok || cancelled) continue;
          const data = await res.json();
          const vs = (data.verses || []).map(v => ({ ...v, text_uthmani: normalizeUthmani(v.text_uthmani) }));
          if (verseToPageMap) {
            vs.forEach(v => { const p = verseToPageMap[v.verse_key]; if (p) v.page_number = p; });
          }
          if (!cancelled) setFajrPageVerses(prev => prev[pn] ? prev : { ...prev, [pn]: vs });
          loadQcfFont(pn);
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [sessionPageNums.join(","), verseToPageMap]);

  // Preload the current Fajr page font + immediate neighbors. Font loading,
  // layout data, and bismillah glyphs are provided by the shared hooks above.
  useEffect(() => {
    if (!fajrPageNum) return;
    for (let i = -1; i <= 1; i++) loadQcfFont(fajrPageNum + i);
  }, [fajrPageNum]);
  useEffect(() => {
    if (!isPageBasedSession) return;
    if (!fajrPageNum || fajrPageVerses[fajrPageNum]) return;
    if (!verseToPageMap) return; // wait for V2 lookup so page_number stamp can run
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`https://api.quran.com/api/v4/verses/by_page/${fajrPageNum}?words=true&word_fields=line_number,code_v2,char_type_name,page_number&fields=text_uthmani,verse_key,surah_number,page_number,juz_number,hizb_number,rub_el_hizb_number&per_page=50`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const vs = (data.verses || []).map(v => {
          // Collect unique line numbers from words (used for the two-section split).
          const lines = [...new Set((v.words || []).map(w => w.line_number).filter(n => typeof n === "number"))].sort((a, b) => a - b);
          return {
            ...v,
            text_uthmani: normalizeUthmani(v.text_uthmani),
            _lines: lines,
            _firstLine: lines[0] || null,
            _lastLine: lines[lines.length - 1] || null,
          };
        });
        if (verseToPageMap) {
          vs.forEach(v => { const p = verseToPageMap[v.verse_key]; if (p) v.page_number = p; });
        }
        if (!cancelled) setFajrPageVerses(prev => ({ ...prev, [fajrPageNum]: vs }));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [isPageBasedSession, fajrPageNum, verseToPageMap]);

  // Full mushaf page — UNION of fajrPageNum and neighbors ±1, since the API
  // might place a verse on one page while Madinah places it on another. We
  // filter down via verseToPageMap later to get today's Madinah page set.
  const pageBatch = buildPageBatch({ rawBatch, fajrPageVerses, fajrPageNum, isPageBasedSession });

  // Filter a mushaf page's verses to what belongs in today's batch.
  //
  // Rule: include every surah on this page that is BOTH
  //   (a) the user's active surah (continuation of yesterday) OR starts fresh
  //       on this page (has its ayah 1 present), AND
  //   (b) still in the user's queue — i.e., in sessionVerses, which the main
  //       file builds from juzStatus filtering out already-completed surahs.
  //
  // Covers the real cases:
  //   - Qiyāmah 1 on page 577, Muddaththir tail also present → include Qiyāmah
  //     only (Muddaththir is the active one's predecessor, not fresh here).
  //   - Qiyāmah 20-40 on page 578, Insān 1+ also present (Insān marked
  //     complete in onboarding) → include Qiyāmah only (Insān not in queue).
  //   - Page 604 for a fresh user → Al-Ikhlāṣ, Al-Falaq, An-Nās all start on
  //     the page and all are in queue → all three included in the day's batch.
  const activeSurahNum = rawBatch[0]?.surah_number
    || parseInt(rawBatch[0]?.verse_key?.split(":")?.[0] || "0", 10);
  const queuedSurahs = (() => {
    const set = new Set();
    (sessionVerses || []).forEach(v => {
      const s = v.surah_number || parseInt(v.verse_key?.split(":")?.[0] || "0", 10);
      if (s) set.add(s);
    });
    return set;
  })();
  // Memorization batch — page-based sessions (Fajr/Maghrib/Isha) keep only the
  // active surah's ayahs (filterActivePlusFresh), then cap to today's Madinah
  // page via verseToPageMap. Dhuhr spans 5 pages so it skips both. The pure
  // logic lives in src/hifz (extracted Wave 2).
  const batchPreFilter = isPageBasedSession
    ? filterActivePlusFresh(pageBatch, { activeSurahNum, queuedSurahs, completedAyahs })
    : pageBatch;
  const batch = capToMadinahPage(batchPreFilter, { verseToPageMap, fajrPageNum, isPageBasedSession });

  // Share the page batch with the main component so Maghrib / Isha activity
  // descriptions ("Listened to ..." / "Final review of ...") reflect the
  // actual page the user worked on, not the old dailyNew-driven fajrBatch.
  useEffect(() => {
    if (!isShaykhPlan || !isFajr || !batch || batch.length === 0) return;
    if (typeof setTodayFajrBatch !== "function") return;
    const same =
      (todayFajrBatch || []).length === batch.length &&
      (todayFajrBatch || []).every((v, i) => v.verse_key === batch[i].verse_key);
    if (!same) setTodayFajrBatch(batch);
  }, [isShaykhPlan, isFajr, batch.length, batch[0]?.verse_key]);

  // ── Connection-phase computation — lifted out of the render IIFE so the modal-
  //    dismiss state can react to visible-step count changes.
  //
  //    Per the Sheikh's method, each surah is memorized as its own unit:
  //      - Pair {N-1, N} unlocks when both ayahs hit 20/20, within the same surah.
  //      - Cross-surah pairs are not created.
  //      - Once every ayah of a surah in this batch is at 20/20 AND every pair
  //        inside that surah is at 10/10, the "all N ayahs of [surah] together × 10"
  //        closer unlocks for that surah.
  const connSurahGroups = buildConnSurahGroups(batch, isFajr);
  const connAllPairs = buildConnectionPairs({ connSurahGroups, isFajr, repCounts, repTarget });
  const connVisiblePairs = connAllPairs.filter(p => p.ready);
  // Closers — short surahs get one per-surah closer; long surahs follow the
  // Shaykh's two-section structure: section-1 closer → bridge pair (one of the
  // regular pairs, gating the section-2 closer) → section-2 closer → page closer.
  //
  // "Long" is measured in mushaf *lines*, not ayah count, matching the book.
  // The split point is the midpoint of the unique lines the active surah's
  // ayahs occupy on this page. A verse whose first line sits in the first half
  // belongs to section 1; otherwise section 2. Falls back to ayah-count split
  // if line data isn't available (old cache, etc.).
  const connClosers = buildClosers({ connSurahGroups, connAllPairs, repCounts, connectionReps, repTarget });
  const connVisibleClosers = connClosers.filter(c => c.ready);
  // The "active" closer is the first unlocked one that isn't yet at 10/10.
  // It takes priority over the pair modal — each surah gets its own dedicated
  // closer screen the moment its 20× + pairs are complete.
  const activeCloser = connVisibleClosers.find(c => (connectionReps[c.key] || 0) < 10) || null;
  const connAllPairsDone = connAllPairs.length > 0 && connAllPairs.every(p => (connectionReps[p.key] || 0) >= 10);
  const connAllClosersDone = connClosers.length > 0 && connClosers.every(c => (connectionReps[c.key] || 0) >= 10);
  const connAllDone = isFajr && batch.length >= 2 && connAllPairsDone && connAllClosersDone;

  // ── Modal dismiss tracking ──
  // Normal flow: modals auto-close the moment the work inside them is done
  // (no manual × needed). The × is only for leaving a session early — if the
  // user dismisses, the same modal reopens as soon as a new unit of work appears.
  const [pairModalDismissed, setPairModalDismissed] = useState(false);
  const prevPairCountRef = useRef(0);
  useEffect(() => {
    if (connVisiblePairs.length > prevPairCountRef.current) setPairModalDismissed(false);
    prevPairCountRef.current = connVisiblePairs.length;
  }, [connVisiblePairs.length]);

  const [closerModalDismissed, setCloserModalDismissed] = useState(false);
  const activeCloserKey = activeCloser?.key || null;
  const prevCloserKeyRef = useRef(null);
  useEffect(() => {
    if (activeCloserKey && activeCloserKey !== prevCloserKeyRef.current) setCloserModalDismissed(false);
    prevCloserKeyRef.current = activeCloserKey;
  }, [activeCloserKey]);

  useEffect(() => {
    setPairModalDismissed(false);
    setCloserModalDismissed(false);
    prevPairCountRef.current = 0;
    prevCloserKeyRef.current = null;
  }, [fajrPageNum, currentSessionId]);

  // ── Mushaf = reading mode. Study = memorizing mode. ──
  // Mushaf-mode memorization features are muted (not deleted) via this flag so we
  // can flip it back if we change direction. When false, Mushaf Fajr renders as a
  // pure reading surface: no rep taps, no pair/closer modals, no session button.
  // All other sessions (Dhuhr/Asr/Maghrib/Isha) always have their Complete button.
  const MUSHAF_INTERACTIVE = false;
  const memorizingActive = !isMushafFajr || MUSHAF_INTERACTIVE;

  // Closer has priority: when a surah's full closer is ready, it takes the
  // screen; the pair modal waits its turn. Pair modal hides when every visible
  // pair is already at 10/10 (auto-close). Both modals are suppressed entirely
  // in Mushaf (reading) mode.
  const anyPairInFlight = connVisiblePairs.some(p => (connectionReps[p.key] || 0) < 10);
  const showPairModal = memorizingActive && anyPairInFlight && !activeCloser && !pairModalDismissed;
  const showCloserModal = memorizingActive && !!activeCloser && !closerModalDismissed;

  // Keep the newest-unlocked pair centered in the modal viewport. When a new
  // pair joins the list (connVisiblePairs grows), scroll the newest card into
  // center so the user doesn't have to reach for it — older pairs get pushed
  // below, not cut off above.
  const newestPairRef = useRef(null);
  const prevVisiblePairsCountRef = useRef(0);
  useEffect(() => {
    if (!showPairModal) { prevVisiblePairsCountRef.current = connVisiblePairs.length; return; }
    if (connVisiblePairs.length > prevVisiblePairsCountRef.current) {
      requestAnimationFrame(() => {
        newestPairRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
    prevVisiblePairsCountRef.current = connVisiblePairs.length;
  }, [showPairModal, connVisiblePairs.length]);

  // Auto-advance: when a pair or closer modal finishes its work (user completed
  // all reps, not a manual ×), jump straight to the next unmemorized ayah so the
  // user flows ayah → pair → ayah → pair without landing back on a done ayah.
  const prevShowPairModalRef = useRef(false);
  const prevShowCloserModalRef = useRef(false);
  useEffect(() => {
    const pairJustAutoClosed = prevShowPairModalRef.current && !showPairModal && !pairModalDismissed && !activeCloser;
    const closerJustAutoClosed = prevShowCloserModalRef.current && !showCloserModal && !closerModalDismissed;
    if (pairJustAutoClosed || closerJustAutoClosed) {
      // Keep auto-advance within the surah the user was just working on.
      // When a batch spans two surahs (boundary page: Al-Mumtaḥanah tail + Aṣ-Ṣaff head),
      // don't auto-open Aṣ-Ṣaff 1 after Al-Mumtaḥanah's closer — the user re-taps
      // Aṣ-Ṣaff 1 manually to begin its reps.
      const curSurah = openAyah ? parseInt(openAyah.split(":")[0], 10) : activeSurahNum;
      const nextAyah = batch.find(v => {
        const s = v.surah_number || parseInt(v.verse_key?.split(":")?.[0] || "0", 10);
        return s === curSurah && (repCounts[v.verse_key] || 0) < repTarget;
      });
      if (nextAyah) {
        setOpenAyah(nextAyah.verse_key);
        fetchTranslations([nextAyah]);
      }
    }
    prevShowPairModalRef.current = showPairModal;
    prevShowCloserModalRef.current = showCloserModal;
  }, [showPairModal, showCloserModal]);

  // Fajr milestone tracking — log 20× phase + connection phase in activity feed
  const repsLoggedRef = useRef(null); // tracks which page's 20× was logged
  const connLoggedRef = useRef(null); // tracks which page's connections were logged
  const reviewMushafRef = useRef(null); // Dhuhr/Maghrib/Isha review mushaf wrapper
  useEffect(() => {
    // Only scroll in Shaykh plan Dhuhr (5-page review). Custom plan uses short
    // Study cards (5 ayahs/page) where no scroll reset is needed. Maghrib/Isha
    // only show today's Fajr page (1 page) so scroll isn't useful either.
    if (!isShaykhPlan) return;
    if (currentSessionId !== "dhuhr") return;
    const el = reviewMushafRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [ayahPage, currentSessionId, isShaykhPlan]);
  useEffect(() => {
    if (currentSessionId !== "fajr" || !pushActivity || !batch.length) return;
    const APS = 7;
    const aPages = Math.max(1, Math.ceil(batch.length / APS));
    const aSafe = Math.min(ayahPage, aPages - 1);
    const aStart = aSafe * APS;
    const aEnd = Math.min(aStart + APS, batch.length);
    const pageAyahs = batch.slice(aStart, aEnd);
    if (!pageAyahs.length) return;
    const pageKey = `${aStart}-${aEnd}`;

    // Check 20× phase complete
    const allRepsDone = pageAyahs.every(v => (repCounts[v.verse_key] || 0) >= repTarget);
    if (allRepsDone && repsLoggedRef.current !== pageKey) {
      repsLoggedRef.current = pageKey;
      const first = pageAyahs[0], last = pageAyahs[pageAyahs.length - 1];
      const fS = first.surah_number || parseInt(first.verse_key?.split(":")[0], 10);
      const fA = parseInt(first.verse_key?.split(":")[1], 10);
      const lA = parseInt(last.verse_key?.split(":")[1], 10);
      const name = SURAH_EN[fS] || "";
      pushActivity("milestone", `Completed ${repTarget}× repetition of ${name} ayat ${fA}-${lA}`);
    }

    // Check connection phase complete
    if (allRepsDone && pageAyahs.length >= 2) {
      const pairs = [];
      for (let i = 0; i < pageAyahs.length - 1; i++) pairs.push(`pair-${aStart + i}-${aStart + i + 1}`);
      const allKey = `all-${aStart}`;
      const allConnDone = [...pairs, allKey].every(k => (connectionReps[k] || 0) >= 10);
      if (allConnDone && connLoggedRef.current !== pageKey) {
        connLoggedRef.current = pageKey;
        const first = pageAyahs[0], last = pageAyahs[pageAyahs.length - 1];
        const fS = first.surah_number || parseInt(first.verse_key?.split(":")[0], 10);
        const fA = parseInt(first.verse_key?.split(":")[1], 10);
        const lA = parseInt(last.verse_key?.split(":")[1], 10);
        const name = SURAH_EN[fS] || "";
        pushActivity("milestone", `Completed connection phase of ${name} ayat ${fA}-${lA}`);
      }
    }
  }, [currentSessionId, batch, ayahPage, repCounts, connectionReps, pushActivity]);

  return (
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",position:"relative"}} className="fi gold-particles">

          {/* Reciter selector moved to the app side drawer (Settings). */}

          <div style={{flex:1,padding:`10px 16px ${haramainMeta?"140px":"16px"}`}}>

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

              return (
                <div style={{marginBottom:10}}>
                  <div style={{padding:"11px 14px",
                    background:dark?"linear-gradient(180deg,rgba(15,26,43,0.95) 0%,rgba(12,21,38,0.98) 100%)":"#EADFC8",
                    border:`1px solid ${isDone?"rgba(74,222,128,0.20)":(dark?"rgba(230,184,74,0.18)":"rgba(0,0,0,0.18)")}`,borderLeft:`3px solid ${isDone?"#4ADE80":(dark?"#E6B84A":"#B83A1A")}`,borderRadius:"0 10px 10px 0",
                    boxShadow:dark?"0 4px 16px rgba(0,0,0,0.20),0 0 12px rgba(230,184,74,0.06)":"0 2px 8px rgba(0,0,0,0.06)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:700,color:isDone?"#4ADE80":(dark?"#F0E6D0":"#2D2A26")}}>{sessionLabel}</div>
                      </div>
                      <div style={{fontSize:12,color:dark?"rgba(230,184,74,0.60)":"#6B645A",fontFamily:"'IBM Plex Mono',monospace"}}>{isDone?"✓":(()=>{
                        // Fajr counts ayahs that hit the full 20 reps — that's
                        // the memorization metric. Review sessions don't use
                        // rep counters, so the rep-based count would always
                        // read 0/N and feel broken. Show page progress instead
                        // (Dhuhr/Asr have multiple pages; Maghrib/Isha are 1).
                        if (sid === "fajr") {
                          // Header shows both: the ayah range of today's batch
                          // (what's in front of you) and the rep-completion count
                          // (how far). e.g. "Ayat 17-35 · 0 of 30".
                          const done = batch.filter(v=>repCounts[v.verse_key]>=repTarget).length;
                          const total = batch.length || dailyNew;
                          if (batch.length) {
                            const firstA = parseInt(batch[0].verse_key?.split(":")?.[1] || "0", 10);
                            const lastA = parseInt(batch[batch.length-1].verse_key?.split(":")?.[1] || "0", 10);
                            const range = firstA === lastA ? `Ayah ${firstA}` : `Ayat ${firstA}-${lastA}`;
                            return `${range} · ${done} of ${total}`;
                          }
                          return `0 of ${total}`;
                        }
                        const totalPages = new Set(batch.map(v => v.page_number).filter(Boolean)).size || 1;
                        const currentPage = Math.min(ayahPage + 1, totalPages);
                        return `Page ${currentPage} of ${totalPages}`;
                      })()}</div>
                    </div>
                    <SessionWisdom sid={sid} wisdomOffset={wisdomOffset} isDone={isDone} dark={dark} />
                  </div>
                </div>
              );
            })()}

            {asrSessionView}

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
            {SESSIONS[activeSessionIndex]?.id==="asr"&&asrIsCustomized&&!asrStarted&&(()=>{
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
                          <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:isSel?"#F6E27A":hasSelections?"#E2BC72":"rgba(243,231,200,0.70)",fontWeight:700,lineHeight:1.15}}>Juz {j.roman||j.num}</div>
                          <div style={{fontSize:9,color:isSel?"rgba(246,226,122,0.55)":"rgba(243,231,200,0.30)",marginTop:3,letterSpacing:".06em"}}>Juz {j.num}</div>
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
                          <div style={{fontSize:13,color:checked?"#F6E27A":"rgba(243,231,200,0.65)",fontWeight:checked?600:400}}>{SURAH_EN[s.s]||s.name}</div>
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
                {/* Listen-along for review sessions — sits above the batch header */}
                {["dhuhr","maghrib","isha"].includes(currentSessionId)&&playMushafRange&&batch.length>0&&reciter&&(()=>{
                  const pageGroups=[];
                  let cg=null;
                  batch.forEach(v=>{
                    const pn=v.page_number||0;
                    if(!cg||cg.page!==pn){cg={page:pn,ayahs:[]};pageGroups.push(cg);}
                    cg.ayahs.push(v);
                  });
                  const safeIdx=Math.min(ayahPage,Math.max(0,pageGroups.length-1));
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
                {/* Batch header + view toggle for Fajr */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase"}}>{currentSessionId==="fajr"?"Fajr":currentSessionId==="dhuhr"?"Dhuhr Review":currentSessionId==="asr"?"Asr Review":currentSessionId==="maghrib"?"Listening":"Isha Review"} — Ayah Batch</div>
                  {currentSessionId==="fajr"&&isShaykhPlan&&(
                    <div style={{display:"flex",gap:4}}>
                      {["interactive","mushaf"].map(m=>(
                        <div key={m} data-tut={m==="interactive"?"guided-study":undefined} className="sbtn" onClick={()=>setHifzViewMode(m)} style={{padding:"3px 8px",borderRadius:6,fontSize:9,fontWeight:hifzViewMode===m?700:400,letterSpacing:".06em",textTransform:"uppercase",color:hifzViewMode===m?(dark?"#E8C76A":"#6B4F00"):(dark?"rgba(243,231,200,0.35)":"#9A8A6A"),background:hifzViewMode===m?(dark?"rgba(217,177,95,0.10)":"rgba(180,140,40,0.08)"):"transparent",border:`1px solid ${hifzViewMode===m?(dark?"rgba(217,177,95,0.25)":"rgba(140,100,20,0.20)"):"transparent"}`}}>
                          {m==="interactive"?"Study":"Mushaf"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Method guide — Fajr Study only (Mushaf is just reading, no reps) */}
                {currentSessionId==="fajr"&&hifzViewMode==="interactive"&&(
                  <div style={{marginBottom:10,padding:"8px 12px",borderRadius:8,background:dark?"rgba(217,177,95,0.04)":"rgba(180,140,40,0.04)",border:`1px solid ${dark?"rgba(217,177,95,0.08)":"rgba(140,100,20,0.08)"}`,fontSize:11,color:dark?"rgba(243,231,200,0.45)":"#5A4A2A",lineHeight:1.6}}>
                    <strong style={{color:dark?"#E8C76A":"#6B4F00"}}>Sheikh Al-Qasim's Method:</strong> Repeat each ayah <strong>20 times</strong>, then a connection phase appears — recite pairs together <strong>10 times</strong>, then all ayahs together <strong>10 times</strong>.
                  </div>
                )}

                {/* ── MUSHAF MODE — the full mushaf page the user is on, rendered for
                    reading. Uses pageBatch (the whole page) rather than the Study batch,
                    so the user still sees the tail of the previous surah as they read. ── */}
                {currentSessionId==="fajr"&&isShaykhPlan&&hifzViewMode==="mushaf"&&<FajrMushafView pageBatch={pageBatch} batch={batch} activeSurahNum={activeSurahNum} fajrPageNum={fajrPageNum} dark={dark} playMushafRange={playMushafRange} mushafAudioPlaying={mushafAudioPlaying} stopMushafAudio={stopMushafAudio} reciter={reciter} loadedFonts={loadedFonts} mushafPagesData={mushafPagesData} mushafLayoutData={mushafLayoutData} verseToPageMap={verseToPageMap} bismillahGlyphs={bismillahGlyphs} repCounts={repCounts} repTarget={repTarget} />}

                {/* ── REVIEW MUSHAF — Dhuhr / Maghrib / Isha render their batches as
                    authentic mushaf pages, one page per swipe. Much lighter than
                    walking 20+ cards of Study view when the batch is 100+ ayahs. ── */}
                {(currentSessionId==="dhuhr"||(isShaykhPlan&&["maghrib","isha"].includes(currentSessionId)))&&batch.length>0&&<ReviewMushafView batch={batch} ayahPage={ayahPage} setAyahPage={setAyahPage} touchStartRef={touchStartRef} reviewMushafRef={reviewMushafRef} dark={dark} loadedFonts={loadedFonts} mushafPagesData={mushafPagesData} mushafLayoutData={mushafLayoutData} bismillahGlyphs={bismillahGlyphs} />}

                {/* ── REVIEW STUDY — Dhuhr / Maghrib / Isha in custom plan, card view.
                    Uses the same per-page KFGQPC V2 font + surah ornament as
                    Mushaf, just laid out as cards since the ayah batch doesn't
                    fill full pages. ── */}
                {!isShaykhPlan&&["maghrib","isha"].includes(currentSessionId)&&batch.length>0&&<ReviewStudyView batch={batch} ayahPage={ayahPage} setAyahPage={setAyahPage} touchStartRef={touchStartRef} setOpenAyah={setOpenAyah} fetchTranslations={fetchTranslations} dark={dark} />}

                {/* ── AYAH ROWS — Fajr Study mode (custom-plan users always see this,
                    since Mushaf mode is Shaykh-plan only) ── */}
                {currentSessionId==="fajr"&&(hifzViewMode==="interactive"||!isShaykhPlan)&&<FajrStudyRows batch={batch} isShaykhPlan={isShaykhPlan} verseToPageMap={verseToPageMap} fajrPageNum={fajrPageNum} ayahPage={ayahPage} setAyahPage={setAyahPage} touchStartRef={touchStartRef} repCounts={repCounts} repTarget={repTarget} currentSessionId={currentSessionId} setOpenAyah={setOpenAyah} fetchTranslations={fetchTranslations} fajrPageVerses={fajrPageVerses} loadedFonts={loadedFonts} dark={dark} />}

                {/* ── PAIR MODAL (الربط) — pops the moment a pair unlocks. Auto-closes as
                    soon as every pair in flight is at 10/10. The × is only for leaving
                    the session early; it re-opens when the next pair unlocks. ── */}
                {showPairModal&&(
                  <PairModal connVisiblePairs={connVisiblePairs} connectionReps={connectionReps} setConnectionReps={setConnectionReps} newestPairRef={newestPairRef} setPairModalDismissed={setPairModalDismissed} dark={dark} />
                )}

                {/* ── SURAH CLOSER MODAL — takes over the screen the moment a surah is ready
                    for its "all N ayahs together × 10" closer. Auto-closes on 10/10. The ×
                    is only for early exit. ── */}
                {showCloserModal&&activeCloser&&(
                  <CloserModal activeCloser={activeCloser} connectionReps={connectionReps} setConnectionReps={setConnectionReps} setCloserModalDismissed={setCloserModalDismissed} dark={dark} />
                )}

                {/* ── AYAH POPUP MODAL (all non-ASR sessions) ── */}
                {currentSessionId!=="asr"&&openAyah&&(
                  <AyahPopupModal
                    batch={batch} openAyah={openAyah} setOpenAyah={setOpenAyah} translations={translations}
                    playingKey={playingKey} audioLoading={audioLoading} repCounts={repCounts} setRepCounts={setRepCounts} repTarget={repTarget}
                    currentSessionId={currentSessionId} dark={dark} hasPerAyah={hasPerAyah} reciter={reciter} currentReciter={currentReciter} playAyah={playAyah}
                    looping={looping} setLooping={setLooping} audioRef={audioRef} completedAyahs={completedAyahs} setCompletedAyahs={setCompletedAyahs}
                    sessionVerses={sessionVerses} simVerseCache={simVerseCache} fetchSimVerse={fetchSimVerse} sessionJuz={sessionJuz} tutorialMode={tutorialMode}
                  />
                )}

                {/* ── BATCH DONE / NEXT button — only visible when memorizing is active.
                    Hidden in Mushaf reading mode. ── */}
                {memorizingActive&&(bDone?(
                  <div style={{textAlign:"center",padding:"20px",background:T.surface,border:"1px solid #F0C04030",borderRadius:8}}>
                    <div style={{fontSize:22,marginBottom:8}}>✅</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:"#F0C040",marginBottom:4}}>Batch Complete — MashaAllah!</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.45)"}}>Session complete — MashaAllah! 🤲</div>
                  </div>
                ):(()=>{
                  // In Mushaf Fajr the whole page is one day's effort — no internal 7-ayah pagination.
                  // Review sessions (Dhuhr/Maghrib/Isha) paginate by mushaf-page, not by
                  // 7-ayah chunks, so count distinct page_numbers for the Next/Complete button.
                  const isReviewMushaf=["dhuhr","maghrib","isha"].includes(currentSessionId);
                  // Dhuhr always renders as Mushaf pages (both modes) → count
                  // distinct page_numbers. Custom Maghrib/Isha use 5-ayah Study
                  // cards. Fajr Study uses 7-ayah pagination.
                  const dhuhrCustomMushaf=currentSessionId==="dhuhr"; // always page-based now
                  const batchPages=isMushafFajr?1
                    :isReviewMushaf?(isShaykhPlan||dhuhrCustomMushaf
                        ?Math.max(1,new Set(batch.map(v=>v.page_number||0).filter(Boolean)).size)
                        :Math.max(1,Math.ceil(batch.length/5)))
                    :Math.max(1,Math.ceil(batch.length/7));
                  const onLastPage=ayahPage>=batchPages-1;
                  const isFinal=onLastPage;
                  return (<div>
                  {isFinal&&(
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
                    // On last page — complete the session. In Mushaf Fajr, add the entire page's ayahs.
                    {const slice=isMushafFajr?batch:batch.slice(ayahPage*7,Math.min(ayahPage*7+7,batch.length));
                    setCompletedAyahs(prev=>{const next=new Set(prev);slice.forEach(v=>{if(v.verse_key)next.add(v.verse_key);});saveCompletedAyahs(next);return next;});}
                    const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];
                    setSessionsCompleted(prev=>({...prev,[sess.id]:true}));
                    toggleCheck(sess.id);
                    setRepCounts({});setConnectionReps({});
                    setOpenAyah(null);
                    setAyahPage(0);
                    // Stop any in-progress ayah audio so it doesn't keep
                    // playing into the next session.
                    try { audioRef?.current?.pause(); } catch {}
                    if(audioRef) audioRef.current=null;
                    if(setPlayingKey) setPlayingKey(null);
                    if(activeSessionIndex>=SESSIONS.length-1){
                      // Advance by exactly what's in fajrBatch. With the V2
                      // page-cap in twoPageLimit, fajrBatch is the precise
                      // slice of sessionVerses for today (V2 page in Sheikh,
                      // dailyNew in custom). The previous fullPageActive
                      // path was reading fajrPageVerses (API-page-bounded)
                      // which would miss verses V2 places on this page but
                      // API places on the next (Naziat 16, Abasa 41-42).
                      const fajrMemorized = fajrBatch;
                      const fajrAdvance = fajrBatch.length;
                      setYesterdayBatch(fajrMemorized);
                      setRecentBatches(prev=>[...prev.slice(-4),fajrMemorized.map(v=>({verse_key:v.verse_key,text_uthmani:v.text_uthmani,surah_number:v.surah_number,page_number:v.page_number}))].slice(-5));
                      const pageBasedEnd = sessionIdx + fajrAdvance;
                      if(pageBasedEnd>=totalSV&&totalSV>0&&sessionJuz){
                        setSessionIdx(totalSV);
                        setJuzProgress(prev=>({...prev,[sessionJuz]:totalSV}));
                        setJuzStatus(prev=>markJuzAndSurahsComplete(prev,sessionJuz));
                        setJuzCompletedInSession(prev=>new Set([...prev,sessionJuz]));
                        v9MarkJuzComplete(sessionJuz); // V9
                        setSessionJuz(null);
                      } else if(sessionJuz) {
                        const actualEnd=pageBasedEnd;
                        setSessionIdx(actualEnd);
                        setJuzProgress(prev=>({...prev,[sessionJuz]:actualEnd}));
                        // V9: add all completed ayahs up to actualEnd + mark completed surahs
                        setCompletedAyahs(prev=>{const next=new Set(prev);sessionVerses.slice(0,actualEnd).forEach(v=>{if(v.verse_key)next.add(v.verse_key);});saveCompletedAyahs(next);return next;});
                        // Mark completed surahs in V9
                        const surahTotals={};
                        sessionVerses.forEach(v=>{const sn=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);surahTotals[sn]=(surahTotals[sn]||0)+1;});
                        let cursor=0;const surahOrder=[];
                        sessionVerses.forEach(v=>{const sn=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);if(!surahOrder.includes(sn))surahOrder.push(sn);});
                        for(const sn of surahOrder){const count=surahTotals[sn]||0;if(cursor+count<=actualEnd)v9MarkSurahComplete(sn);cursor+=count;}
                      }
                      setActiveSessionIndex(0);
                      setSessionsCompleted({fajr:false,dhuhr:false,asr:false,maghrib:false,isha:false});
                      // One full Fajr→Isha cycle = +1 to streak. Defines a
                      // "day" by completion of the daily plan rather than a
                      // calendar day so rapid testing reflects progress.
                      if(setStreak) setStreak(p=>(p||0)+1);
                      // Start each new day on Fajr Mushaf (read with teacher first)
                      setHifzViewMode("mushaf");
                    } else {
                      setActiveSessionIndex(i=>i+1);
                    }
                  }} style={{width:"100%",padding:"14px",borderRadius:12,fontSize:14,fontWeight:700,textAlign:"center",transition:"all .2s",
                    background:"linear-gradient(180deg,#E6B84A,#D4A62A)",
                    color:"#0B1220",
                    boxShadow:"0 6px 18px rgba(230,184,74,0.30),0 0 14px rgba(230,184,74,0.15)"}}>
                    Complete Session
                  </div>
                  )}
                  {!isFinal&&<div style={{textAlign:"center",fontSize:10,color:"rgba(243,231,200,0.28)",marginTop:6}}>{ayahPage+1} of {batchPages} · keep going</div>}
                  </div>);
                })())}
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
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:T.accent,marginBottom:6}}>Juz {JUZ_META.find(m=>m.num===sessionJuz)?.roman||sessionJuz} Complete — Alhamdulillah!</div>
                <div style={{fontSize:10,color:T.sub,marginBottom:6,letterSpacing:".06em"}}>Juz {sessionJuz}</div>
                <div style={{fontSize:13,color:T.sub}}>Select the next Juz above to continue.</div>
              </div>
            )}

          </div>
        </div>
  );
}
