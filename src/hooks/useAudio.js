import { useState, useRef } from "react";
import { RECITERS, QURAN_RECITERS } from "../data/constants";

export default function useAudio({ reciter, currentReciter, looping, quranReciter }) {
  const [playingKey,setPlayingKey]=useState(null);
  const [audioLoading,setAudioLoading]=useState(null);
  const audioRef=useRef(null);
  const [playingSurah, setPlayingSurah] = useState(null);
  const surahQueueRef = useRef([]);
  const surahIdxRef = useRef(0);
  const [mushafAudioPlaying,setMushafAudioPlaying]=useState(false);

  function getEveryayahFolder(id){
    if(!id) return null; // no reciter picked — caller must handle (don't play)
    const r=RECITERS.find(x=>x.id===id);
    return r?.everyayah||null;
  }

  function getArchiveUrl(id, surahNum){ const r=RECITERS.find(x=>x.id===id); if(!r?.archive) return null; return `https://archive.org/download/${r.archive}/${String(surahNum).padStart(3,"0")}.mp3`; }

  function hasPerAyah(id){ const r=RECITERS.find(x=>x.id===id); return !!r?.everyayah; }

  async function playAyah(verseKey,key){
    if(playingKey===key){ audioRef.current?.pause(); setPlayingKey(null); return; }
    // No reciter picked — don't silently fall back to Dossari.
    if(!reciter){ return; }
    if(audioRef.current){audioRef.current.pause();audioRef.current=null;}
    setAudioLoading(key);
    const [surah,ayah]=verseKey.split(":");

    function playDirect(url){
      const audio=new Audio(url);
      audioRef.current=audio;
      audio.oncanplay=()=>{setAudioLoading(null);setPlayingKey(key);};
      audio.onended=()=>{
        if(looping){
          audio.currentTime=0;
          audio.play().catch(()=>{setPlayingKey(null);});
        } else {
          setPlayingKey(null);
        }
      };
      audio.onerror=()=>{setAudioLoading(null);setPlayingKey(null);};
      audio.play().catch(()=>{setAudioLoading(null);setPlayingKey(null);});
    }

    const everyayahUrl=`https://everyayah.com/data/${getEveryayahFolder(reciter)}/${String(surah).padStart(3,"0")}${String(ayah).padStart(3,"0")}.mp3`;
    if(!currentReciter.recitationId){ playDirect(everyayahUrl); return; }

    try {
      const res=await fetch(`https://api.qurancdn.com/api/qdc/audio/reciters/${currentReciter.recitationId}/audio_files?chapter_number=${surah}&juz_number=0&page_number=0&hizb_number=0&rub_el_hizb_number=0&verse_key=${verseKey}`);
      if(res.ok){
        const data=await res.json();
        const url=data.audio_files?.[0]?.url;
        if(url){ playDirect(url.startsWith("http")?url:`https://audio.qurancdn.com/${url}`); return; }
      }
    } catch {}
    playDirect(everyayahUrl);
  }

  function playSurahQueue(verses, surahNum, startIdx=0, reciterId=reciter) {
    if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; }
    if(playingSurah===surahNum){ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); return; }
    surahQueueRef.current=verses; surahIdxRef.current=startIdx;
    setPlayingSurah(surahNum);
    playNextInQueue(verses,startIdx,surahNum,reciterId);
  }

  function playNextInQueue(verses, idx, surahNum, reciterId=reciter) {
    if(idx>=verses.length){ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); return; }
    if(!hasPerAyah(reciterId)){
      const archiveUrl=getArchiveUrl(reciterId,surahNum);
      if(!archiveUrl){ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); return; }
      if(idx>0) return;
      setPlayingKey(verses[0]?.verse_key); setAudioLoading(verses[0]?.verse_key);
      const audio=new Audio(archiveUrl); audioRef.current=audio;
      audio.oncanplay=()=>setAudioLoading(null);
      audio.onended=()=>{ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); };
      audio.onerror=()=>{ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); };
      audio.play().catch(()=>{ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); });
      return;
    }
    const v=verses[idx]; const vKey=v.verse_key; const [surah,ayah]=vKey.split(":");
    setPlayingKey(vKey); setAudioLoading(vKey);
    const folder=getEveryayahFolder(reciterId);
    const url=`https://everyayah.com/data/${folder}/${String(surah).padStart(3,"0")}${String(ayah).padStart(3,"0")}.mp3`;
    // preload next 2 ayahs
    for(let offset=1;offset<=2;offset++){
      if(idx+offset<verses.length){
        const nv=verses[idx+offset]; const [ns,na]=nv.verse_key.split(":");
        const pre=new Audio(`https://everyayah.com/data/${folder}/${String(ns).padStart(3,"0")}${String(na).padStart(3,"0")}.mp3`);
        pre.preload="auto";
      }
    }
    const audio=new Audio(url); audio.preload="auto"; audioRef.current=audio;
    audio.oncanplay=()=>setAudioLoading(null);
    audio.onended=()=>{ surahIdxRef.current=idx+1; playNextInQueue(surahQueueRef.current,idx+1,surahNum,reciterId); };
    audio.onerror=()=>{ surahIdxRef.current=idx+1; playNextInQueue(surahQueueRef.current,idx+1,surahNum,reciterId); };
    audio.play().catch(()=>{ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); });
  }

  function stopMushafAudio(){
    if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; }
    setPlayingKey(null); setAudioLoading(null); setMushafAudioPlaying(false);
  }

  // Cache of per-surah ayah text (used for proportional time estimates on
  // reciters without quran.com verse_timings).
  const surahTextCache = {};

  async function fetchSurahText(surahNum){
    if(surahTextCache[surahNum]) return surahTextCache[surahNum];
    try{
      const r=await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surahNum}?fields=text_uthmani&per_page=300`);
      if(!r.ok) return null;
      const d=await r.json();
      const verses=(d.verses||[]).map(v=>({verse_key:v.verse_key,len:(v.text_uthmani||"").length}));
      surahTextCache[surahNum]=verses;
      return verses;
    }catch{ return null; }
  }

  // Continuous range player for reciters without quran.com segments.
  // Uses the full surah audio file (quranicaudio.com) and estimates the
  // From/To timestamps proportionally from each ayah's character length —
  // smooth playback (no stitching) at the cost of some seek imprecision.
  async function playMushafRangeContinuous(verses, reciterObj){
    setMushafAudioPlaying(true);

    // Group consecutive verses by surah (same as the segment-based player).
    const groups=[];
    verses.forEach(v=>{
      const sNum=Number(v.verse_key.split(":")[0]);
      const last=groups[groups.length-1];
      if(!last||last.sNum!==sNum) groups.push({sNum,verses:[v]});
      else last.verses.push(v);
    });

    // For each group, derive an estimated startMs/endMs using char-weighted
    // proportions and the file's actual duration (read after metadata loads).
    const segments=[];
    for(const g of groups){
      const url=`https://download.quranicaudio.com/quran/${reciterObj.quranicaudio}/${String(g.sNum).padStart(3,"0")}.mp3`;
      const surahText=await fetchSurahText(g.sNum);
      if(!surahText) continue;
      const totalChars=surahText.reduce((s,v)=>s+v.len,0);
      // cumChars[verse_key] = total chars up to and including this ayah
      const cumChars={};
      let cum=0;
      surahText.forEach(v=>{ cum+=v.len; cumChars[v.verse_key]=cum; });
      const firstVk=g.verses[0].verse_key;
      const lastVk=g.verses[g.verses.length-1].verse_key;
      const firstObj=surahText.find(v=>v.verse_key===firstVk);
      if(!firstObj||!cumChars[lastVk]) continue;
      const startChars=cumChars[firstVk]-firstObj.len;
      const endChars=cumChars[lastVk];
      segments.push({audio_url:url, sNum:g.sNum, startFrac:startChars/totalChars, endFrac:endChars/totalChars, totalChars, surahText, cumChars});
    }

    if(!segments.length){ setMushafAudioPlaying(false); return; }

    function playSegment(idx){
      if(idx>=segments.length){
        if(looping){ playSegment(0); return; }
        setMushafAudioPlaying(false); setPlayingKey(null); setAudioLoading(null); return;
      }
      const seg=segments[idx];
      const audio=new Audio(seg.audio_url);
      audio.preload="auto";
      audioRef.current=audio;
      let startMs=0, endMs=0;
      let lastVk=null;
      let advanced=false;
      const advance=()=>{
        if(advanced) return;
        advanced=true;
        audio.onended=null; audio.ontimeupdate=null;
        try{ audio.pause(); }catch{}
        if(audioRef.current===audio) audioRef.current=null;
        playSegment(idx+1);
      };

      audio.onloadedmetadata=()=>{
        const durMs=(audio.duration||0)*1000;
        startMs=seg.startFrac*durMs;
        endMs=seg.endFrac*durMs;
        try{ audio.currentTime=startMs/1000; }catch{}
        audio.play().catch(()=>{ setMushafAudioPlaying(false); setPlayingKey(null); });
      };
      audio.ontimeupdate=()=>{
        if(!(audio.duration>0)) return;
        const ms=audio.currentTime*1000;
        // Estimate which ayah is "playing" for the drawer highlight.
        const charPos=(ms/(audio.duration*1000))*seg.totalChars;
        const vt=seg.surahText.find(v=>charPos<=seg.cumChars[v.verse_key]);
        if(vt&&vt.verse_key!==lastVk){
          lastVk=vt.verse_key;
          setPlayingKey(vt.verse_key);
          setAudioLoading(null);
        }
        if(ms>=endMs){ advance(); }
      };
      audio.onended=()=>advance();
      audio.onerror=()=>advance();
    }

    playSegment(0);
  }

  // Full-page MP3 player — used when the user's range covers the entire
  // visible mushaf page AND the reciter has everyayah PageMp3s. Plays one
  // continuous file (the reciter's own recording of that exact page) with
  // no stitching. Highlight tracking is char-proportion based — at page
  // scale the drift is small enough to feel right.
  function playMushafRangePage(verses, mushafPage, reciterObj){
    setMushafAudioPlaying(true);
    const folder=reciterObj.everyayah;
    const url=`https://everyayah.com/data/${folder}/PageMp3s/Page${String(mushafPage).padStart(3,"0")}.mp3`;

    // Per-verse char distribution → estimated time slice for highlight.
    const lens=verses.map(v=>(v.text_uthmani||"").length||1);
    const totalChars=lens.reduce((a,b)=>a+b,0);
    const cum=[]; { let c=0; lens.forEach(l=>{ c+=l; cum.push(c); }); }

    function playOnce(){
      const audio=new Audio(url);
      audio.preload="auto";
      audioRef.current=audio;
      let lastVk=null;
      let advanced=false;
      const advance=()=>{
        if(advanced) return;
        advanced=true;
        audio.onended=null; audio.ontimeupdate=null;
        try{ audio.pause(); }catch{}
        if(audioRef.current===audio) audioRef.current=null;
        if(looping){ playOnce(); return; }
        setMushafAudioPlaying(false); setPlayingKey(null); setAudioLoading(null);
      };
      audio.onloadedmetadata=()=>{
        audio.play().catch(()=>{ setMushafAudioPlaying(false); setPlayingKey(null); });
      };
      audio.ontimeupdate=()=>{
        if(!(audio.duration>0)) return;
        const ms=audio.currentTime;
        const charPos=(ms/audio.duration)*totalChars;
        let vIdx=cum.findIndex(c=>charPos<=c);
        if(vIdx<0) vIdx=verses.length-1;
        const vk=verses[vIdx]?.verse_key;
        if(vk&&vk!==lastVk){ lastVk=vk; setPlayingKey(vk); setAudioLoading(null); }
      };
      audio.onended=()=>advance();
      audio.onerror=()=>advance();
    }
    playOnce();
  }

  // Old chopped-clip range player — used as fallback when a reciter has no
  // qurancdn recitationId AND no everyayah pageMp3 (or partial-page range).
  function playMushafRangeChopped(verses){
    const folder=getEveryayahFolder(quranReciter)||getEveryayahFolder(reciter);
    if(!folder){ return; }
    setMushafAudioPlaying(true);
    function urlFor(vKey){
      const [s,a]=vKey.split(":");
      return `https://everyayah.com/data/${folder}/${String(s).padStart(3,"0")}${String(a).padStart(3,"0")}.mp3`;
    }
    const bismillahUrl=`https://everyayah.com/data/${folder}/001001.mp3`;
    const queue=[];
    verses.forEach((v,i)=>{
      const [s,a]=v.verse_key.split(":");
      const sNum=Number(s);
      if(a==="1"&&sNum!==1&&sNum!==9){ queue.push({isBismillah:true,vKey:`bismillah-${i}`}); }
      queue.push({verse_key:v.verse_key,isBismillah:false});
    });
    const preloaded=queue.map(item=>{const a=new Audio(item.isBismillah?bismillahUrl:urlFor(item.verse_key));a.preload="auto";return a;});
    function playIdx(idx){
      if(idx>=queue.length){ if(looping){ playIdx(0); return; } setMushafAudioPlaying(false); setPlayingKey(null); setAudioLoading(null); return; }
      const item=queue[idx]; const audio=preloaded[idx];
      try{ audio.currentTime=0; audio.volume=1; }catch{}
      audioRef.current=audio;
      if(!item.isBismillah){ setPlayingKey(item.verse_key); setAudioLoading(item.verse_key); } else { setPlayingKey(null); setAudioLoading(null); }
      audio.oncanplay=()=>{ if(!item.isBismillah) setAudioLoading(null); };
      // Sequential playback — let each clip finish naturally before the
      // next one starts. Crossfade was bleeding the next ayah into the
      // tail of the current one (esp. wasl reciters); cleaner to play
      // back-to-back and accept any natural silence between clips.
      audio.onended=()=>playIdx(idx+1);
      audio.onerror=()=>playIdx(idx+1);
      audio.play().catch(()=>{ setMushafAudioPlaying(false); setPlayingKey(null); });
    }
    playIdx(0);
  }

  // Proper range player — uses qurancdn's full surah audio files with
  // verse_timings so the reciter's natural wasl (continuous recitation
  // across ayah boundaries) is preserved without seam artifacts. Falls
  // back to the chopped-clip player when the reciter has no recitationId.
  async function playMushafRange(verses, opts={}){
    if(!verses||verses.length===0) return;
    if(mushafAudioPlaying){ stopMushafAudio(); return; }

    const { mushafPage, isFullPage } = opts;
    const reciterId=quranReciter||reciter;
    const reciterObj=QURAN_RECITERS.find(r=>r.id===reciterId)||RECITERS.find(r=>r.id===reciterId);
    const recitationId=reciterObj?.recitationId;

    // Routing (best → worst):
    //   1. Full-page range AND reciter has everyayah pageMp3 → page MP3
    //      (single continuous file of the reciter's actual page recording).
    //   2. quran.com segments → precise continuous range (Sudais, Mishari…).
    //   3. Chopped per-ayah clips → sequential fallback for partial ranges
    //      and reciters without segments or pageMp3.
    if(isFullPage && mushafPage && reciterObj?.pageMp3){
      stopMushafAudio();
      return playMushafRangePage(verses, mushafPage, reciterObj);
    }
    if(!recitationId){ return playMushafRangeChopped(verses); }

    stopMushafAudio();
    setMushafAudioPlaying(true);

    // Group consecutive verses by surah so we play one continuous slice per
    // surah audio file. Cross-surah jumps are the only audible seams.
    const groups=[];
    verses.forEach(v=>{
      const sNum=Number(v.verse_key.split(":")[0]);
      const last=groups[groups.length-1];
      if(!last||last.sNum!==sNum) groups.push({sNum,verses:[v]});
      else last.verses.push(v);
    });

    let segments;
    try{
      const fetched=await Promise.all(groups.map(async g=>{
        const r=await fetch(`https://api.qurancdn.com/api/qdc/audio/reciters/${recitationId}/audio_files?chapter_number=${g.sNum}&segments=true`);
        if(!r.ok) return null;
        const d=await r.json();
        const f=d.audio_files?.[0];
        if(!f||!f.verse_timings) return null;
        const firstVk=g.verses[0].verse_key;
        const lastVk=g.verses[g.verses.length-1].verse_key;
        const firstT=f.verse_timings.find(t=>t.verse_key===firstVk);
        const lastT=f.verse_timings.find(t=>t.verse_key===lastVk);
        if(!firstT||!lastT) return null;
        // Range starts at verse :1 of a surah → start at file's beginning so
        // any bismillah preroll baked into the file is included naturally.
        const isOpener=firstVk.endsWith(":1");
        const startMs=isOpener?0:firstT.timestamp_from;
        const endMs=lastT.timestamp_to;
        return { audio_url:f.audio_url, verse_timings:f.verse_timings, startMs, endMs, sNum:g.sNum };
      }));
      segments=fetched.filter(Boolean);
    }catch{ segments=[]; }

    if(!segments.length){ setMushafAudioPlaying(false); return playMushafRangeChopped(verses); }

    function playSegment(idx){
      if(idx>=segments.length){
        if(looping){ playSegment(0); return; }
        setMushafAudioPlaying(false); setPlayingKey(null); setAudioLoading(null); return;
      }
      const seg=segments[idx];
      const audio=new Audio(seg.audio_url);
      audio.preload="auto";
      audioRef.current=audio;
      let lastVk=null;
      let advanced=false;
      const advance=()=>{
        if(advanced) return;
        advanced=true;
        audio.onended=null; audio.ontimeupdate=null;
        try{ audio.pause(); }catch{}
        if(audioRef.current===audio) audioRef.current=null;
        playSegment(idx+1);
      };

      audio.onloadedmetadata=()=>{
        try{ audio.currentTime=seg.startMs/1000; }catch{}
        audio.play().catch(()=>{ setMushafAudioPlaying(false); setPlayingKey(null); });
      };
      audio.ontimeupdate=()=>{
        const ms=audio.currentTime*1000;
        const vt=seg.verse_timings.find(t=>ms>=t.timestamp_from&&ms<t.timestamp_to);
        if(vt&&vt.verse_key!==lastVk){
          lastVk=vt.verse_key;
          setPlayingKey(vt.verse_key);
          setAudioLoading(null);
        }
        // Always honor the user's range — cut at the last picked ayah's
        // timestamp_to. audio.onended is the safety net for ranges that
        // run to the natural file end (last verse of a surah where
        // timestamp_to may slightly exceed the file's duration).
        if(ms>=seg.endMs){ advance(); }
      };
      audio.onended=()=>advance();
      audio.onerror=()=>advance();
    }

    playSegment(0);
  }

  function getQuranSurahUrl(reciterId,surahNum){
    const r=RECITERS.find(x=>x.id===reciterId)||QURAN_RECITERS.find(x=>x.id===reciterId);
    if(!r?.quranicaudio) return null;
    return `https://download.quranicaudio.com/quran/${r.quranicaudio}/${String(surahNum).padStart(3,"0")}.mp3`;
  }

  function playQuranSurah(surahNum){
    if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; }
    if(playingSurah===surahNum){ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); return; }
    const url=getQuranSurahUrl(quranReciter,surahNum);
    if(!url) return;
    setPlayingSurah(surahNum); setPlayingKey(`surah-${surahNum}`); setAudioLoading(`surah-${surahNum}`);
    const audio=new Audio(url);
    audioRef.current=audio;
    audio.oncanplay=()=>{ setAudioLoading(null); };
    audio.onended=()=>{ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); };
    audio.onerror=()=>{ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); };
    audio.play().catch(()=>{ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); });
  }

  return {
    playingKey,
    setPlayingKey,
    audioLoading,
    setAudioLoading,
    audioRef,
    playingSurah,
    setPlayingSurah,
    mushafAudioPlaying,
    setMushafAudioPlaying,
    playAyah,
    playSurahQueue,
    playNextInQueue,
    getEveryayahFolder,
    getArchiveUrl,
    hasPerAyah,
    stopMushafAudio,
    playMushafRange,
    getQuranSurahUrl,
    playQuranSurah,
  };
}
