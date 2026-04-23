import { useState, useEffect, useRef } from "react";
import { SURAH_EN } from "../data/constants";
import { JUZ_META, JUZ_SURAHS } from "../data/quran-metadata";

const JUZ_PAGES = [1,22,42,62,82,102,121,142,162,182,201,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582,605];

function loadQcfFont(pageN, loadedFonts, setLoadedFonts) {
  if (!pageN || pageN < 1 || pageN > 604) return;
  const elId = `qcf-font-v2-${pageN}`;
  if (!document.getElementById(elId)) {
    const style = document.createElement("style");
    style.id = elId;
    style.textContent = `@font-face{font-family:'p${pageN}';src:url('https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v2/woff2/p${pageN}.woff2') format('woff2'),url('https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v2/woff/p${pageN}.woff') format('woff');font-display:block;}`;
    document.head.appendChild(style);
  }
  if (loadedFonts.has(pageN)) return;
  if (document.fonts && document.fonts.load) {
    document.fonts.load(`16px 'p${pageN}'`).then(() => {
      setLoadedFonts(prev => { const n = new Set(prev); n.add(pageN); return n; });
    }).catch(() => {});
  }
}

export default function MyMemorizationView({
  dark,
  rihlahScrollRef,
  sessionJuz, setSessionJuz,
  juzStatus,
  juzProgress,
  totalSV,
  sessionVerses, sessionIdx,
  memSections, setMemSections,
  setActiveTab,
  setRihlahTab,
  setMushafPage,
  setQuranMode,
}) {
  const [reviewJuz, setReviewJuz] = useState(null);
  const [reviewPageIdx, setReviewPageIdx] = useState(0);
  const touchStartX = useRef(0);
  const [mushafPagesData, setMushafPagesData] = useState(null);
  const [mushafLayoutData, setMushafLayoutData] = useState(null);
  const [loadedFonts, setLoadedFonts] = useState(() => new Set());
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, l] = await Promise.all([fetch("/mushaf-pages.json"), fetch("/mushaf-layout.json")]);
        if (!cancelled && p.ok) setMushafPagesData(await p.json());
        if (!cancelled && l.ok) setMushafLayoutData(await l.json());
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (reviewJuz == null) return;
    setReviewPageIdx(0);
    const first = JUZ_PAGES[reviewJuz - 1];
    const last = (JUZ_PAGES[reviewJuz] || 605) - 1;
    for (let p = first; p <= last; p++) loadQcfFont(p, loadedFonts, setLoadedFonts);
  }, [reviewJuz]);
  const isJDone = (n) => juzStatus[n] === "complete" || (JUZ_SURAHS[n] || []).every(s => juzStatus[`s${s.s}`] === "complete");
  const currentJuz = sessionJuz || 30;
  const currentMeta = JUZ_META.find(j => j.num === currentJuz) || JUZ_META[0];
  const currentSurahs = JUZ_SURAHS[currentJuz] || [];
  const currentSurah = currentSurahs.find(s => juzStatus[`s${s.s}`] !== "complete") || currentSurahs[0];
  const curProg = juzProgress[currentJuz] || 0;
  const curTotal = totalSV || currentSurahs.reduce((n, s) => n + s.a, 0);

  const completedJuz = JUZ_META.filter(j => j.num !== currentJuz && isJDone(j.num)).sort((a, b) => b.num - a.num);
  const inProgressJuz = JUZ_META.filter(j => j.num !== currentJuz && !isJDone(j.num) && (juzStatus[`s${(JUZ_SURAHS[j.num] || [])[0]?.s}`] === "complete" || (juzProgress[j.num] || 0) > 0)).sort((a, b) => b.num - a.num);
  const upcomingJuz = JUZ_META.filter(j => j.num !== currentJuz && !isJDone(j.num) && !inProgressJuz.find(ip => ip.num === j.num)).sort((a, b) => b.num - a.num);

  const openSection = memSections;
  const toggleSection = (key) => setMemSections(p => ({ ...p, [key]: !p[key] }));

  const allJourneyNums = new Set([...completedJuz.map(j => j.num), currentJuz, ...upcomingJuz.slice(0, 2).map(j => j.num)]);
  const journeyItems = [...allJourneyNums].sort((a, b) => b - a).slice(0, 6).map(num => ({
    num, state: num === currentJuz ? "current" : isJDone(num) ? "completed" : "upcoming"
  }));

  if (reviewJuz != null) {
    const meta = JUZ_META.find(m => m.num === reviewJuz);
    const firstPage = JUZ_PAGES[reviewJuz - 1];
    const lastPage = (JUZ_PAGES[reviewJuz] || 605) - 1;
    const juzSurahsSet = new Set((JUZ_SURAHS[reviewJuz] || []).map(s => s.s));
    const pages = [];
    for (let p = firstPage; p <= lastPage; p++) pages.push(p);
    return (
      <div ref={rihlahScrollRef} style={{flex:1,overflowY:"auto",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",padding:"14px 16px 120px"}} className="fi gold-particles">
        <div style={{marginBottom:16}}>
          <div className="sbtn" onClick={()=>setReviewJuz(null)} style={{display:"inline-block",padding:"6px 12px",background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",border:dark?"1px solid rgba(217,177,95,0.12)":"1px solid rgba(0,0,0,0.10)",borderRadius:8,fontSize:11,color:dark?"rgba(243,231,200,0.50)":"#6B645A",marginBottom:10}}>← Back</div>
          <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.60)":"rgba(140,100,20,0.65)",letterSpacing:".18em",textTransform:"uppercase",fontWeight:600}}>Review · Juz {reviewJuz}</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:dark?"#F3E7C8":"#2D2A26",fontWeight:700,marginTop:6}}>Juz {meta?.roman || reviewJuz}</div>
          <div style={{fontSize:11,color:dark?"rgba(230,184,74,0.45)":"rgba(140,100,20,0.55)",marginTop:6}}>Pages {firstPage}–{lastPage} · Complete — Alhamdulillah</div>
        </div>
        {(() => {
          const pn = pages[Math.max(0, Math.min(reviewPageIdx, pages.length - 1))];
          const fontReady = loadedFonts.has(pn);
          const pageLines = mushafPagesData && mushafPagesData[pn];
          const pageLayout = mushafLayoutData && mushafLayoutData[pn];
          const canPrev = reviewPageIdx > 0;
          const canNext = reviewPageIdx < pages.length - 1;
          const goPrev = () => { if (canPrev) setReviewPageIdx(i => i - 1); };
          const goNext = () => { if (canNext) setReviewPageIdx(i => i + 1); };
          if (!pageLines || !pageLayout || !fontReady) {
            return (
              <div style={{minHeight:200,display:"flex",alignItems:"center",justifyContent:"center",color:dark?"rgba(217,177,95,0.35)":"rgba(107,100,90,0.55)",fontSize:11,letterSpacing:".08em"}}>
                loading page {pn}…
              </div>
            );
          }
          const firstSurahName = pageLayout.find(e => e.type === "surah_name");
          let currentSurah = firstSurahName ? firstSurahName.sn - 1 : ((JUZ_SURAHS[reviewJuz] || [])[0]?.s || null);
          let ayahIdx = -1;
          const rendered = pageLayout.map((entry, i) => {
            const type = entry.type;
            if (type !== "surah_name" && type !== "basmallah") ayahIdx++;
            if (type === "surah_name") currentSurah = entry.sn;
            if (!juzSurahsSet.has(currentSurah)) return null;
            const isCenter = entry.center === 1;
            if (type === "surah_name") {
              return (
                <div key={i} style={{textAlign:"center",padding:"6px 0"}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:dark?"rgba(232,200,120,0.80)":"rgba(0,0,0,0.65)",fontWeight:700}}>{SURAH_EN[entry.sn] || `Surah ${entry.sn}`}</div>
                </div>
              );
            }
            if (type === "basmallah") {
              return (
                <div key={i} style={{textAlign:"center",padding:"4px 0"}}>
                  <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(18px,5vw,26px)",color:dark?"rgba(232,200,120,0.75)":"rgba(0,0,0,0.55)",direction:"rtl",lineHeight:1.8}}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>
                </div>
              );
            }
            const lineText = pageLines[ayahIdx] || "";
            return (
              <div key={i} style={{direction:"rtl",display:"flex",justifyContent:isCenter?"center":"space-between",alignItems:"center",maxWidth:"min(560px,94vw)",marginInline:"auto",fontFamily:`'p${pn}',serif`,fontSize:"clamp(22px,5.4vw,31px)",color:dark?"#E8DFC0":"#2D2A26",padding:"6px 0",whiteSpace:"nowrap",gap:isCenter?"0.25em":0}}>
                {lineText.split(" ").map((w, wi) => (<span key={wi}>{w}</span>))}
              </div>
            );
          }).filter(Boolean);
          return (
            <div
              onTouchStart={e=>{ touchStartX.current = e.touches[0].clientX; }}
              onTouchEnd={e=>{
                const dx = e.changedTouches[0].clientX - touchStartX.current;
                if (Math.abs(dx) < 40) return;
                if (dx < 0) goNext(); else goPrev();
              }}
            >
              {rendered}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:18,padding:"10px 8px",borderTop:dark?"1px solid rgba(217,177,95,0.10)":"1px solid rgba(0,0,0,0.06)"}}>
                <div className="sbtn" onClick={goPrev} style={{padding:"8px 16px",fontSize:18,borderRadius:8,color:canPrev?(dark?"rgba(217,177,95,0.60)":"#6B645A"):(dark?"rgba(217,177,95,0.15)":"rgba(0,0,0,0.18)"),border:dark?"1px solid rgba(217,177,95,0.15)":"1px solid rgba(139,106,16,0.18)",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.04)"}}>‹</div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:dark?"rgba(217,177,95,0.45)":"rgba(140,100,20,0.55)"}}>Page {pn} · {reviewPageIdx+1} / {pages.length}</div>
                <div className="sbtn" onClick={goNext} style={{padding:"8px 16px",fontSize:18,borderRadius:8,color:canNext?(dark?"rgba(217,177,95,0.60)":"#6B645A"):(dark?"rgba(217,177,95,0.15)":"rgba(0,0,0,0.18)"),border:dark?"1px solid rgba(217,177,95,0.15)":"1px solid rgba(139,106,16,0.18)",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.04)"}}>›</div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  return (
    <div ref={rihlahScrollRef} style={{flex:1,overflowY:"auto",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",padding:"14px 16px 120px"}} className="fi gold-particles">

      {/* Header */}
      <div style={{marginBottom:20}}>
        <div className="sbtn" onClick={()=>setRihlahTab("home")} style={{display:"inline-block",padding:"6px 12px",background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",border:dark?"1px solid rgba(217,177,95,0.12)":"1px solid rgba(0,0,0,0.10)",borderRadius:8,fontSize:11,color:dark?"rgba(243,231,200,0.50)":"#6B645A",marginBottom:10}}>← Back</div>
        <div style={{fontSize:9,color:dark?"rgba(217,177,95,0.60)":"rgba(140,100,20,0.65)",letterSpacing:".18em",textTransform:"uppercase",fontWeight:600}}>My Memorization</div>
      </div>

      {/* ── 1. CURRENT FOCUS CARD ── */}
      <div style={{padding:"20px 18px",borderRadius:18,marginBottom:18,position:"relative",overflow:"hidden",
        background:dark?"linear-gradient(180deg,rgba(15,26,43,0.97) 0%,rgba(12,21,38,0.99) 100%)":"linear-gradient(180deg,#E4D9C0 0%,#DDD0B5 100%)",
        border:dark?"1px solid rgba(230,184,74,0.28)":"1px solid rgba(140,100,20,0.18)",
        boxShadow:dark?"0 10px 40px rgba(0,0,0,0.40),0 0 24px rgba(230,184,74,0.10),inset 0 1px 0 rgba(255,255,255,0.03)":"0 4px 16px rgba(0,0,0,0.06)"}}>
        <div style={{position:"absolute",inset:0,pointerEvents:"none",background:dark?"radial-gradient(circle at 20% 30%,rgba(212,175,55,0.08) 0%,transparent 50%),radial-gradient(circle at 80% 70%,rgba(212,175,55,0.03) 0%,transparent 40%)":"none"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{marginBottom:6}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:dark?"#E6B84A":"#8B6A10",letterSpacing:".01em",lineHeight:1.2}}>Juz {currentMeta.roman||currentMeta.arabic}</div>
            <div style={{fontSize:10,color:dark?"rgba(230,184,74,0.40)":"rgba(140,100,20,0.50)",marginTop:2,letterSpacing:".06em"}}>Juz {currentJuz}</div>
          </div>
          {(()=>{const nv=sessionVerses[sessionIdx];const sn=nv?.surah_number||parseInt(nv?.verse_key?.split(":")[0]||"0",10);const name=SURAH_EN[sn]||currentSurah?.name;return name?<div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:dark?"#F3E7C8":"#2D2A26",fontWeight:700,marginBottom:12,lineHeight:1.2}}>Surah {name}</div>:null;})()}
          <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.40)":"rgba(40,30,10,0.45)",marginBottom:8}}><span style={{color:dark?"#E6B84A":"#8B6A10"}}>In Progress</span></div>
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
              <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.35)":"rgba(40,30,10,0.40)"}}>Progress</div>
              <div style={{fontSize:12,color:dark?"rgba(230,184,74,0.65)":"rgba(140,100,20,0.70)",fontFamily:"'IBM Plex Mono',monospace"}}>{curProg} / {curTotal} ayahs</div>
            </div>
            <div style={{height:6,borderRadius:999,background:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)",overflow:"hidden"}}>
              <div className="pbfill" style={{height:"100%",width:`${curTotal>0?Math.round((curProg/curTotal)*100):0}%`,background:"linear-gradient(90deg,#D4AF37,#F6E27A)",borderRadius:999,boxShadow:"0 0 8px rgba(212,175,55,0.30)"}}/>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.28)":"rgba(40,30,10,0.35)"}}>Next: {(()=>{const nv=sessionVerses[sessionIdx];if(!nv) return "—";const sn=nv.surah_number||parseInt(nv.verse_key?.split(":")[0],10);return `${SURAH_EN[sn]||""} ${nv.verse_key}`;})()}</div>
            <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.22)":"rgba(40,30,10,0.30)"}}>Last session: Today</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div className="sbtn" onClick={()=>{setActiveTab("myhifz");}} style={{display:"inline-block",padding:"11px 22px",borderRadius:12,fontSize:13,fontWeight:700,color:"#0B1220",background:"linear-gradient(180deg,#E6B84A,#D4A62A)",boxShadow:"0 6px 18px rgba(230,184,74,0.25),0 0 12px rgba(230,184,74,0.12)"}}>
              Continue Memorization
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. JOURNEY STRIP ── */}
      <div style={{marginBottom:18}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:dark?"#F3E7C8":"#2D2A26",marginBottom:12}}>Your Journey Through the Qur'an</div>
        <div style={{display:"flex",alignItems:"center",overflowX:"auto",gap:0,padding:"8px 0"}}>
          {journeyItems.map((item,i)=>{
            const isCur=item.state==="current";
            const isDone=item.state==="completed";
            return (
              <div key={item.num} style={{display:"flex",alignItems:"center",flexShrink:0}}>
                {i>0&&<div style={{width:24,height:2,background:isDone||isCur?"rgba(212,175,55,0.35)":(dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.08)")}}/>}
                <div style={{padding:isCur?"10px 18px":"8px 14px",borderRadius:12,textAlign:"center",
                  background:isCur?(dark?"rgba(217,177,95,0.12)":"rgba(180,140,40,0.10)"):isDone?(dark?"rgba(217,177,95,0.04)":"rgba(180,140,40,0.05)"):(dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)"),
                  border:`1px solid ${isCur?(dark?"rgba(232,200,120,0.55)":"rgba(160,120,20,0.40)"):isDone?(dark?"rgba(217,177,95,0.18)":"rgba(160,120,20,0.15)"):(dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)")}`,
                  boxShadow:isCur?"0 0 20px rgba(230,184,74,0.20)":"none"}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:isCur?14:11,fontWeight:isCur?700:500,color:isCur?(dark?"#F6E27A":"#6B4F00"):isDone?(dark?"rgba(230,184,74,0.55)":"rgba(140,100,20,0.55)"):(dark?"rgba(255,255,255,0.25)":"rgba(0,0,0,0.25)"),whiteSpace:"nowrap"}}>{`Juz ${JUZ_META.find(m=>m.num===item.num)?.roman||item.num}`}</div>
                  <div style={{fontSize:9,color:isCur?(dark?"rgba(230,184,74,0.65)":"rgba(140,100,20,0.60)"):isDone?(dark?"rgba(230,184,74,0.35)":"rgba(140,100,20,0.40)"):(dark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.20)"),marginTop:2}}>
                    {isCur?"Current":isDone?"Completed":"Next"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. COMPLETED JUZ ── */}
      {completedJuz.length>0&&(
        <div style={{marginBottom:12}}>
          <div className="sbtn" onClick={()=>toggleSection("completed")} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
            <div style={{fontSize:12,color:"rgba(243,231,200,0.55)",fontWeight:600}}>Completed Juz <span style={{color:"rgba(243,231,200,0.30)"}}>({completedJuz.length})</span></div>
            <div style={{color:"rgba(217,177,95,0.40)",fontSize:14,transition:"transform .2s",transform:openSection.completed?"rotate(180deg)":"rotate(0deg)"}}>▾</div>
          </div>
          {openSection.completed&&(<>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {(openSection.completedAll?completedJuz:completedJuz.slice(0,3)).map(j=>{
                const jMeta=JUZ_META.find(m=>m.num===j.num);
                return (
                  <div key={j.num} style={{padding:"16px 16px",borderRadius:14,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(217,177,95,0.12)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{color:"rgba(243,231,200,0.75)"}}>
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700}}>Juz {jMeta?.roman||`${j.num}`}</div>
                        <div style={{fontSize:10,color:"rgba(243,231,200,0.35)",marginTop:2,letterSpacing:".06em"}}>Juz {j.num}</div>
                      </div>
                        <div style={{fontSize:11,color:"rgba(230,184,74,0.45)",marginTop:4,textShadow:"0 0 6px rgba(230,184,74,0.10)"}}>Complete — Alhamdulillah</div>
                      </div>
                      <div className="sbtn" onClick={()=>setReviewJuz(j.num)} style={{padding:"6px 12px",borderRadius:10,fontSize:10,fontWeight:500,color:"rgba(243,231,200,0.30)",background:"transparent",border:"1px solid rgba(217,177,95,0.08)"}}>
                        Review
                      </div>
                    </div>
                    <div style={{height:3,borderRadius:999,background:"rgba(255,255,255,0.06)",marginTop:12,overflow:"hidden"}}>
                      <div style={{height:"100%",width:"100%",background:"linear-gradient(90deg,rgba(212,175,55,0.40),rgba(246,226,122,0.30))",borderRadius:999}}/>
                    </div>
                  </div>
                );
              })}
            </div>
            {completedJuz.length>3&&(
              <div className="sbtn" onClick={()=>toggleSection("completedAll")}
                style={{textAlign:"center",padding:"8px",marginTop:10,borderRadius:8,fontSize:10,fontWeight:500,
                  color:"rgba(217,177,95,0.30)",border:"1px dashed rgba(217,177,95,0.08)",background:"transparent"}}>
                {openSection.completedAll?"Show less":"View all "+completedJuz.length+" completed"}
              </div>
            )}
          </>)}
        </div>
      )}

      {/* ── 4. IN PROGRESS ── */}
      {inProgressJuz.length>0&&(
        <div style={{marginBottom:12}}>
          <div className="sbtn" onClick={()=>toggleSection("inprogress")} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
            <div style={{fontSize:12,color:"rgba(243,231,200,0.55)",fontWeight:600}}>In Progress <span style={{color:"rgba(243,231,200,0.30)"}}>({inProgressJuz.length})</span></div>
            <div style={{color:"rgba(217,177,95,0.40)",fontSize:14,transition:"transform .2s",transform:openSection.inprogress?"rotate(180deg)":"rotate(0deg)"}}>▾</div>
          </div>
          {openSection.inprogress&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {inProgressJuz.map(j=>{
                const jMeta=JUZ_META.find(m=>m.num===j.num);
                const jp=juzProgress[j.num]||0;
                const jTotal=(JUZ_SURAHS[j.num]||[]).reduce((n,s)=>n+s.a,0);
                return (
                  <div key={j.num} style={{padding:"14px 16px",borderRadius:14,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(217,177,95,0.10)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{color:"rgba(243,231,200,0.75)"}}>
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700}}>Juz {jMeta?.roman||`${j.num}`}</div>
                        <div style={{fontSize:10,color:"rgba(243,231,200,0.35)",marginTop:2,letterSpacing:".06em"}}>Juz {j.num}</div>
                      </div>
                        <div style={{fontSize:11,color:"rgba(243,231,200,0.35)",marginTop:3}}>Progress</div>
                      </div>
                      <div className="sbtn" onClick={()=>{setSessionJuz(j.num);setActiveTab("myhifz");}} style={{padding:"7px 14px",borderRadius:10,fontSize:11,fontWeight:600,color:"#E6B84A",background:"rgba(230,184,74,0.08)",border:"1px solid rgba(230,184,74,0.20)"}}>
                        Continue
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
                      <div style={{flex:1,height:4,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${jTotal>0?Math.round((jp/jTotal)*100):0}%`,background:"linear-gradient(90deg,#D4AF37,#E6B84A)",borderRadius:999}}/>
                      </div>
                      <div style={{fontSize:11,color:"rgba(243,231,200,0.35)",fontFamily:"'IBM Plex Mono',monospace"}}>{jp} / {jTotal}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 5. UPCOMING JUZ ── */}
      {upcomingJuz.length>0&&(
        <div style={{marginBottom:12}}>
          <div className="sbtn" onClick={()=>toggleSection("upcoming")} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
            <div style={{fontSize:12,color:"rgba(243,231,200,0.55)",fontWeight:600}}>Upcoming Juz</div>
            <div style={{color:"rgba(217,177,95,0.40)",fontSize:14,transition:"transform .2s",transform:openSection.upcoming?"rotate(180deg)":"rotate(0deg)"}}>▾</div>
          </div>
          {openSection.upcoming&&(<>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {upcomingJuz.slice(0,3).map(j=>(
                <div key={j.num} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.04)"}}>
                  <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:"rgba(243,231,200,0.55)",fontWeight:700}}>Juz {JUZ_META.find(m=>m.num===j.num)?.roman||j.num}</div><div style={{fontSize:9,color:"rgba(243,231,200,0.22)",marginTop:2,letterSpacing:".06em"}}>Juz {j.num}</div></div>
                  <div style={{fontSize:11,color:"rgba(243,231,200,0.20)"}}>Ready to start</div>
                </div>
              ))}
            </div>
            {upcomingJuz.length>3&&(
              <div className="sbtn" onClick={()=>toggleSection("upcomingAll")}
                style={{textAlign:"center",padding:"8px",marginTop:6,borderRadius:8,fontSize:10,fontWeight:500,
                  color:"rgba(217,177,95,0.30)",border:"1px dashed rgba(217,177,95,0.08)",background:"transparent"}}>
                {openSection.upcomingAll?"Show less":"View all "+upcomingJuz.length+" upcoming"}
              </div>
            )}
            {openSection.upcomingAll&&upcomingJuz.length>3&&(
              <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:6}}>
                {upcomingJuz.slice(3).map(j=>(
                  <div key={j.num} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.04)"}}>
                    <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:"rgba(243,231,200,0.55)",fontWeight:700}}>Juz {JUZ_META.find(m=>m.num===j.num)?.roman||j.num}</div><div style={{fontSize:9,color:"rgba(243,231,200,0.22)",marginTop:2,letterSpacing:".06em"}}>Juz {j.num}</div></div>
                    <div style={{fontSize:11,color:"rgba(243,231,200,0.20)"}}>Ready to start</div>
                  </div>
                ))}
              </div>
            )}
          </>)}
        </div>
      )}

    </div>
  );
}
