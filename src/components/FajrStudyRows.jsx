import { Fragment } from "react";
import { SURAH_EN } from "../data/constants";
import { toArabicDigits, normalizeUthmani } from "../utils";

export default function FajrStudyRows({ batch, isShaykhPlan, verseToPageMap, fajrPageNum, ayahPage, setAyahPage, touchStartRef, repCounts, repTarget, currentSessionId, setOpenAyah, fetchTranslations, fajrPageVerses, loadedFonts, dark }) {

                  // Shaykh plan: filter batch to verses on today's Madinah page
                  // per the authoritative verse-to-page mapping (same page
                  // layout as Fajr Mushaf). Custom plan: render the batch as-is
                  // since the N-ayah slice may span pages.
                  const filteredBatch=isShaykhPlan&&verseToPageMap
                    ? batch.filter(v=>verseToPageMap[v.verse_key]===fajrPageNum)
                    : batch;
                  const APS=7;
                  const aPages=Math.max(1,Math.ceil(filteredBatch.length/APS));
                  const aSafe=Math.min(ayahPage,aPages-1);
                  const aStart=aSafe*APS;
                  const aEnd=Math.min(aStart+APS,filteredBatch.length);
                  const pageAyahs=filteredBatch.slice(aStart,aEnd);
                  return (
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}
                  onTouchStart={e=>{touchStartRef.current=e.touches[0].clientX;}}
                  onTouchEnd={e=>{const dx=e.changedTouches[0].clientX-touchStartRef.current;if(dx>40&&aSafe<aPages-1)setAyahPage(p=>p+1);else if(dx<-40&&aSafe>0)setAyahPage(p=>p-1);}}>
                  {pageAyahs.map((v,i)=>{
                    const sNum=v.surah_number||parseInt(v.verse_key?.split(":")?.[0]);
                    const vKey=v.verse_key;
                    const reps=repCounts[vKey]||0;
                    const repsDone=reps>=repTarget;
                    // Surah separator — rendered before the first ayah of a new surah
                    // within the page window, so Mumtahanah 12-13 and Aṣ-Ṣaff 1-5 aren't
                    // treated as one continuous unit during the connection phase.
                    const prevSurah=i>0?(pageAyahs[i-1].surah_number||parseInt(pageAyahs[i-1].verse_key?.split(":")?.[0]||"0",10)):null;
                    const showSurahBreak=i>0&&prevSurah!==sNum;

                    return (
                      <Fragment key={vKey}>
                        {showSurahBreak&&(
                          <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 4px 2px"}}>
                            <div style={{flex:1,height:1,background:`linear-gradient(90deg,rgba(217,177,95,0) 0%,${dark?"rgba(232,200,120,0.30)":"rgba(140,100,20,0.25)"} 50%,rgba(217,177,95,0) 100%)`}}/>
                            <div style={{textAlign:"center"}}>
                              <div style={{fontFamily:"'surah-names',serif",fontSize:"clamp(22px,6vw,34px)",color:dark?"rgba(232,200,120,0.85)":"rgba(0,0,0,0.70)",lineHeight:1,display:"inline-flex",alignItems:"center",gap:"0.04em",direction:"rtl"}}>
                                <span>surah</span>
                                <span>{String(sNum).padStart(3,"0")}</span>
                              </div>
                            </div>
                            <div style={{flex:1,height:1,background:`linear-gradient(90deg,rgba(217,177,95,0) 0%,${dark?"rgba(232,200,120,0.30)":"rgba(140,100,20,0.25)"} 50%,rgba(217,177,95,0) 100%)`}}/>
                          </div>
                        )}
                        <div data-tut={i===0?"guided-ayah":i===1?"guided-ayah-2":undefined} className="sbtn" onClick={()=>{setOpenAyah(vKey);fetchTranslations([v]);}}
                          style={{borderRadius:14,padding:"12px 14px",background:dark?"#0F1A2B":"#EADFC8",border:`1px solid ${repsDone?"rgba(230,184,74,0.35)":"rgba(230,184,74,0.08)"}`,boxShadow:repsDone?"0 0 14px rgba(230,184,74,0.10)":"0 2px 8px rgba(0,0,0,0.20)",transition:"all .15s"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                            <span style={{flex:1,fontSize:11,color:"#9CA3AF"}}>{SURAH_EN[sNum]} · {vKey}</span>
                            {currentSessionId==="fajr"&&<span style={{fontSize:11,color:repsDone?"#2ECC71":reps>0?"#E6B84A":dark?"rgba(255,255,255,0.25)":"rgba(0,0,0,0.25)",fontFamily:"'IBM Plex Mono',monospace"}}>{reps} of {repTarget} Repetitions</span>}
                          </div>
                          {(()=>{
                            // Use Madinah page (from verseToPageMap) so the
                            // visual font matches what Fajr Mushaf shows.
                            const pn=(verseToPageMap&&verseToPageMap[vKey])||v.page_number;
                            const pageFontReady=loadedFonts.has(pn);
                            // Search across any fetched page for this verse's
                            // words — API may have them in a different page
                            // than where Madinah places them.
                            let fullVerse=null;
                            for(const key of Object.keys(fajrPageVerses||{})){
                              const found=(fajrPageVerses[key]||[]).find(x=>x.verse_key===vKey);
                              if(found){ fullVerse=found; break; }
                            }
                            // Custom plan skips mushaf font — API/Madinah page
                            // mismatches cause glyphs to render as neighbor
                            // verses. UthmanicHafs always renders correctly.
                            // Long ayahs wrap to multiple lines so the user
                            // can read the whole verse without tapping in.
                            const clampStyle={paddingInlineStart:"4px"};
                            if(isShaykhPlan&&pageFontReady&&fullVerse&&fullVerse.words){
                              const words=fullVerse.words.filter(w=>!w.char_type_name||w.char_type_name==="word"||w.char_type_name==="end").map(w=>w.code_v2||"").filter(Boolean);
                              return (
                                <div style={{direction:"rtl",textAlign:"right",lineHeight:2,fontFamily:`'p${pn}-v2',serif`,fontSize:"clamp(20px,5.2vw,30px)",color:dark?"rgba(255,255,255,0.88)":"#2D2A26",...clampStyle}}>
                                  {words.map((w,wi)=>(<span key={wi}>{w} </span>))}
                                </div>
                              );
                            }
                            return (
                              <div style={{direction:"rtl",textAlign:"right",lineHeight:2,...clampStyle}}>
                                <span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:"clamp(22px,5.4vw,31px)",color:dark?"rgba(255,255,255,0.88)":"#2D2A26"}}>{normalizeUthmani(v.text_uthmani).trim()+"\u2060"}</span>
                                <span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:"clamp(22px,5.4vw,31px)",color:repsDone?(dark?"#E6B84A":"#2ECC71"):(dark?"rgba(212,175,55,0.55)":"#A08848"),marginRight:4}}>{toArabicDigits(parseInt(vKey.split(":")[1],10))}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </Fragment>
                    );
                  })}
                  {aPages>1&&(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginTop:8}}>
                      <div className={aSafe<aPages-1?"sbtn":""} onClick={()=>{if(aSafe<aPages-1)setAyahPage(p=>Math.min(aPages-1,p+1));}} style={{padding:"8px 18px",borderRadius:10,fontSize:13,fontWeight:600,color:aSafe<aPages-1?(dark?"#E6B84A":"#6B4F00"):(dark?"rgba(243,231,200,0.15)":"rgba(0,0,0,0.15)"),background:aSafe<aPages-1?(dark?"rgba(217,177,95,0.08)":"rgba(180,140,40,0.06)"):"transparent",border:`1px solid ${aSafe<aPages-1?(dark?"rgba(217,177,95,0.20)":"rgba(140,100,20,0.15)"):"transparent"}`}}>‹ Next</div>
                      <div style={{fontSize:10,color:dark?"rgba(230,184,74,0.50)":"#8B6A10",fontFamily:"'IBM Plex Mono',monospace"}}>Page {aSafe+1} of {aPages}</div>
                      <div className={aSafe>0?"sbtn":""} onClick={()=>{if(aSafe>0)setAyahPage(p=>Math.max(0,p-1));}} style={{padding:"8px 18px",borderRadius:10,fontSize:13,fontWeight:600,color:aSafe>0?(dark?"#E6B84A":"#6B4F00"):(dark?"rgba(243,231,200,0.15)":"rgba(0,0,0,0.15)"),background:aSafe>0?(dark?"rgba(217,177,95,0.08)":"rgba(180,140,40,0.06)"):"transparent",border:`1px solid ${aSafe>0?(dark?"rgba(217,177,95,0.20)":"rgba(140,100,20,0.15)"):"transparent"}`}}>Prev ›</div>
                    </div>
                  )}
                </div>);
}
