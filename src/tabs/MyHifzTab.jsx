import { useState, useEffect, useRef, Fragment } from "react";
import MUTASHABIHAT from "../mutashabihat.json";
import { SURAH_EN } from "../data/constants";
import { JUZ_META, JUZ_SURAHS, SURAH_AR } from "../data/quran-metadata";
import { getSessionWisdom } from "../data/sessions";
import { saveCompletedAyahs, toArabicDigits } from "../utils";

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
    activeSessionIndex, setActiveSessionIndex, sessionsCompleted, setSessionsCompleted,
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
    setTodayFajrBatch, todayFajrBatch,
    // sim verses
    simVerseCache, fetchSimVerse,
    // plan mode — "shaykh" (page-based) or "custom" (ayah-count via calcTimeline)
    userPlanMode = "shaykh",
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
  const isMushafFajr = isFajr && hifzViewMode === "mushaf";

  const [fajrPageVerses, setFajrPageVerses] = useState({}); // { [pageNum]: verses[] }
  const fajrPageNum = rawBatch[0]?.page_number;
  // Pages used by the Dhuhr/Asr/Maghrib/Isha batch — we fetch each with
  // code_v2 + line_number so every session renders in the authentic
  // KFGQPC V2 mushaf layout (matching Fajr + QuranTab).
  const sessionPageNums = Array.from(new Set((rawBatch || []).map(v => v.page_number).filter(Boolean)));
  useEffect(() => {
    if (!sessionPageNums.length) return;
    let cancelled = false;
    (async () => {
      for (const pn of sessionPageNums) {
        if (fajrPageVerses[pn]) continue;
        try {
          const res = await fetch(`https://api.quran.com/api/v4/verses/by_page/${pn}?words=true&word_fields=line_number,code_v2,char_type_name,page_number&fields=text_uthmani,verse_key,surah_number,page_number,juz_number,hizb_number,rub_el_hizb_number&per_page=50`);
          if (!res.ok || cancelled) continue;
          const data = await res.json();
          const vs = (data.verses || []).map(v => ({ ...v, text_uthmani: (v.text_uthmani || "").replace(/\u06DF/g, "\u0652") }));
          if (!cancelled) setFajrPageVerses(prev => prev[pn] ? prev : { ...prev, [pn]: vs });
          loadQcfFont(pn);
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [sessionPageNums.join(",")]);

  // KFGQPC V2 per-page fonts — used to render mushaf pages with authentic
  // word widths & layout. Mirrors QuranTab's font-loading logic.
  const [loadedFonts, setLoadedFonts] = useState(() => new Set());
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
  useEffect(() => {
    if (!fajrPageNum) return;
    for (let i = -1; i <= 1; i++) loadQcfFont(fajrPageNum + i);
  }, [fajrPageNum]);

  // Authoritative mushaf page layout JSON (pre-computed per-page line
  // strings + alignment). Matches QuranTab's render path.
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

  // Universal bismillah glyphs (Fatihah 1:1) — rendered in p1 font so every
  // surah opener shows the authentic mushaf bismillah.
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
  useEffect(() => {
    if (!isPageBasedSession) return;
    if (!fajrPageNum || fajrPageVerses[fajrPageNum]) return;
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
            text_uthmani: (v.text_uthmani || "").replace(/\u06DF/g, "\u0652"),
            _lines: lines,
            _firstLine: lines[0] || null,
            _lastLine: lines[lines.length - 1] || null,
          };
        });
        if (!cancelled) setFajrPageVerses(prev => ({ ...prev, [fajrPageNum]: vs }));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [isPageBasedSession, fajrPageNum]);

  // Full mushaf page — used for the Mushaf reading render so the user sees the
  // whole page, including the tail of the previous surah if any.
  const pageBatch = (isPageBasedSession && fajrPageNum && fajrPageVerses[fajrPageNum]?.length)
    ? fajrPageVerses[fajrPageNum]
    : rawBatch;

  // Dynamically load the KFGQPC V2 per-page font for the current mushaf page.
  // Source: jsdelivr mirror of quran.com's font bundle (CORS-friendly). Each
  // page has its own font whose PUA range matches the glyph codes in
  // /mushaf-pages.json. Loading once per page is cheap (~30-60KB).
  useEffect(() => {
    if (!fajrPageNum) return;
    const fontFamily = `p${fajrPageNum}`;
    if (document.getElementById(`qcf-font-${fajrPageNum}`)) return;
    const style = document.createElement("style");
    style.id = `qcf-font-${fajrPageNum}`;
    style.textContent = `@font-face{font-family:'${fontFamily}';src:url('https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v2/woff/p${fajrPageNum}.woff') format('woff');font-display:swap;}`;
    document.head.appendChild(style);
  }, [fajrPageNum]);

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
  // Exact queued verse_keys (not just surahs) — so when a surah's ayahs that appear
  // on today's mushaf page are already memorized (e.g. Al-Qiyāmah 1-19 on the Al-
  // Muddaththir-tail page 577 for a hifz-descending user who did Qiyāmah before
  // Muddaththir), they're filtered out even though Qiyāmah's surah number is still
  // in queuedSurahs via later-juz ayahs or sessionVerses ordering.
  const queuedKeys = (() => {
    const set = new Set();
    (sessionVerses || []).forEach(v => { if (v.verse_key) set.add(v.verse_key); });
    return set;
  })();
  const filterActivePlusFresh = (pageVs) => {
    if (!pageVs || !pageVs.length) return pageVs || [];
    const startsHere = new Set();
    pageVs.forEach(v => {
      const [s, a] = (v.verse_key || "").split(":");
      if (a === "1") startsHere.add(Number(s) || v.surah_number);
    });
    // Active-surah only: drop tails of earlier/later surahs and fresh starts
    // of the next surah. Only the ayahs belonging to the surah currently being
    // memorized appear in both Study and Mushaf views.
    const kept = pageVs.filter(v => {
      const s = v.surah_number || parseInt(v.verse_key?.split(":")?.[0] || "0", 10);
      const isActive = activeSurahNum && s === activeSurahNum;
      const isFresh = false; // strict mode: only active surah
      const isQueued = queuedSurahs.size === 0 || queuedSurahs.has(s);
      const alreadyDone = completedAyahs && completedAyahs.has && completedAyahs.has(v.verse_key);
      if (alreadyDone && !isActive) return false;
      return (isActive || isFresh) && isQueued;
    });
    // Sort: active surah first (so Al-Mumtaḥanah 12-13 renders above Aṣ-Ṣaff 1-5
    // on a boundary page — continuation ayahs come before the fresh next surah),
    // then remaining fresh surahs in hifz-descending order (114 → 1). Ayah
    // ascending within each surah. Page 604 still reads An-Nās → Al-Falaq →
    // Al-Ikhlāṣ because An-Nās is the active surah at that point.
    return kept.slice().sort((a, b) => {
      const sa = a.surah_number || parseInt(a.verse_key?.split(":")?.[0] || "0", 10);
      const sb = b.surah_number || parseInt(b.verse_key?.split(":")?.[0] || "0", 10);
      if (sa !== sb) {
        if (sa === activeSurahNum) return -1;
        if (sb === activeSurahNum) return 1;
        return sb - sa;
      }
      const aa = parseInt(a.verse_key?.split(":")?.[1] || "0", 10);
      const ab = parseInt(b.verse_key?.split(":")?.[1] || "0", 10);
      return aa - ab;
    });
  };

  // Memorization batch — page-based sessions (Fajr/Maghrib/Isha) show the
  // active surah + any other surahs that begin fresh on the same page.
  const batch = isPageBasedSession ? filterActivePlusFresh(pageBatch) : pageBatch;

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
  const connSurahGroups = (() => {
    if (!isFajr || batch.length < 1) return [];
    const map = {};
    const order = [];
    batch.forEach(v => {
      const s = Number(v.verse_key.split(":")[0]);
      if (!map[s]) { map[s] = []; order.push(s); }
      map[s].push(v);
    });
    return order.map(s => ({ surahNum: s, verses: map[s] }));
  })();
  const connAllPairs = (() => {
    if (!isFajr) return [];
    const arr = [];
    connSurahGroups.forEach(g => {
      const verses = g.verses;
      for (let i = 0; i < verses.length - 1; i++) {
        const v1 = verses[i], v2 = verses[i + 1];
        const a1 = v1.verse_key.split(":")[1];
        const a2 = v2.verse_key.split(":")[1];
        const bothDone = (repCounts[v1.verse_key] || 0) >= 20 && (repCounts[v2.verse_key] || 0) >= 20;
        arr.push({
          key: `pair-${v1.verse_key}-${v2.verse_key}`,
          label: `Ayah ${a1} + ${a2}`,
          ayahs: [v1, v2],
          ready: bothDone,
          surahNum: g.surahNum,
        });
      }
    });
    return arr;
  })();
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
  const SECTION_SPLIT_LINE_THRESHOLD = 7;
  const connClosers = connSurahGroups
    .filter(g => g.verses.length >= 2)
    .flatMap(g => {
      const verses = g.verses;
      const n = verses.length;
      const surahName = SURAH_EN[g.surahNum] || `Surah ${g.surahNum}`;
      const allAyahsDone = verses.every(v => (repCounts[v.verse_key] || 0) >= 20);
      const surahPairs = connAllPairs.filter(p => p.surahNum === g.surahNum);
      const surahPairsDone = surahPairs.length > 0 && surahPairs.every(p => (connectionReps[p.key] || 0) >= 10);

      // Compute split point.
      const surahLines = [...new Set(verses.flatMap(v => v._lines || []).filter(x => typeof x === "number"))].sort((a, b) => a - b);
      const totalLines = surahLines.length;
      let sec1, sec2;
      if (totalLines >= SECTION_SPLIT_LINE_THRESHOLD) {
        // Section 1 gets the first floor(totalLines/2) lines, section 2 the rest.
        // For an 11-line surah layout (Al-Jumu'ah), that's 5 + 6, which lands the
        // split after ayah 4 exactly like the book's example.
        const midLineIdx = Math.floor(totalLines / 2); // 1-based count of section-1 lines
        const sec1LineCutoff = surahLines[midLineIdx - 1];
        sec1 = verses.filter(v => typeof v._firstLine === "number" && v._firstLine <= sec1LineCutoff);
        sec2 = verses.filter(v => typeof v._firstLine === "number" && v._firstLine > sec1LineCutoff);
        // Degenerate case (e.g. one ayah straddles the boundary): ensure both sections non-empty
        if (sec1.length === 0 || sec2.length === 0) { sec1 = null; sec2 = null; }
      }
      // Ayah-count fallback (no line data, or split produced an empty section).
      if (!sec1 || !sec2) {
        if (n < 8) {
          return [{
            key: `closer-${g.surahNum}`,
            label: `All ${n} ayahs of ${surahName} together`,
            ayahs: verses,
            ready: allAyahsDone && surahPairsDone,
            surahNum: g.surahNum,
          }];
        }
        const mid = Math.ceil(n / 2);
        sec1 = verses.slice(0, mid);
        sec2 = verses.slice(mid);
      }

      // Pairs grouped by section. The pair whose left verse is the last of
      // section 1 is the bridge pair that gates section 2's closer.
      const sec1Keys = new Set(sec1.map(v => v.verse_key));
      const bridgePair = surahPairs.find(p => sec1Keys.has(p.ayahs[0].verse_key) && !sec1Keys.has(p.ayahs[1].verse_key));
      const sec1Pairs = surahPairs.filter(p => sec1Keys.has(p.ayahs[0].verse_key) && sec1Keys.has(p.ayahs[1].verse_key));
      const sec2Pairs = surahPairs.filter(p => !sec1Keys.has(p.ayahs[0].verse_key));
      const sec1AyahsDone = sec1.every(v => (repCounts[v.verse_key] || 0) >= 20);
      const sec2AyahsDone = sec2.every(v => (repCounts[v.verse_key] || 0) >= 20);
      const sec1PairsDone = sec1Pairs.length === 0 || sec1Pairs.every(p => (connectionReps[p.key] || 0) >= 10);
      const sec2PairsDone = sec2Pairs.length === 0 || sec2Pairs.every(p => (connectionReps[p.key] || 0) >= 10);
      const bridgeDone = !bridgePair || (connectionReps[bridgePair.key] || 0) >= 10;

      return [
        {
          key: `closer-${g.surahNum}-s1`,
          label: `All ${sec1.length} ayahs of section 1 together`,
          ayahs: sec1,
          ready: sec1AyahsDone && sec1PairsDone,
          surahNum: g.surahNum,
        },
        {
          key: `closer-${g.surahNum}-s2`,
          label: `All ${sec2.length} ayahs of section 2 together`,
          ayahs: sec2,
          ready: sec2AyahsDone && sec2PairsDone && bridgeDone,
          surahNum: g.surahNum,
        },
        {
          key: `closer-${g.surahNum}-page`,
          label: `All ${n} ayahs of ${surahName} together`,
          ayahs: verses,
          ready: allAyahsDone && surahPairsDone,
          surahNum: g.surahNum,
        },
      ];
    });
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
        return s === curSurah && (repCounts[v.verse_key] || 0) < 20;
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
    const allRepsDone = pageAyahs.every(v => (repCounts[v.verse_key] || 0) >= 20);
    if (allRepsDone && repsLoggedRef.current !== pageKey) {
      repsLoggedRef.current = pageKey;
      const first = pageAyahs[0], last = pageAyahs[pageAyahs.length - 1];
      const fS = first.surah_number || parseInt(first.verse_key?.split(":")[0], 10);
      const fA = parseInt(first.verse_key?.split(":")[1], 10);
      const lA = parseInt(last.verse_key?.split(":")[1], 10);
      const name = SURAH_EN[fS] || "";
      pushActivity("milestone", `Completed 20× repetition of ${name} ayat ${fA}-${lA}`);
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

          <div style={{flex:1,padding:`10px 16px ${haramainMeta?"240px":"120px"}`}}>

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
                      const w=getSessionWisdom(sid,(sid==="fajr"||sid==="dhuhr"||sid==="asr")?wisdomOffset:0); if(!w||isDone) return null;
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

                {/* Method guide — Fajr Study only (Mushaf is just reading, no reps) */}
                {currentSessionId==="fajr"&&hifzViewMode==="interactive"&&(
                  <div style={{marginBottom:10,padding:"8px 12px",borderRadius:8,background:dark?"rgba(217,177,95,0.04)":"rgba(180,140,40,0.04)",border:`1px solid ${dark?"rgba(217,177,95,0.08)":"rgba(140,100,20,0.08)"}`,fontSize:11,color:dark?"rgba(243,231,200,0.45)":"#5A4A2A",lineHeight:1.6}}>
                    <strong style={{color:dark?"#E8C76A":"#6B4F00"}}>Sheikh Al-Qasim's Method:</strong> Repeat each ayah <strong>20 times</strong>, then a connection phase appears — recite pairs together <strong>10 times</strong>, then all ayahs together <strong>10 times</strong>.
                  </div>
                )}

                {/* ── MUSHAF MODE — the full mushaf page the user is on, rendered for
                    reading. Uses pageBatch (the whole page) rather than the Study batch,
                    so the user still sees the tail of the previous surah as they read. ── */}
                {currentSessionId==="fajr"&&hifzViewMode==="mushaf"&&(()=>{
                  const pageNum = pageBatch[0]?.page_number;
                  const juzNum = pageBatch[0]?.juz_number;
                  // Page-header surah, per mushaf convention: whichever surah has the
                  // greater portion (most ayahs) on this page wins the label. Ties go
                  // to the later surah. So page 577 with a few Muddaththir ayahs +
                  // 19 Qiyāmah ayahs reads "Al-Qiyāmah"; a page with most-of-long-surah
                  // + 1-ayah-start-of-next reads the longer one.
                  // Label from the active-memorization surah (what's actually
                  // rendered), not the dominant surah on the full page. Avoids
                  // misleading the user — e.g. page 577 has more Qiyāmah ayahs
                  // but we're only showing Muddaththir's tail, so the chrome
                  // should say Al-Muddaththir not Al-Qiyāmah.
                  const leadSurahNum = activeSurahNum || batch[0]?.surah_number || 0;
                  // Hizb fractional marker derived from rub_el_hizb_number (1-240).
                  // Each hizb = 4 rubs: pos 1 = ¼, 2 = ½, 3 = ¾, 4 = hizb start.
                  // Show the marker for the first quarter that starts on this page.
                  // Uses pageBatch (full page) so the marker reflects the page, not the
                  // memorization filter.
                  const hizbLabel = (() => {
                    // Only show when a NEW rub actually starts on this page (transition
                    // from the preceding verse's rub). First verse never counts — it's
                    // a continuation from the prior page. Page 1 is the mushaf start
                    // so Hizb 1 is forced below.
                    for (let i = 1; i < pageBatch.length; i++) {
                      const v = pageBatch[i];
                      const r = v.rub_el_hizb_number;
                      if (typeof r !== "number") continue;
                      const prev = pageBatch[i - 1];
                      if (prev && prev.rub_el_hizb_number === r) continue;
                      const pos = ((r - 1) % 4) + 1;
                      const hizb = Math.ceil(r / 4);
                      if (pos === 1) return `Hizb ${hizb}`;
                      if (pos === 2) return `1/4 Hizb ${hizb}`;
                      if (pos === 3) return `1/2 Hizb ${hizb}`;
                      if (pos === 4) return `3/4 Hizb ${hizb}`;
                    }
                    if (pageNum === 1 && pageBatch[0]?.rub_el_hizb_number === 1) return "Hizb 1";
                    return null;
                  })();
                  // Mushaf mode: preserve the actual mushaf page layout but display
                  // ONLY the ayahs belonging to the active-memorization surah. On
                  // page 578 (Qiyāmah 20-40 + Insān 1-5) while memorizing Qiyāmah,
                  // only Qiyāmah 20-40 shows — Insān 1-5 is hidden because that's
                  // not today's active memorization. Page chrome still uses
                  // pageBatch for accurate page/hizb info.
                  const mushafOnly = pageBatch.filter(v=>{
                    const s=v.surah_number||parseInt(v.verse_key?.split(":")?.[0]||"0",10);
                    return activeSurahNum&&s===activeSurahNum;
                  });
                  const surahGroups=[];
                  let curGroup=null;
                  mushafOnly.forEach(v=>{
                    const sn=v.surah_number||parseInt(v.verse_key?.split(":")?.[0]||"0",10);
                    if(!curGroup||curGroup.sn!==sn){ curGroup={sn,verses:[]}; surahGroups.push(curGroup); }
                    curGroup.verses.push(v);
                  });
                  return (
                    <div style={{marginBottom:16}}>
                      {/* Subtle coaching card — remind the user to read with a qualified
                          teacher first; Study mode is for memorization. */}
                      <div style={{marginBottom:10,padding:"8px 12px",borderRadius:10,background:dark?"rgba(217,177,95,0.05)":"rgba(180,140,40,0.05)",border:`1px solid ${dark?"rgba(217,177,95,0.12)":"rgba(140,100,20,0.12)"}`,fontSize:11,color:dark?"rgba(243,231,200,0.55)":"#5A4A2A",lineHeight:1.5,textAlign:"center"}}>
                        Recite this page with a qualified teacher, then switch to <strong style={{color:dark?"#E8C76A":"#6B4F00"}}>Study</strong> for your memorization.
                      </div>
                      {!MUSHAF_INTERACTIVE&&playMushafRange&&batch.length>0&&reciter&&(
                        <div style={{textAlign:"center",marginBottom:2}}>
                          <div className="sbtn" onClick={()=>{ if(mushafAudioPlaying) stopMushafAudio&&stopMushafAudio(); else playMushafRange(batch); }}
                            style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:999,fontSize:10,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:dark?"#E8C76A":"#6B4F00",background:dark?"rgba(217,177,95,0.10)":"rgba(180,140,40,0.08)",border:`1px solid ${dark?"rgba(217,177,95,0.25)":"rgba(140,100,20,0.20)"}`}}>
                            <span style={{fontSize:10}}>{mushafAudioPlaying?"■":"▶"}</span>
                            {mushafAudioPlaying?"Stop":"Play Page"}
                          </div>
                        </div>
                      )}
                    <div style={{padding:"0 2px"}}>
                      {/* Top row: surah name (left) · Part N (right) — in-flow so the body
                          shrinks to content with no absolute-positioned reservations. */}
                      {(leadSurahNum>0||juzNum)&&(
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:dark?"#E8C76A":"#6B4F00",marginBottom:4}}>
                          <span>{leadSurahNum>0?(SURAH_EN[leadSurahNum]||""):""}</span>
                          <span>{juzNum?`Part ${juzNum}`:""}</span>
                        </div>
                      )}
                      {(()=>{
                        const pageFontReady=loadedFonts.has(fajrPageNum);
                        if(!pageFontReady){
                          return (
                            <div style={{minHeight:400,display:"flex",alignItems:"center",justifyContent:"center",color:dark?"rgba(217,177,95,0.35)":"rgba(107,100,90,0.55)",fontSize:12,letterSpacing:".08em"}}>
                              <span>loading mushaf…</span>
                            </div>
                          );
                        }
                        const pageLines=mushafPagesData&&mushafPagesData[fajrPageNum];
                        const pageLayout=mushafLayoutData&&mushafLayoutData[fajrPageNum];
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
                                <div style={{position:"relative",width:"100%",height:70,backgroundImage:"url('/surah_ornament.png')",backgroundSize:"contain",backgroundRepeat:"no-repeat",backgroundPosition:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
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
                            <div key={i} style={{direction:"rtl",display:"flex",justifyContent:isCenter?"center":"space-between",alignItems:"center",maxWidth:"min(560px,94vw)",marginInline:"auto",fontFamily:`'p${fajrPageNum}',serif`,fontSize:"clamp(18px,4.9vw,28px)",color:dark?"#E8DFC0":"#2D2A26",padding:"1px 0",whiteSpace:"nowrap",gap:isCenter?"0.25em":0}}>
                              {lineText.split(" ").map((w,wi)=>(<span key={wi}>{w}</span>))}
                            </div>
                          );
                        });
                      })()}
                      {MUSHAF_INTERACTIVE&&(
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14,paddingTop:10,borderTop:`1px solid ${dark?"rgba(217,177,95,0.08)":"rgba(0,0,0,0.06)"}`}}>
                          <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.35)":"#9A8A6A"}}>{batch.filter(v=>(repCounts[v.verse_key]||0)>=20).length} of {batch.length} complete</div>
                          <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.25)":"#9A8A6A"}}>Tap any ayah to begin</div>
                        </div>
                      )}
                      {/* Footer: hizb label + page number, alternating corners
                          (odd pages right, even pages left — mushaf spread convention). */}
                      {pageNum&&(()=>{
                        const isOdd=pageNum%2===1;
                        const text=isOdd
                          ?(hizbLabel?`${hizbLabel} | Page ${pageNum}`:`Page ${pageNum}`)
                          :(hizbLabel?`Page ${pageNum} | ${hizbLabel}`:`Page ${pageNum}`);
                        return (
                          <div style={{textAlign:isOdd?"right":"left",marginTop:32,fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:dark?"rgba(217,177,95,0.55)":"#6B645A",letterSpacing:".06em"}}>
                            {text}
                          </div>
                        );
                      })()}
                    </div>
                    </div>
                  );
                })()}

                {/* ── REVIEW MUSHAF — Dhuhr / Maghrib / Isha render their batches as
                    authentic mushaf pages, one page per swipe. Much lighter than
                    walking 20+ cards of Study view when the batch is 100+ ayahs. ── */}
                {["dhuhr","maghrib","isha"].includes(currentSessionId)&&batch.length>0&&(()=>{
                  // Group by physical mushaf page — preserve the true page layout.
                  // Boundary pages (two surahs' memorized slices on one page) render
                  // as ONE slide showing both slices in mushaf order.
                  const pageGroups=[];
                  let curGroup=null;
                  batch.forEach(v=>{
                    const pn=v.page_number||0;
                    if(!curGroup||curGroup.page!==pn){ curGroup={page:pn,ayahs:[]}; pageGroups.push(curGroup); }
                    curGroup.ayahs.push(v);
                  });
                  const totalPages=pageGroups.length;
                  const safePage=Math.min(ayahPage,Math.max(0,totalPages-1));
                  const currentPg=pageGroups[safePage];
                  if(!currentPg) return null;
                  // Dominant surah (most ayahs on this page wins).
                  const dominantSurah=(()=>{
                    const counts={}, order=[];
                    currentPg.ayahs.forEach(v=>{
                      const sn=v.surah_number||parseInt(v.verse_key.split(":")[0],10);
                      if(counts[sn]===undefined){counts[sn]=0;order.push(sn);}
                      counts[sn]++;
                    });
                    let w=order[0]||0;
                    order.forEach(sn=>{ if(counts[sn]>counts[w]||(counts[sn]===counts[w]&&order.indexOf(sn)>order.indexOf(w))) w=sn; });
                    return w;
                  })();
                  const reviewJuzNum=currentPg.ayahs[0]?.juz_number;
                  const reviewHizbLabel=(()=>{
                    for(let i=1;i<currentPg.ayahs.length;i++){
                      const v=currentPg.ayahs[i];
                      const r=v.rub_el_hizb_number;
                      if(typeof r!=="number") continue;
                      const prev=currentPg.ayahs[i-1];
                      if(prev&&prev.rub_el_hizb_number===r) continue;
                      const pos=((r-1)%4)+1;
                      const hizb=Math.ceil(r/4);
                      if(pos===1) return `Hizb ${hizb}`;
                      if(pos===2) return `1/4 Hizb ${hizb}`;
                      if(pos===3) return `1/2 Hizb ${hizb}`;
                      if(pos===4) return `3/4 Hizb ${hizb}`;
                    }
                    if(currentPg.page===1&&currentPg.ayahs[0]?.rub_el_hizb_number===1) return "Hizb 1";
                    return null;
                  })();
                  const reviewSubs=[];let sg=null;
                  currentPg.ayahs.forEach(v=>{
                    const sn=v.surah_number||parseInt(v.verse_key.split(":")[0],10);
                    if(!sg||sg.sNum!==sn){sg={sNum:sn,ayahs:[]};reviewSubs.push(sg);}
                    sg.ayahs.push(v);
                  });
                  return (
                    <div style={{marginBottom:16}}>
                      <div style={{position:"relative",padding:"32px 12px 70px"}}>
                        {dominantSurah>0&&(
                          <div style={{position:"absolute",top:0,left:8,fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:dark?"#E8C76A":"#6B4F00"}}>
                            {SURAH_EN[dominantSurah]||""}
                          </div>
                        )}
                        {reviewJuzNum&&(
                          <div style={{position:"absolute",top:0,right:8,fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:dark?"#E8C76A":"#6B4F00"}}>
                            Part {reviewJuzNum}
                          </div>
                        )}
                        {(()=>{
                          const pageNum=currentPg.page;
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
                                  <div style={{position:"relative",width:"100%",height:70,backgroundImage:"url('/surah_ornament.png')",backgroundSize:"contain",backgroundRepeat:"no-repeat",backgroundPosition:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
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
                              <div key={i} style={{direction:"rtl",display:"flex",justifyContent:isCenter?"center":"space-between",alignItems:"center",maxWidth:"min(560px,94vw)",marginInline:"auto",fontFamily:`'p${pageNum}',serif`,fontSize:"clamp(18px,4.9vw,28px)",color:dark?"#E8DFC0":"#2D2A26",padding:"1px 0",whiteSpace:"nowrap",gap:isCenter?"0.25em":0}}>
                                {lineText.split(" ").map((w,wi)=>(<span key={wi}>{w}</span>))}
                              </div>
                            );
                          });
                        })()}
                        {(()=>{
                          const isOdd=currentPg.page%2===1;
                          const text=isOdd
                            ?(reviewHizbLabel?`${reviewHizbLabel} | Page ${currentPg.page}`:`Page ${currentPg.page}`)
                            :(reviewHizbLabel?`Page ${currentPg.page} | ${reviewHizbLabel}`:`Page ${currentPg.page}`);
                          return (
                            <div style={{position:"absolute",bottom:0,[isOdd?"right":"left"]:12,fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:dark?"rgba(217,177,95,0.55)":"#6B645A",letterSpacing:".06em"}}>{text}</div>
                          );
                        })()}
                      </div>
                      {totalPages>1&&(
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px 16px",gap:8}}>
                          <div className={safePage<totalPages-1?"sbtn":""} onClick={()=>{if(safePage<totalPages-1)setAyahPage(p=>p+1);}} style={{padding:"8px 18px",borderRadius:10,fontSize:13,fontWeight:600,color:safePage<totalPages-1?(dark?"#E8C76A":"#6B4F00"):(dark?"rgba(243,231,200,0.15)":"rgba(0,0,0,0.15)"),background:safePage<totalPages-1?(dark?"rgba(217,177,95,0.08)":"rgba(180,140,40,0.06)"):"transparent",border:`1px solid ${safePage<totalPages-1?(dark?"rgba(217,177,95,0.20)":"rgba(140,100,20,0.15)"):"transparent"}`}}>‹ Next</div>
                          <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.50)":"#8B7355",fontFamily:"'IBM Plex Mono',monospace"}}>{safePage+1} of {totalPages}</div>
                          <div className={safePage>0?"sbtn":""} onClick={()=>{if(safePage>0)setAyahPage(p=>p-1);}} style={{padding:"8px 18px",borderRadius:10,fontSize:13,fontWeight:600,color:safePage>0?(dark?"#E8C76A":"#6B4F00"):(dark?"rgba(243,231,200,0.15)":"rgba(0,0,0,0.15)"),background:safePage>0?(dark?"rgba(217,177,95,0.08)":"rgba(180,140,40,0.06)"):"transparent",border:`1px solid ${safePage>0?(dark?"rgba(217,177,95,0.20)":"rgba(140,100,20,0.15)"):"transparent"}`}}>Prev ›</div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── AYAH ROWS — Fajr Study mode only (review sessions use Mushaf render above) ── */}
                {currentSessionId==="fajr"&&hifzViewMode==="interactive"&&(()=>{
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
                    // Surah separator — rendered before the first ayah of a new surah
                    // within the page window, so Mumtahanah 12-13 and Aṣ-Ṣaff 1-5 aren't
                    // treated as one continuous unit during the connection phase.
                    const prevSurah=i>0?(pageAyahs[i-1].surah_number||parseInt(pageAyahs[i-1].verse_key?.split(":")?.[0]||"0",10)):null;
                    const showSurahBreak=i>0&&prevSurah!==sNum;

                    return (
                      <Fragment key={vKey}>
                        {showSurahBreak&&(
                          <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 4px 2px"}}>
                            <div style={{flex:1,height:1,background:`linear-gradient(90deg,rgba(217,177,95,0) 0%,${dark?"rgba(232,200,120,0.30)":"rgba(140,100,20,0.25)"} 50%,rgba(217,177,95,0) 100%)`}}/>
                            <div style={{textAlign:"center"}}>
                              <div style={{fontFamily:"'surah-names',serif",fontSize:"clamp(22px,6vw,34px)",color:dark?"rgba(232,200,120,0.85)":"rgba(0,0,0,0.70)",lineHeight:1,display:"inline-flex",alignItems:"center",gap:"0.04em",direction:"rtl"}}>
                                <span>surah</span>
                                <span>{String(sNum).padStart(3,"0")}</span>
                              </div>
                            </div>
                            <div style={{flex:1,height:1,background:`linear-gradient(90deg,rgba(217,177,95,0) 0%,${dark?"rgba(232,200,120,0.30)":"rgba(140,100,20,0.25)"} 50%,rgba(217,177,95,0) 100%)`}}/>
                          </div>
                        )}
                        <div className="sbtn" onClick={()=>{setOpenAyah(vKey);fetchTranslations([v]);}}
                          style={{borderRadius:14,padding:"12px 14px",background:dark?"#0F1A2B":"#EADFC8",border:`1px solid ${repsDone?"rgba(230,184,74,0.35)":"rgba(230,184,74,0.08)"}`,boxShadow:repsDone?"0 0 14px rgba(230,184,74,0.10)":"0 2px 8px rgba(0,0,0,0.20)",transition:"all .15s"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                            <span style={{flex:1,fontSize:11,color:"#9CA3AF"}}>{SURAH_EN[sNum]} · {vKey}</span>
                            {currentSessionId==="fajr"&&<span style={{fontSize:11,color:repsDone?"#2ECC71":reps>0?"#E6B84A":dark?"rgba(255,255,255,0.25)":"rgba(0,0,0,0.25)",fontFamily:"'IBM Plex Mono',monospace"}}>{reps} of 20 Repetitions</span>}
                          </div>
                          <div style={{direction:"rtl",textAlign:"right",lineHeight:2}}>
                            <span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:fontSize,color:dark?"rgba(255,255,255,0.88)":"#2D2A26"}}>{(v.text_uthmani||"").replace(/\u06DF/g,"\u0652").trim()+"\u2060"}</span>
                            <span style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:18,color:repsDone?(dark?"#E6B84A":"#2ECC71"):(dark?"rgba(212,175,55,0.38)":"#A08848"),marginRight:4}}>﴿{toArabicDigits(parseInt(vKey.split(":")[1],10))}﴾</span>
                          </div>
                        </div>
                      </Fragment>
                    );
                  })}
                  {aPages>1&&(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginTop:8}}>
                      <div className={aSafe<aPages-1?"sbtn":""} onClick={()=>{if(aSafe<aPages-1)setAyahPage(p=>Math.min(aPages-1,p+1));}} style={{padding:"8px 18px",borderRadius:10,fontSize:13,fontWeight:600,color:aSafe<aPages-1?(dark?"#E6B84A":"#6B4F00"):(dark?"rgba(243,231,200,0.15)":"rgba(0,0,0,0.15)"),background:aSafe<aPages-1?(dark?"rgba(217,177,95,0.08)":"rgba(180,140,40,0.06)"):"transparent",border:`1px solid ${aSafe<aPages-1?(dark?"rgba(217,177,95,0.20)":"rgba(140,100,20,0.15)"):"transparent"}`}}>‹ Next</div>
                      <div style={{fontSize:10,color:dark?"rgba(230,184,74,0.50)":"#8B6A10",fontFamily:"'IBM Plex Mono',monospace"}}>Page {aSafe+1} of {aPages}</div>
                      <div className={aSafe>0?"sbtn":""} onClick={()=>{if(aSafe>0)setAyahPage(p=>Math.max(0,p-1));}} style={{padding:"8px 18px",borderRadius:10,fontSize:13,fontWeight:600,color:aSafe>0?(dark?"#E6B84A":"#6B4F00"):(dark?"rgba(243,231,200,0.15)":"rgba(0,0,0,0.15)"),background:aSafe>0?(dark?"rgba(217,177,95,0.08)":"rgba(180,140,40,0.06)"):"transparent",border:`1px solid ${aSafe>0?(dark?"rgba(217,177,95,0.20)":"rgba(140,100,20,0.15)"):"transparent"}`}}>Prev ›</div>
                    </div>
                  )}
                </div>);})()}

                {/* ── PAIR MODAL (الربط) — pops the moment a pair unlocks. Auto-closes as
                    soon as every pair in flight is at 10/10. The × is only for leaving
                    the session early; it re-opens when the next pair unlocks. ── */}
                {showPairModal&&(
                  <div onClick={()=>setPairModalDismissed(true)} style={{position:"fixed",inset:0,zIndex:250,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",background:"rgba(0,0,0,0.72)",backdropFilter:"blur(6px)"}}>
                    <div className="fi" onClick={e=>e.stopPropagation()} style={{position:"relative",maxWidth:460,width:"100%",maxHeight:"85vh",overflowY:"auto",scrollBehavior:"smooth",borderRadius:20,padding:"24px 20px 20px",background:dark?"linear-gradient(180deg,rgba(15,26,43,0.98) 0%,rgba(10,17,32,0.99) 100%),radial-gradient(circle at 50% 0%,rgba(212,175,55,0.08),transparent 60%)":"#EADFC8",border:`1px solid ${dark?"rgba(217,177,95,0.25)":"rgba(140,100,20,0.25)"}`,boxShadow:"0 24px 60px rgba(0,0,0,0.55),0 0 30px rgba(212,175,55,0.08)"}}>
                      <div className="sbtn" onClick={()=>setPairModalDismissed(true)} style={{position:"absolute",top:12,right:16,fontSize:22,lineHeight:1,color:dark?"rgba(243,231,200,0.35)":"rgba(45,42,38,0.40)"}}>×</div>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingRight:18}}>
                        <div style={{fontSize:20}}>🔗</div>
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:dark?"#E8C76A":"#6B4F00"}}>Connection Phase (الربط)</div>
                          <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.50)":"rgba(100,70,10,0.60)",marginTop:2,lineHeight:1.4}}>Recite each pair 10 times to link them together, while they are fresh.</div>
                        </div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {[...connVisiblePairs].reverse().map((step,idx)=>{
                          const cr=connectionReps[step.key]||0;
                          const crDone=cr>=10;
                          const pct=Math.min((cr/10)*100,100);
                          return (
                            <div key={step.key} ref={idx===0?newestPairRef:null} className="sbtn" onClick={()=>setConnectionReps(prev=>({...prev,[step.key]:Math.min(10,(prev[step.key]||0)+1)}))}
                              style={{padding:"12px 14px",borderRadius:12,cursor:"pointer",userSelect:"none",background:dark?(crDone?"rgba(74,222,128,0.08)":"rgba(255,255,255,0.03)"):(crDone?"rgba(74,222,128,0.08)":"rgba(0,0,0,0.03)"),border:`1px solid ${crDone?(dark?"rgba(74,222,128,0.30)":"rgba(46,204,113,0.35)"):(dark?"rgba(217,177,95,0.18)":"rgba(0,0,0,0.10)")}`,transition:"all .15s"}}>
                              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                                <div style={{fontSize:12,fontWeight:600,color:crDone?(dark?"#4ADE80":"#2ECC71"):(dark?"rgba(243,231,200,0.75)":"#3D2E0A")}}>{step.label}</div>
                                <div style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",color:crDone?"#4ADE80":"rgba(230,184,74,0.65)"}}>{cr}/10</div>
                              </div>
                              <div style={{direction:"rtl",textAlign:"right",lineHeight:2}}>
                                {step.ayahs.map((a,ai)=>(
                                  <span key={a.verse_key}><span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:22,color:dark?"rgba(243,231,200,0.80)":"rgba(40,30,10,0.80)"}}>{(a.text_uthmani||"").replace(/\u06DF/g,"\u0652")}</span>{ai<step.ayahs.length-1&&<span style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:14,color:dark?"rgba(212,175,55,0.35)":"rgba(140,100,20,0.35)",margin:"0 4px"}}>﴿{toArabicDigits(parseInt(a.verse_key.split(":")[1],10))}﴾</span>}</span>
                                ))}
                              </div>
                              <div style={{height:3,marginTop:8,borderRadius:999,background:dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)",overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${pct}%`,background:crDone?"#4ADE80":"linear-gradient(90deg,#E6B84A,#F0C040)",borderRadius:999,transition:"width .3s"}}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── SURAH CLOSER MODAL — takes over the screen the moment a surah is ready
                    for its "all N ayahs together × 10" closer. Auto-closes on 10/10. The ×
                    is only for early exit. ── */}
                {showCloserModal&&activeCloser&&(()=>{
                  const cr=connectionReps[activeCloser.key]||0;
                  const pct=Math.min((cr/10)*100,100);
                  return (
                  <div onClick={()=>setCloserModalDismissed(true)} style={{position:"fixed",inset:0,zIndex:260,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",background:"rgba(0,0,0,0.78)",backdropFilter:"blur(8px)"}}>
                    <div className="fi" onClick={e=>e.stopPropagation()} style={{position:"relative",maxWidth:520,width:"100%",maxHeight:"88vh",overflowY:"auto",borderRadius:22,padding:"28px 22px 22px",background:dark?"radial-gradient(circle at 50% 0%,rgba(212,175,55,0.14),rgba(0,0,0,0) 55%),linear-gradient(180deg,rgba(15,26,43,0.99) 0%,rgba(10,17,32,1) 100%)":"#EADFC8",border:`1px solid ${dark?"rgba(217,177,95,0.35)":"rgba(140,100,20,0.30)"}`,boxShadow:"0 30px 70px rgba(0,0,0,0.60),0 0 40px rgba(212,175,55,0.15)"}}>
                      <div className="sbtn" onClick={()=>setCloserModalDismissed(true)} style={{position:"absolute",top:12,right:16,fontSize:22,lineHeight:1,color:dark?"rgba(243,231,200,0.35)":"rgba(45,42,38,0.40)"}}>×</div>
                      <div style={{textAlign:"center",marginBottom:18,paddingTop:4}}>
                        <div style={{fontSize:10,letterSpacing:".22em",textTransform:"uppercase",fontWeight:700,color:dark?"rgba(217,177,95,0.75)":"rgba(140,100,20,0.70)",marginBottom:6}}>Surah Closer (الربط)</div>
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:dark?"#F3E7BF":"#3D2E0A",lineHeight:1.3}}>{activeCloser.label}</div>
                        <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.50)":"rgba(100,70,10,0.65)",marginTop:6,lineHeight:1.5}}>Recite all ayahs together 10 times to seal the surah in memory.</div>
                      </div>
                      <div className="sbtn" onClick={()=>setConnectionReps(prev=>({...prev,[activeCloser.key]:Math.min(10,(prev[activeCloser.key]||0)+1)}))}
                        style={{padding:"16px 16px 18px",borderRadius:14,cursor:"pointer",transition:"all .2s",background:dark?"rgba(212,175,55,0.06)":"rgba(212,175,55,0.06)",border:`1.5px solid ${dark?"rgba(212,175,55,0.35)":"rgba(140,100,20,0.30)"}`,boxShadow:"0 0 14px rgba(212,175,55,0.12),0 4px 14px rgba(0,0,0,0.18)"}}>
                        <div style={{direction:"rtl",textAlign:"justify",textAlignLast:"center",lineHeight:2,marginBottom:12}}>
                          {activeCloser.ayahs.map(a=>(
                            <span key={a.verse_key}>
                              <span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:22,color:dark?"rgba(243,231,200,0.90)":"rgba(40,30,10,0.90)"}}>{(a.text_uthmani||"").replace(/\u06DF/g,"\u0652")}</span>
                              <span style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:14,color:dark?"rgba(212,175,55,0.40)":"rgba(140,100,20,0.40)",margin:"0 4px"}}>﴿{toArabicDigits(parseInt(a.verse_key.split(":")[1],10))}﴾</span>
                            </span>
                          ))}
                        </div>
                        <div style={{fontSize:13,fontWeight:700,color:dark?"rgba(243,231,200,0.80)":"#3D2E0A",marginBottom:8,textAlign:"center"}}>Recited <span style={{color:"#F0C040",fontSize:16}}>{cr}/10</span> · Tap to count</div>
                        <div style={{width:"100%",height:6,borderRadius:999,background:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)",overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,borderRadius:999,background:"linear-gradient(90deg,#E6B84A,#F0C040)",transition:"width .35s cubic-bezier(.4,0,.2,1)"}}/>
                        </div>
                      </div>
                    </div>
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
                        {/* Rep counter — only in Fajr (new memorization). Review sessions
                            show translation + audio only; no rep taps to avoid confusing
                            users into thinking reviews involve 20× repetition. */}
                        {currentSessionId==="fajr"&&(
                          <div className={mvRepsDone?"rep-done-glow":""} onClick={()=>{setRepCounts(prev=>{const newCount=Math.min(20,(prev[mvKey]||0)+1);if(newCount>=20&&!completedAyahs.has(mvKey)){setCompletedAyahs(ca=>{const next=new Set(ca);next.add(mvKey);saveCompletedAyahs(next);return next;});}if(newCount>=20){setTimeout(()=>setOpenAyah(null),450);}return{...prev,[mvKey]:newCount};});}}
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
                        )}
                        {currentSessionId==="fajr"&&mvReps>0&&<div className="sbtn" onClick={()=>setRepCounts(prev=>({...prev,[mvKey]:0}))} style={{textAlign:"center",fontSize:10,color:"rgba(255,255,255,0.2)",marginTop:8}}>Restart</div>}
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
                  const batchPages=isMushafFajr?1
                    :isReviewMushaf?Math.max(1,new Set(batch.map(v=>v.page_number||0).filter(Boolean)).size)
                    :Math.max(1,Math.ceil(batch.length/7));
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
                    // On last page — complete the session. In Mushaf Fajr, add the entire page's ayahs.
                    {const slice=isMushafFajr?batch:batch.slice(ayahPage*7,Math.min(ayahPage*7+7,batch.length));
                    setCompletedAyahs(prev=>{const next=new Set(prev);slice.forEach(v=>{if(v.verse_key)next.add(v.verse_key);});saveCompletedAyahs(next);return next;});}
                    const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];
                    setSessionsCompleted(prev=>({...prev,[sess.id]:true}));
                    toggleCheck(sess.id);
                    setRepCounts({});setConnectionReps({});
                    setOpenAyah(null);
                    setAyahPage(0);
                    if(activeSessionIndex>=SESSIONS.length-1){
                      // How much did we actually memorize today? In the page-based model,
                      // it's the filtered page batch (new surahs only), not the old
                      // dailyNew-driven fajrBatch. Fall back to fajrBatch.length if the
                      // page fetch never completed.
                      const fajrPageForAdvance = fajrBatch[0]?.page_number;
                      const fajrPageVs = fajrPageForAdvance ? fajrPageVerses[fajrPageForAdvance] : null;
                      const fajrMemorized = fajrPageVs && fajrPageVs.length ? filterActivePlusFresh(fajrPageVs) : fajrBatch;
                      const fajrAdvance = fajrMemorized.length || fajrBatch.length;
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
                      // Start each new day on Fajr Mushaf (read with teacher first)
                      setHifzViewMode("mushaf");
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
