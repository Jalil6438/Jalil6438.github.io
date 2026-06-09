import { useState } from "react";
import { SURAH_EN, JUZ_RANGES } from "../data/constants";
import { toArabicDigits, normalizeUthmani } from "../utils";

// ── Mutashābihāt (المتشابهات) panel ──────────────────────────────────────────
// Purpose: help the memorizer answer "when I hit this wording, which occurrence
// am I reciting?" — so the CURRENT ayah stays primary (rendered by the host) and
// each look-alike is shown with its before/after context + where it lives.
//
// Host-agnostic: text is resolved through resolveText(key) (host looks in its
// batch / sessionVerses / simVerseCache) and missing neighbors are loaded via
// requestFetch(centerKey) (host's fetchSimVerse caches centerKey±1 by plain key).

const cmpVk = (x, y) => { const [xs, xa] = x.split(":").map(Number), [ys, ya] = y.split(":").map(Number); return xs - ys || xa - ya; };
const verseJuz = (vk) => { for (const j of Object.keys(JUZ_RANGES)) { const r = JUZ_RANGES[j]; if (cmpVk(r.start, vk) <= 0 && cmpVk(vk, r.end) <= 0) return Number(j); } return null; };

// Similarity-type architecture — ready for the V2 dataset. Current dataset has no
// type, so no stars render; when a match carries {type, score} they appear.
const TYPE_META = {
  exact: { label: "Exact Match", stars: 5 },
  near: { label: "Near Match", stars: 4 },
  shared_ending: { label: "Shared Ending", stars: 3 },
  shared_opening: { label: "Shared Opening", stars: 2 },
};
// normalize a match: current data = bare "s:a" string; V2 = { key, type, score }
const normMatch = (m) => (typeof m === "string" ? { key: m } : m && { key: m.key, type: m.type, score: m.score });

export default function SimilarVerses({ mvKey, matches, completedAyahs, sessionJuz, dark, resolveText, requestFetch }) {
  const list = (matches || []).map(normMatch).filter((m) => m && m.key);
  if (!list.length) return null;
  // Priority: 1) already memorized (the real confusion source) 2) current juz 3) future.
  const ranked = list
    .map((m) => {
      const memorized = !!(completedAyahs && completedAyahs.has && completedAyahs.has(m.key));
      const juz = verseJuz(m.key);
      const currentJuz = !memorized && !!sessionJuz && juz === sessionJuz;
      return { ...m, memorized, juz, rank: memorized ? 0 : currentJuz ? 1 : 2 };
    })
    .sort((a, b) => a.rank - b.rank || (b.score || 0) - (a.score || 0) || cmpVk(a.key, b.key));

  return (
    <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: dark ? "rgba(230,140,40,0.06)" : "rgba(180,100,20,0.04)", border: dark ? "1px solid rgba(230,140,40,0.15)" : "1px solid rgba(180,100,20,0.10)" }}>
      <div style={{ fontSize: 10, color: dark ? "rgba(230,184,74,0.55)" : "rgba(140,100,20,0.55)", letterSpacing: ".10em", textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>Similar Verses · المتشابهات</div>
      {ranked.map((m) => <SimilarMatch key={m.key} mvKey={mvKey} m={m} dark={dark} resolveText={resolveText} requestFetch={requestFetch} />)}
      <div style={{ fontSize: 9, color: dark ? "rgba(243,231,200,0.25)" : "rgba(0,0,0,0.25)", marginTop: 4 }}>Compare these verses to strengthen your memorization</div>
    </div>
  );
}

function SimilarMatch({ mvKey, m, dark, resolveText, requestFetch }) {
  const [open, setOpen] = useState(false);
  const simKey = m.key;
  const [ss, sa] = simKey.split(":");
  const saN = Number(sa);
  const prevKey = saN > 1 ? `${ss}:${saN - 1}` : null;
  const nextKey = `${ss}:${saN + 1}`;
  const simText = resolveText(simKey);
  const prevText = prevKey ? resolveText(prevKey) : "";
  const nextText = resolveText(nextKey);
  if (!simText) requestFetch(simKey); // loads simKey ± 1

  const [ms, ma] = mvKey.split(":");
  const maN = Number(ma);
  const mvPrevKey = maN > 1 ? `${ms}:${maN - 1}` : null;
  const mvNextKey = `${ms}:${maN + 1}`;
  if (open && !resolveText(mvNextKey) && !(mvPrevKey && resolveText(mvPrevKey))) requestFetch(mvKey);

  const tm = m.type && TYPE_META[m.type];
  const status = m.memorized
    ? { txt: "✓ Already Memorized", c: dark ? "#4ADE80" : "#2ECC71" }
    : m.rank === 1
      ? { txt: "◐ Current Juz", c: dark ? "#E6B84A" : "#8B6A10" }
      : { txt: "🔮 Future Memorization", c: dark ? "rgba(183,148,244,0.80)" : "#7C5CC0" };

  const aya = (t, n, dim) => (<div style={{ fontFamily: "'UthmanicHafs','Amiri Quran','Amiri',serif", fontSize: dim ? 16 : 18, color: dim ? (dark ? "rgba(243,231,200,0.40)" : "#8A7A5A") : (dark ? "rgba(243,231,200,0.80)" : "#2D2A26"), fontWeight: dim ? 400 : 600, direction: "rtl", textAlign: "right", lineHeight: 1.8 }}>{normalizeUthmani(t)} <span style={{ fontFamily: "'Amiri Quran','Amiri',serif", fontSize: 14, color: dark ? "rgba(212,175,55,0.30)" : "rgba(140,100,20,0.30)" }}>﴿{toArabicDigits(n)}﴾</span></div>);
  const lbl = (label, key) => (<div style={{ fontSize: 8, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, color: dark ? "rgba(243,231,200,0.30)" : "#9A8A6A", marginTop: 6, marginBottom: 1 }}>{label} · {key}</div>);

  return (
    <div style={{ padding: "10px 0", borderTop: dark ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,0,0,0.04)" }}>
      {/* memorization status + similar location */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 1 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".03em", color: status.c }}>{status.txt}</span>
        <span style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.45)" : "#6B645A" }}>Surah {SURAH_EN[Number(ss)] || ss}{m.juz ? ` · Juz ${m.juz}` : ""}</span>
      </div>
      {/* similarity type (architecture; renders only when the dataset supplies a type) */}
      {tm && <div style={{ fontSize: 10, color: dark ? "rgba(230,184,74,0.65)" : "#8B6A10", marginBottom: 1, letterSpacing: ".04em" }}>{"★".repeat(tm.stars)}{"☆".repeat(5 - tm.stars)} <span style={{ fontSize: 9, opacity: 0.85 }}>{tm.label}{m.score ? ` · ${m.score}` : ""}</span></div>}
      {/* before / similar / after of the look-alike */}
      {prevText && <>{lbl("↑ Ayah before", prevKey)}{aya(prevText, saN - 1, true)}</>}
      {simText ? <>{lbl("● Similar ayah", simKey)}{aya(simText, saN, false)}</> : <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.25)" : "#9A8A6A" }}>Loading...</div>}
      {nextText && <>{lbl("↓ Ayah after", nextKey)}{aya(nextText, saN + 1, true)}</>}
      {/* optional: compare the CURRENT location side-by-side (collapsed by default) */}
      <div className="sbtn" onClick={() => setOpen((o) => !o)} style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: dark ? "rgba(230,184,74,0.55)" : "#8B6A10", marginTop: 8, cursor: "pointer" }}>{open ? "▾ Hide current context" : "▸ Compare both contexts"}</div>
      {open && (
        <div style={{ marginTop: 4, paddingTop: 4, borderTop: dark ? "1px dashed rgba(255,255,255,0.06)" : "1px dashed rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 8, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, color: dark ? "rgba(243,231,200,0.35)" : "#6B645A", marginBottom: 1 }}>Current location · {SURAH_EN[Number(ms)] || ms}{(() => { const j = verseJuz(mvKey); return j ? ` · Juz ${j}` : ""; })()}</div>
          {mvPrevKey && resolveText(mvPrevKey) && <>{lbl("↑ Ayah before", mvPrevKey)}{aya(resolveText(mvPrevKey), maN - 1, true)}</>}
          {lbl("◆ Current ayah", mvKey)}{resolveText(mvKey) ? aya(resolveText(mvKey), maN, false) : <div style={{ fontSize: 10, color: dark ? "rgba(243,231,200,0.25)" : "#9A8A6A" }}>Loading...</div>}
          {resolveText(mvNextKey) && <>{lbl("↓ Ayah after", mvNextKey)}{aya(resolveText(mvNextKey), maN + 1, true)}</>}
        </div>
      )}
    </div>
  );
}
