import { SURAH_EN } from "../data/constants";
import { toArabicDigits } from "../utils";

export default function AyahDrawer({ audioRef, dark, drawerView, setDrawerView, fetchTafsir, fetchTranslations, fontSize, mushafAudioPlaying, mushafBookmarks, setMushafBookmarks, mushafPage, setMushafPage, mushafVerses, pageContentMap, parseTafsirBlocks, playAyahAudio, playingKey, setPlayingKey, reflections, setReflections, selectedAyah, setSelectedAyah, setMushafRangeEnd, setMushafRangeStart, setShowMushafRangePicker, setShowPickers, showPickers, setTafsirTab, stopMushafAudio, tafsirData, tafsirTab, translations, tajweedFont, TAFSIR_SOURCES, SURAH_PAGES }) {
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
                            {/* eslint-disable-next-line react-hooks/refs -- audioRef is accessed only inside the onClick handler below, not during render */}
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
                              } catch { /* ignore: storage may be unavailable */ }
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
                                  } catch { /* ignore: storage may be unavailable */ }
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
                                  } catch { /* ignore: storage may be unavailable */ }
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
}
