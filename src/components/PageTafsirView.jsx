import React from "react";
import { SURAH_EN, MADANI_SURAHS } from "../data/constants";

export default function PageTafsirView({ TAFSIR_SOURCES, tafsirTab, dark, setDrawerView, setShowPickers, mushafPage, pageVerses, tafsirData, fontSize, parseTafsirBlocks }) {
          const sourceLabel =
            TAFSIR_SOURCES.find((s) => s.id === tafsirTab)?.name || "";
          const isFullArabic =
            TAFSIR_SOURCES.find((s) => s.id === tafsirTab)?.lang === "ar";
          return (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                background: dark
                  ? "linear-gradient(180deg,#0B1220,#0E1628)"
                  : "#F3E9D2",
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 16px",
                  borderBottom: dark
                    ? "1px solid rgba(212,175,55,0.12)"
                    : "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <div
                  className="sbtn"
                  onClick={() => {
                    setDrawerView("default");
                    setShowPickers(false);
                  }}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: dark ? "#E6B84A" : "#8B6A10",
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: dark
                      ? "rgba(230,184,74,0.08)"
                      : "rgba(180,140,40,0.06)",
                    border: dark
                      ? "1px solid rgba(230,184,74,0.25)"
                      : "1px solid rgba(160,120,20,0.25)",
                  }}
                >
                  ← Back to Qur'an
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: dark ? "rgba(217,177,95,0.60)" : "#6B645A",
                    letterSpacing: ".14em",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Page {mushafPage}
                </div>
              </div>
              <div
                style={{
                  flexShrink: 0,
                  padding: "10px 20px 0",
                  textAlign: "center",
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
                  }}
                >
                  Tafsir · {sourceLabel}
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "14px 20px 120px",
                }}
              >
                {(pageVerses || []).length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: dark ? "rgba(243,231,200,0.20)" : "#6B645A",
                      fontSize: 11,
                    }}
                  >
                    Loading...
                  </div>
                ) : (
                  (() => {
                    let prevSurah = null;
                    return pageVerses.map((v) => {
                      const sNum = parseInt(v.verse_key.split(":")[0], 10);
                      const showSurahHeader = sNum !== prevSurah;
                      prevSurah = sNum;
                      const rawText = tafsirData[`${tafsirTab}-${v.verse_key}`];
                      return (
                        <React.Fragment key={v.verse_key}>
                          {showSurahHeader && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                margin: "10px 0 18px",
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                  height: 1,
                                  background: dark
                                    ? "linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.45) 100%)"
                                    : "linear-gradient(90deg,rgba(140,100,20,0) 0%,rgba(140,100,20,0.40) 100%)",
                                }}
                              />
                              <div
                                style={{ textAlign: "center", flexShrink: 0 }}
                              >
                                <div
                                  style={{
                                    fontFamily: "'Playfair Display',serif",
                                    fontSize: 18,
                                    fontWeight: 600,
                                    color: dark ? "#F6E27A" : "#8B6A10",
                                    letterSpacing: ".02em",
                                  }}
                                >
                                  {SURAH_EN[sNum] || ""}
                                </div>
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: dark
                                      ? "rgba(217,177,95,0.55)"
                                      : "rgba(140,100,20,0.60)",
                                    letterSpacing: ".22em",
                                    textTransform: "uppercase",
                                    fontWeight: 700,
                                    marginTop: 2,
                                  }}
                                >
                                  Surah {sNum} ·{" "}
                                  {MADANI_SURAHS.has(sNum)
                                    ? "Madani"
                                    : "Meccan"}
                                </div>
                              </div>
                              <div
                                style={{
                                  flex: 1,
                                  height: 1,
                                  background: dark
                                    ? "linear-gradient(90deg,rgba(232,200,120,0.45) 0%,rgba(217,177,95,0) 100%)"
                                    : "linear-gradient(90deg,rgba(140,100,20,0.40) 0%,rgba(140,100,20,0) 100%)",
                                }}
                              />
                            </div>
                          )}
                          <div
                            style={{
                              marginBottom: 26,
                              paddingBottom: 20,
                              borderBottom: dark
                                ? "1px solid rgba(212,175,55,0.08)"
                                : "1px solid rgba(0,0,0,0.05)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 9,
                                color: dark
                                  ? "rgba(217,177,95,0.55)"
                                  : "rgba(140,100,20,0.60)",
                                letterSpacing: ".18em",
                                textTransform: "uppercase",
                                fontWeight: 700,
                                marginBottom: 8,
                                fontFamily: "'IBM Plex Mono',monospace",
                              }}
                            >
                              {v.verse_key}
                            </div>
                            <div
                              style={{
                                fontFamily:
                                  "'UthmanicHafs','Amiri Quran','Amiri',serif",
                                fontSize: fontSize,
                                lineHeight: 2,
                                color: dark ? "#E8DFC0" : "#2D2A26",
                                direction: "rtl",
                                textAlign: "right",
                                marginBottom: 14,
                              }}
                            >
                              {(v.text_uthmani || "").replace(/۟/g, "ْ")}
                            </div>
                            {!rawText ? (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: dark
                                    ? "rgba(243,231,200,0.30)"
                                    : "#9A9488",
                                  fontStyle: "italic",
                                }}
                              >
                                Loading tafsir…
                              </div>
                            ) : isFullArabic ? (
                              <div
                                style={{
                                  fontFamily: "'Amiri',serif",
                                  fontSize: 18,
                                  lineHeight: 2.1,
                                  color: dark
                                    ? "rgba(243,231,200,0.85)"
                                    : "#2D2A26",
                                  direction: "rtl",
                                  textAlign: "right",
                                }}
                              >
                                {rawText}
                              </div>
                            ) : (
                              parseTafsirBlocks(rawText).map((block, i) =>
                                block.type === "arabic" ? (
                                  <div
                                    key={i}
                                    style={{
                                      fontFamily: "'Amiri Quran','Amiri',serif",
                                      fontSize: 18,
                                      lineHeight: 2.1,
                                      color: dark ? "#E8C76A" : "#2D2A26",
                                      direction: "rtl",
                                      textAlign: "center",
                                      padding: "14px 12px",
                                      margin: "10px 0",
                                      background: dark
                                        ? "rgba(212,175,55,0.04)"
                                        : "rgba(212,175,55,0.06)",
                                      borderRadius: 10,
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
                                        ? "rgba(243,231,200,0.78)"
                                        : "#2D2A26",
                                      marginBottom: 12,
                                      direction: "ltr",
                                      textAlign: "left",
                                    }}
                                  >
                                    {block.text}
                                  </div>
                                ),
                              )
                            )}
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()
                )}
              </div>
            </div>
          );
}
