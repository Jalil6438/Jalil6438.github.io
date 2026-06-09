import { SURAH_EN } from "../data/constants";
import MushafPage from "./MushafPage";

export default function ReviewMushafView({ batch, ayahPage, setAyahPage, touchStartRef, reviewMushafRef, dark, loadedFonts, mushafPagesData, mushafLayoutData, bismillahGlyphs }) {

                  // Group by physical mushaf page — preserve the true page layout.
                  // Boundary pages (two surahs' memorized slices on one page) render
                  // as ONE slide showing both slices in mushaf order.
                  const pageGroups=[];
                  let curGroup=null;
                  batch.forEach(v=>{
                    const pn=v.page_number||0;
                    if(!curGroup||curGroup.page!==pn){ curGroup={page:pn,ayahs:[]}; pageGroups.push(curGroup); }
                    curGroup.ayahs.push(v);
                  });
                  const totalPages=pageGroups.length;
                  const safePage=Math.min(ayahPage,Math.max(0,totalPages-1));
                  const currentPg=pageGroups[safePage];
                  if(!currentPg) return null;
                  // Dominant surah (most ayahs on this page wins).
                  const dominantSurah=(()=>{
                    const counts={}, order=[];
                    currentPg.ayahs.forEach(v=>{
                      const sn=v.surah_number||parseInt(v.verse_key.split(":")[0],10);
                      if(counts[sn]===undefined){counts[sn]=0;order.push(sn);}
                      counts[sn]++;
                    });
                    let w=order[0]||0;
                    order.forEach(sn=>{ if(counts[sn]>counts[w]||(counts[sn]===counts[w]&&order.indexOf(sn)>order.indexOf(w))) w=sn; });
                    return w;
                  })();
                  const reviewJuzNum=currentPg.ayahs[0]?.juz_number;
                  const reviewHizbLabel=(()=>{
                    for(let i=1;i<currentPg.ayahs.length;i++){
                      const v=currentPg.ayahs[i];
                      const r=v.rub_el_hizb_number;
                      if(typeof r!=="number") continue;
                      const prev=currentPg.ayahs[i-1];
                      if(prev&&prev.rub_el_hizb_number===r) continue;
                      const pos=((r-1)%4)+1;
                      const hizb=Math.ceil(r/4);
                      if(pos===1) return `Hizb ${hizb}`;
                      if(pos===2) return `1/4 Hizb ${hizb}`;
                      if(pos===3) return `1/2 Hizb ${hizb}`;
                      if(pos===4) return `3/4 Hizb ${hizb}`;
                    }
                    if(currentPg.page===1&&currentPg.ayahs[0]?.rub_el_hizb_number===1) return "Hizb 1";
                    return null;
                  })();
                  const reviewSubs=[];let sg=null;
                  currentPg.ayahs.forEach(v=>{
                    const sn=v.surah_number||parseInt(v.verse_key.split(":")[0],10);
                    if(!sg||sg.sNum!==sn){sg={sNum:sn,ayahs:[]};reviewSubs.push(sg);}
                    sg.ayahs.push(v);
                  });
                  return (
                    <div ref={reviewMushafRef} style={{marginBottom:16}}
                      onTouchStart={e=>{touchStartRef.current=e.touches[0].clientX;}}
                      onTouchEnd={e=>{const dx=e.changedTouches[0].clientX-touchStartRef.current;if(dx>40&&safePage<totalPages-1)setAyahPage(p=>p+1);else if(dx<-40&&safePage>0)setAyahPage(p=>p-1);}}>
                      <div style={{position:"relative",padding:"32px 2px 70px"}}>
                        {dominantSurah>0&&(
                          <div style={{position:"absolute",top:0,left:8,fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:dark?"#E8C76A":"#6B4F00"}}>
                            {SURAH_EN[dominantSurah]||""}
                          </div>
                        )}
                        {reviewJuzNum&&(
                          <div style={{position:"absolute",top:0,right:8,fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:dark?"#E8C76A":"#6B4F00"}}>
                            Juz {reviewJuzNum}
                          </div>
                        )}
                        {(()=>{
                          const pageNum=currentPg.page;
                          const pageFontReady=loadedFonts.has(pageNum);
                          if(!pageFontReady){
                            return (
                              <div style={{minHeight:400,display:"flex",alignItems:"center",justifyContent:"center",color:dark?"rgba(217,177,95,0.35)":"rgba(107,100,90,0.55)",fontSize:12,letterSpacing:".08em"}}>
                                <span>loading mushaf…</span>
                              </div>
                            );
                          }
                          const pageLines=mushafPagesData&&mushafPagesData[pageNum];
                          const pageLayout=mushafLayoutData&&mushafLayoutData[pageNum];
                          if(!pageLines||!pageLayout) return null;
                          // Only render lines for surahs that appear in this
                          // page's batch (what's been memorized). Drops the
                          // tail of the currently-memorizing surah when only
                          // part of it is reviewed, and drops heads/tails of
                          // surahs not yet in the review window.
                          const pageSurahs=new Set(currentPg.ayahs.map(v=>
                            v.surah_number||parseInt(v.verse_key.split(":")[0],10)));
                          const fallbackStartSurah=currentPg.ayahs[0]?.surah_number
                            ||parseInt(currentPg.ayahs[0]?.verse_key.split(":")[0],10);
                          return (
                            <MushafPage
                              pageNum={pageNum}
                              pageLines={pageLines}
                              pageLayout={pageLayout}
                              dark={dark}
                              bismillahGlyphs={bismillahGlyphs}
                              bismillahReady={loadedFonts.has(1)}
                              renderSurah={(sn)=>pageSurahs.size===0||pageSurahs.has(sn)}
                              fallbackStartSurah={fallbackStartSurah}
                            />
                          );
                        })()}
                        {(()=>{
                          const isOdd=currentPg.page%2===1;
                          const text=isOdd
                            ?(reviewHizbLabel?`${reviewHizbLabel} | Page ${currentPg.page}`:`Page ${currentPg.page}`)
                            :(reviewHizbLabel?`Page ${currentPg.page} | ${reviewHizbLabel}`:`Page ${currentPg.page}`);
                          return (
                            <div style={{position:"absolute",bottom:0,[isOdd?"right":"left"]:12,fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:dark?"rgba(217,177,95,0.55)":"#6B645A",letterSpacing:".06em"}}>{text}</div>
                          );
                        })()}
                      </div>
                      {totalPages>1&&(
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px 16px",gap:8}}>
                          <div className={safePage<totalPages-1?"sbtn":""} onClick={()=>{if(safePage<totalPages-1)setAyahPage(p=>p+1);}} style={{padding:"8px 18px",borderRadius:10,fontSize:13,fontWeight:600,color:safePage<totalPages-1?(dark?"#E8C76A":"#6B4F00"):(dark?"rgba(243,231,200,0.15)":"rgba(0,0,0,0.15)"),background:safePage<totalPages-1?(dark?"rgba(217,177,95,0.08)":"rgba(180,140,40,0.06)"):"transparent",border:`1px solid ${safePage<totalPages-1?(dark?"rgba(217,177,95,0.20)":"rgba(140,100,20,0.15)"):"transparent"}`}}>‹ Next</div>
                          <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.50)":"#8B7355",fontFamily:"'IBM Plex Mono',monospace"}}>{safePage+1} of {totalPages}</div>
                          <div className={safePage>0?"sbtn":""} onClick={()=>{if(safePage>0)setAyahPage(p=>p-1);}} style={{padding:"8px 18px",borderRadius:10,fontSize:13,fontWeight:600,color:safePage>0?(dark?"#E8C76A":"#6B4F00"):(dark?"rgba(243,231,200,0.15)":"rgba(0,0,0,0.15)"),background:safePage>0?(dark?"rgba(217,177,95,0.08)":"rgba(180,140,40,0.06)"):"transparent",border:`1px solid ${safePage>0?(dark?"rgba(217,177,95,0.20)":"rgba(140,100,20,0.15)"):"transparent"}`}}>Prev ›</div>
                        </div>
                      )}
                    </div>
                  );
                
}
