// Interactive single-page mushaf renderer for QuranTab: the read-only line
// layout (surah ornament + universal bismillah + justified ayah lines in the
// page's p{N}-v2 font) PLUS the per-glyph tap layer that maps each word to its
// verse_key (via glyphVerseKeys) so a tap opens that ayah. Lifted verbatim from
// QuranTab; the surrounding chrome (loading gate, hizb footer, drawer) stays at
// the call site. Distinct from the read-only MushafPage (different metrics +
// tap handling), so it is its own component.

const SHORT_METRIC_PAGES = new Set([
  46, 55, 57, 76, 83, 100, 101, 161, 175, 242, 245, 246, 379, 590,
]);

export default function InteractiveMushafPage({ mushafVerses, tajweedFont, loadedFonts, mushafPage, dark, mushafPagesData, mushafLayoutData, bismillahGlyphs, glyphVerseKeys, setSelectedAyah, setDrawerView }) {
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
                              } catch { /* ignore scroll errors */ }
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
}
