// Pure al-Qasim hifz-method domain logic, extracted from MyHifzTab (Wave 2).
// No React/DOM — safe to unit-test in isolation.
export { buildConnSurahGroups, buildConnectionPairs } from "./buildConnectionPairs.js";
export { buildClosers, SECTION_SPLIT_LINE_THRESHOLD } from "./buildClosers.js";
export { buildPageBatch, capToMadinahPage } from "./buildSessionBatch.js";
export { filterActivePlusFresh } from "./filterMushafPage.js";
// Connection-phase key builders + validator — the single source of truth shared
// with the backup schema (src/backup/progressSchema.js).
export {
  pairKey, closerKey, closerSectionKey,
  legacyIndexPairKey, legacyAllKey,
  parseConnectionKey, isConnectionKey,
  CONNECTION_KEY_FAMILIES, CLOSER_SECTIONS,
} from "./connectionKeys.js";
