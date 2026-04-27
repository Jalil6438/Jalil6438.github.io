import { useEffect, useState } from "react";

// Renders one mushaf page using V1 fonts + V1 glyph codes (the original
// printed Madinah mushaf typography). Self-contained — fetches font and
// per-page word data from quran.com, registers the @font-face on first
// use, and groups words by line_number for layout.
export default function V1MushafPreview({ pageNum, onClose, dark }) {
  const [lines, setLines] = useState(null);
  const [error, setError] = useState(false);
  const [fontReady, setFontReady] = useState(false);

  // Register V1 font for this page
  useEffect(() => {
    if (!pageNum) return;
    const family = `p${pageNum}-v1`;
    const elId = `qcf-font-${family}`;
    if (!document.getElementById(elId)) {
      const style = document.createElement("style");
      style.id = elId;
      style.textContent = `@font-face{font-family:'${family}';src:url('https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v1/woff2/p${pageNum}.woff2') format('woff2'),url('https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v1/woff/p${pageNum}.woff') format('woff');font-display:block;}`;
      document.head.appendChild(style);
    }
    if (document.fonts && document.fonts.load) {
      document.fonts.load(`16px '${family}'`).then(() => setFontReady(true)).catch(() => setFontReady(true));
    } else {
      setFontReady(true);
    }
  }, [pageNum]);

  // Fetch V1 word data for this page
  useEffect(() => {
    if (!pageNum) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`https://api.quran.com/api/v4/verses/by_page/${pageNum}?words=true&word_fields=code_v1,line_number,char_type_name&fields=verse_key&per_page=50`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (cancelled) return;
        // Flatten to (line_number, char_type_name, code_v1, verse_key, surah_number)
        const words = [];
        (data.verses || []).forEach(v => {
          const surahNum = parseInt((v.verse_key || "").split(":")[0], 10);
          (v.words || []).forEach(w => words.push({
            ln: w.line_number,
            type: w.char_type_name,
            code: w.code_v1,
            verseKey: v.verse_key,
            surahNum,
          }));
        });
        // Group by line
        const byLine = {};
        words.forEach(w => {
          if (!byLine[w.ln]) byLine[w.ln] = [];
          byLine[w.ln].push(w);
        });
        const sortedLines = Object.keys(byLine).map(Number).sort((a, b) => a - b).map(ln => {
          const lineWords = byLine[ln];
          const hasSurahName = lineWords.some(w => w.type === "surah_name" || w.type === "surah_marker");
          const hasBismillah = lineWords.some(w => w.type === "basmallah" || w.type === "bismillah");
          const text = lineWords.map(w => w.code).join(" ");
          return { ln, text, hasSurahName, hasBismillah, surahNum: lineWords[0]?.surahNum };
        });
        setLines(sortedLines);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [pageNum]);

  if (!pageNum) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: dark ? "linear-gradient(180deg,#0E1628 0%,#080E1A 100%)" : "#EADFC8", borderRadius: 20, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto", border: "1px solid rgba(217,177,95,0.30)", boxShadow: "0 20px 60px rgba(0,0,0,0.60)", padding: "20px 18px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${dark ? "rgba(217,177,95,0.18)" : "rgba(139,106,16,0.18)"}` }}>
          <div>
            <div style={{ fontSize: 10, color: "#D4AF37", letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700 }}>V1 Preview</div>
            <div style={{ fontSize: 14, color: dark ? "#F3E7BF" : "#2D2A26", fontWeight: 600, marginTop: 2 }}>Page {pageNum}</div>
          </div>
          <div className="sbtn" onClick={onClose} style={{ padding: "6px 12px", background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}`, borderRadius: 8, fontSize: 12, color: dark ? "rgba(243,231,191,0.70)" : "#6B645A" }}>Close</div>
        </div>
        {error && <div style={{ color: "#E5534B", fontSize: 12, padding: 12 }}>Could not load V1 data for page {pageNum}.</div>}
        {!error && (!lines || !fontReady) && (
          <div style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", color: dark ? "rgba(217,177,95,0.45)" : "rgba(107,100,90,0.55)", fontSize: 12, letterSpacing: ".08em" }}>
            <span>loading V1…</span>
          </div>
        )}
        {!error && lines && fontReady && (
          <div style={{ padding: "0 4px" }}>
            {lines.map(line => (
              <div key={line.ln} style={{
                direction: "rtl",
                display: "flex",
                justifyContent: line.hasBismillah || line.hasSurahName ? "center" : "space-between",
                alignItems: "center",
                fontFamily: `'p${pageNum}-v1', serif`,
                fontSize: "clamp(20px,5vw,28px)",
                color: dark ? "#E8DFC0" : "#2D2A26",
                padding: "3px 0",
                whiteSpace: "nowrap",
                gap: line.hasBismillah || line.hasSurahName ? "0.25em" : "0.10em",
                lineHeight: 1.9,
              }}>
                {line.text.split(" ").map((w, wi) => <span key={wi}>{w}</span>)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
