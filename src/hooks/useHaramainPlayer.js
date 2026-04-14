import { useState, useRef, useEffect } from "react";
import { SURAH_EN } from "../data/constants";
import { SURAH_AR } from "../data/quran-metadata";

// ── useHaramainPlayer ──
// Isolates the Haramain audio state machine: play/stop/seek/skip/next/prev,
// archive.org filename resolution, auto-collapse on tab switch.
export default function useHaramainPlayer({ activeTab }) {
  const [haramainPlaying, setHaramainPlaying] = useState(null);
  const haramainRef = useRef(null);
  const [haramainMeta, setHaramainMeta] = useState(null);
  const [haramainTime, setHaramainTime] = useState(0);
  const [haramainDuration, setHaramainDuration] = useState(0);
  const [haramainRate, setHaramainRate] = useState(1);
  const [haramainExpanded, setHaramainExpanded] = useState(false);
  const [haramainIsPaused, setHaramainIsPaused] = useState(false);

  // Auto-collapse when user switches tabs
  useEffect(() => { setHaramainExpanded(false); }, [activeTab]);

  async function resolveArchiveFilename(archiveItem, surahNum) {
    if (!window.__archiveFileMapCache) window.__archiveFileMapCache = {};
    const cache = window.__archiveFileMapCache;
    if (!cache[archiveItem]) {
      try {
        const res = await fetch(`https://archive.org/metadata/${archiveItem}`);
        const data = await res.json();
        const map = {};
        (data.files || []).forEach(f => {
          const m = /^(\d{3})(?:-\d+)?\.(mp3|MP3)$/.exec(f.name || "");
          if (m) { const n = parseInt(m[1], 10); if (n >= 1 && n <= 114 && !map[n]) map[n] = f.name; }
        });
        cache[archiveItem] = map;
      } catch { cache[archiveItem] = {}; }
    }
    return cache[archiveItem][surahNum] || null;
  }

  function playHaramainSurah(imam, surahNum, key, mosqueColor) {
    // Toggle: if same surah already playing → pause/resume
    if (haramainPlaying === key) {
      if (haramainRef.current) {
        if (haramainRef.current.paused) { haramainRef.current.play().catch(() => {}); }
        else { haramainRef.current.pause(); }
      }
      return;
    }
    // New surah: fully tear down old audio, clear ALL handlers so they can't fire after
    if (haramainRef.current) {
      const old = haramainRef.current;
      old.onloadedmetadata = null;
      old.ontimeupdate = null;
      old.onratechange = null;
      old.onplay = null;
      old.onpause = null;
      old.onended = null;
      old.onerror = null;
      old.pause();
      old.src = "";
      old.load();
      haramainRef.current = null;
    }
    const startWithUrl = (url) => {
      const audio = new Audio(url);
      audio.preload = "auto";
      audio.playbackRate = haramainRate;
      haramainRef.current = audio;
      audio.onloadedmetadata = () => { if (haramainRef.current === audio) setHaramainDuration(audio.duration || 0); };
      audio.ontimeupdate = () => { if (haramainRef.current === audio) setHaramainTime(audio.currentTime || 0); };
      audio.onratechange = () => { if (haramainRef.current === audio) setHaramainRate(audio.playbackRate || 1); };
      audio.onplay = () => { if (haramainRef.current === audio) setHaramainIsPaused(false); };
      audio.onpause = () => { if (haramainRef.current === audio) setHaramainIsPaused(true); };
      audio.onended = () => {
        if (haramainRef.current !== audio) return;
        setHaramainPlaying(null);
        setHaramainMeta(null);
        setHaramainTime(0);
        setHaramainDuration(0);
        setHaramainIsPaused(false);
      };
      audio.onerror = () => {
        if (haramainRef.current !== audio) return;
        setHaramainPlaying(null);
        setHaramainMeta(null);
      };
      setHaramainPlaying(key);
      setHaramainMeta({
        imam,
        surahNum,
        surahName: SURAH_EN[surahNum] || `Surah ${surahNum}`,
        surahAr: SURAH_AR[surahNum] || "",
        mosqueColor: mosqueColor || "#D4AF37",
      });
      setHaramainTime(0);
      setHaramainDuration(0);
      setHaramainIsPaused(false);
      audio.play().catch(() => {});
    };

    if (imam.mp3quran) {
      startWithUrl(`${imam.mp3quran}/${String(surahNum).padStart(3, "0")}.mp3`);
    } else if (imam.quranicaudio) {
      startWithUrl(`https://download.quranicaudio.com/quran/${imam.quranicaudio}/${String(surahNum).padStart(3, "0")}.mp3`);
    } else if (imam.archive) {
      resolveArchiveFilename(imam.archive, surahNum).then(filename => {
        if (!filename) { setHaramainPlaying(null); setHaramainMeta(null); return; }
        startWithUrl(`https://archive.org/download/${imam.archive}/${filename}`);
      });
    }
  }

  function stopHaramain() {
    if (haramainRef.current) {
      haramainRef.current.pause();
      haramainRef.current = null;
    }
    setHaramainPlaying(null);
    setHaramainMeta(null);
    setHaramainTime(0);
    setHaramainDuration(0);
    setHaramainExpanded(false);
    setHaramainIsPaused(false);
  }

  function toggleHaramainPlayPause() {
    if (!haramainRef.current) return;
    if (haramainRef.current.paused) haramainRef.current.play().catch(() => {});
    else haramainRef.current.pause();
  }

  function seekHaramain(seconds) {
    if (!haramainRef.current) return;
    const d = haramainRef.current.duration || 0;
    const next = Math.max(0, Math.min(d, seconds));
    haramainRef.current.currentTime = next;
    setHaramainTime(next);
  }

  function skipHaramain(deltaSec) {
    if (!haramainRef.current) return;
    seekHaramain((haramainRef.current.currentTime || 0) + deltaSec);
  }

  function haramainNext() {
    if (!haramainMeta) return;
    const { imam, mosqueColor } = haramainMeta;
    const next = haramainMeta.surahNum + 1;
    if (next > 114) return;
    if (imam.availableSurahs && !imam.availableSurahs.includes(next)) return;
    playHaramainSurah(imam, next, `${imam.id}-${next}`, mosqueColor);
  }

  function haramainPrev() {
    if (!haramainMeta) return;
    const { imam, mosqueColor } = haramainMeta;
    const prev = haramainMeta.surahNum - 1;
    if (prev < 1) return;
    if (imam.availableSurahs && !imam.availableSurahs.includes(prev)) return;
    playHaramainSurah(imam, prev, `${imam.id}-${prev}`, mosqueColor);
  }

  function setHaramainPlaybackRate(r) {
    if (!haramainRef.current) return;
    haramainRef.current.playbackRate = r;
    setHaramainRate(r);
  }

  return {
    haramainPlaying, setHaramainPlaying,
    haramainMeta, setHaramainMeta,
    haramainTime,
    haramainDuration,
    haramainRate,
    haramainExpanded, setHaramainExpanded,
    haramainIsPaused,
    haramainRef,
    playHaramainSurah,
    stopHaramain,
    toggleHaramainPlayPause,
    seekHaramain,
    skipHaramain,
    haramainNext,
    haramainPrev,
    setHaramainPlaybackRate,
  };
}
