import { SURAH_EN, RECITERS } from "../data/constants";
import AyahDrawer from "../components/AyahDrawer";
import InlineTafsirView from "../components/InlineTafsirView";
import PageTranslationView from "../components/PageTranslationView";
import PageTafsirView from "../components/PageTafsirView";
import QuranHeader from "../components/QuranHeader";
import QuranSideMenu from "../components/QuranSideMenu";
import QuranSettingsSheet from "../components/QuranSettingsSheet";

// Per-page glyph fonts (p1-v2.woff2 ... p604-v2.woff2) have inconsistent
// hhea metrics. The 16 pages below ship with ascent/descent 2809/-1301
// (vertical span 4110) instead of the standard 3000/-1500 (span 4500),
// rendering ~9% shorter per line — visible as a bottom gap when stacked
// 15 lines high. Force lineHeight: 1.095 on these pages to compensate
// (4500/4110 = 1.0949). Identified by fontTools scan of all 604 fonts.
const SHORT_METRIC_PAGES = new Set([
  46, 55, 57, 76, 83, 100, 101, 161, 175, 242, 245, 246, 379, 590,
]);
import { SURAH_AR, JUZ_META } from "../data/quran-metadata";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { hizbLabel } from "../utils";
import { loadQulSegments } from "../hooks/useAudio";
import { useMushafData } from "../hooks/useMushafData";
import { useBismillah } from "../hooks/useBismillah";

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
    quranMode,
    setQuranMode,
    mushafPage,
    setMushafPage,
    mushafSwipeAnim,
    setMushafSwipeAnim,
    mushafAudioPlaying,
    mushafLoading,
    mushafVerses,
    selectedAyah,
    setSelectedAyah,
    drawerView,
    setDrawerView,
    translations,
    fetchTranslations,
    translationSource,
    setTranslationSource,
    mushafBookmarks,
    setMushafBookmarks,
    playingKey,
    setPlayingKey,
    quranReciter,
    fontSize,
    tafsirData,
    tafsirTab,
    setTafsirTab,
    setTafsirAyah,
    fetchTafsir,
    reflections,
    setReflections,
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
  // Keyboard arrow nav — desktop equivalent of mobile swipe. Ignores
  // input fields so it doesn't hijack typing in the surah picker etc.
  useEffect(() => {
    const onKey = (e) => {
      if (
        e.target &&
        (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
      )
        return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setMushafPage((p) => Math.max(1, p - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setMushafPage((p) => Math.min(604, p + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setMushafPage]);
  // Tajweed (V4) coloring is disabled. The V4 font/layout/palette scaffolding
  // was removed in cleanup; this flag stays false so the few remaining
  // tajweedFont ? "v4" : "v2" expressions in the renderer fold to "v2".
  // To restore tajweed, reintroduce V4 font + layout loading and flip this.
  const tajweedFont = false;
  const loadQcfFont = (pageN) => {
    if (!pageN || pageN < 1 || pageN > 604) return;
    // KFGQPC V2 per-page font from the quran.com CDN. ID includes the family
    // name to avoid collision with other consumers (MyHifz, Asr, Memorization).
    const family = `p${pageN}-v2`;
    const elId = `qcf-font-${family}`;
    if (!document.getElementById(elId)) {
      const style = document.createElement("style");
      style.id = elId;
      const src = `url('https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v2/woff2/p${pageN}.woff2') format('woff2'),url('https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v2/woff/p${pageN}.woff') format('woff')`;
      style.textContent = `@font-face{font-family:'${family}';src:${src};font-display:block;}`;
      document.head.appendChild(style);
    }
    const key = `v2-${pageN}`;
    if (loadedFonts.has(key)) return;
    if (document.fonts && document.fonts.load) {
      document.fonts
        .load(`16px '${family}'`)
        .then(() => {
          setLoadedFonts((prev) => {
            const n = new Set(prev);
            n.add(key);
            return n;
          });
        })
        .catch(() => {});
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
  const { mushafPagesData, mushafLayoutData, verseToPageMap } = useMushafData({
    withVerseToPage: true,
  });
  // Invert verse->page into page->[{sNum,minA,maxA}] so bookmark pages can list
  // their surahs + ayah ranges. (Was an inline fetch + setPageContentMap.)
  const pageContentMap = useMemo(() => {
    if (!verseToPageMap) return null;
    const inv = {};
    Object.entries(verseToPageMap).forEach(([vk, pg]) => {
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
    return out;
  }, [verseToPageMap]);
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
          const r = await fetch(
            `https://api.quran.com/api/v4/verses/by_chapter/${s.sNum}?words=false&fields=text_uthmani,verse_key&per_page=300`,
          );
          if (!r.ok) continue;
          const d = await r.json();
          if (cancelled) return;
          const filtered = (d.verses || []).filter((v) => {
            const a = parseInt(v.verse_key.split(":")[1], 10);
            return a >= s.minA && a <= s.maxA;
          });
          all.push(...filtered);
        } catch {}
      }
      if (!cancelled) setPageVerses(all);
    })();
    return () => {
      cancelled = true;
    };
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
            const r = await fetch(
              `https://api.quran.com/api/v4/quran/verses/code_v2?chapter_number=${s.sNum}`,
            );
            if (!r.ok) continue;
            const d = await r.json();
            verses = d.verses || [];
            codeV2CacheRef.current[s.sNum] = verses;
          }
          if (cancelled) return;
          verses
            .filter((v) => {
              const a = parseInt(v.verse_key.split(":")[1], 10);
              return a >= s.minA && a <= s.maxA;
            })
            .forEach((v) => {
              (v.code_v2 || "")
                .split(" ")
                .forEach(() => flat.push(v.verse_key));
            });
        } catch {}
      }
      if (!cancelled) setGlyphVerseKeys(flat);
    })();
    return () => {
      cancelled = true;
    };
  }, [mushafPage, pageContentMap]);

  // Prefetch tafsir for every verse on the page when entering the page-tafsir view.
  useEffect(() => {
    if (drawerView !== "tafsir-page") return;
    (pageVerses || []).forEach((v) => {
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
    const [sn, a] = selectedAyah.split(":").map(Number);
    const onPage = surahsOnPage.some(
      (s) => sn === s.sNum && a >= s.minA && a <= s.maxA,
    );
    if (!onPage) setSelectedAyah(null);
  }, [mushafPage, pageContentMap]);

  // Fetch Fatihah verse 1:1 (the universal bismillah) once. We render
  // every surah-opener bismillah using THESE exact glyphs + the p1 font,
  // so the style is identical to what you see on page 1 of the mushaf.
  const bismillahGlyphs = useBismillah(loadQcfFont);

  // Track the rub_el_hizb_number of the LAST verse on the previous page so we
  // can detect when a new rub starts at the very first verse of the current
  // page (otherwise our transition-within-page check misses boundary pages).
  const [prevPageLastRub, setPrevPageLastRub] = useState({});
  useEffect(() => {
    if (mushafPage <= 1 || prevPageLastRub[mushafPage] !== undefined) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_page/${mushafPage - 1}?fields=rub_el_hizb_number&per_page=50`,
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const last = data.verses?.[data.verses.length - 1]?.rub_el_hizb_number;
        if (!cancelled)
          setPrevPageLastRub((p) => ({ ...p, [mushafPage]: last ?? null }));
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [mushafPage]);

  // Header surah priority:
  //   1. If a surah header (ornament) is on this page, that's the surah the
  //      page "introduces" — matches the surah picker which jumps to the page
  //      where a surah's header lives.
  //   2. Otherwise, fall back to the first verse actually visible on the page.
  //   3. Last resort: the user's last picked surah.
  const surahHeaderOnPage = (mushafLayoutData?.[mushafPage] || []).find(
    (e) => e.type === "surah_name",
  )?.sn;
  const firstVerseOnPage = (mushafVerses || [])[0]?.verse_key;
  const curSurahNum = surahHeaderOnPage
    ? surahHeaderOnPage
    : firstVerseOnPage
      ? parseInt(firstVerseOnPage.split(":")[0], 10)
      : mushafSurahNum;
  const curSurahPage = SURAH_PAGES[curSurahNum] || 1;
  const [showPickers, setShowPickers] = useState(false);
  const [showQuranSettings, setShowQuranSettings] = useState(false);
  const parchment = dark
    ? "linear-gradient(180deg,#0B1220,#0E1628)"
    : "#F3E9D2";
  const goldColor = "#E8D5A3";
  const inkColor = "#E8D5A3";

  // Play a single ayah: qulSlug reciters seek+clip the surah file to the
  // ayah's [from,to]; everyayah reciters stream the per-ayah mp3. Shared by
  // the reading viewer and the ayah drawer.
  const playAyahAudio = async (vk) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingKey(null);
    }
    const [s, a] = vk.split(":");
    const rObj = RECITERS.find((r) => r.id === quranReciter);
    if (rObj?.qulSlug) {
      try {
        const data = await loadQulSegments(rObj.qulSlug);
        const t = data.verses[vk];
        if (t) {
          const url = `${data.audio_base}${String(s).padStart(3, "0")}.mp3`;
          const au = new Audio(url);
          audioRef.current = au;
          const startMs = t[0],
            endMs = t[1];
          au.onloadedmetadata = () => {
            try {
              au.currentTime = startMs / 1000;
            } catch {}
            au.play();
          };
          au.ontimeupdate = () => {
            if (au.currentTime * 1000 >= endMs) {
              try {
                au.pause();
              } catch {}
              setPlayingKey(null);
            }
          };
          setPlayingKey(vk);
          return;
        }
      } catch {}
    }
    const folder = getEveryayahFolder(quranReciter);
    if (!folder) return;
    const url = `https://everyayah.com/data/${folder}/${String(s).padStart(3, "0")}${String(a).padStart(3, "0")}.mp3`;
    const au = new Audio(url);
    audioRef.current = au;
    setPlayingKey(vk);
    au.play();
    au.onended = () => setPlayingKey(null);
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: parchment,
      }}
    >
      {/* Header — sticky so it's always visible regardless of scroll. */}
      <QuranHeader dark={dark} setShowPickers={setShowPickers} curSurahNum={curSurahNum} mushafJuzNum={mushafJuzNum} />

      {/* ── SIDE MENU ── slides in from the left, partial width */}
      {showPickers && (
        <QuranSideMenu dark={dark} setShowPickers={setShowPickers} setShowQuranSurahModal={setShowQuranSurahModal} setDrawerView={setDrawerView} setReciterMode={setReciterMode} setShowReciterModal={setShowReciterModal} setActiveTab={setActiveTab} setRihlahTab={setRihlahTab} setShowQuranSettings={setShowQuranSettings} />
      )}

      {/* ── QURAN SETTINGS SHEET ── */}
      {showQuranSettings && (
        <QuranSettingsSheet dark={dark} setShowQuranSettings={setShowQuranSettings} setDark={setDark} translationSource={translationSource} setTranslationSource={setTranslationSource} tafsirTab={tafsirTab} setTafsirTab={setTafsirTab} TAFSIR_SOURCES={TAFSIR_SOURCES} />
      )}

      {/* Inline Tafsir — replaces the viewer when active, keeps header pickers visible */}
      {drawerView === "tafsir" && selectedAyah && (
        <InlineTafsirView selectedAyah={selectedAyah} setSelectedAyah={setSelectedAyah} mushafVerses={mushafVerses} translations={translations} dark={dark} setDrawerView={setDrawerView} setShowPickers={setShowPickers} fontSize={fontSize} TAFSIR_SOURCES={TAFSIR_SOURCES} tafsirTab={tafsirTab} setTafsirTab={setTafsirTab} fetchTafsir={fetchTafsir} tafsirData={tafsirData} parseTafsirBlocks={parseTafsirBlocks} />
      )}

      {/* Page Translation — full-page list of every ayah on the current mushaf page with its translation */}
      {drawerView === "translation" && (
        <PageTranslationView translationSource={translationSource} dark={dark} setDrawerView={setDrawerView} setShowPickers={setShowPickers} mushafPage={mushafPage} pageVerses={pageVerses} translations={translations} fontSize={fontSize} />
      )}

      {/* Page Tafsir — full-page list of every ayah on the current mushaf page with its tafsir */}
      {drawerView === "tafsir-page" && (
        <PageTafsirView TAFSIR_SOURCES={TAFSIR_SOURCES} tafsirTab={tafsirTab} dark={dark} setDrawerView={setDrawerView} setShowPickers={setShowPickers} mushafPage={mushafPage} pageVerses={pageVerses} tafsirData={tafsirData} fontSize={fontSize} parseTafsirBlocks={parseTafsirBlocks} />
      )}

      {/* Viewer — single mode (formerly Study). The standalone "Mushaf"
              mode and its mode toggle were removed 2026-04-28; once Study
              adopted the framed-page layout the two were visually identical. */}
      {drawerView !== "tafsir" &&
        drawerView !== "translation" &&
        drawerView !== "tafsir-page" && (
          <div
            onTouchStart={(e) => {
              quranTouchRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
              };
            }}
            onTouchEnd={(e) => {
              const start = quranTouchRef.current;
              if (!start || typeof start !== "object") return;
              const dx = e.changedTouches[0].clientX - start.x;
              const dy = e.changedTouches[0].clientY - start.y;
              // Only treat as a page swipe if horizontal movement clearly
              // dominates — otherwise this was a vertical scroll.
              if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
              if (dx < 0) {
                setMushafSwipeAnim("left");
                setMushafPage((p) => Math.max(1, p - 1));
              } else {
                setMushafSwipeAnim("right");
                setMushafPage((p) => Math.min(604, p + 1));
              }
            }}
            style={{
              position: "relative",
              flex: 1,
              overflowY: "auto",
              scrollbarGutter: "stable both-edges",
              background: dark
                ? "linear-gradient(180deg,#0B1220,#0E1628)"
                : "#F3E9D2",
              padding: `4px 0 ${haramainMeta ? "120px" : "60px"}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* ── CONTINUOUS READING SURFACE ── */}
            {mushafLoading ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 60,
                  color: "rgba(232,213,163,0.25)",
                  fontSize: 11,
                  letterSpacing: ".12em",
                }}
              >
                Loading...
              </div>
            ) : (
              <div
                style={{
                  padding: 0,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                {(() => {
                  // Group verses by surah for proper header centering
                  const surahGroups = [];
                  let cg = null;
                  (mushafVerses || []).forEach((verse) => {
                    const sn = parseInt(verse.verse_key.split(":")[0], 10);
                    if (!cg || cg.sn !== sn) {
                      cg = { sn, verses: [] };
                      surahGroups.push(cg);
                    }
                    cg.verses.push(verse);
                  });
                  // Render ONCE per page directly from the authoritative
                  // mushaf layout. Each page gives us its 15 line strings
                  // plus per-line alignment (center vs space-between).
                  return (
                    <div
                      style={{
                        padding: "24px 0 8px",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        marginTop: "auto",
                        marginBottom: "auto",
                      }}
                    >
                      {(() => {
                        const fontEd = tajweedFont ? "v4" : "v2";
                        const pageFontReady = loadedFonts.has(
                          `${fontEd}-${mushafPage}`,
                        );
                        if (!pageFontReady) {
                          return (
                            <div
                              style={{
                                minHeight: 400,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: dark
                                  ? "rgba(217,177,95,0.35)"
                                  : "rgba(107,100,90,0.55)",
                                fontSize: 12,
                                letterSpacing: ".08em",
                              }}
                            >
                              <span>loading mushaf…</span>
                            </div>
                          );
                        }
                        const pageLines =
                          mushafPagesData && mushafPagesData[mushafPage];
                        const pageLayout =
                          mushafLayoutData && mushafLayoutData[mushafPage];
                        if (!pageLines || !pageLayout) {
                          return null;
                        }
                        // Tap mapping uses glyphVerseKeys — a flat per-glyph
                        // verse_key array we built from code_v2 against our
                        // pageContentMap. Independent of the API's mushaf
                        // edition (which differs from KFGQPC v2 on some
                        // pages), so taps land on the right ayah everywhere.
                        let glyphCursor = 0;
                        let ayahIdx = -1;
                        const entries = pageLayout.map((layoutEntry, i) => {
                          const type = layoutEntry.type;
                          let lineText = "";
                          if (type !== "surah_name" && type !== "basmallah") {
                            ayahIdx++;
                            lineText = pageLines[ayahIdx] || "";
                          }
                          const isCenter = layoutEntry.center === 1;
                          // Surah name line: render our custom ornament
                          // instead of the font's surah_name glyph so it
                          // matches our app's ornament aesthetic.
                          if (type === "surah_name") {
                            const sn = layoutEntry.sn;
                            return (
                              <div
                                key={i}
                                style={{
                                  textAlign: "center",
                                  padding: "2px 0",
                                  flexShrink: 0,
                                }}
                              >
                                <div
                                  style={{
                                    position: "relative",
                                    width: "100%",
                                    height: 68,
                                    backgroundImage:
                                      "url('/surah_ornament.png')",
                                    backgroundSize: "contain",
                                    backgroundRepeat: "no-repeat",
                                    backgroundPosition: "center",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: "'surah-names',serif",
                                      fontSize: "clamp(24px,6.5vw,38px)",
                                      color: dark
                                        ? "rgba(232,200,120,0.85)"
                                        : "rgba(0,0,0,0.70)",
                                      lineHeight: 1,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.04em",
                                      direction: "rtl",
                                    }}
                                  >
                                    <span>surah</span>
                                    <span>{String(sn).padStart(3, "0")}</span>
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          // Basmallah: use p1 font + Fatihah 1:1 glyphs so
                          // every surah opener reads the same universal
                          // bismillah.
                          if (type === "basmallah") {
                            return (
                              <div
                                key={i}
                                style={{
                                  textAlign: "center",
                                  padding: "1px 0",
                                  flexShrink: 0,
                                }}
                              >
                                {bismillahGlyphs &&
                                loadedFonts.has(
                                  `${tajweedFont ? "v4" : "v2"}-1`,
                                ) ? (
                                  <div
                                    style={{
                                      fontFamily: `'p1-${tajweedFont ? "v4" : "v2"}',serif`,
                                      fontSize: "clamp(20px,5vw,29px)",
                                      color: dark
                                        ? "rgba(232,200,120,0.85)"
                                        : "rgba(0,0,0,0.70)",
                                      direction: "rtl",
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {bismillahGlyphs}
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      fontFamily: "'Amiri Quran','Amiri',serif",
                                      fontSize: 18,
                                      color: dark
                                        ? "rgba(232,200,120,0.65)"
                                        : "rgba(0,0,0,0.50)",
                                      direction: "rtl",
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِيمِ
                                  </div>
                                )}
                              </div>
                            );
                          }
                          const tokens = lineText.split(" ");
                          // glyphVerseKeys is one entry per individual PUA glyph,
                          // but a pages.json token can contain 2+ glyphs (e.g. an
                          // end-of-ayah marker fused to the previous letter:
                          // "ﱜﱝ"). Walk by glyph count, not token count, so the
                          // cursor stays aligned with the flat array.
                          const tokenStartGlyph = [];
                          let rowGlyphs = 0;
                          tokens.forEach((t) => {
                            tokenStartGlyph.push(rowGlyphs);
                            rowGlyphs += t.length;
                          });
                          const rowStart = glyphCursor;
                          glyphCursor += rowGlyphs;
                          const pickAyah = (vk) => {
                            setSelectedAyah(vk);
                            setDrawerView("default");
                            setTimeout(() => {
                              try {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                                document
                                  .querySelectorAll('[class*="fi"]')
                                  .forEach((el) => {
                                    if (el.scrollTop > 0)
                                      el.scrollTo({
                                        top: 0,
                                        behavior: "smooth",
                                      });
                                  });
                              } catch {}
                            }, 10);
                          };
                          return (
                            <div
                              key={i}
                              style={{
                                direction: "rtl",
                                display: "flex",
                                justifyContent: isCenter
                                  ? "center"
                                  : "space-between",
                                alignItems: "baseline",
                                maxWidth: "min(720px,99vw)",
                                marginInline: "auto",
                                fontFamily: `'p${mushafPage}-${fontEd}',serif`,
                                fontSize: "clamp(22px,5.5vw,32px)",
                                lineHeight: SHORT_METRIC_PAGES.has(mushafPage)
                                  ? 1.095
                                  : undefined,
                                color: dark ? "#E8DFC0" : "#2D2A26",
                                padding: "2px 0",
                                whiteSpace: "nowrap",
                                gap: isCenter ? "0.25em" : "0.10em",
                                fontPalette:
                                  dark && fontEd === "v4"
                                    ? `--dark-p${mushafPage}-v4`
                                    : undefined,
                              }}
                            >
                              {tokens.map((w, wi) => {
                                const vk =
                                  glyphVerseKeys[
                                    rowStart + tokenStartGlyph[wi]
                                  ] || glyphVerseKeys[rowStart + rowGlyphs - 1];
                                return (
                                  <span
                                    key={wi}
                                    className={vk ? "sbtn" : undefined}
                                    onClick={
                                      vk ? () => pickAyah(vk) : undefined
                                    }
                                    style={{
                                      cursor: vk ? "pointer" : "default",
                                    }}
                                  >
                                    {w}
                                  </span>
                                );
                              })}
                            </div>
                          );
                        });
                        return entries;
                      })()}
                    </div>
                  );
                })()}
                {/* Bottom corner marker — page number + Hizb label, paired.
                      Alternates right (odd page) / left (even page) like a real
                      mushaf spread. */}
                {(() => {
                  const rubs = [];
                  (mushafVerses || []).forEach((v, i) => {
                    const r = v.rub_el_hizb_number;
                    if (typeof r !== "number") return;
                    const prevRub =
                      i === 0
                        ? prevPageLastRub[mushafPage]
                        : mushafVerses[i - 1]?.rub_el_hizb_number;
                    if (prevRub === undefined || prevRub === r) return;
                    rubs.push(r);
                  });
                  if (
                    mushafPage === 1 &&
                    rubs.length === 0 &&
                    mushafVerses?.[0]?.rub_el_hizb_number === 1
                  ) {
                    rubs.push(1);
                  }
                  const r = rubs[0];
                  const marker = hizbLabel(r);
                  const isOdd = mushafPage % 2 === 1;
                  const text = isOdd
                    ? marker
                      ? `${marker} | Page ${mushafPage}`
                      : `Page ${mushafPage}`
                    : marker
                      ? `Page ${mushafPage} | ${marker}`
                      : `Page ${mushafPage}`;
                  return (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: isOdd ? "flex-end" : "flex-start",
                        padding: "12px 20px 16px",
                        fontFamily: "'IBM Plex Mono',monospace",
                        fontSize: 12,
                        color: dark ? "rgba(217,177,95,0.60)" : "#6B645A",
                        letterSpacing: ".06em",
                      }}
                    >
                      {text}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── UNIFIED 50% DRAWER ── (skip for tafsir — renders inline above) */}
            {(selectedAyah || drawerView === "bookmarks") &&
              drawerView !== "tafsir" &&
              drawerView !== "translation" &&
              drawerView !== "tafsir-page" && (
                <AyahDrawer audioRef={audioRef} dark={dark} drawerView={drawerView} setDrawerView={setDrawerView} fetchTafsir={fetchTafsir} fetchTranslations={fetchTranslations} fontSize={fontSize} mushafAudioPlaying={mushafAudioPlaying} mushafBookmarks={mushafBookmarks} setMushafBookmarks={setMushafBookmarks} mushafPage={mushafPage} setMushafPage={setMushafPage} mushafVerses={mushafVerses} pageContentMap={pageContentMap} parseTafsirBlocks={parseTafsirBlocks} playAyahAudio={playAyahAudio} playingKey={playingKey} setPlayingKey={setPlayingKey} reflections={reflections} setReflections={setReflections} selectedAyah={selectedAyah} setSelectedAyah={setSelectedAyah} setMushafRangeEnd={setMushafRangeEnd} setMushafRangeStart={setMushafRangeStart} setShowMushafRangePicker={setShowMushafRangePicker} setShowPickers={setShowPickers} showPickers={showPickers} setTafsirTab={setTafsirTab} stopMushafAudio={stopMushafAudio} tafsirData={tafsirData} tafsirTab={tafsirTab} translations={translations} tajweedFont={tajweedFont} TAFSIR_SOURCES={TAFSIR_SOURCES} SURAH_PAGES={SURAH_PAGES} />
              )}
          </div>
        )}
    </div>
  );
}
