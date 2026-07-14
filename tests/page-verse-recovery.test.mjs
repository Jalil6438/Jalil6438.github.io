// QCF page-boundary recovery — regression tests.
//
// The bug: quran.com's by_page/{N} omits a handful of verses that our KFGQPC v2
// layout really does place on page N. The tracker already backfilled them — but
// with words=false, so they arrived with no code_v2, and AyahDrawer fell to the
// text_uthmani path and drew a SYNTHETIC end-of-ayah ornament instead of the
// authentic QCF glyph.
//
// The fix re-fetches them from the ADJACENT endpoint page with words=true. The
// acceptance rules below are strict for one specific reason: the QCF font is
// PAGE-SPECIFIC (`p{N}-v2`), so a word carrying the neighbour's page_number would
// be rendered through the wrong font and produce visibly wrong Arabic. That is far
// worse than the synthetic ornament we are replacing, so anything we cannot prove
// belongs to this page is refused and left to the safe fallback.
//
// Representative ayahs are used from BOTH mismatch directions. The 56-ayah list is
// deliberately NOT encoded anywhere — in the fixtures or in the production logic.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  neighborPagesFor,
  missingVerseKeys,
  isRecoverableVerse,
  insertVerseInOrder,
  recoverMissingVerses,
} from "../src/quran/pageVerseRecovery.js";

// ── fixtures shaped exactly like the API's words=true response ─────────────

const word = (code, page, type = "word") => ({
  code_v2: code, page_number: page, char_type_name: type, line_number: 1,
});

// A well-formed verse living on `page`: some words plus exactly one end glyph.
const verse = (key, page, { words, ...over } = {}) => ({
  verse_key: key,
  page_number: page,
  text_uthmani: "بِسْمِ ٱللَّهِ",
  juz_number: 30,
  words: words || [word("", page), word("", page), word("", page, "end")],
  ...over,
});

// REAL cases, taken from the full 604-page scan — not invented. Directions
// verified against the live API, because a fixture I made up can agree with a
// schema I made up while both disagree with reality.
//
//   96:13  Al-'Alaq   our p598, recovered from the PREVIOUS endpoint page (43 like it)
//   74:18  Muddaththir our p575, recovered from the NEXT endpoint page     (13 like it)
//   97:1   Al-Qadr    our p598, present in the primary response — the CONTROL.
//                     It sits on the SAME page as 96:13 and was never broken, which
//                     is what makes the two a fair before/after comparison.
const PAGE = 598;                 // Al-'Alaq / Al-Qadr
const ALAQ_13 = "96:13";          // was synthetic; recovered from PAGE - 1
const QADR_1 = "97:1";            // control — always had its QCF ending

const PAGE_NEXT_DIR = 575;        // Al-Muddaththir
const MUDD_18 = "74:18";          // was synthetic; recovered from PAGE_NEXT_DIR + 1

// ── neighbours ────────────────────────────────────────────────────────────

test("both directions are searched — never just one", () => {
  // 43 of the 56 are on the previous page and 13 on the next. Assuming a single
  // direction would have silently left 13 ayahs broken.
  assert.deepEqual(neighborPagesFor(300), [299, 301]);
  assert.deepEqual(neighborPagesFor(1), [2], "page 1 has no previous page");
  assert.deepEqual(neighborPagesFor(604), [603], "page 604 has no next page");
});

test("missingVerseKeys reports exactly what the primary response omitted", () => {
  const have = [verse("96:11", PAGE), verse("96:12", PAGE)];
  const expected = ["96:11", "96:12", ALAQ_13, QADR_1];
  assert.deepEqual(missingVerseKeys(expected, have), [ALAQ_13, QADR_1]);
  assert.deepEqual(missingVerseKeys(expected, []), expected);
  assert.deepEqual(missingVerseKeys([], have), []);
});

// ── recovery, both directions ─────────────────────────────────────────────

const pagesWith = (map) => async (pn) => map[pn] ?? null;

test("PREVIOUS-page direction: 96:13 is recovered (43 of the 56 look like this)", async () => {
  const recovered = await recoverMissingVerses({
    mushafPage: PAGE,
    missing: [ALAQ_13],
    fetchPageVerses: pagesWith({
      // The API filed it under p597 — but it still reports p598 in the verse AND
      // in every word. Its grouping disagrees with its own field.
      [PAGE - 1]: [verse("96:9", PAGE - 1), verse(ALAQ_13, PAGE)],
      [PAGE + 1]: [verse("98:1", PAGE + 1)],
    }),
  });

  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].verse_key, ALAQ_13);
  assert.ok(recovered[0].words.some((w) => w.code_v2), "must arrive WITH QCF words — that is the whole point");
  assert.equal(recovered[0].words.filter((w) => w.char_type_name === "end").length, 1);
});

test("NEXT-page direction: 74:18 is recovered (13 of the 56 look like this)", async () => {
  const recovered = await recoverMissingVerses({
    mushafPage: PAGE_NEXT_DIR,
    missing: [MUDD_18],
    fetchPageVerses: pagesWith({
      [PAGE_NEXT_DIR - 1]: [verse("74:1", PAGE_NEXT_DIR - 1)],
      [PAGE_NEXT_DIR + 1]: [verse(MUDD_18, PAGE_NEXT_DIR), verse("74:31", PAGE_NEXT_DIR + 1)],
    }),
  });

  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].verse_key, MUDD_18);
  assert.ok(recovered[0].words.every((w) => w.page_number === PAGE_NEXT_DIR));
});

test("the CONTROL ayah (97:1) is untouched — it was never missing", () => {
  // 97:1 sits on the same page as 96:13 and always had its QCF ending. Recovery
  // must not touch it, re-import it, or reorder it.
  const missing = new Set([ALAQ_13]);
  assert.equal(isRecoverableVerse(verse(QADR_1, PAGE), PAGE, missing), false,
    "a healthy verse is not a recovery candidate");
});

// ── strict acceptance ─────────────────────────────────────────────────────

test("REJECTED when verse.page_number does not match our page", () => {
  const missing = new Set([ALAQ_13]);
  // It is in the neighbour's response and it is a verse we want — but it says it
  // lives on the neighbour page. Taking it would place a verse on the wrong page.
  assert.equal(isRecoverableVerse(verse(ALAQ_13, PAGE - 1), PAGE, missing), false);
  assert.equal(isRecoverableVerse(verse(ALAQ_13, PAGE), PAGE, missing), true);
});

test("REJECTED when any word.page_number does not match our page", () => {
  const missing = new Set([ALAQ_13]);

  // The verse claims our page, but a word claims the neighbour's. Its code_v2 is a
  // PUA codepoint that only means the right glyph in ITS page's font — rendering
  // it under p597's font would produce garbage Arabic.
  const strayWord = verse(ALAQ_13, PAGE, {
    words: [word("", PAGE), word("", PAGE - 1), word("", PAGE, "end")],
  });
  assert.equal(isRecoverableVerse(strayWord, PAGE, missing), false);

  const strayEnd = verse(ALAQ_13, PAGE, {
    words: [word("", PAGE), word("", PAGE + 1, "end")],
  });
  assert.equal(isRecoverableVerse(strayEnd, PAGE, missing), false);
});

test("REJECTED unless there is EXACTLY ONE end glyph", () => {
  const missing = new Set([ALAQ_13]);

  const noEnd = verse(ALAQ_13, PAGE, { words: [word("", PAGE), word("", PAGE)] });
  assert.equal(isRecoverableVerse(noEnd, PAGE, missing), false, "no ornament at all");

  const twoEnds = verse(ALAQ_13, PAGE, {
    words: [word("", PAGE), word("", PAGE, "end"), word("", PAGE, "end")],
  });
  assert.equal(isRecoverableVerse(twoEnds, PAGE, missing), false, "a duplicated ornament");
});

test("REJECTED when the verse has no QCF words — that IS the bug", () => {
  const missing = new Set([ALAQ_13]);

  const noWords = verse(ALAQ_13, PAGE, { words: [] });
  assert.equal(isRecoverableVerse(noWords, PAGE, missing), false);

  const undefinedWords = { verse_key: ALAQ_13, page_number: PAGE, text_uthmani: "…" };
  assert.equal(isRecoverableVerse(undefinedWords, PAGE, missing), false);

  const noCode = verse(ALAQ_13, PAGE, {
    words: [{ page_number: PAGE, char_type_name: "word" }, word("", PAGE, "end")],
  });
  assert.equal(isRecoverableVerse(noCode, PAGE, missing), false, "a word with no code_v2 is not recovered");
});

test("UNRELATED neighbour verses are never imported", async () => {
  // The neighbour page is full of verses that legitimately live there. Not one of
  // them may be dragged onto our page just because we happened to fetch it.
  const recovered = await recoverMissingVerses({
    mushafPage: PAGE,
    missing: [ALAQ_13],
    fetchPageVerses: pagesWith({
      [PAGE - 1]: [
        verse("96:6", PAGE - 1),
        verse("96:7", PAGE - 1),
        verse(ALAQ_13, PAGE),
        verse("96:8", PAGE - 1),
      ],
      [PAGE + 1]: [verse("97:3", PAGE + 1), verse("97:4", PAGE + 1)],
    }),
  });

  assert.deepEqual(recovered.map((v) => v.verse_key), [ALAQ_13],
    "only the verse we were missing may be taken");
});

test("a verse we are NOT missing is refused even if it claims our page", () => {
  // Defends against double-import: it is already in the primary response.
  assert.equal(isRecoverableVerse(verse("96:12", PAGE), PAGE, new Set([ALAQ_13])), false);
});

test("the same key is never imported twice across both neighbours", async () => {
  const recovered = await recoverMissingVerses({
    mushafPage: PAGE,
    missing: [ALAQ_13],
    fetchPageVerses: pagesWith({
      [PAGE - 1]: [verse(ALAQ_13, PAGE)],
      [PAGE + 1]: [verse(ALAQ_13, PAGE)],   // present on BOTH
    }),
  });
  assert.equal(recovered.length, 1);
});

// ── ordering ──────────────────────────────────────────────────────────────

test("verse ordering is preserved on insert", () => {
  const vs = [verse("96:11", PAGE), verse("96:12", PAGE), verse("97:2", PAGE)];

  insertVerseInOrder(vs, verse(ALAQ_13, PAGE));   // between 96:12 and 97:2
  insertVerseInOrder(vs, verse(QADR_1, PAGE));    // between 96:13 and 97:2

  assert.deepEqual(vs.map((v) => v.verse_key), ["96:11", "96:12", "96:13", "97:1", "97:2"]);
});

test("insertion handles the ends of the list", () => {
  const vs = [verse("96:12", PAGE)];
  insertVerseInOrder(vs, verse("96:1", PAGE));     // before everything
  insertVerseInOrder(vs, verse("97:5", PAGE));     // after everything
  assert.deepEqual(vs.map((v) => v.verse_key), ["96:1", "96:12", "97:5"]);
});

test("ayah numbers sort numerically, not lexically", () => {
  const vs = [verse("2:9", PAGE)];
  insertVerseInOrder(vs, verse("2:10", PAGE));
  assert.deepEqual(vs.map((v) => v.verse_key), ["2:9", "2:10"], "2:10 must follow 2:9, not precede it");
});

// ── safe fallback + cancellation ──────────────────────────────────────────

test("when NEITHER neighbour has the verse, recovery returns nothing and the fallback keeps it", async () => {
  const recovered = await recoverMissingVerses({
    mushafPage: PAGE,
    missing: [ALAQ_13],
    fetchPageVerses: pagesWith({ [PAGE - 1]: [verse("96:9", PAGE - 1)], [PAGE + 1]: [] }),
  });
  assert.deepEqual(recovered, [], "nothing unprovable is imported — the text-only fallback still runs");
});

test("a failing neighbour request is survivable, not fatal", async () => {
  const recovered = await recoverMissingVerses({
    mushafPage: PAGE,
    missing: [ALAQ_13],
    fetchPageVerses: async (pn) => {
      if (pn === PAGE - 1) throw new Error("network");
      return [verse(ALAQ_13, PAGE)];          // the other neighbour still works
    },
  });
  assert.deepEqual(recovered.map((v) => v.verse_key), [ALAQ_13]);
});

test("cancellation abandons the recovery and imports nothing", async () => {
  let calls = 0;
  const recovered = await recoverMissingVerses({
    mushafPage: PAGE,
    missing: [ALAQ_13],
    shouldCancel: () => calls > 0,             // cancelled after the first fetch
    fetchPageVerses: async () => {
      calls++;
      return [verse(ALAQ_13, PAGE)];
    },
  });

  assert.deepEqual(recovered, [], "a cancelled page flip must not write verses from the old page");
  assert.equal(calls, 1, "and must stop fetching");
});

test("cancellation before any request does nothing at all", async () => {
  let calls = 0;
  const recovered = await recoverMissingVerses({
    mushafPage: PAGE,
    missing: [ALAQ_13],
    shouldCancel: () => true,
    fetchPageVerses: async () => { calls++; return []; },
  });
  assert.deepEqual(recovered, []);
  assert.equal(calls, 0);
});

test("nothing missing means no neighbour is fetched at all", async () => {
  let calls = 0;
  const recovered = await recoverMissingVerses({
    mushafPage: PAGE,
    missing: [],
    fetchPageVerses: async () => { calls++; return []; },
  });
  assert.deepEqual(recovered, []);
  assert.equal(calls, 0, "the 6,180 healthy pages must not pay for the 56 broken ayahs");
});

test("recovery stops early once everything is found", async () => {
  const seen = [];
  await recoverMissingVerses({
    mushafPage: PAGE,
    missing: [ALAQ_13],
    fetchPageVerses: async (pn) => {
      seen.push(pn);
      return pn === PAGE - 1 ? [verse(ALAQ_13, PAGE)] : [];
    },
  });
  assert.deepEqual(seen, [PAGE - 1], "the next page must not be fetched once the previous one satisfied us");
});

// ── the normalization that must NOT change ────────────────────────────────

test("U+06DF normalization is untouched by recovery", async () => {
  // The tracker replaces U+06DF with U+0652 on text_uthmani AFTER the backfill.
  // Recovery must not pre-empt, skip, or alter that — a recovered verse is fed
  // through the same normalization as every other verse.
  const raw = "بِسْمِ۟ ٱللَّهِ";
  const recovered = await recoverMissingVerses({
    mushafPage: PAGE,
    missing: [ALAQ_13],
    fetchPageVerses: pagesWith({ [PAGE - 1]: [verse(ALAQ_13, PAGE, { text_uthmani: raw })] }),
  });

  assert.equal(recovered[0].text_uthmani, raw,
    "recovery must hand the verse over UNNORMALIZED — the tracker's existing pass does that job");

  // …and that existing pass still works on it, unchanged.
  const normalized = recovered[0].text_uthmani.replace(/۟/g, "ْ");
  assert.equal(normalized.includes("۟"), false);
  assert.ok(normalized.includes("ْ"));
});
