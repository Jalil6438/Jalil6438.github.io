import { useEffect } from "react";

// Injects the app's web fonts once on mount — the Google Fonts stylesheet plus
// the locally-served Quran faces (UthmanicHafs / KFGQPC) and the surah-names
// font. Extracted verbatim from the root component; no state, no props.
export default function useInjectedFonts() {
  useEffect(()=>{
    const l=document.createElement("link"); l.rel="stylesheet";
    l.href="https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&family=Playfair+Display:wght@600;700&family=IBM+Plex+Mono:wght@400;600&family=DM+Sans:wght@400;500;600&display=swap";
    // Load UthmanicHafs for Interactive Quran mode — served locally to avoid CORS
    const ufs=document.createElement("style");
    ufs.textContent="@font-face{font-family:'UthmanicHafs';src:url('/UthmanicHafs1Ver18.woff2') format('woff2');font-display:swap;}@font-face{font-family:'KFGQPC';src:url('/fonts/KFGQPC.otf') format('opentype');font-display:swap;}@font-face{font-family:'KFGQPC Uthmanic Script HAFS';src:url('/fonts/KFGQPC.otf') format('opentype');font-display:swap;}@font-face{font-family:'surah-names';src:url('https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/surah-names/v1/sura_names.woff2') format('woff2');font-display:block;}";
    document.head.appendChild(ufs);
    document.head.appendChild(l);
  },[]);
}
