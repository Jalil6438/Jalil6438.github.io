import { useState } from "react";
import { MAKKAH_IMAMS, MADINAH_IMAMS, HARAMAIN_SURAHS } from "../data/haramain";

export default function MasjidaynTab({
  dark, T, masjidaynTab, setMasjidaynTab, activeStream,
  selectedRamadanNight, setSelectedRamadanNight,
  ramadanVideoType, setRamadanVideoType,
  haramainMosque, setHaramainMosque,
  openImam, setOpenImam,
  haramainPlaying, playHaramainSurah,
  onBackToSettings,
}) {
  const [expandedMosque, setExpandedMosque] = useState(null); // "makkah" | "madinah" | null
  const [showNightPicker, setShowNightPicker] = useState(null); // null | "first20" | "last10"

  /* ── Imam button renderer (reciter-selector style) ── */
  const renderImamButtons = (imams, mosqueColor) => {
    return imams.map((imam)=>{
      const isSelected = openImam===imam.id;
      const isFull = imam.surahCount===114;
      const hasAudio = !!(imam.archive || imam.quranicaudio || imam.mp3quran);
      const badgeColor = isFull ? "#F0C040" : hasAudio ? "#F6A623" : "#E5534B";
      const badgeLabel = isFull ? "Full Quran" : hasAudio ? "Partial" : "Prayer only";
      return (
        <div key={imam.id} style={{marginBottom:4}}>
          <div className="sbtn" onClick={()=>setOpenImam(isSelected?null:imam.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,transition:"all .15s",
            background:isSelected?(dark?`${mosqueColor}12`:`${mosqueColor}08`):(dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)"),
            border:`1px solid ${isSelected?mosqueColor+"50":(dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)")}`,
            boxShadow:isSelected?`0 0 14px ${mosqueColor}15`:"none"}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:isSelected?`${mosqueColor}18`:(dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)"),border:`1px solid ${isSelected?mosqueColor+"40":(dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)")}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12}}>🎙️</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:isSelected?700:400,color:isSelected?(dark?"#F3E7C8":"#3D2E0A"):(dark?"rgba(243,231,200,0.65)":"rgba(40,30,10,0.65)")}}>{imam.name}</div>
              <div style={{display:"flex",gap:6,alignItems:"center",marginTop:2}}>
                <span style={{fontFamily:"'Amiri',serif",fontSize:12,color:isSelected?`${mosqueColor}88`:(dark?"rgba(243,231,200,0.30)":"rgba(40,30,10,0.40)"),direction:"rtl"}}>{imam.arabic}</span>
                <span style={{fontSize:8,padding:"1px 5px",borderRadius:10,background:`${badgeColor}15`,border:`1px solid ${badgeColor}40`,color:badgeColor}}>{badgeLabel}</span>
                {imam.deceased&&<span style={{fontSize:7,color:T.dim}}>{imam.deceased}</span>}
                {imam.retired&&!imam.deceased&&<span style={{fontSize:7,color:T.dim}}>{imam.retired}</span>}
              </div>
            </div>
            {isSelected&&<div style={{fontSize:14,color:mosqueColor,fontWeight:700,flexShrink:0}}>✓</div>}
          </div>
          {/* Surah grid when selected */}
          {isSelected&&hasAudio&&(
            <div style={{background:dark?"rgba(0,0,0,0.15)":"rgba(0,0,0,0.03)",borderRadius:"0 0 12px 12px",padding:"6px 6px 10px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:3,border:`1px solid ${mosqueColor}20`,borderTop:"none"}}>
              {HARAMAIN_SURAHS.map((name,si)=>{
                const sNum=si+1;
                if(imam.availableSurahs&&!imam.availableSurahs.includes(sNum)) return null;
                const pkey=`${imam.id}-${sNum}`;
                const isP=haramainPlaying===pkey;
                return (
                  <div key={sNum} className="sbtn" onClick={()=>playHaramainSurah(imam,sNum,pkey)} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",borderRadius:4,background:isP?`${mosqueColor}15`:T.surface2,border:`1px solid ${isP?mosqueColor:T.border}`}}>
                    <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,background:isP?mosqueColor:T.surface,border:`1px solid ${isP?mosqueColor:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:isP?"#fff":T.dim}}>
                      {isP?"⏸":"▶"}
                    </div>
                    <div style={{minWidth:0}}>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7,color:isP?mosqueColor:T.vdim}}>{String(sNum).padStart(3,"0")}</div>
                      <div style={{fontSize:9,color:isP?T.text:T.sub,lineHeight:1.3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {isSelected&&!hasAudio&&(
            <div style={{background:dark?"rgba(0,0,0,0.15)":"rgba(0,0,0,0.03)",borderRadius:"0 0 12px 12px",padding:"12px",border:`1px solid ${mosqueColor}20`,borderTop:"none",fontSize:11,color:T.sub,lineHeight:1.6}}>
              <strong style={{color:mosqueColor}}>{imam.name}</strong> leads prayers but does not have a compiled Quran archive.
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* ═══ RAMADAN 1447 — with Mosque cards + Sheikh Badr Al-Turki ═══ */}
      {(masjidaynTab==="ramadan"||masjidaynTab==="live"||masjidaynTab==="haramain")&&(()=>{
        const NIGHTS = [
          {n:1,  taraweeh:"lRwXLCF8Udk", tahajjud:null},
          {n:2,  taraweeh:"aBzvj0UHXsQ", tahajjud:null},
          {n:3,  taraweeh:"Vkd3P7PlsLQ", tahajjud:null},
          {n:4,  taraweeh:"_q0DAbkKDEY", tahajjud:null},
          {n:5,  taraweeh:"KzRlzHbsuUc", tahajjud:null},
          {n:6,  taraweeh:"9f8tyJ7ZyIw", tahajjud:null},
          {n:7,  taraweeh:"N1JHCv05Rhw", tahajjud:null},
          {n:8,  taraweeh:"6BEn6PD2vjU", tahajjud:null},
          {n:9,  taraweeh:"1nnvyGOjpx8", tahajjud:null},
          {n:10, taraweeh:"wSnomeZ983I", tahajjud:null},
          {n:11, taraweeh:"I-urbxpNqHU", tahajjud:null},
          {n:12, taraweeh:"ODIE3PM6kSU", tahajjud:null},
          {n:13, taraweeh:"PcDI7mbbC88", tahajjud:null},
          {n:14, taraweeh:"-dAdc6dvafc", tahajjud:null},
          {n:15, taraweeh:"vPJDsDCV4t8", tahajjud:null},
          {n:16, taraweeh:"HsBdxGMgLs8", tahajjud:null},
          {n:17, taraweeh:"b_MqX9kAcqE", tahajjud:null},
          {n:18, taraweeh:"0NdZR0MdsSg", tahajjud:null},
          {n:19, taraweeh:"rg5u3pyKXfM", tahajjud:null},
          {n:20, taraweeh:"MbzjYKYjF1Q", tahajjud:null},
          {n:21, taraweeh:"659qlvcZD4Y", tahajjud:null},
          {n:22, taraweeh:"V5nYjrTWT5g", tahajjud:null},
          {n:23, taraweeh:"gRtjM_cwAZc", tahajjud:null},
          {n:24, taraweeh:"C2BOVH9FAus", tahajjud:null},
          {n:25, taraweeh:"zwJvs3A6EjA", tahajjud:null},
          {n:26, taraweeh:"BDlvfPriqu4", tahajjud:null},
          {n:27, taraweeh:"WimoXE57I4g", tahajjud:null},
          {n:28, taraweeh:"Ls7hQl40M-E", tahajjud:null},
          {n:29, taraweeh:"15Mxmi_hmWY", tahajjud:null},
          {n:30, taraweeh:"RSevando-yI", tahajjud:null},
        ];
        const sel = selectedRamadanNight ?? 1;
        const selEntry = NIGHTS.find(x=>x.n===sel);
        const activeId = selEntry?.[ramadanVideoType] ?? selEntry?.taraweeh;
        const hasVideo = !!activeId;
        const activeLabel = ramadanVideoType==="tahajjud" ? "Tahajjud + Witr" : "Taraweeh";

        const mosques = [
          { id:"makkah",  icon:"🕋", title:"Masjid Al-Haram",  arabic:"المسجد الحرام",  color:"#E5534B", handle:"@saudiqurantv",  imams:MAKKAH_IMAMS, img:"/Makkah.png", bgPos:"center 70%" },
          { id:"madinah", icon:"🌙", title:"Masjid An-Nabawi", arabic:"المسجد النبوي", color:"#F0C040", handle:"@saudisunnahtv", imams:MADINAH_IMAMS, img:"/Madinah.png", bgPos:"center bottom" },
        ];

        return (
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} className="fi">

            {/* Header */}
            <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"10px 14px",flexShrink:0,textAlign:"center"}}>
              <div style={{fontFamily:"'Amiri',serif",fontSize:16,color:T.accent,direction:"rtl",marginBottom:2}}>اللَّهُمَّ ارْزُقْنَا زِيَارَةَ بَيْتِكَ الْحَرَامِ</div>
              <div style={{fontSize:9,color:T.sub,fontStyle:"italic"}}>"O Allah, grant us the visit to Your Sacred House"</div>
            </div>

            {/* Scrollable content */}
            <div style={{flex:1,overflowY:"auto",padding:"0 0 120px"}}>

              {/* ── Mosque cards (side by side) — tap to open ── */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:"12px 14px 0"}}>
                {mosques.map(m=>(
                  <div key={m.id} className="sbtn" onClick={()=>setExpandedMosque(m.id)} style={{background:`url(${m.img}) ${m.bgPos||"center"}/cover no-repeat`,border:`1px solid ${m.color}30`,borderRadius:10,overflow:"hidden",position:"relative",minHeight:120}}>
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.25) 100%)",borderRadius:10}}/>
                    <div style={{position:"relative",zIndex:1,padding:"10px 10px 10px",display:"flex",flexDirection:"column",justifyContent:"space-between",height:"100%"}}>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{m.title}</div>
                        <div style={{fontSize:10,color:m.color,direction:"rtl",marginTop:1}}>{m.arabic}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <div className="pulse" style={{width:6,height:6,borderRadius:"50%",background:m.color}}/>
                        <span style={{fontSize:7,color:m.color,fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,letterSpacing:".1em"}}>LIVE</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Mosque detail screen (overlay) ── */}
              {expandedMosque&&(()=>{
                const m = mosques.find(x=>x.id===expandedMosque);
                const mosqueColor = m.color;
                const imams = m.imams;
                const currentImams = imams.filter(i=>i.status==="current");
                const formerImams = imams.filter(i=>i.status==="former");
                return (
                  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.80)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setExpandedMosque(null)}>
                    <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",width:"100%",maxWidth:500,maxHeight:"80vh",display:"flex",flexDirection:"column",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
                      {/* Handle + Header */}
                      <div style={{padding:"12px 18px 0",textAlign:"center",flexShrink:0}}>
                        <div style={{width:36,height:4,background:dark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)",borderRadius:2,margin:"0 auto 12px"}}/>
                        <div style={{fontSize:15,fontWeight:700,color:dark?"#F3E7C8":"#3D2E0A"}}>{m.title}</div>
                        <div style={{fontFamily:"'Amiri',serif",fontSize:14,color:mosqueColor,direction:"rtl",marginTop:2}}>{m.arabic}</div>
                        {/* Watch Live button */}
                        <a href={`https://www.youtube.com/${m.handle}/live`} target="_blank" rel="noreferrer"
                          style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:10,marginBottom:10,padding:"8px 20px",background:mosqueColor,borderRadius:8,fontSize:12,fontWeight:700,color:dark?"#060A07":"#fff",textDecoration:"none"}}>
                          <div className="pulse" style={{width:8,height:8,borderRadius:"50%",background:dark?"#060A07":"#fff"}}/>
                          Watch Live
                        </a>
                      </div>
                      {/* Imam list */}
                      <div style={{overflowY:"auto",padding:"0 14px 28px"}}>
                        {currentImams.length>0&&(
                          <div style={{fontSize:9,color:mosqueColor,letterSpacing:".12em",textTransform:"uppercase",fontWeight:700,marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
                            <span>Current Imams</span><div style={{flex:1,height:1,background:`${mosqueColor}30`}}/>
                          </div>
                        )}
                        {renderImamButtons(currentImams, mosqueColor)}
                        {formerImams.length>0&&(
                          <div style={{fontSize:9,color:T.dim,letterSpacing:".12em",textTransform:"uppercase",fontWeight:700,marginTop:14,marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
                            <span>Former Imams</span><div style={{flex:1,height:1,background:T.border}}/>
                          </div>
                        )}
                        {renderImamButtons(formerImams, mosqueColor)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Ramadan strip */}
              <div style={{padding:"14px 14px 6px",textAlign:"center"}}>
                <div style={{fontSize:8,color:"#E5534B",letterSpacing:".16em",textTransform:"uppercase"}}>Ramadan 1447 · 2026</div>
              </div>

              {/* ── Player ── */}
              <div style={{background:dark?"#000":"#D8CCB0",flexShrink:0,marginTop:12}}>
                {hasVideo ? (
                  <iframe
                    key={`r${sel}-${ramadanVideoType}`}
                    src={`https://www.youtube.com/embed/${activeId}?autoplay=1&rel=0&start=${activeId==="lRwXLCF8Udk"?2090:0}`}
                    style={{width:"100%",height:220,border:"none",display:"block"}}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`Night ${sel} ${activeLabel} 1447 — Badr Al-Turki`}
                  />
                ) : (
                  <div style={{height:140,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10}}>
                    <div style={{fontSize:11,color:dark?"#888":"#6B645A"}}>Night {sel} {ramadanVideoType} — opens on YouTube</div>
                    <a href="https://www.youtube.com/@sheikh_badr_al_turki/videos" target="_blank" rel="noreferrer"
                       style={{padding:"8px 18px",background:"#E5534B",color:"#fff",borderRadius:6,textDecoration:"none",fontSize:12,fontWeight:700}}>
                      ▶ Open on YouTube
                    </a>
                  </div>
                )}
                <div style={{padding:"6px 12px",background:dark?"#111":"#E0D5BC",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:"#E5534B",fontWeight:600}}>Night {sel} · {activeLabel}</span>
                  {hasVideo
                    ? <span style={{fontSize:9,color:dark?"#555":"#6B645A"}}>▶ in app</span>
                    : <a href="https://www.youtube.com/@sheikh_badr_al_turki/videos" target="_blank" rel="noreferrer"
                         style={{fontSize:9,color:"#E5534B",textDecoration:"none"}}>Open YouTube ↗</a>}
                </div>
              </div>

              {/* Sheikh Badr Al-Turki YouTube */}
              <div style={{padding:"8px 14px 0"}}>
                <a href="https://www.youtube.com/@sheikh_badr_al_turki/videos" target="_blank" rel="noreferrer"
                  style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"8px 14px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,textDecoration:"none"}}>
                  <svg viewBox="0 0 24 18" style={{width:20,height:15,flexShrink:0}}><path d="M23.5 3.5s-.2-1.7-.9-2.4C21.6.2 20.5.2 20 .1 16.7 0 12 0 12 0S7.3 0 4 .1c-.5.1-1.6.1-2.6 1C.7 1.8.5 3.5.5 3.5S.3 5.5.3 7.5v1.9c0 2 .2 4 .2 4s.2 1.7.9 2.4c1 .9 2.1.9 2.6 1 1.9.2 8 .2 8 .2s4.7 0 8-.2c.5-.1 1.6-.1 2.6-1 .7-.7.9-2.4.9-2.4s.2-2 .2-4V7.5c0-2-.2-4-.2-4z" fill="#FF0000"/><path d="M9.6 12.3V5l6.5 3.6-6.5 3.7z" fill="#fff"/></svg>
                  <div style={{fontSize:11,fontWeight:600,color:T.text}}>@sheikh_badr_al_turki</div>
                </a>
              </div>

              {/* Night selector button + Dua */}
              <div style={{padding:"12px 14px 0"}}>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <div className="sbtn" onClick={()=>setShowNightPicker("first20")} style={{flex:1,padding:"12px 10px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,textAlign:"center"}}>
                    <div style={{fontSize:12,fontWeight:700,color:T.text}}>Nights 1–20</div>
                    <div style={{fontSize:9,color:T.dim,marginTop:2}}>Taraweeh</div>
                  </div>
                  <div className="sbtn" onClick={()=>setShowNightPicker("last10")} style={{flex:1,padding:"12px 10px",background:T.surface,border:`1px solid #E5534B15`,borderRadius:10,textAlign:"center"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#E5534B"}}>Last 10 Nights</div>
                    <div style={{fontSize:9,color:T.dim,marginTop:2}}>Taraweeh + Tahajjud</div>
                  </div>
                </div>
                <div style={{fontSize:10,color:T.dim,textAlign:"center",marginBottom:10}}>
                  Now playing: <span style={{color:"#E5534B",fontWeight:600}}>Night {sel} · {activeLabel}</span>
                </div>

                {/* Dua */}
                <div style={{padding:"12px 16px",background:T.surface,border:"1px solid #E5534B20",borderRadius:8,textAlign:"center"}}>
                  <div style={{fontFamily:"'Amiri',serif",fontSize:16,color:T.accent,direction:"rtl",marginBottom:4}}>
                    اللَّهُمَّ بَلِّغْنَا رَمَضَانَ وَتَقَبَّلْ مِنَّا
                  </div>
                  <div style={{fontSize:10,color:T.sub,fontStyle:"italic"}}>"O Allah, allow us to reach Ramadan and accept it from us"</div>
                </div>
              </div>

              {/* Night picker modal */}
              {showNightPicker!==null&&(
                <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.80)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowNightPicker(null)}>
                  <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",width:"100%",maxWidth:500,maxHeight:"70vh",display:"flex",flexDirection:"column",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
                    <div style={{padding:"12px 18px 0",textAlign:"center",flexShrink:0}}>
                      <div style={{width:36,height:4,background:dark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)",borderRadius:2,margin:"0 auto 12px"}}/>
                      <div style={{fontSize:13,fontWeight:700,color:dark?"#F3E7C8":"#3D2E0A"}}>{showNightPicker==="first20"?"Nights 1–20":"Last 10 Nights"}</div>
                      <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.40)":"rgba(40,30,10,0.50)",marginTop:4,marginBottom:10}}>
                        Currently: <span style={{color:"#E5534B",fontWeight:600}}>Night {sel} · {activeLabel}</span>
                      </div>
                    </div>
                    <div style={{overflowY:"auto",padding:"0 14px 28px"}}>
                      {showNightPicker==="first20"&&(
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                          {NIGHTS.filter(x=>x.n<=20).map(x=>{
                            const isActive=sel===x.n;
                            return (
                              <div key={x.n} className="sbtn" onClick={()=>{setSelectedRamadanNight(x.n);setRamadanVideoType("taraweeh");setShowNightPicker(null);}} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px 12px",borderRadius:12,position:"relative",
                                background:isActive?(dark?"rgba(229,83,75,0.10)":"rgba(229,83,75,0.08)"):(dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)"),
                                border:`1px solid ${isActive?"#E5534B50":(dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)")}`,
                              }}>
                                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700,color:isActive?"#E5534B":T.sub}}>{x.n}</div>
                                <div style={{fontSize:12,color:isActive?"#E5534B":T.sub}}>Night {x.n}</div>
                                {isActive&&<div style={{position:"absolute",right:8,fontSize:12,color:"#E5534B",fontWeight:700}}>✓</div>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {showNightPicker==="last10"&&NIGHTS.filter(x=>x.n>=21).map(x=>{
                        const is27=x.n===27;
                        const isActiveTar=sel===x.n&&ramadanVideoType==="taraweeh";
                        const isActiveTah=sel===x.n&&ramadanVideoType==="tahajjud";
                        return (
                          <div key={x.n} style={{display:"flex",gap:4,marginBottom:4}}>
                            <div className="sbtn" onClick={()=>{setSelectedRamadanNight(x.n);setRamadanVideoType("taraweeh");setShowNightPicker(null);}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px 12px",borderRadius:12,position:"relative",
                              background:isActiveTar?(dark?"rgba(229,83,75,0.10)":"rgba(229,83,75,0.08)"):is27?(dark?"rgba(229,83,75,0.06)":"rgba(229,83,75,0.04)"):(dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)"),
                              border:`1px solid ${isActiveTar?"#E5534B50":is27?"#E5534B30":(dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)")}`,
                            }}>
                              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700,color:isActiveTar?"#E5534B":is27?"#E5534B":T.sub}}>{x.n}{is27?" ★":""}</div>
                              <div style={{fontSize:11,color:isActiveTar?"#E5534B":T.sub}}>Taraweeh</div>
                              {isActiveTar&&<div style={{position:"absolute",right:8,fontSize:12,color:"#E5534B",fontWeight:700}}>✓</div>}
                            </div>
                            <div className="sbtn" onClick={()=>{setSelectedRamadanNight(x.n);setRamadanVideoType("tahajjud");setShowNightPicker(null);}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px 12px",borderRadius:12,position:"relative",
                              background:isActiveTah?(dark?"rgba(183,148,244,0.10)":"rgba(183,148,244,0.08)"):(dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)"),
                              border:`1px solid ${isActiveTah?"#B794F450":(dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)")}`,
                            }}>
                              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700,color:isActiveTah?"#B794F4":T.sub}}>{x.n}</div>
                              <div style={{fontSize:11,color:isActiveTah?"#B794F4":T.dim}}>Tahajjud</div>
                              {isActiveTah&&<div style={{position:"absolute",right:8,fontSize:12,color:"#B794F4",fontWeight:700}}>✓</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

    </div>

      {/* ═══ ABOUT & CREDITS ═══ */}
      {masjidaynTab==="about"&&(
        <div style={{flex:1,overflowY:"auto",padding:"20px 18px 120px",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2"}}>
          {onBackToSettings&&(
            <div className="sbtn" onClick={onBackToSettings} style={{display:"inline-block",padding:"6px 12px",background:dark?"rgba(255,255,255,0.04)":"#EADFC8",border:dark?"1px solid rgba(217,177,95,0.12)":"1px solid rgba(0,0,0,0.08)",borderRadius:8,fontSize:11,color:dark?"rgba(243,231,200,0.50)":"#6B645A",marginBottom:14}}>← Back</div>
          )}
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:dark?"#F6E27A":"#D4AF37",fontWeight:700,marginBottom:4}}>Rihlat Al-Hifz</div>
            <div style={{fontFamily:"'Amiri',serif",fontSize:18,color:dark?"rgba(243,231,200,0.60)":"#6B645A",direction:"rtl",marginBottom:4}}>رحلة الحفظ</div>
            <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.30)":"#6B645A",marginTop:4}}>Version 1.0 · 2026</div>
          </div>

          {/* ── Purpose Statement ── */}
          <div style={{background:dark?"rgba(212,175,55,0.04)":"rgba(212,175,55,0.06)",border:dark?"1px solid rgba(212,175,55,0.12)":"1px solid rgba(0,0,0,0.06)",borderRadius:16,padding:"18px 16px",marginBottom:24,textAlign:"center"}}>
            <div style={{fontFamily:"'Amiri',serif",fontSize:16,color:dark?"#E8C76A":"#D4AF37",direction:"rtl",lineHeight:2,marginBottom:14}}>
              وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ
            </div>
            <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.45)":"#6B645A",fontStyle:"italic",marginBottom:16}}>
              "And We have certainly made the Qur'an easy for remembrance, so is there any who will remember?" — Al-Qamar 54:17
            </div>
            <div style={{fontSize:12,color:dark?"rgba(243,231,200,0.70)":"#2D2A26",lineHeight:1.9,textAlign:"left"}}>
              Rihlat Al-Hifz was born from a simple belief: that the path to memorizing the Qur'an should feel guided, personal, and connected to the living tradition of the Haramain.
            </div>
            <div style={{fontSize:12,color:dark?"rgba(243,231,200,0.70)":"#2D2A26",lineHeight:1.9,textAlign:"left",marginTop:10}}>
              Too many memorization tools treat hifz as a checklist. But hifz is a journey — a rihlah. It is built one ayah at a time, one breath at a time, through repetition, reflection, and du'a. Every ayah you commit to memory is a conversation with your Creator that you carry with you for life.
            </div>
            <div style={{fontSize:12,color:dark?"rgba(243,231,200,0.70)":"#2D2A26",lineHeight:1.9,textAlign:"left",marginTop:10}}>
              This app tracks your progress at the ayah level — because that is the truth of how memorization happens. Not juz by juz, not surah by surah, but ayah by ayah. Your timeline, your goals, and your daily sessions are all built around this reality.
            </div>
            <div style={{fontSize:12,color:dark?"rgba(243,231,200,0.70)":"#2D2A26",lineHeight:1.9,textAlign:"left",marginTop:10}}>
              We chose to feature the reciters and scholars of Masjid Al-Haram and Masjid An-Nabawi because hifz is not just about memorizing words — it is about connecting to the tradition. When you listen to the imams of the Haramain recite, you are hearing the same voices that lead millions in salah in the holiest places on earth. That connection strengthens your memorization and deepens your love for the Qur'an.
            </div>
            <div style={{fontSize:12,color:dark?"rgba(243,231,200,0.70)":"#2D2A26",lineHeight:1.9,textAlign:"left",marginTop:10}}>
              Every feature in this app — from the five daily sessions tied to salah times, to the Asr review that cycles through your completed surahs, to the interactive Qur'an with tafsir at your fingertips — is designed to serve one purpose: to make the Qur'an accessible, personal, and deeply rooted in your daily life.
            </div>
            <div style={{fontSize:12,color:dark?"rgba(243,231,200,0.55)":"#6B645A",lineHeight:1.9,textAlign:"left",marginTop:10,fontStyle:"italic"}}>
              We ask Allah to accept this effort, to make it a means of benefit for the Ummah, and to place it on the scale of good deeds for everyone who contributed to making it possible — the scholars, the reciters, the developers behind the open APIs, and every person who opens this app with the intention of drawing closer to His Book.
            </div>
            <div style={{fontFamily:"'Amiri',serif",fontSize:14,color:dark?"#E8C76A":"#D4AF37",direction:"rtl",marginTop:14}}>
              اللَّهُمَّ اجْعَلْنَا مِنْ أَهْلِ الْقُرْآنِ
            </div>
            <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.35)":"#6B645A",marginTop:4,fontStyle:"italic"}}>
              O Allah, make us from the people of the Qur'an
            </div>
          </div>

          {[
            {title:"Quranic Text",items:[
              "Uthmani text provided by Quran.com API (Quran Foundation)",
              "Text data sourced from Quran Foundation API (api.quran.com)",
              "Mushaf page layout and verse mapping via Quran Foundation resources",
            ]},
            {title:"Translation",items:[
              "English translation: Al-Hilali & Muhammad Muhsin Khan",
              "Translation data served via Quran.com API (Quran Foundation)",
              "Used for educational and da'wah purposes",
            ]},
            {title:"Tafsir",items:[
              "Tafsir As-Sa'di — Shaykh Abdur-Rahman ibn Nasir As-Sa'di",
              "Tafsir Al-Muyassar — King Fahd Complex for the Printing of the Holy Qur'an",
              "Tafsir Ibn Kathir — Imam Isma'il ibn Umar ibn Kathir",
              "All tafsir content served via Quran.com API (Quran Foundation)",
            ]},
            {title:"Recitations & Audio",items:[
              "Ayah-by-ayah recitations via everyayah.com",
              "Full surah recitations via quranicaudio.com (Quran Foundation)",
              "Audio streaming via audio.qurancdn.com (Quran Foundation)",
              "All reciters are credited by name throughout the application",
              "Recitations used for educational purposes — memorization and review",
            ]},
            {title:"Reciters",items:[
              "Masjid Al-Haram: Yasser Al-Dosari, Abdullah Al-Juhany, Abdul Rahman As-Sudais, Saud Ash-Shuraim, Maher Al-Muaiqly, Abu Bakr Ash-Shatri, Hani Ar-Rifai",
              "Masjid An-Nabawi: Ali Al-Hudhaify, Muhammad Ayyoub, Salah Al-Budair, Abdul Muhsin Al-Qasim, Fares Abbad",
              "Other: Mishary Rashid Alafasy, Nasser Al-Qatami",
            ]},
            {title:"Mushaf Images",items:[
              "Mushaf page images based on the Madinah Mushaf",
              "Published by the King Fahd Complex for the Printing of the Holy Qur'an",
              "Used for educational and non-commercial purposes",
            ]},
            {title:"Live Streams & Ramadan Content",items:[
              "Masjid Al-Haram & Masjid An-Nabawi live streams via Saudi Broadcasting Authority (aloula.sa)",
              "Ramadan Taraweeh & Tahajjud recordings via Shaykh Badr Al-Turki YouTube channel (@sheikh_badr_al_turki)",
              "Imam data referenced from haramain.info",
            ]},
            {title:"Fonts",items:[
              "UthmanicHafs — Quranic script font (King Fahd Complex)",
              "Amiri & Amiri Quran — Khaled Hosny (SIL Open Font License)",
              "Scheherazade New — SIL International (SIL Open Font License)",
              "DM Sans, Playfair Display, IBM Plex Mono — Google Fonts (Open Font License)",
            ]},
            {title:"Technology",items:[
              "Built with React (Meta, MIT License)",
              "HLS.js for live stream playback (Apache 2.0 License)",
              "Hosted and deployed via Vercel",
            ]},
            {title:"Acknowledgements",items:[
              "Quran Foundation (quran.com) — for their open API serving the global Muslim community",
              "everyayah.com — for making ayah-by-ayah recitations freely accessible",
              "King Fahd Complex for the Printing of the Holy Qur'an — for the Madinah Mushaf and UthmanicHafs font",
              "The scholars whose tafsir works illuminate the meaning of the Qur'an",
              "The blessed reciters of the Haramain whose voices guide millions in memorization",
            ]},
          ].map((section,i)=>(
            <div key={i} style={{marginBottom:18}}>
              <div style={{fontSize:10,color:dark?"rgba(212,175,55,0.60)":"#D4AF37",letterSpacing:".14em",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>{section.title}</div>
              <div style={{background:dark?"rgba(255,255,255,0.03)":"#EADFC8",border:dark?"1px solid rgba(212,175,55,0.10)":"1px solid rgba(0,0,0,0.08)",borderRadius:14,padding:"12px 14px"}}>
                {section.items.map((item,j)=>(
                  <div key={j} style={{fontSize:11,color:dark?"rgba(243,231,200,0.65)":"#2D2A26",lineHeight:1.7,padding:"4px 0",borderBottom:j<section.items.length-1?(dark?"1px solid rgba(255,255,255,0.04)":"1px solid rgba(0,0,0,0.04)"):"none"}}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{textAlign:"center",marginTop:20,padding:"16px",borderRadius:14,background:dark?"rgba(255,255,255,0.02)":"#EADFC8",border:dark?"1px solid rgba(212,175,55,0.08)":"1px solid rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.35)":"#6B645A",lineHeight:1.8}}>
              This application is built as a service to the Muslim Ummah for the purpose of Quranic memorization and education. All Quranic content is used with respect for its sacred nature. No content is modified from its original source. All scholarly works are attributed to their authors.
            </div>
            <div style={{fontSize:10,color:dark?"rgba(212,175,55,0.40)":"#D4AF37",marginTop:10}}>NoorTech Studio · 2026</div>
            <div style={{fontSize:9,color:dark?"rgba(243,231,200,0.20)":"#6B645A",marginTop:4}}>Built with sincerity for the sake of Allah</div>
          </div>
        </div>
      )}
    </>
  );
}
