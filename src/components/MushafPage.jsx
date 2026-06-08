// Read-only renderer for a single authoritative KFGQPC V2 mushaf page. Walks the
// page's layout entries and renders, in order:
//   - surah-name ornament rows (custom /surah_ornament.png + surah-names font)
//   - the universal bismillah (p1 glyphs, with an Amiri fallback)
//   - justified / centered ayah lines using the page's own p{N}-v2 font
//
// This is the shared presentational block that was previously copy-pasted three
// times — in MyHifzTab (Fajr Mushaf + Review Mushaf) and MyMemorizationView. The
// surrounding chrome (headers, footers, page nav, swipe handlers, font/data
// readiness gating) stays at each call site; this component only owns the line
// rendering, so behavior is identical to the inline versions it replaces.
//
// Props:
//   pageNum            number   — mushaf page; drives the `p{N}-v2` line font
//   pageLines          string[] — per-line glyph strings (mushaf-pages.json[pageNum])
//   pageLayout         object[] — per-line layout entries (mushaf-layout.json[pageNum])
//   dark               bool     — theme
//   bismillahGlyphs    string   — universal bismillah glyphs (from useBismillah)
//   bismillahReady     bool     — whether the p1 font has loaded
//   renderSurah        (sn) => bool — include lines belonging to surah `sn`?
//                                   Omit to render every surah on the page.
//   fallbackStartSurah number   — surah for any lines that precede the page's
//                                  first surah_name entry (page-tail continuation)
export default function MushafPage({
  pageNum,
  pageLines,
  pageLayout,
  dark,
  bismillahGlyphs,
  bismillahReady,
  renderSurah,
  fallbackStartSurah = null,
}) {
  if (!pageLines || !pageLayout) return null;
  const firstSurahName = pageLayout.find((e) => e.type === "surah_name");
  let currentSurah = firstSurahName ? firstSurahName.sn - 1 : fallbackStartSurah;
  let ayahIdx = -1;
  return pageLayout.map((entry, i) => {
    const type = entry.type;
    let lineText = "";
    if (type !== "surah_name" && type !== "basmallah") {
      ayahIdx++;
      lineText = pageLines[ayahIdx] || "";
    }
    if (type === "surah_name") currentSurah = entry.sn;
    // Skip lines whose surah the caller has filtered out (drops tails/heads of
    // surahs not in today's batch / juz on split pages). ayahIdx has already
    // advanced above, so the line-string cursor stays aligned.
    if (renderSurah && !renderSurah(currentSurah)) return null;
    const isCenter = entry.center === 1;
    if (type === "surah_name") {
      const sn = entry.sn;
      return (
        <div key={i} style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ position: "relative", width: "100%", height: 70, backgroundImage: "url('/surah_ornament.png')", backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", backgroundPosition: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "'surah-names',serif", fontSize: "clamp(28px,7.5vw,44px)", color: dark ? "rgba(232,200,120,0.85)" : "rgba(0,0,0,0.70)", lineHeight: 1, display: "inline-flex", alignItems: "center", gap: "0.04em", direction: "rtl" }}>
              <span>surah</span>
              <span>{String(sn).padStart(3, "0")}</span>
            </span>
          </div>
        </div>
      );
    }
    if (type === "basmallah") {
      return (
        <div key={i} style={{ textAlign: "center", padding: "4px 0" }}>
          {bismillahGlyphs && bismillahReady ? (
            <div style={{ fontFamily: "'p1-v2',serif", fontSize: "clamp(20px,5.8vw,32px)", color: dark ? "rgba(232,200,120,0.85)" : "rgba(0,0,0,0.70)", direction: "rtl", lineHeight: 2 }}>{bismillahGlyphs}</div>
          ) : (
            <div style={{ fontFamily: "'Amiri Quran','Amiri',serif", fontSize: 20, color: dark ? "rgba(232,200,120,0.65)" : "rgba(0,0,0,0.50)", direction: "rtl", lineHeight: 2 }}>بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِيمِ</div>
          )}
        </div>
      );
    }
    return (
      <div key={i} style={{ direction: "rtl", display: "flex", justifyContent: isCenter ? "center" : "space-between", alignItems: "center", maxWidth: "min(540px,90vw)", marginInline: "auto", fontFamily: `'p${pageNum}-v2',serif`, fontSize: "clamp(20px,5vw,29px)", color: dark ? "#E8DFC0" : "#2D2A26", padding: "2px 0", whiteSpace: "nowrap", gap: isCenter ? "0.25em" : "0.10em" }}>
        {lineText.split(" ").map((w, wi) => (<span key={wi}>{w}</span>))}
      </div>
    );
  });
}
