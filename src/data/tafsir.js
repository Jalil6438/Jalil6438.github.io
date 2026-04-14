// Parse tafsir text — separate Arabic from English into clean blocks.
// Returns an array of { type: "arabic" | "english", text } for alternating rendering.
export function parseTafsirBlocks(text) {
  if (!text) return [];
  const blocks = [];
  // Match any sequence containing Arabic letters (including diacritics, spaces between Arabic words).
  // Catches: standalone Arabic phrases, Arabic embedded in English, hadith quotes, ayah references.
  const arabicRun = /([\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\s\u060C\u061B\u061F،؛؟\-.:!]*[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF])/g;
  let lastIdx = 0;
  let match;
  while ((match = arabicRun.exec(text)) !== null) {
    const ar = match[0].trim();
    const arabicCharCount = (ar.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
    if (arabicCharCount < 2) continue;
    if (match.index > lastIdx) {
      const eng = text.slice(lastIdx, match.index).trim();
      const cleaned = eng.replace(/^[,\s;:]+|[,\s;:]+$/g, "").trim();
      if (cleaned) blocks.push({ type: "english", text: cleaned });
    }
    blocks.push({ type: "arabic", text: ar });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    const tail = text.slice(lastIdx).trim().replace(/^[,\s;:()]+|[,\s;:()]+$/g, "").trim();
    if (tail) blocks.push({ type: "english", text: tail });
  }
  if (blocks.length === 0) {
    return text.split(/\n\n+/).filter(Boolean).map(p => ({ type: "english", text: p.trim() }));
  }
  return blocks;
}
