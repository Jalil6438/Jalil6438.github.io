import { useState, useEffect } from "react";

// Fetches the universal bismillah glyphs once (Fatihah 1:1, code_v2 / KFGQPC V2
// PUA) and ensures the p1 font is loaded, so every surah-opener bismillah renders
// in the authentic page-1 style. Pass the page-font loader from useQcfFont.
//
// Shared by MyHifzTab and MyMemorizationView — both previously carried an
// identical copy of this effect.
export function useBismillah(loadQcfFont) {
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
      } catch {
        /* network/parse failure — leave glyphs null, callers fall back to Amiri */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return bismillahGlyphs;
}
