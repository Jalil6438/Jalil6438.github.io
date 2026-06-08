import { useState, useEffect } from "react";

// Loads the authoritative KFGQPC V2 mushaf layout data:
//   - mushaf-pages.json  → per-page line strings (PUA glyphs)
//   - mushaf-layout.json → per-line alignment + entry types (surah_name / ayah)
// Optionally also loads verse-to-page.json (the Madinah verse→page map) for
// callers that reconcile the API's page boundaries against the Madinah mushaf.
//
// Shared by MyHifzTab (withVerseToPage) and MyMemorizationView (pages+layout
// only) — both previously duplicated this fetch. The verse-to-page request is
// opt-in so each caller makes exactly the network requests it made before.
export function useMushafData({ withVerseToPage = false } = {}) {
  const [mushafPagesData, setMushafPagesData] = useState(null);
  const [mushafLayoutData, setMushafLayoutData] = useState(null);
  const [verseToPageMap, setVerseToPageMap] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const requests = [
          fetch("/v2/mushaf-pages.json"),
          fetch("/v2/mushaf-layout.json"),
        ];
        if (withVerseToPage) requests.push(fetch("/verse-to-page.json"));
        const [p, l, v] = await Promise.all(requests);
        if (!cancelled && p.ok) setMushafPagesData(await p.json());
        if (!cancelled && l.ok) setMushafLayoutData(await l.json());
        if (withVerseToPage && !cancelled && v && v.ok)
          setVerseToPageMap(await v.json());
      } catch {
        /* network/parse failure — leave data null, callers show a loading state */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [withVerseToPage]);
  return { mushafPagesData, mushafLayoutData, verseToPageMap };
}
