import { SURAH_EN, RECITERS } from "../data/constants";
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
import React, { useState, useEffect, useRef } from "react";
import { toArabicDigits, hizbLabel } from "../utils";
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
  const [pagesV2, setPagesV2] = useState(null);
  const [layoutV2, setLayoutV2] = useState(null);
  const mushafPagesData = pagesV2;
  const mushafLayoutData = layoutV2;
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
        const [pV2, lV2, v] = await Promise.all([
          fetch("/v2/mushaf-pages.json"),
          fetch("/v2/mushaf-layout.json"),
          fetch("/verse-to-page.json"),
        ]);
        if (!cancelled && pV2.ok) setPagesV2(await pV2.json());
        if (!cancelled && lV2.ok) setLayoutV2(await lV2.json());
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
    return () => {
      cancelled = true;
    };
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
  const [bismillahGlyphs, setBismillahGlyphs] = useState(null);
  useEffect(() => {
    loadQcfFont(1);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          "https://api.quran.com/api/v4/verses/by_key/1:1?words=true&word_fields=code_v2,char_type_name",
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const words = (data.verse?.words || [])
          .filter((w) => w.char_type_name === "word")
          .map((w) => w.code_v2 || "");
        if (!cancelled && words.length) setBismillahGlyphs(words.join(""));
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
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
              drawerView !== "tafsir-page" &&
              (() => {
                const [sNum, aNum] = (selectedAyah || "").split(":");
                const surahN = parseInt(sNum, 10);
                const selVerse = (mushafVerses || []).find(
                  (v) => v.verse_key === selectedAyah,
                );
                const transText =
                  selVerse?._translation || translations[selectedAyah] || "";
                if (!transText && selVerse) fetchTranslations([selVerse]);
                // Single-ayah Play button should only show Stop when the
                // user explicitly started single-ayah playback — not when the
                // Play Range happens to be passing through this ayah.
                const isPlaying =
                  !mushafAudioPlaying && playingKey === selectedAyah;
                return (
                  <>
                    <div
                      onClick={() => {
                        setSelectedAyah(null);
                        setDrawerView("default");
                        setShowPickers(false);
                      }}
                      style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 199,
                        background: "transparent",
                      }}
                    />
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "fixed",
                        left: 0,
                        right: 0,
                        zIndex: 200,
                        ...(drawerView === "tafsir"
                          ? {
                              top: 0,
                              bottom: 0,
                              boxShadow: dark
                                ? "0 12px 40px rgba(0,0,0,0.70)"
                                : "0 12px 40px rgba(0,0,0,0.12)",
                              animation: "slideDownDrawer .22s ease-out",
                            }
                          : {
                              bottom: 0,
                              maxHeight: `calc(100vh - ${showPickers ? 180 : 130}px)`,
                              height: "auto",
                              borderTop: dark
                                ? "1px solid rgba(212,175,55,0.22)"
                                : "1px solid rgba(139,106,16,0.18)",
                              borderRadius: "20px 20px 0 0",
                              boxShadow: dark
                                ? "0 -12px 40px rgba(0,0,0,0.70)"
                                : "0 -12px 40px rgba(0,0,0,0.12)",
                              animation: "slideUpDrawer .22s ease-out",
                            }),
                        transition:
                          "max-height .25s ease, bottom .25s ease, top .25s ease",
                        background: dark
                          ? "linear-gradient(180deg,#0B1220,#0E1628)"
                          : "#F3E9D2",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {/* Drag handle + header row */}
                      <div style={{ flexShrink: 0, padding: "10px 20px 0" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginBottom: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 4,
                              borderRadius: 2,
                              background: dark
                                ? "rgba(255,255,255,0.15)"
                                : "rgba(0,0,0,0.20)",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          {drawerView !== "default" ? (
                            <div
                              className="sbtn"
                              onClick={() => setDrawerView("default")}
                              style={{
                                fontSize: 11,
                                color: dark
                                  ? "rgba(212,175,55,0.60)"
                                  : "#6B645A",
                                fontFamily: "'DM Sans',sans-serif",
                              }}
                            >
                              ← Back
                            </div>
                          ) : (
                            <div
                              style={{
                                fontSize: 10,
                                color: dark
                                  ? "rgba(217,177,95,0.50)"
                                  : "#6B645A",
                                letterSpacing: ".14em",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                fontFamily: "'DM Sans',sans-serif",
                              }}
                            >
                              {SURAH_EN[surahN] || ""} · {sNum}:{aNum}
                            </div>
                          )}
                          <div
                            className="sbtn"
                            onClick={() => {
                              setSelectedAyah(null);
                              setDrawerView("default");
                              setShowPickers(false);
                            }}
                            style={{
                              fontSize: 22,
                              color: dark
                                ? "rgba(243,231,200,0.55)"
                                : "rgba(0,0,0,0.55)",
                              lineHeight: 1,
                              padding: "0 4px",
                              fontWeight: 300,
                            }}
                          >
                            ×
                          </div>
                        </div>
                      </div>

                      {/* ── VIEW: DEFAULT ── */}
                      {drawerView === "default" && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            padding: "8px 20px 0",
                            minHeight: 0,
                          }}
                        >
                          {/* Arabic text — per-page mushaf font when words are
                            available; fall back to UthmanicHafs. */}
                          {selVerse &&
                            (selVerse.words?.some((w) => w.code_v2) ? (
                              <div
                                style={{
                                  direction: "rtl",
                                  textAlign: "center",
                                  fontFamily: `'p${mushafPage}-${tajweedFont ? "v4" : "v2"}',serif`,
                                  fontSize: "clamp(20px,5vw,28px)",
                                  lineHeight: 1.9,
                                  color: dark ? "#E8DFC0" : "#2D2A26",
                                  padding: "6px 4px 10px",
                                  flexShrink: 0,
                                }}
                              >
                                {selVerse.words
                                  .filter(
                                    (w) =>
                                      !w.char_type_name ||
                                      w.char_type_name === "word" ||
                                      w.char_type_name === "end",
                                  )
                                  .map((w, wi) => (
                                    <span key={wi}>{w.code_v2 || ""} </span>
                                  ))}
                              </div>
                            ) : selVerse.text_uthmani ? (
                              <div
                                style={{
                                  direction: "rtl",
                                  textAlign: "center",
                                  fontFamily:
                                    "'UthmanicHafs','Amiri Quran','Amiri',serif",
                                  fontSize: "clamp(20px,5vw,28px)",
                                  lineHeight: 1.9,
                                  color: dark ? "#E8DFC0" : "#2D2A26",
                                  padding: "6px 4px 10px",
                                  flexShrink: 0,
                                }}
                              >
                                {(selVerse.text_uthmani || "").replace(
                                  /\u06DF/g,
                                  "\u0652",
                                )}
                                <span
                                  style={{
                                    fontFamily: "'Amiri Quran','Amiri',serif",
                                    fontSize: 14,
                                    color: dark
                                      ? "rgba(212,175,55,0.45)"
                                      : "#A08848",
                                    marginRight: 4,
                                  }}
                                >
                                  ﴿{toArabicDigits(parseInt(aNum, 10))}﴾
                                </span>
                              </div>
                            ) : null)}
                          {/* Translation */}
                          <div
                            style={{
                              overflowY: "auto",
                              marginBottom: 10,
                              minHeight: 0,
                            }}
                          >
                            {transText ? (
                              <div
                                style={{
                                  fontSize: 15,
                                  color: dark
                                    ? "rgba(243,231,200,0.78)"
                                    : "#2D2A26",
                                  lineHeight: 1.85,
                                  fontFamily: "'DM Sans',sans-serif",
                                  textAlign: "center",
                                  padding: "12px 8px",
                                }}
                              >
                                {transText}
                              </div>
                            ) : (
                              <div style={{ height: 12 }} />
                            )}
                          </div>

                          {/* Ayah action buttons */}
                          <div
                            style={{
                              flexShrink: 0,
                              display: "flex",
                              justifyContent: "space-around",
                              gap: 4,
                              marginBottom: 14,
                              padding: "0 4px",
                            }}
                          >
                            {[
                              {
                                icon: "🔖",
                                label: "Bookmark",
                                action: () => setDrawerView("save-options"),
                              },
                              {
                                icon: isPlaying ? "⏹" : "▶",
                                label: isPlaying ? "Stop" : "Play",
                                action: () => {
                                  if (isPlaying) {
                                    audioRef.current?.pause();
                                    audioRef.current = null;
                                    setPlayingKey(null);
                                  } else {
                                    playAyahAudio(selectedAyah);
                                  }
                                },
                              },
                              mushafAudioPlaying
                                ? {
                                    icon: "⏹",
                                    label: "Stop",
                                    action: () => {
                                      stopMushafAudio();
                                    },
                                  }
                                : {
                                    icon: "⏭",
                                    label: "Play Range",
                                    action: () => {
                                      stopMushafAudio();
                                      setMushafRangeStart(null);
                                      setMushafRangeEnd(null);
                                      setShowMushafRangePicker(true);
                                    },
                                  },
                              {
                                icon: "✏️",
                                label: "Reflect",
                                action: () => setDrawerView("reflect"),
                              },
                            ].map((btn) => (
                              <div
                                key={btn.label}
                                className="sbtn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  btn.action();
                                }}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 6,
                                  flex: 1,
                                  minHeight: 56,
                                  padding: "8px 4px",
                                  fontWeight: 700,
                                  letterSpacing: ".04em",
                                  textTransform: "uppercase",
                                  color: dark
                                    ? "rgba(243,231,200,0.80)"
                                    : "#5A4A20",
                                  fontFamily: "'DM Sans',sans-serif",
                                  textAlign: "center",
                                }}
                              >
                                <span style={{ fontSize: 22 }}>{btn.icon}</span>
                                <span style={{ fontSize: 7, lineHeight: 1.1 }}>
                                  {btn.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── VIEW: TAFSIR (full screen with pinned ayah) ── */}
                      {drawerView === "tafsir" && (
                        <div
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            padding: "8px 0 0",
                          }}
                        >
                          {/* Pinned ayah */}
                          <div
                            style={{
                              flexShrink: 0,
                              padding: "12px 20px 10px",
                              borderBottom: dark
                                ? "1px solid rgba(212,175,55,0.12)"
                                : "1px solid rgba(0,0,0,0.08)",
                              background: dark
                                ? "rgba(0,0,0,0.15)"
                                : "rgba(0,0,0,0.03)",
                            }}
                          >
                            <div
                              style={{
                                fontFamily:
                                  "'UthmanicHafs','Amiri Quran','Amiri',serif",
                                fontSize: fontSize,
                                lineHeight: 2,
                                color: dark ? "#E8DFC0" : "#2D2A26",
                                direction: "rtl",
                                textAlign: "center",
                              }}
                            >
                              {(selVerse?.text_uthmani || "").replace(
                                /\u06DF/g,
                                "\u0652",
                              )}
                            </div>
                            {transText && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: dark
                                    ? "rgba(243,231,200,0.78)"
                                    : "#6B645A",
                                  textAlign: "center",
                                  marginTop: 4,
                                  lineHeight: 1.6,
                                  fontFamily: "'DM Sans',sans-serif",
                                }}
                              >
                                {transText}
                              </div>
                            )}
                          </div>
                          {/* Inline source picker — switch sources without
                            leaving the tafsir view */}
                          <div
                            style={{
                              flexShrink: 0,
                              padding: "10px 16px 6px",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 9,
                                color: dark
                                  ? "rgba(217,177,95,0.55)"
                                  : "rgba(140,100,20,0.65)",
                                letterSpacing: ".22em",
                                textTransform: "uppercase",
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              Tafsir
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 4,
                                flex: 1,
                                justifyContent: "flex-end",
                              }}
                            >
                              {TAFSIR_SOURCES.map((src) => {
                                const sel = tafsirTab === src.id;
                                return (
                                  <div
                                    key={src.id}
                                    className="sbtn"
                                    onClick={() => {
                                      setTafsirTab(src.id);
                                      fetchTafsir(selectedAyah);
                                    }}
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: 999,
                                      fontSize: 10,
                                      fontWeight: 700,
                                      letterSpacing: ".02em",
                                      background: sel
                                        ? "linear-gradient(160deg,#D4AF37 0%,#8B6A10 100%)"
                                        : dark
                                          ? "rgba(255,255,255,0.04)"
                                          : "rgba(0,0,0,0.04)",
                                      border: `1px solid ${sel ? "rgba(232,200,120,0.65)" : dark ? "rgba(217,177,95,0.12)" : "rgba(0,0,0,0.08)"}`,
                                      color: sel
                                        ? "#0A0E1A"
                                        : dark
                                          ? "rgba(243,231,200,0.65)"
                                          : "#5A4A2A",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {src.name}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {/* Tafsir content — parsed into blocks */}
                          <div
                            style={{
                              flex: 1,
                              overflowY: "auto",
                              padding: "14px 20px 120px",
                            }}
                          >
                            {(() => {
                              const rawText =
                                tafsirData[`${tafsirTab}-${selectedAyah}`];
                              if (!rawText)
                                return (
                                  <div
                                    style={{
                                      textAlign: "center",
                                      padding: 40,
                                      color: dark
                                        ? "rgba(243,231,200,0.20)"
                                        : "#6B645A",
                                      fontSize: 11,
                                    }}
                                  >
                                    Loading...
                                  </div>
                                );
                              const isFullArabic =
                                TAFSIR_SOURCES.find((s) => s.id === tafsirTab)
                                  ?.lang === "ar";
                              if (isFullArabic) {
                                // Full Arabic tafsir — render as one styled block
                                return (
                                  <div
                                    style={{
                                      fontFamily: "'Amiri',serif",
                                      fontSize: 19,
                                      lineHeight: 2.2,
                                      color: dark
                                        ? "rgba(243,231,200,0.85)"
                                        : "#2D2A26",
                                      direction: "rtl",
                                      textAlign: "center",
                                    }}
                                  >
                                    {rawText}
                                  </div>
                                );
                              }
                              const blocks = parseTafsirBlocks(rawText);
                              return blocks.map((block, i) =>
                                block.type === "arabic" ? (
                                  <div
                                    key={i}
                                    style={{
                                      fontFamily: "'Amiri Quran','Amiri',serif",
                                      fontSize: 20,
                                      lineHeight: 2.2,
                                      color: dark ? "#E8C76A" : "#2D2A26",
                                      direction: "rtl",
                                      textAlign: "center",
                                      padding: "20px 16px",
                                      margin: "16px 0",
                                      background: dark
                                        ? "rgba(212,175,55,0.04)"
                                        : "rgba(212,175,55,0.06)",
                                      borderRadius: 12,
                                      border: dark
                                        ? "1px solid rgba(212,175,55,0.10)"
                                        : "1px solid rgba(0,0,0,0.06)",
                                    }}
                                  >
                                    {block.text}
                                  </div>
                                ) : (
                                  <div
                                    key={i}
                                    style={{
                                      fontFamily: "'DM Sans',sans-serif",
                                      fontSize: 14,
                                      lineHeight: 1.85,
                                      color: dark
                                        ? "rgba(243,231,200,0.75)"
                                        : "#2D2A26",
                                      marginBottom: 18,
                                      direction: "ltr",
                                      textAlign: "left",
                                    }}
                                  >
                                    {block.text}
                                  </div>
                                ),
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* ── VIEW: REFLECT ── */}
                      {drawerView === "reflect" && (
                        <div
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            padding: "12px 20px 16px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              color: dark
                                ? "rgba(217,177,95,0.45)"
                                : "rgba(140,100,20,0.55)",
                              letterSpacing: ".14em",
                              textTransform: "uppercase",
                              fontWeight: 700,
                              marginBottom: 6,
                              fontFamily: "'DM Sans',sans-serif",
                            }}
                          >
                            Your Reflection · {SURAH_EN[surahN] || ""} {sNum}:
                            {aNum}
                          </div>
                          {selVerse && (
                            <div
                              style={{
                                fontFamily:
                                  "'UthmanicHafs','Amiri Quran','Amiri',serif",
                                fontSize: 18,
                                color: dark
                                  ? "rgba(243,231,200,0.70)"
                                  : "#2D2A26",
                                direction: "rtl",
                                textAlign: "center",
                                lineHeight: 1.8,
                                marginBottom: 8,
                                padding: "6px 0",
                                borderBottom: dark
                                  ? "1px solid rgba(217,177,95,0.10)"
                                  : "1px solid rgba(0,0,0,0.06)",
                              }}
                            >
                              {(selVerse.text_uthmani || "").replace(
                                /\u06DF/g,
                                "\u0652",
                              )}
                            </div>
                          )}
                          <textarea
                            value={reflections[selectedAyah] || ""}
                            onChange={(e) => {
                              const updated = {
                                ...reflections,
                                [selectedAyah]: e.target.value,
                              };
                              setReflections(updated);
                              try {
                                localStorage.setItem(
                                  "rihlat-reflections",
                                  JSON.stringify(updated),
                                );
                              } catch {}
                            }}
                            placeholder="Write your thoughts on this ayah..."
                            style={{
                              flex: 1,
                              width: "100%",
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(212,175,55,0.15)",
                              borderRadius: 12,
                              padding: "12px",
                              outline: "none",
                              color: "rgba(243,231,200,0.80)",
                              fontSize: 13,
                              lineHeight: 1.75,
                              fontFamily: "'DM Sans',sans-serif",
                              resize: "none",
                            }}
                          />
                          {reflections[selectedAyah] && (
                            <div
                              style={{
                                fontSize: 9,
                                color: "rgba(217,177,95,0.35)",
                                textAlign: "right",
                                fontFamily: "'DM Sans',sans-serif",
                                marginTop: 4,
                              }}
                            >
                              Saved ✓
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── BOOKMARK (save/view) ── */}
                      {drawerView === "save-options" &&
                        (() => {
                          const isAyahSaved =
                            mushafBookmarks.includes(selectedAyah);
                          const isPageSaved =
                            mushafBookmarks.includes(mushafPage);
                          return (
                            <div
                              style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "20px",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 9,
                                  color: dark
                                    ? "rgba(217,177,95,0.45)"
                                    : "rgba(140,100,20,0.55)",
                                  letterSpacing: ".14em",
                                  textTransform: "uppercase",
                                  fontWeight: 700,
                                  marginBottom: 6,
                                }}
                              >
                                Bookmark
                              </div>
                              <div
                                className="sbtn"
                                onClick={() => {
                                  const updated = isPageSaved
                                    ? mushafBookmarks.filter(
                                        (p) => p !== mushafPage,
                                      )
                                    : [...mushafBookmarks, mushafPage];
                                  setMushafBookmarks(updated);
                                  try {
                                    localStorage.setItem(
                                      "rihlat-mushaf-bookmarks",
                                      JSON.stringify(updated),
                                    );
                                  } catch {}
                                  setDrawerView("default");
                                }}
                                style={{
                                  width: "100%",
                                  padding: "14px",
                                  borderRadius: 12,
                                  textAlign: "center",
                                  background: isPageSaved
                                    ? dark
                                      ? "rgba(74,222,128,0.08)"
                                      : "rgba(46,204,113,0.06)"
                                    : dark
                                      ? "rgba(255,255,255,0.03)"
                                      : "rgba(0,0,0,0.03)",
                                  border: `1px solid ${isPageSaved ? (dark ? "rgba(74,222,128,0.25)" : "rgba(46,204,113,0.20)") : dark ? "rgba(217,177,95,0.15)" : "rgba(0,0,0,0.08)"}`,
                                  color: isPageSaved
                                    ? dark
                                      ? "#4ADE80"
                                      : "#2ECC71"
                                    : dark
                                      ? "rgba(243,231,200,0.70)"
                                      : "#2D2A26",
                                  fontSize: 13,
                                  fontWeight: 600,
                                }}
                              >
                                {isPageSaved
                                  ? `✦ Page ${mushafPage} Saved — Tap to Remove`
                                  : `📌 Save Page ${mushafPage}`}
                              </div>
                              <div
                                className="sbtn"
                                onClick={() => {
                                  const bm = [...mushafBookmarks];
                                  const idx = bm.indexOf(selectedAyah);
                                  if (idx >= 0) bm.splice(idx, 1);
                                  else bm.push(selectedAyah);
                                  setMushafBookmarks(bm);
                                  try {
                                    localStorage.setItem(
                                      "rihlat-mushaf-bookmarks",
                                      JSON.stringify(bm),
                                    );
                                  } catch {}
                                  setDrawerView("default");
                                }}
                                style={{
                                  width: "100%",
                                  padding: "14px",
                                  borderRadius: 12,
                                  textAlign: "center",
                                  background: isAyahSaved
                                    ? dark
                                      ? "rgba(74,222,128,0.08)"
                                      : "rgba(46,204,113,0.06)"
                                    : dark
                                      ? "rgba(255,255,255,0.03)"
                                      : "rgba(0,0,0,0.03)",
                                  border: `1px solid ${isAyahSaved ? (dark ? "rgba(74,222,128,0.25)" : "rgba(46,204,113,0.20)") : dark ? "rgba(217,177,95,0.15)" : "rgba(0,0,0,0.08)"}`,
                                  color: isAyahSaved
                                    ? dark
                                      ? "#4ADE80"
                                      : "#2ECC71"
                                    : dark
                                      ? "rgba(243,231,200,0.70)"
                                      : "#2D2A26",
                                  fontSize: 13,
                                  fontWeight: 600,
                                }}
                              >
                                {isAyahSaved
                                  ? "✦ Ayah Saved — Tap to Remove"
                                  : `🔖 Save Ayah · ${selectedAyah}`}
                              </div>
                              <div
                                className="sbtn"
                                onClick={() => setDrawerView("bookmarks")}
                                style={{
                                  width: "100%",
                                  padding: "14px",
                                  borderRadius: 12,
                                  textAlign: "center",
                                  background: dark
                                    ? "rgba(255,255,255,0.03)"
                                    : "rgba(0,0,0,0.03)",
                                  border: dark
                                    ? "1px solid rgba(217,177,95,0.15)"
                                    : "1px solid rgba(0,0,0,0.08)",
                                  color: dark
                                    ? "rgba(243,231,200,0.70)"
                                    : "#2D2A26",
                                  fontSize: 13,
                                  fontWeight: 600,
                                }}
                              >
                                📚 View Saved
                              </div>
                              <div
                                className="sbtn"
                                onClick={() => setDrawerView("default")}
                                style={{
                                  fontSize: 11,
                                  color: dark
                                    ? "rgba(243,231,200,0.30)"
                                    : "#9A8A6A",
                                  marginTop: 4,
                                }}
                              >
                                Cancel
                              </div>
                            </div>
                          );
                        })()}

                      {/* ── BOOKMARKS VIEW ── */}
                      {drawerView === "bookmarks" && (
                        <div
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            padding: "12px 20px 16px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 10,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 9,
                                color: dark
                                  ? "rgba(217,177,95,0.45)"
                                  : "rgba(140,100,20,0.55)",
                                letterSpacing: ".14em",
                                textTransform: "uppercase",
                                fontWeight: 700,
                              }}
                            >
                              Bookmarks & Saved
                            </div>
                            <div
                              className="sbtn"
                              onClick={() => setDrawerView("default")}
                              style={{
                                fontSize: 12,
                                color: dark
                                  ? "rgba(243,231,200,0.30)"
                                  : "#9A8A6A",
                              }}
                            >
                              ×
                            </div>
                          </div>
                          <div style={{ flex: 1, overflowY: "auto" }}>
                            {/* Saved Ayahs */}
                            {mushafBookmarks.filter(
                              (b) => typeof b === "string",
                            ).length > 0 && (
                              <div style={{ marginBottom: 12 }}>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: dark
                                      ? "rgba(243,231,200,0.35)"
                                      : "#6B645A",
                                    fontWeight: 600,
                                    marginBottom: 6,
                                  }}
                                >
                                  Saved Ayahs
                                </div>
                                {mushafBookmarks
                                  .filter((b) => typeof b === "string")
                                  .map((vk) => {
                                    const [s] = vk.split(":");
                                    return (
                                      <div
                                        key={vk}
                                        className="sbtn"
                                        onClick={() => {
                                          const pg =
                                            SURAH_PAGES[Number(s)] || 1;
                                          setMushafPage(pg);
                                          setSelectedAyah(null);
                                          setDrawerView("default");
                                          setShowPickers(false);
                                        }}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          padding: "8px 10px",
                                          borderRadius: 8,
                                          marginBottom: 4,
                                          background: dark
                                            ? "rgba(255,255,255,0.03)"
                                            : "rgba(0,0,0,0.03)",
                                          border: dark
                                            ? "1px solid rgba(255,255,255,0.05)"
                                            : "1px solid rgba(0,0,0,0.06)",
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: 12,
                                            color: dark
                                              ? "rgba(243,231,200,0.70)"
                                              : "#2D2A26",
                                          }}
                                        >
                                          {SURAH_EN[Number(s)]} · {vk}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: 10,
                                            color: dark
                                              ? "rgba(243,231,200,0.25)"
                                              : "#9A8A6A",
                                          }}
                                        >
                                          →
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                            {/* Bookmarked Pages */}
                            {mushafBookmarks.filter(
                              (b) => typeof b === "number",
                            ).length > 0 && (
                              <div style={{ marginBottom: 12 }}>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: dark
                                      ? "rgba(243,231,200,0.35)"
                                      : "#6B645A",
                                    fontWeight: 600,
                                    marginBottom: 6,
                                  }}
                                >
                                  Bookmarked Pages
                                </div>
                                {mushafBookmarks
                                  .filter((b) => typeof b === "number")
                                  .sort((a, b) => a - b)
                                  .map((pg) => {
                                    const content =
                                      pageContentMap && pageContentMap[pg];
                                    const label =
                                      content && content.length > 0
                                        ? content
                                            .map(
                                              (c) =>
                                                `${SURAH_EN[c.sNum] || c.sNum} ${c.minA}${c.minA === c.maxA ? "" : "-" + c.maxA}`,
                                            )
                                            .join(" · ")
                                        : null;
                                    return (
                                      <div
                                        key={pg}
                                        className="sbtn"
                                        onClick={() => {
                                          setMushafPage(pg);
                                          setDrawerView("default");
                                          setSelectedAyah(null);
                                        }}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          gap: 8,
                                          padding: "8px 10px",
                                          borderRadius: 8,
                                          marginBottom: 4,
                                          background: dark
                                            ? "rgba(255,255,255,0.03)"
                                            : "rgba(0,0,0,0.03)",
                                          border: dark
                                            ? "1px solid rgba(255,255,255,0.05)"
                                            : "1px solid rgba(0,0,0,0.06)",
                                        }}
                                      >
                                        <div
                                          style={{
                                            flex: 1,
                                            minWidth: 0,
                                            fontSize: 12,
                                            color: dark
                                              ? "rgba(243,231,200,0.70)"
                                              : "#2D2A26",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {label || `Page ${pg}`}
                                        </div>
                                        <span
                                          style={{
                                            flexShrink: 0,
                                            fontSize: 11,
                                            color: dark
                                              ? "rgba(243,231,200,0.45)"
                                              : "#6B645A",
                                            fontFamily:
                                              "'IBM Plex Mono',monospace",
                                          }}
                                        >
                                          Page {pg}
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                            {/* Reflections */}
                            {Object.keys(reflections || {}).filter(
                              (k) => reflections[k],
                            ).length > 0 && (
                              <div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: dark
                                      ? "rgba(243,231,200,0.35)"
                                      : "#6B645A",
                                    fontWeight: 600,
                                    marginBottom: 6,
                                  }}
                                >
                                  Reflections
                                </div>
                                {Object.entries(reflections || {})
                                  .filter(([, v]) => v)
                                  .map(([vk, note]) => {
                                    const [s] = vk.split(":");
                                    return (
                                      <div
                                        key={vk}
                                        className="sbtn"
                                        onClick={() => {
                                          const pg =
                                            SURAH_PAGES[Number(s)] || 1;
                                          setMushafPage(pg);
                                          setSelectedAyah(vk);
                                          setDrawerView("reflect");
                                        }}
                                        style={{
                                          padding: "8px 10px",
                                          borderRadius: 8,
                                          marginBottom: 4,
                                          background: dark
                                            ? "rgba(255,255,255,0.03)"
                                            : "rgba(0,0,0,0.03)",
                                          border: dark
                                            ? "1px solid rgba(255,255,255,0.05)"
                                            : "1px solid rgba(0,0,0,0.06)",
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontSize: 12,
                                            color: dark
                                              ? "rgba(243,231,200,0.70)"
                                              : "#2D2A26",
                                            marginBottom: 2,
                                          }}
                                        >
                                          {SURAH_EN[Number(s)]} · {vk}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 11,
                                            color: dark
                                              ? "rgba(243,231,200,0.40)"
                                              : "#6B645A",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {note}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                            {mushafBookmarks.length === 0 &&
                              Object.keys(reflections || {}).filter(
                                (k) => reflections[k],
                              ).length === 0 && (
                                <div
                                  style={{
                                    textAlign: "center",
                                    padding: "20px 0",
                                    fontSize: 12,
                                    color: dark
                                      ? "rgba(243,231,200,0.30)"
                                      : "#9A8A6A",
                                  }}
                                >
                                  No saved items yet
                                </div>
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
    </div>
  );
}
