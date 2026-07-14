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
//
// ── THIS IS A GATE, NOT A REPORT ──────────────────────────────────────────
// The scan CERTIFIES the repair: it exits 0 only when every one of the 6,236
// ayahs reaches the authentic QCF path, and exits 1 on ANY defect — a surviving
// synthetic ornament, an unrecoverable ayah, coverage below the expected total,
// a missing or duplicated end glyph, or a page that failed to fetch. A scan that
// printed a defect and still exited 0 would be worse than no scan at all: it
// would certify a broken muṣḥaf to anyone reading the exit code.
//
// ── TEST SEAM ─────────────────────────────────────────────────────────────
// certifyScan() and runScan() are exported pure/injectable so the gate itself is
// under test (tests/scan-qcf-certification.test.mjs). Setting QCF_SCAN_FIXTURE to
// a module path drives THIS script off a synthetic muṣḥaf instead of the network,
// which is how we prove a bad result really does exit nonzero. Fixture mode is
// loudly labelled and can never masquerade as a live certification.

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import {
  missingVerseKeys,
  recoverMissingVerses,
  isRecoverableVerse,
} from "../src/quran/pageVerseRecovery.js";

const TOTAL_PAGES = 604;

const API = (pn) =>
  `https://api.quran.com/api/v4/verses/by_page/${pn}?words=true&word_fields=text_uthmani,line_number,code_v2,char_type_name,page_number&fields=text_uthmani,verse_key,page_number,juz_number&per_page=50`;

const CONCURRENCY = 6;

// ── the live fetcher ──────────────────────────────────────────────────────
// Returns the page's verses, or null if the page could not be fetched at all.
// null is a FAILURE, not an empty page: it must never be mistaken for "this page
// legitimately has no problems".
export function liveFetcher() {
  const cache = new Map();
  return async function fetchPage(pn) {
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
  };
}

// Expected verse keys per page, from OUR authoritative KFGQPC v2 layout.
export function expectedByPageFromMap(verseToPage) {
  const byPage = new Map();
  for (const [vk, pn] of Object.entries(verseToPage)) {
    if (!byPage.has(pn)) byPage.set(pn, []);
    byPage.get(pn).push(vk);
  }
  return byPage;
}

export function loadExpectedByPage() {
  const json = JSON.parse(
    readFileSync(fileURLToPath(new URL("../public/verse-to-page.json", import.meta.url)), "utf8"),
  );
  return expectedByPageFromMap(json);
}

const renderedWords = (v) =>
  (v.words || []).filter(
    (w) => !w.char_type_name || w.char_type_name === "word" || w.char_type_name === "end",
  );

// Does AyahDrawer take the QCF path for this verse object?
const usesQcf = (v) => renderedWords(v).some((w) => w.code_v2);
const endGlyphs = (v) => renderedWords(v).filter((w) => w.char_type_name === "end").length;

// ── THE CERTIFICATION ─────────────────────────────────────────────────────
//
// Pure. Every defect the scan can observe fails the gate — there is no defect it
// can see and shrug at. Returns the reasons too, so a FAIL says WHY.
export function certifyScan(stats, unrecoverable = []) {
  const ok =
    stats.pageFetchFailures === 0 &&
    stats.afterQcf === stats.totalExpected &&
    stats.afterSynthetic === 0 &&
    unrecoverable.length === 0 &&
    stats.missingEndGlyph === 0 &&
    stats.duplicateEndGlyph === 0;

  const failures = [];
  if (stats.pageFetchFailures !== 0)
    failures.push(`${stats.pageFetchFailures} page(s) failed to fetch — the scan is incomplete`);
  if (stats.afterQcf !== stats.totalExpected)
    failures.push(
      `authentic QCF coverage ${stats.afterQcf} != ${stats.totalExpected} expected ayahs`,
    );
  if (stats.afterSynthetic !== 0)
    failures.push(`${stats.afterSynthetic} ayah(s) still render the SYNTHETIC fallback ornament`);
  if (unrecoverable.length !== 0)
    failures.push(`${unrecoverable.length} ayah(s) unrecoverable: ${unrecoverable.join(", ")}`);
  if (stats.missingEndGlyph !== 0)
    failures.push(`${stats.missingEndGlyph} ayah(s) have NO end-of-ayah glyph`);
  if (stats.duplicateEndGlyph !== 0)
    failures.push(`${stats.duplicateEndGlyph} ayah(s) have a DUPLICATE end-of-ayah glyph`);

  return { ok, failures };
}

export function emptyStats() {
  return {
    totalExpected: 0,
    beforeQcf: 0, beforeSynthetic: 0,
    afterQcf: 0, afterSynthetic: 0,
    recovered: 0, recoveredPrev: 0, recoveredNext: 0,
    missingEndGlyph: 0, duplicateEndGlyph: 0,
    pageFetchFailures: 0,
  };
}

// ── THE SCAN ──────────────────────────────────────────────────────────────
//
// `fetchPage(pageNumber)` -> verses[] | null (null = fetch failure). Injected, so
// the scan runs against the live API in production use and against a synthetic
// muṣḥaf under test, with the SAME code path deciding pass or fail.
export async function runScan({ fetchPage, expectedByPage, pages }) {
  const stats = emptyStats();
  const recoveredKeys = [];
  const unrecoverable = [];

  for (const pn of pages) {
    const primary = await fetchPage(pn);
    if (!Array.isArray(primary)) { stats.pageFetchFailures++; continue; }

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
    if (missing.length) {
      const recovered = await recoverMissingVerses({
        mushafPage: pn,
        missing,
        fetchPageVerses: fetchPage,
      });
      for (const v of recovered) {
        recoveredKeys.push(v.verse_key);
        const prev = await fetchPage(pn - 1);
        const fromPrev =
          Array.isArray(prev) &&
          prev.some(
            (x) => x.verse_key === v.verse_key && isRecoverableVerse(x, pn, new Set([v.verse_key])),
          );
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

  return { stats, recoveredKeys, unrecoverable };
}

export function printReport({ stats, recoveredKeys, unrecoverable }, { fixture = null } = {}) {
  const line = (k, v) => console.log(`  ${k.padEnd(34)} ${v}`);
  console.log("\n════ FULL-MUṢḤAF QCF ENDING SCAN ════");
  line("pages scanned", TOTAL_PAGES - stats.pageFetchFailures);
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

  const { ok, failures } = certifyScan(stats, unrecoverable);

  if (!ok) {
    console.log("\n  ── WHY THIS SCAN FAILED ──");
    for (const f of failures) console.log(`  ✗ ${f}`);
  }

  const suffix = fixture ? "  [FIXTURE — NOT a live certification]" : "";
  console.log(
    `\n${ok ? "PASS" : "FAIL"} — ${stats.afterQcf}/${stats.totalExpected} ayahs on the authentic QCF path${suffix}\n`,
  );

  return ok;
}

// ── entry point ───────────────────────────────────────────────────────────
async function main() {
  const fixture = process.env.QCF_SCAN_FIXTURE || null;

  let fetchPage, expectedByPage;
  if (fixture) {
    // Test seam. Loudly labelled: a fixture run can never be mistaken for, or
    // quoted as, a certification of the live muṣḥaf.
    console.log(`[scan] ⚠ FIXTURE MODE — synthetic muṣḥaf from ${fixture}`);
    console.log("[scan] ⚠ This exercises the GATE, not the Qur'an. Not a live certification.");
    const mod = await import(pathToFileURL(resolve(fixture)).href);
    fetchPage = mod.fetchPage;
    expectedByPage = mod.expectedByPage();
  } else {
    console.log("[scan] fetching 604 pages…");
    fetchPage = liveFetcher();
    expectedByPage = loadExpectedByPage();
    const pages = [...Array(TOTAL_PAGES)].map((_, i) => i + 1);
    for (let i = 0; i < pages.length; i += CONCURRENCY) {
      await Promise.all(pages.slice(i, i + CONCURRENCY).map(fetchPage));
      if ((i / CONCURRENCY) % 20 === 0) process.stdout.write(".");
    }
    console.log("\n[scan] analysing…");
  }

  const pages = [...Array(TOTAL_PAGES)].map((_, i) => i + 1);
  const result = await runScan({ fetchPage, expectedByPage, pages });

  const ok = printReport(result, { fixture });
  if (!ok) process.exitCode = 1;
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
