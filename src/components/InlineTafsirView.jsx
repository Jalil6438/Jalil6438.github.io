import { SURAH_EN } from "../data/constants";

export default function InlineTafsirView({ selectedAyah, setSelectedAyah, mushafVerses, translations, dark, setDrawerView, setShowPickers, fontSize, TAFSIR_SOURCES, tafsirTab, setTafsirTab, fetchTafsir, tafsirData, parseTafsirBlocks }) {
          const selVerse = (mushafVerses || []).find(
            (v) => v.verse_key === selectedAyah,
          );
          const transText =
            selVerse?._translation || translations[selectedAyah] || "";
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
                    setSelectedAyah(null);
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
                  {SURAH_EN[parseInt(selectedAyah.split(":")[0], 10)] || ""} ·{" "}
                  {selectedAyah}
                </div>
              </div>
              <div
                style={{
                  flexShrink: 0,
                  padding: "12px 20px 10px",
                  borderBottom: dark
                    ? "1px solid rgba(212,175,55,0.12)"
                    : "1px solid rgba(0,0,0,0.08)",
                  background: dark ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.03)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'UthmanicHafs','Amiri Quran','Amiri',serif",
                    fontSize: fontSize,
                    lineHeight: 2,
                    color: dark ? "#E8DFC0" : "#2D2A26",
                    direction: "rtl",
                    textAlign: "center",
                  }}
                >
                  {(selVerse?.text_uthmani || "").replace(/۟/g, "ْ")}
                </div>
                {transText && (
                  <div
                    style={{
                      fontSize: 12,
                      color: dark ? "rgba(243,231,200,0.78)" : "#6B645A",
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
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "14px 20px 120px",
                }}
              >
                {(() => {
                  const rawText = tafsirData[`${tafsirTab}-${selectedAyah}`];
                  if (!rawText)
                    return (
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
                    );
                  const isFullArabic =
                    TAFSIR_SOURCES.find((s) => s.id === tafsirTab)?.lang ===
                    "ar";
                  if (isFullArabic)
                    return (
                      <div
                        style={{
                          fontFamily: "'Amiri',serif",
                          fontSize: 19,
                          lineHeight: 2.2,
                          color: dark ? "rgba(243,231,200,0.85)" : "#2D2A26",
                          direction: "rtl",
                          textAlign: "center",
                        }}
                      >
                        {rawText}
                      </div>
                    );
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
                          color: dark ? "rgba(243,231,200,0.75)" : "#2D2A26",
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
          );
}
