import { Fragment } from "react";
import { SURAH_EN } from "../data/constants";
import { toArabicDigits, normalizeUthmani } from "../utils";

export default function ReviewStudyView({ batch, ayahPage, setAyahPage, touchStartRef, setOpenAyah, fetchTranslations, dark }) {

                  const APS=5;
                  const rPages=Math.max(1,Math.ceil(batch.length/APS));
                  const rSafe=Math.min(ayahPage,rPages-1);
                  const rStart=rSafe*APS;
                  const rEnd=Math.min(rStart+APS,batch.length);
                  const pageAyahs=batch.slice(rStart,rEnd);
                  return (
                  <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}
                    onTouchStart={e=>{touchStartRef.current=e.touches[0].clientX;}}
                    onTouchEnd={e=>{const dx=e.changedTouches[0].clientX-touchStartRef.current;if(dx>40&&rSafe<rPages-1)setAyahPage(p=>p+1);else if(dx<-40&&rSafe>0)setAyahPage(p=>p-1);}}>
                    {pageAyahs.map((v,i)=>{
                      const sNum=v.surah_number||parseInt(v.verse_key?.split(":")?.[0]);
                      const vKey=v.verse_key;
                      const prevSurah=i>0?(pageAyahs[i-1].surah_number||parseInt(pageAyahs[i-1].verse_key?.split(":")?.[0]||"0",10)):null;
                      const showSurahBreak=i===0||prevSurah!==sNum;
                      return (
                        <Fragment key={vKey}>
                          {showSurahBreak&&(
                            <div style={{textAlign:"center",padding:"8px 0"}}>
                              <div style={{position:"relative",width:"100%",height:70,backgroundImage:"url('/surah_ornament.png')",backgroundSize:"100% 100%",backgroundRepeat:"no-repeat",backgroundPosition:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <span style={{fontFamily:"'surah-names',serif",fontSize:"clamp(28px,7.5vw,44px)",color:dark?"rgba(232,200,120,0.85)":"rgba(0,0,0,0.70)",lineHeight:1,display:"inline-flex",alignItems:"center",gap:"0.04em",direction:"rtl"}}>
                                  <span>surah</span>
                                  <span>{String(sNum).padStart(3,"0")}</span>
                                </span>
                              </div>
                            </div>
                          )}
                          <div className="sbtn" onClick={()=>{setOpenAyah(vKey);fetchTranslations([v]);}}
                            style={{borderRadius:14,padding:"12px 14px",background:dark?"#0F1A2B":"#EADFC8",border:"1px solid rgba(230,184,74,0.08)",boxShadow:"0 2px 8px rgba(0,0,0,0.20)",transition:"all .15s"}}>
                            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                              <span style={{flex:1,fontSize:11,color:"#9CA3AF"}}>{SURAH_EN[sNum]} · {vKey}</span>
                            </div>
                            <div style={{direction:"rtl",textAlign:"right",lineHeight:2}}>
                              <span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:"clamp(22px,5.4vw,31px)",color:dark?"rgba(255,255,255,0.88)":"#2D2A26"}}>{normalizeUthmani(v.text_uthmani).trim()+"\u2060"}</span>
                              <span style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:"clamp(22px,5.4vw,31px)",color:dark?"rgba(212,175,55,0.55)":"#A08848",marginRight:4}}>{toArabicDigits(parseInt(vKey.split(":")[1],10))}</span>
                            </div>
                          </div>
                        </Fragment>
                      );
                    })}
                    {rPages>1&&(
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginTop:8}}>
                        <div className={rSafe<rPages-1?"sbtn":""} onClick={()=>{if(rSafe<rPages-1)setAyahPage(p=>Math.min(rPages-1,p+1));}} style={{padding:"8px 18px",borderRadius:10,fontSize:13,fontWeight:600,color:rSafe<rPages-1?(dark?"#E6B84A":"#6B4F00"):(dark?"rgba(243,231,200,0.15)":"rgba(0,0,0,0.15)"),background:rSafe<rPages-1?(dark?"rgba(217,177,95,0.08)":"rgba(180,140,40,0.06)"):"transparent",border:`1px solid ${rSafe<rPages-1?(dark?"rgba(217,177,95,0.20)":"rgba(140,100,20,0.15)"):"transparent"}`}}>‹ Next</div>
                        <div style={{fontSize:10,color:dark?"rgba(230,184,74,0.50)":"#8B6A10",fontFamily:"'IBM Plex Mono',monospace"}}>Page {rSafe+1} of {rPages}</div>
                        <div className={rSafe>0?"sbtn":""} onClick={()=>{if(rSafe>0)setAyahPage(p=>Math.max(0,p-1));}} style={{padding:"8px 18px",borderRadius:10,fontSize:13,fontWeight:600,color:rSafe>0?(dark?"#E6B84A":"#6B4F00"):(dark?"rgba(243,231,200,0.15)":"rgba(0,0,0,0.15)"),background:rSafe>0?(dark?"rgba(217,177,95,0.08)":"rgba(180,140,40,0.06)"):"transparent",border:`1px solid ${rSafe>0?(dark?"rgba(217,177,95,0.20)":"rgba(140,100,20,0.15)"):"transparent"}`}}>Prev ›</div>
                      </div>
                    )}
                  </div>
                  );
                
}
