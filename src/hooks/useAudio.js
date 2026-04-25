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
    if(r?.everyayah) return r.everyayah;
    // Extra reciters only in QURAN_RECITERS
    const extras={"alijaber":"Ali_Jaber_128kbps"};
    return extras[id]||RECITERS[0].everyayah;
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

  // Old chopped-clip range player — used as fallback when a reciter has no
  // qurancdn recitationId (e.g. Saudi haram-only reciters via everyayah only).
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
    let nextTriggered=false;
    function playIdx(idx){
      if(idx>=queue.length){ if(looping){ playIdx(0); return; } setMushafAudioPlaying(false); setPlayingKey(null); setAudioLoading(null); return; }
      const item=queue[idx]; const audio=preloaded[idx];
      if(audio.paused){ try{ audio.currentTime=0; }catch{} }
      nextTriggered=false; audioRef.current=audio;
      if(!item.isBismillah){ setPlayingKey(item.verse_key); setAudioLoading(item.verse_key); } else { setPlayingKey(null); setAudioLoading(null); }
      audio.oncanplay=()=>{ if(!item.isBismillah) setAudioLoading(null); };
      audio.onended=()=>playIdx(idx+1);
      audio.onerror=()=>playIdx(idx+1);
      audio.ontimeupdate=()=>{
        if(!nextTriggered&&audio.duration>0&&audio.currentTime>=audio.duration-0.25){
          nextTriggered=true;
          if(idx+1<queue.length){
            const nextItem=queue[idx+1]; const nextAudio=preloaded[idx+1];
            nextAudio.currentTime=0; nextAudio.play().catch(()=>{});
            if(nextItem.isBismillah) setPlayingKey(null); else setPlayingKey(nextItem.verse_key);
          }
        }
      };
      audio.play().catch(()=>{ setMushafAudioPlaying(false); setPlayingKey(null); });
    }
    playIdx(0);
  }

  // Proper range player — uses qurancdn's full surah audio files with
  // verse_timings so the reciter's natural wasl (continuous recitation
  // across ayah boundaries) is preserved without seam artifacts. Falls
  // back to the chopped-clip player when the reciter has no recitationId.
  async function playMushafRange(verses){
    if(!verses||verses.length===0) return;
    if(mushafAudioPlaying){ stopMushafAudio(); return; }

    const reciterId=quranReciter||reciter;
    const reciterObj=QURAN_RECITERS.find(r=>r.id===reciterId)||RECITERS.find(r=>r.id===reciterId);
    const recitationId=reciterObj?.recitationId;
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
        if(ms>=seg.endMs-30){
          audio.onended=null; audio.ontimeupdate=null;
          try{ audio.pause(); }catch{}
          if(audioRef.current===audio) audioRef.current=null;
          playSegment(idx+1);
        }
      };
      audio.onerror=()=>{ playSegment(idx+1); };
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
