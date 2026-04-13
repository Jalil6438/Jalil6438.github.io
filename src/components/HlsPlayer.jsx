import { useState, useEffect, useRef } from "react";

// ── HLS PLAYER COMPONENT (standalone — clean) ────────────────────────────────
function HlsPlayer({ src, T }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setStatus("loading");

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().then(()=>setStatus("playing")).catch(()=>setStatus("error"));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.7/hls.min.js";
    script.onload = () => {
      if (!window.Hls || !window.Hls.isSupported()) { setStatus("error"); return; }
      const hls = new window.Hls({ lowLatencyMode:true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(()=>setStatus("playing")).catch(()=>setStatus("error"));
      });
      hls.on(window.Hls.Events.ERROR, (_, d) => { if (d.fatal) setStatus("error"); });
    };
    script.onerror = () => setStatus("error");
    document.head.appendChild(script);

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      video.src = "";
    };
  }, [src]);

  return (
    <div style={{flex:1,background:"#000",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",minHeight:220}}>
      <video ref={videoRef} style={{width:"100%",height:"100%",maxHeight:380,objectFit:"contain"}} controls playsInline />
      {status==="loading"&&(
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.75)",gap:10}}>
          <div className="spin" style={{width:28,height:28,border:"3px solid #333",borderTopColor:T.accent,borderRadius:"50%"}}/>
          <div style={{fontSize:11,color:"#aaa"}}>Connecting to stream...</div>
        </div>
      )}
      {status==="error"&&(
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.88)",gap:10,padding:20}}>
          <div style={{fontSize:24}}>📡</div>
          <div style={{fontSize:13,color:"#ccc",textAlign:"center"}}>Stream unavailable in this browser</div>
          <div style={{fontSize:11,color:"#777",textAlign:"center"}}>Use the YouTube button below to watch live</div>
        </div>
      )}
    </div>
  );
}

export default HlsPlayer;
