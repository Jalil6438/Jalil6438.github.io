import { SURAH_EN } from "../data/constants";
import MushafPage from "./MushafPage";

export default function FajrMushafView({ pageBatch, batch, activeSurahNum, fajrPageNum, dark, playMushafRange, mushafAudioPlaying, stopMushafAudio, reciter, loadedFonts, mushafPagesData, mushafLayoutData, verseToPageMap, bismillahGlyphs, repCounts, repTarget }) {
  const MUSHAF_INTERACTIVE = false;

                  const pageNum = pageBatch[0]?.page_number;
                  const juzNum = pageBatch[0]?.juz_number;
                  // Page-header surah, per mushaf convention: whichever surah has the
                  // greater portion (most ayahs) on this page wins the label. Ties go
                  // to the later surah. So page 577 with a few Muddaththir ayahs +
                  // 19 Qiyāmah ayahs reads "Al-Qiyāmah"; a page with most-of-long-surah
                  // + 1-ayah-start-of-next reads the longer one.
                  // Label from the active-memorization surah (what's actually
                  // rendered), not the dominant surah on the full page. Avoids
                  // misleading the user — e.g. page 577 has more Qiyāmah ayahs
                  // but we're only showing Muddaththir's tail, so the chrome
                  // should say Al-Muddaththir not Al-Qiyāmah.
                  const leadSurahNum = activeSurahNum || batch[0]?.surah_number || 0;
                  // Hizb fractional marker derived from rub_el_hizb_number (1-240).
                  // Each hizb = 4 rubs: pos 1 = ¼, 2 = ½, 3 = ¾, 4 = hizb start.
                  // Show the marker for the first quarter that starts on this page.
                  // Uses pageBatch (full page) so the marker reflects the page, not the
                  // memorization filter.
                  const hizbLabel = (() => {
                    // Only show when a NEW rub actually starts on this page (transition
                    // from the preceding verse's rub). First verse never counts — it's
                    // a continuation from the prior page. Page 1 is the mushaf start
                    // so Hizb 1 is forced below.
                    for (let i = 1; i < pageBatch.length; i++) {
                      const v = pageBatch[i];
                      const r = v.rub_el_hizb_number;
                      if (typeof r !== "number") continue;
                      const prev = pageBatch[i - 1];
                      if (prev && prev.rub_el_hizb_number === r) continue;
                      const pos = ((r - 1) % 4) + 1;
                      const hizb = Math.ceil(r / 4);
                      if (pos === 1) return `Hizb ${hizb}`;
                      if (pos === 2) return `1/4 Hizb ${hizb}`;
                      if (pos === 3) return `1/2 Hizb ${hizb}`;
                      if (pos === 4) return `3/4 Hizb ${hizb}`;
                    }
                    if (pageNum === 1 && pageBatch[0]?.rub_el_hizb_number === 1) return "Hizb 1";
                    return null;
                  })();
                  // Mushaf mode: preserve the actual mushaf page layout but display
                  // ONLY the ayahs belonging to the active-memorization surah. On
                  // page 578 (Qiyāmah 20-40 + Insān 1-5) while memorizing Qiyāmah,
                  // only Qiyāmah 20-40 shows — Insān 1-5 is hidden because that's
                  // not today's active memorization. Page chrome still uses
                  // pageBatch for accurate page/hizb info.
                  const mushafOnly = pageBatch.filter(v=>{
                    const s=v.surah_number||parseInt(v.verse_key?.split(":")?.[0]||"0",10);
                    return activeSurahNum&&s===activeSurahNum;
                  });
                  const surahGroups=[];
                  let curGroup=null;
                  mushafOnly.forEach(v=>{
                    const sn=v.surah_number||parseInt(v.verse_key?.split(":")?.[0]||"0",10);
                    if(!curGroup||curGroup.sn!==sn){ curGroup={sn,verses:[]}; surahGroups.push(curGroup); }
                    curGroup.verses.push(v);
                  });
                  return (
                    <div data-tut="guided-mushaf" style={{marginBottom:16}}>
                      {!MUSHAF_INTERACTIVE&&playMushafRange&&batch.length>0&&reciter&&(
                        <div style={{textAlign:"center",marginBottom:2}}>
                          <div className="sbtn" onClick={()=>{ if(mushafAudioPlaying) stopMushafAudio&&stopMushafAudio(); else playMushafRange(batch); }}
                            style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:999,fontSize:10,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:dark?"#E8C76A":"#6B4F00",background:dark?"rgba(217,177,95,0.10)":"rgba(180,140,40,0.08)",border:`1px solid ${dark?"rgba(217,177,95,0.25)":"rgba(140,100,20,0.20)"}`}}>
                            <span style={{fontSize:10}}>{mushafAudioPlaying?"■":"▶"}</span>
                            {mushafAudioPlaying?"Stop":"Play Page"}
                          </div>
                        </div>
                      )}
                    <div style={{padding:"0 2px"}}>
                      {/* Top row: surah name (left) · Part N (right) — in-flow so the body
                          shrinks to content with no absolute-positioned reservations. */}
                      {(leadSurahNum>0||juzNum)&&(
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:dark?"#E8C76A":"#6B4F00",marginBottom:20}}>
                          <span>{leadSurahNum>0?(SURAH_EN[leadSurahNum]||""):""}</span>
                          <span>{juzNum?`Juz ${juzNum}`:""}</span>
                        </div>
                      )}
                      {(()=>{
                        const pageFontReady=loadedFonts.has(fajrPageNum);
                        if(!pageFontReady){
                          return (
                            <div style={{minHeight:400,display:"flex",alignItems:"center",justifyContent:"center",color:dark?"rgba(217,177,95,0.35)":"rgba(107,100,90,0.55)",fontSize:12,letterSpacing:".08em"}}>
                              <span>loading mushaf…</span>
                            </div>
                          );
                        }
                        const pageLines=mushafPagesData&&mushafPagesData[fajrPageNum];
                        const pageLayout=mushafLayoutData&&mushafLayoutData[fajrPageNum];
                        if(!pageLines||!pageLayout) return null;
                        // Only render lines belonging to surahs in today's
                        // batch (derived from the filtered batch) — skips
                        // tails/heads of other surahs on split pages.
                        const batchSurahs=new Set(batch.map(v=>parseInt(v.verse_key.split(":")[0],10)));
                        // Initial surah for the page: if the page layout has
                        // a surah_name, any ayah lines *before* it belong to
                        // the PREVIOUS surah (page tail continuation). Only
                        // fall back to the batch's surah when the page has no
                        // surah_name (full-page single-surah case).
                        const anyBatchVerse=batch.find(v=>(verseToPageMap?.[v.verse_key]||v.page_number)===fajrPageNum);
                        return (
                          <MushafPage
                            pageNum={fajrPageNum}
                            pageLines={pageLines}
                            pageLayout={pageLayout}
                            dark={dark}
                            bismillahGlyphs={bismillahGlyphs}
                            bismillahReady={loadedFonts.has(1)}
                            renderSurah={(sn)=>batchSurahs.size===0||batchSurahs.has(sn)}
                            fallbackStartSurah={anyBatchVerse?parseInt(anyBatchVerse.verse_key.split(":")[0],10):null}
                          />
                        );
                      })()}
                      {MUSHAF_INTERACTIVE&&(
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14,paddingTop:10,borderTop:`1px solid ${dark?"rgba(217,177,95,0.08)":"rgba(0,0,0,0.06)"}`}}>
                          <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.35)":"#9A8A6A"}}>{batch.filter(v=>(repCounts[v.verse_key]||0)>=repTarget).length} of {batch.length} complete</div>
                          <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.25)":"#9A8A6A"}}>Tap any ayah to begin</div>
                        </div>
                      )}
                      {/* Footer: hizb label + page number, alternating corners
                          (odd pages right, even pages left — mushaf spread convention). */}
                      {pageNum&&(()=>{
                        const isOdd=pageNum%2===1;
                        const text=isOdd
                          ?(hizbLabel?`${hizbLabel} | Page ${pageNum}`:`Page ${pageNum}`)
                          :(hizbLabel?`Page ${pageNum} | ${hizbLabel}`:`Page ${pageNum}`);
                        return (
                          <div style={{textAlign:isOdd?"right":"left",marginTop:32,fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:dark?"rgba(217,177,95,0.55)":"#6B645A",letterSpacing:".06em"}}>
                            {text}
                          </div>
                        );
                      })()}
                    </div>
                    </div>
                  );
                
}
