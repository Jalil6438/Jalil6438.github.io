import { useState } from "react";

// KFGQPC V2 per-page Quran fonts — one @font-face per mushaf page (p{N}-v2),
// loaded on demand from the quran.com CDN and registered once in <head>. Tracks
// which pages have finished downloading in `loadedFonts` (keyed by page number)
// so the renderer can switch a page from a fallback font to its authentic
// per-page glyph font once ready.
//
// Shared by MyHifzTab and MyMemorizationView — both previously carried an
// identical copy of this loader.
export function useQcfFont() {
  const [loadedFonts, setLoadedFonts] = useState(() => new Set());
  const loadQcfFont = (pageN) => {
    if (!pageN || pageN < 1 || pageN > 604) return;
    const family = `p${pageN}-v2`;
    const elId = `qcf-font-${family}`;
    if (!document.getElementById(elId)) {
      const style = document.createElement("style");
      style.id = elId;
      style.textContent = `@font-face{font-family:'${family}';src:url('https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v2/woff2/p${pageN}.woff2') format('woff2'),url('https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v2/woff/p${pageN}.woff') format('woff');font-display:block;}`;
      document.head.appendChild(style);
    }
    if (loadedFonts.has(pageN)) return;
    if (document.fonts && document.fonts.load) {
      document.fonts
        .load(`16px '${family}'`)
        .then(() => {
          setLoadedFonts((prev) => {
            const n = new Set(prev);
            n.add(pageN);
            return n;
          });
        })
        .catch(() => {});
    }
  };
  return { loadedFonts, loadQcfFont };
}
