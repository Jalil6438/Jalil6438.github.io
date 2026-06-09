export default function QuranSettingsSheet({ dark, setShowQuranSettings, setDark, translationSource, setTranslationSource, tafsirTab, setTafsirTab, TAFSIR_SOURCES }) {
  return (
        <>
          <div
            onClick={() => setShowQuranSettings(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
              zIndex: 998,
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 999,
              maxHeight: "80vh",
              background: dark
                ? "linear-gradient(180deg,#0E1628 0%,#080E1A 100%)"
                : "#EADFC8",
              borderRadius: "18px 18px 0 0",
              borderTop: dark
                ? "1px solid rgba(217,177,95,0.18)"
                : "1px solid rgba(139,106,16,0.18)",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.40)",
              padding: "14px 18px 32px",
              overflowY: "auto",
              animation: "slideUpDrawer .22s ease-out",
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                background: dark
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(0,0,0,0.10)",
                borderRadius: 2,
                margin: "0 auto 14px",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: dark
                    ? "rgba(217,177,95,0.65)"
                    : "rgba(140,100,20,0.60)",
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Qur'an Settings
              </div>
              <div
                className="sbtn"
                onClick={() => setShowQuranSettings(false)}
                style={{
                  fontSize: 20,
                  color: dark ? "rgba(243,231,200,0.55)" : "rgba(0,0,0,0.55)",
                  lineHeight: 1,
                  padding: "0 4px",
                  fontWeight: 300,
                }}
              >
                ×
              </div>
            </div>
            {/* Theme */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 6px",
                borderBottom: dark
                  ? "1px solid rgba(217,177,95,0.10)"
                  : "1px solid rgba(139,106,16,0.10)",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: dark ? "rgba(243,231,200,0.90)" : "#2D2A26",
                  }}
                >
                  Theme
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: dark ? "rgba(243,231,200,0.40)" : "#6B645A",
                    marginTop: 2,
                  }}
                >
                  Dark or light parchment
                </div>
              </div>
              {setDark && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "relative",
                    display: "flex",
                    borderRadius: 999,
                    width: 110,
                    background: dark
                      ? "rgba(12,20,34,0.80)"
                      : "rgba(0,0,0,0.08)",
                    border: dark
                      ? "1px solid rgba(212,175,55,0.15)"
                      : "1px solid rgba(139,106,16,0.20)",
                    padding: 2,
                    height: 28,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 2,
                      left: dark ? 2 : "calc(50% + 1px)",
                      width: "calc(50% - 3px)",
                      height: 24,
                      borderRadius: 999,
                      background:
                        "linear-gradient(160deg,#D4AF37 0%,#8B6A10 100%)",
                      boxShadow: "0 0 10px rgba(212,175,55,0.40)",
                      transition: "left .25s ease",
                    }}
                  />
                  <div
                    className="sbtn"
                    onClick={() => setDark(true)}
                    style={{
                      position: "relative",
                      zIndex: 1,
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      letterSpacing: ".05em",
                      color: dark ? "#0A0E1A" : "rgba(0,0,0,0.50)",
                      fontWeight: 700,
                    }}
                  >
                    Dark
                  </div>
                  <div
                    className="sbtn"
                    onClick={() => setDark(false)}
                    style={{
                      position: "relative",
                      zIndex: 1,
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      letterSpacing: ".05em",
                      color: !dark ? "#0A0E1A" : "rgba(212,175,55,0.45)",
                      fontWeight: 700,
                    }}
                  >
                    Light
                  </div>
                </div>
              )}
            </div>
            {/* Reading-mode toggle (Mushaf · Study · Tajweed) was removed
                    2026-04-28 once Study mode adopted the framed-page look —
                    the two modes rendered identically. quranMode state is
                    pinned to "interactive" (Study) below. To restore: revert
                    this block + the static `quranMode = "interactive"` and
                    re-introduce the if/else viewer branch.
                */}
            {/* Translation source */}
            <div
              style={{
                padding: "12px 6px",
                borderBottom: dark
                  ? "1px solid rgba(217,177,95,0.10)"
                  : "1px solid rgba(139,106,16,0.10)",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: dark ? "rgba(243,231,200,0.90)" : "#2D2A26",
                  marginBottom: 2,
                }}
              >
                Translation
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: dark ? "rgba(243,231,200,0.40)" : "#6B645A",
                  marginBottom: 10,
                }}
              >
                Full-page only in Mushaf mode
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { id: "muhsin_khan", name: "Muhsin Khan" },
                  { id: "sahih_intl", name: "Sahih International" },
                ].map((src) => {
                  const sel = translationSource === src.id;
                  return (
                    <div
                      key={src.id}
                      className="sbtn"
                      onClick={() =>
                        setTranslationSource && setTranslationSource(src.id)
                      }
                      style={{
                        flex: 1,
                        padding: "8px 6px",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 700,
                        textAlign: "center",
                        background: sel
                          ? "linear-gradient(160deg,#D4AF37 0%,#8B6A10 100%)"
                          : dark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.04)",
                        border: `1px solid ${sel ? "rgba(232,200,120,0.65)" : dark ? "rgba(217,177,95,0.10)" : "rgba(0,0,0,0.06)"}`,
                        boxShadow: sel
                          ? "0 0 10px rgba(212,175,55,0.40)"
                          : "none",
                        color: sel
                          ? "#0A0E1A"
                          : dark
                            ? "rgba(243,231,200,0.70)"
                            : "#2D2A26",
                      }}
                    >
                      {src.name}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Tafsir */}
            <div style={{ padding: "12px 6px" }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: dark ? "rgba(243,231,200,0.90)" : "#2D2A26",
                  marginBottom: 10,
                }}
              >
                Tafsir
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {TAFSIR_SOURCES.map((src) => {
                  const sel = tafsirTab === src.id;
                  return (
                    <div
                      key={src.id}
                      className="sbtn"
                      onClick={() => setTafsirTab(src.id)}
                      style={{
                        flex: 1,
                        padding: "8px 6px",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 700,
                        textAlign: "center",
                        background: sel
                          ? "linear-gradient(160deg,#D4AF37 0%,#8B6A10 100%)"
                          : dark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.04)",
                        border: `1px solid ${sel ? "rgba(232,200,120,0.65)" : dark ? "rgba(217,177,95,0.10)" : "rgba(0,0,0,0.06)"}`,
                        boxShadow: sel
                          ? "0 0 10px rgba(212,175,55,0.40)"
                          : "none",
                        color: sel
                          ? "#0A0E1A"
                          : dark
                            ? "rgba(243,231,200,0.70)"
                            : "#2D2A26",
                      }}
                    >
                      {src.name}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
  );
}
