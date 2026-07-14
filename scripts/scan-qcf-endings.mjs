// Full-muṣḥaf QCF ending scan — 604 pages, 6,236 ayahs.
//
// Answers one question for every ayah: when AyahDrawer opens it, does it get the
// AUTHENTIC QCF end-of-ayah glyph, or the synthetic fallback ornament?
//
// AyahDrawer's rule (components/AyahDrawer.jsx:165) is exactly:
//     selVerse.words?.some(w => w.code_v2)   ->  QCF path (per-page font)
//     else                                   ->  text_uthmani + SYNTHETIC ornament
//
// So an ayah is "QCF-correct" iff, after the tracker's backfill, its verse object
// carries words[] with code_v2 and exactly one end glyph.
//
//   BEFORE : the old backfill fetched missing verses with words=false, so every
//            page-boundary mismatch landed on the synthetic path.
//   AFTER  : recoverMissingVerses() re-fetches them from the adjacent endpoint
//            page with words=true, under strict acceptance.
//
//   node scripts/scan-qcf-endings.mjs
//
// Reads the live quran.com API. Every page is fetched ONCE and cached, so the
// neighbour lookups cost nothing extra and the scan is ~604 requests.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  missingVerseKeys,
  recoverMissingVerses,
  isRecoverableVerse,
} from "../src/quran/pageVerseRecovery.js";

const VERSE_TO_PAGE = JSON.parse(
  readFileSync(fileURLToPath(new URL("../public/verse-to-page.json", import.meta.url)), "utf8"),
);

const API = (pn) =>
  `https://api.quran.com/api/v4/verses/by_page/${pn}?words=true&word_fields=text_uthmani,line_number,code_v2,char_type_name,page_number&fields=text_uthmani,verse_key,page_number,juz_number&per_page=50`;

const CONCURRENCY = 6;
const cache = new Map();

async function fetchPage(pn) {
  if (cache.has(pn)) return cache.get(pn);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(API(pn));
      if (r.status === 429 || r.status >= 500) {
        await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
        continue;
      }
      if (!r.ok) break;
      const d = await r.json();
      const verses = d.verses || [];
      cache.set(pn, verses);
      return verses;
    } catch {
      await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
    }
  }
  cache.set(pn, null);
  return null;
}

// Expected verse keys per page, from OUR authoritative KFGQPC v2 layout.
const expectedByPage = new Map();
for (const [vk, pn] of Object.entries(VERSE_TO_PAGE)) {
  if (!expectedByPage.has(pn)) expectedByPage.set(pn, []);
  expectedByPage.get(pn).push(vk);
}

const renderedWords = (v) =>
  (v.words || []).filter(
    (w) => !w.char_type_name || w.char_type_name === "word" || w.char_type_name === "end",
  );

// Does AyahDrawer take the QCF path for this verse object?
const usesQcf = (v) => renderedWords(v).some((w) => w.code_v2);
const endGlyphs = (v) => renderedWords(v).filter((w) => w.char_type_name === "end").length;

async function main() {
  console.log("[scan] fetching 604 pages…");
  const pages = [...Array(604)].map((_, i) => i + 1);

  for (let i = 0; i < pages.length; i += CONCURRENCY) {
    await Promise.all(pages.slice(i, i + CONCURRENCY).map(fetchPage));
    if ((i / CONCURRENCY) % 20 === 0) process.stdout.write(".");
  }
  console.log("\n[scan] analysing…");

  const stats = {
    totalExpected: 0,
    beforeQcf: 0, beforeSynthetic: 0,
    afterQcf: 0, afterSynthetic: 0,
    recovered: 0, recoveredPrev: 0, recoveredNext: 0,
    missingEndGlyph: 0, duplicateEndGlyph: 0,
    pageFetchFailures: 0,
  };
  const recoveredKeys = [];
  const unrecoverable = [];

  for (const pn of pages) {
    const primary = await fetchPage(pn);
    if (primary === null) { stats.pageFetchFailures++; continue; }

    const expected = expectedByPage.get(pn) || [];
    stats.totalExpected += expected.length;

    const byKey = new Map(primary.map((v) => [v.verse_key, v]));

    // BEFORE: present-in-primary => QCF; missing => old backfill used words=false
    //         => no code_v2 => synthetic ornament.
    for (const vk of expected) {
      const v = byKey.get(vk);
      if (v && usesQcf(v)) stats.beforeQcf++;
      else stats.beforeSynthetic++;
    }

    // AFTER: run the real recovery against the real (cached) neighbour pages.
    const missing = missingVerseKeys(expected, primary);
    let recovered = [];
    if (missing.length) {
      recovered = await recoverMissingVerses({
        mushafPage: pn,
        missing,
        fetchPageVerses: fetchPage,
      });
      for (const v of recovered) {
        recoveredKeys.push(v.verse_key);
        const prev = await fetchPage(pn - 1);
        const fromPrev = Array.isArray(prev)
          && prev.some((x) => x.verse_key === v.verse_key && isRecoverableVerse(x, pn, new Set([v.verse_key])));
        if (fromPrev) stats.recoveredPrev++; else stats.recoveredNext++;
        byKey.set(v.verse_key, v);
      }
      stats.recovered += recovered.length;

      for (const vk of missingVerseKeys(expected, [...byKey.values()])) unrecoverable.push(vk);
    }

    for (const vk of expected) {
      const v = byKey.get(vk);
      if (v && usesQcf(v)) {
        stats.afterQcf++;
        const n = endGlyphs(v);
        if (n === 0) stats.missingEndGlyph++;
        if (n > 1) stats.duplicateEndGlyph++;
      } else {
        stats.afterSynthetic++;
      }
    }
  }

  const line = (k, v) => console.log(`  ${k.padEnd(34)} ${v}`);
  console.log("\n════ FULL-MUṢḤAF QCF ENDING SCAN ════");
  line("pages scanned", 604 - stats.pageFetchFailures);
  line("page fetch failures", stats.pageFetchFailures);
  line("ayahs expected (our layout)", stats.totalExpected);
  console.log("\n  BEFORE (words=false backfill)");
  line("  authentic QCF ending", stats.beforeQcf);
  line("  SYNTHETIC fallback ornament", stats.beforeSynthetic);
  console.log("\n  AFTER (neighbour recovery)");
  line("  authentic QCF ending", stats.afterQcf);
  line("  SYNTHETIC fallback ornament", stats.afterSynthetic);
  console.log("\n  RECOVERY");
  line("  recovered", stats.recovered);
  line("    from previous page", stats.recoveredPrev);
  line("    from next page", stats.recoveredNext);
  line("  unrecoverable (safe fallback)", unrecoverable.length);
  console.log("\n  INTEGRITY");
  line("  missing end glyph", stats.missingEndGlyph);
  line("  duplicate end glyph", stats.duplicateEndGlyph);

  if (recoveredKeys.length) {
    console.log(`\n  recovered keys (${recoveredKeys.length}):`);
    console.log("   ", recoveredKeys.join(", "));
  }
  if (unrecoverable.length) {
    console.log(`\n  unrecoverable (${unrecoverable.length}):`);
    console.log("   ", unrecoverable.join(", "));
  }

  const ok = stats.missingEndGlyph === 0 && stats.duplicateEndGlyph === 0 && stats.pageFetchFailures === 0;
  console.log(`\n${ok ? "PASS" : "CHECK"} — ${stats.afterQcf}/${stats.totalExpected} ayahs on the authentic QCF path\n`);
}

main();
