import { MAKKAH_IMAMS, MADINAH_IMAMS, HARAMAIN_SURAHS } from "../data/haramain";

export default function MasjidaynTab({
  dark, T, masjidaynTab, setMasjidaynTab, activeStream,
  selectedRamadanNight, setSelectedRamadanNight,
  ramadanVideoType, setRamadanVideoType,
  haramainMosque, setHaramainMosque,
  openImam, setOpenImam,
  haramainPlaying, playHaramainSurah,
}) {
  return (
    <>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Sub-tab navigation */}
          <div style={{display:"flex",background:T.surface,borderBottom:`1px solid ${T.border}` }}>
            {[
              {id:"live",     label:"📡 Now Live"},
              {id:"ramadan",  label:"🌙 Ramadan 1447 · 2026"},
              {id:"haramain", label:"🎙️ Imams"},
              {id:"about",    label:"ℹ️ About"},
            ].map(t=>(
              <div key={t.id} onClick={()=>setMasjidaynTab(t.id)} style={{flex:1,padding:"10px 6px", textAlign:"center",fontSize:11,fontWeight:masjidaynTab===t.id?700:400,color:masjidaynTab===t.id?T.accent:T.dim,borderBottom:`2px solid ${masjidaynTab===t.id?T.accent:"transparent"}`,cursor:"pointer"}}>
                {t.label}
                </div>
            ))}
          </div>
    
      {/* ═══ LIVE TAB — embedded in-app ═══ */}
      {masjidaynTab==="live"&&(()=>{
        // Official channel IDs from Wikidata (verified)
        // saudiqurantv  → UCos52azQNBgW63_9uDJoPDA (Makkah)
        // saudisunnahtv → UCROKYPep-UuODNwyipe6JMw (Madinah)
        const streams = [
          { id:"makkah",  icon:"🕋", label:"Makkah",  name:"Masjid Al-Haram",     arabic:"قناة القرآن الكريم",  color:"#E5534B",
            channelId:"UCos52azQNBgW63_9uDJoPDA",  handle:"@saudiqurantv" },
          { id:"madinah", icon:"🌙", label:"Madinah", name:"Masjid An-Nabawi",    arabic:"قناة السنة النبوية",  color:"#F0C040",
            channelId:"UCROKYPep-UuODNwyipe6JMw",  handle:"@saudisunnahtv" },
        ];
        const s = streams[activeStream];
        const embedSrc = `https://www.youtube.com/embed/live_stream?channel=${s.channelId}&autoplay=1&rel=0`;

        return (
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} className="fi">

            {/* Watch Live buttons */}
            <div style={{flex:1,overflowY:"auto",padding:"16px 14px 120px",display:"flex",flexDirection:"column",gap:12}}>
              {streams.map((st,i)=>(
                <a key={i} href={`https://www.youtube.com/${st.handle}/live`} target="_blank" rel="noreferrer"
                  style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                    padding:"32px 20px",borderRadius:12,textDecoration:"none",
                    background:`${st.color}15`,border:`2px solid ${st.color}50`,gap:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div className="pulse" style={{width:10,height:10,borderRadius:"50%",background:st.color}}/>
                    <span style={{fontSize:10,color:st.color,fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,letterSpacing:".15em"}}>LIVE NOW</span>
                  </div>
                  <div style={{fontSize:22}}>{st.icon}</div>
                  <div style={{fontSize:16,fontWeight:700,color:T.text}}>{st.name}</div>
                  <div style={{fontSize:11,color:T.dim,direction:"rtl"}}>{st.arabic}</div>
                  <div style={{marginTop:8,padding:"12px 32px",background:st.color,borderRadius:8,
                    fontSize:14,fontWeight:700,color:dark?"#060A07":"#fff"}}>
                    ▶ Watch {st.label} Live
                  </div>
                  <div style={{fontSize:10,color:T.dim}}>Opens official livestream on YouTube</div>
                </a>
              ))}
              <div style={{padding:"12px 14px",background:T.surface,border:`1px solid ${T.accent}20`,borderRadius:8,textAlign:"center"}}>
                <div style={{fontFamily:"'Amiri',serif",fontSize:18,color:T.accent,direction:"rtl",marginBottom:4}}>اللَّهُمَّ ارْزُقْنَا زِيَارَةَ بَيْتِكَ الْحَرَامِ</div>
                <div style={{fontSize:10,color:T.sub,fontStyle:"italic",marginBottom:2}}>"O Allah, grant us the visit to Your Sacred House"</div>
                <div style={{fontSize:9,color:T.dim}}>Ameen 🤲</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ RAMADAN 1447 — Sheikh Badr Al-Turki all 30 nights ═══ */}
      {masjidaynTab==="ramadan"&&(()=>{
        // Ramadan 1447/2026 — Full night videos by Sheikh Badr Al-Turki
        // ▶ = plays in app | null = opens his YouTube channel
        // Add more IDs here as you get them — just share a link!
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

        return (
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} className="fi">

            {/* Header */}
            <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"10px 14px",flexShrink:0}}>
              <div style={{fontSize:9,color:"#E5534B",letterSpacing:".18em",textTransform:"uppercase",marginBottom:2}}>Ramadan 1447 · 2026 · Masjid Al-Haram</div>
              <div style={{fontSize:15,fontWeight:600,color:T.text,marginBottom:1}}>Sheikh Badr Al-Turki — بدر التركي</div>
              <div style={{fontSize:10,color:T.dim}}>
                <span style={{color:"#F0C040"}}>▶</span> Taraweeh  ·  <span style={{color:"#B794F4"}}>▶</span> Tahajjud + Witr  ·  <span style={{color:T.vdim}}>·</span> coming soon
              </div>
            </div>

            {/* Player */}
            <div style={{background:dark?"#000":"#D8CCB0",flexShrink:0}}>
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

            {/* Night list */}
            <div style={{flex:1,overflowY:"auto",padding:"12px 14px 120px"}}>

              {/* Nights 1–20 */}
              <div style={{fontSize:9,color:T.dim,letterSpacing:".14em",textTransform:"uppercase",marginBottom:7,display:"flex",alignItems:"center",gap:7}}>
                <span>Nights 1–20</span><div style={{flex:1,height:1,background:T.border}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:16}}>
                {NIGHTS.filter(x=>x.n<=20).map(x=>(
                  <div key={x.n} className="sbtn" onClick={()=>{setSelectedRamadanNight(x.n);setRamadanVideoType("taraweeh");}} style={{
                    display:"flex",alignItems:"center",gap:8,padding:"7px 10px",
                    background:sel===x.n?"#E5534B12":T.surface,
                    border:`1px solid ${sel===x.n?"#E5534B":T.border}`,borderRadius:7,
                  }}>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,color:sel===x.n?"#E5534B":T.dim,width:22,flexShrink:0}}>{x.n}</div>
                    <span style={{fontSize:10,fontWeight:600,color:sel===x.n?"#E5534B":T.sub}}>
                      Night {x.n} ▶
                    </span>
                  </div>
                ))}
              </div>

              {/* Last 10 */}
              <div style={{fontSize:9,color:"#E5534B",letterSpacing:".14em",textTransform:"uppercase",marginBottom:7,display:"flex",alignItems:"center",gap:7}}>
                <span>Last 10 Nights 🌙</span><div style={{flex:1,height:1,background:"#E5534B30"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:14}}>
                {NIGHTS.filter(x=>x.n>=21).map(x=>{
                  const is27=x.n===27;
                  return (
                    <div key={x.n} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",
                      background:is27?"#E5534B12":T.surface,border:`1px solid ${is27?"#E5534B40":T.border}`,borderRadius:7}}>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,
                        color:is27?"#E5534B":T.dim,width:28,flexShrink:0}}>
                        {x.n}{is27&&<span style={{fontSize:8}}> ★</span>}
                      </div>
                      <div className="sbtn" onClick={()=>{setSelectedRamadanNight(x.n);setRamadanVideoType("taraweeh");}} style={{
                        flex:1,padding:"6px 8px",borderRadius:5,textAlign:"center",
                        background:sel===x.n&&ramadanVideoType==="taraweeh"?"#E5534B":"#E5534B15",
                        border:`1px solid ${sel===x.n&&ramadanVideoType==="taraweeh"?"#E5534B":"#E5534B30"}`,
                      }}>
                        <span style={{fontSize:10,fontWeight:600,color:sel===x.n&&ramadanVideoType==="taraweeh"?(dark?"#060A07":"#fff"):"#E5534B"}}>
                          Night {x.n} Taraweeh {x.taraweeh?"▶":"↗"}
                        </span>
                      </div>
                      <div className="sbtn" onClick={()=>{setSelectedRamadanNight(x.n);setRamadanVideoType("tahajjud");}} style={{
                        flex:1,padding:"6px 8px",borderRadius:5,textAlign:"center",
                        background:sel===x.n&&ramadanVideoType==="tahajjud"?"#B794F4":"#B794F415",
                        border:`1px solid ${sel===x.n&&ramadanVideoType==="tahajjud"?"#B794F4":"#B794F430"}`,
                      }}>
                        <span style={{fontSize:10,fontWeight:600,color:sel===x.n&&ramadanVideoType==="tahajjud"?(dark?"#060A07":"#fff"):"#B794F4"}}>
                          Night {x.n} Tahajjud {x.tahajjud?"▶":"↗"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Channel link */}
              <a href="https://www.youtube.com/@sheikh_badr_al_turki/videos" target="_blank" rel="noreferrer"
                 style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",
                   background:T.surface,border:"1px solid #E5534B30",borderRadius:7,textDecoration:"none",marginBottom:16}}>
                <div>
                  <div style={{fontSize:12,color:T.accent,fontWeight:600,marginBottom:1}}>@sheikh_badr_al_turki</div>
                  <div style={{fontSize:10,color:T.dim}}>All 30 nights · Full playlist on YouTube</div>
                </div>
                <div style={{padding:"7px 14px",background:T.accent,color:dark?"#060A07":"#fff",borderRadius:5,fontSize:11,fontWeight:700}}>
                  View All
                </div>
              </a>

              {/* Dua */}
              <div style={{padding:"14px 18px",background:T.surface,border:"1px solid #E5534B20",borderRadius:8,textAlign:"center"}}>
                <div style={{fontFamily:"'Amiri',serif",fontSize:18,color:T.accent,direction:"rtl",marginBottom:6}}>
                  اللَّهُمَّ بَلِّغْنَا رَمَضَانَ وَتَقَبَّلْ مِنَّا
                </div>
                <div style={{fontSize:11,color:T.sub,fontStyle:"italic",marginBottom:2}}>"O Allah, allow us to reach Ramadan and accept it from us"</div>
                <div style={{fontSize:9,color:T.dim}}>Ramadan 1447 · May Allah accept all your prayers and worship 🤲</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ HARAMAIN TAB — FIXED (correct position, accurate notes) ═══ */}
      {masjidaynTab==="haramain"&&(()=>{
        const imams = haramainMosque==="makkah" ? MAKKAH_IMAMS : MADINAH_IMAMS;
        const mosqueColor = haramainMosque==="makkah" ? "#E5534B" : "#F0C040";

        return (
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} className="fi">

            {/* Mosque selector */}
            <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"10px 14px",flexShrink:0}}>
              <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase",marginBottom:8}}>Haramain Imams — Quran Recordings</div>
              <div style={{display:"flex",gap:8}}>
                {[
                  {id:"makkah", label:"🕋 Masjid Al-Haram", arabic:"مكة المكرمة", color:"#E5534B"},
                  {id:"madinah",label:"🌙 Masjid An-Nabawi",arabic:"المدينة المنورة",color:"#F0C040"},
                ].map(m=>(
                  <div key={m.id} className="sbtn" onClick={()=>{setHaramainMosque(m.id);setOpenImam(null);}} style={{flex:1,padding:"9px 12px",borderRadius:7,background:haramainMosque===m.id?`${m.color}18`:T.surface2,border:`1px solid ${haramainMosque===m.id?m.color+"60":T.border}`,textAlign:"center"}}>
                    <div style={{fontSize:12,fontWeight:haramainMosque===m.id?600:400,color:haramainMosque===m.id?T.text:T.sub,marginBottom:2}}>{m.label}</div>
                    <div style={{fontSize:9,color:haramainMosque===m.id?m.color:T.dim,direction:"rtl"}}>{m.arabic}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div style={{padding:"8px 14px",borderBottom:`1px solid ${T.border}`,flexShrink:0,display:"flex",gap:14,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#F0C040"}}/>
                <span style={{fontSize:9,color:"#F0C040"}}>Full Quran (114 surahs)</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#F6A623"}}/>
                <span style={{fontSize:9,color:"#F6A623"}}>Partial collection</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#E5534B"}}/>
                <span style={{fontSize:9,color:"#E5534B"}}>Prayer recordings only</span>
              </div>
            </div>

            {/* Imam list */}
            <div style={{flex:1,overflowY:"auto",padding:"12px 14px 120px"}}>
              <div style={{fontSize:10,color:T.dim,marginBottom:10,lineHeight:1.6}}>
                Tap an imam to browse their surah recordings. Source: haramain.info / Internet Archive.
              </div>
              {/* Current Imams */}
              {imams.filter(i=>i.status==="current").length>0&&(
                <div style={{fontSize:9,color:mosqueColor,letterSpacing:".14em",textTransform:"uppercase",fontWeight:700,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                  <span>Current Imams</span><div style={{flex:1,height:1,background:`${mosqueColor}30`}}/>
                </div>
              )}
              {imams.filter(i=>i.status==="current").map((imam)=>{
                const isOpen = openImam===imam.id;
                const isFull = imam.surahCount===114;
                const hasAudio = !!(imam.archive || imam.quranicaudio || imam.mp3quran);
                const audioSource = imam.archive?"Archive":imam.quranicaudio?"QuranicAudio":null;
                const badgeColor = isFull ? "#F0C040" : hasAudio ? "#F6A623" : "#E5534B";
                const badgeLabel = isFull ? "✓ Full Quran" : hasAudio ? "◦ Partial" : "✕ Prayer only";
                return (
                  <div key={imam.id} style={{marginBottom:6,border:`1px solid ${isOpen?mosqueColor+"40":T.border}`,borderLeft:`3px solid ${isOpen?mosqueColor:T.border2}`,borderRadius:isOpen?"6px 6px 0 0":"6px",overflow:"hidden"}}>
                    <div className="srow" onClick={()=>setOpenImam(isOpen?null:imam.id)} style={{padding:"11px 14px",background:isOpen?T.surface2:T.surface,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:isOpen?T.text:T.sub}}>{imam.name}</div>
                        <div style={{display:"flex",gap:8,alignItems:"center",marginTop:3,flexWrap:"wrap"}}>
                          <span style={{fontSize:11,color:isOpen?mosqueColor:T.dim,direction:"rtl"}}>{imam.arabic}</span>
                          <span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:`${badgeColor}15`,border:`1px solid ${badgeColor}40`,color:badgeColor}}>
                            {badgeLabel}
                          </span>
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        {imam.archive&&(
                          <a href={`https://archive.org/details/${imam.archive}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:9,color:T.accent,textDecoration:"none",padding:"3px 8px",border:`1px solid ${T.accent}40`,borderRadius:4}}>Archive ↗</a>
                        )}
                        {imam.quranicaudio&&!imam.archive&&(
                          <span style={{fontSize:8,color:T.dim,padding:"2px 6px",border:`1px solid ${T.border}`,borderRadius:4}}>QuranicAudio</span>
                        )}
                        <div style={{color:isOpen?mosqueColor:T.dim,fontSize:16,transition:"transform .2s",transform:isOpen?"rotate(90deg)":"none"}}>›</div>
                      </div>
                    </div>

                    {isOpen&&(
                      !hasAudio ? (
                        <div className="fi" style={{background:T.surface,borderTop:`1px solid ${T.border}`,padding:"16px 14px"}}>
                          <div style={{fontSize:12,color:T.sub,lineHeight:1.7,marginBottom:10}}>
                            📿 <strong style={{color:mosqueColor}}>{imam.name}</strong> leads prayers at the Haramain but does not have a compiled full Quran archive on haramain.info.
                          </div>
                          <div style={{fontSize:11,color:T.dim,lineHeight:1.6,marginBottom:12}}>
                            Daily prayer recordings (Fajr, Maghrib, Isha, Taraweeh) are posted on haramain.info. Check there for his latest recordings.
                          </div>
                          <a href={`https://www.haramain.info/search/label/Sheikh%20Shamsaan%20-%20%D9%84%D9%84%D8%B4%D9%8A%D8%AE%20%D8%A7%D9%84%D8%B4%D9%85%D8%B3%D8%A7%D9%86`} target="_blank" rel="noreferrer" style={{display:"inline-block",fontSize:11,color:T.accent,textDecoration:"none",padding:"7px 14px",border:`1px solid ${T.accent}40`,borderRadius:6}}>
                            View Recordings on Haramain.info ↗
                          </a>
                        </div>
                      ) : (
                        <div className="fi" style={{background:T.surface,borderTop:`1px solid ${mosqueColor}20`,padding:"8px 8px 12px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:4}}>
                          {HARAMAIN_SURAHS.map((name,si)=>{
                            const sNum=si+1;
                            if(imam.availableSurahs&&!imam.availableSurahs.includes(sNum)) return null;
                            const pkey=`${imam.id}-${sNum}`;
                            const isP=haramainPlaying===pkey;
                            return (
                              <div key={sNum} className="sbtn" onClick={()=>playHaramainSurah(imam,sNum,pkey)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:5,background:isP?`${mosqueColor}15`:T.surface2,border:`1px solid ${isP?mosqueColor:T.border}`}}>
                                <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,background:isP?mosqueColor:T.surface,border:`1px solid ${isP?mosqueColor:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:isP?"#fff":T.dim}}>
                                  {isP?"⏸":"▶"}
                                </div>
                                <div style={{minWidth:0}}>
                                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:isP?mosqueColor:T.vdim}}>{String(sNum).padStart(3,"0")}</div>
                                  <div style={{fontSize:10,color:isP?T.text:T.sub,lineHeight:1.3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>
                );
              })}
              {/* Former Imams */}
              {imams.filter(i=>i.status==="former").length>0&&(
                <div style={{fontSize:9,color:T.dim,letterSpacing:".14em",textTransform:"uppercase",fontWeight:700,marginTop:18,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                  <span>Former Imams</span><div style={{flex:1,height:1,background:T.border}}/>
                </div>
              )}
              {imams.filter(i=>i.status==="former").map((imam)=>{
                const isOpen = openImam===imam.id;
                const isFull = imam.surahCount===114;
                const hasAudio = !!(imam.archive || imam.quranicaudio || imam.mp3quran);
                const badgeColor = isFull ? "#F0C040" : hasAudio ? "#F6A623" : "#E5534B";
                const badgeLabel = isFull ? "✓ Full Quran" : hasAudio ? "◦ Partial" : "✕ Prayer only";
                return (
                  <div key={imam.id} style={{marginBottom:6,border:`1px solid ${isOpen?mosqueColor+"40":T.border}`,borderLeft:`3px solid ${isOpen?mosqueColor:T.border2}`,borderRadius:isOpen?"6px 6px 0 0":"6px",overflow:"hidden",opacity:0.85}}>
                    <div className="srow" onClick={()=>setOpenImam(isOpen?null:imam.id)} style={{padding:"11px 14px",background:isOpen?T.surface2:T.surface,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:isOpen?T.text:T.sub}}>{imam.name}</div>
                        <div style={{display:"flex",gap:8,alignItems:"center",marginTop:3,flexWrap:"wrap"}}>
                          <span style={{fontSize:11,color:isOpen?mosqueColor:T.dim,direction:"rtl"}}>{imam.arabic}</span>
                          {imam.deceased&&<span style={{fontSize:8,padding:"1px 6px",borderRadius:10,background:T.surface2,border:`1px solid ${T.border}`,color:T.dim}}>{imam.deceased}</span>}
                          {imam.retired&&!imam.deceased&&<span style={{fontSize:8,padding:"1px 6px",borderRadius:10,background:T.surface2,border:`1px solid ${T.border}`,color:T.dim}}>{imam.retired}</span>}
                          <span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:`${badgeColor}15`,border:`1px solid ${badgeColor}40`,color:badgeColor}}>{badgeLabel}</span>
                        </div>
                      </div>
                      <div style={{color:isOpen?mosqueColor:T.dim,fontSize:16,transition:"transform .2s",transform:isOpen?"rotate(90deg)":"none"}}>›</div>
                    </div>
                    {isOpen&&hasAudio&&(
                      <div className="fi" style={{background:T.surface,borderTop:`1px solid ${mosqueColor}20`,padding:"8px 8px 12px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:4}}>
                        {HARAMAIN_SURAHS.map((name,si)=>{
                          const sNum=si+1;
                          if(imam.availableSurahs&&!imam.availableSurahs.includes(sNum)) return null;
                          const pkey=`${imam.id}-${sNum}`;
                          const isP=haramainPlaying===pkey;
                          return (
                            <div key={sNum} className="sbtn" onClick={()=>playHaramainSurah(imam,sNum,pkey)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:5,background:isP?`${mosqueColor}15`:T.surface2,border:`1px solid ${isP?mosqueColor:T.border}`}}>
                              <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,background:isP?mosqueColor:T.surface,border:`1px solid ${isP?mosqueColor:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:isP?"#fff":T.dim}}>
                                {isP?"⏸":"▶"}
                              </div>
                              <div style={{minWidth:0}}>
                                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:isP?mosqueColor:T.vdim}}>{String(sNum).padStart(3,"0")}</div>
                                <div style={{fontSize:10,color:isP?T.text:T.sub,lineHeight:1.3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

    </div>

      {/* ═══ ABOUT & CREDITS ═══ */}
      {masjidaynTab==="about"&&(
        <div style={{flex:1,overflowY:"auto",padding:"20px 18px 120px",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2"}}>
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
