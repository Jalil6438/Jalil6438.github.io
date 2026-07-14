// Deterministic muṣḥaf for the QCF scan gate.
//
// A synthetic, network-free stand-in for quran.com's `verses/by_page/{N}`, built
// from OUR authoritative layout (public/verse-to-page.json). With no defect
// injected it is a PERFECT muṣḥaf: all 604 pages, all 6,236 ayahs, every one
// carrying QCF words and exactly one end glyph — so the real scan run against it
// must certify 6,236/6,236 and exit 0.
//
// Set QCF_SCAN_DEFECT to inject exactly ONE defect and prove the gate exits
// nonzero. This is how we test a gate: not by asserting it reports the truth on
// good data, but by handing it bad data and watching it refuse.
//
//   (none)          perfect muṣḥaf                          -> exit 0
//   synthetic       one ayah with no code_v2 (fallback)     -> exit 1
//   unrecoverable   one ayah absent from its page AND both  -> exit 1
//                   neighbours
//   missing-end     one ayah with no end-of-ayah glyph      -> exit 1
//   duplicate-end   one ayah with two end-of-ayah glyphs    -> exit 1
//   fetch-failure   one page that will not fetch            -> exit 1
//
// It deliberately contains NO page-boundary mismatches of its own: the 56 real
// ones are not encoded here or anywhere else. This fixture tests the GATE, not
// the repair — the repair is tested against real recovered data in
// tests/page-verse-recovery.test.mjs and certified against the live API by the
// scan itself.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const VERSE_TO_PAGE = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../public/verse-to-page.json", import.meta.url)), "utf8"),
);

// The single ayah / page each defect targets. Any page with several ayahs will do.
export const DEFECT_PAGE = 300;

export const DEFECT = process.env.QCF_SCAN_DEFECT || "none";

const byPage = new Map();
for (const [vk, pn] of Object.entries(VERSE_TO_PAGE)) {
  if (!byPage.has(pn)) byPage.set(pn, []);
  byPage.get(pn).push(vk);
}
for (const keys of byPage.values()) {
  keys.sort((a, b) => {
    const [as, aa] = a.split(":").map(Number);
    const [bs, ba] = b.split(":").map(Number);
    return as - bs || aa - ba;
  });
}

export const DEFECT_KEY = (byPage.get(DEFECT_PAGE) || [])[0];

export function expectedByPage() {
  return new Map([...byPage].map(([pn, keys]) => [pn, [...keys]]));
}

const word = (page, type = "word") => ({
  code_v2: "ﯿ",
  page_number: page,
  char_type_name: type,
  line_number: 1,
});

// A healthy verse: QCF words + exactly one end glyph, every word claiming its page.
const healthy = (vk, page) => ({
  verse_key: vk,
  page_number: page,
  juz_number: 1,
  text_uthmani: "…",
  words: [word(page), word(page), word(page, "end")],
});

function build(vk, page) {
  const v = healthy(vk, page);
  if (vk !== DEFECT_KEY) return v;

  switch (DEFECT) {
    // No code_v2 => AyahDrawer takes the text_uthmani path => SYNTHETIC ornament.
    // This is the exact shape the old words=false backfill produced.
    case "synthetic":
      return { ...v, words: [] };
    case "missing-end":
      return { ...v, words: [word(page), word(page)] };
    case "duplicate-end":
      return { ...v, words: [word(page), word(page, "end"), word(page, "end")] };
    default:
      return v;
  }
}

export async function fetchPage(pn) {
  if (DEFECT === "fetch-failure" && pn === DEFECT_PAGE) return null;

  const keys = byPage.get(pn) || [];
  const verses = keys.map((vk) => build(vk, pn));

  // Absent from its own page and from both neighbours: nothing to recover from,
  // so the safe fallback keeps it — and the gate must refuse to certify.
  if (DEFECT === "unrecoverable" && Math.abs(pn - DEFECT_PAGE) <= 1) {
    return verses.filter((v) => v.verse_key !== DEFECT_KEY);
  }

  return verses;
}
